---
name: xero-api-mcp-generic
description: Generic Xero integration workflow for any project: API connect flow, MCP connect flow, report discovery, trial balance pull, and troubleshooting when report discovery returns zero results.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# Xero API + MCP (Generic)

Use this skill when working with Xero outside any specific app codebase.

## Scope

- API connect workflow (OAuth + tenant selection)
- MCP connect workflow (token or client credentials)
- Report discovery workflow
- Trial balance pull workflow
- Mode troubleshooting, especially `0 reports`

## Prerequisites

- Xero developer app created
- Required OAuth scopes:
  - `openid profile email`
  - `accounting.reports.read`
  - `offline_access`
- Tenant access granted for the authenticated user

## 1) API connect workflow

1. Build authorization URL and open it in browser.
2. User consents and receives `code` at redirect URI.
3. Exchange `code` for access/refresh token.
4. Call `GET https://api.xero.com/connections` with bearer token.
5. Store selected `tenantId` and refresh token safely.

### Token exchange (example)

```bash
curl -X POST "https://identity.xero.com/connect/token" \
  -H "Authorization: Basic <base64(client_id:client_secret)>" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=authorization_code" \
  --data-urlencode "code=<AUTH_CODE>" \
  --data-urlencode "redirect_uri=<REDIRECT_URI>"
```

### List tenant connections

```bash
curl "https://api.xero.com/connections" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## 2) MCP connect workflow

Use one of these options:

1. `XERO_MCP_CLIENT_BEARER_TOKEN` (recommended simple mode)
2. `XERO_MCP_CLIENT_ID` + `XERO_MCP_CLIENT_SECRET` (custom connection)
3. OAuth bridge token from your existing app/session

If MCP has direct credentials but no tenant-scoped OAuth context, some discovery operations can be limited.

## 3) Report discovery workflow

Primary endpoint:

```bash
curl "https://api.xero.com/api.xro/2.0/Reports" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Xero-tenant-id: <TENANT_ID>" \
  -H "Accept: application/json"
```

If this returns empty, probe known report endpoints directly.

### Common direct probes

- `Reports/TrialBalance?date=YYYY-MM-DD`
- `Reports/BalanceSheet?date=YYYY-MM-DD`
- `Reports/ProfitAndLoss?fromDate=YYYY-MM-01&toDate=YYYY-MM-DD`
- `Reports/AgedReceivablesByContact?date=YYYY-MM-DD`
- `Reports/AgedPayablesByContact?date=YYYY-MM-DD`

## 4) Trial balance pull flow

```bash
curl "https://api.xero.com/api.xro/2.0/Reports/TrialBalance?date=2026-03-31" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Xero-tenant-id: <TENANT_ID>" \
  -H "Accept: application/json"
```

Normalize output into:

- `account_code`
- `period` (`YYYY-MM`)
- `amount` (signed net)
- `currency`
- optional: `debit`, `credit`, `balanceSide`

## 5) Troubleshooting (`0 reports`)

If report discovery is empty:

1. Verify token is valid and not expired.
2. Verify tenant ID is correct (from `/connections`).
3. Verify `accounting.reports.read` scope is present.
4. Retry in direct API mode (faster, fewer translation layers).
5. Probe specific report endpoints instead of relying only on `/Reports`.
6. If using MCP direct credentials, test using OAuth tenant token to compare.

## Quick diagnostic checklist

- `/connections` returns expected tenant
- `/Reports/TrialBalance` returns 200 with rows
- `/Reports` may still be empty in some tenants
- API mode works while MCP mode fails: inspect MCP token source and scopes

## Guardrails

- Prefer API for deterministic pulls and performance.
- Use MCP for cross-tool orchestration or natural-language workflows.
- Cache tenant ID and refresh token securely.
- Never log secrets/tokens in plaintext.
