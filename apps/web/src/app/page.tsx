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
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 lg:px-10">
        {/* Header with User Menu */}
        <header className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8 shadow-2xl shadow-black/40">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.5em] text-sky-300">
                AcctReCon · Agentic AI reconciliation workspace
              </p>
              <h1 className="mt-3 text-4xl font-semibold leading-tight text-white">
                Upload, map, and reconcile faster with agentic AI.
              </h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300">
                Bring your trial balance, aging, bank, or subledger exports. The workspace helps you
                tie-out balances, explain variances, and produce clear reconciliation notes your team
                can review. Powered by FREE Gemini AI agents.
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
    <span className="rounded-full border border-slate-700/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200">
      {label}: <span className="text-sky-300">{value}</span>
    </span>
  );
}

function AboutPanel() {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
      <h3 className="text-lg font-semibold text-white">About</h3>
      <p className="mt-2 text-sm text-slate-400">
        An agentic AI workspace for reconciliation teams. Upload source reports, map columns once,
        and run guided checks that help explain differences clearly.
      </p>

      <details className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-100">
          Tech stack (optional)
        </summary>
        <div className="mt-3 space-y-3 text-sm text-slate-300">
          <div className="flex flex-wrap gap-2 text-sm text-slate-200">
            <SpecPill label="Agentic workflow" value="4 AI agents" />
            <SpecPill label="Spec version" value={specMetadata.version} />
            <SpecPill
              label="Canonical fields"
              value={`${canonicalBalanceFields.length + transactionFields.length}`}
            />
          </div>
          <ul className="list-disc space-y-1 pl-5">
            <li>Next.js 16 web app (UI + upload/mapping workflows)</li>
            <li>Fastify orchestrator service (agent coordination and API)</li>
            <li>Spec-Kit contracts for canonical models + validations</li>
            <li>Gemini 2.0 Flash (FREE tier) - 4 AI agents for reconciliation</li>
            <li>Better Auth for user management + Vercel Postgres for data storage</li>
          </ul>
          <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3">
            <p className="text-sm font-semibold text-emerald-100">
              🎉 FREE AI Agents
            </p>
            <p className="mt-1 text-xs text-emerald-200/80">
              This app uses Gemini 2.0 Flash free tier (1500 runs/day) instead of paid OpenAI/Claude models.
              Cost: $0 per reconciliation run!
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="https://github.com/bashiraziz/acctreconagents/blob/master/README.md"
              className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.3em] text-sky-400 hover:text-sky-200"
              target="_blank"
            >
              View full README &rarr;
            </Link>
            <Link
              href="https://github.com/bashiraziz/acctreconagents/blob/master/specs/reconciliation.speckit.json"
              className="inline-flex items-center text-xs font-semibold uppercase tracking-[0.3em] text-sky-400 hover:text-sky-200"
              target="_blank"
            >
              View spec contract &rarr;
            </Link>
          </div>
        </div>
      </details>

      <details className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-100">
          Data model (optional)
        </summary>
        <p className="mt-2 text-sm text-slate-400">{specMetadata.summary}</p>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Balances fields</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              {canonicalBalanceFields.map((field) => (
                <li key={field.key} className="flex items-center justify-between">
                  <span>{field.label}</span>
                  <span className="text-xs text-slate-500">
                    {field.required ? "required" : "optional"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Transactions fields</p>
            <ul className="mt-2 space-y-1 text-sm text-slate-200">
              {transactionFields.map((field) => (
                <li key={field.key} className="flex items-center justify-between">
                  <span>{field.label}</span>
                  <span className="text-xs text-slate-500">
                    {field.required ? "required" : "optional"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </details>

      <details className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-100">
          4-Agent AI Pipeline (optional)
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          <div className="rounded-xl border border-blue-700/40 bg-blue-900/20 p-3">
            <p className="font-semibold text-blue-100">1️⃣ Data Validation Agent</p>
            <p className="mt-1 text-xs text-blue-200/80">
              Validates data quality, detects issues, suggests improvements
            </p>
          </div>
          <div className="rounded-xl border border-purple-700/40 bg-purple-900/20 p-3">
            <p className="font-semibold text-purple-100">2️⃣ Reconciliation Analyst</p>
            <p className="mt-1 text-xs text-purple-200/80">
              Analyzes variances, flags risks, identifies patterns
            </p>
          </div>
          <div className="rounded-xl border border-orange-700/40 bg-orange-900/20 p-3">
            <p className="font-semibold text-orange-100">3️⃣ Variance Investigator</p>
            <p className="mt-1 text-xs text-orange-200/80">
              Deep-dives material variances, proposes root causes
            </p>
          </div>
          <div className="rounded-xl border border-emerald-700/40 bg-emerald-900/20 p-3">
            <p className="font-semibold text-emerald-100">4️⃣ Report Generator</p>
            <p className="mt-1 text-xs text-emerald-200/80">
              Creates audit-ready documentation and executive summaries
            </p>
          </div>
        </div>
      </details>
    </section>
  );
}
