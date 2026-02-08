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
    const REQUIRED_FILES = ["gl_balance.csv", "subledger_balance.csv", "transactions.csv"];
    const modules: {
      scenarioId: string;
      module: string;
      files: { name: string; path: string }[];
    }[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      if (!SCENARIO_NAMES[entry.name]) continue;

      const dirPath = path.join(SCENARIOS_ROOT, entry.name);
      const files = (await fs.readdir(dirPath)).filter(
        (file) => file.endsWith(".csv") && !file.startsWith("."),
      );

      const hasAllFiles = REQUIRED_FILES.every((required) => files.includes(required));
      if (!hasAllFiles) continue;

      modules.push({
        scenarioId: entry.name,
        module: SCENARIO_NAMES[entry.name],
        files: files.map((file) => ({
          name: file,
          path: `${entry.name}/${file}`,
        })),
      });
    }

    modules.sort((a, b) => a.scenarioId.localeCompare(b.scenarioId));

    return NextResponse.json({
      modules: modules.map(({ module, files }) => ({ module, files })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Sample data directory not found", details: (error as Error).message },
      { status: 500 },
    );
  }
}
