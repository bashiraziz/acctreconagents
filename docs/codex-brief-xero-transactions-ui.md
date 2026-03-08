# Codex Brief: Xero Transactions UI Panel

## Overview

Add a **Pull Transactions** section to the existing Xero integration page
(`src/app/integrations/xero/page.tsx`). The panel follows the exact same
pattern as the existing trial balance pull — date controls, a pull button,
a preview table, save-locally and download-CSV actions.

## Target file

`src/app/integrations/xero/page.tsx` — client component, single file.

---

## What to add

### 1. New state variables

Add alongside the existing xeroPreview/xeroAction state:

```ts
type XeroTransactionPreview = {
  fromDate: string;
  toDate: string;
  count: number;
  pagesFetched: number;
  transactions: Array<{
    journal_id: string;
    journal_number: number;
    date: string;
    period: string;
    account_code: string;
    account_name: string;
    description: string;
    reference: string;
    net_amount: number;
    gross_amount: number;
    source_type: string;
  }>;
};
```

State hooks to add:

```ts
const [txnFromDate, setTxnFromDate] = useState<string>(firstDayOfCurrentMonth);
const [txnToDate, setTxnToDate] = useState<string>(getTodayLocalIsoDate);
const [txnPreview, setTxnPreview] = useState<XeroTransactionPreview | null>(null);
const [showAllTxnRows, setShowAllTxnRows] = useState(false);
const [txnSavedMessage, setTxnSavedMessage] = useState<string | null>(null);
```

Extend the existing `XeroAction` type:

```ts
type XeroAction = "idle" | "pull" | "disconnect" | "discover" | "pull-txn";
```

### 2. `firstDayOfCurrentMonth` helper

Add alongside `getTodayLocalIsoDate`:

```ts
function firstDayOfCurrentMonth(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}
```

### 3. `handlePullXeroTransactions` handler

