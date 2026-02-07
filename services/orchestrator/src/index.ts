import Fastify from "fastify";
import cors from "@fastify/cors";
import { OpenAI } from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import spec from "../../../specs/reconciliation.speckit.json" with { type: "json" };
import { runGeminiAgentPipeline } from "./agents/gemini-agents.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envCandidates = [
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "..", "..", ".env"),
];
const envPath = envCandidates.find((candidate) => fs.existsSync(candidate));
dotenv.config(envPath ? { path: envPath } : undefined);

const fastify = Fastify({ logger: true });

// Enable CORS for web app requests
await fastify.register(cors, {
  origin: ["http://localhost:3100", "http://127.0.0.1:3100", "http://localhost:3000"],
  credentials: true,
});

const balanceSchema = z.object({
  account_code: z.string(),
  period: z.string().optional().default(""),
  amount: z.number(),
  currency: z.string().optional(),
});

const transactionSchema = z.object({
  account_code: z.string(),
  booked_at: z.union([z.string(), z.date()]),
  debit: z.number().optional(),
  credit: z.number().optional(),
  amount: z.number().optional(),
  narrative: z.string().optional(),
  source_period: z.string().optional(),
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
  materialityThreshold: z.number().min(0).optional(),
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

const llmMode = (process.env.ORCHESTRATOR_LLM_MODE ?? "auto").toLowerCase();
const normalizedLlmMode =
  llmMode === "auto" || llmMode === "openai" || llmMode === "gemini" || llmMode === "none"
    ? llmMode
    : "auto";

const supervisorModel =
  process.env.OPENAI_SUPERVISOR_MODEL ?? "gpt-4o-mini";
const reviewerModel =
  process.env.OPENAI_REVIEWER_MODEL ?? "gpt-4o-mini";

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
          account_code: { type: "string" },
          period: { type: "string" },
          amount: { type: "number" },
          currency: { type: "string" },
        },
        required: ["account_code", "amount"],
      },
    },
    subledger_balances: {
      type: "array",
      items: {
        type: "object",
        properties: {
          account_code: { type: "string" },
          period: { type: "string" },
          amount: { type: "number" },
          currency: { type: "string" },
        },
        required: ["account_code", "amount"],
      },
    },
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          account_code: { type: "string" },
          booked_at: { type: "string" },
          debit: { type: "number" },
          credit: { type: "number" },
          amount: { type: "number" },
          narrative: { type: "string" },
          source_period: { type: "string" },
        },
        required: ["account_code", "booked_at"],
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
    // Create user-friendly error messages
    const errors = parsed.error.issues.map((err) => {
      const path = err.path.join(".");
      if (err.code === "invalid_type") {
        // Type assertion: when code is "invalid_type", err has received/expected properties
        const typeErr = err as any as { expected: string; received: string };
        if (typeErr.expected === "string" && typeErr.received === "undefined") {
          return `Missing required field: ${path}. Please check your column mappings.`;
        }
        if (typeErr.expected === "number" && typeErr.received === "string") {
          return `Field "${path}" must be a number, but received text. Check your data format.`;
        }
        return `Field "${path}" has wrong data type. Expected ${typeErr.expected}, got ${typeErr.received}.`;
      }
      if (err.code === "invalid_union") {
        return `Field "${path}" does not match expected format.`;
      }
      return `Field "${path}": ${err.message}`;
    });

    return reply.status(400).send({
      message: "Unable to process your data. Please check the errors below:",
      errors: errors,
      help: [
        "Make sure all required columns are mapped correctly",
        "Check that numeric fields (like 'amount') contain numbers",
        "Verify that account codes are text (not formulas or blank)",
      ],
    });
  }

  const orchestrated = await orchestrateRun(parsed.data);
  return reply.send(orchestrated);
});

