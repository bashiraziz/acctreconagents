import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import { buildXeroAuthorizeUrl, getXeroConfig } from "@/lib/xero";
import { isXeroDevNoDbModeEnabled } from "@/lib/xero-dev-store";

export const runtime = "nodejs";

const XERO_STATE_COOKIE = "xero_oauth_state";
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
  if (!session?.user && !devNoDbMode) {
    return ApiErrors.unauthorized();
  }

  const config = getXeroConfig();
  if (!config.isConfigured) {
    return ApiErrors.badRequest(
      "Xero integration is not configured",
      "Set XERO_CLIENT_ID and XERO_CLIENT_SECRET in your environment first."
    );
  }

  const state = randomUUID();
  const authorizeUrl = buildXeroAuthorizeUrl(state);
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(XERO_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  if (!session?.user && devNoDbMode) {
    const devSession = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value || randomUUID();
    response.cookies.set(XERO_DEV_SESSION_COOKIE, devSession, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }

  return response;
});
