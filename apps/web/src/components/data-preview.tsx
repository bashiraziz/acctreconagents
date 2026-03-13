/**
 * Data preview component
 * Shows first few rows of transformed data
 */

"use client";

import React, { useMemo, useState } from "react";
import { useFileUploadStore } from "@/store/fileUploadStore";
import { validateReconciliationPayload } from "@/lib/validate-reconciliation";

type PreviewRow = Record<string, unknown>;

export function DataPreview() {
  const reconciliationData = useFileUploadStore(
    (state) => state.reconciliationData,
  );
  const [isVisible, setIsVisible] = useState(true);
  const validation = useMemo(
    () => validateReconciliationPayload(reconciliationData),
    [reconciliationData]
  );
  const validationIssues = validation.issues;
  const issueCounts = useMemo(() => {
    return validationIssues.reduce(
      (acc, issue) => {
        acc.total += 1;
        acc[issue.dataset] += 1;
        return acc;
      },
      { total: 0, glBalances: 0, subledgerBalances: 0, transactions: 0 }
    );
  }, [validationIssues]);

  if (!reconciliationData) {
    return (
      <div id="preview-data" className="ui-panel scroll-mt-6">
        <h3 className="ui-kicker">
          Data Preview
        </h3>
        <p className="mt-4 text-center ui-copy">
          Upload and map your files to see a preview
        </p>
      </div>
    );
  }

  return (
    <div id="preview-data" className="ui-panel scroll-mt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="ui-kicker">
            Data Preview
          </h3>
          <p className="ui-copy mt-2">
            Review transformed records before launching agent runs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          className="btn btn-secondary btn-sm"
        >
          {isVisible ? "Hide preview" : "Show preview"}
        </button>
      </div>

      {isVisible ? (
        <div className="mt-4 space-y-6">
        <div className="rounded-xl border theme-border theme-muted p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold theme-text">Validation preview</p>
              <p className="mt-1 text-xs theme-text-muted">
                Quick checks for missing required fields and invalid numbers before you run agents.
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                issueCounts.total === 0
                  ? "status-badge-ok"
                  : "status-badge-warn"
              }`}
            >
              {issueCounts.total === 0 ? "No issues" : `${issueCounts.total} issue${issueCounts.total === 1 ? "" : "s"}`}
            </span>
          </div>
          {issueCounts.total > 0 && (
            <div className="mt-3 space-y-2 text-xs theme-text-muted">
              <p>
                GL: {issueCounts.glBalances} | Subledger: {issueCounts.subledgerBalances} | Transactions: {issueCounts.transactions}
              </p>
              <ul className="list-disc pl-5">
                {validationIssues.slice(0, 10).map((issue, idx) => (
                  <li key={`${issue.dataset}-${issue.row}-${issue.field}-${idx}`}>
                    {issue.dataset} row {issue.row + 1} – {issue.field}: {issue.message}
                  </li>
                ))}
              </ul>
              {validationIssues.length > 10 && (
                <p className="text-xs theme-text-muted">
                  Showing first 10 issues. Fix these and re-apply mappings to recheck.
                </p>
              )}
            </div>
          )}
        </div>
        {/* GL Balances */}
        {reconciliationData.glBalances && reconciliationData.glBalances.length > 0 && (
          <PreviewTable
            title="GL Balances"
            data={reconciliationData.glBalances.slice(0, 50)}
            totalRows={reconciliationData.glBalances.length}
          />
        )}

        {/* Subledger Balances */}
        {reconciliationData.subledgerBalances &&
          reconciliationData.subledgerBalances.length > 0 && (
            <PreviewTable
              title="Subledger Balances"
              data={reconciliationData.subledgerBalances.slice(0, 50)}
              totalRows={reconciliationData.subledgerBalances.length}
            />
          )}

        {/* Transactions — accordion grouped by account */}
        {reconciliationData.transactions &&
          reconciliationData.transactions.length > 0 && (
            <TransactionAccordion
              title="Transactions"
              data={reconciliationData.transactions}
              totalRows={reconciliationData.transactions.length}
              groupByColumn="account_code"
            />
          )}

        {/* Summary */}
        <div className="rounded-xl border theme-border theme-muted p-4">
          <p className="text-sm font-semibold theme-text">Ready to reconcile</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs theme-text-muted">
            <span>
              {reconciliationData.glBalances.length} GL balance{reconciliationData.glBalances.length !== 1 ? "s" : ""}
            </span>
            <span>|</span>
            <span>
              {reconciliationData.subledgerBalances.length} subledger balance{reconciliationData.subledgerBalances.length !== 1 ? "s" : ""}
            </span>
            {reconciliationData.transactions && reconciliationData.transactions.length > 0 && (
              <>
                <span>|</span>
                <span>
                  {reconciliationData.transactions.length} transaction{reconciliationData.transactions.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
            {reconciliationData.orderedPeriods && reconciliationData.orderedPeriods.length > 0 && (
              <>
                <span>|</span>
                <span>
                  {reconciliationData.orderedPeriods.length} period{reconciliationData.orderedPeriods.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      ) : (
        <div className="mt-4 rounded-xl border theme-border theme-muted p-4 text-sm theme-text">
          <p className="font-semibold">Preview hidden</p>
          <p className="mt-1 theme-text-muted">
            Click "Show preview" to review the transformed records.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Flat preview table (GL, Subledger) ──────────────────────────────────────

function PreviewTable({
  title,
  data,
  totalRows,
}: {
  title: string;
  data: PreviewRow[];
  totalRows: number;
}) {
  if (data.length === 0) return null;
  const columns = Object.keys(data[0]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold theme-text">{title}</h4>
        <span className="text-xs theme-text-muted">
          Showing {data.length} of {totalRows} rows
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border theme-border">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="border-b theme-border theme-muted">
              {columns.map((col) => (
                <th key={col} className="px-4 py-2 text-left font-semibold theme-text">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                className="border-b theme-border last:border-0 hover:theme-muted"
              >
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 theme-text">
                    {formatCellValue(row[col])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Accordion table for Transactions ────────────────────────────────────────

function TransactionAccordion({
  title,
  data,
  totalRows,
  groupByColumn,
}: {
  title: string;
  data: PreviewRow[];
  totalRows: number;
  groupByColumn: string;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, PreviewRow[]>();
    for (const row of data) {
      const key = String(row[groupByColumn] ?? "");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [data, groupByColumn]);

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const allExpanded = expanded.size === groups.length;

  const toggleAll = () => {
    setExpanded(allExpanded ? new Set() : new Set(groups.map(([k]) => k)));
  };

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const columns = data.length > 0
    ? Object.keys(data[0]).filter((c) => c !== groupByColumn)
    : [];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold theme-text">{title}</h4>
        <div className="flex items-center gap-3">
          <span className="text-xs theme-text-muted">
            {groups.length} account{groups.length !== 1 ? "s" : ""} · {totalRows} row{totalRows !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={toggleAll}
            className="btn btn-secondary btn-sm"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border theme-border overflow-hidden">
        {groups.map(([accountKey, rows], groupIdx) => {
          const isOpen = expanded.has(accountKey);
          const accountName = rows[0]?.account_name as string | undefined;
          const total = rows.reduce((sum, r) => {
            const amt = r.amount;
            return sum + (typeof amt === "number" ? amt : 0);
          }, 0);
          const hasAmount = rows.some((r) => typeof r.amount === "number");

          return (
            <div key={accountKey} className={groupIdx > 0 ? "border-t theme-border" : ""}>
              {/* Account header — click to toggle */}
              <button
                type="button"
                onClick={() => toggle(accountKey)}
                className="w-full flex items-center justify-between px-4 py-3 theme-muted hover:theme-card text-left transition"
                aria-expanded={isOpen}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold theme-text">{accountKey}</span>
                  {accountName && (
                    <span className="text-sm theme-text-muted">{accountName}</span>
                  )}
                  <span className="badge badge-neutral text-xs">
                    {rows.length} row{rows.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                  {hasAmount && (
                    <span className="text-sm font-semibold theme-text tabular-nums">
                      {formatCellValue(total)}
                    </span>
                  )}
                  <span className="text-xs theme-text-muted" aria-hidden="true">
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>
              </button>

              {/* Expanded rows */}
              {isOpen && (
                <div className="overflow-x-auto border-t theme-border">
                  <table className="w-full min-w-max text-sm">
                    <thead>
                      <tr className="border-b theme-border theme-muted">
                        {columns.map((col) => (
                          <th key={col} className="px-4 py-2 text-left text-xs font-semibold theme-text">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr key={i} className="border-b theme-border last:border-0 hover:theme-muted">
                          {columns.map((col) => (
                            <td key={col} className="px-4 py-2 theme-text">
                              {formatCellValue(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "number") {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
