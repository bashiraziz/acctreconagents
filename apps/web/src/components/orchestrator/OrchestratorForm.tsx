"use client";

/**
 * Orchestrator Form Component
 * Form inputs for analysis prompt and materiality threshold
 */

import { useRef, forwardRef, useImperativeHandle } from "react";

export interface OrchestratorFormData {
  prompt: string;
  materialityThreshold: number;
}

export interface OrchestratorFormProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  materialityThreshold: number;
  onMaterialityChange: (value: number) => void;
  fieldErrors: Record<string, string>;
  onFieldErrorClear: (field: string) => void;
  onRun: () => void;
  onStop: () => void;
  isRunning: boolean;
  isLoading: boolean;
  hasData: boolean;
}

export interface OrchestratorFormHandle {
  focusPrompt: () => void;
  focusMateriality: () => void;
}

export const OrchestratorForm = forwardRef<OrchestratorFormHandle, OrchestratorFormProps>(
  function OrchestratorForm(
    {
      prompt,
      onPromptChange,
      materialityThreshold,
      onMaterialityChange,
      fieldErrors,
      onFieldErrorClear,
      onRun,
      onStop,
      isRunning,
      isLoading,
      hasData,
    },
    ref
  ) {
    const promptRef = useRef<HTMLTextAreaElement>(null);
    const materialityRef = useRef<HTMLInputElement>(null);

    // Expose focus methods to parent
    useImperativeHandle(ref, () => ({
      focusPrompt: () => {
        if (promptRef.current) {
          promptRef.current.focus();
          promptRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
      focusMateriality: () => {
        if (materialityRef.current) {
          materialityRef.current.focus();
          materialityRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      },
    }));

    return (
      <div className="mt-4 space-y-4">
        {/* Analysis Prompt */}
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
            onChange={(e) => {
              onPromptChange(e.target.value);
              if (fieldErrors.prompt) {
                onFieldErrorClear("prompt");
              }
            }}
            placeholder="Example: Reconcile account 1000 inventory for October close."
          />
          {fieldErrors.prompt && (
            <p className="mt-1 text-xs text-red-400">{fieldErrors.prompt}</p>
          )}
        </label>

        {/* Materiality Threshold */}
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
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (value >= 0) {
                    onMaterialityChange(value);
                    if (fieldErrors.materiality) {
                      onFieldErrorClear("materiality");
                    }
                  }
                }}
                placeholder="50"
              />
            </div>
            {fieldErrors.materiality && (
              <p className="mt-1 text-xs text-red-400">{fieldErrors.materiality}</p>
            )}
          </label>

          {/* Help Text */}
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

        {/* Run/Stop Button */}
        <div className="flex justify-end pt-2">
          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              className="rounded bg-red-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              Stop Agents
            </button>
          ) : (
            <button
              type="button"
              onClick={onRun}
              disabled={!hasData || isLoading}
              className="rounded bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-amber-600 hover:to-yellow-600 disabled:cursor-not-allowed disabled:bg-gray-400 disabled:from-gray-400 disabled:to-gray-400"
            >
              {isLoading ? "Illuminating... ✨" : "Illuminate ✨"}
            </button>
          )}
        </div>
      </div>
    );
  }
);
