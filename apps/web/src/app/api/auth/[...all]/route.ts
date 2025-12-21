/**
 * Better Auth API route handler
 * Handles all auth endpoints: /api/auth/*
 */

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextResponse } from "next/server";

const handlers = toNextJsHandler(auth);

// Wrap handlers to gracefully handle database errors
export async function GET(request: Request) {
  try {
    return await handlers.GET(request);
  } catch (error) {
    // Database not configured - return empty session
    if (request.url.includes('/get-session')) {
      return NextResponse.json({ user: null, session: null }, { status: 200 });
    }
    // For other errors, return appropriate error response
    return NextResponse.json(
      { error: "Authentication service unavailable" },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  try {
    return await handlers.POST(request);
  } catch (error) {
    console.error("❌ Better Auth POST error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      {
        error: "Authentication service unavailable",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 503 }
    );
  }
}
