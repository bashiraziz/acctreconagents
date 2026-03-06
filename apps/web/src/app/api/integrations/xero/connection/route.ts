import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import { deleteXeroConnection, getXeroConnection } from "@/lib/db/client";
import { revokeXeroRefreshToken } from "@/lib/xero";
import {
  deleteDevXeroConnection,
  getDevXeroConnection,
  isXeroDevNoDbModeEnabled,
} from "@/lib/xero-dev-store";

export const runtime = "nodejs";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";

export const DELETE = withErrorHandler(async (request: NextRequest) => {
  const devNoDbMode = isXeroDevNoDbModeEnabled();
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    console.warn("Auth session lookup failed:", error);
  }
  let refreshToken: string | null = null;
  if (session?.user) {
    const existing = await getXeroConnection(session.user.id);
    if (!existing) {
      return NextResponse.json({ success: true, disconnected: false });
    }
    refreshToken = existing.refreshToken;
    await deleteXeroConnection(session.user.id);
  } else if (devNoDbMode) {
    const devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value ?? "";
    if (!devSessionId) {
      return NextResponse.json({ success: true, disconnected: false });
    }
    const existing = getDevXeroConnection(devSessionId);
    if (!existing) {
      return NextResponse.json({ success: true, disconnected: false });
    }
    refreshToken = existing.refreshToken;
    deleteDevXeroConnection(devSessionId);
  } else {
    return ApiErrors.unauthorized();
  }

  if (refreshToken) {
    try {
      await revokeXeroRefreshToken(refreshToken);
    } catch (error) {
      console.warn("Xero token revoke failed during disconnect:", error);
    }
  }

  return NextResponse.json({ success: true, disconnected: true });
});
