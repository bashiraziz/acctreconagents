# Xero MCP: Not Viable on Vercel Serverless

## The Problem

The Xero MCP integration works by spawning a child process on the server using `StdioClientTransport`:

```typescript
const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@xeroapi/xero-mcp-server@latest"],
  env: buildMcpChildEnv(bearerTokenOverride),
  stderr: "pipe",
});
```

Every MCP pull attempt tries to:
1. Run `npx` to download `@xeroapi/xero-mcp-server` from npm
2. Start it as a long-running stdio process
3. Communicate with it via stdin/stdout

**Vercel serverless functions cannot do this:**
- No persistent filesystem — `npx` has nowhere to cache the downloaded package
- No long-lived processes — functions are stateless (spin up, respond, shut down)
- Execution time limits — downloading + starting an npm package easily exceeds them

**Result:** MCP pulls return no data on Vercel, even though `XERO_MCP_ENABLED=true` is set.

**Locally:** Works fine because the machine has a real filesystem, persistent npm cache, and can run child processes.

## The Fix (implemented)

`getXeroMcpConfig()` in `apps/web/src/lib/xero-mcp.ts` checks `process.env.VERCEL`, which Vercel automatically injects as `"1"` in all serverless environments:

```typescript
const viable = !process.env.VERCEL;

return {
  enabled: enabled && viable,  // forced false on Vercel
  viable,
  ...
};
```

The `viable` flag is returned in the status API response (`/api/integrations/xero/status`) under `mcp.viable`.

The UI (`apps/web/src/app/integrations/xero/page.tsx`) reads `xeroMcpViable` and:
- Hides the MCP toggle button entirely when `viable = false`
- Auto-resets `selectedMode` to `"oauth"` if MCP was previously selected

This means the MCP option is only visible when running locally — where it actually works.

## Symptoms That Led to This Discovery

- `XERO_MCP_ENABLED=true` was set in Vercel environment variables
- MCP toggle appeared to be enabled but pulling TB returned no data
- No error was shown — the pull simply returned empty results
- The same flow worked perfectly on local dev

## Future Path (if MCP on Vercel is ever needed)

The only viable approach would be to run the MCP server as a **persistent sidecar**:
- A Docker container or long-running Node.js process deployed alongside the app
- Connect to it over a **network transport** instead of stdio
- This is a significant infrastructure change — not worth it while the direct Xero API mode works perfectly

An alternative being explored by the Xero team and community is a **Vercel MCP Adapter** that wraps MCP servers as HTTP endpoints, but this is not yet mature enough for production use.

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/xero-mcp.ts` | `getXeroMcpConfig()` — `viable` field, `enabled && viable` logic |
| `apps/web/src/app/api/integrations/xero/status/route.ts` | Exposes `mcp.viable` in the status API response |
| `apps/web/src/app/integrations/xero/page.tsx` | `xeroMcpViable` derived state, conditional MCP button render |
