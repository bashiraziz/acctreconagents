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
* **Rate Limiting** - Built-in protection (30/hour anonymous, 60/hour authenticated)
* **Authentication** - Better Auth + Vercel Postgres (optional)
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

## Scripts
* Root: `npm run spec:check` – ensures required tooling for Spec-Kit/agent workflows is available.
* `apps/web`: `npm run dev`, `npm run build`, `npm run lint`.
* `services/orchestrator`: `npm run dev`, `npm run build`, `npm run start`.
* `tests/`: `npm test` – runs automated scenario tests using Claude skills (10 scenarios, ~8 min).

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

Questions or improvements? Open an issue and include whether you’re working on the web app, orchestrator, or specification.*** End Patch**³**
