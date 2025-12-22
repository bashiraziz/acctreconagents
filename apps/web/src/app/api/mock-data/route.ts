import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

const SCENARIOS_ROOT = path.join(process.cwd(), "../../data/scenarios");

// Mapping scenario IDs to user-friendly names
const SCENARIO_NAMES: Record<string, string> = {
  "01-simple-balanced": "Simple Balanced (Perfect Reconciliation)",
  "02-material-variance": "Material Variance (Duplicate Invoice)",
  "03-timing-differences": "Timing Differences (Period Cutoff)",
  "04-roll-forward-multi-period": "Multi-Period Roll-Forward",
  "05-missing-subledger-data": "Missing Subledger Data",
};

export async function GET() {
  try {
    const entries = await fs.readdir(SCENARIOS_ROOT, { withFileTypes: true });
    const modules = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
        .map(async (dir) => {
          const dirPath = path.join(SCENARIOS_ROOT, dir.name);
          const files = (await fs.readdir(dirPath)).filter(
            (file) => file.endsWith(".csv") && !file.startsWith(".")
          );

          return {
            module: SCENARIO_NAMES[dir.name] || dir.name,
            files: files.map((file) => ({
              name: file,
              path: `${dir.name}/${file}`,
            })),
          };
        }),
    );

    // Sort by scenario order (01, 02, 03, etc.)
    modules.sort((a, b) => a.module.localeCompare(b.module));

    return NextResponse.json({ modules });
  } catch (error) {
    return NextResponse.json(
      { error: "Sample data directory not found", details: (error as Error).message },
      { status: 500 },
    );
  }
}
