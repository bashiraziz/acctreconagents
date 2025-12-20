import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";

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
    // Check authentication status (with error handling for missing DB)
    let isAuthenticated = false;
    let userId: string | undefined;

    try {
      const session = await auth.api.getSession({ headers: request.headers });
      isAuthenticated = !!session?.user;
      userId = session?.user?.id;
    } catch (authError) {
      // If auth fails (e.g., no database), treat as anonymous user
      console.warn("Auth check failed, treating as anonymous:", authError);
      isAuthenticated = false;
    }

    // Get client identifier (IP address for anonymous users, user ID for authenticated)
    const clientIp = getClientIp(request);
    const identifier = isAuthenticated && userId ? `user:${userId}` : `ip:${clientIp}`;

    // Check rate limit
    const rateLimit = checkRateLimit(identifier, isAuthenticated);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `You've exceeded the limit of ${rateLimit.limit} reconciliations per ${rateLimit.window}. Please try again in ${Math.ceil((rateLimit.retryAfter || 0) / 60)} minutes.`,
          details: {
            limit: rateLimit.limit,
            window: rateLimit.window,
            retryAfter: rateLimit.retryAfter,
            reset: new Date(rateLimit.reset).toISOString(),
          },
          help: [
            "Sign in to remove rate limits and save your reconciliation history",
            "Rate limits reset automatically after the time window expires",
          ],
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": rateLimit.remaining.toString(),
            "X-RateLimit-Reset": rateLimit.reset.toString(),
            "Retry-After": (rateLimit.retryAfter || 0).toString(),
          },
        }
      );
    }

    // Process the request
    const payload = await request.json();
    const response = await forwardToOrchestrator(payload);
    const data = await response.json();

    // Add rate limit headers to successful responses
    const headers = {
      "X-RateLimit-Limit": rateLimit.limit.toString(),
      "X-RateLimit-Remaining": rateLimit.remaining.toString(),
      "X-RateLimit-Reset": rateLimit.reset.toString(),
    };

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status, headers });
    }
    return NextResponse.json(data, { headers });
  } catch (error) {
    const unreachable = buildUnreachableError(error);
    return NextResponse.json(
      unreachable,
      { status: 503 },
    );
  }
}
