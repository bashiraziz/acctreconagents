import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import {
  getXeroConnection,
  markXeroConnectionSynced,
  upsertXeroConnection,
} from "@/lib/db/client";
import {
  fetchXeroTrialBalance,
  getXeroConfig,
  normalizeXeroTrialBalance,
  refreshXeroToken,
} from "@/lib/xero";
import {
  getDevXeroConnection,
  isXeroDevNoDbModeEnabled,
  markDevXeroConnectionSynced,
  upsertDevXeroConnection,
} from "@/lib/xero-dev-store";

export const runtime = "nodejs";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";

function resolveRequestDate(value: string | null): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Invalid date. Use YYYY-MM-DD.");
  }
  return value;
}

async function getValidAccessToken(userId: string) {
  const existing = await getXeroConnection(userId);
  if (!existing) {
    throw new Error("Xero is not connected for this user.");
  }

  const expiresAtMs = new Date(existing.expiresAt).getTime();
  const now = Date.now();
  const stillValid = Number.isFinite(expiresAtMs) && expiresAtMs > now + 60_000;
  if (stillValid) {
    return existing;
  }

  const refreshed = await refreshXeroToken(existing.refreshToken);
  const nextExpiresAt = new Date(
    Date.now() + Math.max(refreshed.expires_in - 60, 60) * 1000
  );

  return upsertXeroConnection(userId, {
    tenantId: existing.tenantId,
    tenantName: existing.tenantName,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresAt: nextExpiresAt,
    scope: refreshed.scope ?? existing.scope,
    tokenType: refreshed.token_type ?? existing.tokenType,
  });
}

function getValidAccessTokenFromDevStore(devSessionId: string) {
  const existing = getDevXeroConnection(devSessionId);
  if (!existing) {
    throw new Error("Xero is not connected for this browser session.");
  }
  return existing;
}

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
  const period = requestedDate.slice(0, 7);

  let connection:
    | Awaited<ReturnType<typeof getValidAccessToken>>
    | ReturnType<typeof getValidAccessTokenFromDevStore>;
  let source: "db" | "dev" = "db";
  let devSessionId = "";

  if (session?.user) {
    connection = await getValidAccessToken(session.user.id);
  } else if (devNoDbMode) {
    source = "dev";
    devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value ?? "";
    if (!devSessionId) {
      return ApiErrors.badRequest(
        "No Xero dev session found",
        "Connect Xero first in dev mode to initialize browser session."
      );
    }
    const devConn = getValidAccessTokenFromDevStore(devSessionId);
    const expiresAtMs = new Date(devConn.expiresAt).getTime();
    const stillValid = Number.isFinite(expiresAtMs) && expiresAtMs > Date.now() + 60_000;
    if (stillValid) {
      connection = devConn;
    } else {
      const refreshed = await refreshXeroToken(devConn.refreshToken);
      connection = upsertDevXeroConnection(devSessionId, {
        tenantId: devConn.tenantId,
        tenantName: devConn.tenantName,
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
        expiresAt: new Date(Date.now() + Math.max(refreshed.expires_in - 60, 60) * 1000),
        scope: refreshed.scope ?? devConn.scope,
        tokenType: refreshed.token_type ?? devConn.tokenType,
      });
    }
  } else {
    return ApiErrors.unauthorized();
  }

  const rawReport = await fetchXeroTrialBalance(
    connection.accessToken,
    connection.tenantId,
    requestedDate
  );
  const glBalances = normalizeXeroTrialBalance(rawReport, period);
  if (source === "db" && session?.user) {
    await markXeroConnectionSynced(session.user.id);
  } else if (source === "dev" && devSessionId) {
    markDevXeroConnectionSynced(devSessionId);
  }

  return NextResponse.json({
    connected: true,
    devNoDbMode: source === "dev",
    tenant: {
      id: connection.tenantId,
      name: connection.tenantName,
    },
    period,
    asOfDate: requestedDate,
    glBalances,
    count: glBalances.length,
  });
});
