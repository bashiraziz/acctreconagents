import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

const storageDir = path.join(process.cwd(), ".uploads");

export async function POST(request: Request) {
  const data = await request.formData();
  const file = data.get("file");
  const kind = String(data.get("kind") ?? "supporting");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "file field is required" },
      { status: 400 },
    );
  }

  await fs.mkdir(storageDir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;
  const filePath = path.join(storageDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return NextResponse.json({
    ok: true,
    fileName,
    kind,
    size: file.size,
    path: filePath,
  });
}
