import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import { getIntegrationConnection } from "@/lib/db/client";
import { resolveOrganizationScope } from "@/lib/integrations/organization-scope";
import { getIntegrationProvider } from "@/lib/integrations/provider-registry";
import {
  getDevXeroConnection,
  getMostRecentDevXeroConnection,
} from "@/lib/xero-dev-store";

export const runtime = "nodejs";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";
const provider = getIntegrationProvider("xero");

export const GET = withErrorHandler(async (request: NextRequest) => {
  const devNoDbMode = provider.isDevNoDbModeEnabled();
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
  let connection:
    | {
        tenantId: string;
        tenantName: string | null;
        expiresAt: string;
        updatedAt: string;
        lastSyncedAt: string | null;
      }
    | null = null;

  let resolvedDevSessionId: string | null = null;
  if (devNoDbMode) {
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
  } else {
    return ApiErrors.unauthorized();
  }

  const response = NextResponse.json({
    configured: config.isConfigured,
    connected: Boolean(connection),
    devNoDbMode,
    requiresAuth: !devNoDbMode,
    organizationId,
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
