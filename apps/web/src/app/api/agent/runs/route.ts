import { NextResponse } from "next/server";

const orchestratorUrl =
  process.env.ORCHESTRATOR_URL ?? "http://localhost:4100";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const response = await fetch(`${orchestratorUrl}/agent/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to reach orchestrator",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 },
    );
  }
}
