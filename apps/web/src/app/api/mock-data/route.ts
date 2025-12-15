import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

const MOCK_ROOT = path.join(process.cwd(), "../../data/mock");

export async function GET() {
  try {
    const entries = await fs.readdir(MOCK_ROOT, { withFileTypes: true });
    const modules = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (dir) => {
          const dirPath = path.join(MOCK_ROOT, dir.name);
          const files = (await fs.readdir(dirPath)).filter((file) => !file.startsWith("."));
          return {
            module: dir.name,
            files: files.map((file) => ({
              name: file,
              path: `${dir.name}/${file}`,
            })),
          };
        }),
    );

    return NextResponse.json({ modules });
  } catch (error) {
    return NextResponse.json(
      { error: "Mock data directory not found", details: (error as Error).message },
      { status: 500 },
    );
  }
}
