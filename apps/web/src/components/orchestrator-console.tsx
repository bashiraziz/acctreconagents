"use client";

import { useState, useEffect, useRef } from "react";
import { specMetadata } from "@/lib/spec";
import { useReconciliationStore } from "@/store/reconciliationStore";
import type { OrchestratorResponse } from "@/types/reconciliation";

type AgentError = {
  message: string;
  detail?: string;
  help?: string[];
  technical?: string;
};

const AGENT_STEPS = [
  { id: 1, name: "Data Validation Agent", description: "Validating data quality and completeness" },
  { id: 2, name: "Reconciliation Analyst Agent", description: "Analyzing variances and patterns" },
  { id: 3, name: "Variance Investigator Agent", description: "Investigating material variances" },
  { id: 4, name: "Report Generator Agent", description: "Creating audit-ready documentation" },
];

export function OrchestratorConsole() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrchestratorResponse | null>(null);
  const [error, setError] = useState<AgentError | null>(null);
  const [currentAgentStep, setCurrentAgentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Refs for auto-scrolling to error fields
  const promptRef = useRef<HTMLTextAreaElement>(null);
  const materialityRef = useRef<HTMLInputElement>(null);

  // Get data from Zustand store
  const reconciliationData = useReconciliationStore(
    (state) => state.reconciliationData,
  );
  const isRunning = useReconciliationStore((state) => state.isRunning);
  const startRun = useReconciliationStore((state) => state.startRun);
  const stopRun = useReconciliationStore((state) => state.stopRun);
  const completeRun = useReconciliationStore((state) => state.completeRun);
  const materialityThreshold = useReconciliationStore((state) => state.materialityThreshold);
  const setMaterialityThreshold = useReconciliationStore((state) => state.setMaterialityThreshold);

  // Clear results when reconciliation data is cleared
  useEffect(() => {
    if (!reconciliationData) {
      setResult(null);
      setError(null);
      setFieldErrors({});
    }
  }, [reconciliationData]);

  // Simulate agent progress
  useEffect(() => {
    if (!loading) {
      setCurrentAgentStep(0);
      return;
    }

    // Cycle through agents to show progress
    const interval = setInterval(() => {
      setCurrentAgentStep((prev) => {
        if (prev >= AGENT_STEPS.length - 1) return prev;
        return prev + 1;
      });
    }, 8000); // Change agent every 8 seconds

    return () => clearInterval(interval);
  }, [loading]);

  // Helper function to extract field errors from error message
  const extractFieldErrors = (errorMessage: string | undefined): Record<string, string> => {
    if (!errorMessage) return {};

    const errors: Record<string, string> = {};

    // Parse error messages like: Field "userPrompt": Too small: expected string to have >=1 characters
    const fieldErrorPattern = /Field "(\w+)":\s*(.+?)(?=\n|$)/gi;
    let match;

    while ((match = fieldErrorPattern.exec(errorMessage)) !== null) {
      const fieldName = match[1];
      const errorText = match[2];

      // Map API field names to UI field names
      if (fieldName === "userPrompt") {
        errors.prompt = errorText;
      } else if (fieldName === "materialityThreshold") {
        errors.materiality = errorText;
      }
    }

    return errors;
  };

  // Helper function to scroll to first error field
  const scrollToFirstError = (errors: Record<string, string>) => {
    if (errors.prompt && promptRef.current) {
      promptRef.current.focus();
      promptRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (errors.materiality && materialityRef.current) {
      materialityRef.current.focus();
      materialityRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const runAgents = async () => {
    // Clear any previous field errors
    setFieldErrors({});

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
          materialityThreshold, // ✅ User-defined materiality threshold
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
          details = extractValidationDetails(data.issues) ?? undefined;
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

        // Extract field-level errors and highlight them
        const errors = extractFieldErrors(details);
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          // Auto-scroll to first error field after a brief delay
          setTimeout(() => scrollToFirstError(errors), 100);
        }

        completeRun();
        return;
      }

      setResult(data);
      setFieldErrors({}); // Clear any field errors on success
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
    <section className="theme-card theme-border border p-6">
      <header>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] theme-text-muted">
            Orchestrator
          </p>
          <h2 className="mt-2 text-2xl font-semibold theme-text">
            Multi-agent console
          </h2>
          <p className="mt-1 text-sm theme-text-muted">
            Launch Gemini AI agents for reconciliation analysis, bound by Spec-Kit
            schema v{specMetadata.version}.
          </p>
        </div>
      </header>

      {/* Agent Progress Indicator */}
      {loading && (
        <div className="mt-4 rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-100">
                {AGENT_STEPS[currentAgentStep].name}
              </p>
              <p className="text-xs text-blue-200/80">
                {AGENT_STEPS[currentAgentStep].description}
              </p>
              <p className="mt-1 text-xs font-medium text-blue-300">
                Step {currentAgentStep + 1} of {AGENT_STEPS.length}
              </p>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-blue-900/30">
            <div
              className="h-full bg-blue-500 transition-all duration-500"
              style={{
                width: `${((currentAgentStep + 1) / AGENT_STEPS.length) * 100}%`,
              }}
            ></div>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-4">
        <label className="text-xs font-medium uppercase theme-text-muted">
          Analysis Prompt
          <textarea
            ref={promptRef}
            className={`mt-2 w-full rounded border p-3 text-sm theme-text focus:outline-none ${
              fieldErrors.prompt
                ? "border-red-500 bg-red-500/5 focus:border-red-500"
                : "theme-border theme-card focus:theme-border"
            }`}
            rows={3}
            value={prompt}
            onChange={(event) => {
              setPrompt(event.target.value);
              // Clear error when user starts typing
              if (fieldErrors.prompt) {
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.prompt;
                  return next;
                });
              }
            }}
            placeholder="Example: Reconcile account 1000 inventory for October close."
          />
          {fieldErrors.prompt && (
            <p className="mt-1 text-xs text-red-400">
              {fieldErrors.prompt}
            </p>
          )}
        </label>

        <div className="flex items-center gap-4">
          <label className="flex-1 text-xs font-medium uppercase theme-text-muted">
            Materiality Threshold
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm theme-text">$</span>
              <input
                ref={materialityRef}
                type="number"
                min="0"
                step="1"
                className={`flex-1 rounded border px-3 py-2 text-sm theme-text focus:outline-none ${
                  fieldErrors.materiality
                    ? "border-red-500 bg-red-500/5 focus:border-red-500"
                    : "theme-border theme-card focus:theme-border"
                }`}
                value={materialityThreshold}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  if (value >= 0) {
                    setMaterialityThreshold(value);
                    // Clear error when user changes value
                    if (fieldErrors.materiality) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.materiality;
                        return next;
                      });
                    }
                  }
                }}
                placeholder="50"
              />
            </div>
            {fieldErrors.materiality && (
              <p className="mt-1 text-xs text-red-400">
                {fieldErrors.materiality}
              </p>
            )}
          </label>
          <div className="flex-1 text-xs theme-text-muted">
            <p className="font-medium uppercase theme-text-muted mb-2">What is this?</p>
            <p>
              Variances above this amount are flagged as material and require investigation.
              Lower values = stricter reconciliation.
            </p>
            {materialityThreshold === 0 && (
              <p className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
                ⚠️ Threshold of $0 means ALL variances (even $0.01) will be flagged as material.
              </p>
            )}
          </div>
        </div>

        {/* Run/Stop Agents Button */}
        <div className="flex justify-end pt-2">
          {isRunning ? (
            <button
              type="button"
              onClick={handleStop}
              className="rounded bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Stop Agents
            </button>
          ) : (
            <button
              type="button"
              onClick={runAgents}
              disabled={!reconciliationData || loading}
              className="rounded bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-amber-600 hover:to-yellow-600 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400"
            >
              {loading ? "Illuminating... ✨" : "Illuminate ✨"}
            </button>
          )}
        </div>
      </div>

      {/* Data Status */}
      {!reconciliationData && (
        <div className="mt-4 rounded border theme-border theme-muted p-4 text-sm theme-text">
          <p className="font-semibold">No data ready</p>
          <p className="mt-1 theme-text">
            Upload files and apply column mappings before running agents.
          </p>
        </div>
      )}

      {reconciliationData && !result && !error && (
        <div className="mt-4 rounded border theme-border theme-card p-4 text-sm theme-text">
          <p className="font-semibold">Data ready to reconcile</p>
          <p className="mt-1 theme-text">
            {reconciliationData.glBalances.length} GL balances,{" "}
            {reconciliationData.subledgerBalances.length} subledger balances
            {reconciliationData.transactions &&
              `, ${reconciliationData.transactions.length} transactions`}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 rounded border theme-border theme-muted p-4 text-sm theme-text">
          <p className="font-semibold">Error: {error.message}</p>
          {error.detail ? (
            <p className="mt-1 text-sm theme-text">{error.detail}</p>
          ) : null}
          {error.help && error.help.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm theme-text">
              {error.help.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {error.technical ? (
            <details className="mt-3 text-xs theme-text">
              <summary className="cursor-pointer select-none font-medium uppercase theme-text hover:theme-text">
                Show Details
              </summary>
              <pre className="mt-2 whitespace-pre-wrap rounded border theme-border theme-muted p-3 text-[11px] theme-text">
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
  // Check if any Gemini agents hit rate limits
  const hasRateLimitIssue = result.geminiAgents?.status &&
    Object.values(result.geminiAgents.status).some(
      (s: any) => s.usedFallback && s.error?.includes("429")
    );

  return (
    <div className="mt-6 space-y-4">
      {/* Rate Limit Warning - Only shown when quota hit */}
      {hasRateLimitIssue && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              ⚠️
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-100">
                AI Analysis Quota Reached
              </p>
              <p className="mt-1 text-sm text-amber-200/80">
                Some AI agents used fallback analysis due to shared quota limits. Your reconciliation is complete, but AI insights may be limited.
              </p>
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <p className="text-xs font-semibold text-amber-200">
                  💡 Get Unlimited AI Analysis (Free!)
                </p>
                <p className="mt-1 text-xs text-amber-200/70">
                  Use your own Google Gemini API key to avoid quotas:
                </p>
                <ol className="mt-2 space-y-1 text-xs text-amber-200/70">
                  <li>
                    1. Get a free key at:{" "}
                    <a
                      href="https://ai.google.dev/gemini-api/docs/api-key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-amber-100"
                    >
                      ai.google.dev/gemini-api
                    </a>
                  </li>
                  <li>
                    2. Set{" "}
                    <code className="rounded bg-amber-900/30 px-1 py-0.5 font-mono text-amber-100">
                      GEMINI_API_KEY=your-key
                    </code>{" "}
                    in your{" "}
                    <code className="rounded bg-amber-900/30 px-1 py-0.5 font-mono text-amber-100">
                      .env
                    </code>{" "}
                    file
                  </li>
                  <li>3. Restart the orchestrator service</li>
                  <li>4. ✅ Enjoy unlimited AI analysis!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      {result.timeline && result.timeline.length > 0 && (
        <div className="rounded-2xl border border-slate-800/80 bg-black/40 p-4">
          <h3 className="text-sm font-semibold theme-text">
            Timeline · {result.runId}
          </h3>
          <ol className="mt-3 space-y-2 text-sm theme-text-muted">
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
                          : "theme-text-muted"
                  }`}
                >
                  {entry.status}
                </span>
              </div>
              <p className="mt-1 text-xs theme-text-muted">{entry.detail}</p>
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
          <h3 className="text-lg font-semibold theme-text">
            🤖 Gemini AI Agent Results (FREE)
          </h3>

          {/* Validation */}
          {result.geminiAgents.validation && (
            <div className="rounded-2xl border theme-border theme-card p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold theme-text">
                  1️⃣ Data Validation Agent
                </h4>
                <GeminiAgentStatusBadge status={result.geminiAgents.status?.validation} />
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="theme-text-muted">Confidence Score:</span>
                  <span className="font-semibold theme-text">
                    {result.geminiAgents.validation.confidence
                      ? Math.round(result.geminiAgents.validation.confidence * 100)
                      : "N/A"}/100
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="theme-text-muted">Validation Status:</span>
                  <span className="font-semibold theme-text">
                    {result.geminiAgents.validation.isValid ? "✓ Valid" : "⚠️ Issues Found"}
                  </span>
                </div>
              </div>
              {result.geminiAgents.validation.warnings && result.geminiAgents.validation.warnings.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-blue-300">Warnings</p>
                  <ul className="mt-1 list-disc pl-5 text-sm theme-text-muted/80">
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
            <div className="rounded-2xl border theme-border theme-card p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold theme-text">
                  2️⃣ Reconciliation Analyst Agent
                </h4>
                <GeminiAgentStatusBadge status={result.geminiAgents.status?.analysis} />
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="theme-text-muted">Risk Level:</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${
                      result.geminiAgents.analysis.riskLevel === "high"
                        ? "bg-gray-900/20 text-rose-300"
                        : result.geminiAgents.analysis.riskLevel === "medium"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {result.geminiAgents.analysis.riskLevel}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="theme-text-muted">Material Variances:</span>
                  <span className="font-semibold theme-text">
                    {result.geminiAgents.analysis.materialVariances?.length || 0}
                  </span>
                </div>
              </div>
              {result.geminiAgents.analysis.patterns && result.geminiAgents.analysis.patterns.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold uppercase text-purple-300">
                    Patterns Detected
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-sm theme-text-muted/80">
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
            <div className="rounded-2xl border theme-border theme-card p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold theme-text">
                  3️⃣ Variance Investigator Agent
                </h4>
                <GeminiAgentStatusBadge status={result.geminiAgents.status?.investigation} />
              </div>
              <div className="mt-3 space-y-3">
                {result.geminiAgents.investigation?.investigations?.map(
                  (inv: any, i: number) => (
                    <div key={i} className="rounded-xl border border-orange-700/40 bg-orange-900/20 p-3">
                      <p className="font-semibold text-sm theme-text">
                        Account: {inv.account} (Variance: ${inv.variance?.toFixed(2)})
                      </p>
                      {inv.possibleCauses && inv.possibleCauses.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold uppercase text-orange-300">
                            Possible Causes
                          </p>
                          <ul className="mt-1 list-disc pl-5 text-sm theme-text-muted/80">
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
                          <ul className="mt-1 list-disc pl-5 text-sm theme-text-muted/80">
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
            <div className="rounded-2xl border theme-border theme-card p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold theme-text">
                  4️⃣ Report Generator Agent
                </h4>
                <GeminiAgentStatusBadge status={result.geminiAgents.status?.report} />
              </div>
              <div className="mt-3 prose prose-invert prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm theme-text/90">
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

type GeminiAgentStatus = {
  success: boolean;
  retryCount?: number;
  usedFallback: boolean;
  error?: string;
};

function GeminiAgentStatusBadge({ status }: { status?: GeminiAgentStatus }) {
  if (!status) {
    return (
      <span className="rounded-full bg-gray-500/20 px-2 py-1 text-xs font-medium text-gray-400">
        No Status
      </span>
    );
  }

  if (status.success) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300">
          ✓ AI Success
        </span>
        {status.retryCount && status.retryCount > 0 && (
          <span className="rounded-full bg-amber-500/20 px-2 py-1 text-xs font-medium text-amber-300">
            {status.retryCount} {status.retryCount === 1 ? 'retry' : 'retries'}
          </span>
        )}
      </div>
    );
  }

  if (status.usedFallback) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-orange-500/20 px-2 py-1 text-xs font-medium text-orange-300">
          ⚠ Fallback
        </span>
        {status.error && (
          <span
            className="rounded-full bg-rose-500/20 px-2 py-1 text-xs font-medium text-rose-300"
            title={status.error}
          >
            Rate Limit
          </span>
        )}
      </div>
    );
  }

  return (
    <span className="rounded-full bg-gray-500/20 px-2 py-1 text-xs font-medium text-gray-400">
      Unknown
    </span>
  );
}
