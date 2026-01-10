"use client";

/**
 * Orchestrator Console - Main Component
 * Refactored into smaller, focused components for better maintainability
 */

import { useRef } from "react";
import { specMetadata } from "@/lib/spec";
import { AgentProgressIndicator } from "./orchestrator/AgentProgressIndicator";
import { ErrorDisplay } from "./orchestrator/ErrorDisplay";
import { OrchestratorForm, type OrchestratorFormHandle } from "./orchestrator/OrchestratorForm";
import { RunResultPanel } from "./orchestrator/RunResultPanel";
import { useOrchestratorState, AGENT_STEPS } from "./orchestrator/useOrchestratorState";

export function OrchestratorConsole() {
  const formRef = useRef<OrchestratorFormHandle>(null);

  const {
    // State
    prompt,
    loading,
    result,
    error,
    currentAgentStep,
    fieldErrors,
    materialityThreshold,
    reconciliationData,
    isRunning,

    // Actions
    setPrompt,
    setMaterialityThreshold,
    runAgents,
    handleStop,
    handleFieldErrorClear,
  } = useOrchestratorState(formRef);

  return (
    <section className="theme-card">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-br from-amber-500 to-yellow-500 text-lg">
            ✨
          </div>
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
        <AgentProgressIndicator currentStep={currentAgentStep} steps={AGENT_STEPS} />
      )}

      {/* Form */}
      <OrchestratorForm
        ref={formRef}
        prompt={prompt}
        onPromptChange={setPrompt}
        materialityThreshold={materialityThreshold}
        onMaterialityChange={setMaterialityThreshold}
        fieldErrors={fieldErrors}
        onFieldErrorClear={handleFieldErrorClear}
        onRun={runAgents}
        onStop={handleStop}
        isRunning={isRunning}
        isLoading={loading}
        hasData={!!reconciliationData}
      />

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
      {error && <ErrorDisplay error={error} />}

      {/* Results Display */}
      {result && <RunResultPanel result={result} />}
    </section>
  );
}
