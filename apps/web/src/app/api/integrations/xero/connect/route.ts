import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import { resolveOrganizationScope } from "@/lib/integrations/organization-scope";
import { getIntegrationProvider } from "@/lib/integrations/provider-registry";
import { getXeroMcpConfig } from "@/lib/xero-mcp";
import { rememberXeroOAuthState } from "@/lib/xero-oauth-state-store";

export const runtime = "nodejs";

const XERO_STATE_COOKIE = "xero_oauth_state";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";
const XERO_ORG_SCOPE_COOKIE = "xero_org_scope";
const XERO_MODE_COOKIE = "xero_mode";
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
    return ApiErrors.unauthorized();
  }

  const scope = await resolveOrganizationScope({
    request,
    userId: session?.user?.id ?? null,
    allowAnonymous: devNoDbMode,
  });

  if (useMcpMode && mcpConfig.hasDirectCredentials) {
    const redirect = new URL("/integrations/xero", request.nextUrl.origin);
    redirect.searchParams.set("xero", "connected");
    redirect.searchParams.set("mode", "mcp");
    const response = NextResponse.redirect(redirect);
    response.cookies.set(XERO_MODE_COOKIE, requestedMode, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
    return response;
  }

  const config = provider.getConfig();
  if (!config.isConfigured) {
    return ApiErrors.badRequest(
      "Xero integration is not configured",
      useMcpMode
        ? "Set XERO_CLIENT_ID and XERO_CLIENT_SECRET for app OAuth bridge, or set direct MCP credentials (XERO_MCP_CLIENT_BEARER_TOKEN or XERO_MCP_CLIENT_ID/XERO_MCP_CLIENT_SECRET)."
        : "Set XERO_CLIENT_ID and XERO_CLIENT_SECRET in your environment first."
    );
  }

  const state = randomUUID();
  if (process.env.NODE_ENV !== "production") {
    rememberXeroOAuthState(state);
  }
  const authorizeUrl = provider.oauth.buildAuthorizeUrl(state);
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(XERO_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  response.cookies.set(XERO_ORG_SCOPE_COOKIE, scope.organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  response.cookies.set(XERO_MODE_COOKIE, requestedMode, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  if (devNoDbMode) {
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
