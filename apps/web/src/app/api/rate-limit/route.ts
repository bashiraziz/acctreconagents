import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRateLimitStatus } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";

/**
 * GET /api/rate-limit
 * Returns current rate limit status for the user
 */
export async function GET(request: Request) {
  try {
    // Check authentication status (with error handling for missing DB)
    let isAuthenticated = false;
    let userId: string | undefined;

    try {
      const session = await auth.api.getSession({ headers: request.headers });
      isAuthenticated = !!session?.user;
      userId = session?.user?.id;
    } catch (authError) {
      // If auth fails (e.g., no database), treat as anonymous user
      // This is expected behavior when POSTGRES_URL is not configured
      isAuthenticated = false;
    }

    // Get client identifier
    const clientIp = getClientIp(request);
    const identifier = isAuthenticated && userId ? `user:${userId}` : `ip:${clientIp}`;

    // Get rate limit status
    const status = getRateLimitStatus(identifier, isAuthenticated);

    return NextResponse.json({
      authenticated: isAuthenticated,
      limit: status.limit,
      remaining: status.remaining,
      reset: new Date(status.reset).toISOString(),
      window: status.window,
    });
  } catch (error) {
    console.error("Rate limit status error:", error);
    return NextResponse.json(
      { error: "Failed to get rate limit status" },
      { status: 500 }
    );
  }
}
