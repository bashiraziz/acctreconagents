/**
 * File Storage Abstraction
 * Handles both Vercel Blob Storage and local file system
 */

import { promises as fs } from "node:fs";
import path from "node:path";

export type StorageType = "blob" | "local";

export interface StoredFile {
  fileName: string;
  size: number;
  kind: string;
  storageType: StorageType;
  url?: string; // For blob storage
  path?: string; // For local storage
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
