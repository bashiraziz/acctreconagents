import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { promises as fs } from "node:fs";
import path from "node:path";
import { withErrorHandler, ApiErrors } from "@/lib/api-error";

const storageDir = path.join(process.cwd(), ".uploads");

// File upload constraints
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/csv',
  'application/octet-stream', // Some browsers send this for CSV files
  '', // Empty MIME type (some browsers don't set it)
];

// Check if Vercel Blob is configured
const isBlobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

export const POST = withErrorHandler(async (request: Request) => {
  const data = await request.formData();
  const file = data.get("file");
  const kind = String(data.get("kind") ?? "supporting");

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

  // Validate file extension (primary check)
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!['csv', 'txt'].includes(fileExtension || '')) {
    return ApiErrors.badRequest(
      "Invalid file extension",
      "Only .csv and .txt files are allowed",
      ["Rename your file to have a .csv or .txt extension"]
    );
  }

  // Validate MIME type (only if set by browser)
  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return ApiErrors.badRequest(
      "Invalid file type",
      `Only CSV files are allowed. Received: ${file.type}`,
      ["Upload a CSV or TXT file", "Ensure the file has the correct MIME type"]
    );
  }

  // Sanitize filename and create unique name
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;

  // Use Vercel Blob Storage if configured, otherwise fall back to local file system
  if (isBlobConfigured) {
    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json({
      ok: true,
      fileName,
      kind,
      size: file.size,
      url: blob.url,
      storageType: "blob",
    });
  } else {
    // Fall back to local file system (development)
    await fs.mkdir(storageDir, { recursive: true });

    const filePath = path.join(storageDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({
      ok: true,
      fileName,
      kind,
      size: file.size,
      path: filePath,
      storageType: "local",
    });
  }
});
