import Fastify from "fastify";
import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import spec from "../../../specs/reconciliation.speckit.json" with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.join(__dirname, "../..", ".env"),
});

const fastify = Fastify({ logger: true });

const balanceSchema = z.object({
  account: z.string(),
  period: z.string().optional().default(""),
  amount: z.number(),
  currency: z.string().optional(),
});

const transactionSchema = z.object({
  account: z.string(),
  booked_at: z.union([z.string(), z.date()]),
  debit: z.number().optional(),
  credit: z.number().optional(),
  amount: z.number().optional(),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.string()).optional(),
});

const payloadSchema = z.object({
  glBalances: z.array(balanceSchema),
  subledgerBalances: z.array(balanceSchema),
  transactions: z.array(transactionSchema).optional(),
  orderedPeriods: z.array(z.string()).optional(),
  activityByPeriod: z.record(z.string(), z.number()).optional(),
  adjustmentsByPeriod: z.record(z.string(), z.number()).optional(),
});

const runSchema = z.object({
  userPrompt: z.string().min(1),
  payload: payloadSchema,
});

type RunInput = z.infer<typeof runSchema>;
type PayloadInput = z.infer<typeof payloadSchema>;

const openaiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
const geminiKey =
  process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";

const openaiClient = openaiKey ? new OpenAI({ apiKey: openaiKey }) : null;
const anthropicClient = anthropicKey
  ? new Anthropic({ apiKey: anthropicKey })
  : null;
const geminiClient =
  geminiKey !== "" ? new GoogleGenerativeAI(geminiKey) : null;

const supervisorModel =
  process.env.OPENAI_SUPERVISOR_MODEL ?? "gpt-4.1-mini";
const reviewerModel =
  process.env.OPENAI_REVIEWER_MODEL ?? "gpt-4.1-mini";

const claudeModel =
  process.env.CLAUDE_SKILL_MODEL ?? "claude-3-5-sonnet-20241022";
const geminiModel = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
const materialityThreshold = Number(process.env.MATERIALITY_THRESHOLD ?? "50");

const reconciliationToolParameters = {
  type: "object",
  properties: {
    gl_balances: {
      type: "array",
      items: {
        type: "object",
        properties: {
          account: { type: "string" },
          period: { type: "string" },
          amount: { type: "number" },
        },
        required: ["account", "amount"],
      },
    },
    subledger_balances: {
      type: "array",
      items: {
        type: "object",
        properties: {
          account: { type: "string" },
          period: { type: "string" },
          amount: { type: "number" },
        },
        required: ["account", "amount"],
      },
    },
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          account: { type: "string" },
          booked_at: { type: "string" },
          debit: { type: "number" },
          credit: { type: "number" },
          amount: { type: "number" },
          description: { type: "string" },
          metadata: { type: "object" },
        },
        required: ["account", "booked_at"],
      },
    },
    ordered_periods: {
      type: "array",
      items: { type: "string" },
    },
    activity_by_period: {
      type: "object",
      additionalProperties: { type: "number" },
    },
    adjustments_by_period: {
      type: "object",
      additionalProperties: { type: "number" },
    },
  },
  required: ["gl_balances", "subledger_balances"],
};

type ToolOutput = ReturnType<typeof runReconciliationLocally>;

fastify.post("/agent/runs", async (request, reply) => {
  const parsed = runSchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({
      message: "Invalid payload",
      issues: parsed.error.flatten(),
    });
  }

  const orchestrated = await orchestrateRun(parsed.data);
  return reply.send(orchestrated);
});

async function orchestrateRun(input: RunInput) {
  const runId = `run_${Date.now()}`;
  const localToolOutput = runReconciliationLocally(input.payload);

  const timeline = [
    {
      stage: "spec_validation",
      status: "completed",
      detail: "Validated payload against Spec-Kit canonical models.",
      timestamp: new Date().toISOString(),
    },
  ];

  const openAiResult = await runOpenAiTeam(
    input.userPrompt,
    input.payload,
    localToolOutput,
  );
  timeline.push({
    stage: "openai_supervisor",
    status: "completed",
    detail: "Supervisor agent evaluated payload + tool output.",
    timestamp: new Date().toISOString(),
  });

  const claudeResponses = await runClaudeSkills(input);
  timeline.push({
    stage: "claude_skills",
    status: "completed",
    detail: "Triggered Claude subagents for column-mapping + variance review.",
    timestamp: new Date().toISOString(),
  });

  const geminiInsight = await summarizeWithGemini(
    input,
    localToolOutput,
  );
  timeline.push({
    stage: "gemini_commentary",
    status: geminiInsight ? "completed" : "skipped",
    detail: geminiInsight
      ? "Gemini produced narrative commentary."
      : "Gemini API key missing; skipped commentary.",
    timestamp: new Date().toISOString(),
  });

  return {
    runId,
    spec: {
      name: spec.name,
      version: spec.version,
      summary: spec.summary,
    },
    timeline,
    openai: openAiResult,
    claudeSkills: claudeResponses,
    geminiInsight,
    toolOutput: localToolOutput,
  };
}


