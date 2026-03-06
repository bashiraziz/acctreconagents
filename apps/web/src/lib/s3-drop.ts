export type S3DropObjectRef = {
  tenantId: string;
  fileName: string;
  key: string;
};

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

