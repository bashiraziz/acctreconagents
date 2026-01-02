# Acctreconagents Constitution

## Core Principles

### I. Spec-Led Delivery
We always start from the Spec-Kit contract before touching code. Every new feature documents the actors, data models, and workflows that change, and the spec is versioned alongside implementation commits.

### II. Accountants-First UX
The product must stay approachable for controllers and auditors. Copy favors plain English over engineering jargon, and workflows map to real close tasks (upload, map, reconcile, narrate) with no technical prerequisites.

### III. Multi-Agent Transparency
OpenAI Agents, Claude Skills, and Gemini helpers must expose their actions, prompts, and tool outputs in the orchestrator log. No silent automation�accountants can always review what the software did.

### IV. Guarded Data Flow
Uploads never leave the orchestrator boundary without encryption, and we only persist normalized payloads needed to reproduce reconciliations. Secrets live in env files, and every dependency is pinned.

### V. Iterative Quality Gates
Each release moves through research ? plan ? implementation ? verification. Lint, type checks, and orchestrator smoke tests are mandatory; schema-breaking changes need migration notes.

### VI. File Safety & User Confirmation
**NEVER delete files without explicit user confirmation.** Before running any destructive commands (`git clean`, `rm`, `rmdir`, file deletion, etc.), always:
1. List exactly what will be deleted
2. Wait for explicit user approval
3. Only proceed after confirmation is received

This applies to ALL files: code, documentation, temporary files, and directories. User data is sacred and irreplaceable.

### VII. Controlled Git Operations
**NEVER commit or push to the repository without explicit user request.** Git operations consume tokens and should only be performed when the user specifically asks. This includes:
- `git add`
- `git commit`
- `git push`
- Any other git commands that modify repository state

Always wait for explicit instructions like "commit this" or "push to origin" before performing git operations. This conserves tokens and gives the user control over repository state.

## Delivery Standards
- **Documentation**: Specs, plans, and tasks stay under `docs/spec-kit` so every agent reads the same playbook.
- **Testing**: Fastify orchestrator requires unit coverage for reconciliation utilities plus contract tests for the API schemas.
- **Accessibility**: The Next.js UI must remain keyboard-friendly and pass automated contrast checks before ship.
- **Telemetry**: Every agent call includes correlation IDs so user support can replay a session from logs.

## Governance
- The constitution overrides ad-hoc directives. Amendments require updating this file, referencing the motivating issue, and communicating in the README changelog.
- Code reviews confirm adherence to these principles before merge.

**Version**: 1.2.0 | **Ratified**: 2025-12-07 | **Last Amended**: 2026-01-02

## Amendment History
- **v1.2.0 (2026-01-02)**: Added Principle VII "Controlled Git Operations" - requires explicit user approval before any git commits or pushes to conserve tokens and give user control over repository state.
- **v1.1.0 (2025-12-29)**: Added Principle VI "File Safety & User Confirmation" - requires explicit confirmation before deleting any files after accidental deletion of user files during cleanup operations.