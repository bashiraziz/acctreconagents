/**
 * API route for saving/loading user column mappings
 */

import { NextRequest, NextResponse } from "next/server";
import {
  saveUserMapping,
  getUserMapping,
  getAllUserMappings,
} from "@/lib/db/client";
import type { FileType, ColumnMapping } from "@/types/reconciliation";

// GET /api/user/mappings?userId=xxx&fileType=gl_balance
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const fileType = searchParams.get("fileType") as FileType | null;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 },
      );
    }

    if (fileType) {
      // Get specific mapping
      const mapping = await getUserMapping(userId, fileType);
      return NextResponse.json({ mapping });
    } else {
      // Get all mappings
      const mappings = await getAllUserMappings(userId);
      return NextResponse.json({ mappings });
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
    const body = await request.json();
    const { userId, fileType, mapping } = body as {
      userId: string;
      fileType: FileType;
      mapping: ColumnMapping;
    };

    if (!userId || !fileType || !mapping) {
      return NextResponse.json(
        { error: "userId, fileType, and mapping are required" },
        { status: 400 },
      );
    }

    const saved = await saveUserMapping(userId, fileType, mapping);
    return NextResponse.json({ mapping: saved });
  } catch (error) {
    console.error("Failed to save user mapping:", error);
    return NextResponse.json(
      { error: "Failed to save mapping" },
      { status: 500 },
    );
  }
}
