import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import { getXeroConnection } from "@/lib/db/client";
import { getXeroConfig } from "@/lib/xero";
import { getDevXeroConnection, isXeroDevNoDbModeEnabled } from "@/lib/xero-dev-store";

export const runtime = "nodejs";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const devNoDbMode = isXeroDevNoDbModeEnabled();
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    console.warn("Auth session lookup failed:", error);
  }

  const config = getXeroConfig();
  let connection:
    | {
        tenantId: string;
        tenantName: string | null;
        expiresAt: string;
        updatedAt: string;
        lastSyncedAt: string | null;
      }
    | null = null;

  if (session?.user) {
    const dbConnection = await getXeroConnection(session.user.id);
    connection = dbConnection
      ? {
          tenantId: dbConnection.tenantId,
          tenantName: dbConnection.tenantName,
          expiresAt: dbConnection.expiresAt,
          updatedAt: dbConnection.updatedAt,
          lastSyncedAt: dbConnection.lastSyncedAt,
        }
      : null;
  } else if (devNoDbMode) {
    const devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value ?? "";
    const devConnection = devSessionId ? getDevXeroConnection(devSessionId) : null;
    connection = devConnection
      ? {
          tenantId: devConnection.tenantId,
          tenantName: devConnection.tenantName,
          expiresAt: devConnection.expiresAt,
          updatedAt: devConnection.updatedAt,
          lastSyncedAt: devConnection.lastSyncedAt,
        }
      : null;
  } else {
    return ApiErrors.unauthorized();
  }

  return NextResponse.json({
    configured: config.isConfigured,
    connected: Boolean(connection),
    devNoDbMode,
    requiresAuth: !devNoDbMode,
    connection,
  });
});
