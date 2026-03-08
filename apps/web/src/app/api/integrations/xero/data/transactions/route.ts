import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import {
  markIntegrationConnectionSynced,
} from "@/lib/db/client";
import { resolveOrganizationScope } from "@/lib/integrations/organization-scope";
import { getIntegrationProvider } from "@/lib/integrations/provider-registry";
import { getXeroJournalsPagesFetched } from "@/lib/xero-journals";
import { getValidDbXeroAccessToken } from "@/lib/xero-session";
import {
  getDevXeroConnection,
  getMostRecentDevXeroConnection,
  markDevXeroConnectionSynced,
  upsertDevXeroConnection,
} from "@/lib/xero-dev-store";

export const runtime = "nodejs";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";
const provider = getIntegrationProvider("xero");

function resolveRequestedMode(rawMode: string | null): "oauth" | "mcp" {
  return rawMode?.toLowerCase() === "mcp" ? "mcp" : "oauth";
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function firstDayOfCurrentMonth(): string {
  const now = new Date();
  return toIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
}

function todayIso(): string {
  const now = new Date();
  return toIsoDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
}

function parseMaxPages(raw: string | null): number {
  if (!raw) return 50;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 200) {
    throw new Error("Invalid maxPages. Use an integer between 1 and 200.");
  }
  return parsed;
}

function daysBetween(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00.000Z`);
  const to = Date.parse(`${toDate}T00:00:00.000Z`);
  return Math.floor((to - from) / 86_400_000);
}

function resolveDateWindow(params: URLSearchParams): {
  fromDate: string;
  toDate: string;
  maxPages: number;
} {
  const fromDate = params.get("fromDate") ?? firstDayOfCurrentMonth();
  const toDate = params.get("toDate") ?? todayIso();
  const maxPages = parseMaxPages(params.get("maxPages"));

  if (!isIsoDate(fromDate) || !isIsoDate(toDate)) {
    throw new Error("Invalid fromDate/toDate. Use YYYY-MM-DD.");
  }
  if (fromDate > toDate) {
    throw new Error("fromDate must be less than or equal to toDate.");
  }
  if (daysBetween(fromDate, toDate) > 366) {
    throw new Error("Date range cannot exceed 366 days.");
  }

  return { fromDate, toDate, maxPages };
}

function getValidAccessTokenFromDevStore(
  organizationId: string,
  devSessionId?: string
) {
  const existing = devSessionId
    ? getDevXeroConnection(devSessionId, organizationId)
    : getMostRecentDevXeroConnection(organizationId);
  if (!existing) {
    throw new Error("Xero is not connected for this browser session.");
  }
  return existing;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const devNoDbMode = provider.isDevNoDbModeEnabled();
  const requestedMode = resolveRequestedMode(request.nextUrl.searchParams.get("mode"));
  const useMcpMode = requestedMode === "mcp";

  if (useMcpMode) {
    return NextResponse.json(
      { error: "Transactions are not available in MCP mode. Use mode=oauth." },
      { status: 400 }
    );
  }

  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    console.warn("Auth session lookup failed:", error);
  }
  if (!session?.user && !devNoDbMode) {
    return ApiErrors.unauthorized();
  }

  const scope = await resolveOrganizationScope({
    request,
    userId: session?.user?.id ?? null,
    allowAnonymous: devNoDbMode,
  });
  const organizationId = scope.organizationId;

  const config = provider.getConfig();
  if (!config.isConfigured) {
    return ApiErrors.badRequest(
      "Xero integration is not configured",
      "Set XERO_CLIENT_ID and XERO_CLIENT_SECRET in the environment."
    );
  }

  let dateWindow: { fromDate: string; toDate: string; maxPages: number };
  try {
    dateWindow = resolveDateWindow(request.nextUrl.searchParams);
  } catch (error) {
    return ApiErrors.badRequest(
      "Invalid date query parameters",
      error instanceof Error ? error.message : "Use valid fromDate/toDate/maxPages values."
    );
  }

  let connection:
    | Awaited<ReturnType<typeof getValidDbXeroAccessToken>>
    | ReturnType<typeof getValidAccessTokenFromDevStore>;
  let source: "db" | "dev" = "db";
  let resolvedDevSessionId = "";

  if (devNoDbMode) {
    source = "dev";
    const devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value ?? "";
    const devConn = getValidAccessTokenFromDevStore(
      organizationId,
      devSessionId || undefined
    );
    resolvedDevSessionId = devConn.sessionId;
    const expiresAtMs = new Date(devConn.expiresAt).getTime();
    const stillValid = Number.isFinite(expiresAtMs) && expiresAtMs > Date.now() + 60_000;
    if (stillValid) {
      connection = devConn;
    } else {
      const refreshed = await provider.oauth.refreshToken(devConn.refreshToken);
      connection = upsertDevXeroConnection(devConn.sessionId, organizationId, {
        tenantId: devConn.tenantId,
        tenantName: devConn.tenantName,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        expiresAt: new Date(Date.now() + Math.max(refreshed.expires_in - 60, 60) * 1000),
        scope: refreshed.scope ?? devConn.scope,
        tokenType: refreshed.token_type ?? devConn.tokenType,
      });
    }
  } else if (session?.user) {
    connection = await getValidDbXeroAccessToken({
      userId: session.user.id,
      organizationId,
      provider,
    });
  } else {
    return ApiErrors.unauthorized();
  }

  const tenantId =
    source === "db"
      ? (connection as Awaited<ReturnType<typeof getValidDbXeroAccessToken>>)
          .externalTenantId
      : (connection as ReturnType<typeof getValidAccessTokenFromDevStore>).tenantId;
  const tenantName =
    source === "db"
      ? (connection as Awaited<ReturnType<typeof getValidDbXeroAccessToken>>)
          .externalTenantName
      : (connection as ReturnType<typeof getValidAccessTokenFromDevStore>).tenantName;

  const journals = await provider.transactions.fetch(connection.accessToken, tenantId, {
    fromDate: dateWindow.fromDate,
    toDate: dateWindow.toDate,
    maxPages: dateWindow.maxPages,
  });
  const transactions = provider.transactions.normalize(journals);
  const pagesFetched = getXeroJournalsPagesFetched(journals);

  if (source === "db" && session?.user) {
    await markIntegrationConnectionSynced(session.user.id, organizationId, "xero");
  } else if (source === "dev" && resolvedDevSessionId) {
    markDevXeroConnectionSynced(resolvedDevSessionId, organizationId);
  }

  const response = NextResponse.json({
    connected: true,
    mode: "oauth",
    tenant: {
      id: tenantId,
      name: tenantName,
    },
    organizationId,
    fromDate: dateWindow.fromDate,
    toDate: dateWindow.toDate,
    transactions,
    count: transactions.length,
    pagesFetched,
  });

  response.headers.set("X-Pages-Fetched", String(pagesFetched));
  if (source === "dev" && resolvedDevSessionId) {
    response.cookies.set(XERO_DEV_SESSION_COOKIE, resolvedDevSessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }

  return response;
});
