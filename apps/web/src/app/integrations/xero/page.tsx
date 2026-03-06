"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useFileUploadStore } from "@/store/fileUploadStore";
import { useUserPreferencesStore } from "@/store/userPreferencesStore";
import type { UploadedFile } from "@/types/reconciliation";

type XeroStatus = {
  configured: boolean;
  connected: boolean;
  devNoDbMode: boolean;
  requiresAuth: boolean;
  mode?: "oauth" | "mcp";
  mcp?: {
    enabled: boolean;
    configured: boolean;
    reason?: string | null;
  };
  connection: {
    tenantId: string;
    tenantName: string | null;
    expiresAt: string;
    updatedAt: string;
    lastSyncedAt: string | null;
  } | null;
};

type XeroTrialBalancePreview = {
  period: string;
  asOfDate: string;
  count: number;
  glBalances: Array<{
    account_code: string;
    amount: number;
    debit?: number;
    credit?: number;
    balanceSide?: "debit" | "credit" | "zero";
    period?: string;
    currency?: string;
  }>;
};

type LocalBalanceRow = {
  account_code: string;
  period: string;
  amount: number;
  currency: string;
};
type XeroMode = "oauth" | "mcp";
type XeroAction = "idle" | "pull" | "disconnect" | "discover";
type XeroReportsDiscovery = {
  mode: XeroMode;
  count: number;
  tenant: {
    id: string;
    name: string | null;
  };
  reports: Array<{
    id: string;
    name: string;
    type: string | null;
    source?: "reports_list" | "endpoint_probe";
  }>;
  diagnostics?: {
    listCount: number;
    probedCount: number;
    totalProbes: number;
  };
};

function resolveXeroMode(value: string | null | undefined): XeroMode {
  return value?.toLowerCase() === "mcp" ? "mcp" : "oauth";
}

function getTodayLocalIsoDate(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatIsoDate(year: number, monthIndexZeroBased: number, day: number): string {
  const y = String(year);
  const m = String(monthIndexZeroBased + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMonthEndIsoDate(base: Date): string {
  const year = base.getFullYear();
  const month = base.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return formatIsoDate(year, month, lastDay);
}

function getPriorMonthEndIsoDate(base: Date): string {
  const year = base.getFullYear();
  const month = base.getMonth();
  const prior = new Date(year, month, 0);
  const priorYear = prior.getFullYear();
  const priorMonth = prior.getMonth();
  const priorLastDay = prior.getDate();
  return formatIsoDate(priorYear, priorMonth, priorLastDay);
}

function getPriorYearEndIsoDate(base: Date): string {
  const priorYear = base.getFullYear() - 1;
  return formatIsoDate(priorYear, 11, 31);
}

function clampIsoDateToMax(dateIso: string, maxIso: string): string {
  return dateIso > maxIso ? maxIso : dateIso;
}

function formatElapsedDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
  }
  return `${seconds}s`;
}

function getApiErrorMessage(
  payload: unknown,
  fallback: string
): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }
  const body = payload as { message?: unknown; details?: unknown };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const details = typeof body.details === "string" ? body.details.trim() : "";
  if (message && details) {
    return `${message}: ${details}`;
  }
  if (message) {
    return message;
  }
  if (details) {
    return details;
  }
  return fallback;
}

