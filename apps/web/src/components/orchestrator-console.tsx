"use client";

import { useState } from "react";
import { specMetadata } from "@/lib/spec";

const demoPayload = {
  glBalances: [
    { account: "1000", period: "2025-10", amount: 120000 },
    { account: "1000", period: "2025-11", amount: 118500 },
  ],
  subledgerBalances: [
    { account: "1000", period: "2025-10", amount: 119200 },
    { account: "1000", period: "2025-11", amount: 118500 },
  ],
  transactions: [
    {
      account: "1000",
      booked_at: "2025-10-15",
      amount: -800,
      metadata: { period: "2025-10", source: "Inventory" },
    },
    {
      account: "1000",
      booked_at: "2025-10-31",
      amount: -500,
      metadata: { period: "2025-10", source: "Cost adjustments" },
    },
  ],
  orderedPeriods: ["2025-10", "2025-11"],
};

type RunResult = {
  runId: string;
  timeline: Array<{
    stage: string;
    status: string;
    detail: string;
    timestamp: string;
  }>;
  openai?: {
    message: string;
    messagesByRole: Record<string, string>;
  };
  claudeSkills?: Array<{ skill: string; response: string }>;
  geminiInsight?: string | null;
  toolOutput?: unknown;
};

export function OrchestratorConsole() {
  const [prompt, setPrompt] = useState(
    "Reconcile account 1000 inventory roll-forward for October close.",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAgents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: prompt,
          payload: demoPayload,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const details =
          extractValidationDetails(data?.issues) ??
          (data?.detail as string | undefined);
        const message = [data?.message ?? "Agent run failed", details]
          .filter(Boolean)
          .join(": ");
        throw new Error(message);
      }
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/70 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-300">
            Orchestrator
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Multi-agent console
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Launch OpenAI Agents, Claude Skills, and Gemini commentary from a
            single command, bound by Spec-Kit schema v{specMetadata.version}.
          </p>
        </div>
        <button
          type="button"
          onClick={runAgents}
          disabled={loading}
          className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {loading ? "Running..." : "Run agents"}
        </button>
      </header>
      <div className="mt-4">
        <label className="text-xs uppercase tracking-[0.3em] text-slate-500">
          User prompt
          <textarea
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-black/40 p-3 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
            rows={3}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-100">
          {error}
        </p>
      )}
      {result && <RunResultPanel result={result} />}
    </section>
  );
}

function extractValidationDetails(
  issues: Record<string, unknown> | undefined,
) {
  if (!issues) {
    return null;
  }
  const flattened = (issues.fieldErrors as Record<string, unknown>) ?? issues;
  const fragments: string[] = [];
  for (const [field, errors] of Object.entries(flattened)) {
    if (Array.isArray(errors) && errors.length > 0) {
      fragments.push(
        humanizeIssue(field, String(errors[0] ?? "is invalid")),
      );
    }
  }
  if (fragments.length === 0) {
    return null;
  }
  return fragments.slice(0, 3).join(" | ");
}

function humanizeIssue(path: string, message: string) {
  const parts = path.split(".");
  const segmentMap: Record<string, string> = {
    glBalances: "GL balance",
    subledgerBalances: "Subledger balance",
    transactions: "Transaction",
    orderedPeriods: "Period order",
    activityByPeriod: "Activity by period entry",
    adjustmentsByPeriod: "Adjustment entry",
  };

  const categoryKey = parts[0];
  const category = segmentMap[categoryKey] ?? categoryKey;

  const indexPart = parts.find((segment) => /^\d+$/.test(segment));
  const rowLabel = indexPart ? `row ${Number(indexPart) + 1}` : "";

  const fieldKey = parts[parts.length - 1];
  const fieldLabel =
    fieldKey && fieldKey !== categoryKey
      ? `“${fieldKey.replace(/_/g, " ")}”`
      : "";

  const readableMessage = message
    .replace(/required/i, "is required")
    .replace(/invalid/i, "looks invalid");

  return [category, rowLabel, fieldLabel, readableMessage]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function RunResultPanel({ result }: { result: RunResult }) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-slate-800/80 bg-black/40 p-4">
        <h3 className="text-sm font-semibold text-white">
          Timeline · {result.runId}
        </h3>
        <ol className="mt-3 space-y-3 text-sm text-slate-200">
          {result.timeline.map((entry) => (
            <li
              key={entry.stage}
              className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold capitalize">{entry.stage.replace(/_/g, " ")}</span>
                <span className="text-xs uppercase text-slate-400">
                  {entry.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{entry.detail}</p>
              <p className="text-[10px] text-slate-500">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </p>
            </li>
          ))}
        </ol>
      </div>
      <div className="space-y-4">
        {result.openai?.messagesByRole && (
          <div className="rounded-2xl border border-indigo-800/50 bg-indigo-950/20 p-4 text-sm text-indigo-50">
            <h4 className="font-semibold">OpenAI agents</h4>
            {Object.entries(result.openai.messagesByRole).map(
              ([role, message]) => (
                <div key={role} className="mt-2">
                  <p className="text-xs uppercase text-indigo-300">{role}</p>
                  <p className="text-sm">{message}</p>
                </div>
              ),
            )}
          </div>
        )}
        {result.claudeSkills && (
          <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/30 p-4 text-sm text-emerald-50">
            <h4 className="font-semibold">Claude skills</h4>
            {result.claudeSkills.map((skill) => (
              <div key={skill.skill} className="mt-2">
                <p className="text-xs uppercase text-emerald-300">
                  {skill.skill}
                </p>
                <p>{skill.response}</p>
              </div>
            ))}
          </div>
        )}
        {result.geminiInsight && (
          <div className="rounded-2xl border border-yellow-700/50 bg-yellow-500/10 p-4 text-sm text-yellow-50">
            <h4 className="font-semibold">Gemini insight</h4>
            <p>{result.geminiInsight}</p>
          </div>
        )}
      </div>
    </div>
  );
}
