import path from "node:path";
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import { runIngestPipeline } from "@/lib/ingest-pipeline";
import { downloadFromS3, headS3Object } from "@/lib/file-storage";
import { isSupportedDropFile, parseS3DropKey } from "@/lib/s3-drop";

export const runtime = "nodejs";

type IngestS3DropRequest = {
  tenantId?: string;
  s3Key?: string;
  jobId?: string;
  kind?: string;
  objectSize?: number;
};

function getInternalSecretFromRequest(request: Request): string {
  return request.headers.get("x-ingest-internal-secret")?.trim() ?? "";
}

function secureCompareSecrets(providedSecret: string, configuredSecret: string): boolean {
  const providedBuffer = Buffer.from(providedSecret);
  const configuredBuffer = Buffer.from(configuredSecret);

  if (providedBuffer.length !== configuredBuffer.length) {
    const maxLen = Math.max(providedBuffer.length, configuredBuffer.length, 1);
    const paddedProvided = Buffer.alloc(maxLen);
    const paddedConfigured = Buffer.alloc(maxLen);
    providedBuffer.copy(paddedProvided);
    configuredBuffer.copy(paddedConfigured);
    timingSafeEqual(paddedProvided, paddedConfigured);
    return false;
  }

  return timingSafeEqual(providedBuffer, configuredBuffer);
}

export const POST = withErrorHandler(async (request: Request) => {
  const configuredSecret = process.env.INGEST_INTERNAL_SECRET?.trim() ?? "";
  const providedSecret = getInternalSecretFromRequest(request);

  if (!configuredSecret || !secureCompareSecrets(providedSecret, configuredSecret)) {
    return ApiErrors.unauthorized(
      "Unauthorized internal ingest request",
      "INGEST_INTERNAL_SECRET is missing or invalid"
    );
  }

  let payload: IngestS3DropRequest;
  try {
    payload = (await request.json()) as IngestS3DropRequest;
  } catch {
    return ApiErrors.badRequest("Invalid request body", "Expected JSON body");
  }

  if (!payload.tenantId || !payload.s3Key) {
    return ApiErrors.badRequest(
      "Missing tenantId or s3Key",
      "Both tenantId and s3Key are required"
    );
  }

  const parsed = parseS3DropKey(payload.s3Key);
  if (parsed && parsed.tenantId !== payload.tenantId) {
    return ApiErrors.badRequest(
      "Tenant mismatch",
      `s3Key belongs to tenant ${parsed.tenantId}, but payload requested ${payload.tenantId}`
    );
  }

  const fileName = parsed?.fileName ?? path.basename(payload.s3Key);
  if (!isSupportedDropFile(fileName)) {
    return ApiErrors.badRequest(
      "Unsupported file extension",
      "Only .csv, .tsv, and .txt files can be ingested from S3 drop zone"
    );
  }

  let objectSize = Number(payload.objectSize ?? NaN);
  if (!Number.isFinite(objectSize)) {
    const objectInfo = await headS3Object(payload.s3Key);
    if (!objectInfo.exists) {
      return ApiErrors.notFound("S3 object", `Object not found for key ${payload.s3Key}`);
    }
    objectSize = objectInfo.size;
  }
  if (objectSize <= 0) {
    return ApiErrors.badRequest("Invalid file", "S3 object is empty (0 bytes)");
  }

  const buffer = await downloadFromS3(payload.s3Key);
  const result = await runIngestPipeline({
    tenantId: payload.tenantId,
    fileName,
    buffer,
    kind: payload.kind ?? "gl_balance",
    source: "s3-drop",
  });

  return NextResponse.json({
    ok: true,
    jobId: payload.jobId ?? null,
    s3Key: payload.s3Key,
    ingest: result,
  });
});