export default function XeroIntegrationPage() {
  const { data: session, isPending } = useSession();
  const [selectedMode, setSelectedMode] = useState<XeroMode>("oauth");
  const [xeroAsOfDate, setXeroAsOfDate] = useState<string>(() => getTodayLocalIsoDate());
  const [modeInitialized, setModeInitialized] = useState(false);
  const [xeroStatus, setXeroStatus] = useState<XeroStatus | null>(null);
  const [xeroLoading, setXeroLoading] = useState(false);
  const [xeroAction, setXeroAction] = useState<XeroAction>("idle");
  const [xeroPullStartedAt, setXeroPullStartedAt] = useState<number | null>(null);
  const [xeroPullElapsedMs, setXeroPullElapsedMs] = useState(0);
  const [xeroLastPullDurationMs, setXeroLastPullDurationMs] = useState<number | null>(null);
  const [xeroLastPullMode, setXeroLastPullMode] = useState<XeroMode | null>(null);
  const [xeroReportsDiscovery, setXeroReportsDiscovery] = useState<XeroReportsDiscovery | null>(
    null
  );
  const [xeroError, setXeroError] = useState<string | null>(null);
  const [xeroPreview, setXeroPreview] = useState<XeroTrialBalancePreview | null>(null);
  const [showAllXeroRows, setShowAllXeroRows] = useState(false);
  const [xeroSavedMessage, setXeroSavedMessage] = useState<string | null>(null);
  const setUploadedFile = useFileUploadStore((state) => state.setFile);
  const setMaterialityThreshold = useUserPreferencesStore(
    (state) => state.setMaterialityThreshold
  );
  const setReportingPeriodDefault = useUserPreferencesStore(
    (state) => state.setReportingPeriodDefault
  );

  const xeroDevModeActive = Boolean(xeroStatus?.devNoDbMode);
  const xeroMcpModeActive = selectedMode === "mcp";
  const xeroMcpEnabled = Boolean(xeroStatus?.mcp?.enabled);
  const xeroCanUseWithoutAuth = Boolean(session?.user) || xeroDevModeActive;
  const xeroModePending =
    !modeInitialized || (!session?.user && xeroStatus === null && xeroLoading);
  const xeroRecommendedMateriality = useMemo(() => {
    if (!xeroPreview || xeroPreview.glBalances.length === 0) return 50;
    const maxAbs = Math.max(
      ...xeroPreview.glBalances.map((row) => Math.abs(Number(row.amount) || 0))
    );
    return Math.max(50, Math.round(maxAbs * 0.01));
  }, [xeroPreview]);
  const xeroTotals = useMemo(() => {
    if (!xeroPreview) {
      return { debit: 0, credit: 0, net: 0 };
    }
    return xeroPreview.glBalances.reduce(
      (acc, row) => {
        const amount = Number(row.amount) || 0;
        const debit = Number(row.debit ?? (amount > 0 ? Math.abs(amount) : 0)) || 0;
        const credit = Number(row.credit ?? (amount < 0 ? Math.abs(amount) : 0)) || 0;
        acc.debit += debit;
        acc.credit += credit;
        acc.net += amount;
        return acc;
      },
      { debit: 0, credit: 0, net: 0 }
    );
  }, [xeroPreview]);
  const xeroTbDifference = useMemo(
    () => xeroTotals.debit - xeroTotals.credit,
    [xeroTotals.debit, xeroTotals.credit]
  );
  const xeroTbBalanced = Math.abs(xeroTbDifference) < 0.005;
  const xeroMaxAsOfDate = useMemo(() => getTodayLocalIsoDate(), []);
  const xeroMonthEndAsOfDate = useMemo(() => getMonthEndIsoDate(new Date()), []);
  const xeroPriorMonthEndAsOfDate = useMemo(
    () => getPriorMonthEndIsoDate(new Date()),
    []
  );
  const xeroPriorYearEndAsOfDate = useMemo(
    () => getPriorYearEndIsoDate(new Date()),
    []
  );
  const xeroBusy = xeroAction !== "idle";
  const xeroPullInProgress = xeroPullStartedAt !== null;

  const loadXeroStatus = useCallback(async () => {
    setXeroLoading(true);
    setXeroError(null);
    try {
      const response = await fetch(
        `/api/integrations/xero/status?mode=${encodeURIComponent(selectedMode)}`
      );
      const data = await response.json();
      if (response.status === 401) {
        setXeroStatus({
          configured: false,
          connected: false,
          devNoDbMode: false,
          requiresAuth: true,
          mode: selectedMode,
          connection: null,
        });
        return;
      }
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to load Xero connection status"));
      }
      const nextStatus = data as XeroStatus;
      setXeroStatus(nextStatus);
      if (nextStatus.mode && nextStatus.mode !== selectedMode) {
        setSelectedMode(nextStatus.mode);
      }
    } catch (err) {
      setXeroError(err instanceof Error ? err.message : "Failed to load Xero status");
    } finally {
      setXeroLoading(false);
    }
  }, [selectedMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeFromQuery = resolveXeroMode(params.get("mode"));
    const hasModeQuery = params.has("mode");
    const storedMode = resolveXeroMode(window.localStorage.getItem("xeroIntegrationMode"));
    const initialMode = hasModeQuery ? modeFromQuery : storedMode;
    setSelectedMode(initialMode);
    window.localStorage.setItem("xeroIntegrationMode", initialMode);
    setModeInitialized(true);
  }, []);

  useEffect(() => {
    if (!modeInitialized || isPending) return;
    void loadXeroStatus();
  }, [modeInitialized, isPending, session?.user, loadXeroStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasModeQuery = params.has("mode");
    if (hasModeQuery) {
      const modeFromQuery = resolveXeroMode(params.get("mode"));
      if (modeFromQuery !== selectedMode) {
        setSelectedMode(modeFromQuery);
        window.localStorage.setItem("xeroIntegrationMode", modeFromQuery);
      }
    }
    const status = params.get("xero");
    const detail = params.get("detail");
    if (!status) return;
    if (status === "connected") {
      setXeroError(null);
      void loadXeroStatus();
      return;
    }
    if (status === "error") {
      setXeroError(detail || "Xero connection failed");
    }
  }, [loadXeroStatus, selectedMode]);

  useEffect(() => {
    if (!xeroStatus || selectedMode !== "mcp" || xeroMcpEnabled) {
      return;
    }
    setSelectedMode("oauth");
    window.localStorage.setItem("xeroIntegrationMode", "oauth");
  }, [selectedMode, xeroMcpEnabled, xeroStatus]);

  useEffect(() => {
    if (xeroPullStartedAt === null) {
      return;
    }
    const interval = window.setInterval(() => {
      setXeroPullElapsedMs(Date.now() - xeroPullStartedAt);
    }, 250);
    return () => {
      window.clearInterval(interval);
    };
  }, [xeroPullStartedAt]);

  const handleDisconnectXero = async () => {
    setXeroAction("disconnect");
    setXeroError(null);
    setXeroSavedMessage(null);
    try {
      const response = await fetch("/api/integrations/xero/connection", {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to disconnect Xero"));
      }
      setXeroPreview(null);
      setXeroReportsDiscovery(null);
      setShowAllXeroRows(false);
      await loadXeroStatus();
    } catch (err) {
      setXeroError(err instanceof Error ? err.message : "Failed to disconnect Xero");
    } finally {
      setXeroAction("idle");
    }
  };

  const handlePullXeroTrialBalance = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(xeroAsOfDate)) {
      setXeroError("Invalid As of date. Use YYYY-MM-DD.");
      return;
    }

    setXeroAction("pull");
    setXeroError(null);
    setXeroSavedMessage(null);
    const pullStartedAt = Date.now();
    const pullMode = selectedMode;
    setXeroPullStartedAt(pullStartedAt);
    setXeroPullElapsedMs(0);
    try {
      const params = new URLSearchParams({
        mode: selectedMode,
        date: xeroAsOfDate,
      });
      const response = await fetch(
        `/api/integrations/xero/data/trial-balance?${params.toString()}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to pull trial balance from Xero"));
      }
      const preview = data as XeroTrialBalancePreview;
      setXeroPreview(preview);
      if (preview.asOfDate) {
        setXeroAsOfDate(preview.asOfDate);
      }
      setShowAllXeroRows(false);
      await loadXeroStatus();
    } catch (err) {
      setXeroError(
        err instanceof Error ? err.message : "Failed to pull trial balance from Xero"
      );
    } finally {
      const duration = Date.now() - pullStartedAt;
      setXeroLastPullDurationMs(duration);
      setXeroLastPullMode(pullMode);
      setXeroPullElapsedMs(duration);
      setXeroPullStartedAt(null);
      setXeroAction("idle");
    }
  };

  const handleDiscoverXeroReports = async () => {
    setXeroAction("discover");
    setXeroError(null);
    setXeroSavedMessage(null);
    try {
      const response = await fetch(
        `/api/integrations/xero/data/reports?mode=${encodeURIComponent(selectedMode)}`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(getApiErrorMessage(data, "Failed to discover Xero reports"));
      }
      setXeroReportsDiscovery(data as XeroReportsDiscovery);
    } catch (err) {
      setXeroReportsDiscovery(null);
      setXeroError(err instanceof Error ? err.message : "Failed to discover Xero reports");
    } finally {
      setXeroAction("idle");
    }
  };

  const buildLocalBalanceRows = (): LocalBalanceRow[] => {
    if (!xeroPreview) return [];
    return xeroPreview.glBalances.map((row) => ({
      account_code: String(row.account_code ?? "").trim(),
      period: row.period ?? xeroPreview.period,
      amount: Number(row.amount),
      currency: row.currency ?? "USD",
    }));
  };

  const handleSaveXeroPreviewLocally = () => {
    if (!xeroPreview) return;
    const rows = buildLocalBalanceRows();
    const headers = ["account_code", "period", "amount", "currency"];
    const now = Date.now();
    const uploadedFile: UploadedFile = {
      id: `xero-gl-balance-${now}`,
      name: `xero-trial-balance-gl-${xeroPreview.asOfDate}.csv`,
      type: "gl_balance",
      size: new Blob([JSON.stringify(rows)]).size,
      uploadedAt: now,
      rowCount: rows.length,
      columnCount: headers.length,
      headers,
      rows,
      accountingSystem: "xero",
      metadata: {
        period: xeroPreview.period,
        currency: "USD",
      },
    };

    setUploadedFile("gl_balance", uploadedFile);
    setReportingPeriodDefault(xeroPreview.period);
    setMaterialityThreshold(xeroRecommendedMateriality);
    setXeroSavedMessage(
      `Saved ${rows.length} rows as GL balance (local). Run defaults updated: period ${xeroPreview.period}, materiality $${xeroRecommendedMateriality}.`
    );
  };

  const handleDownloadXeroCsv = () => {
    if (!xeroPreview) return;
    const rows = xeroPreview.glBalances.map((row) => ({
      account_code: String(row.account_code ?? "").trim(),
      period: row.period ?? xeroPreview.period,
      debit: Number(row.debit ?? (row.amount > 0 ? Math.abs(row.amount) : 0)),
      credit: Number(row.credit ?? (row.amount < 0 ? Math.abs(row.amount) : 0)),
      net: Number(row.amount),
      currency: row.currency ?? "USD",
    }));
    const csvLines = [
      "account_code,period,debit,credit,net,currency",
      ...rows.map((row) =>
        [
          row.account_code.replaceAll('"', '""'),
          row.period.replaceAll('"', '""'),
          Number(row.debit).toFixed(2),
          Number(row.credit).toFixed(2),
          Number(row.net).toFixed(2),
          row.currency.replaceAll('"', '""'),
        ]
          .map((value) => `"${value}"`)
          .join(",")
      ),
    ];
    const csv = csvLines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `xero-trial-balance-${xeroPreview.asOfDate}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
  };

  const formatSignedAmount = (value: number) => {
    const abs = Math.abs(value);
    const formatted = abs.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return value < 0 ? `(${formatted})` : formatted;
  };
  const formatAmount = (value: number) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const handleModeChange = (mode: XeroMode) => {
    if (mode === selectedMode) return;
    if (mode === "mcp" && !xeroMcpEnabled) return;
    setSelectedMode(mode);
    window.localStorage.setItem("xeroIntegrationMode", mode);
    setXeroError(null);
    setXeroSavedMessage(null);
    setXeroPreview(null);
    setXeroReportsDiscovery(null);

    const params = new URLSearchParams(window.location.search);
    params.set("mode", mode);
    const query = params.toString();
    window.history.replaceState({}, "", query ? `?${query}` : window.location.pathname);
  };

  const handleSelectAsOfDatePreset = (
    preset: "today" | "month_end" | "prior_month_end" | "prior_year_end"
  ) => {
    if (preset === "today") {
      setXeroAsOfDate(xeroMaxAsOfDate);
      return;
    }
    if (preset === "month_end") {
      setXeroAsOfDate(clampIsoDateToMax(xeroMonthEndAsOfDate, xeroMaxAsOfDate));
      return;
    }
    if (preset === "prior_month_end") {
      setXeroAsOfDate(clampIsoDateToMax(xeroPriorMonthEndAsOfDate, xeroMaxAsOfDate));
      return;
    }
    setXeroAsOfDate(clampIsoDateToMax(xeroPriorYearEndAsOfDate, xeroMaxAsOfDate));
  };

  return (
    <div className="min-h-screen theme-bg">
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <header className="theme-card theme-border rounded-3xl border p-6">
          <div className="flex flex-col gap-2">
            <Link href="/" className="btn btn-secondary btn-sm w-fit">
              &larr; Back to console
            </Link>
            <h1 className="text-2xl font-bold theme-text sm:text-3xl">
              Xero Integration
            </h1>
            <p className="text-sm theme-text-muted">
              Connect your Xero tenant, pull trial balance, and save GL locally for reconciliation.
            </p>
          </div>
        </header>

        <section className="theme-card theme-border rounded-3xl border p-6">
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border theme-border theme-muted p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">
                  Pull Mode
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleModeChange("oauth")}
                    className={
                      selectedMode === "oauth"
                        ? "btn btn-secondary btn-sm"
                        : "btn btn-secondary btn-sm opacity-75"
                    }
                  >
                    API
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange("mcp")}
                    disabled={!xeroMcpEnabled}
                    className={
                      selectedMode === "mcp"
                        ? "btn btn-secondary btn-sm disabled:opacity-60"
                        : "btn btn-secondary btn-sm opacity-75 disabled:opacity-60"
                    }
                  >
                    MCP
                  </button>
                </div>
              </div>
              {!xeroMcpEnabled && (
                <p className="mt-2 text-xs theme-text-muted">
                  MCP is disabled in environment (`XERO_MCP_ENABLED=false`).
                </p>
              )}
            </div>

            {xeroModePending && (
              <div className="rounded-xl border theme-border theme-muted p-4 text-sm theme-text-muted">
                Checking Xero mode...
              </div>
            )}

            {!xeroModePending && !xeroCanUseWithoutAuth && (
              <div className="rounded-xl border theme-border theme-muted p-4 text-sm theme-text-muted">
                Sign in to connect Xero. Dev no-DB mode is currently disabled.
              </div>
            )}

            {!xeroModePending && xeroCanUseWithoutAuth && (
              <>
                {xeroError && (
                  <div className="alert alert-danger text-sm">{xeroError}</div>
                )}

                {xeroStatus?.devNoDbMode && !session?.user && (
                  <div className="rounded-xl border theme-border theme-muted p-4 text-xs theme-text-muted">
                    Dev no-DB mode is active. Xero tokens are stored in local dev storage.
                  </div>
                )}
                {xeroMcpModeActive && (
                  <div className="rounded-xl border theme-border theme-muted p-4 text-xs theme-text-muted">
                    MCP mode active. Trial balance pulls run through the Xero MCP server.
                  </div>
                )}

                {xeroLoading ? (
                  <div className="text-sm theme-text-muted">Checking Xero connection...</div>
                ) : (
                  <div className="rounded-xl border theme-border theme-muted p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold theme-text">
                          {xeroStatus?.connected ? "Connected" : "Not connected"}
                        </p>
                        <p className="mt-1 text-xs theme-text-muted">
                          {xeroStatus?.connected
                            ? xeroMcpModeActive
                              ? "Connected via Xero MCP server."
                              : `Tenant: ${xeroStatus.connection?.tenantName || xeroStatus.connection?.tenantId}`
                            : xeroStatus?.configured
                              ? "Xero credentials detected. Connect your tenant to import balances."
                              : "Set XERO_CLIENT_ID and XERO_CLIENT_SECRET to enable connection."}
                        </p>
                        {xeroMcpModeActive && xeroStatus?.mcp?.reason && !xeroStatus?.connected && (
                          <p className="mt-1 text-xs theme-text-muted">
                            {xeroStatus.mcp.reason}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <label className="flex items-center gap-2 text-xs theme-text-muted">
                          <span>As of date</span>
                          <input
                            type="date"
                            value={xeroAsOfDate}
                            max={xeroMaxAsOfDate}
                            onChange={(event) => setXeroAsOfDate(event.target.value)}
                            disabled={xeroBusy}
                            className="rounded-lg border theme-border theme-card px-2 py-1 text-xs theme-text"
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectAsOfDatePreset("today")}
                            disabled={xeroBusy}
                            className="btn btn-secondary btn-sm disabled:opacity-70"
                          >
                            Today
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAsOfDatePreset("month_end")}
                            disabled={xeroBusy}
                            className="btn btn-secondary btn-sm disabled:opacity-70"
                          >
                            Month-end
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAsOfDatePreset("prior_month_end")}
                            disabled={xeroBusy}
                            className="btn btn-secondary btn-sm disabled:opacity-70"
                          >
                            Prior month-end
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSelectAsOfDatePreset("prior_year_end")}
                            disabled={xeroBusy}
                            className="btn btn-secondary btn-sm disabled:opacity-70"
                          >
                            Prior year-end
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                        {!xeroStatus?.connected && xeroStatus?.configured && (
                          <a
                            href={`/api/integrations/xero/connect?mode=${encodeURIComponent(selectedMode)}`}
                            className="btn btn-primary btn-sm"
                          >
                            Connect Xero
                          </a>
                        )}
                        {xeroStatus?.connected && (
                          <>
                            <button
                              onClick={handleDiscoverXeroReports}
                              disabled={xeroBusy}
                              className="btn btn-secondary btn-sm disabled:opacity-70"
                            >
                              {xeroAction === "discover" ? "Discovering..." : "Discover Reports"}
                            </button>
                            <button
                              onClick={handlePullXeroTrialBalance}
                              disabled={xeroBusy}
                              className="btn btn-secondary btn-sm disabled:opacity-70"
                            >
                              {xeroAction === "pull"
                                ? "Pulling..."
                                : xeroMcpModeActive
                                  ? "Pull Trial Balance (MCP)"
                                  : "Pull Trial Balance"}
                            </button>
                            <button
                              onClick={handleDisconnectXero}
                              disabled={xeroBusy}
                              className="btn btn-danger btn-sm disabled:opacity-70"
                            >
                              {xeroAction === "disconnect"
                                ? xeroMcpModeActive
                                  ? "Logging out..."
                                  : "Disconnecting..."
                                : xeroMcpModeActive
                                  ? "Log out"
                                  : "Disconnect"}
                            </button>
                          </>
                        )}
                        </div>
                        {(xeroPullInProgress || xeroLastPullDurationMs !== null) && (
                          <p className="text-xs theme-text-muted">
                            {xeroPullInProgress
                              ? `Pull elapsed (${selectedMode.toUpperCase()}): ${formatElapsedDuration(xeroPullElapsedMs)}`
                              : `Last pull (${(xeroLastPullMode || selectedMode).toUpperCase()}): ${formatElapsedDuration(xeroLastPullDurationMs || 0)}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {xeroReportsDiscovery && (
                  <div className="rounded-xl border theme-border theme-muted p-4">
                    <p className="text-sm font-semibold theme-text">
                      Discovered Reports ({xeroReportsDiscovery.count})
                    </p>
                    <p className="mt-1 text-xs theme-text-muted">
                      Tenant: {xeroReportsDiscovery.tenant.name || xeroReportsDiscovery.tenant.id}
                    </p>
                    {xeroReportsDiscovery.diagnostics && (
                      <p className="mt-1 text-xs theme-text-muted">
                        List endpoint: {xeroReportsDiscovery.diagnostics.listCount}, probed endpoints:{" "}
                        {xeroReportsDiscovery.diagnostics.probedCount}/
                        {xeroReportsDiscovery.diagnostics.totalProbes}.
                      </p>
                    )}
                    {xeroReportsDiscovery.reports.length === 0 ? (
                      <p className="mt-2 text-xs theme-text-muted">
                        No reports returned. This can happen when `/Reports` is empty and probed
                        report endpoints are unavailable for the current connection.
                      </p>
                    ) : (
                      <div className="mt-3 overflow-x-auto rounded-lg border theme-border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="theme-muted">
                              <th className="px-3 py-2 text-left theme-text">Report Name</th>
                              <th className="px-3 py-2 text-left theme-text">Report ID</th>
                              <th className="px-3 py-2 text-left theme-text">Type</th>
                              <th className="px-3 py-2 text-left theme-text">Source</th>
                            </tr>
                          </thead>
                          <tbody>
                            {xeroReportsDiscovery.reports.map((report) => (
                              <tr key={`${report.id}-${report.name}`} className="border-t theme-border">
                                <td className="px-3 py-2 theme-text">{report.name}</td>
                                <td className="px-3 py-2 font-mono text-xs theme-text-muted">
                                  {report.id || "-"}
                                </td>
                                <td className="px-3 py-2 theme-text-muted">
                                  {report.type || "-"}
                                </td>
                                <td className="px-3 py-2 theme-text-muted">
                                  {report.source || "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {xeroPreview && (
                  <div className="rounded-xl border theme-border theme-muted p-4">
                    <p className="text-sm font-semibold theme-text">
                      Trial Balance Preview ({xeroPreview.period})
                    </p>
                    <p className="mt-1 text-xs theme-text-muted">
                      {xeroPreview.count} rows pulled as of {xeroPreview.asOfDate}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={handleSaveXeroPreviewLocally}
                        className="btn btn-secondary btn-sm"
                      >
                        Save as GL balance (local)
                      </button>
                      <button
                        onClick={handleDownloadXeroCsv}
                        className="btn btn-secondary btn-sm"
                      >
                        Download CSV
                      </button>
                      {xeroPreview.glBalances.length > 8 && (
                        <button
                          onClick={() => setShowAllXeroRows((prev) => !prev)}
                          className="btn btn-secondary btn-sm"
                        >
                          {showAllXeroRows
                            ? "Show first 8"
                            : `Show all ${xeroPreview.glBalances.length}`}
                        </button>
                      )}
                      <Link href="/" className="btn btn-secondary btn-sm">
                        Go to Upload
                      </Link>
                    </div>
                    {xeroSavedMessage && (
                      <div className="mt-3 rounded-lg border theme-border theme-card px-3 py-2 text-xs theme-text-muted">
                        {xeroSavedMessage}
                      </div>
                    )}
                    <p className="mt-2 text-xs theme-text-muted">
                      {showAllXeroRows
                        ? `Showing all ${xeroPreview.glBalances.length} rows`
                        : `Showing ${Math.min(8, xeroPreview.glBalances.length)} of ${xeroPreview.glBalances.length} rows`}
                    </p>
                    <p className="text-xs theme-text-muted">
                      Suggested run defaults from Xero: period {xeroPreview.period}, materiality ${xeroRecommendedMateriality}.
                    </p>
                    <p className="text-xs theme-text">
                      TB check: Debits {formatAmount(xeroTotals.debit)} - Credits{" "}
                      {formatAmount(xeroTotals.credit)} ={" "}
                      {formatSignedAmount(xeroTbDifference)}{" "}
                      ({xeroTbBalanced ? "BALANCED" : "OUT OF BALANCE"})
                    </p>
                    <div className="mt-3 overflow-x-auto rounded-lg border theme-border">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="theme-muted">
                            <th className="px-3 py-2 text-left theme-text">Account</th>
                            <th className="px-3 py-2 text-right theme-text">Debit YTD</th>
                            <th className="px-3 py-2 text-right theme-text">Credit YTD</th>
                            <th className="px-3 py-2 text-right theme-text">Balance</th>
                            <th className="px-3 py-2 text-left theme-text">Side</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(showAllXeroRows
                            ? xeroPreview.glBalances
                            : xeroPreview.glBalances.slice(0, 8)
                          ).map((row, idx) => (
                            <tr key={`${row.account_code}-${idx}`} className="border-t theme-border">
                              <td className="px-3 py-2 theme-text">{row.account_code}</td>
                              <td className="px-3 py-2 text-right theme-text">
                                {(row.debit ?? (row.amount > 0 ? Math.abs(row.amount) : 0)) > 0
                                  ? formatAmount(
                                      Number(
                                        row.debit ?? (row.amount > 0 ? Math.abs(row.amount) : 0)
                                      )
                                    )
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-right theme-text">
                                {(row.credit ?? (row.amount < 0 ? Math.abs(row.amount) : 0)) > 0
                                  ? formatAmount(
                                      Number(
                                        row.credit ?? (row.amount < 0 ? Math.abs(row.amount) : 0)
                                      )
                                    )
                                  : "-"}
                              </td>
                              <td className="px-3 py-2 text-right theme-text">
                                {formatSignedAmount(Number(row.amount))}
                              </td>
                              <td className="px-3 py-2 theme-text">
                                {row.balanceSide
                                  ? row.balanceSide.toUpperCase()
                                  : row.amount > 0
                                    ? "DEBIT"
                                    : row.amount < 0
                                      ? "CREDIT"
                                      : "ZERO"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 theme-border theme-muted font-semibold">
                            <td className="px-3 py-2 theme-text">Total (all pulled rows)</td>
                            <td className="px-3 py-2 text-right theme-text">
                              {xeroTotals.debit > 0 ? formatAmount(xeroTotals.debit) : "-"}
                            </td>
                            <td className="px-3 py-2 text-right theme-text">
                              {xeroTotals.credit > 0 ? formatAmount(xeroTotals.credit) : "-"}
                            </td>
                            <td className="px-3 py-2 text-right theme-text">
                              {formatSignedAmount(xeroTotals.net)}
                            </td>
                            <td className="px-3 py-2 theme-text">
                              {xeroTotals.net > 0
                                ? "DEBIT"
                                : xeroTotals.net < 0
                                  ? "CREDIT"
                                  : "BALANCED"}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <p className="mt-2 text-xs theme-text-muted">
                      Next step: upload your actual subledger file separately, then map both in the Upload step.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
