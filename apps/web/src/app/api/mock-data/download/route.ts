import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

const SCENARIOS_ROOT = path.join(process.cwd(), "../../data/scenarios");

const MIME_MAP: Record<string, string> = {
  ".csv": "text/csv",
  ".md": "text/markdown; charset=utf-8",
};

export async function GET(request: NextRequest) {
  const fileParam = request.nextUrl.searchParams.get("file");
  if (!fileParam) {
    return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
  }

  const sanitized = path.normalize(fileParam).replace(/^\.?(\\|\/)+/, "");
  if (sanitized.includes("..")) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const absolutePath = path.join(SCENARIOS_ROOT, sanitized);
  try {
    const fileBuffer = await fs.readFile(absolutePath);
    const extension = path.extname(absolutePath);
    const contentType = MIME_MAP[extension] ?? "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${path.basename(absolutePath)}"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "File not found", details: (error as Error).message },
      { status: 404 },
    );
  }
}
