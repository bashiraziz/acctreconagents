# Codex Brief: Xero AR/AP Subledger Endpoint + UI Panel

## Overview

Add Aged Receivables (AR) and Aged Payables (AP) subledger data from Xero's
report API. This gives users a structured subledger from Xero without needing
to export and upload a CSV manually.

Deliverables:
1. `src/lib/xero-aged.ts` — fetch and normalise aged receivables/payables
2. `src/app/api/integrations/xero/data/subledger/route.ts` — API route
3. `src/lib/integrations/provider-registry.ts` — add `subledger` capability
4. `src/app/integrations/xero/page.tsx` — UI panel (Pull Subledger)

---

## Xero API background

Both reports use the same endpoint pattern:

```
GET /api.xro/2.0/Reports/AgedReceivablesByContact?date=YYYY-MM-DD
GET /api.xro/2.0/Reports/AgedPayablesByContact?date=YYYY-MM-DD
```

Required headers: `Authorization: Bearer {token}`, `Xero-tenant-id: {tenantId}`

Response structure (same as other Xero reports — nested Rows with Sections):

```
Reports[0].Rows[]
  RowType: "Header"  → column labels
  RowType: "Section" → group (e.g. contact name)
    Rows[]
      RowType: "Row"   → one contact's aging buckets
  RowType: "SummaryRow" → totals (skip)
```

Typical column order (varies by Xero org locale):
`Contact | Due Date | Current | 1-30 Days | 31-60 Days | 61-90 Days | Older | Total`

The column positions are not guaranteed — detect them from the Header row.

Scope required: `accounting.reports.read` — **already in the OAuth flow**.

---

## Normalised subledger schema

```ts
export type XeroNormalizedSubledgerRow = {
  contact_name: string;     // counterparty name
  due_date: string | null;  // ISO date or null if not present
  current: number;          // not yet due
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  older: number;            // 90+ days
  total: number;            // sum of all buckets
  period: string;           // YYYY-MM from as-of date
  as_of_date: string;       // YYYY-MM-DD
  type: "ar" | "ap";
};
```

---

## File A — `src/lib/xero-aged.ts`

### Types

```ts
export type XeroAgedReportResponse = {
  Reports: Array<{
    ReportTitles?: string[];
    ReportDate?: string;
    Rows?: unknown[];
  }>;
};

export type XeroAgedReportType = "ar" | "ap";
export type XeroNormalizedSubledgerRow = { ... }; // as above
```

### `fetchXeroAgedReport`

```ts
export async function fetchXeroAgedReport(
  accessToken: string,
  tenantId: string,
  type: XeroAgedReportType,
  asOfDate: string   // YYYY-MM-DD
): Promise<XeroAgedReportResponse>
```

- `type === "ar"` → `Reports/AgedReceivablesByContact?date={asOfDate}`
- `type === "ap"` → `Reports/AgedPayablesByContact?date={asOfDate}`
- Throws on non-2xx with status code in message.

### `normalizeXeroAgedReport`

```ts
export function normalizeXeroAgedReport(
  payload: XeroAgedReportResponse,
  type: XeroAgedReportType,
  asOfDate: string
): XeroNormalizedSubledgerRow[]
```

Algorithm:
1. Find the `Header` row — extract cell labels to detect column indexes.
2. Map label → index for: `contact`, `due_date`, `current`, `1-30`, `31-60`,
   `61-90`, `older`, `total`. Use case-insensitive partial match:
   - contact: `"contact"`
   - due_date: `"due date"` or `"due"`
   - current: `"current"`
   - days_1_30: `"1-30"` or `"1 - 30"`
   - days_31_60: `"31-60"` or `"31 - 60"`
   - days_61_90: `"61-90"` or `"61 - 90"`
   - older: `"older"` or `"90+"`
   - total: `"total"`
3. Walk all `Row` type rows (skip `Header`, `Section`, `SummaryRow`).
4. For each row, extract `contact_name` from cell[contactIdx].
   Skip rows where contact_name is empty.
