"use client";

/**
 * Run Result Panel Component
 * Displays reconciliation results including AI agent outputs
 */

import type { OrchestratorResponse, GeminiAgentStatus, Investigation } from "@/types/reconciliation";

interface RunResultPanelProps {
  result: OrchestratorResponse;
}

export function RunResultPanel({ result }: RunResultPanelProps) {
  // Check if any Gemini agents hit rate limits
  const hasRateLimitIssue: boolean =
    result.geminiAgents && result.geminiAgents.status
      ? Object.values(result.geminiAgents.status).some(
          (s: GeminiAgentStatus) => s.usedFallback && s.error?.includes("429")
        )
      : false;
  const firstAgentError =
    result.geminiAgents && result.geminiAgents.status
      ? Object.values(result.geminiAgents.status)
          .map((s) => s.error)
          .find((error): error is string => Boolean(error))
      : undefined;
  const friendlyAgentError = firstAgentError
    ? toUserFriendlyAgentError(firstAgentError)
    : null;

  return (
    <div className="mt-6 space-y-4">
      {friendlyAgentError && (
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="font-semibold text-amber-100">
            {friendlyAgentError.title}
          </p>
          <p className="mt-1 text-sm text-amber-200/80">
            {friendlyAgentError.message}
          </p>
        </div>
      )}
      {/* Rate Limit Warning */}
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

          {/* Validation Agent */}
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

          {/* Analysis Agent */}
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

          {/* Investigation Agent */}
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
                  (inv: Investigation, i: number) => (
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

          {/* Report Agent */}
          {result.geminiAgents?.report && (
            <div className="rounded-2xl border theme-border theme-card p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold theme-text">
                  4️⃣ Report Generator Agent
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const reportText = typeof result.geminiAgents?.report === 'string'
                          ? result.geminiAgents.report
                          : "";
                        await navigator.clipboard.writeText(reportText);
                        const btn = document.activeElement as HTMLButtonElement;
                        const originalText = btn.textContent;
                        btn.textContent = "✓ Copied!";
                        setTimeout(() => {
                          btn.textContent = originalText;
                        }, 2000);
                      } catch (err) {
                        console.error("Failed to copy:", err);
                      }
                    }}
                    className="rounded-lg bg-purple-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-purple-500"
                    title="Copy to Clipboard"
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={() => {
                      const reportText = typeof result.geminiAgents?.report === 'string'
                        ? result.geminiAgents.report
                        : "";
                      const blob = new Blob([reportText], { type: "text/markdown" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `reconciliation-report-${new Date().toISOString().split('T')[0]}.md`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-emerald-500"
                    title="Download as Markdown"
                  >
                    📄 MD
                  </button>
                  <button
                    onClick={() => {
                      const reportText = typeof result.geminiAgents?.report === 'string'
                        ? result.geminiAgents.report
                        : "";
                      const blob = new Blob([reportText], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `reconciliation-report-${new Date().toISOString().split('T')[0]}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="rounded-lg bg-sky-600 px-2 py-1 text-xs font-medium text-white transition hover:bg-sky-500"
                    title="Download as Text"
                  >
                    📝 TXT
                  </button>
                  <GeminiAgentStatusBadge status={result.geminiAgents.status?.report} />
                </div>
              </div>
              <div className="mt-3">
                <div className="whitespace-pre-wrap text-sm theme-text/90">
                  {typeof result.geminiAgents.report === 'string'
                    ? formatReportOutput(result.geminiAgents.report)
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
        {(status.retryCount ?? 0) > 0 && (
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
            title={toUserFriendlyAgentError(status.error).message}
          >
            {toUserFriendlyAgentError(status.error).badge}
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

function toUserFriendlyAgentError(error: string) {
  const normalized = error.toLowerCase();
  if (normalized.includes("429") || normalized.includes("rate limit") || normalized.includes("quota")) {
    return {
      title: "AI analysis temporarily limited",
      message:
        "The AI provider rate-limited this request. The reconciliation still ran, but some insights are limited. Try again later or add your own Gemini API key.",
      badge: "Rate limit",
    };
  }
  if (normalized.includes("timeout")) {
    return {
      title: "AI request timed out",
      message: "The AI provider did not respond in time. You can retry the run or try again in a few minutes.",
      badge: "Timeout",
    };
  }
  if (
    normalized.includes("enotfound") ||
    normalized.includes("econnrefused") ||
    normalized.includes("econnreset")
  ) {
    return {
      title: "AI service connection failed",
      message: "We could not reach the AI service. Check network connectivity and try again.",
      badge: "Connection",
    };
  }
  return {
    title: "AI analysis encountered an error",
    message:
      "Some AI steps failed, but the reconciliation still completed. You can retry the run for a full report.",
    badge: "Error",
  };
}

function formatReportOutput(report: string) {
  const lower = report.toLowerCase();
  if (lower.includes("unable to generate full report")) {
    return "The report could not be generated due to an upstream AI error. The reconciliation completed, but the report is incomplete. Try again later or provide your own Gemini API key for higher reliability.";
  }
  return report;
}
