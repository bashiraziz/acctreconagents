# Implementation Blueprint · Spec-Kit Plugin Outputs

## Frontend (Next.js / Vercel)
- **App router** with typed server actions.
- **UI modules**:
  - `UploadWorkspace`: drag/drop + file list persisted in browser while uploads stream to orchestrator.
  - `ColumnMapper`: balances vs transactions header inputs, dropdown mapping grid, preview toggle, localStorage persistence.
  - `OrchestratorConsole`: prompt input, result timeline, accountant-friendly validation text.
  - `ChatKitPanel`: gated behind workflow ID env var.
- **Libraries**: Tailwind utilities, Headless UI for file pickers, custom `useColumnMapping` hook for saved presets.

## Backend (Fastify orchestrator)
- **Routes**:
  - `POST /api/run`: accepts payload shaped by Spec-Kit models, kicks off multi-agent flow.
  - `POST /api/upload`: placeholder for future signed-upload handling.
- **Services**:
  - `schema.ts`: derives Zod validators from `reconciliation.speckit.json` for balances/transactions.
  - `agents.ts`: wrappers for OpenAI Agents SDK, Claude Skills API, Gemini generative responses.
  - `reconcile.ts`: orchestrates matching GL vs subledger + roll-forward narrative (currently stubbed; needs expansion).
- **Infra**: tsx dev runner, pnpm build, Dotenv for `.env` at repo root.

## Data & Specs
- `specs/reconciliation.speckit.json` is the authoritative schema + workflow document.
- Generated artifacts (plan, tasks, TODO) sit in `docs/spec-kit/` for easy discovery by AI assistants or humans.

## Plugin Directory Layout
```
docs/spec-kit/
+- plan.md             # planning narrative (this plugin)
+- implementation.md   # blueprint + module list (this file)
+- tasks.md            # task board synced with plan
+- todo.md             # lightweight backlog tracker
memory/
+- constitution.md     # governance guardrails referenced by `speckit.plan`
```

## Tooling Contracts
- `spec-kit.config.json` registers these docs under the `plugins` array so downstream automations (Specify CLI, GitHub Actions, agents) know where to read/write SDD artifacts.
- Local command: `npx @letuscode/spec-kit check` to validate schema + environment prerequisites.
