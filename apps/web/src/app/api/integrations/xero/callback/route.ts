import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { upsertIntegrationConnection } from "@/lib/db/client";
import { resolveOrganizationScope } from "@/lib/integrations/organization-scope";
import { getIntegrationProvider } from "@/lib/integrations/provider-registry";
import {
  upsertDevXeroConnection,
} from "@/lib/xero-dev-store";
import { consumeXeroOAuthState } from "@/lib/xero-oauth-state-store";

export const runtime = "nodejs";

const XERO_STATE_COOKIE = "xero_oauth_state";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";
const XERO_ORG_SCOPE_COOKIE = "xero_org_scope";
const NON_ROUTABLE_DEV_HOSTS = new Set(["0.0.0.0", "::", "[::]"]);
const provider = getIntegrationProvider("xero");

function getSafeRequestUrl(request: NextRequest): URL {
  const url = new URL(request.url);
  if (
    process.env.NODE_ENV !== "production" &&
    NON_ROUTABLE_DEV_HOSTS.has(url.hostname)
  ) {
    url.hostname = "localhost";
  }
  return url;
}

function redirectToXeroPage(request: NextRequest, status: string, detail?: string) {
  const requestUrl = getSafeRequestUrl(request);
  const url = new URL("/integrations/xero", requestUrl.origin);
  url.searchParams.set("xero", status);
  if (detail) {
    url.searchParams.set("detail", detail.slice(0, 160));
  }
  return url;
}

export async function GET(request: NextRequest) {
  const devNoDbMode = provider.isDevNoDbModeEnabled();
  const responseState = request.nextUrl.searchParams.get("state") ?? "";
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const oauthError = request.nextUrl.searchParams.get("error");
  const oauthErrorDesc = request.nextUrl.searchParams.get("error_description");
  const cookieState = request.cookies.get(XERO_STATE_COOKIE)?.value ?? "";

  if (oauthError) {
    return NextResponse.redirect(
      redirectToXeroPage(request, "error", oauthErrorDesc || oauthError)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      redirectToXeroPage(request, "error", "Missing authorization code")
    );
  }

  const cookieStateMatches =
    Boolean(cookieState) && Boolean(responseState) && cookieState === responseState;
  const devFallbackStateMatches =
    process.env.NODE_ENV !== "production" && Boolean(responseState)
      ? consumeXeroOAuthState(responseState)
      : false;
  if (!cookieStateMatches && !devFallbackStateMatches) {
    return NextResponse.redirect(
      redirectToXeroPage(request, "error", "Invalid OAuth state")
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
      redirectToXeroPage(request, "error", "Sign in required before connecting Xero")
    );
  }

  const scopedOrgFromCookie =
    request.cookies.get(XERO_ORG_SCOPE_COOKIE)?.value?.trim() ?? "";
  const scope = await resolveOrganizationScope({
    request,
    userId: session?.user?.id ?? null,
    allowAnonymous: devNoDbMode,
    requestedOrganizationId: scopedOrgFromCookie || undefined,
  });
  const organizationId = scope.organizationId;

  const config = provider.getConfig();
  if (!config.isConfigured) {
    return NextResponse.redirect(
      redirectToXeroPage(
        request,
        "error",
        "Xero env vars are missing. Set XERO_CLIENT_ID and XERO_CLIENT_SECRET."
      )
    );
  }

  try {
    const token = await provider.oauth.exchangeAuthCode(code);
    const connections = await provider.oauth.getConnections(token.access_token);
    const primary = connections[0];
    if (!primary) {
      throw new Error("No Xero tenant available for this user");
    }

    const expiresAt = new Date(Date.now() + Math.max(token.expires_in - 60, 60) * 1000);

    let devSessionId: string | null = null;
    if (!devNoDbMode && session?.user) {
      await upsertIntegrationConnection(session.user.id, organizationId, "xero", {
        externalTenantId: primary.tenantId,
        externalTenantName: primary.tenantName,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt,
        scope: token.scope ?? null,
        tokenType: token.token_type ?? null,
      });
    } else {
      devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value || randomUUID();
      upsertDevXeroConnection(devSessionId, organizationId, {
        tenantId: primary.tenantId,
        tenantName: primary.tenantName,
        accessToken: token.access_token,
        refreshToken: token.refresh_token,
        expiresAt,
        scope: token.scope ?? null,
        tokenType: token.token_type ?? null,
      });
    }

    const success = NextResponse.redirect(redirectToXeroPage(request, "connected"));
    success.cookies.set(XERO_STATE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    success.cookies.set(XERO_ORG_SCOPE_COOKIE, "", {
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
      redirectToXeroPage(
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
    failed.cookies.set(XERO_ORG_SCOPE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return failed;
  }
}