async function runOpenAiTeam(
  userPrompt: string,
  payload: PayloadInput,
  localToolOutput: ToolOutput,
) {
  if (!openaiClient) {
    return {
      message:
        "OPENAI_API_KEY not configured. Supervisor + reviewer agents were not executed.",
      messagesByRole: {},
      toolOutput: localToolOutput,
    };
  }

  const agents = [
    {
      role: "supervisor",
      model: supervisorModel,
      instructions:
        "You are the GL Reconciliation Supervisor. Call the `run_reconciliation` tool when data payloads are present.",
      usesTool: true,
    },
    {
      role: "reviewer",
      model: reviewerModel,
      instructions:
        "You are the reviewer. Provide executive-ready commentary referencing the supervisor output + tool data. Do not call tools.",
      usesTool: false,
    },
  ];

  const assistantIds: Record<string, string> = {};
  for (const agent of agents) {
    const created = await openaiClient.beta.assistants.create({
      name: `AcctRegen ${agent.role}`,
      instructions: agent.instructions,
      model: agent.model,
      tools: agent.usesTool
        ? [
            {
              type: "function",
              function: {
                name: "run_reconciliation",
                description:
                  "Reconcile GL vs subledger balances and roll forward schedules.",
                parameters: reconciliationToolParameters,
              },
            },
          ]
        : [],
    });
    assistantIds[agent.role] = created.id;
  }

  const messagesByRole: Record<string, string> = {};
  let finalToolOutput: ToolOutput | undefined = undefined;

  for (const agent of agents) {
    const assistantId = assistantIds[agent.role];
    if (!assistantId) {
      throw new Error(`Missing assistant for role ${agent.role}`);
    }
    const thread = await openaiClient.beta.threads.create();
    const basePrompt =
      agent.role === "supervisor"
        ? `${userPrompt}\n\nPayload schema: ${JSON.stringify(payload)}`
        : `Supervisor output:\n${messagesByRole.supervisor}\n\nTool Output:\n${JSON.stringify(finalToolOutput ?? localToolOutput)}`;
    await openaiClient.beta.threads.messages.create(thread.id, {
      role: "user",
      content: basePrompt,
    });

    const run = await openaiClient.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
    });

    const response = await pollRun(
      thread.id,
      run.id,
      agent.usesTool,
      async (args) => {
        finalToolOutput = runReconciliationLocally({
          glBalances: args.gl_balances ?? payload.glBalances,
          subledgerBalances: args.subledger_balances ?? payload.subledgerBalances,
          transactions: args.transactions ?? payload.transactions,
          orderedPeriods: args.ordered_periods ?? payload.orderedPeriods,
          activityByPeriod: args.activity_by_period ?? payload.activityByPeriod,
          adjustmentsByPeriod:
            args.adjustments_by_period ?? payload.adjustmentsByPeriod,
        });
        return finalToolOutput;
      },
    );

    messagesByRole[agent.role] = response;
  }

  return {
    message: messagesByRole.supervisor ?? "",
    messagesByRole,
    toolOutput: finalToolOutput ?? localToolOutput,
  };
}

