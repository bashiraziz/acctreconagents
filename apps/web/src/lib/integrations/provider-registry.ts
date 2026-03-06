import {
  buildXeroAuthorizeUrl,
  exchangeXeroAuthCode,
  fetchXeroTrialBalance,
  getXeroConfig,
  getXeroConnections,
  normalizeXeroTrialBalance,
  refreshXeroToken,
  revokeXeroRefreshToken,
  type XeroNormalizedBalance,
  type XeroTrialBalanceResponse,
} from "@/lib/xero";
import { isXeroDevNoDbModeEnabled } from "@/lib/xero-dev-store";

export type IntegrationProviderId = "xero";

export type IntegrationProvider = {
  id: IntegrationProviderId;
  label: string;
  getConfig: () => {
    isConfigured: boolean;
  };
  isDevNoDbModeEnabled: () => boolean;
  oauth: {
    buildAuthorizeUrl: (state: string) => string;
    exchangeAuthCode: (
      code: string
    ) => Promise<{
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
      scope?: string;
    }>;
    getConnections: (
      accessToken: string
    ) => Promise<
      Array<{
        id: string;
        tenantId: string;
        tenantName: string;
        tenantType: string;
      }>
    >;
    refreshToken: (
      refreshToken: string
    ) => Promise<{
      access_token: string;
      token_type: string;
      expires_in: number;
      refresh_token: string;
      scope?: string;
    }>;
    revokeRefreshToken: (refreshToken: string) => Promise<void>;
  };
  trialBalance: {
    fetch: (
      accessToken: string,
      tenantId: string,
      date?: string
    ) => Promise<XeroTrialBalanceResponse>;
    normalize: (
      payload: XeroTrialBalanceResponse,
      period: string
    ) => XeroNormalizedBalance[];
  };
};

const xeroProvider: IntegrationProvider = {
  id: "xero",
  label: "Xero",
  getConfig: () => getXeroConfig(),
  isDevNoDbModeEnabled: () => isXeroDevNoDbModeEnabled(),
  oauth: {
    buildAuthorizeUrl: buildXeroAuthorizeUrl,
    exchangeAuthCode: exchangeXeroAuthCode,
    getConnections: getXeroConnections,
    refreshToken: refreshXeroToken,
    revokeRefreshToken: revokeXeroRefreshToken,
  },
  trialBalance: {
    fetch: fetchXeroTrialBalance,
    normalize: normalizeXeroTrialBalance,
  },
};

const providers: Record<IntegrationProviderId, IntegrationProvider> = {
  xero: xeroProvider,
};

export function getIntegrationProvider(providerId: IntegrationProviderId): IntegrationProvider {
  return providers[providerId];
}
