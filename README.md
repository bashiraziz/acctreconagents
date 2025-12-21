# AcctReCon Agentic Workspace

Modern reconciliation stack built from a clean slate: Next.js on Vercel for the UI, a Fastify orchestrator for OpenAI/Claude/Gemini coordination, and Spec-Kit contracts that keep the whole system spec-driven and agent-ready.

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
specs/
  reconciliation...    # Spec-Kit definition for canonical models + workflows
spec-kit.config.json   # CLI hook for Spec-Kit tooling
package.json           # Root scripts (Spec-Kit check)
.env.sample            # Shared environment variable template
```

### Frontend (apps/web)
* Next.js 15 App Router + Tailwind.
* Upload workspace with structured/supporting file lanes (hits `/api/uploads`).  
* Spec-guided column mapper and Spec blueprint card derived from `specs/reconciliation.speckit.json`.
* Agent Console hitting `/api/agent/runs` to trigger multi-agent workflows and show OpenAI/Claude/Gemini output.
* ChatKit control room scaffolding (currently hidden; ready to re-enable once a workflow is available).
* Ready for Vercel deployment (just set environment variables and link to your project).

### Backend (services/orchestrator)
* Fastify service that exposes:
  * `POST /agent/runs` — validates payloads via Spec-Kit, runs OpenAI supervisor/reviewer agents, invokes Claude Skills subagents, and requests Gemini-driven commentary. Currently uses a placeholder reconciliation function that you can replace.
* `POST /agent/runs` — multi-agent reconciliation / summary orchestration.
* TypeScript project with scripts for dev, build, and start (`npm run dev|build|start`).
* Integrations: `openai` (Agents SDK, `beta.assistants`), `@anthropic-ai/sdk` for Claude Skills, and `@google/generative-ai` for Gemini summarization.

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
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | Enables Gemini narrative commentary. |
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
