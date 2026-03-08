import {
  getIntegrationConnection,
  upsertIntegrationConnection,
  type IntegrationConnectionRecord,
} from "@/lib/db/client";
import type { IntegrationProvider } from "@/lib/integrations/provider-registry";

type GetValidDbXeroAccessTokenParams = {
  userId: string;
  organizationId: string;
  provider: IntegrationProvider;
};

export async function getValidDbXeroAccessToken({
  userId,
  organizationId,
  provider,
}: GetValidDbXeroAccessTokenParams): Promise<IntegrationConnectionRecord> {
  const existing = await getIntegrationConnection(userId, organizationId, "xero");
  if (!existing) {
    throw new Error("Xero is not connected for this user.");
  }

  const expiresAtMs = new Date(existing.expiresAt).getTime();
  const stillValid = Number.isFinite(expiresAtMs) && expiresAtMs > Date.now() + 60_000;
  if (stillValid) {
    return existing;
  }

  const refreshed = await provider.oauth.refreshToken(existing.refreshToken);
  const nextExpiresAt = new Date(
    Date.now() + Math.max(refreshed.expires_in - 60, 60) * 1000
  );

  return upsertIntegrationConnection(userId, organizationId, "xero", {
    externalTenantId: existing.externalTenantId,
    externalTenantName: existing.externalTenantName,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token,
    expiresAt: nextExpiresAt,
    scope: refreshed.scope ?? existing.scope,
    tokenType: refreshed.token_type ?? existing.tokenType,
  });
}
