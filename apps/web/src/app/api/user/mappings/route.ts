/**
 * API route for saving/loading user column mappings
 */

import { NextRequest, NextResponse } from "next/server";
import {
  saveUserMapping,
  getUserMapping,
  getAllUserMappings,
} from "@/lib/db/client";
import { auth } from "@/lib/auth";
import type { FileType, ColumnMapping } from "@/types/reconciliation";

// GET /api/user/mappings?fileType=gl_balance
export async function GET(request: NextRequest) {
  try {
    let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
    try {
      session = await auth.api.getSession({
        headers: request.headers,
      });
    } catch (error) {
      console.warn("Auth session lookup failed:", error);
    }
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const fileType = searchParams.get("fileType") as FileType | null;

    if (fileType) {
      // Get specific mapping
      const mapping = await getUserMapping(session.user.id, fileType);
      return NextResponse.json({ mapping });
    } else {
      // Get all mappings
      const mappings = await getAllUserMappings(session.user.id);
      const byType = {
        gl_balance: {},
        subledger_balance: {},
        transactions: {},
      } as Record<FileType, ColumnMapping>;
      mappings.forEach((entry) => {
        byType[entry.fileType] = entry.mapping;
      });
      return NextResponse.json({ mappings: byType });
    }
  } catch (error) {
    console.error("Failed to get user mappings:", error);
    return NextResponse.json(
      { error: "Failed to get mappings" },
      { status: 500 },
    );
  }
}

// POST /api/user/mappings
export async function POST(request: NextRequest) {
  try {
    let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
    try {
      session = await auth.api.getSession({
        headers: request.headers,
      });
    } catch (error) {
      console.warn("Auth session lookup failed:", error);
    }
    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { fileType, mapping } = body as {
      fileType: FileType;
      mapping: ColumnMapping;
    };

    if (!fileType || !mapping) {
      return NextResponse.json(
        { error: "fileType and mapping are required" },
        { status: 400 },
      );
    }

    const saved = await saveUserMapping(session.user.id, fileType, mapping);
    return NextResponse.json({ mapping: saved });
  } catch (error) {
    console.error("Failed to save user mapping:", error);
    return NextResponse.json(
      { error: "Failed to save mapping" },
      { status: 500 },
    );
  }
}
