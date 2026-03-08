# Codex Brief: Xero Transactions Endpoint

## Overview

Add a transactions data route that fetches journal-level postings from Xero's
`/Journals` API and returns them normalised to the app's standard transaction
schema. This completes the three-part data layer (trial balance + transactions +
subledger) required for GL reconciliation.

## Target app

`apps/web` (Next.js 16, TypeScript)

---

## Background: why `/Journals`

Xero exposes several transaction endpoints. `/Journals` is the correct one for
GL reconciliation because it returns every double-entry posting line across all
accounts — account code, amount, date, source transaction reference, and
description. Other endpoints (`BankTransactions`, `Invoices`, `Payments`) are
subsets; Journals includes all of them.

Key API constraints:
- Returns **max 100 journals per page** — must paginate with `offset`
- No server-side date filter on `/Journals` directly; filter client-side by
  `JournalDate`
- Each `Journal` has multiple `JournalLines` (one per account touched)
- Requires scope `accounting.transactions.read` — **already in the OAuth flow**

---

## Normalised transaction schema

Each journal line maps to one `XeroNormalizedTransaction`:

```ts
type XeroNormalizedTransaction = {
  journal_id: string;        // Xero JournalID (idempotency key)
  journal_number: number;    // Xero JournalNumber
  date: string;              // ISO date YYYY-MM-DD
  period: string;            // YYYY-MM derived from date
  account_code: string;      // AccountCode from JournalLine
  account_name: string;      // AccountName from JournalLine
  description: string;       // Narration or SourceType
  reference: string;         // SourceType + SourceID reference
  net_amount: number;        // NetAmount from JournalLine (signed)
  gross_amount: number;      // GrossAmount (may equal net if no tax)
  source_type: string;       // e.g. "ACCREC", "ACCPAY", "MANJOURNAL"
};
```

---

## Files to create

```
src/
  lib/
    xero-journals.ts         # A: fetch + normalise journals
  app/api/integrations/xero/data/
    transactions/route.ts    # B: Next.js API route
```

## Files to modify

| File | Change |
|---|---|
| `src/lib/xero.ts` | No change — journals logic goes in `xero-journals.ts` |
| `src/lib/integrations/provider-registry.ts` | C: add `transactions` capability to `IntegrationProvider` type and xeroProvider |

---

## A — `src/lib/xero-journals.ts`

### Types

```ts
export type XeroJournalLine = {
  JournalLineID: string;
  AccountID: string;
  AccountCode: string;
  AccountName: string;
  AccountType: string;
  NetAmount: number;
  GrossAmount: number;
  TaxAmount: number;
  TaxType?: string;
  TaxName?: string;
  Description?: string;
};

export type XeroJournal = {
  JournalID: string;
  JournalDate: string;       // "/Date(1234567890000+0000)/"
  JournalNumber: number;
  CreatedDateUTC: string;
  Reference?: string;
  SourceID?: string;
  SourceType?: string;
  Narration?: string;
  JournalLines: XeroJournalLine[];
};

export type XeroJournalsResponse = {
  Journals: XeroJournal[];
};

export type XeroNormalizedTransaction = {
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
};
```

### `fetchXeroJournalsPage`

Fetch a single page of journals. Pagination is offset-based.

```ts
export async function fetchXeroJournalsPage(
  accessToken: string,
  tenantId: string,
  offset: number
): Promise<XeroJournalsResponse>
```

Endpoint: `GET https://api.xero.com/api.xro/2.0/Journals?offset={offset}`

Headers:
- `Authorization: Bearer {accessToken}`
- `Xero-tenant-id: {tenantId}`
- `Accept: application/json`

Throws on non-2xx. Returns parsed JSON cast to `XeroJournalsResponse`.

### `fetchXeroJournals`

Paginate through all journals, optionally filtered to a date window.

```ts
export async function fetchXeroJournals(
  accessToken: string,
  tenantId: string,
  options: {
    fromDate?: string;   // YYYY-MM-DD inclusive
    toDate?: string;     // YYYY-MM-DD inclusive
    maxPages?: number;   // safety cap, default 50 (= 5,000 journals)
  }
): Promise<XeroJournal[]>
```

Algorithm:
1. Start `offset = 0`.
2. Call `fetchXeroJournalsPage` with current offset.
3. If response contains 0 journals, stop.
4. Accumulate journals.
5. Increment `offset` by 100, repeat until empty page or `maxPages` reached.
6. If `fromDate` or `toDate` supplied, filter accumulated results by
   `parsedDate >= fromDate && parsedDate <= toDate`.

