/**
 * API route for managing user organizations
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createUserOrganization,
  getUserOrganizations,
} from "@/lib/db/client";
import { auth } from "@/lib/auth";
import { withErrorHandler, ApiErrors } from "@/lib/api-error";

// GET /api/user/organizations
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
    return NextResponse.json({ organizations: [] });
  }

  const organizations = await getUserOrganizations(session.user.id);
  return NextResponse.json({ organizations });
});

// POST /api/user/organizations
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
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const makeDefault = Boolean(body?.makeDefault);

  if (!name) {
    return ApiErrors.badRequest(
      "Missing organization name",
      "Organization name is required",
      ["Provide a non-empty organization name"]
    );
  }

  const organization = await createUserOrganization(
    session.user.id,
    name,
    makeDefault
  );

  return NextResponse.json({ organization });
});
