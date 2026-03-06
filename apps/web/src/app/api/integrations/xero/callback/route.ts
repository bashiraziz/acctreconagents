import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { upsertXeroConnection } from "@/lib/db/client";
import { exchangeXeroAuthCode, getXeroConnections, getXeroConfig } from "@/lib/xero";
import {
  isXeroDevNoDbModeEnabled,
  upsertDevXeroConnection,
} from "@/lib/xero-dev-store";

export const runtime = "nodejs";

const XERO_STATE_COOKIE = "xero_oauth_state";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";

function redirectToSettings(request: NextRequest, status: string, detail?: string) {
  const url = new URL("/settings", request.url);
  url.searchParams.set("xero", status);
  if (detail) {
    url.searchParams.set("detail", detail.slice(0, 160));
  }
  return url;
}

export async function GET(request: NextRequest) {
  const devNoDbMode = isXeroDevNoDbModeEnabled();
  const responseState = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const oauthError = request.nextUrl.searchParams.get("error");
  const oauthErrorDesc = request.nextUrl.searchParams.get("error_description");
  const cookieState = request.cookies.get(XERO_STATE_COOKIE)?.value ?? "";

  if (oauthError) {
    return NextResponse.redirect(
      redirectToSettings(request, "error", oauthErrorDesc || oauthError)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      redirectToSettings(request, "error", "Missing authorization code")
    );
  }

  if (!cookieState || !responseState || cookieState !== responseState) {
    return NextResponse.redirect(
      redirectToSettings(request, "error", "Invalid OAuth state")
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
    return NextResponse.redirect(
      redirectToSettings(request, "error", "Sign in required before connecting Xero")
    );
  }

  const config = getXeroConfig();
  if (!config.isConfigured) {
    return NextResponse.redirect(
      redirectToSettings(
        request,
        "error",
        "Xero env vars are missing. Set XERO_CLIENT_ID and XERO_CLIENT_SECRET."
      )
    );
  }

  try {
    const token = await exchangeXeroAuthCode(code);
    const connections = await getXeroConnections(token.access_token);
    const primary = connections[0];
    if (!primary) {
      throw new Error("No Xero tenant available for this user");
    }

    const expiresAt = new Date(Date.now() + Math.max(token.expires_in - 60, 60) * 1000);

    let devSessionId: string | null = null;
    if (session?.user) {
      await upsertXeroConnection(session.user.id, {
        tenantId: primary.tenantId,
        tenantName: primary.tenantName,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt,
        scope: token.scope ?? null,
        tokenType: token.token_type ?? null,
      });
    } else {
      devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value || randomUUID();
      upsertDevXeroConnection(devSessionId, {
        tenantId: primary.tenantId,
        tenantName: primary.tenantName,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt,
        scope: token.scope ?? null,
        tokenType: token.token_type ?? null,
      });
    }

    const success = NextResponse.redirect(redirectToSettings(request, "connected"));
    success.cookies.set(XERO_STATE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    if (devSessionId) {
      success.cookies.set(XERO_DEV_SESSION_COOKIE, devSessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 14,
      });
    }
    return success;
  } catch (error) {
    const failed = NextResponse.redirect(
      redirectToSettings(
        request,
        "error",
        error instanceof Error ? error.message : "Unknown Xero callback failure"
      )
    );
    failed.cookies.set(XERO_STATE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return failed;
  }
}
