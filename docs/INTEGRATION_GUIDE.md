# Integration Guide

Rowshni works with **any accounting system** via file upload (CSV, TSV, TXT, Excel). Direct API integrations are optional connectors that let users pull data without manually exporting files.

This guide explains how to build a direct integration for your accounting system, using the Xero integration as the reference implementation.

---

## Architecture Overview

```
Accounting System API
        ↓
  /api/integrations/{system}/          ← your API routes
        ↓
  /integrations/{system}/page.tsx      ← your UI page
        ↓
  useFileUploadStore (Zustand)          ← shared with manual upload path
        ↓
  Column Mapper → Orchestrator          ← generic, system-agnostic
```

The integration's only job is to fetch data from the external system and deposit it into the same Zustand store that file uploads use. Everything downstream (column mapping, reconciliation engine, AI agents) is system-agnostic.

---

## What You Need to Build

### 1. API Routes (`apps/web/src/app/api/integrations/{system}/`)

| Route | Purpose |
|-------|---------|
| `connect/route.ts` | Initiates OAuth or API key auth flow |
| `callback/route.ts` | Handles OAuth redirect, stores tokens |
| `status/route.ts` | Returns connection status and tenant info |
| `data/trial-balance/route.ts` | Fetches GL trial balance, returns `BalanceRow[]` |
| `data/transactions/route.ts` | Fetches journal lines, returns `TransactionRow[]` |

Only implement the routes your system supports. Trial balance is the minimum useful integration.

### 2. UI Page (`apps/web/src/app/integrations/{system}/page.tsx`)

A single page that:
- Shows connection status (connected / disconnected)
- Lets the user connect/disconnect
- Lets the user pull trial balance (with date selector)
- Lets the user pull transactions (with date range)
- Calls `useFileUploadStore.setFile()` to deposit data into the upload pipeline

### 3. Register on the Integrations Index

Add your integration to the `integrations` array in:
```
apps/web/src/app/integrations/page.tsx
```

---

## Data Contracts

### Trial Balance → GL Balance

Your trial balance route must return data that maps to:

```typescript
type BalanceRow = {
  account_code: string;   // e.g. "1200"
  account_name?: string;  // e.g. "Accounts Receivable"
  period: string;         // YYYY-MM, e.g. "2026-02"
  amount: number;         // signed net amount
  currency?: string;      // e.g. "USD"
};
```

### Transactions → Journal Lines

```typescript
type TransactionRow = {
  account_code: string;
  booked_at: string;      // ISO date string
  amount?: number;        // signed net, OR use debit/credit
  debit?: number;
  credit?: number;
  narrative?: string;     // description / memo
  source_period?: string; // YYYY-MM override for period
  metadata?: Record<string, string>; // any extra fields
};
```

### Depositing into the Upload Store

```typescript
import { useFileUploadStore } from "@/store/fileUploadStore";

const setFile = useFileUploadStore.getState().setFile;

const uploadedFile: UploadedFile = {
  id: `{system}-gl-balance-${Date.now()}`,
  name: `{system}-trial-balance-${period}.csv`,
  type: "gl_balance",           // or "subledger_balance" / "transactions"
  size: 0,
  uploadedAt: Date.now(),
  rowCount: rows.length,
  columnCount: headers.length,
  headers,
  rows,
  accountingSystem: "{system}", // matches your system identifier
  metadata: { period, currency: "USD" },
};

setFile("gl_balance", uploadedFile);
```

---

## Reference Implementation: Xero

The Xero integration is the canonical example. Study these files:

| File | What it shows |
|------|--------------|
| `apps/web/src/app/api/integrations/xero/connect/route.ts` | OAuth initiation, PKCE, state parameter |
| `apps/web/src/app/api/integrations/xero/callback/route.ts` | Token exchange, storing connection in DB |
| `apps/web/src/app/api/integrations/xero/status/route.ts` | Connection status response shape |
| `apps/web/src/app/api/integrations/xero/data/trial-balance/route.ts` | Fetching and normalising TB data |
| `apps/web/src/app/api/integrations/xero/data/transactions/route.ts` | Fetching journal lines with pagination |
| `apps/web/src/lib/xero.ts` | Xero API client, token refresh logic |
| `apps/web/src/app/integrations/xero/page.tsx` | Full UI: connect, pull TB, pull transactions, save locally |

---

## Token Storage

The Xero integration stores OAuth tokens in PostgreSQL via Better Auth's database connection. You can use the same `xero_connections` table pattern or add your own table.

If you are building a no-DB integration (API key based), you can store credentials in the session or environment variables for single-tenant deployments.

---

## File-Only Integration (Simpler Alternative)

If your system supports CSV/Excel export but not a public API, you don't need to build API routes at all. Instead:

1. Add a specialized parser in `apps/web/src/lib/parsers/` following the pattern of `xero-parser.ts`, `quickbooks-parser.ts`, etc.
2. Register it in `apps/web/src/lib/parseFile.ts`
3. Add it to the accounting system dropdown in the upload zone

This gives users auto-detection and correct parsing without any OAuth flow.

---

## Adding to the Integrations Page

Once your integration is ready, add it to `apps/web/src/app/integrations/page.tsx`:

```typescript
const integrations = [
  {
    id: "xero",
    name: "Xero",
    description: "...",
    status: "available",
    href: "/integrations/xero",
  },
  // Add your entry here:
  {
    id: "quickbooks",
    name: "QuickBooks Online",
    description: "Pull GL and transactions via Intuit OAuth.",
    status: "available",
    href: "/integrations/quickbooks",
  },
];
```

---

## Questions / Contributions

- Open an issue: https://github.com/bashiraziz/acctreconagents/issues
- See also: `docs/XERO_MCP_VERCEL_LIMITATION.md` for notes on serverless constraints
