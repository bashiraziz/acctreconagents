/**
 * Data preview component
 * Shows first few rows of transformed data
 */

"use client";

import { useReconciliationStore } from "@/store/reconciliationStore";
import type { ReconciliationPayload } from "@/types/reconciliation";

export function DataPreview() {
  const reconciliationData = useReconciliationStore(
    (state) => state.reconciliationData,
  );

  if (!reconciliationData) {
    return (
      <div className="border border-gray-200 bg-white p-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
          Data Preview
        </h3>
        <p className="mt-4 text-center text-sm text-gray-700">
          Upload and map your files to see a preview
        </p>
      </div>
    );
  }

  return (
    <div className="border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700">
        Data Preview
      </h3>

      <div className="mt-4 space-y-6">
        {/* GL Balances */}
        {reconciliationData.glBalances && reconciliationData.glBalances.length > 0 && (
          <PreviewTable
            title="GL Balances"
            data={reconciliationData.glBalances.slice(0, 5)}
            totalRows={reconciliationData.glBalances.length}
          />
        )}

        {/* Subledger Balances */}
        {reconciliationData.subledgerBalances &&
          reconciliationData.subledgerBalances.length > 0 && (
            <PreviewTable
              title="Subledger Balances"
              data={reconciliationData.subledgerBalances.slice(0, 5)}
              totalRows={reconciliationData.subledgerBalances.length}
            />
          )}

        {/* Transactions */}
        {reconciliationData.transactions &&
          reconciliationData.transactions.length > 0 && (
            <PreviewTable
              title="Transactions"
              data={reconciliationData.transactions.slice(0, 5)}
              totalRows={reconciliationData.transactions.length}
            />
          )}

        {/* Summary */}
        <div className="rounded border border-gray-300 bg-gray-50 p-4">
          <p className="text-sm font-semibold text-gray-900">Ready to reconcile</p>
          <div className="mt-2 flex flex-wrap gap-4 text-xs text-gray-700">
            <span>
              {reconciliationData.glBalances.length} GL balance{reconciliationData.glBalances.length !== 1 ? "s" : ""}
            </span>
            <span>•</span>
            <span>
              {reconciliationData.subledgerBalances.length} subledger balance{reconciliationData.subledgerBalances.length !== 1 ? "s" : ""}
            </span>
            {reconciliationData.transactions && reconciliationData.transactions.length > 0 && (
              <>
                <span>•</span>
                <span>
                  {reconciliationData.transactions.length} transaction{reconciliationData.transactions.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
            {reconciliationData.orderedPeriods && reconciliationData.orderedPeriods.length > 0 && (
              <>
                <span>•</span>
                <span>
                  {reconciliationData.orderedPeriods.length} period{reconciliationData.orderedPeriods.length !== 1 ? "s" : ""}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewTable({
  title,
  data,
  totalRows,
}: {
  title: string;
  data: any[];
  totalRows: number;
}) {
  if (data.length === 0) {
    return null;
  }

  const columns = Object.keys(data[0]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <span className="text-xs text-gray-700">
          Showing {data.length} of {totalRows} rows
        </span>
      </div>

      <div className="overflow-x-auto rounded border border-gray-300">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-300 bg-gray-50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-2 text-left font-semibold text-gray-900"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                className="border-b border-gray-200 last:border-0 hover:bg-gray-50"
              >
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 text-gray-900">
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

function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "number") {
    // Format numbers with commas and 2 decimal places
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
