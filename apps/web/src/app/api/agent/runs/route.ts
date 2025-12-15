import { NextResponse } from "next/server";

const DEFAULT_ORCHESTRATOR_URL = "http://127.0.0.1:4100";
const orchestratorUrl =
  process.env.ORCHESTRATOR_URL?.trim() || DEFAULT_ORCHESTRATOR_URL;

type OrchestratorErrorPayload = {
  message: string;
  detail?: string;
  help?: string[];
  technical?: string;
};

function buildUnreachableError(error: unknown): OrchestratorErrorPayload {
  const technical =
    error instanceof Error ? error.message : error ? String(error) : undefined;

  return {
    message: "Can’t reach the agent service",
    detail:
      "The agent service (orchestrator) isn’t running or can’t be reached from the web app.",
    help: [
      "If you’re running locally, start the orchestrator in another terminal: `cd services/orchestrator` then `npm run dev`.",
      "If you changed ports/hosts, set `ORCHESTRATOR_URL` in `apps/web/.env.local` (example: `ORCHESTRATOR_URL=http://127.0.0.1:4100`).",
      "If this keeps happening, check firewall/VPN settings and try again.",
    ],
    technical,
  };
}

async function forwardToOrchestrator(payload: unknown) {
  const attempt = async (baseUrl: string) => {
    const response = await fetch(`${baseUrl}/agent/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response;
  };

  try {
    return await attempt(orchestratorUrl);
  } catch (error) {
    const parsed = safeParseUrl(orchestratorUrl);
    if (parsed?.hostname === "localhost") {
      const ipv4Url = `${parsed.protocol}//127.0.0.1${parsed.port ? `:${parsed.port}` : ""}`;
      return await attempt(ipv4Url);
    }
    throw error;
  }
}

function safeParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const response = await forwardToOrchestrator(payload);
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    return NextResponse.json(data);
  } catch (error) {
    const unreachable = buildUnreachableError(error);
    return NextResponse.json(
      unreachable,
      { status: 503 },
    );
  }
}