async function orchestrateRun(input: RunInput) {
  const runId = `run_${Date.now()}`;
  const localToolOutput = runReconciliationLocally(input.payload, input.materialityThreshold, input.userPrompt);

  const timeline = [
    {
      stage: "spec_validation",
      status: "completed",
      detail: "Validated payload against Spec-Kit canonical models.",
      timestamp: new Date().toISOString(),
    },
  ];

  const shouldRunOpenAi =
    (normalizedLlmMode === "auto" || normalizedLlmMode === "openai") &&
    Boolean(openaiClient);
  const shouldRunClaude =
    (normalizedLlmMode === "auto" || normalizedLlmMode === "openai") &&
    Boolean(anthropicClient);
  const shouldRunGemini =
    (normalizedLlmMode === "auto" || normalizedLlmMode === "gemini") &&
    Boolean(geminiClient);

  let openAiResult: Awaited<ReturnType<typeof runOpenAiTeam>> | null = null;
  if (shouldRunOpenAi) {
    try {
      openAiResult = await runOpenAiTeam(
        input.userPrompt,
        input.payload,
        localToolOutput,
      );
      timeline.push({
        stage: "openai_supervisor",
        status: "completed",
        detail: "OpenAI agents completed.",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      timeline.push({
        stage: "openai_supervisor",
        status: "failed",
        detail: `OpenAI agents failed: ${formatError(error)}`,
        timestamp: new Date().toISOString(),
      });
      openAiResult = {
        message:
          "OpenAI agents failed to run. Configure a valid OpenAI model (or switch to Gemini-only mode).",
        messagesByRole: {},
        toolOutput: localToolOutput,
      };
    }
  } else {
    timeline.push({
      stage: "openai_supervisor",
      status: "skipped",
      detail:
        normalizedLlmMode === "gemini" || normalizedLlmMode === "none"
          ? "Skipped OpenAI agents (Gemini-only / none mode)."
          : "OPENAI_API_KEY not configured; skipped OpenAI agents.",
      timestamp: new Date().toISOString(),
    });
    openAiResult = {
      message:
        "OpenAI agents were skipped. Set ORCHESTRATOR_LLM_MODE=openai to enable, or provide an OpenAI API key.",
      messagesByRole: {},
      toolOutput: localToolOutput,
    };
  }

  let claudeResponses: Awaited<ReturnType<typeof runClaudeSkills>> | null = null;
  if (shouldRunClaude) {
    try {
      claudeResponses = await runClaudeSkills(input);
      timeline.push({
        stage: "claude_skills",
        status: "completed",
        detail: "Claude skills completed.",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      timeline.push({
        stage: "claude_skills",
        status: "failed",
        detail: `Claude skills failed: ${formatError(error)}`,
        timestamp: new Date().toISOString(),
      });
      claudeResponses = [
        {
          skill: "column_mapper",
          response: "Claude skills failed to run.",
        },
        {
          skill: "variance_investigator",
          response: "Claude skills failed to run.",
        },
      ];
    }
  } else {
    timeline.push({
      stage: "claude_skills",
      status: "skipped",
      detail:
        normalizedLlmMode === "gemini" || normalizedLlmMode === "none"
          ? "Skipped Claude skills (Gemini-only / none mode)."
          : "Claude API key missing; skipped skills.",
      timestamp: new Date().toISOString(),
    });
    claudeResponses = [
      {
        skill: "column_mapper",
        response: "Claude API key not configured; skipped.",
      },
      {
        skill: "variance_investigator",
        response: "Claude API key not configured; skipped.",
      },
    ];
  }

  const geminiInsight = shouldRunGemini
    ? await summarizeWithGemini(input, localToolOutput)
    : null;
  timeline.push({
    stage: "gemini_commentary",
    status: geminiInsight ? "completed" : "skipped",
    detail: geminiInsight
      ? "Gemini produced narrative commentary."
      : normalizedLlmMode === "none" || normalizedLlmMode === "openai"
        ? "Skipped Gemini commentary."
        : "Gemini API key missing; skipped commentary.",
    timestamp: new Date().toISOString(),
  });

  // NEW: Run Gemini Multi-Agent Pipeline (default for free tier)
  let geminiAgentResults = null;
  if (shouldRunGemini) {
    try {
      timeline.push({
        stage: "gemini_agents_start",
        status: "in_progress",
        detail: "Starting Gemini multi-agent pipeline (4 agents)...",
        timestamp: new Date().toISOString(),
      });

      geminiAgentResults = await runGeminiAgentPipeline(input, localToolOutput);

      timeline.push({
        stage: "gemini_agents_complete",
        status: "completed",
        detail: "Gemini agents completed: Validation → Analysis → Investigation → Report",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      timeline.push({
        stage: "gemini_agents_error",
        status: "failed",
        detail: `Gemini agents failed: ${formatError(error)}`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return {
    runId,
    spec: {
      name: spec.name,
      version: spec.version,
      summary: spec.summary,
    },
    timeline,
    openai: openAiResult ?? undefined,
    claudeSkills: claudeResponses ?? undefined,
    geminiInsight,
    geminiAgents: geminiAgentResults ?? undefined, // NEW: Include Gemini agent results
    toolOutput: localToolOutput,
  };
}

function formatError(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (error) {
    return String(error);
  }
  return "unknown error";
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
        }, localToolOutput.materiality, userPrompt);
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

/**
 * Round number to 2 decimal places for accounting precision
 */
function roundTo2Decimals(num: number): number {
  return Math.round(num * 100) / 100;
}

/**
 * Extract account codes from user prompt
 * Examples: "reconcile account 200" -> ["200"]
 *           "reconcile accounts 200, 120, and 300" -> ["200", "120", "300"]
 */
function extractAccountCodesFromPrompt(prompt: string): string[] | null {
  if (!prompt) return null;

  const accountCodes: string[] = [];

  // Pattern 1: "account 200" or "accounts 200, 120"
  const matches = prompt.matchAll(/\b(?:account|acct)s?\s+([0-9,\s]+(?:and\s+[0-9]+)?)/gi);

  for (const match of matches) {
    const rawCodes = match[1];
    if (!rawCodes) {
      continue;
    }

    const codes = rawCodes
      .split(/[,\s]+and\s+|[,\s]+/)
      .map(code => code.trim())
      .filter(code => /^\d+$/.test(code));
    accountCodes.push(...codes);
  }

  return accountCodes.length > 0 ? [...new Set(accountCodes)] : null;
}

/**
 * Determine which accounts to reconcile based on user prompt and available data
 *
 * Logic:
 * 1. If specific accounts mentioned (e.g., "account 200"), use those
 * 2. If user says "all accounts" or "all GL accounts", use all GL accounts
 * 3. Default: Use intersection of GL and subledger accounts (accounts present in both)
 */
function determineAccountsToReconcile(
  prompt: string | undefined,
  glBalances: any[],
  subledgerBalances: any[]
): string[] {
  // Extract explicitly requested accounts from prompt
  const requestedAccounts = prompt ? extractAccountCodesFromPrompt(prompt) : null;

  // If specific accounts mentioned, use those
  if (requestedAccounts && requestedAccounts.length > 0) {
    return requestedAccounts;
  }

  // Check if user wants ALL GL accounts (explicit request)
  if (prompt && /\b(?:all|every)\s+(?:gl\s+)?accounts?\b/i.test(prompt)) {
    // Return all GL account codes
    return [...new Set(glBalances.map(b => b.account_code))];
  }

  // Default: Reconcile only accounts that exist in BOTH GL and subledger (intersection)
  const glAccounts = new Set(glBalances.map(b => b.account_code));
  const subledgerAccounts = new Set(subledgerBalances.map(b => b.account_code));

  // Intersection: accounts present in both
  return [...glAccounts].filter(acc => subledgerAccounts.has(acc));
}

function runReconciliationLocally(payload: PayloadInput, customMaterialityThreshold?: number, userPrompt?: string) {
  // Use custom threshold if provided, otherwise use environment variable default
  const threshold = customMaterialityThreshold ?? materialityThreshold;

  // Determine which accounts to reconcile based on prompt and available data
  const accountsToReconcile = determineAccountsToReconcile(
    userPrompt,
    payload.glBalances,
    payload.subledgerBalances
  );

  // Filter GL and subledger data to only include accounts we're reconciling
  const accountSet = new Set(accountsToReconcile);
  let glBalances = payload.glBalances.filter(b => accountSet.has(b.account_code));
  let subledgerBalances = payload.subledgerBalances.filter(b => accountSet.has(b.account_code));

  const glMap = aggregateBalances(glBalances);
  const subMap = aggregateBalances(subledgerBalances);
  const accounts = new Set<string>();
  const detectedPeriods = new Set<string>();

  for (const balance of glBalances) {
    accounts.add(balance.account_code);
    if (balance.period) detectedPeriods.add(balance.period);
  }
  for (const balance of subledgerBalances) {
    accounts.add(balance.account_code);
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
    const gl = roundTo2Decimals(glMap.get(key) ?? 0);
    const sub = roundTo2Decimals(subMap.get(key) ?? 0);
    const variance = roundTo2Decimals(gl - sub);
    const absVariance = Math.abs(variance);
    const related = transactionBuckets.get(key) ?? [];
    const material = absVariance >= threshold;
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
          `Variance exceeds materiality threshold (${threshold.toFixed(2)}).`,
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
    const activity = roundTo2Decimals(
      activityByAccountPeriod.get(key) ??
      payload.activityByPeriod?.[period] ??
      0
    );
    const adjustments = roundTo2Decimals(payload.adjustmentsByPeriod?.[period] ?? 0);

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
      const activity = roundTo2Decimals(
        activityByAccountPeriod.get(key) ??
        payload.activityByPeriod?.[period] ??
        0
      );
      const adjustments = roundTo2Decimals(payload.adjustmentsByPeriod?.[period] ?? 0);
      const closingBalance = glMap.get(key);
      const closing = roundTo2Decimals(
        typeof closingBalance === "number"
          ? closingBalance
          : opening + activity + adjustments
      );
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
        opening: roundTo2Decimals(opening),
        activity,
        adjustments,
        closing,
        commentary: commentaryParts.join(" | "),
      });
      opening = closing;
    }
  }

  return {
    materiality: threshold,
    reconciliations,
    rollForward,
    transactions: normalizedTransactions.slice(0, 250),
  };
}

function aggregateBalances(balances: z.infer<typeof balanceSchema>[]) {
  return balances.reduce<Map<string, number>>((acc, balance) => {
    const key = makeKey(balance.account_code, balance.period ?? "");
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
    const metadata: Record<string, string> =
      (transaction.metadata as Record<string, string> | undefined) ?? {};
    const period =
      transaction.source_period ??
      metadata.period ??
      metadata.source_period ??
      booked_at.slice(0, 7) ??
      "";
    return {
      account: transaction.account_code,
      period,
      booked_at,
      description: transaction.narrative ?? "",
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