### `parseXeroDate`

Xero dates come as `/Date(1234567890000+0000)/`. Parse to `YYYY-MM-DD`.

```ts
function parseXeroDate(raw: string): string
```

Extract the epoch milliseconds from the pattern, construct a `Date`, return
`.toISOString().slice(0, 10)`.

### `normalizeXeroJournals`

Flatten journals into one row per `JournalLine`.

```ts
export function normalizeXeroJournals(
  journals: XeroJournal[]
): XeroNormalizedTransaction[]
```

Rules:
- Skip journal lines where `AccountCode` is empty.
- `date` = `parseXeroDate(journal.JournalDate)`
- `period` = `date.slice(0, 7)` (YYYY-MM)
- `description` = `line.Description || journal.Narration || ""`
- `reference` = `[journal.SourceType, journal.SourceID].filter(Boolean).join("-")` or `""`
- `source_type` = `journal.SourceType ?? ""`

---

## B — `src/app/api/integrations/xero/data/transactions/route.ts`

### Pattern

Mirror the structure of `trial-balance/route.ts` exactly:
- Same auth pattern (`getValidAccessToken` via provider registry)
- Same dev-no-db fallback
- Same `resolveOrganizationScope`
- Same token refresh + `markIntegrationConnectionSynced`

### Query parameters

| Param | Required | Format | Default |
|---|---|---|---|
| `fromDate` | No | `YYYY-MM-DD` | first day of current month |
| `toDate` | No | `YYYY-MM-DD` | today |
| `maxPages` | No | integer 1–200 | 50 |

Validate: `fromDate <= toDate`. Reject if range exceeds 366 days (prevent
accidental full-history pulls).

### Response shape

```json
{
  "connected": true,
  "mode": "oauth",
  "tenant": { "id": "...", "name": "..." },
  "organizationId": "...",
  "fromDate": "2026-02-01",
  "toDate": "2026-02-28",
  "transactions": [ ...XeroNormalizedTransaction[] ],
  "count": 142,
  "pagesFetched": 2
}
```

### No MCP path

The Xero MCP server does not expose raw journal lines. This route is
**OAuth only**. If `mode=mcp` is requested, return a clear error:

```json
{ "error": "Transactions are not available in MCP mode. Use mode=oauth." }
```

---

## C — `src/lib/integrations/provider-registry.ts`

Add a `transactions` capability to `IntegrationProvider`:

```ts
transactions: {
  fetch: (
    accessToken: string,
    tenantId: string,
    options: { fromDate?: string; toDate?: string; maxPages?: number }
  ) => Promise<XeroJournal[]>;
  normalize: (journals: XeroJournal[]) => XeroNormalizedTransaction[];
};
```

Wire in `xeroProvider`:

```ts
transactions: {
  fetch: fetchXeroJournals,
  normalize: normalizeXeroJournals,
},
```

Import `fetchXeroJournals`, `normalizeXeroJournals`, `XeroJournal`,
`XeroNormalizedTransaction` from `@/lib/xero-journals`.

---

## Rate limit awareness

Xero allows 60 API calls/minute per app across all users. Each page of journals
is one call. A `maxPages=50` pull = 50 calls. If multiple users pull
simultaneously this could hit the limit.

Add a response header `X-Pages-Fetched: {n}` so the client can surface this.
Do not add retry logic in this brief — that is a separate concern.

---

## Acceptance criteria

1. `GET /api/integrations/xero/data/transactions?fromDate=2026-02-01&toDate=2026-02-28`
   returns a list of normalised journal lines for the authenticated user's Xero org.
2. Pagination fetches all pages until empty (up to `maxPages`).
3. Xero `/Date(...)` timestamps are correctly converted to `YYYY-MM-DD`.
4. Journal lines with no `AccountCode` are excluded.
5. Token refresh is handled automatically (same as trial-balance route).
6. `mode=mcp` returns a descriptive 400 error.
7. `fromDate > toDate` returns a 400 error.
8. Date range > 366 days returns a 400 error.
9. `provider-registry.ts` exports the `transactions` capability and all existing
   tests continue to pass.

---

## Out of scope

- UI to display transactions (separate ticket)
- Caching / deduplication of journal pages
- MCP path for transactions
- `BankTransactions`, `Invoices`, `Payments` endpoints (different reconciliation
  use cases — separate briefs if needed)
