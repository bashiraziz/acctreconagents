import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import { markIntegrationConnectionSynced } from "@/lib/db/client";
import { resolveOrganizationScope } from "@/lib/integrations/organization-scope";
import { getIntegrationProvider } from "@/lib/integrations/provider-registry";
import { getValidDbXeroAccessToken } from "@/lib/xero-session";
import {
  getDevXeroConnection,
  getMostRecentDevXeroConnection,
  markDevXeroConnectionSynced,
  upsertDevXeroConnection,
} from "@/lib/xero-dev-store";
import type { XeroAgedReportType } from "@/lib/xero-aged";

export const runtime = "nodejs";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";
const provider = getIntegrationProvider("xero");

function resolveRequestedMode(rawMode: string | null): "oauth" | "mcp" {
  return rawMode?.toLowerCase() === "mcp" ? "mcp" : "oauth";
}

function resolveRequestDate(value: string | null): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid date. Use YYYY-MM-DD.");
  }
  return value;
}

function resolveRequestType(value: string | null): XeroAgedReportType {
  if (!value) {
    throw new Error("Missing required query parameter: type");
  }
  const normalized = value.toLowerCase();
  if (normalized === "ar" || normalized === "ap") {
    return normalized;
  }
  throw new Error('Invalid type. Use "ar" or "ap".');
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
      {
        message: "Subledger reports are not available in MCP mode. Use mode=oauth.",
      },
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

  let requestedDate = "";
  try {
    requestedDate = resolveRequestDate(request.nextUrl.searchParams.get("date"));
  } catch (error) {
    return ApiErrors.badRequest(
      "Invalid date parameter",
      error instanceof Error ? error.message : "Use YYYY-MM-DD format"
    );
  }

  let reportType: XeroAgedReportType;
  try {
    reportType = resolveRequestType(request.nextUrl.searchParams.get("type"));
  } catch (error) {
    return ApiErrors.badRequest(
      "Invalid type parameter",
      error instanceof Error ? error.message : 'Use "ar" or "ap".'
    );
  }
  const period = requestedDate.slice(0, 7);

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

  const payload = await provider.subledger.fetch(
    connection.accessToken,
    tenantId,
    reportType,
    requestedDate
  );
  const rows = provider.subledger.normalize(payload, reportType, requestedDate);
  const totalOutstanding = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);

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
    type: reportType,
    asOfDate: requestedDate,
    period,
    rows,
    count: rows.length,
    totalOutstanding,
  });

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
