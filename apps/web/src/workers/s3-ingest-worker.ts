import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
  type Message,
} from "@aws-sdk/client-sqs";
import {
  createIngestJob,
  updateIngestJobStatus,
  writeIngestError,
} from "@/lib/db/client";
import { headS3Object, moveS3Object } from "@/lib/file-storage";
import {
  deriveIngestKindFromS3Drop,
  isSupportedDropFile,
  parseS3DropKey,
  toFailedKey,
  toProcessedKey,
  type S3DropIngestKind,
  type S3DropObjectRef,
} from "@/lib/s3-drop";

type S3EventRecord = {
  s3?: {
    object?: {
      key?: string;
      size?: number;
    };
  };
};

type IngestRequestPayload = {
  tenantId: string;
  s3Key: string;
  jobId: string;
  kind: S3DropIngestKind;
  objectSize: number;
};

type IngestResponsePayload = {
  ok: boolean;
  ingest?: unknown;
  [key: string]: unknown;
};

function getSqsClient(): SQSClient {
  const region = process.env.AWS_DROP_ZONE_REGION?.trim() || "us-east-1";
  return new SQSClient({ region });
}

function getQueueUrl(): string {
  const queueUrl = process.env.AWS_DROP_ZONE_QUEUE_URL?.trim();
  if (!queueUrl) {
    throw new Error("AWS_DROP_ZONE_QUEUE_URL is not configured");
  }
  return queueUrl;
}

function internalIngestEndpoint(): string {
  return (
    process.env.INGEST_INTERNAL_URL?.trim() ||
    "http://localhost:3100/api/ingest/s3-drop"
  );
}

function ingestInternalSecret(): string {
  const secret = process.env.INGEST_INTERNAL_SECRET?.trim();
  if (!secret) {
    throw new Error("INGEST_INTERNAL_SECRET is not configured");
  }
  return secret;
}

function parseS3EventRecords(rawBody: string): S3EventRecord[] {
  const parsed = JSON.parse(rawBody) as unknown;

  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const direct = parsed as { Records?: S3EventRecord[]; Message?: string };

    if (Array.isArray(direct.Records)) {
      return direct.Records;
    }

    if (typeof direct.Message === "string") {
      return parseS3EventRecords(direct.Message);
    }
  }

  throw new Error("Unable to parse S3 event message body");
}

function conflictMode(): "overwrite" | "append" {
  const mode = process.env.INGEST_CONFLICT_MODE?.trim().toLowerCase();
  if (!mode) return "overwrite";
  if (mode === "overwrite" || mode === "append") return mode;
  return "overwrite";
}

function assertConflictModeSupported(): void {
  if (conflictMode() === "append") {
    throw new Error("INGEST_CONFLICT_MODE=append is not implemented in this scope");
  }
}

async function safeUpdateIngestJob(
  jobId: string | null,
  status: "pending" | "processing" | "done" | "failed",
  result?: unknown
): Promise<void> {
  if (!jobId) return;
  try {
    await updateIngestJobStatus(jobId, status, result);
  } catch (error) {
    console.error("Failed to update ingest job status:", error);
  }
}

async function fireErrorWebhook(payload: {
  tenantId: string;
  fileName: string;
  s3Key: string;
  error: string;
  timestamp: string;
}): Promise<void> {
  const webhookUrl = process.env.INGEST_ERROR_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Failed to send ingest error webhook:", error);
  }
}

async function invokeInternalIngest(
  payload: IngestRequestPayload
): Promise<IngestResponsePayload> {
  const response = await fetch(internalIngestEndpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ingest-internal-secret": ingestInternalSecret(),
    },
    body: JSON.stringify(payload),
  });

  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const detail =
      (typeof json.message === "string" && json.message) ||
      (typeof json.details === "string" && json.details) ||
      `Internal ingest endpoint returned ${response.status}`;
    throw new Error(detail);
  }

  return json as IngestResponsePayload;
}

async function handleDropRef(ref: S3DropObjectRef): Promise<void> {
  assertConflictModeSupported();

  const job = await createIngestJob(ref.tenantId, ref.key, "pending");
  const jobId = job.id;
  await safeUpdateIngestJob(jobId, "processing");

  const failurePayloadBase = {
    tenantId: ref.tenantId,
    fileName: ref.fileName,
    s3Key: ref.key,
  };

  try {
    if (!isSupportedDropFile(ref.fileName)) {
      throw new Error("Unsupported file extension. Only csv/tsv/txt are supported.");
    }

    const objectInfo = await headS3Object(ref.key);
    if (!objectInfo.exists) {
      throw new Error(`S3 object not found: ${ref.key}`);
    }
    if (objectInfo.size <= 0) {
      throw new Error("S3 object is empty (0 bytes)");
    }
    const kind = deriveIngestKindFromS3Drop(ref);

    const ingestResponse = await invokeInternalIngest({
      tenantId: ref.tenantId,
      s3Key: ref.key,
      jobId,
      kind,
      objectSize: objectInfo.size,
    });

    const processedKey = toProcessedKey(ref);
    await moveS3Object(ref.key, processedKey);

    await safeUpdateIngestJob(jobId, "done", {
      s3Key: ref.key,
      processedKey,
      kind,
      ingest: ingestResponse.ingest ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingest failure";
    const timestamp = new Date().toISOString();

    try {
      const failedKey = toFailedKey(ref);
      await moveS3Object(ref.key, failedKey);
    } catch (moveError) {
      console.error("Failed to move object to failed path:", moveError);
    }

    await safeUpdateIngestJob(jobId, "failed", { error: message });

    try {
      await writeIngestError({
        tenantId: failurePayloadBase.tenantId,
        fileName: failurePayloadBase.fileName,
        s3Key: failurePayloadBase.s3Key,
        error: message,
      });
    } catch (dbError) {
      console.error("Failed to write ingest error:", dbError);
    }

    await fireErrorWebhook({
      ...failurePayloadBase,
      error: message,
      timestamp,
    });

    throw error;
  }
}

export async function processSqsMessage(message: Message): Promise<void> {
  if (!message.Body) {
    throw new Error("SQS message body is empty");
  }

  const records = parseS3EventRecords(message.Body);
  for (const record of records) {
    const rawKey = record.s3?.object?.key;
    if (!rawKey) {
      continue;
    }
    const decodedKey = decodeURIComponent(rawKey.replace(/\+/g, " "));
    const ref = parseS3DropKey(decodedKey);
    if (!ref) {
      console.warn(`Skipping non drop-zone key: ${decodedKey}`);
      continue;
    }
    await handleDropRef(ref);
  }
}

export async function pollS3DropQueueOnce(): Promise<number> {
  const queueUrl = getQueueUrl();
  const client = getSqsClient();

  const received = await client.send(
    new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20,
      VisibilityTimeout: 120,
    })
  );

  const messages = received.Messages ?? [];
  for (const message of messages) {
    await processSqsMessage(message);
    if (message.ReceiptHandle) {
      await client.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: message.ReceiptHandle,
        })
      );
    }
  }

  return messages.length;
}

export async function runS3IngestWorker(): Promise<void> {
  // Long poll loop for containerized worker mode.
  while (true) {
    try {
      await pollS3DropQueueOnce();
    } catch (error) {
      console.error("S3 ingest worker iteration failed:", error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
