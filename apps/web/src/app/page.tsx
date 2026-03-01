import Link from "next/link";

import { ColumnMapper } from "@/components/column-mapper";
import { OrchestratorConsole } from "@/components/orchestrator-console";
import { SampleDataPanel } from "@/components/sample-data-panel";
import { UploadWorkspace } from "@/components/upload-workspace";
import { AuthBanner } from "@/components/auth/auth-banner";
import { UserMenu } from "@/components/auth/user-menu";
import { WorkflowProgress } from "@/components/workflow-progress";
import { DataPreview } from "@/components/data-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { SimpleModeToggle } from "@/components/simple-mode-toggle";
import { NextActionPanel } from "@/components/next-action-panel";
import { canonicalBalanceFields, specMetadata, transactionFields } from "@/lib/spec";

export default function Home() {
  return (
    <div className="min-h-screen theme-bg">
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        {/* Header with User Menu */}
        <header className="theme-card theme-border rounded-3xl border p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold theme-text sm:text-3xl">
                Rowshni
              </h1>
              <p className="mt-1 text-base font-medium theme-text-muted sm:text-lg">
                Shedding light on your ledger
              </p>
              <p className="simple-mode-compact mt-2 max-w-3xl text-sm leading-relaxed theme-text-muted">
                AI-powered reconciliation for month-end close. Upload files, map fields, review transformed data, and run agents.
              </p>
              <div className="simple-mode-compact mt-3 flex flex-wrap gap-2 text-xs">
                <span className="badge badge-neutral">
                  1. Upload
                </span>
                <span className="badge badge-neutral">
                  2. Map
                </span>
                <span className="badge badge-neutral">
                  3. Preview
                </span>
                <span className="badge badge-neutral">
                  4. Reconcile
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                href="https://github.com/bashiraziz/acctreconagents"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                title="View on GitHub"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-5 w-5"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                </svg>
                <span className="ml-2 hidden sm:inline">GitHub</span>
              </Link>
              <Link
                href="/user-guide"
                className="btn btn-secondary btn-sm"
              >
                User Guide
              </Link>
              <UserMenu />
              <SimpleModeToggle />
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Rate Limit Banner */}
        <AuthBanner />

        {/* Workflow Progress Indicator */}
        <WorkflowProgress />
        <NextActionPanel />

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          {/* Left Column - Main Workflow */}
          <div className="space-y-6">
            <UploadWorkspace />
            <ColumnMapper />
            <DataPreview />
            <OrchestratorConsole />
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6 lg:sticky lg:top-6 lg:self-start">
            <SampleDataPanel />
            <AboutPanel />
          </div>
        </div>

        {/* Footer */}
        <footer className="simple-mode-compact mt-8 border-t theme-border pt-6 pb-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <div className="text-sm theme-text-muted">
              <span className="font-medium theme-text">Rowshni</span> - Shedding light on your ledger
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="https://github.com/bashiraziz/acctreconagents"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium theme-text transition-opacity hover:opacity-80"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-4 w-4"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
                </svg>
                View on GitHub
              </Link>
              <span className="text-sm theme-text-muted">|</span>
              <Link
                href="/user-guide"
                className="text-sm font-medium theme-text transition-opacity hover:opacity-80"
              >
                User Guide
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

function SpecPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border theme-border theme-muted px-3 py-1 text-xs theme-text">
      <span className="font-medium">{label}:</span> {value}
    </span>
  );
}

function AboutPanel() {
  return (
    <section className="ui-panel">
      <h3 className="ui-title">About Rowshni</h3>
      <p className="ui-copy mt-2">
        <span className="font-medium theme-text">Rowshni</span> means &quot;light&quot;.
        It streamlines GL-to-subledger reconciliation with guided steps and AI assistance.
      </p>

      <div className="mt-4 rounded border theme-border theme-muted p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] theme-text-muted">
          Platform Snapshot
        </p>
        <ul className="mt-2 space-y-1 text-sm theme-text-muted">
          <li>4-stage AI pipeline: Validation, Analysis, Investigation, and Report generation</li>
          <li>Frontend: Next.js web app | Backend: Fastify orchestrator</li>
          <li>Runtime: Gemini by default, with optional OpenAI and Claude integration</li>
        </ul>
      </div>

      <details className="simple-hide mt-4 border-t theme-border pt-4">
        <summary className="cursor-pointer text-sm font-medium theme-text">
          Technical Reference
        </summary>
        <div className="mt-3 space-y-3 text-sm theme-text-muted">
          <div className="flex flex-wrap gap-2">
            <SpecPill label="AI Agents" value="4" />
            <SpecPill label="Version" value={specMetadata.version} />
            <SpecPill
              label="Fields"
              value={`${canonicalBalanceFields.length + transactionFields.length}`}
            />
          </div>
          <ul className="list-disc space-y-1 pl-5">
            <li>Next.js 16 web application</li>
            <li>Fastify orchestrator service (OpenAI, Claude, Gemini modes)</li>
            <li>Spec-Kit contracts for data validation</li>
            <li>Gemini 2.0 Flash (default free-tier 4-agent pipeline)</li>
            <li>Optional Claude skills for mapping and investigation</li>
          </ul>

          <div className="flex flex-wrap gap-3">
            <Link
              href="https://github.com/bashiraziz/acctreconagents/blob/master/README.md"
              className="btn btn-secondary btn-sm"
              target="_blank"
            >
              View README
            </Link>
            <Link
              href="https://github.com/bashiraziz/acctreconagents/blob/master/specs/reconciliation.speckit.json"
              className="btn btn-secondary btn-sm"
              target="_blank"
            >
              View Spec
            </Link>
            <Link
              href="/user-guide"
              className="btn btn-secondary btn-sm"
            >
              Open User Guide
            </Link>
          </div>
        </div>
      </details>
      <p className="simple-only mt-4 text-xs theme-text-muted">
        For full technical details, turn off Simple mode or open the User Guide.
      </p>
    </section>
  );
}


