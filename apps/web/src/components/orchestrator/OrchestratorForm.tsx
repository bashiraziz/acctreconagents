"use client";

/**
 * Orchestrator Form Component
 * Form inputs for analysis prompt and materiality threshold
 */

import { useRef, forwardRef, useImperativeHandle } from "react";
import type { UserOrganization } from "@/types/reconciliation";

export interface OrchestratorFormData {
  prompt: string;
  materialityThreshold: number;
}

export interface OrchestratorFormProps {
  prompt: string;
  onPromptChange: (value: string) => void;
  materialityThreshold: number;
  onMaterialityChange: (value: number) => void;
  organizations: UserOrganization[];
  selectedOrganizationId: string;
  onOrganizationChange: (id: string) => void;
  isOrganizationsLoading: boolean;
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
      organizations,
      selectedOrganizationId,
      onOrganizationChange,
      isOrganizationsLoading,
      fieldErrors,
      onFieldErrorClear,
      onRun,
      onStop,
      isRunning,
      isLoading,
      hasData,
    },
    ref,
  ) {
    const promptRef = useRef<HTMLTextAreaElement>(null);
    const materialityRef = useRef<HTMLInputElement>(null);

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

        <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
          <label className="text-xs font-medium uppercase theme-text-muted">
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

          <div className="rounded-xl border theme-border theme-muted p-3 text-xs theme-text-muted">
            <p className="font-medium uppercase text-[11px] theme-text">How threshold works</p>
            <p className="mt-2">
              Variances above this amount are flagged as material and need follow-up.
              Lower values increase sensitivity.
            </p>
            {materialityThreshold === 0 && (
              <p className="alert alert-warning mt-2 px-2 py-1 text-xs">
                Threshold 0 means every variance, even 0.01, is marked material.
              </p>
            )}
          </div>
        </div>

        {organizations.length > 0 && (
          <div className="rounded-xl border theme-border theme-muted p-3">
            <label className="text-xs font-medium uppercase theme-text-muted">
              Organization
              <select
                className="mt-2 w-full rounded border px-3 py-2 text-sm theme-text focus:outline-none theme-border theme-card"
                value={selectedOrganizationId}
                onChange={(event) => onOrganizationChange(event.target.value)}
                disabled={isOrganizationsLoading}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}{org.isDefault ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs theme-text-muted">
              This selection prints above the report title for this run.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          {isRunning ? (
            <button
              type="button"
              onClick={onStop}
              className="btn btn-danger btn-md"
            >
              Stop Agents
            </button>
          ) : (
            <button
              type="button"
              onClick={onRun}
              disabled={!hasData || isLoading}
              className="btn btn-primary btn-md"
            >
              {isLoading ? "Illuminating..." : "Illuminate"}
            </button>
          )}
        </div>
      </div>
    );
  },
);
