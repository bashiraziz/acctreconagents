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
              <p className="mt-1 text-base font-medium text-amber-500 sm:text-lg">
                Shedding light on your ledger
              </p>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed theme-text-muted">
                AI-powered reconciliation for month-end close. Upload files, map fields, review transformed data, and run agents.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border theme-border theme-muted px-3 py-1 theme-text-muted">
                  1. Upload
                </span>
                <span className="rounded-full border theme-border theme-muted px-3 py-1 theme-text-muted">
                  2. Map
                </span>
                <span className="rounded-full border theme-border theme-muted px-3 py-1 theme-text-muted">
                  3. Preview
                </span>
                <span className="rounded-full border theme-border theme-muted px-3 py-1 theme-text-muted">
                  4. Reconcile
                </span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                href="https://github.com/bashiraziz/acctreconagents"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-lg border theme-border theme-card px-3 py-2 text-sm font-medium theme-text transition-colors hover:theme-muted"
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
                href="https://github.com/bashiraziz/acctreconagents/blob/main/USER_GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border theme-border theme-card px-4 py-2 text-sm font-medium theme-text transition-colors hover:theme-muted"
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
        <footer className="mt-8 border-t theme-border pt-6 pb-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <div className="text-sm theme-text-muted">
              <span className="font-medium text-amber-500">Rowshni</span> - Shedding light on your ledger
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="https://github.com/bashiraziz/acctreconagents"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium theme-text hover:text-amber-500 transition-colors"
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
                href="https://github.com/bashiraziz/acctreconagents/blob/main/USER_GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium theme-text hover:text-amber-500 transition-colors"
              >
                Documentation
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
        <span className="font-medium text-amber-500">Rowshni</span> means &quot;light&quot;.
        We illuminate your reconciliations with AI-powered insights, bringing clarity to complex financial data.
      </p>

      <details className="simple-hide mt-4 border-t theme-border pt-4">
        <summary className="cursor-pointer text-sm font-medium theme-text">
          Tech Stack
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
            <li>Claude skills subagents for mapping and variance investigation</li>
            <li>Anonymous mode with browser localStorage</li>
          </ul>

          <details className="rounded border theme-border theme-muted p-3">
            <summary className="cursor-pointer text-sm font-medium theme-text">
              What are Spec-Kit contracts?
            </summary>
            <div className="mt-2 space-y-2 text-xs theme-text-muted">
              <p>
                Spec-Kit contracts are structured JSON schemas that define the &quot;source of truth&quot;
                for data validation and system behavior.
              </p>
              <p className="font-medium theme-text">They define:</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>
                  <span className="font-medium">Data Models</span>: Canonical schemas like
                  <code className="mx-1 rounded bg-gray-700 px-1 py-0.5 text-[11px] text-gray-200">canonical_balance</code>
                  (account_code, period, amount, currency)
                </li>
                <li>
                  <span className="font-medium">Interfaces</span>: Exact inputs/outputs for the reconciliation
                  tool that AI agents consume
                </li>
                <li>
                  <span className="font-medium">Workflows</span>: Expected process flows for upload and reconciliation
                </li>
              </ul>
              <p>
                Your uploaded CSVs are transformed to match these canonical schemas. This ensures
                consistency across different accounting systems and allows AI agents to reliably
                process your data.
              </p>
              <p className="pt-1 text-[11px] italic">
                Contract version {specMetadata.version} | {canonicalBalanceFields.length + transactionFields.length} fields total
              </p>
            </div>
          </details>

          <div className="rounded border theme-border theme-muted p-3">
            <p className="text-sm font-medium theme-text">
              AI Runtime
            </p>
            <p className="mt-1 text-xs theme-text-muted">
              Default: Gemini 2.0 Flash free tier. Optional OpenAI agents and Claude skills run when configured.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="https://github.com/bashiraziz/acctreconagents/blob/master/README.md"
              className="text-xs font-medium theme-text underline hover:text-amber-500 transition-colors"
              target="_blank"
            >
              {"View README ->"}
            </Link>
            <Link
              href="https://github.com/bashiraziz/acctreconagents/blob/master/specs/reconciliation.speckit.json"
              className="text-xs font-medium theme-text underline hover:text-amber-500 transition-colors"
              target="_blank"
            >
              {"View Spec ->"}
            </Link>
          </div>
        </div>
      </details>

      <details className="simple-hide mt-4 border-t theme-border pt-4">
        <summary className="cursor-pointer text-sm font-medium theme-text">
          Data Model
        </summary>
        <p className="mt-2 text-sm theme-text-muted">
          {specMetadata.summary} Reports include Organization (if set), Reporting Period, and Report Generated On.
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase theme-text-muted">Balance Fields</p>
            <ul className="mt-2 space-y-1 text-sm theme-text">
              {canonicalBalanceFields.map((field) => (
                <li key={field.key} className="flex items-center justify-between">
                  <span>{field.label}</span>
                  <span className="text-xs theme-text-muted">
                    {field.required ? "required" : "optional"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase theme-text-muted">Transaction Fields</p>
            <ul className="mt-2 space-y-1 text-sm theme-text">
              {transactionFields.map((field) => (
                <li key={field.key} className="flex items-center justify-between">
                  <span>{field.label}</span>
                  <span className="text-xs theme-text-muted">
                    {field.required ? "required" : "optional"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <details className="simple-hide mt-4 border-t theme-border pt-4">
        <summary className="cursor-pointer text-sm font-medium theme-text">
          AI Agent Pipeline
        </summary>
        <div className="mt-3 space-y-2 text-sm">
          <div className="border-l-2 border-gray-500 pl-3">
            <p className="font-medium theme-text">1. Data Validation Agent</p>
            <p className="text-xs theme-text-muted">
              Validates data quality and detects issues
            </p>
          </div>
          <div className="border-l-2 border-gray-500 pl-3">
            <p className="font-medium theme-text">2. Reconciliation Analyst</p>
            <p className="text-xs theme-text-muted">
              Analyzes variances and identifies patterns
            </p>
          </div>
          <div className="border-l-2 border-gray-500 pl-3">
            <p className="font-medium theme-text">3. Variance Investigator</p>
            <p className="text-xs theme-text-muted">
              Investigates material variances and root causes
            </p>
          </div>
          <div className="border-l-2 border-gray-500 pl-3">
            <p className="font-medium theme-text">4. Report Generator</p>
            <p className="text-xs theme-text-muted">
              Creates audit-ready documentation
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}


