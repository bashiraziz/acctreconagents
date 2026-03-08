import type { Balance } from "@/types/reconciliation";

const XERO_AUTH_BASE = "https://login.xero.com/identity/connect/authorize";
const XERO_TOKEN_URL = "https://identity.xero.com/connect/token";
const XERO_REVOKE_URL = "https://identity.xero.com/connect/revocation";
const XERO_API_BASE = "https://api.xero.com";
const NON_ROUTABLE_DEV_HOSTS = new Set(["0.0.0.0", "::", "[::]"]);

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

export type XeroTrialBalanceResponse = {
  Reports?: Array<{
    ReportTitles?: string[];
    ReportDate?: string;
    Rows?: unknown[];
  }>;
};

export type XeroReportsListResponse = {
  Reports?: Array<{
    ReportID?: string;
    ReportName?: string;
    ReportType?: string;
    ReportTitles?: string[];
  }>;
};

export type XeroReportProbeResult = {
  reportId: string;
  available: boolean;
  status: number;
  reportName: string | null;
};

export type XeroNormalizedBalance = Balance & {
  account_name?: string;
  debit?: number;
  credit?: number;
  balanceSide?: "debit" | "credit" | "zero";
};

type FlattenedXeroRow = {
  rowType: string;
  cells: string[];
};

function normalizeLocalDevHost(urlValue: string): string {
  try {
    const parsed = new URL(urlValue);
    if (
      process.env.NODE_ENV !== "production" &&
      NON_ROUTABLE_DEV_HOSTS.has(parsed.hostname)
    ) {
      parsed.hostname = "localhost";
    }
    return parsed.toString();
  } catch {
    return urlValue;
  }
}

export function getXeroConfig() {
  const clientId =
    process.env.XERO_CLIENT_ID?.trim() ||
    process.env.Xero_Client_Id?.trim() ||
    "";
  const clientSecret =
    process.env.XERO_CLIENT_SECRET?.trim() ||
    process.env.Xero_Client_Secret?.trim() ||
    "";
  const baseUrlRaw = process.env.BETTER_AUTH_URL?.trim() || "http://localhost:3000";
  const baseUrl = normalizeLocalDevHost(baseUrlRaw).replace(/\/$/, "");
  const redirectUriRaw =
    process.env.XERO_REDIRECT_URI?.trim() ||
    `${baseUrl}/api/integrations/xero/callback`;
  const redirectUri = normalizeLocalDevHost(redirectUriRaw);

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

export async function fetchXeroReportsList(
  accessToken: string,
  tenantId: string,
): Promise<XeroReportsListResponse> {
  const url = `${XERO_API_BASE}/api.xro/2.0/Reports`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": tenantId,
      Accept: "application/json",
    },
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`Xero reports list fetch failed (${response.status})`);
  }
  return payload as XeroReportsListResponse;
}

