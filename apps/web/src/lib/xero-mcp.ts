import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const DEFAULT_MCP_COMMAND = "npx";
const DEFAULT_MCP_ARGS = ["-y", "@xeroapi/xero-mcp-server@latest"];
const DEFAULT_MCP_TIMEOUT_MS = 45_000;

export type XeroMcpConfig = {
  enabled: boolean;
  viable: boolean;
  configured: boolean;
  hasDirectCredentials: boolean;
  command: string;
  args: string[];
  timeoutMs: number;
  paymentsOnly: boolean;
  reason?: string;
};

export type XeroMcpTrialBalanceResult = {
  reportName: string | null;
  reportDate: string | null;
  rows: unknown[];
};

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "off"].includes(normalized)) return false;
  return fallback;
}

function parseArgList(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) {
    return [...DEFAULT_MCP_ARGS];
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed) && parsed.every((entry) => typeof entry === "string")) {
        return parsed;
      }
    } catch {
      // Fall through to comma-delimited parsing.
    }
  }
  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getStringEnv(
  env: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      out[key] = value;
    }
  }
  return out;
}

function buildMcpChildEnv(bearerTokenOverride?: string): Record<string, string> {
  const env = getStringEnv();
  const mcpClientId = process.env.XERO_MCP_CLIENT_ID?.trim();
  const mcpClientSecret = process.env.XERO_MCP_CLIENT_SECRET?.trim();
  const mcpBearerToken =
    bearerTokenOverride?.trim() ||
    process.env.XERO_MCP_CLIENT_BEARER_TOKEN?.trim();

  if (mcpClientId) env.XERO_CLIENT_ID = mcpClientId;
  if (mcpClientSecret) env.XERO_CLIENT_SECRET = mcpClientSecret;
  if (mcpBearerToken) env.XERO_CLIENT_BEARER_TOKEN = mcpBearerToken;

  return env;
}

export function getXeroMcpConfig(): XeroMcpConfig {
  const enabled = parseBoolean(process.env.XERO_MCP_ENABLED, false);
  const command = process.env.XERO_MCP_COMMAND?.trim() || DEFAULT_MCP_COMMAND;
  const args = parseArgList(process.env.XERO_MCP_ARGS);
  const timeoutMsRaw = Number(process.env.XERO_MCP_TIMEOUT_MS ?? DEFAULT_MCP_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(timeoutMsRaw)
    ? Math.max(5_000, Math.floor(timeoutMsRaw))
    : DEFAULT_MCP_TIMEOUT_MS;
  const paymentsOnly = parseBoolean(process.env.XERO_MCP_PAYMENTS_ONLY, false);

  const hasMcpBearer = Boolean(process.env.XERO_MCP_CLIENT_BEARER_TOKEN?.trim());
  const hasMcpClientCreds =
    Boolean(process.env.XERO_MCP_CLIENT_ID?.trim()) &&
    Boolean(process.env.XERO_MCP_CLIENT_SECRET?.trim());

  const hasDirectCredentials = hasMcpBearer || hasMcpClientCreds;
  // Vercel serverless cannot spawn stdio child processes — MCP is not viable there.
  const viable = !process.env.VERCEL;

  return {
    enabled: enabled && viable,
    viable,
    configured: hasDirectCredentials,
    hasDirectCredentials,
    command,
    args,
    timeoutMs,
    paymentsOnly,
    reason: hasDirectCredentials
      ? undefined
      : "Set XERO_MCP_CLIENT_BEARER_TOKEN or XERO_MCP_CLIENT_ID/XERO_MCP_CLIENT_SECRET, or connect Xero via app OAuth and MCP will reuse that token.",
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

function extractToolTextBlocks(result: unknown): string[] {
  const blocks: string[] = [];
  const root = result as { content?: unknown; toolResult?: unknown };
  const candidates: unknown[] = [];
  if (Array.isArray(root?.content)) candidates.push(...root.content);
  const toolResult = root?.toolResult as { content?: unknown } | undefined;
  if (Array.isArray(toolResult?.content)) candidates.push(...toolResult.content);

  for (const candidate of candidates) {
    const item = candidate as { type?: string; text?: unknown };
    if (item?.type === "text" && typeof item.text === "string") {
      blocks.push(item.text);
    }
  }
  return blocks;
}

function extractPrefixedValue(blocks: string[], prefix: string): string | null {
  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
      return trimmed.slice(prefix.length).trim() || null;
    }
  }
  return null;
}

function extractJsonCandidateRows(candidate: string): unknown[] {
  if (!candidate) return [];
  if (!candidate.startsWith("[") && !candidate.startsWith("{")) return [];
  try {
    const parsed = JSON.parse(candidate) as unknown;
    if (Array.isArray(parsed)) {
      return parsed;
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { rows?: unknown[] }).rows)
    ) {
      return (parsed as { rows: unknown[] }).rows;
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray((parsed as { Rows?: unknown[] }).Rows)
    ) {
      return (parsed as { Rows: unknown[] }).Rows;
    }
  } catch {
    return [];
  }
  return [];
}