async function pollRun(
  threadId: string,
  runId: string,
  allowTool: boolean,
  onToolCall: (args: any) => Promise<ToolOutput>,
) {
  if (!openaiClient) {
    return "";
  }
  for (;;) {
    const run = await openaiClient.beta.threads.runs.retrieve(runId, {
      thread_id: threadId,
    });
    if (run.status === "completed") {
      const messages = await openaiClient.beta.threads.messages.list(threadId);
      const assistant = messages.data.find(
        (message) => message.role === "assistant",
      );
      if (!assistant) {
        return "";
      }
      return assistant.content
        .filter((part) => part.type === "text")
        .map((part) => part.text?.value ?? "")
        .join("\n");
    }
    if (run.status === "requires_action") {
      if (!allowTool || !run.required_action) {
        throw new Error("Tool call required but not permitted.");
      }
      for (const call of run.required_action.submit_tool_outputs.tool_calls) {
        if (call.function?.name === "run_reconciliation") {
          const args = JSON.parse(call.function.arguments);
          const toolOutput = await onToolCall(args);
          await openaiClient.beta.threads.runs.submitToolOutputs(runId, {
            thread_id: threadId,
            tool_outputs: [
              {
                tool_call_id: call.id,
                output: JSON.stringify(toolOutput),
              },
            ],
          });
        }
      }
    } else if (
      run.status === "failed" ||
      run.status === "cancelled" ||
      run.status === "expired"
    ) {
      throw new Error(`Run ended with status ${run.status}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function runClaudeSkills(input: RunInput) {
  const skills = [
    {
      name: "column_mapper",
      instructions:
        "Review the provided headers and confirm if they map cleanly to the canonical schema. Suggest fixes if not.",
    },
    {
      name: "variance_investigator",
      instructions:
        "Inspect GL vs subledger variances and explain root causes using the provided payload.",
    },
  ];

  if (!anthropicClient) {
    return skills.map((skill) => ({
      skill: skill.name,
      response: "Claude API key not configured; skipped.",
    }));
  }

  const responses = [];
  for (const skill of skills) {
    const message = await anthropicClient.messages.create({
      model: claudeModel,
      max_tokens: 400,
      system: `Claude Skill: ${skill.name}. ${skill.instructions}`,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: JSON.stringify(input.payload),
            },
          ],
        },
      ],
    });
    const text = message.content
      .map((item) => ("text" in item ? item.text : ""))
      .join("\n");
    responses.push({
      skill: skill.name,
      response: text,
    });
  }
  return responses;
}

async function summarizeWithGemini(
  input: RunInput,
  toolOutput: ToolOutput,
) {
  if (!geminiClient) {
    return null;
  }
  const model = geminiClient.getGenerativeModel({ model: geminiModel });
  const prompt = `
Compose an executive-ready summary for the reconciliation run described below.
User prompt: ${input.userPrompt}
Tool output: ${JSON.stringify(toolOutput)}
`;
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text;
  } catch (error) {
    fastify.log.error({ error }, "Gemini summary failed");
    return null;
  }
}

type NormalizedTransaction = {
  account: string;
  period: string;
  booked_at: string;
  description: string;
  debit: number;
  credit: number;
  net: number;
  metadata: Record<string, string>;
};

function runReconciliationLocally(payload: PayloadInput) {
  const glMap = aggregateBalances(payload.glBalances);
  const subMap = aggregateBalances(payload.subledgerBalances);
  const accounts = new Set<string>();
  const detectedPeriods = new Set<string>();

  for (const balance of payload.glBalances) {
    accounts.add(balance.account);
    if (balance.period) detectedPeriods.add(balance.period);
  }
  for (const balance of payload.subledgerBalances) {
    accounts.add(balance.account);
    if (balance.period) detectedPeriods.add(balance.period);
  }

  const normalizedTransactions = normalizeTransactions(payload.transactions);
  const transactionBuckets = new Map<string, NormalizedTransaction[]>();
  const activityByAccountPeriod = new Map<string, number>();

  for (const txn of normalizedTransactions) {
    accounts.add(txn.account);
    if (txn.period) detectedPeriods.add(txn.period);
    const key = makeKey(txn.account, txn.period);
    if (!transactionBuckets.has(key)) {
      transactionBuckets.set(key, []);
    }
    transactionBuckets.get(key)!.push(txn);
    activityByAccountPeriod.set(
      key,
      (activityByAccountPeriod.get(key) ?? 0) + txn.net,
    );
  }

  const periodOrder =
    payload.orderedPeriods && payload.orderedPeriods.length > 0
      ? payload.orderedPeriods
      : Array.from(detectedPeriods).sort();
  if (periodOrder.length === 0) {
    periodOrder.push(new Date().toISOString().slice(0, 7));
  }
  if (accounts.size === 0) {
    accounts.add("general");
  }

  const resultKeys = new Set([
    ...glMap.keys(),
    ...subMap.keys(),
    ...transactionBuckets.keys(),
  ]);
  const reconciliations = Array.from(resultKeys).map((key) => {
    const { account, period } = splitKey(key);
    const gl = glMap.get(key) ?? 0;
    const sub = subMap.get(key) ?? 0;
    const variance = gl - sub;
    const absVariance = Math.abs(variance);
    const related = transactionBuckets.get(key) ?? [];
    const material = absVariance >= materialityThreshold;
    const status =
      absVariance < 0.01
        ? "balanced"
        : material
          ? "material_variance"
          : "immaterial_variance";
    const notes: string[] = [];
    if (absVariance < 0.01) {
      notes.push("In balance.");
    } else {
      notes.push(
        `Variance of ${variance.toFixed(2)} detected between GL and subledger.`,
      );
      if (material) {
        notes.push(
          `Variance exceeds materiality threshold (${materialityThreshold.toFixed(2)}).`,
        );
      } else {
        notes.push("Variance is immaterial but should be monitored.");
      }
    }
    if (related.length === 0) {
      notes.push("No matching transactions were supplied for this slice.");
    } else {
      notes.push(`${related.length} supporting transactions attached.`);
    }
    const activity =
      activityByAccountPeriod.get(key) ??
      payload.activityByPeriod?.[period] ??
      0;
    const adjustments = payload.adjustmentsByPeriod?.[period] ?? 0;

    return {
      account,
      period: period || "unspecified",
      glBalance: gl,
      subledgerBalance: sub,
      variance,
      status,
      material,
      activity,
      adjustments,
      notes,
      transactions: related,
    };
  });

  const rollForward: Array<{
    account: string;
    period: string;
    opening: number;
    activity: number;
    adjustments: number;
    closing: number;
    commentary: string;
  }> = [];

  for (const account of accounts) {
    let opening = 0;
    for (const period of periodOrder) {
      const key = makeKey(account, period);
      const activity =
        activityByAccountPeriod.get(key) ??
        payload.activityByPeriod?.[period] ??
        0;
      const adjustments = payload.adjustmentsByPeriod?.[period] ?? 0;
      const closingBalance = glMap.get(key);
      const closing =
        typeof closingBalance === "number"
          ? closingBalance
          : opening + activity + adjustments;
      const commentaryParts: string[] = [];
      if (Math.abs(activity) > 0.01) {
        commentaryParts.push(`Activity ${activity.toFixed(2)}`);
      }
      if (Math.abs(adjustments) > 0.01) {
        commentaryParts.push(`Adjustments ${adjustments.toFixed(2)}`);
      }
      if (commentaryParts.length === 0) {
        commentaryParts.push("No material movement recorded.");
      }
      rollForward.push({
        account,
        period,
        opening,
        activity,
        adjustments,
        closing,
        commentary: commentaryParts.join(" | "),
      });
      opening = closing;
    }
  }

  return {
    materiality: materialityThreshold,
    reconciliations,
    rollForward,
    transactions: normalizedTransactions.slice(0, 250),
  };
}

function aggregateBalances(balances: z.infer<typeof balanceSchema>[]) {
  return balances.reduce<Map<string, number>>((acc, balance) => {
    const key = makeKey(balance.account, balance.period ?? "");
    acc.set(key, (acc.get(key) ?? 0) + balance.amount);
    return acc;
  }, new Map());
}

function makeKey(account: string, period: string) {
  return `${account}|${period}`;
}

function splitKey(key: string) {
  const [account, period] = key.split("|");
  return { account, period: period ?? "" };
}

function normalizeTransactions(
  raw: PayloadInput["transactions"],
): NormalizedTransaction[] {
  if (!raw) {
    return [];
  }
  return raw.map((transaction) => {
    const debit = transaction.debit ?? 0;
    const credit = transaction.credit ?? 0;
    let net = debit - credit;
    if (!transaction.debit && !transaction.credit && typeof transaction.amount === "number") {
      net = transaction.amount;
    }
    const bookedDate =
      transaction.booked_at instanceof Date
        ? transaction.booked_at
        : new Date(transaction.booked_at);
    const booked_at = Number.isNaN(bookedDate.getTime())
      ? new Date().toISOString()
      : bookedDate.toISOString();
    const metadata: Record<string, string> = {
      ...(transaction.metadata ?? {}),
    };
    const period =
      metadata.period ??
      metadata.source_period ??
      booked_at.slice(0, 7) ??
      "";
    return {
      account: transaction.account,
      period,
      booked_at,
      description: transaction.description ?? "",
      debit,
      credit,
      net,
      metadata,
    };
  });
}

const port = Number(process.env.PORT ?? 4100);
fastify.listen({ port, host: "0.0.0.0" }).catch((error) => {
  fastify.log.error(error);
  process.exit(1);
});
