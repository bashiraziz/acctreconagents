import { NextResponse } from "next/server";
import { withErrorHandler, ApiErrors } from "@/lib/api-error";
import { runIngestPipeline } from "@/lib/ingest-pipeline";

// File upload constraints
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'text/tab-separated-values',
  'text/plain',
  'application/vnd.ms-excel',
  'application/tab-separated-values',
  'application/csv',
  'application/octet-stream', // Some browsers send this for CSV files
  '', // Empty MIME type (some browsers don't set it)
];

export const POST = withErrorHandler(async (request: Request) => {
  const data = await request.formData();
  const file = data.get("file");
  const kind = String(data.get("kind") ?? "supporting");
  const tenantId = String(data.get("tenantId") ?? "anonymous");

  // Validate file exists
  if (!(file instanceof File)) {
    return ApiErrors.badRequest(
      "Missing file",
      "file field is required in the form data",
      ["Ensure you're sending a multipart/form-data request with a 'file' field"]
    );
  }

  // Validate file size BEFORE reading into memory
  if (file.size > MAX_FILE_SIZE) {
    return ApiErrors.payloadTooLarge(
      "File too large",
      `Maximum file size is ${MAX_FILE_SIZE / 1024 / 1024}MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB.`
    );
  }

  // Validate MIME type (only if set by browser)
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return ApiErrors.badRequest(
      "Invalid file type",
      `Only CSV/TSV/TXT files are allowed. Received: ${file.type}`,
      ["Upload a CSV, TSV, or TXT file", "Ensure the file has the correct MIME type"]
    );
  }

  // Validate file extension (primary check)
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!['csv', 'tsv', 'txt'].includes(fileExtension || '')) {
    return ApiErrors.badRequest(
      "Invalid file extension",
      "Only .csv, .tsv, and .txt files are allowed",
      ["Rename your file to have a .csv, .tsv, or .txt extension"]
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await runIngestPipeline({
    tenantId,
    fileName: file.name,
    buffer,
    kind,
    mimeType: file.type,
    source: "ui",
  });

  return NextResponse.json({
    ok: result.ok,
    fileName: result.fileName,
    kind: result.kind,
    size: result.size,
    url: result.url,
    path: result.path,
    storageType: result.storageType,
    rowCount: result.rowCount,
    columnCount: result.columnCount,
    headers: result.headers,
  });
});
