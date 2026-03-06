import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import {
  getIntegrationConnection,
  markIntegrationConnectionSynced,
  upsertIntegrationConnection,
} from "@/lib/db/client";
import { resolveOrganizationScope } from "@/lib/integrations/organization-scope";
import { getIntegrationProvider } from "@/lib/integrations/provider-registry";
import {
  getDevXeroConnection,
  getMostRecentDevXeroConnection,
  markDevXeroConnectionSynced,
  upsertDevXeroConnection,
} from "@/lib/xero-dev-store";
import { getXeroMcpConfig, pullXeroTrialBalanceViaMcp } from "@/lib/xero-mcp";
import type { XeroTrialBalanceResponse } from "@/lib/xero";

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

async function getValidAccessToken(userId: string, organizationId: string) {
  const existing = await getIntegrationConnection(userId, organizationId, "xero");
  if (!existing) {
    throw new Error("Xero is not connected for this user.");
  }

  const expiresAtMs = new Date(existing.expiresAt).getTime();
  const now = Date.now();
  const stillValid = Number.isFinite(expiresAtMs) && expiresAtMs > now + 60_000;
  if (stillValid) {
    return existing;
  }

  const refreshed = await provider.oauth.refreshToken(existing.refreshToken);
  const nextExpiresAt = new Date(
    Date.now() + Math.max(refreshed.expires_in - 60, 60) * 1000
  );

  return upsertIntegrationConnection(userId, organizationId, "xero", {
    externalTenantId: existing.externalTenantId,
    externalTenantName: existing.externalTenantName,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresAt: nextExpiresAt,
    scope: refreshed.scope ?? existing.scope,
    tokenType: refreshed.token_type ?? existing.tokenType,
  });
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
  const mcpConfig = getXeroMcpConfig();
  const requestedMode = resolveRequestedMode(request.nextUrl.searchParams.get("mode"));
  const useMcpMode = mcpConfig.enabled && requestedMode === "mcp";
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

  const oauthConfig = provider.getConfig();
  const config = useMcpMode
    ? { isConfigured: mcpConfig.hasDirectCredentials || oauthConfig.isConfigured }
    : oauthConfig;
  if (!config.isConfigured) {
    return ApiErrors.badRequest(
      "Xero integration is not configured",
      useMcpMode
        ? mcpConfig.reason || "Xero MCP configuration is missing."
        : "Set XERO_CLIENT_ID and XERO_CLIENT_SECRET in the environment."
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
  const period = requestedDate.slice(0, 7);

  if (useMcpMode) {
    let bearerTokenOverride = process.env.XERO_MCP_CLIENT_BEARER_TOKEN?.trim() || "";
    let tenantForResponse: { id: string; name: string | null } = {
      id: "mcp",
      name: "Xero MCP",
    };
    if (!bearerTokenOverride && !mcpConfig.hasDirectCredentials) {
      if (devNoDbMode) {
        const devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value ?? "";
        const devConn = getValidAccessTokenFromDevStore(
          organizationId,
          devSessionId || undefined
        );
        const expiresAtMs = new Date(devConn.expiresAt).getTime();
        const stillValid = Number.isFinite(expiresAtMs) && expiresAtMs > Date.now() + 60_000;
        if (stillValid) {
          bearerTokenOverride = devConn.accessToken;
          tenantForResponse = {
            id: devConn.tenantId,
            name: devConn.tenantName,
          };
        } else {
          const refreshed = await provider.oauth.refreshToken(devConn.refreshToken);
          const updated = upsertDevXeroConnection(devConn.sessionId, organizationId, {
            tenantId: devConn.tenantId,
            tenantName: devConn.tenantName,
            accessToken: refreshed.access_token,
            refreshToken: refreshed.refresh_token,
            expiresAt: new Date(Date.now() + Math.max(refreshed.expires_in - 60, 60) * 1000),
            scope: refreshed.scope ?? devConn.scope,
            tokenType: refreshed.token_type ?? devConn.tokenType,
          });
          bearerTokenOverride = updated.accessToken;
          tenantForResponse = {
            id: updated.tenantId,
            name: updated.tenantName,
          };
        }
      } else if (session?.user) {
        const dbConn = await getValidAccessToken(session.user.id, organizationId);
        bearerTokenOverride = dbConn.accessToken;
        tenantForResponse = {
          id: dbConn.externalTenantId,
          name: dbConn.externalTenantName,
        };
      } else {
        return ApiErrors.unauthorized();
      }
    }

    let mcpReport: Awaited<ReturnType<typeof pullXeroTrialBalanceViaMcp>>;
    try {
      mcpReport = await pullXeroTrialBalanceViaMcp({
        date: requestedDate,
        paymentsOnly: mcpConfig.paymentsOnly,
        timeoutMs: mcpConfig.timeoutMs,
        bearerTokenOverride: bearerTokenOverride || undefined,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown MCP failure";
      return ApiErrors.badRequest(
        "Xero MCP pull failed",
        `${detail} Check MCP credentials/scopes and retry.`
      );
    }
    const payload: XeroTrialBalanceResponse = {
      Reports: [
        {
          ReportDate: mcpReport.reportDate ?? requestedDate,
          Rows: mcpReport.rows,
        },
      ],
    };
    const glBalances = provider.trialBalance.normalize(payload, period);
    return NextResponse.json({
      connected: true,
      devNoDbMode: false,
      mode: "mcp",
      tenant: tenantForResponse,
      organizationId,
      period,
      asOfDate: requestedDate,
      glBalances,
      count: glBalances.length,
      mcp: {
        reportName: mcpReport.reportName,
      },
    });
  }

  let connection:
    | Awaited<ReturnType<typeof getValidAccessToken>>
    | ReturnType<typeof getValidAccessTokenFromDevStore>;
  let source: "db" | "dev" = "db";
  let devSessionId = "";
  let resolvedDevSessionId = "";

  if (devNoDbMode) {
    source = "dev";
    devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value ?? "";
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
    connection = await getValidAccessToken(session.user.id, organizationId);
  } else {
    return ApiErrors.unauthorized();
  }

  const tenantId =
    source === "db"
      ? (connection as Awaited<ReturnType<typeof getValidAccessToken>>).externalTenantId
      : (connection as ReturnType<typeof getValidAccessTokenFromDevStore>).tenantId;
  const tenantName =
    source === "db"
      ? (connection as Awaited<ReturnType<typeof getValidAccessToken>>)
          .externalTenantName
      : (connection as ReturnType<typeof getValidAccessTokenFromDevStore>).tenantName;

  const rawReport = await provider.trialBalance.fetch(
    connection.accessToken,
    tenantId,
    requestedDate
  );
  const glBalances = provider.trialBalance.normalize(rawReport, period);
  if (source === "db" && session?.user) {
    await markIntegrationConnectionSynced(session.user.id, organizationId, "xero");
  } else if (source === "dev" && resolvedDevSessionId) {
    markDevXeroConnectionSynced(resolvedDevSessionId, organizationId);
  }

  const response = NextResponse.json({
    connected: true,
    devNoDbMode: source === "dev",
    mode: "oauth",
    tenant: {
      id: tenantId,
      name: tenantName,
    },
    organizationId,
    period,
    asOfDate: requestedDate,
    glBalances,
    count: glBalances.length,
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