```ts
const handlePullXeroTransactions = async () => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(txnFromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(txnToDate)) {
    setXeroError("Invalid date range. Use YYYY-MM-DD.");
    return;
  }
  if (txnFromDate > txnToDate) {
    setXeroError("From date must be on or before To date.");
    return;
  }

  setXeroAction("pull-txn");
  setXeroError(null);
  setTxnSavedMessage(null);

  try {
    const params = new URLSearchParams({ fromDate: txnFromDate, toDate: txnToDate });
    const response = await fetch(`/api/integrations/xero/data/transactions?${params}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiErrorMessage(data, "Failed to pull transactions from Xero"));
    }
    setTxnPreview(data as XeroTransactionPreview);
    setShowAllTxnRows(false);
  } catch (err) {
    setXeroError(err instanceof Error ? err.message : "Failed to pull transactions from Xero");
  } finally {
    setXeroAction("idle");
  }
};
```

### 4. `handleSaveTxnLocally` handler

Saves transactions to the file upload store as type `"transactions"`, matching
the same pattern as `handleSaveXeroPreviewLocally` for the trial balance.

```ts
const handleSaveTxnLocally = () => {
  if (!txnPreview) return;
  const headers = [
    "journal_id", "journal_number", "date", "period",
    "account_code", "account_name", "description",
    "reference", "net_amount", "gross_amount", "source_type",
  ];
  const now = Date.now();
  const uploadedFile: UploadedFile = {
    id: `xero-transactions-${now}`,
    name: `xero-transactions-${txnPreview.fromDate}-to-${txnPreview.toDate}.csv`,
    type: "transactions",
    size: new Blob([JSON.stringify(txnPreview.transactions)]).size,
    uploadedAt: now,
    rowCount: txnPreview.count,
    columnCount: headers.length,
    headers,
    rows: txnPreview.transactions,
    accountingSystem: "xero",
    metadata: { fromDate: txnPreview.fromDate, toDate: txnPreview.toDate },
  };
  setUploadedFile("transactions", uploadedFile);
  setTxnSavedMessage(
    `Saved ${txnPreview.count} journal lines as transactions (local).`
  );
};
```

### 5. `handleDownloadTxnCsv` handler

```ts
const handleDownloadTxnCsv = () => {
  if (!txnPreview) return;
  const header = "journal_id,journal_number,date,period,account_code,account_name,description,reference,net_amount,gross_amount,source_type";
  const lines = txnPreview.transactions.map((row) =>
    [
      row.journal_id,
      row.journal_number,
      row.date,
      row.period,
      row.account_code,
      row.account_name,
      row.description,
      row.reference,
      row.net_amount.toFixed(2),
      row.gross_amount.toFixed(2),
      row.source_type,
    ]
      .map((v) => `"${String(v ?? "").replaceAll('"', '""')}"`)
      .join(",")
  );
  const csv = [header, ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `xero-transactions-${txnPreview.fromDate}-to-${txnPreview.toDate}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(url);
};
```

---

## 6. UI section to add (JSX)

Add this section **after** the existing `xeroPreview` block and **before** the
closing `</>` of the `xeroCanUseWithoutAuth` conditional, inside the
`xeroStatus?.connected` guard.

```tsx
{/* Transactions Panel */}
{xeroStatus?.connected && (
  <div className="rounded-xl border theme-border theme-muted p-4">
    <p className="text-sm font-semibold theme-text">Pull Transactions</p>
    <p className="mt-1 text-xs theme-text-muted">
      Fetches all journal line postings from Xero for a date range.
      OAuth mode only.
    </p>

    <div className="mt-3 flex flex-wrap items-end gap-3">
      <label className="flex flex-col gap-1 text-xs theme-text-muted">
        <span>From</span>
        <input
          type="date"
          value={txnFromDate}
          max={getTodayLocalIsoDate()}
          onChange={(e) => setTxnFromDate(e.target.value)}
          disabled={xeroBusy}
          className="rounded-lg border theme-border theme-card px-2 py-1 text-xs theme-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs theme-text-muted">
        <span>To</span>
        <input
          type="date"
          value={txnToDate}
          max={getTodayLocalIsoDate()}
          onChange={(e) => setTxnToDate(e.target.value)}
          disabled={xeroBusy}
          className="rounded-lg border theme-border theme-card px-2 py-1 text-xs theme-text"
        />
      </label>
      <button
        onClick={handlePullXeroTransactions}
        disabled={xeroBusy}
        className="btn btn-secondary btn-sm disabled:opacity-70"
      >
        {xeroAction === "pull-txn" ? "Pulling..." : "Pull Transactions"}
      </button>
    </div>

    {txnPreview && (
      <div className="mt-4">
        <p className="text-xs theme-text-muted">
          {txnPreview.count} journal lines — {txnPreview.fromDate} to{" "}
          {txnPreview.toDate} ({txnPreview.pagesFetched} page
          {txnPreview.pagesFetched !== 1 ? "s" : ""} fetched)
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <button
            onClick={handleSaveTxnLocally}
            className="btn btn-secondary btn-sm"
          >
            Save as transactions (local)
          </button>
          <button
            onClick={handleDownloadTxnCsv}
            className="btn btn-secondary btn-sm"
          >
            Download CSV
          </button>
          {txnPreview.transactions.length > 8 && (
            <button
              onClick={() => setShowAllTxnRows((prev) => !prev)}
              className="btn btn-secondary btn-sm"
            >
              {showAllTxnRows
                ? "Show first 8"
                : `Show all ${txnPreview.count}`}
            </button>
          )}
        </div>

        {txnSavedMessage && (
          <div className="mt-2 rounded-lg border theme-border theme-card px-3 py-2 text-xs theme-text-muted">
            {txnSavedMessage}
          </div>
        )}

        <div className="mt-3 overflow-x-auto rounded-lg border theme-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="theme-muted">
                <th className="px-3 py-2 text-left theme-text">Date</th>
                <th className="px-3 py-2 text-left theme-text">Account</th>
                <th className="px-3 py-2 text-left theme-text">Description</th>
                <th className="px-3 py-2 text-left theme-text">Reference</th>
                <th className="px-3 py-2 text-right theme-text">Net Amount</th>
                <th className="px-3 py-2 text-left theme-text">Type</th>
              </tr>
            </thead>
            <tbody>
              {(showAllTxnRows
                ? txnPreview.transactions
                : txnPreview.transactions.slice(0, 8)
              ).map((row, idx) => (
                <tr
                  key={`${row.journal_id}-${row.account_code}-${idx}`}
                  className="border-t theme-border"
                >
                  <td className="px-3 py-2 theme-text-muted whitespace-nowrap">
                    {row.date}
                  </td>
                  <td className="px-3 py-2 font-mono theme-text">
                    {row.account_code}
                  </td>
                  <td className="px-3 py-2 theme-text-muted max-w-[200px] truncate">
                    {row.description || "-"}
                  </td>
                  <td className="px-3 py-2 theme-text-muted">
                    {row.reference || "-"}
                  </td>
                  <td className="px-3 py-2 text-right theme-text">
                    {formatSignedAmount(row.net_amount)}
                  </td>
                  <td className="px-3 py-2 theme-text-muted">
                    {row.source_type || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-xs theme-text-muted">
          Showing {showAllTxnRows ? txnPreview.count : Math.min(8, txnPreview.count)} of{" "}
          {txnPreview.count} rows.
        </p>
      </div>
    )}
  </div>
)}
```

---

## Placement in the file

The new section sits between the existing `xeroPreview` block (trial balance
results) and the closing `</>` of the `xeroCanUseWithoutAuth &&` block.
The connected guard ensures it only renders when Xero is connected.

---

## Acceptance criteria

1. "Pull Transactions" panel appears on the Xero integration page when connected.
2. Date range defaults to first of current month → today.
3. `fromDate > toDate` shows an inline error (uses existing `setXeroError`).
4. Successful pull shows row count, pages fetched, and a preview table (first 8 rows).
5. "Show all / Show first 8" toggle works.
6. "Save as transactions (local)" stores data in the file upload store as type `"transactions"`.
7. "Download CSV" produces a correctly formatted CSV file.
8. The pull button is disabled while any other Xero action is in progress.
9. MCP mode does not affect this panel (transactions are OAuth-only; the API
   route already returns a 400 for mode=mcp).
10. No new files created — changes are contained to `xero/page.tsx`.
