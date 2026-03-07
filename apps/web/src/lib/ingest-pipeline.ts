import { put } from "@vercel/blob";
import Papa from "papaparse";
import { promises as fs } from "node:fs";
import path from "node:path";

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
};

const storageDir = path.join(process.cwd(), ".uploads");

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

export async function runIngestPipeline(
  params: IngestPipelineParams
): Promise<IngestResult> {
  assertValidInput(params);

  const safeName = sanitizeFileName(path.basename(params.fileName));
  const storedFileName = `${Date.now()}-${safeName}`;
  const kind = params.kind ?? "supporting";
  const emptySummary = { rowCount: 0, columnCount: 0, headers: [] };
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

  // Forecast trigger is reserved for later integration with orchestrator.
  const forecastTriggered = false;

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
