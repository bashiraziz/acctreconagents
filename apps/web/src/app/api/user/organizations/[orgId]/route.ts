/**
 * API route for updating/deleting a user organization
 */

import { NextRequest, NextResponse } from "next/server";
import {
  deleteUserOrganization,
  renameUserOrganization,
  setDefaultUserOrganization,
  updateUserOrganizationDefaults,
} from "@/lib/db/client";
import { auth } from "@/lib/auth";
import { withErrorHandler, ApiErrors } from "@/lib/api-error";

// PATCH /api/user/organizations/:orgId
export const PATCH = withErrorHandler(async (request: NextRequest, context: { params: Promise<{ orgId: string }> }) => {
  const params = await context.params;
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

  const orgId = params.orgId;
  if (!orgId) {
    return ApiErrors.badRequest("Missing organization id");
  }

  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const makeDefault = Boolean(body?.makeDefault);
  const defaultMateriality =
    typeof body?.defaultMateriality === "number"
      ? body.defaultMateriality
      : null;
  const defaultPrompt =
    typeof body?.defaultPrompt === "string" ? body.defaultPrompt.trim() : null;

  if (!name && !makeDefault && defaultMateriality === null && defaultPrompt === null) {
    return ApiErrors.badRequest(
      "No changes provided",
      "Provide a new name, defaults, and/or set makeDefault to true",
      [
        "Set name to rename",
        "Set makeDefault to true to update default",
        "Set defaultMateriality or defaultPrompt to update defaults",
      ]
    );
  }

  let organization;
  if (name) {
    organization = await renameUserOrganization(session.user.id, orgId, name);
  }
  if (makeDefault) {
    organization = await setDefaultUserOrganization(session.user.id, orgId);
  }
  if (defaultMateriality !== null || defaultPrompt !== null) {
    organization = await updateUserOrganizationDefaults(session.user.id, orgId, {
      defaultMateriality,
      defaultPrompt,
    });
  }

  return NextResponse.json({ organization });
});

// DELETE /api/user/organizations/:orgId
export const DELETE = withErrorHandler(async (request: NextRequest, context: { params: Promise<{ orgId: string }> }) => {
  const params = await context.params;
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

  const orgId = params.orgId;
  if (!orgId) {
    return ApiErrors.badRequest("Missing organization id");
  }

  await deleteUserOrganization(session.user.id, orgId);
  return NextResponse.json({ success: true });
});
