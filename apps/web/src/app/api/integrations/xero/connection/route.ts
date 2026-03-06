import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiErrors, withErrorHandler } from "@/lib/api-error";
import {
  deleteIntegrationConnection,
  getIntegrationConnection,
} from "@/lib/db/client";
import { resolveOrganizationScope } from "@/lib/integrations/organization-scope";
import { getIntegrationProvider } from "@/lib/integrations/provider-registry";
import {
  deleteDevXeroConnection,
  getDevXeroConnection,
  getMostRecentDevXeroConnection,
} from "@/lib/xero-dev-store";

export const runtime = "nodejs";
const XERO_DEV_SESSION_COOKIE = "xero_dev_session";
const provider = getIntegrationProvider("xero");

export const DELETE = withErrorHandler(async (request: NextRequest) => {
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

  let refreshToken: string | null = null;
  if (devNoDbMode) {
    const devSessionId = request.cookies.get(XERO_DEV_SESSION_COOKIE)?.value ?? "";
    const existing = devSessionId
      ? getDevXeroConnection(devSessionId, organizationId)
      : getMostRecentDevXeroConnection(organizationId);
    if (!existing) {
      return NextResponse.json({ success: true, disconnected: false });
    }
    refreshToken = existing.refreshToken;
    deleteDevXeroConnection(existing.sessionId, organizationId);
  } else if (session?.user) {
    const existing = await getIntegrationConnection(
      session.user.id,
      organizationId,
      "xero"
    );
    if (!existing) {
      return NextResponse.json({ success: true, disconnected: false });
    }
    refreshToken = existing.refreshToken;
    await deleteIntegrationConnection(session.user.id, organizationId, "xero");
  } else {
    return ApiErrors.unauthorized();
  }

  if (refreshToken) {
    try {
      await provider.oauth.revokeRefreshToken(refreshToken);
    } catch (error) {
      console.warn("Xero token revoke failed during disconnect:", error);
    }
  }

  return NextResponse.json({ success: true, disconnected: true });
});
