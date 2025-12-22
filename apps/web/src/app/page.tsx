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
import { canonicalBalanceFields, specMetadata, transactionFields } from "@/lib/spec";

export default function Home() {
  return (
    <div className="min-h-screen theme-bg">
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
        {/* Header with User Menu */}
        <header className="theme-card theme-border border-b p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold theme-text">
                Rowshni
              </h1>
              <p className="mt-1 text-lg font-medium text-amber-500">
                Shedding light on your ledger
              </p>
              <p className="mt-2 max-w-3xl text-sm theme-text-muted">
                AI-powered reconciliation that illuminates variances, detects errors, and brings clarity to your month-end close.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="https://github.com/bashiraziz/acctreconagents"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border theme-border theme-card px-3 py-2 text-sm font-medium theme-text hover:theme-muted transition-colors"
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
              </Link>
              <Link
                href="https://github.com/bashiraziz/acctreconagents/blob/master/USER_GUIDE.md"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border theme-border theme-card px-4 py-2 text-sm font-medium theme-text hover:theme-muted transition-colors"
              >
                How to Use
              </Link>
              <ThemeToggle />
              <UserMenu />
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
          <div className="space-y-6">
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
              <span className="text-sm theme-text-muted">•</span>
              <Link
                href="https://github.com/bashiraziz/acctreconagents/blob/master/USER_GUIDE.md"
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
    <section className="theme-card theme-border border p-6">
      <h3 className="text-base font-semibold theme-text">About Rowshni</h3>
      <p className="mt-2 text-sm theme-text-muted">
        <span className="font-medium text-amber-500">Rowshni</span> means "light".
        We illuminate your reconciliations with AI-powered insights, bringing clarity to complex financial data.
      </p>

      <details className="mt-4 border-t theme-border pt-4">
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
            <li>Fastify orchestrator service</li>
            <li>Spec-Kit contracts for data validation</li>
            <li>Gemini 2.0 Flash (free tier) for AI agents</li>
            <li>Better Auth + Vercel Postgres</li>
          </ul>
          <div className="rounded border border-gray-300 bg-gray-50 p-3">
            <p className="text-sm font-medium text-gray-900">
              Free AI Agents
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Uses Gemini 2.0 Flash free tier (1500 runs/day). Cost: $0 per reconciliation.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="https://github.com/bashiraziz/acctreconagents/blob/master/README.md"
              className="text-xs font-medium text-gray-700 underline hover:text-gray-900"
              target="_blank"
            >
              View README →
            </Link>
            <Link
              href="https://github.com/bashiraziz/acctreconagents/blob/master/specs/reconciliation.speckit.json"
              className="text-xs font-medium text-gray-700 underline hover:text-gray-900"
              target="_blank"
            >
              View Spec →
            </Link>
          </div>
        </div>
      </details>

      <details className="mt-4 border-t border-gray-200 pt-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Data Model
        </summary>
        <p className="mt-2 text-sm text-gray-600">{specMetadata.summary}</p>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-medium uppercase text-gray-700">Balance Fields</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-900">
              {canonicalBalanceFields.map((field) => (
                <li key={field.key} className="flex items-center justify-between">
                  <span>{field.label}</span>
                  <span className="text-xs text-gray-700">
                    {field.required ? "required" : "optional"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-gray-700">Transaction Fields</p>
            <ul className="mt-2 space-y-1 text-sm text-gray-900">
              {transactionFields.map((field) => (
                <li key={field.key} className="flex items-center justify-between">
                  <span>{field.label}</span>
                  <span className="text-xs text-gray-700">
                    {field.required ? "required" : "optional"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <details className="mt-4 border-t border-gray-200 pt-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          AI Agent Pipeline
        </summary>
        <div className="mt-3 space-y-2 text-sm">
          <div className="border-l-2 border-gray-400 pl-3">
            <p className="font-medium text-gray-900">1. Data Validation Agent</p>
            <p className="text-xs text-gray-600">
              Validates data quality and detects issues
            </p>
          </div>
          <div className="border-l-2 border-gray-400 pl-3">
            <p className="font-medium text-gray-900">2. Reconciliation Analyst</p>
            <p className="text-xs text-gray-600">
              Analyzes variances and identifies patterns
            </p>
          </div>
          <div className="border-l-2 border-gray-400 pl-3">
            <p className="font-medium text-gray-900">3. Variance Investigator</p>
            <p className="text-xs text-gray-600">
              Investigates material variances and root causes
            </p>
          </div>
          <div className="border-l-2 border-gray-400 pl-3">
            <p className="font-medium text-gray-900">4. Report Generator</p>
            <p className="text-xs text-gray-600">
              Creates audit-ready documentation
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}
