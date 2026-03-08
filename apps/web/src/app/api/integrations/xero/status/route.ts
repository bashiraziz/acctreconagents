import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import { getIntegrationConnection } from "@/lib/db/client";
import { resolveOrganizationScope } from "@/lib/integrations/organization-scope";
import { getIntegrationProvider } from "@/lib/integrations/provider-registry";
import { getXeroMcpConfig } from "@/lib/xero-mcp";
import {
  getDevXeroConnection,
  getMostRecentDevXeroConnection,
} from "@/lib/xero-dev-store";

export const runtime = "nodejs";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";
const provider = getIntegrationProvider("xero");

function resolveRequestedMode(rawMode: string | null): "oauth" | "mcp" {
  return rawMode?.toLowerCase() === "mcp" ? "mcp" : "oauth";
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
    return NextResponse.json(
      {
        configured: false,
        connected: false,
        devNoDbMode: false,
        requiresAuth: true,
        mode: requestedMode,
        mcp: {
          enabled: mcpConfig.enabled,
          viable: mcpConfig.viable,
          configured: mcpConfig.hasDirectCredentials,
          source: mcpConfig.hasDirectCredentials ? "direct" : "app_oauth_bridge",
          reason: mcpConfig.reason ?? null,
        },
        connection: null,
      },
      { status: 401 }
    );
  }

  const oauthConfig = provider.getConfig();
  let organizationId: string;
  try {
    const scope = await resolveOrganizationScope({
      request,
      userId: session?.user?.id ?? null,
      allowAnonymous: devNoDbMode,
    });
    organizationId = scope.organizationId;
  } catch {
    // DB/org resolution failed — return partial response with at least MCP config.
    return NextResponse.json({
      configured: oauthConfig.isConfigured,
      connected: false,
      devNoDbMode,
      requiresAuth: !devNoDbMode,
      mode: requestedMode,
      mcp: {
        enabled: mcpConfig.enabled,
        viable: mcpConfig.viable,
        configured: mcpConfig.hasDirectCredentials,
        source: mcpConfig.hasDirectCredentials ? "direct" : "app_oauth_bridge",
        reason: mcpConfig.reason ?? null,
      },
      connection: null,
    });
  }
  let connection:
    | {
        tenantId: string;
        tenantName: string | null;
        expiresAt: string;
        updatedAt: string;
        lastSyncedAt: string | null;
      }
    | null = null;
  const mode: "oauth" | "mcp" = useMcpMode ? "mcp" : "oauth";

  let resolvedDevSessionId: string | null = null;
  if (useMcpMode) {
    if (mcpConfig.hasDirectCredentials) {
      const now = new Date().toISOString();
      connection = {
        tenantId: "mcp",
        tenantName: "Xero MCP",
        expiresAt: now,
        updatedAt: now,
        lastSyncedAt: null,
      };
    } else if (devNoDbMode) {
      const devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value ?? "";
      const devConnection = devSessionId
        ? getDevXeroConnection(devSessionId, organizationId)
        : getMostRecentDevXeroConnection(organizationId);
      resolvedDevSessionId = devConnection?.sessionId ?? null;
      connection = devConnection
        ? {
            tenantId: devConnection.tenantId,
            tenantName: devConnection.tenantName,
            expiresAt: devConnection.expiresAt,
            updatedAt: devConnection.updatedAt,
            lastSyncedAt: devConnection.lastSyncedAt,
          }
        : null;
    } else if (session?.user) {
      try {
        const dbConnection = await getIntegrationConnection(
          session.user.id,
          organizationId,
          "xero"
        );
        connection = dbConnection
          ? {
              tenantId: dbConnection.externalTenantId,
              tenantName: dbConnection.externalTenantName,
              expiresAt: dbConnection.expiresAt,
              updatedAt: dbConnection.updatedAt,
              lastSyncedAt: dbConnection.lastSyncedAt,
            }
          : null;
      } catch (err) {
        console.warn("Failed to fetch integration connection:", err);
      }
    }
  } else if (devNoDbMode) {
    const devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value ?? "";
    const devConnection = devSessionId
      ? getDevXeroConnection(devSessionId, organizationId)
      : getMostRecentDevXeroConnection(organizationId);
    resolvedDevSessionId = devConnection?.sessionId ?? null;
    connection = devConnection
      ? {
          tenantId: devConnection.tenantId,
          tenantName: devConnection.tenantName,
          expiresAt: devConnection.expiresAt,
          updatedAt: devConnection.updatedAt,
          lastSyncedAt: devConnection.lastSyncedAt,
        }
      : null;
  } else if (session?.user) {
    try {
      const dbConnection = await getIntegrationConnection(
        session.user.id,
        organizationId,
        "xero"
      );
      connection = dbConnection
        ? {
            tenantId: dbConnection.externalTenantId,
            tenantName: dbConnection.externalTenantName,
            expiresAt: dbConnection.expiresAt,
            updatedAt: dbConnection.updatedAt,
            lastSyncedAt: dbConnection.lastSyncedAt,
          }
        : null;
    } catch (err) {
      console.warn("Failed to fetch integration connection:", err);
    }
  } else {
    return ApiErrors.unauthorized();
  }

  const mcpConfiguredFromBridge =
    useMcpMode && !mcpConfig.hasDirectCredentials && Boolean(connection);
  const config = useMcpMode
    ? { isConfigured: mcpConfig.hasDirectCredentials || oauthConfig.isConfigured }
    : oauthConfig;

  const response = NextResponse.json({
    configured: config.isConfigured,
    connected: Boolean(connection),
    devNoDbMode,
    requiresAuth: !devNoDbMode,
    organizationId,
    mode,
    mcp: {
      enabled: mcpConfig.enabled,
      viable: mcpConfig.viable,
      configured: mcpConfig.hasDirectCredentials || mcpConfiguredFromBridge,
      source: mcpConfig.hasDirectCredentials ? "direct" : "app_oauth_bridge",
      reason: mcpConfig.reason ?? null,
    },
    connection,
  });
  if (devNoDbMode && resolvedDevSessionId) {
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
