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

export default function XeroIntegrationPage() {
  const { data: session, isPending } = useSession();
  const [xeroStatus, setXeroStatus] = useState<XeroStatus | null>(null);
  const [xeroLoading, setXeroLoading] = useState(false);
  const [xeroBusy, setXeroBusy] = useState(false);
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
  const xeroCanUseWithoutAuth = Boolean(session?.user) || xeroDevModeActive;
  const xeroModePending = !session?.user && xeroStatus === null && xeroLoading;
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

  const loadXeroStatus = useCallback(async () => {
    setXeroLoading(true);
    setXeroError(null);
    try {
      const response = await fetch("/api/integrations/xero/status");
      const data = await response.json();
      if (response.status === 401) {
        setXeroStatus({
          configured: false,
          connected: false,
          devNoDbMode: false,
          requiresAuth: true,
          connection: null,
        });
        return;
      }
      if (!response.ok) {
        throw new Error(data?.message ?? "Failed to load Xero connection status");
      }
      setXeroStatus(data as XeroStatus);
    } catch (err) {
      setXeroError(err instanceof Error ? err.message : "Failed to load Xero status");
    } finally {
      setXeroLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isPending) return;
    void loadXeroStatus();
  }, [isPending, session?.user, loadXeroStatus]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
  }, [loadXeroStatus]);

  const handleDisconnectXero = async () => {
    setXeroBusy(true);
    setXeroError(null);
    setXeroSavedMessage(null);
    try {
      const response = await fetch("/api/integrations/xero/connection", {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Failed to disconnect Xero");
      }
      setXeroPreview(null);
      setShowAllXeroRows(false);
      await loadXeroStatus();
    } catch (err) {
      setXeroError(err instanceof Error ? err.message : "Failed to disconnect Xero");
    } finally {
      setXeroBusy(false);
    }
  };

  const handlePullXeroTrialBalance = async () => {
    setXeroBusy(true);
    setXeroError(null);
    setXeroSavedMessage(null);
    try {
      const response = await fetch("/api/integrations/xero/data/trial-balance");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message ?? "Failed to pull trial balance from Xero");
      }
      setXeroPreview(data as XeroTrialBalancePreview);
      setShowAllXeroRows(false);
      await loadXeroStatus();
    } catch (err) {
      setXeroError(
        err instanceof Error ? err.message : "Failed to pull trial balance from Xero"
      );
    } finally {
      setXeroBusy(false);
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
                            ? `Tenant: ${xeroStatus.connection?.tenantName || xeroStatus.connection?.tenantId}`
                            : xeroStatus?.configured
                              ? "Xero credentials detected. Connect your tenant to import balances."
                              : "Set XERO_CLIENT_ID and XERO_CLIENT_SECRET to enable connection."}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {!xeroStatus?.connected && xeroStatus?.configured && (
                          <a
                            href="/api/integrations/xero/connect"
                            className="btn btn-primary btn-sm"
                          >
                            Connect Xero
                          </a>
                        )}
                        {xeroStatus?.connected && (
                          <>
                            <button
                              onClick={handlePullXeroTrialBalance}
                              disabled={xeroBusy}
                              className="btn btn-secondary btn-sm disabled:opacity-70"
                            >
                              {xeroBusy ? "Pulling..." : "Pull Trial Balance"}
                            </button>
                            <button
                              onClick={handleDisconnectXero}
                              disabled={xeroBusy}
                              className="btn btn-danger btn-sm disabled:opacity-70"
                            >
                              Disconnect
                            </button>
                          </>
                        )}
                      </div>
                    </div>
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
