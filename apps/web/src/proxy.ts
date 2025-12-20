import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy for rate limiting and authentication
 * Note: Next.js 16 renamed "middleware" to "proxy"
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, images, and auth routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes("/favicon") ||
    pathname.includes("/images") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Allow all requests to pass through - rate limiting is handled in API routes
  // This is because we need to check authentication status before rate limiting
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
