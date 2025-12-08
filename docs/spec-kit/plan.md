# Spec-Kit Plan · Agentic Reconciliation Workspace

**Spec**: `specs/reconciliation.speckit.json`  
**Scope**: Upload ? map ? reconcile ? narrate flows powered by OpenAI Agents, Claude Skills, and Gemini commentary.

## 1. Objectives
1. Give controllers a single workspace to ingest GL + subledger extracts and normalize headers per Spec-Kit schema.
2. Fan requests into the orchestrator service so OpenAI/Claude/Gemini agents collaborate on reconciliations.
3. Keep UX copy and validation plain-language so non-engineers can resolve errors quickly.

## 2. Architecture Snapshot
- **Frontend**: Next.js 14+/App Router hosted on Vercel. Sections: Upload workspace, Column harmonizer, Orchestrator console, ChatKit (gated until workflow keys exist).
- **Backend**: Fastify service (`services/orchestrator`) running on tsx with Dotenv for shared secrets.
- **Specs**: Spec-Kit contract defines canonical `canonical_balance` + `transaction_line` models, reconciliation interface, and workflows.
- **Agents**: OpenAI Agents SDK + ChatKit for conversation streams, Claude Skills for mapping/explanations, Gemini for variance commentary.

## 3. Delivery Phases
| Phase | Output | Notes |
| --- | --- | --- |
| Research | Schema + workflow captured in `reconciliation.speckit.json`. | ? done.
| Plan | This document + constitution-based standards. | ? in progress.
| Implementation | Next.js UI, orchestrator endpoints, schema validation, multi-agent wiring. | ?? active.
| Validation | Jest/unit tests, Fastify smoke tests, manual accountant dry runs. | ? upcoming.

## 4. Workstreams
1. **Data intake**: Drag/drop upload, local persistence, antivirus scanning placeholder, pass to orchestrator.
2. **Column mapping UX**: Dual textareas (balances vs transactions), selectable mapping grid, preview + saved presets.
3. **Agent console**: ChatKit session bootstrap, orchestrator `/run` endpoint, human-readable errors.
4. **Reconciliation logic**: Spec-bound validator, variance engine, narrative generation, audit trail.

## 5. Risks & Mitigations
- **Multiple LLM providers**: central `LLMRegistry` adaptor with retries + structured logging.
- **Large files**: enforce 20MB cap client-side, chunk uploads server-side.
- **Accountant onboarding**: inline helper texts, sample CSVs, and saved mapping templates.

## 6. Next Steps
- Finalize schema adapters + zod validators derived from Spec-Kit models.
- Wire uploads + mappings to orchestrator payload.
- Stand up ChatKit workflow after credentials verified.
- Expand reconciliation engine beyond placeholder diffing.
