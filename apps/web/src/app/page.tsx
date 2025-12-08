import Link from "next/link";
import { UploadWorkspace } from "@/components/upload-workspace";
import { ColumnMapper } from "@/components/column-mapper";
import { OrchestratorConsole } from "@/components/orchestrator-console";
//import { ChatKitPanel } from "@/components/chatkit-panel";
import {
  canonicalBalanceFields,
  specMetadata,
  transactionFields,
} from "@/lib/spec";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
        <header className="rounded-3xl border border-slate-800/80 bg-linear-to-br from-slate-950 via-slate-900 to-blue-950 p-8 shadow-2xl shadow-black/40">
          <p className="text-xs font-semibold uppercase tracking-[0.5em] text-sky-300">
            AcctReCon · Spec-driven agentic workspace
          </p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight text-white">
            Upload, map, and reconcile with multi-agent AI across OpenAI,
            Claude, and Gemini surfaces.
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-300">
            This clean-slate build anchors on Spec-Kit contracts, streams
            conversations through OpenAI ChatKit, and keeps Claude subagents +{" "}
            Gemini insights at the ready for accounting teams.
          </p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
            <SpecPill label="Spec version" value={specMetadata.version} />
            <SpecPill label="Canonical fields" value={`${canonicalBalanceFields.length + transactionFields.length}`} />
            <SpecPill label="Stack" value="Next.js · Fastify · Agent SDKs" />
          </div>
        </header>
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <UploadWorkspace />
            <ColumnMapper />
            <OrchestratorConsole />
          </div>
          <div className="space-y-6">
            {/* Uncomment to re-enable agent chat */}
            {/* <ChatKitPanel /> */}
            <SpecOverview />
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

function SpecOverview() {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6">
      <h3 className="text-lg font-semibold text-white">Spec-Kit blueprint</h3>
      <p className="mt-2 text-sm text-slate-400">{specMetadata.summary}</p>
      <div className="mt-4 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            Balances model
          </p>
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
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
            Transactions model
          </p>
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
      <Link
        href="https://github.com/bashiraziz/acctreconagents/blob/master/specs/reconciliation.speckit.json"
        className="mt-4 inline-flex items-center text-xs font-semibold uppercase tracking-[0.3em] text-sky-400 hover:text-sky-200"
        target="_blank"
      >
        View raw spec →
      </Link>
    </section>
  );
}
