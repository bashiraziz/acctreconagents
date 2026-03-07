---
name: xero-api-mcp-reports
description: Connect to Xero using API or MCP mode, pull trial balance, and discover report lists through this project's existing integration routes. Use when validating Xero connectivity, switching between API/MCP, listing reports, or troubleshooting empty report discovery results.
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# Xero API + MCP + Report Discovery

Use this skill to operate the existing Xero integration in this repository without inventing new endpoints.

## Use this skill when

- You need to connect Xero in API mode.
- You need to connect Xero in MCP mode.
- You need to discover available Xero reports.
- You need to compare API vs MCP behavior and performance.
- You need to troubleshoot `0 reports` results.

## Routes to use (project-specific)

- Status: `/api/integrations/xero/status?mode=oauth|mcp`
- Connect: `/api/integrations/xero/connect?mode=oauth|mcp`
- Disconnect: `/api/integrations/xero/connection` (DELETE)
- Trial balance: `/api/integrations/xero/data/trial-balance?mode=oauth|mcp&date=YYYY-MM-DD`
- Discover reports: `/api/integrations/xero/data/reports?mode=oauth|mcp`

## Standard workflow

1. Check status with selected mode.
2. If not connected, start connect flow for that mode.
3. Run report discovery.
4. If discovery is empty, inspect diagnostics and retry in API mode.
5. Pull trial balance for the required `as of` date.

## Commands (local dev)

```bash
# 1) Check mode status
curl "http://localhost:3100/api/integrations/xero/status?mode=oauth"
curl "http://localhost:3100/api/integrations/xero/status?mode=mcp"

# 2) Trigger connect flow (open in browser preferred)
start http://localhost:3100/api/integrations/xero/connect?mode=oauth
start http://localhost:3100/api/integrations/xero/connect?mode=mcp

# 3) Discover reports
curl "http://localhost:3100/api/integrations/xero/data/reports?mode=oauth"
curl "http://localhost:3100/api/integrations/xero/data/reports?mode=mcp"

# 4) Pull TB
curl "http://localhost:3100/api/integrations/xero/data/trial-balance?mode=oauth&date=2026-03-31"
```

## Interpreting report discovery output

The response includes:

- `count`: total discovered reports
- `reports[]`: `id`, `name`, `type`, `source`
- `diagnostics.listCount`: reports returned by `/Reports`
- `diagnostics.probedCount`: reports found by probing known report endpoints
- `diagnostics.totalProbes`: how many endpoints were probed

If `count=0`:

1. Confirm tenant connection in status endpoint.
2. Retry `mode=oauth` (usually most reliable for discovery).
3. If in MCP direct-credential mode, connect via app OAuth first.

## Mapping guidance (for reconciliation flow)

Use TB response rows to map into reconciliation shape:

- `account_code`
- `period`
- `amount`
- `currency`
- optional: `debit`, `credit`, `balanceSide`

For local import/save, ensure `period` is set and numeric values are normalized to 2 decimals.

## Guardrails

- Prefer API mode for speed and determinism.
- Use MCP mode for cross-tool testing, not as first-line discovery.
- In dev, keep `XERO_DEV_NO_DB=true` for no-migration testing.
- Do not add new auth flows if existing routes can satisfy the task.
