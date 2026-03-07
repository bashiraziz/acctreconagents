/**
 * File Storage Abstraction
 * Handles both Vercel Blob Storage and local file system
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type StorageType = "blob" | "local";

export interface StoredFile {
  fileName: string;
  size: number;
  kind: string;
  storageType: StorageType;
  url?: string; // For blob storage
  path?: string; // For local storage
}

type DropZoneConfig = {
  bucket: string;
  region: string;
};

let dropZoneClient: S3Client | null = null;

function getDropZoneConfig(): DropZoneConfig {
  const bucket = process.env.AWS_DROP_ZONE_BUCKET?.trim();
  const region = process.env.AWS_DROP_ZONE_REGION?.trim() || "us-east-1";

  if (!bucket) {
    throw new Error("AWS_DROP_ZONE_BUCKET is not configured");
  }

  return { bucket, region };
}

function getDropZoneClient(): S3Client {
  if (!dropZoneClient) {
    const { region } = getDropZoneConfig();
    dropZoneClient = new S3Client({ region });
  }
  return dropZoneClient;
}

function copySource(bucket: string, key: string): string {
  // CopySource must be URL-encoded (except path separators).
  return `${bucket}/${encodeURIComponent(key).replace(/%2F/g, "/")}`;
}

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const maybe = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return maybe.name === "NoSuchKey" || maybe.$metadata?.httpStatusCode === 404;
}

/**
 * Check if Vercel Blob is configured
 */
export function isBlobStorageAvailable(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/**
 * Get storage type based on environment
 */
export function getStorageType(): StorageType {
  return isBlobStorageAvailable() ? "blob" : "local";
}

/**
 * Read file contents from storage
 * Works with both Blob and local file system
 */
export async function readFileFromStorage(
  storedFile: StoredFile
): Promise<Buffer> {
  if (storedFile.storageType === "blob") {
    if (!storedFile.url) {
      throw new Error("Blob URL is required for blob storage");
    }

    // Fetch from Vercel Blob
    const response = await fetch(storedFile.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } else {
    // Read from local file system
    if (!storedFile.path) {
      throw new Error("File path is required for local storage");
    }

    return await fs.readFile(storedFile.path);
  }
}

/**
 * Delete file from storage
 * Works with both Blob and local file system
 */
export async function deleteFileFromStorage(
  storedFile: StoredFile
): Promise<void> {
  if (storedFile.storageType === "blob") {
    if (!storedFile.url) {
      throw new Error("Blob URL is required for blob storage");
    }

    // Delete from Vercel Blob
    const { del } = await import("@vercel/blob");
    await del(storedFile.url);
  } else {
    // Delete from local file system
    if (!storedFile.path) {
      throw new Error("File path is required for local storage");
    }

    await fs.unlink(storedFile.path);
  }
}

/**
 * Get file URL for download
 * Returns URL for blob storage, constructs URL for local storage
 */
export function getFileUrl(storedFile: StoredFile, baseUrl?: string): string {
  if (storedFile.storageType === "blob") {
    if (!storedFile.url) {
      throw new Error("Blob URL is required for blob storage");
    }
    return storedFile.url;
  } else {
    // For local storage, construct a download URL
    const base = baseUrl || process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
    return `${base}/api/uploads/${storedFile.fileName}`;
  }
}

/**
 * Get local storage directory path
 */
export function getLocalStorageDir(): string {
  return path.join(process.cwd(), ".uploads");
}

export async function headS3Object(key: string): Promise<{ exists: boolean; size: number }> {
  const { bucket } = getDropZoneConfig();
  const client = getDropZoneClient();

  try {
    const head = await client.send(
      new HeadObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    return {
      exists: true,
      size: Number(head.ContentLength ?? 0),
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return { exists: false, size: 0 };
    }
    throw error;
  }
}

export async function downloadFromS3(key: string): Promise<Buffer> {
  const { bucket } = getDropZoneConfig();
  const client = getDropZoneClient();

  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  if (!response.Body) {
    throw new Error(`S3 object has no body: ${key}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}

export async function moveS3Object(
  fromKey: string,
  toKey: string
): Promise<{ finalKey: string; backupKey?: string }> {
  const { bucket } = getDropZoneConfig();
  const client = getDropZoneClient();

  let backupKey: string | undefined;
  const destinationHead = await headS3Object(toKey);
  if (destinationHead.exists) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupKey = `${toKey}.${timestamp}.bak`;
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        Key: backupKey,
        CopySource: copySource(bucket, toKey),
      })
    );
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: toKey,
      })
    );
  }

  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: toKey,
      CopySource: copySource(bucket, fromKey),
    })
  );

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: fromKey,
    })
  );

  return { finalKey: toKey, backupKey };
}