export async function probeXeroReportById(
  accessToken: string,
  tenantId: string,
  reportId: string,
  queryParams?: Record<string, string | undefined>,
): Promise<XeroReportProbeResult> {
  const params = new URLSearchParams();
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value) params.set(key, value);
    }
  }
  const query = params.toString();
  const url = `${XERO_API_BASE}/api.xro/2.0/Reports/${encodeURIComponent(reportId)}${query ? `?${query}` : ""}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Xero-tenant-id": tenantId,
      Accept: "application/json",
    },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const reportName =
    (payload as { Reports?: Array<{ ReportName?: string; ReportTitles?: string[] }> } | null)
      ?.Reports?.[0]?.ReportName?.trim() ||
    (payload as { Reports?: Array<{ ReportTitles?: string[] }> } | null)
      ?.Reports?.[0]?.ReportTitles?.[0]?.trim() ||
    null;

  return {
    reportId,
    available: response.ok,
    status: response.status,
    reportName,
  };
}

function toNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "").replace(/[()]/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  return trimmed.includes("(") && trimmed.includes(")") ? -Math.abs(parsed) : parsed;
}

function collectRows(node: unknown, output: FlattenedXeroRow[]) {
  if (!node || typeof node !== "object") return;
  const maybe = node as Record<string, unknown>;
  const rowTypeRaw =
    typeof maybe.RowType === "string"
      ? maybe.RowType
      : typeof maybe.rowType === "string"
        ? maybe.rowType
        : "";
  const cellsRaw = Array.isArray(maybe.Cells)
    ? maybe.Cells
    : Array.isArray(maybe.cells)
      ? maybe.cells
      : null;
  if (Array.isArray(cellsRaw)) {
    const cells = cellsRaw.map((cell) => {
      if (!cell || typeof cell !== "object") {
        return cell === null || cell === undefined ? "" : String(cell);
      }
      const maybeCell = cell as Record<string, unknown>;
      const raw =
        maybeCell.Value !== undefined
          ? maybeCell.Value
          : maybeCell.value !== undefined
            ? maybeCell.value
            : "";
      return raw === null || raw === undefined ? "" : String(raw);
    });
    output.push({
      rowType: rowTypeRaw.toLowerCase(),
      cells,
    });
  }
  const rowsRaw = Array.isArray(maybe.Rows)
    ? maybe.Rows
    : Array.isArray(maybe.rows)
      ? maybe.rows
      : null;
  if (Array.isArray(rowsRaw)) {
    for (const child of rowsRaw) {
      collectRows(child, output);
    }
  }
}

function detectColumnIndexes(rows: FlattenedXeroRow[]) {
  for (const row of rows) {
    if (!row.cells || row.cells.length < 2) continue;
    const labels = row.cells.map((cell) => cell.trim().toLowerCase());
    const looksLikeHeader =
      row.rowType === "header" ||
      labels.some((label) => label.includes("debit") || label.includes("credit"));
    if (!looksLikeHeader) continue;

    const debitCandidates = labels
      .map((label, index) => ({ label, index }))
      .filter(({ label }) => label.includes("debit"));
    const creditCandidates = labels
      .map((label, index) => ({ label, index }))
      .filter(({ label }) => label.includes("credit"));

    const pickPreferredDebitCredit = (
      candidates: Array<{ label: string; index: number }>
    ): number | null => {
      if (candidates.length === 0) return null;
      const ytd = candidates.find(
        ({ label }) =>
          label.includes("year to date") ||
          label.includes("year-to-date") ||
          label.includes("ytd")
      );
      if (ytd) return ytd.index;

      const nonMonth = candidates.find(({ label }) => !label.includes("month"));
      if (nonMonth) return nonMonth.index;

      return candidates[0]?.index ?? null;
    };

    const debitIdx = pickPreferredDebitCredit(debitCandidates);
    const creditIdx = pickPreferredDebitCredit(creditCandidates);
    const netIdx = labels.findIndex(
      (label) =>
        label.includes("balance") ||
        label === "amount" ||
        /\b\d{4}\b/.test(label) // e.g., "Dec 31, 2025"
    );

    return {
      debitIndex: debitIdx,
      creditIndex: creditIdx,
      netIndex: netIdx >= 0 ? netIdx : null,
    };
  }

  return {
    debitIndex: null as number | null,
    creditIndex: null as number | null,
    netIndex: null as number | null,
  };
}

export function normalizeXeroTrialBalance(
  payload: XeroTrialBalanceResponse,
  period: string,
): XeroNormalizedBalance[] {
  const report = payload?.Reports?.[0];
  const reportRows = Array.isArray((report as { Rows?: unknown[] } | undefined)?.Rows)
    ? (report as { Rows: unknown[] }).Rows
    : Array.isArray((report as { rows?: unknown[] } | undefined)?.rows)
      ? (report as { rows: unknown[] }).rows
      : null;
  if (!reportRows) {
    return [];
  }

  const rows: FlattenedXeroRow[] = [];
  for (const row of reportRows) {
    collectRows(row, rows);
  }
  const { debitIndex, creditIndex, netIndex } = detectColumnIndexes(rows);

  const balances: XeroNormalizedBalance[] = [];
  for (const row of rows) {
    const cells = row.cells;
    if (cells.length < 2) continue;
    const accountCell = cells[0]?.trim() ?? "";
    if (!accountCell) continue;

    // Prefer a pure numeric account code when present, otherwise keep source label.
    const codeMatch = accountCell.match(/\b\d{2,}\b/);
    if (!codeMatch) {
      // Ignore non-account rows such as section labels and totals.
      continue;
    }
    const accountCode = codeMatch ? codeMatch[0] : accountCell.slice(0, 80);
    const accountName = accountCell
      .replace(new RegExp(`\\b${accountCode}\\b`), "")
      .replace(/^\s*[-–—:]\s*/, "")
      .replace(/\s*[-–—:]\s*$/, "")
      .replace(/^\s*\(.*?\)\s*/, "")
      .replace(/\s*\(.*?\)\s*$/, "")
      .trim() || undefined;

    const parsedDebit =
      debitIndex !== null && debitIndex < cells.length ? toNumber(cells[debitIndex]) : null;
    const parsedCredit =
      creditIndex !== null && creditIndex < cells.length ? toNumber(cells[creditIndex]) : null;
    const debit = parsedDebit === null ? null : Math.abs(parsedDebit);
    const credit = parsedCredit === null ? null : Math.abs(parsedCredit);

    // Prefer debit/credit math (YTD when present) over the report's date column,
    // which often represents opening balance and can understate current position.
    let amount: number | null = null;
    if (debit !== null || credit !== null) {
      amount = (debit ?? 0) - (credit ?? 0);
    }

    const netFromColumn =
      netIndex !== null && netIndex < cells.length ? toNumber(cells[netIndex]) : null;
    if (amount === null) {
      amount = netFromColumn;
    }

    if (amount === null) {
      amount = [...cells.slice(1)].reverse().map(toNumber).find((val) => val !== null) ?? null;
    }
    if (amount === null) continue;

    const balanceSide: "debit" | "credit" | "zero" =
      amount > 0 ? "debit" : amount < 0 ? "credit" : "zero";

    balances.push({
      account_code: accountCode,
      account_name: accountName,
      period,
      amount,
      currency: "USD",
      debit: debit ?? (amount > 0 ? Math.abs(amount) : 0),
      credit: credit ?? (amount < 0 ? Math.abs(amount) : 0),
      balanceSide,
    });
  }

  return balances.sort((a, b) => {
    const aNum = Number(a.account_code);
    const bNum = Number(b.account_code);
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum;
    return a.account_code.localeCompare(b.account_code);
  });
}
