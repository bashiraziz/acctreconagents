import { NextResponse } from "next/server";
import { getRateLimitStatus } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";

/**
 * GET /api/rate-limit
 * Returns current rate limit status for anonymous users
 */
export async function GET(request: Request) {
  try {
    // Always treat as anonymous user (no authentication)
    const isAuthenticated = false;

    // Get client identifier based on IP
    const clientIp = getClientIp(request);
    const identifier = `ip:${clientIp}`;

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
