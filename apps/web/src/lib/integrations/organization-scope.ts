import type { NextRequest } from "next/server";
import {
  getDefaultUserOrganization,
  getUserOrganizations,
} from "@/lib/db/client";

export const DEV_DEFAULT_ORGANIZATION_SCOPE = "dev-default";

type ResolveOrganizationScopeInput = {
  request: NextRequest;
  userId?: string | null;
  allowAnonymous: boolean;
  requestedOrganizationId?: string | null;
};

type ResolveOrganizationScopeResult = {
  organizationId: string;
  source: "query" | "default_org" | "first_org" | "implicit_default" | "dev_default";
};

export async function resolveOrganizationScope(
  input: ResolveOrganizationScopeInput
): Promise<ResolveOrganizationScopeResult> {
  const requestedOrganizationId =
    input.request.nextUrl.searchParams.get("organizationId")?.trim() ??
    input.requestedOrganizationId?.trim() ??
    "";
  if (requestedOrganizationId && input.userId) {
    const organizations = await getUserOrganizations(input.userId);
    const found = organizations.find((org) => org.id === requestedOrganizationId);
    if (!found) {
      throw new Error("Invalid organizationId. Organization not found for current user.");
    }
    return {
      organizationId: found.id,
      source: "query",
    };
  }

  if (input.userId) {
    const defaultOrg = await getDefaultUserOrganization(input.userId);
    if (defaultOrg) {
      return {
        organizationId: defaultOrg.id,
        source: "default_org",
      };
    }
    const organizations = await getUserOrganizations(input.userId);
    if (organizations.length > 0) {
      return {
        organizationId: organizations[0].id,
        source: "first_org",
      };
    }
    return {
      organizationId: "default",
      source: "implicit_default",
    };
  }

  if (input.allowAnonymous) {
    return {
      organizationId: requestedOrganizationId || DEV_DEFAULT_ORGANIZATION_SCOPE,
      source: requestedOrganizationId ? "query" : "dev_default",
    };
  }

  throw new Error("No organization scope available for current user.");
}
