import { NextResponse } from "next/server";
import { getRateLimitStatus } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";
import { auth } from "@/lib/auth";
import { withErrorHandler, ApiErrors } from "@/lib/api-error";

/**
 * GET /api/rate-limit
 * Returns current rate limit status for the active user
 */
export const GET = withErrorHandler(async (request: Request) => {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    console.warn("Auth session lookup failed, treating as anonymous:", error);
  }
  const isAuthenticated = Boolean(session?.user);
  const identifier = isAuthenticated
    ? `user:${session!.user.id}`
    : `ip:${getClientIp(request)}`;

  // Get rate limit status
  const status = getRateLimitStatus(identifier, isAuthenticated);

  return NextResponse.json({
    authenticated: isAuthenticated,
    limit: status.limit,
    remaining: status.remaining,
    reset: new Date(status.reset).toISOString(),
    window: status.window,
  });
});
