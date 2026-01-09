import { NextResponse } from "next/server";
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
];

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

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return ApiErrors.badRequest(
      "Invalid file type",
      `Only CSV files are allowed. Received: ${file.type}`,
      ["Upload a CSV or TXT file", "Ensure the file has the correct MIME type"]
    );
  }

  // Validate file extension
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!['csv', 'txt'].includes(fileExtension || '')) {
    return ApiErrors.badRequest(
      "Invalid file extension",
      "Only .csv and .txt files are allowed",
      ["Rename your file to have a .csv or .txt extension"]
    );
  }

  // Create storage directory
  await fs.mkdir(storageDir, { recursive: true });

  // Sanitize filename and create unique name
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;
  const filePath = path.join(storageDir, fileName);

  // Read file into buffer
  const buffer = Buffer.from(await file.arrayBuffer());

  // Write file to disk
  await fs.writeFile(filePath, buffer);

  // TODO: Implement file cleanup mechanism for old files
  // TODO: Consider moving to Vercel Blob Storage for production

  return NextResponse.json({
    ok: true,
    fileName,
    kind,
    size: file.size,
    path: filePath,
  });
});
