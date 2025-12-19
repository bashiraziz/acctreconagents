import Link from "next/link";

import { ColumnMapper } from "@/components/column-mapper";
import { OrchestratorConsole } from "@/components/orchestrator-console";
import { SampleDataPanel } from "@/components/sample-data-panel";
import { UploadWorkspace } from "@/components/upload-workspace";
import { AuthBanner } from "@/components/auth/auth-banner";
import { UserMenu } from "@/components/auth/user-menu";
import { WorkflowProgress } from "@/components/workflow-progress";
import { DataPreview } from "@/components/data-preview";
import { canonicalBalanceFields, specMetadata, transactionFields } from "@/lib/spec";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8 lg:px-10">
        {/* Header with User Menu */}
        <header className="border-b border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                Account Reconciliation
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-600">
                Upload your GL and subledger data, map columns, and run AI-powered reconciliation analysis.
              </p>
            </div>
            <UserMenu />
          </div>
        </header>

        {/* Auth Banner for Anonymous Users */}
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
      </main>
    </div>
  );
}

function SpecPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700">
      <span className="font-medium">{label}:</span> {value}
    </span>
  );
}

function AboutPanel() {
  return (
    <section className="border border-gray-200 bg-white p-6">
      <h3 className="text-base font-semibold text-gray-900">About</h3>
      <p className="mt-2 text-sm text-gray-600">
        AI-powered reconciliation workspace. Upload source reports, map columns, and run automated analysis.
      </p>

      <details className="mt-4 border-t border-gray-200 pt-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700">
          Tech Stack
        </summary>
        <div className="mt-3 space-y-3 text-sm text-gray-600">
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
