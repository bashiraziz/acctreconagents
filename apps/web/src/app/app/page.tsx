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
import { BuildUpdateNotice } from "@/components/build-update-notice";
import { GettingStarted } from "@/components/getting-started";
import { StickyRunBar } from "@/components/sticky-run-bar";

export default function AppPage() {
  return (
    <div className="min-h-screen theme-bg">
      {/* Slim top nav */}
      <header className="border-b theme-border theme-card sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-lg font-bold theme-text">Rowshni</span>
            <span className="hidden sm:inline text-xs theme-text-muted group-hover:theme-text transition">
              ← back
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="https://github.com/bashiraziz/acctreconagents" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm hidden sm:inline-flex">
              GitHub
            </Link>
            <Link href="/user-guide" className="btn btn-secondary btn-sm hidden sm:inline-flex">
              User Guide
            </Link>
            <Link href="/integrations" className="btn btn-secondary btn-sm hidden sm:inline-flex">
              Integrations
            </Link>
            <UserMenu />
            <SimpleModeToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 pb-20 sm:px-6 sm:py-8 lg:px-10">
        {/* Rate Limit Banner */}
        <AuthBanner />

        {/* Getting started guide */}
        <GettingStarted />

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
          <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
            <SampleDataPanel />
            <AboutPanel />
          </div>
        </div>

        {/* Footer */}
        <footer className="simple-mode-compact mt-8 border-t theme-border pt-6 pb-8">
          <div className="flex flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
            <div className="flex items-center gap-1.5 text-sm theme-text-muted">
              <Link href="/" className="font-medium theme-text hover:opacity-80 transition-opacity">Rowshni</Link>
              <span>— Shedding light on your ledger</span>
              <BuildUpdateNotice />
            </div>
            <div className="flex items-center gap-4">
              <Link href="https://github.com/bashiraziz/acctreconagents" target="_blank" rel="noopener noreferrer" className="text-sm font-medium theme-text transition-opacity hover:opacity-80">
                GitHub
              </Link>
              <span className="text-sm theme-text-muted">|</span>
              <Link href="/user-guide" className="text-sm font-medium theme-text transition-opacity hover:opacity-80">
                User Guide
              </Link>
              <span className="text-sm theme-text-muted">|</span>
              <Link href="/privacy" className="text-sm font-medium theme-text transition-opacity hover:opacity-80">
                Privacy
              </Link>
            </div>
          </div>
        </footer>
      </main>

      <StickyRunBar />
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
          <li>4-stage Illuminate pipeline: Validation, Analysis, Investigation, and Report</li>
          <li>Frontend: Next.js web app | Backend: Fastify orchestrator</li>
          <li>Gemini, OpenAI, and Claude supported</li>
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
            <li>Gemini 2.0 Flash (default free-tier Illuminate pipeline)</li>
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
            <Link href="/user-guide" className="btn btn-secondary btn-sm">
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
