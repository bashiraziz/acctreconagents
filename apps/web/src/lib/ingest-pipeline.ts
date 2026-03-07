import { put } from "@vercel/blob";
import Papa from "papaparse";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Balance } from "@/types/reconciliation";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTENSIONS = new Set(["csv", "tsv", "txt"]);
const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "text/tab-separated-values",
  "text/plain",
  "application/vnd.ms-excel",
  "application/tab-separated-values",
  "application/csv",
  "application/octet-stream",
  "",
]);

export type IngestSource = "ui" | "s3-drop";

export type IngestPipelineParams = {
  tenantId: string;
  fileName: string;
  buffer: Buffer;
  kind?: string;
  mimeType?: string;
  source: IngestSource;
};

export type IngestResult = {
  ok: true;
  tenantId: string;
  source: IngestSource;
  kind: string;
  fileName: string;
  originalFileName: string;
  size: number;
  storageType: "blob" | "local";
  url?: string;
  path?: string;
  rowCount: number;
  columnCount: number;
  headers: string[];
  forecastTriggered: boolean;
};

type ParseSummary = {
  rowCount: number;
  columnCount: number;
  headers: string[];
  rows: Record<string, unknown>[];
};

const storageDir = path.join(process.cwd(), ".uploads");
const ingestStageDir = path.join(process.cwd(), ".ingest-staging");
const DEFAULT_ORCHESTRATOR_URL = "http://127.0.0.1:4100";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function extensionFromFileName(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext ?? "";
}

function assertValidInput(params: IngestPipelineParams): void {
  const { fileName, buffer, mimeType } = params;

  if (!fileName.trim()) {
    throw new Error("File name is required");
  }

  if (buffer.length === 0) {
    throw new Error("File is empty");
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `File too large: ${buffer.length} bytes (max ${MAX_FILE_SIZE} bytes)`
    );
  }

  const ext = extensionFromFileName(fileName);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error("Invalid file extension. Only .csv, .tsv, and .txt are allowed");
  }

  if (mimeType !== undefined && mimeType !== null && !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new Error(`Invalid file type: ${mimeType}`);
  }
}

function parseBuffer(buffer: Buffer): ParseSummary {
  const text = buffer.toString("utf8");
  const parseResult = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  if (parseResult.errors.length > 0) {
    const firstError = parseResult.errors[0];
    throw new Error(
      `Parse error at row ${firstError.row ?? "unknown"}: ${firstError.message}`
    );
  }

  const rows = parseResult.data ?? [];
  if (rows.length === 0) {
    throw new Error("File is empty or has no data rows");
  }

  const headers = parseResult.meta.fields ?? Object.keys(rows[0] ?? {});
  return {
    rowCount: rows.length,
    columnCount: headers.length,
    headers,
    rows,
  };
}

async function persistFile(
  storedFileName: string,
  buffer: Buffer
): Promise<{ storageType: "blob" | "local"; url?: string; path?: string }> {
  const isBlobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

  if (isBlobConfigured) {
    const blob = await put(storedFileName, buffer, {
      access: "public",
      addRandomSuffix: false,
    });
    return {
      storageType: "blob",
      url: blob.url,
    };
  }

  await fs.mkdir(storageDir, { recursive: true });
  const filePath = path.join(storageDir, storedFileName);
  await fs.writeFile(filePath, buffer);
  return {
    storageType: "local",
    path: filePath,
  };
}

function shouldParseContent(kind: string, source: IngestSource): boolean {
  void kind;
  if (source === "s3-drop") {
    return true;
  }
  // UI uploads should still return row/header metadata for parseable CSV/TSV/TXT files.
  return source === "ui";
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") {
    return null;
  }
  let cleaned = value.trim();
  if (!cleaned) return null;
  cleaned = cleaned.replace(/[$,]/g, "");
  if (cleaned.startsWith("(") && cleaned.endsWith(")")) {
    cleaned = `-${cleaned.slice(1, -1)}`;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePeriod(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") {
    return null;
  }
  const text = String(value).trim();
  if (!text) return null;

  const ym = text.match(/^(\d{4})-(\d{2})$/);
  if (ym) return `${ym[1]}-${ym[2]}`;

  const iso = text.match(/^(\d{4})-(\d{2})-\d{2}$/);
  if (iso) return `${iso[1]}-${iso[2]}`;

  const us = text.match(/^(\d{1,2})\/\d{1,2}\/(\d{4})$/);
  if (us) {
    return `${us[2]}-${us[1].padStart(2, "0")}`;
  }

  return null;
}

function findHeader(headers: string[], patterns: RegExp[]): string | null {
  for (const header of headers) {
    const normalized = normalizeKey(header);
    if (patterns.some((pattern) => pattern.test(normalized))) {
      return header;
    }
  }
  return null;
}

