"use client";

import { useState } from "react";
import { specMetadata } from "@/lib/spec";
import { useReconciliationStore } from "@/store/reconciliationStore";
import type { OrchestratorResponse } from "@/types/reconciliation";

type AgentError = {
  message: string;
  detail?: string;
  help?: string[];
  technical?: string;
};

export function OrchestratorConsole() {
  const [prompt, setPrompt] = useState(
    "Reconcile account 1000 inventory roll-forward for October close.",
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrchestratorResponse | null>(null);
  const [error, setError] = useState<AgentError | null>(null);

  // Get data from Zustand store
  const reconciliationData = useReconciliationStore(
    (state) => state.reconciliationData,
  );
  const isRunning = useReconciliationStore((state) => state.isRunning);
  const startRun = useReconciliationStore((state) => state.startRun);
  const stopRun = useReconciliationStore((state) => state.stopRun);
  const completeRun = useReconciliationStore((state) => state.completeRun);

  const runAgents = async () => {
    // Validate data exists
    if (!reconciliationData) {
      setError({
        message: "No data to reconcile",
        detail: "You need to upload and map your files first.",
        help: [
          "Upload GL and Subledger balance files",
          "Map the columns to canonical fields",
          "Click 'Apply Mappings' to transform the data",
        ],
      });
      return;
    }

    // Create abort controller for stop functionality
    const abortController = new AbortController();
    const runId = `run_${Date.now()}`;

    startRun(runId, abortController);
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/agent/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: prompt,
          payload: reconciliationData, // ✅ Using real data from Zustand!
        }),
        signal: abortController.signal,
      });

      const data = await response.json();

      // Debug: Log the full response
      console.log("🔍 API Response:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        // Extract error details - handle both old and new formats
        let details: string | undefined;
        if (Array.isArray(data?.errors)) {
          // New format: array of user-friendly errors
          details = data.errors.join("\n\n");
        } else if (data?.issues) {
          // Old format: Zod validation issues
          details = extractValidationDetails(data.issues);
        } else if (data?.detail) {
          details = data.detail as string;
        }

        const message =
          (data?.message as string | undefined) ??
          (data?.error as string | undefined) ??
          "Agent run failed";

        const help = Array.isArray(data?.help)
          ? (data.help.filter(Boolean) as string[])
          : undefined;

        setError({
          message,
          detail: details,
          help,
          technical: data?.technical as string | undefined,
        });
        completeRun();
        return;
      }

      setResult(data);
      completeRun();
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError({
          message: "Reconciliation stopped by user",
          detail: "The agent run was cancelled.",
        });
      } else {
        const technical = err instanceof Error ? err.message : String(err);
        setError({
          message: "Agent run failed",
          detail: "We couldn't complete the agent run from the web app.",
          help: [
            "Try again in a few seconds.",
            "If this continues, confirm the agent service is running.",
          ],
          technical,
        });
      }
      completeRun();
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    stopRun();
    setLoading(false);
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
            Launch Gemini AI agents for reconciliation analysis, bound by Spec-Kit
            schema v{specMetadata.version}.
          </p>
        </div>
        <div className="flex gap-2">
          {isRunning ? (
            <button
              type="button"
              onClick={handleStop}
              className="rounded-full bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
            >
              🛑 Stop Agents
            </button>
          ) : (
            <button
              type="button"
              onClick={runAgents}
              disabled={!reconciliationData || loading}
              className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
            >
              {loading ? "Running..." : "🤖 Run Agents"}
            </button>
          )}
        </div>
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

      {/* Data Status */}
      {!reconciliationData && (
        <div className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
          <p className="font-semibold">⚠️ No data ready</p>
          <p className="mt-1 text-amber-100/90">
            Upload files and apply column mappings before running agents.
          </p>
        </div>
      )}

      {reconciliationData && !result && !error && (
        <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p className="font-semibold">✓ Data ready to reconcile</p>
          <p className="mt-1 text-emerald-100/90">
            {reconciliationData.glBalances.length} GL balances,{" "}
            {reconciliationData.subledgerBalances.length} subledger balances
            {reconciliationData.transactions &&
              `, ${reconciliationData.transactions.length} transactions`}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-100">
          <p className="font-semibold">{error.message}</p>
          {error.detail ? (
            <p className="mt-1 text-sm text-rose-100/90">{error.detail}</p>
          ) : null}
          {error.help && error.help.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-rose-100/90">
              {error.help.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {error.technical ? (
            <details className="mt-3 text-xs text-rose-100/80">
              <summary className="cursor-pointer select-none font-semibold uppercase tracking-[0.3em] text-rose-100/70 hover:text-rose-100">
                Show details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl border border-rose-500/20 bg-black/30 p-3 text-[11px] text-rose-50/90">
                {error.technical}
              </pre>
            </details>
          ) : null}
        </div>
      )}

      {/* Results Display */}
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
      ? `"${fieldKey.replace(/_/g, " ")}"`
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

function RunResultPanel({ result }: { result: OrchestratorResponse }) {
  return (
    <div className="mt-6 space-y-4">
      {/* Timeline */}
      {result.timeline && result.timeline.length > 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-black/40 p-4">
          <h3 className="text-sm font-semibold text-white">
            Timeline · {result.runId}
          </h3>
          <ol className="mt-3 space-y-2 text-sm text-slate-200">
            {result.timeline.map((entry) => (
            <li
              key={entry.stage + entry.timestamp}
              className="rounded-xl border border-slate-800/70 bg-slate-950/60 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold capitalize">
                  {entry.stage.replace(/_/g, " ")}
                </span>
                <span
                  className={`text-xs font-medium uppercase ${
                    entry.status === "completed"
                      ? "text-emerald-400"
                      : entry.status === "failed"
                        ? "text-rose-400"
                        : entry.status === "in_progress"
                          ? "text-sky-400"
                          : "text-slate-400"
                  }`}
                >
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
      )}

      {/* Gemini Agent Results */}
      {result.geminiAgents && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">
            🤖 Gemini AI Agent Results (FREE)
          </h3>

          {/* Debug info */}
          {console.log("🔍 Gemini Agents Data:", {
            hasValidation: !!result.geminiAgents.validation,
            hasAnalysis: !!result.geminiAgents.analysis,
            hasInvestigation: !!result.geminiAgents.investigation,
            hasReport: !!result.geminiAgents.report,
            reportType: typeof result.geminiAgents.report,
          })}

          {/* Validation */}
          {result.geminiAgents.validation && (
            <div className="rounded-2xl border border-blue-800/40 bg-blue-950/30 p-4">
              <h4 className="font-semibold text-blue-100">
                1️⃣ Data Validation Agent
              </h4>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-blue-200">Confidence Score:</span>
                  <span className="font-semibold text-blue-100">
                    {result.geminiAgents.validation.confidence
                      ? Math.round(result.geminiAgents.validation.confidence * 100)
                      : "N/A"}/100
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-blue-200">Validation Status:</span>
                  <span className="font-semibold text-blue-100">
                    {result.geminiAgents.validation.isValid ? "✓ Valid" : "⚠️ Issues Found"}
                  </span>
                </div>
              </div>
              {result.geminiAgents.validation.warnings && result.geminiAgents.validation.warnings.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-blue-300">Warnings</p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-blue-200/80">
                    {result.geminiAgents.validation.warnings.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Analysis */}
          {result.geminiAgents.analysis && (
            <div className="rounded-2xl border border-purple-800/40 bg-purple-950/30 p-4">
              <h4 className="font-semibold text-purple-100">
                2️⃣ Reconciliation Analyst Agent
              </h4>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-purple-200">Risk Level:</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                      result.geminiAgents.analysis.riskLevel === "high"
                        ? "bg-rose-500/20 text-rose-300"
                        : result.geminiAgents.analysis.riskLevel === "medium"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {result.geminiAgents.analysis.riskLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-purple-200">Material Variances:</span>
                  <span className="font-semibold text-purple-100">
                    {result.geminiAgents.analysis.materialVariances?.length || 0}
                  </span>
                </div>
              </div>
              {result.geminiAgents.analysis.patterns && result.geminiAgents.analysis.patterns.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-purple-300">
                    Patterns Detected
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-purple-200/80">
                    {result.geminiAgents.analysis.patterns.map((p: string, i: number) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Investigation */}
          {(result.geminiAgents.investigation?.investigations?.length ?? 0) > 0 && (
            <div className="rounded-2xl border border-orange-800/40 bg-orange-950/30 p-4">
              <h4 className="font-semibold text-orange-100">
                3️⃣ Variance Investigator Agent
              </h4>
              <div className="mt-3 space-y-3">
                {result.geminiAgents.investigation?.investigations?.map(
                  (inv: any, i: number) => (
                    <div key={i} className="rounded-xl border border-orange-700/40 bg-orange-900/20 p-3">
                      <p className="font-semibold text-sm text-orange-100">
                        Account: {inv.account} (Variance: ${inv.variance?.toFixed(2)})
                      </p>
                      {inv.possibleCauses && inv.possibleCauses.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold uppercase text-orange-300">
                            Possible Causes
                          </p>
                          <ul className="mt-1 list-disc pl-5 text-sm text-orange-200/80">
                            {inv.possibleCauses.map((cause: string, j: number) => (
                              <li key={j}>{cause}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {inv.suggestedActions && inv.suggestedActions.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold uppercase text-orange-300">
                            Suggested Actions
                          </p>
                          <ul className="mt-1 list-disc pl-5 text-sm text-orange-200/80">
                            {inv.suggestedActions.map((action: string, j: number) => (
                              <li key={j}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          )}

          {/* Report */}
          {result.geminiAgents.report && (
            <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/30 p-4">
              <h4 className="font-semibold text-emerald-100">
                4️⃣ Report Generator Agent
              </h4>
              <div className="mt-3 prose prose-invert prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm text-emerald-100/90">
                  {typeof result.geminiAgents.report === 'string'
                    ? result.geminiAgents.report
                    : JSON.stringify(result.geminiAgents.report, null, 2)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