5. Parse numeric cells using `toNumber` (handle `""`, `null`, parentheses for
   negatives). Treat empty as 0.
6. Return one `XeroNormalizedSubledgerRow` per data row.

### `toNumber` (private helper)

Same pattern as in `xero.ts` — handle `""` → 0, `"(1234.56)"` → -1234.56,
strip commas, parse with `Number()`.

---

## File B — `src/app/api/integrations/xero/data/subledger/route.ts`

### Pattern

Mirror `trial-balance/route.ts` exactly for auth, token refresh, dev-no-db,
and org scope.

### Query parameters

| Param | Required | Values | Default |
|---|---|---|---|
| `type` | Yes | `ar` or `ap` | — (400 if missing) |
| `date` | No | `YYYY-MM-DD` | today (UTC) |

Validation:
- `type` must be `"ar"` or `"ap"` — return 400 otherwise.
- `date` must match `/^\d{4}-\d{2}-\d{2}$/` — return 400 otherwise.

### Response shape

```json
{
  "connected": true,
  "mode": "oauth",
  "tenant": { "id": "...", "name": "..." },
  "organizationId": "...",
  "type": "ar",
  "asOfDate": "2026-02-28",
  "period": "2026-02",
  "rows": [ ...XeroNormalizedSubledgerRow[] ],
  "count": 45,
  "totalOutstanding": 123456.78
}
```

`totalOutstanding` = `rows.reduce((sum, r) => sum + r.total, 0)`.

### No MCP path

Return 400 with message:
`"Subledger reports are not available in MCP mode. Use mode=oauth."`

### Token refresh + markSynced

Same as trial-balance route — use `getValidDbXeroAccessToken` from
`xero-session.ts`, call `markIntegrationConnectionSynced` after successful
fetch.

---

## File C — `src/lib/integrations/provider-registry.ts`

Add `subledger` capability to `IntegrationProvider` type:

```ts
subledger: {
  fetch: (
    accessToken: string,
    tenantId: string,
    type: XeroAgedReportType,
    asOfDate: string
  ) => Promise<XeroAgedReportResponse>;
  normalize: (
    payload: XeroAgedReportResponse,
    type: XeroAgedReportType,
    asOfDate: string
  ) => XeroNormalizedSubledgerRow[];
};
```

Wire in `xeroProvider`:

```ts
subledger: {
  fetch: fetchXeroAgedReport,
  normalize: normalizeXeroAgedReport,
},
```

Import from `@/lib/xero-aged`.

---

## File D — UI additions to `src/app/integrations/xero/page.tsx`

### New types

```ts
type XeroSubledgerPreview = {
  type: "ar" | "ap";
  asOfDate: string;
  period: string;
  count: number;
  totalOutstanding: number;
  rows: XeroNormalizedSubledgerRow[];
};
```

### New state

```ts
const [subledgerType, setSubledgerType] = useState<"ar" | "ap">("ar");
const [subledgerAsOfDate, setSubledgerAsOfDate] = useState<string>(getTodayLocalIsoDate);
const [subledgerPreview, setSubledgerPreview] = useState<XeroSubledgerPreview | null>(null);
const [showAllSubledgerRows, setShowAllSubledgerRows] = useState(false);
const [subledgerSavedMessage, setSubledgerSavedMessage] = useState<string | null>(null);
```

Extend `XeroAction`:

```ts
type XeroAction = "idle" | "pull" | "disconnect" | "discover" | "pull-txn" | "pull-subledger";
```

### `handlePullSubledger` handler

