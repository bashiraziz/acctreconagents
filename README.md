# Rowshni ✨

### Shedding Light on Your Ledger

**Rowshni** (meaning "light") is an AI-powered reconciliation platform that illuminates variances, detects errors, and brings clarity to your month-end close. Built with Next.js, Fastify, and multi-agent AI (OpenAI/Claude/Gemini), Rowshni transforms complex GL-to-subledger reconciliation into an intelligent, automated workflow.

**🌟 Key Features:**
- ✨ **AI-Powered Variance Detection** - Four specialized agents illuminate hidden discrepancies
- 💡 **Intelligent Analysis** - Multi-agent pipeline validates, analyzes, investigates, and reports
- 📊 **Multi-Period Support** - Roll-forward schedules with period-over-period tracking
- ⚡ **Fast & Free** - Uses Gemini 2.0 Flash (free tier: 1500 runs/day, $0 per reconciliation)
- 🎯 **Audit-Ready Reports** - Professional documentation with AI-generated insights

## 📘 Documentation

- **[User Guide](USER_GUIDE.md)** - For accountants and end users performing reconciliations
- **[Developer README](#repository-structure)** (below) - For developers setting up and extending the system
- **[Data Dictionary](specs/data-dictionary.md)** - Field definitions and formats
- **[Reconciliation Logic](specs/reconciliation-logic.md)** - Algorithm documentation
- **[Xero Lab Workflow](docs/XERO_LAB_WORKFLOW.md)** - Safe spike branch + worktree flow for Xero experiments

## Repository structure

```
apps/
  web/                 # Next.js 15 App Router app (ChatKit UI, uploads, mapping, console)
services/
  orchestrator/        # Fastify service coordinating OpenAI Agents, Claude Skills, Gemini
skills/                # Claude skills for system-specific parsing and automation
  quickbooks-parser/   # QuickBooks CSV parser (parenthetical accounts, US dates)
  costpoint-parser/    # Costpoint CSV parser (debit/credit, sign conventions)
  netsuite-parser/     # NetSuite CSV parser (multi-currency, dimensional data)
  pdf-to-csv-extractor/# PDF financial report to CSV conversion
  recon-scenario-builder/ # Test scenario generation tool
  better-auth-nextjs/  # Better Auth authentication skill (also available as public plugin)
specs/
  reconciliation...    # Spec-Kit definition for canonical models + workflows
data/
  scenarios/           # Test scenarios (10 comprehensive reconciliation cases)
tests/
  scenario-runner.ts   # Automated test framework using Claude skills
spec-kit.config.json   # CLI hook for Spec-Kit tooling
package.json           # Root scripts (Spec-Kit check)
.env.sample            # Shared environment variable template
```

### Frontend (apps/web)
* **Next.js 16** App Router with Tailwind CSS and custom dark/light themes
* **File Upload System** - Drag-and-drop support for GL, subledger, and transaction files
* **Intelligent Column Mapping** - Auto-detects and maps CSV columns to canonical schema
* **Live Data Preview** - See transformed data before running reconciliation
* **AI Agent Console** - Real-time progress tracking through 4-agent pipeline
* **Organization Settings** - Manage multiple orgs, set default, and select per run
* **Org Defaults** - Per-organization materiality and prompt defaults applied on run
* **Report Headers** - Organization, Reporting Period, Report Generated On
* **Report Viewer** - Markdown rendered in the UI with copy/MD/TXT export
* **Simple Mode** - Optional low-contrast UI for reduced visual noise
* **Xero OAuth (Optional)** - Connect a Xero tenant and pull trial balance data directly
* **Rate Limiting** - Built-in protection (30/hour, 50/2hours, 70/3hours in anonymous mode)
* **Data Storage** - Browser localStorage for column mappings and workflow state
* **Deployment** - Optimized for Vercel with environment-based configuration

### Backend (services/orchestrator)
* **Fastify service** exposing RESTful API for reconciliation workflows
* **Multi-Agent Pipeline:**
  1. **Data Validation Agent** - Validates data quality and completeness
  2. **Reconciliation Analyst** - Analyzes variances and patterns
  3. **Variance Investigator** - Investigates material discrepancies
  4. **Report Generator** - Creates audit-ready documentation
* **AI Integrations:**
  * Gemini 2.0 Flash (primary - free tier)
  * OpenAI Agents SDK (optional)
  * Anthropic Claude (optional)
* **Claude Skills** - System-specific CSV parsers for accounting platforms:
  * QuickBooks Parser - Handles parenthetical accounts, comma-formatted numbers
  * Costpoint Parser - Processes debit/credit columns with sign convention handling
  * NetSuite Parser - Multi-currency and dimensional data aggregation
  * PDF-to-CSV Extractor - Converts PDF financial reports to reconciliation-ready CSV
  * Scenario Builder - Creates comprehensive test scenarios with documentation
* **Spec-Kit Validation** - Ensures data conforms to canonical schema
* **TypeScript** with full type safety and schema validation

### Claude Skills (skills/)
* **System-specific CSV parsers** that understand accounting system formats
* **Automatically integrated** into the test framework via dynamic imports
* **Parser selection logic:**
  * Scenario name contains "quickbooks" → QuickBooks Parser
  * Scenario name contains "costpoint" → Costpoint Parser
  * Scenario name contains "netsuite" → NetSuite Parser
  * Otherwise → Legacy universal parser
* **Each skill includes:**
  * `skill.json` - Metadata and capability documentation
  * `parse.ts` - TypeScript parser implementation with type safety
  * Test scripts for validation
  * Comprehensive documentation (README, implementation summaries, test results)
* **See:** `skills/README.md` for architecture and `skills/QUICK_REFERENCE.md` for usage guide

#### 🔌 Reusable Claude Code Skill: Better Auth for Next.js

During this project's development, we created a **production-ready Better Auth implementation skill** for Next.js 16 that avoids common bundling pitfalls. This skill has been packaged as a **public Claude Code plugin** for the community.

**📦 GitHub Repository:** [bashiraziz/claude-better-auth-skill](https://github.com/bashiraziz/claude-better-auth-skill)

**Features:**
- ✅ Email/password authentication with Better Auth
- ✅ Social auth (Google, GitHub) ready
- ✅ Works with Next.js 16 + Turbopack (uses `pg` adapter, not Kysely/Prisma)
- ✅ PostgreSQL/Neon database setup
- ✅ Complete implementation guide with troubleshooting

This skill can be used by Claude Code to implement Better Auth authentication similar to what's used in Rowshni's web app. Install it in any Next.js project via the Claude Code CLI or use it in claude.ai web conversations.

### Spec-Kit contracts
* `specs/reconciliation.speckit.json` documents actors, canonical data models, agent tool contracts, and workflows.
* `spec-kit.config.json` makes it easy to run `npm run spec:check` to ensure required tools are configured (git, agent CLIs, etc.).
* The Next.js app imports the spec JSON directly to generate UI metadata, so schema updates propagate automatically.

## Prerequisites
* Node.js 20+ (needed for ChatKit + Spec-Kit CLI).
* npm (repo uses npm workspaces manually; we haven’t declared workspace features yet).
* Accounts and API keys for:
  * OpenAI (Agents SDK + ChatKit).
  * Anthropic Claude (subagents/skills).
  * Gemini (Google Generative AI API).
  * Optional: storage target for uploads if you don’t want them kept on disk.

## Setup
1. Clone this repo and install dependencies.
   ```bash
   git clone <repo>
   cd acctreconagents
   npm install          # installs root dev deps (Spec-Kit CLI) + ChatKit type helpers
   cd apps/web && npm install
   cd ../../services/orchestrator && npm install
   ```
2. Copy `.env.sample` to `.env` (root) and fill in the keys you want shared.
3. For local dev, create `apps/web/.env.local` and `services/orchestrator/.env` with the following variables as needed:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Required for orchestrator (OpenAI Agents + ChatKit). |
| `ANTHROPIC_API_KEY` or `CLAUDE_API_KEY` | Enables Claude Skills subagents. |
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | **Recommended:** Enables Gemini AI analysis (free tier available). Get your key at [ai.google.dev/gemini-api](https://ai.google.dev/gemini-api/docs/api-key). Using your own key avoids shared quota limits and enables unlimited analysis. |
| `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` | Workflow ID from Agent Builder (`wf_...`) used by the ChatKit widget. |
| `ORCHESTRATOR_URL` | Next.js uses this to reach the orchestrator service (default `http://localhost:4100`). |
| `MATERIALITY_THRESHOLD` | Variance threshold (in account currency) used by the reconciler. |
| `XERO_CLIENT_ID` | Enables Xero OAuth connect flow in Settings. |
| `XERO_CLIENT_SECRET` | Secret for Xero OAuth token exchange/refresh. |
| `XERO_REDIRECT_URI` | Optional override for callback URI (default: `${BETTER_AUTH_URL}/api/integrations/xero/callback`). |
| `XERO_DEV_NO_DB` | Dev-only no-database Xero mode. Set `true` to test Xero without sign-in/DB migrations; tokens are stored in-memory and reset on restart. |
| `XERO_MCP_ENABLED` | Optional: set `true` to pull trial balance via Xero MCP server instead of OAuth routes. |
| `XERO_MCP_COMMAND` | Optional MCP command (default `npx`). |
| `XERO_MCP_ARGS` | Optional MCP args (default `-y,@xeroapi/xero-mcp-server@latest`). |
| `XERO_MCP_CLIENT_ID`, `XERO_MCP_CLIENT_SECRET` | Optional MCP-scoped credentials (fallback to `XERO_CLIENT_ID`/`XERO_CLIENT_SECRET`). |
| `XERO_MCP_CLIENT_BEARER_TOKEN` | Optional bearer token for MCP server auth mode. |

## Development workflow
1. **Run the orchestrator service**
   ```bash
   cd services/orchestrator
   npm run dev
   # Fastify listens on PORT (default 4100)
   ```
2. **Run the Next.js app**
   ```bash
   cd apps/web
   npm run dev
   # Script prefers http://localhost:3000, then 3100, then 3200 and prints the recommended port.
   ```
3. Use the UI:
   * Upload files via the workspace; they save to `.uploads/` locally.
   * Configure column mappings; state persists in localStorage.
  * Launch the agent run from the console (uses a sample payload today) and inspect the timeline + agent responses.
  * (Optional) configure ChatKit later by setting `NEXT_PUBLIC_CHATKIT_WORKFLOW_ID` once you are ready to surface the assistant.

## Spike workflow (Xero lab)
Use this when you want to test new Xero functionality without affecting your main working copy.

1. Create isolated branch + worktree:
   ```bash
   npm run spike:xero:setup
   ```
2. Check current spike status:
   ```bash
   npm run spike:xero:status
   ```
3. Remove lab worktree and delete spike branch when done:
   ```bash
   npm run spike:xero:teardown
   ```

Defaults:
* Branch: `spike/xero-lab`
* Worktree folder: `../acctreconagents-xero-lab`

Advanced:
* Custom base branch: `node scripts/spike-worktree.mjs setup --base develop`
* Keep branch but remove worktree only: `node scripts/spike-worktree.mjs teardown`
* Force remove dirty worktree: `node scripts/spike-worktree.mjs teardown --force`

## Scripts
* Root: `npm run spec:check` – ensures required tooling for Spec-Kit/agent workflows is available.
* `apps/web`: `npm run dev`, `npm run build`, `npm run lint`.
* `services/orchestrator`: `npm run dev`, `npm run build`, `npm run start`.
* `tests/`: `npm test` – runs automated scenario tests using Claude skills (10 scenarios, ~8 min).

## Database notes
* The web app uses Vercel Postgres and includes a `user_organizations` table to store multiple organizations per user (with a single default).
* Integration connections are moving to `integration_connections` (org-scoped, provider-agnostic), with legacy fallback to `xero_connections`.
* For local testing without DB migration, set `XERO_DEV_NO_DB=true` and connect from Settings. This mode is non-persistent by design.
  * Run `npx tsx apps/web/scripts/init-db.ts` once against your target database to create tables. The script includes a safety check to avoid running against localhost.

## API schemas
OpenAPI documents live in `docs/api`:
* `orchestrator.openapi.yaml` – Fastify service (`POST /agent/runs`).
* `web.openapi.yaml` – Next.js routes (`/api/uploads`, `/api/agent/runs`, `/api/chatkit/...` proxies).

Import them into your API gateway, generate clients, or extend them as additional endpoints arrive.

## Extending
* Replace `runReconciliationLocally` (services/orchestrator/src/index.ts) with your production reconciliation engine or API call.
* Extend the ChatKit UI (`src/components/chatkit-panel.tsx`) with additional prompts, client tools, or analytics hooks.
* Hook uploads to a proper storage service (S3, Vercel Blob, etc.) rather than the local `.uploads` folder.
* Wire database persistence for column mappings, run history, and documents as needed.
* Expand Spec-Kit definitions to cover new workflows, then re-import or regenerate UI artifacts as necessary.

## Status / TODO
- ✅ Clean-slate Next.js UI (upload/mapping/chat/console) and orchestrator service scaffold.
- ✅ Spec-Kit contract + CLI integration.
- ☐ Replace placeholder reconciliation logic with your production engine.
- ☐ Persist ChatKit conversation metadata or analytics as needed.
- ☐ Harden upload storage and add authentication/authorization.

Questions or improvements? Open an issue and include whether you’re working on the web app, orchestrator, or specification.