function extractRowsJson(blocks: string[]): unknown[] {
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const candidates: string[] = [trimmed];
    const codeFenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (codeFenceMatch?.[1]) candidates.push(codeFenceMatch[1].trim());
    const arrayStart = trimmed.indexOf("[");
    const arrayEnd = trimmed.lastIndexOf("]");
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      candidates.push(trimmed.slice(arrayStart, arrayEnd + 1).trim());
    }
    const objectStart = trimmed.indexOf("{");
    const objectEnd = trimmed.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) {
      candidates.push(trimmed.slice(objectStart, objectEnd + 1).trim());
    }

    for (const candidate of candidates) {
      const rows = extractJsonCandidateRows(candidate);
      if (rows.length > 0) {
        return rows;
      }
    }
  }
  return [];
}

function extractMcpErrorText(blocks: string[]): string | null {
  const errorPrefix = "Error listing trial balance:";
  const explicit = extractPrefixedValue(blocks, errorPrefix);
  if (explicit) {
    return explicit;
  }
  const generic = blocks.find((block) => block.toLowerCase().includes("error"));
  return generic ? generic.trim() : null;
}

function normalizeMcpErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (
    trimmed.includes("Failed to get Xero token") &&
    trimmed.includes("[object Object]")
  ) {
    return [
      "Failed to get Xero token.",
      "MCP usually requires either:",
      "1) a valid XERO_MCP_CLIENT_BEARER_TOKEN, or",
      "2) valid custom-connection credentials (XERO_MCP_CLIENT_ID + XERO_MCP_CLIENT_SECRET).",
      "If you are using a standard OAuth web-app client, use the app's built-in OAuth mode instead of MCP mode.",
    ].join(" ");
  }
  return trimmed;
}

export async function pullXeroTrialBalanceViaMcp(input: {
  date?: string;
  paymentsOnly?: boolean;
  timeoutMs?: number;
  bearerTokenOverride?: string;
}): Promise<XeroMcpTrialBalanceResult> {
  const config = getXeroMcpConfig();
  if (!config.enabled) {
    throw new Error("Xero MCP mode is disabled.");
  }
  const hasBridgeToken = Boolean(input.bearerTokenOverride?.trim());
  if (!config.configured && !hasBridgeToken) {
    throw new Error(config.reason || "Xero MCP mode is not configured.");
  }

  const timeoutMs = input.timeoutMs ?? config.timeoutMs;
  const client = new Client(
    {
      name: "rowshni-xero-mcp-client",
      version: "0.1.0",
    },
    {
      capabilities: {},
    }
  );
  const transport = new StdioClientTransport({
    command: config.command,
    args: config.args,
    env: buildMcpChildEnv(input.bearerTokenOverride),
    stderr: "pipe",
  });
  const stderrLogs: string[] = [];
  const stderrStream = transport.stderr;
  if (stderrStream) {
    stderrStream.on("data", (chunk) => {
      const text = String(chunk ?? "").trim();
      if (!text) return;
      stderrLogs.push(text);
      if (stderrLogs.length > 30) {
        stderrLogs.shift();
      }
    });
  }

  try {
    await withTimeout(
      client.connect(transport),
      timeoutMs,
      "Timed out connecting to Xero MCP server."
    );
    const tools = await withTimeout(
      client.listTools(),
      timeoutMs,
      "Timed out listing Xero MCP tools."
    );
    const hasTrialBalanceTool = tools.tools.some(
      (tool) => tool.name === "list-trial-balance"
    );
    if (!hasTrialBalanceTool) {
      throw new Error("Xero MCP server does not expose list-trial-balance.");
    }

    const argumentsPayload: { date?: string; paymentsOnly?: boolean } = {};
    if (input.date) argumentsPayload.date = input.date;
    argumentsPayload.paymentsOnly = input.paymentsOnly ?? config.paymentsOnly;

    const callResult = await withTimeout(
      client.callTool({
        name: "list-trial-balance",
        arguments: argumentsPayload,
      }),
      timeoutMs,
      "Timed out calling list-trial-balance via MCP."
    );

    const blocks = extractToolTextBlocks(callResult);
    const mcpErrorText = extractMcpErrorText(blocks);
    if (mcpErrorText) {
      throw new Error(`Xero MCP error: ${normalizeMcpErrorMessage(mcpErrorText)}`);
    }
    const rows = extractRowsJson(blocks);
    const result: XeroMcpTrialBalanceResult = {
      reportName: extractPrefixedValue(blocks, "Trial Balance Report:"),
      reportDate: extractPrefixedValue(blocks, "Date:"),
      rows,
    };
    if (rows.length === 0) {
      // Return empty result instead of 500 so UI can render a safe empty state.
      return result;
    }
    return result;
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Unknown MCP failure";
    const message = normalizeMcpErrorMessage(rawMessage);
    const stderrTail = stderrLogs.slice(-4).join(" | ").trim();
    if (stderrTail) {
      throw new Error(`${message} (MCP stderr: ${stderrTail})`);
    }
    throw error;
  } finally {
    await transport.close().catch(() => {
      // Ignore cleanup errors.
    });
  }
}
