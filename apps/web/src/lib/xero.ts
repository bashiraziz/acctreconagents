import type { Balance } from "@/types/reconciliation";

const XERO_AUTH_BASE = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_REVOKE_URL = "https://identity.xero.com/connect/revocation";
const XERO_API_BASE = "https://api.xero.com";

type XeroTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope?: string;
};

type XeroConnection = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantType: string;
};

type XeroTrialBalanceResponse = {
  Reports?: Array<{
    ReportTitles?: string[];
    ReportDate?: string;
    Rows?: unknown[];
  }>;
};

export function getXeroConfig() {
  const clientId = process.env.XERO_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.XERO_CLIENT_SECRET?.trim() ?? "";
  const baseUrl = process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000";
  const redirectUri =
    process.env.XERO_REDIRECT_URI?.trim() ||
    `${baseUrl.replace(/\/$/, "")}/api/integrations/xero/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    isConfigured: clientId !== "" && clientSecret !== "",
  };
}

function getBasicAuthHeader(clientId: string, clientSecret: string) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function buildXeroAuthorizeUrl(state: string): string {
  const { clientId, redirectUri } = getXeroConfig();
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "openid profile email accounting.reports.read accounting.transactions.read offline_access",
    state,
  });

  return `${XERO_AUTH_BASE}?${params.toString()}`;
}

export async function exchangeXeroAuthCode(code: string): Promise<XeroTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getXeroConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `Xero token exchange failed (${response.status}): ${
        payload?.error_description || payload?.error || "Unknown error"
      }`
    );
  }

  return payload as XeroTokenResponse;
}

export async function refreshXeroToken(refreshToken: string): Promise<XeroTokenResponse> {
  const { clientId, clientSecret } = getXeroConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch(XERO_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(
      `Xero token refresh failed (${response.status}): ${
        payload?.error_description || payload?.error || "Unknown error"
      }`
    );
  }
  return payload as XeroTokenResponse;
}

export async function revokeXeroRefreshToken(refreshToken: string): Promise<void> {
  const { clientId, clientSecret } = getXeroConfig();
  const body = new URLSearchParams({
    token: refreshToken,
  });
  const response = await fetch(XERO_REVOKE_URL, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(clientId, clientSecret),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    // Revocation failures should not block disconnect flow.
    console.warn("Xero revoke token failed:", response.status);
  }
}

export async function getXeroConnections(accessToken: string): Promise<XeroConnection[]> {
  const response = await fetch(`${XERO_API_BASE}/connections`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Xero connections fetch failed (${response.status})`);
  }
  return Array.isArray(payload) ? (payload as XeroConnection[]) : [];
}

export async function fetchXeroTrialBalance(
  accessToken: string,
  tenantId: string,
  date?: string,
): Promise<XeroTrialBalanceResponse> {
  const params = new URLSearchParams();
  if (date) {
    params.set("date", date);
  }
  const query = params.toString();
  const url = `${XERO_API_BASE}/api.xro/2.0/Reports/TrialBalance${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": tenantId,
      Accept: "application/json",
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Xero trial balance fetch failed (${response.status})`);
  }
  return payload as XeroTrialBalanceResponse;
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "").replace(/[()]/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return trimmed.includes("(") && trimmed.includes(")") ? -Math.abs(parsed) : parsed;
}

function collectCells(node: unknown, output: string[][]) {
  if (!node || typeof node !== "object") return;
  const maybe = node as { Cells?: Array<{ Value?: string | number | null }>; Rows?: unknown[] };
  if (Array.isArray(maybe.Cells)) {
    const cells = maybe.Cells.map((cell) =>
      cell?.Value === null || cell?.Value === undefined ? "" : String(cell.Value)
    );
    output.push(cells);
  }
  if (Array.isArray(maybe.Rows)) {
    for (const child of maybe.Rows) {
      collectCells(child, output);
    }
  }
}

export function normalizeXeroTrialBalance(
  payload: XeroTrialBalanceResponse,
  period: string,
): Balance[] {
  const report = payload?.Reports?.[0];
  if (!report?.Rows) {
    return [];
  }

  const rows: string[][] = [];
  for (const row of report.Rows) {
    collectCells(row, rows);
  }

  const balances: Balance[] = [];
  for (const cells of rows) {
    if (cells.length < 2) continue;
    const accountCell = cells[0]?.trim();
    if (!accountCell) continue;

    const amountCandidate = [...cells].reverse().map(toNumber).find((val) => val !== null);
    if (amountCandidate === undefined || amountCandidate === null) continue;

    // Prefer a pure numeric account code when present, otherwise keep source label.
    const codeMatch = accountCell.match(/\b\d{2,}\b/);
    const accountCode = codeMatch ? codeMatch[0] : accountCell.slice(0, 80);

    balances.push({
      account_code: accountCode,
      period,
      amount: amountCandidate,
      currency: "USD",
    });
  }

  return balances;
}