function buildCanonicalBalances(
  rows: Record<string, unknown>[],
  headers: string[],
  fallbackPeriod: string
): Balance[] {
  const accountHeader =
    findHeader(headers, [
      /^account_code$/,
      /^account$/,
      /account.*code/,
      /account.*number/,
      /^code$/,
      /^gl.*account$/,
      /^acct.*code$/,
    ]) ?? "account_code";
  const amountHeader =
    findHeader(headers, [
      /^amount$/,
      /^balance$/,
      /^net$/,
      /closing.*balance/,
      /year.*to.*date/,
    ]) ?? null;
  const debitHeader = findHeader(headers, [/^debit$/, /debit/]);
  const creditHeader = findHeader(headers, [/^credit$/, /credit/]);
  const periodHeader = findHeader(headers, [/^period$/, /month/, /date/]);
  const currencyHeader = findHeader(headers, [/^currency$/, /curr/, /ccy/]);

  const balances: Balance[] = [];
  for (const row of rows) {
    const accountCodeRaw = row[accountHeader];
    const accountCode = String(accountCodeRaw ?? "").trim();
    if (!accountCode) continue;

    let amount: number | null = null;
    if (amountHeader) {
      amount = parseNumber(row[amountHeader]);
    }
    if (amount === null && (debitHeader || creditHeader)) {
      const debit = debitHeader ? parseNumber(row[debitHeader]) ?? 0 : 0;
      const credit = creditHeader ? parseNumber(row[creditHeader]) ?? 0 : 0;
      amount = debit - credit;
    }
    if (amount === null) continue;

    const period =
      (periodHeader ? parsePeriod(row[periodHeader]) : null) ?? fallbackPeriod;
    const currencyValue =
      currencyHeader && typeof row[currencyHeader] === "string"
        ? String(row[currencyHeader]).trim()
        : "";
    const currency = currencyValue || "USD";

    balances.push({
      account_code: accountCode,
      amount,
      period,
      currency,
    });
  }
  return balances;
}

function currentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function stageFilePath(tenantId: string, kind: string): string {
  const safeTenant = tenantId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(ingestStageDir, safeTenant, `${kind}.json`);
}

async function saveStagedBalances(
  tenantId: string,
  kind: "gl_balance" | "subledger_balance",
  balances: Balance[]
): Promise<void> {
  const filePath = stageFilePath(tenantId, kind);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(balances), "utf8");
}

async function loadStagedBalances(
  tenantId: string,
  kind: "gl_balance" | "subledger_balance"
): Promise<Balance[] | null> {
  const filePath = stageFilePath(tenantId, kind);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as Balance[];
  } catch {
    return null;
  }
}

async function postToOrchestrator(payload: unknown): Promise<boolean> {
  const baseUrl = process.env.ORCHESTRATOR_URL?.trim() || DEFAULT_ORCHESTRATOR_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${baseUrl}/agent/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function maybeTriggerAutoForecast(
  params: IngestPipelineParams,
  summary: ParseSummary
): Promise<boolean> {
  const autoForecastEnabled =
    (process.env.INGEST_AUTO_FORECAST_ENABLED ?? "true").toLowerCase() === "true";
  if (!autoForecastEnabled) {
    return false;
  }
  if (params.source !== "s3-drop") {
    return false;
  }
  const kind = params.kind ?? "supporting";
  if (kind !== "gl_balance" && kind !== "subledger_balance") {
    return false;
  }

  const period = currentPeriod();
  const balances = buildCanonicalBalances(summary.rows, summary.headers, period);
  if (balances.length === 0) {
    return false;
  }

  await saveStagedBalances(params.tenantId, kind, balances);

  const glBalances = await loadStagedBalances(params.tenantId, "gl_balance");
  const subledgerBalances = await loadStagedBalances(params.tenantId, "subledger_balance");
  if (!glBalances || !subledgerBalances) {
    return false;
  }

  const materialityThreshold = Number(process.env.MATERIALITY_THRESHOLD ?? "50");
  return postToOrchestrator({
    payload: {
      glBalances,
      subledgerBalances,
      transactions: [],
    },
    materialityThreshold: Number.isFinite(materialityThreshold)
      ? materialityThreshold
      : 50,
    userPrompt: `Auto-forecast run triggered from S3 drop for tenant ${params.tenantId}.`,
  });
}

export async function runIngestPipeline(
  params: IngestPipelineParams
): Promise<IngestResult> {
  assertValidInput(params);

  const safeName = sanitizeFileName(path.basename(params.fileName));
  const storedFileName = `${Date.now()}-${safeName}`;
  const kind = params.kind ?? "supporting";
  const emptySummary = { rowCount: 0, columnCount: 0, headers: [], rows: [] };
  let summary: ParseSummary = emptySummary;
  if (shouldParseContent(kind, params.source)) {
    try {
      summary = parseBuffer(params.buffer);
    } catch (error) {
      if (params.source === "s3-drop") {
        throw error;
      }
      if (process.env.NODE_ENV !== "test") {
        console.warn("UI upload parse skipped due to parse error:", error);
      }
    }
  }
  const stored = await persistFile(storedFileName, params.buffer);

  const forecastTriggered = await maybeTriggerAutoForecast(params, summary);

  return {
    ok: true,
    tenantId: params.tenantId,
    source: params.source,
    kind,
    fileName: storedFileName,
    originalFileName: params.fileName,
    size: params.buffer.length,
    storageType: stored.storageType,
    url: stored.url,
    path: stored.path,
    rowCount: summary.rowCount,
    columnCount: summary.columnCount,
    headers: summary.headers,
    forecastTriggered,
  };
}
