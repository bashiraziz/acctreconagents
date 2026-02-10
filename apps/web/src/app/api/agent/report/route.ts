import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";
import { auth } from "@/lib/auth";
import { ApiErrors } from "@/lib/api-error";
import { getDefaultUserOrganization } from "@/lib/db/client";

const DEFAULT_ORCHESTRATOR_URL = "http://127.0.0.1:4100";
const orchestratorUrl =
  process.env.ORCHESTRATOR_URL?.trim() || DEFAULT_ORCHESTRATOR_URL;

async function forwardToOrchestrator(payload: unknown) {
  const attempt = async (baseUrl: string) => {
    const response = await fetch(`${baseUrl}/agent/report`, {
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
    let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
    try {
      session = await auth.api.getSession({
        headers: request.headers,
      });
    } catch (error) {
      console.warn("Auth session lookup failed, treating as anonymous:", error);
    }
    const isAuthenticated = Boolean(session?.user);
    const identifier = isAuthenticated
      ? `user:${session!.user.id}`
      : `ip:${getClientIp(request)}`;

    const rateLimit = await checkRateLimit(identifier, isAuthenticated);

    if (!rateLimit.allowed) {
      return ApiErrors.rateLimitExceeded(
        `You've exceeded the limit of ${rateLimit.limit} reconciliations per ${rateLimit.window}. Please try again in ${Math.ceil((rateLimit.retryAfter || 0) / 60)} minutes.`,
        {
          "X-RateLimit-Limit": rateLimit.limit.toString(),
          "X-RateLimit-Remaining": rateLimit.remaining.toString(),
          "X-RateLimit-Reset": rateLimit.reset.toString(),
          "Retry-After": (rateLimit.retryAfter || 0).toString(),
        },
        [
          "Rate limits reset automatically after the time window expires",
          "Wait for the reset time or contact support if you need higher limits",
        ]
      );
    }

    const payload = await request.json();
    let organizationName: string | undefined;
    if (session?.user) {
      try {
        const organization = await getDefaultUserOrganization(session.user.id);
        organizationName = organization?.name ?? undefined;
      } catch (orgError) {
        console.warn("Organization lookup failed, continuing without org name:", orgError);
      }
    }
    const response = await forwardToOrchestrator(
      organizationName ? { ...payload, organizationName } : payload
    );
    const data = await response.json();

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
    return ApiErrors.serviceUnavailable(
      "Agent service",
      error instanceof Error ? error : undefined,
      [
        "If you're running locally, start the orchestrator in another terminal: `cd services/orchestrator` then `npm run dev`.",
        "If you changed ports/hosts, set `ORCHESTRATOR_URL` in `apps/web/.env.local` (example: `ORCHESTRATOR_URL=http://127.0.0.1:4100`).",
        "If this keeps happening, check firewall/VPN settings and try again.",
      ]
    );
  }
}