```ts
const handlePullSubledger = async () => {
  setXeroAction("pull-subledger");
  setXeroError(null);
  setSubledgerSavedMessage(null);
  try {
    const params = new URLSearchParams({ type: subledgerType, date: subledgerAsOfDate });
    const response = await fetch(`/api/integrations/xero/data/subledger?${params}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(getApiErrorMessage(data, "Failed to pull subledger from Xero"));
    }
    setSubledgerPreview(data as XeroSubledgerPreview);
    setShowAllSubledgerRows(false);
  } catch (err) {
    setXeroError(err instanceof Error ? err.message : "Failed to pull subledger from Xero");
  } finally {
    setXeroAction("idle");
  }
};
```

### `handleSaveSubledgerLocally` handler

Save to file upload store as type `"subledger_balance"`:

```ts
const handleSaveSubledgerLocally = () => {
  if (!subledgerPreview) return;
  const headers = [
    "contact_name", "due_date", "current",
    "days_1_30", "days_31_60", "days_61_90", "older", "total",
    "period", "as_of_date", "type",
  ];
  const now = Date.now();
  const label = subledgerPreview.type === "ar" ? "AR" : "AP";
  const uploadedFile: UploadedFile = {
    id: `xero-subledger-${subledgerPreview.type}-${now}`,
    name: `xero-${subledgerPreview.type}-aged-${subledgerPreview.asOfDate}.csv`,
    type: "subledger_balance",
    size: new Blob([JSON.stringify(subledgerPreview.rows)]).size,
    uploadedAt: now,
    rowCount: subledgerPreview.count,
    columnCount: headers.length,
    headers,
    rows: subledgerPreview.rows,
    accountingSystem: "xero",
    metadata: { asOfDate: subledgerPreview.asOfDate, subledgerType: subledgerPreview.type },
  };
  setUploadedFile("subledger_balance", uploadedFile);
  setSubledgerSavedMessage(
    `Saved ${subledgerPreview.count} ${label} contacts as subledger balance (local). Total outstanding: ${formatAmount(subledgerPreview.totalOutstanding)}.`
  );
};
```

### `handleDownloadSubledgerCsv` handler

Same CSV download pattern as transactions — header row + data rows, all cells
double-quoted, numeric values `toFixed(2)`.

### UI panel JSX

Add after the transactions panel, inside the `xeroStatus?.connected` guard:

```tsx
{/* Subledger Panel */}
{xeroStatus?.connected && (
  <div className="rounded-xl border theme-border theme-muted p-4">
    <p className="text-sm font-semibold theme-text">Pull Subledger (AR / AP Aging)</p>
    <p className="mt-1 text-xs theme-text-muted">
      Fetches Aged Receivables or Aged Payables from Xero as a structured
      subledger. OAuth mode only.
    </p>

    <div className="mt-3 flex flex-wrap items-end gap-3">
      {/* AR / AP toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSubledgerType("ar")}
          disabled={xeroBusy}
          className={subledgerType === "ar" ? "btn btn-secondary btn-sm" : "btn btn-secondary btn-sm opacity-75"}
        >
          AR
        </button>
        <button
          type="button"
          onClick={() => setSubledgerType("ap")}
          disabled={xeroBusy}
          className={subledgerType === "ap" ? "btn btn-secondary btn-sm" : "btn btn-secondary btn-sm opacity-75"}
        >
          AP
        </button>
      </div>

      <label className="flex flex-col gap-1 text-xs theme-text-muted">
        <span>As of date</span>
        <input
          type="date"
          value={subledgerAsOfDate}
          max={getTodayLocalIsoDate()}
          onChange={(e) => setSubledgerAsOfDate(e.target.value)}
          disabled={xeroBusy}
          className="rounded-lg border theme-border theme-card px-2 py-1 text-xs theme-text"
        />
      </label>

      <button
        onClick={handlePullSubledger}
        disabled={xeroBusy}
        className="btn btn-secondary btn-sm disabled:opacity-70"
      >
        {xeroAction === "pull-subledger"
          ? "Pulling..."
          : `Pull ${subledgerType.toUpperCase()} Aging`}
      </button>
    </div>

    {subledgerPreview && (
      <div className="mt-4">
        <p className="text-xs theme-text-muted">
          {subledgerPreview.count} contacts — as of {subledgerPreview.asOfDate} —
          total outstanding: {formatAmount(subledgerPreview.totalOutstanding)}
        </p>

        <div className="mt-2 flex flex-wrap gap-2">
          <button onClick={handleSaveSubledgerLocally} className="btn btn-secondary btn-sm">
            Save as subledger balance (local)
          </button>
          <button onClick={handleDownloadSubledgerCsv} className="btn btn-secondary btn-sm">
            Download CSV
          </button>
          {subledgerPreview.rows.length > 8 && (
            <button
              onClick={() => setShowAllSubledgerRows((prev) => !prev)}
              className="btn btn-secondary btn-sm"
            >
              {showAllSubledgerRows ? "Show first 8" : `Show all ${subledgerPreview.count}`}
            </button>
          )}
        </div>

        {subledgerSavedMessage && (
          <div className="mt-2 rounded-lg border theme-border theme-card px-3 py-2 text-xs theme-text-muted">
            {subledgerSavedMessage}
          </div>
        )}

        <div className="mt-3 overflow-x-auto rounded-lg border theme-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="theme-muted">
                <th className="px-3 py-2 text-left theme-text">Contact</th>
                <th className="px-3 py-2 text-right theme-text">Current</th>
                <th className="px-3 py-2 text-right theme-text">1-30</th>
                <th className="px-3 py-2 text-right theme-text">31-60</th>
                <th className="px-3 py-2 text-right theme-text">61-90</th>
                <th className="px-3 py-2 text-right theme-text">Older</th>
                <th className="px-3 py-2 text-right theme-text">Total</th>
              </tr>
            </thead>
            <tbody>
              {(showAllSubledgerRows
                ? subledgerPreview.rows
                : subledgerPreview.rows.slice(0, 8)
              ).map((row, idx) => (
                <tr key={`${row.contact_name}-${idx}`} className="border-t theme-border">
                  <td className="px-3 py-2 theme-text max-w-[180px] truncate">
                    {row.contact_name}
                  </td>
                  <td className="px-3 py-2 text-right theme-text">
                    {row.current !== 0 ? formatAmount(row.current) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right theme-text">
                    {row.days_1_30 !== 0 ? formatAmount(row.days_1_30) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right theme-text">
                    {row.days_31_60 !== 0 ? formatAmount(row.days_31_60) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right theme-text">
                    {row.days_61_90 !== 0 ? formatAmount(row.days_61_90) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right theme-text">
                    {row.older !== 0 ? formatAmount(row.older) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold theme-text">
                    {formatAmount(row.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-xs theme-text-muted">
          Showing {showAllSubledgerRows ? subledgerPreview.count : Math.min(8, subledgerPreview.count)} of{" "}
          {subledgerPreview.count} contacts.
        </p>
      </div>
    )}
  </div>
)}
```

---

## Files to create

```
src/lib/xero-aged.ts
src/app/api/integrations/xero/data/subledger/route.ts
```

## Files to modify

```
src/lib/integrations/provider-registry.ts   (add subledger capability)
src/app/integrations/xero/page.tsx          (add UI panel + state + handlers)
```

---

## Acceptance criteria

1. `GET /api/integrations/xero/data/subledger?type=ar&date=2026-02-28` returns
   normalised AR aging rows.
2. `GET /api/integrations/xero/data/subledger?type=ap&date=2026-02-28` returns
   normalised AP aging rows.
3. Missing or invalid `type` returns 400.
4. `mode=mcp` returns 400 with descriptive message.
5. Column detection works even if Xero returns columns in a different order.
6. Rows where `contact_name` is empty are skipped.
7. UI shows AR/AP toggle, date picker, pull button, and preview table.
8. "Save as subledger balance (local)" stores data in the file upload store
   as type `"subledger_balance"`.
9. "Download CSV" produces a correctly formatted CSV.
10. `totalOutstanding` in the response equals the sum of all `total` values.
11. Token refresh is handled automatically (same as trial-balance route).

---

## Out of scope

- Aged reports broken down by invoice (contact-level summary is sufficient)
- Overdue highlighting in the UI (future enhancement)
- MCP path for subledger reports
