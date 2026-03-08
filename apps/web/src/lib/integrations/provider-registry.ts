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
import {
  fetchXeroJournals,
  normalizeXeroJournals,
  type XeroJournal,
  type XeroNormalizedTransaction,
} from "@/lib/xero-journals";
import {
  fetchXeroInvoicesForAging,
  normalizeXeroInvoicesForAging,
  type XeroInvoice,
  type XeroAgedReportType,
  type XeroNormalizedSubledgerRow,
} from "@/lib/xero-aged";
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
  transactions: {
    fetch: (
      accessToken: string,
      tenantId: string,
      options: { fromDate?: string; toDate?: string; maxPages?: number }
    ) => Promise<XeroJournal[]>;
    normalize: (journals: XeroJournal[]) => XeroNormalizedTransaction[];
  };
  subledger: {
    fetch: (
      accessToken: string,
      tenantId: string,
      type: XeroAgedReportType,
      asOfDate: string
    ) => Promise<XeroInvoice[]>;
    normalize: (
      invoices: XeroInvoice[],
      type: XeroAgedReportType,
      asOfDate: string
    ) => XeroNormalizedSubledgerRow[];
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
  transactions: {
    fetch: fetchXeroJournals,
    normalize: normalizeXeroJournals,
  },
  subledger: {
    fetch: fetchXeroInvoicesForAging,
    normalize: normalizeXeroInvoicesForAging,
  },
};

const providers: Record<IntegrationProviderId, IntegrationProvider> = {
  xero: xeroProvider,
};

export function getIntegrationProvider(providerId: IntegrationProviderId): IntegrationProvider {
  return providers[providerId];
}
