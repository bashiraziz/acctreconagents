export type S3DropObjectRef = {
  tenantId: string;
  fileName: string;
  key: string;
};

export type S3DropIngestKind = "gl_balance" | "subledger_balance" | "transactions";

const INBOX_PREFIX_REGEX = /^tenants\/([^/]+)\/inbox\/(.+)$/i;

const SUPPORTED_EXTENSIONS = new Set(["csv", "tsv", "txt"]);

export function parseS3DropKey(key: string): S3DropObjectRef | null {
  const match = key.match(INBOX_PREFIX_REGEX);
  if (!match) {
    return null;
  }
  const [, tenantId, fileName] = match;
  if (!tenantId || !fileName) {
    return null;
  }
  return {
    tenantId,
    fileName,
    key,
  };
}

export function isSupportedDropFile(fileName: string): boolean {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return SUPPORTED_EXTENSIONS.has(extension);
}

export function toProcessedKey(ref: S3DropObjectRef): string {
  return `tenants/${ref.tenantId}/processed/${ref.fileName}`;
}

export function toFailedKey(ref: S3DropObjectRef): string {
  return `tenants/${ref.tenantId}/failed/${ref.fileName}`;
}

export function deriveIngestKindFromS3Drop(
  keyOrRef: string | S3DropObjectRef
): S3DropIngestKind {
  const key = (typeof keyOrRef === "string" ? keyOrRef : keyOrRef.key).toLowerCase();
  const fileName = (typeof keyOrRef === "string"
    ? keyOrRef.split("/").pop() || ""
    : keyOrRef.fileName.split("/").pop() || ""
  ).toLowerCase();

  if (key.includes("/inbox/subledger/")) {
    return "subledger_balance";
  }
  if (key.includes("/inbox/transactions/")) {
    return "transactions";
  }
  if (key.includes("/inbox/gl/")) {
    return "gl_balance";
  }

  if (
    fileName.startsWith("subledger_") ||
    fileName.startsWith("sl_") ||
    fileName.includes("subledger")
  ) {
    return "subledger_balance";
  }
  if (
    fileName.startsWith("transactions_") ||
    fileName.startsWith("txn_") ||
    fileName.includes("transaction")
  ) {
    return "transactions";
  }

  return "gl_balance";
}
