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
import { withErrorHandler, ApiErrors } from "@/lib/api-error";
import type { FileType, ColumnMapping } from "@/types/reconciliation";

// GET /api/user/mappings?fileType=gl_balance
export const GET = withErrorHandler(async (request: NextRequest) => {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    console.warn("Auth session lookup failed:", error);
  }
  if (!session?.user) {
    return ApiErrors.unauthorized();
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
});

// POST /api/user/mappings
export const POST = withErrorHandler(async (request: NextRequest) => {
  let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
  try {
    session = await auth.api.getSession({
      headers: request.headers,
    });
  } catch (error) {
    console.warn("Auth session lookup failed:", error);
  }
  if (!session?.user) {
    return ApiErrors.unauthorized();
  }

  const body = await request.json();
  const { fileType, mapping } = body as {
    fileType: FileType;
    mapping: ColumnMapping;
  };

  if (!fileType || !mapping) {
    return ApiErrors.badRequest(
      "Missing required fields",
      "Both fileType and mapping are required",
      ["Provide fileType (e.g., 'gl_balance', 'subledger_balance', 'transactions')", "Provide mapping object with column definitions"]
    );
  }

  const saved = await saveUserMapping(session.user.id, fileType, mapping);
  return NextResponse.json({ mapping: saved });
});
