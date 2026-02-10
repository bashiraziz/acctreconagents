"use client";

/**
 * Orchestrator Console - Main Component
 * Coordinates form input, run state, progress, and output display.
 */

import { useRef } from "react";
import { specMetadata } from "@/lib/spec";
import { AgentProgressIndicator } from "./orchestrator/AgentProgressIndicator";
import { ErrorDisplay } from "./orchestrator/ErrorDisplay";
import {
  OrchestratorForm,
  type OrchestratorFormHandle,
} from "./orchestrator/OrchestratorForm";
import { RunResultPanel } from "./orchestrator/RunResultPanel";
import { useOrchestratorState, AGENT_STEPS } from "./orchestrator/useOrchestratorState";

export function OrchestratorConsole() {
  const formRef = useRef<OrchestratorFormHandle>(null);

  const {
    prompt,
    loading,
    result,
    error,
    currentAgentStep,
    fieldErrors,
    materialityThreshold,
    reconciliationData,
    isRunning,
    organizations,
    selectedOrganizationId,
    isOrganizationsLoading,
    setPrompt,
    setMaterialityThreshold,
    setSelectedOrganizationId,
    runAgents,
    handleStop,
    retryReport,
    isRetryingReport,
    handleFieldErrorClear,
  } = useOrchestratorState(formRef);

  return (
    <section className="ui-panel">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="ui-kicker text-amber-400">
            AI Reconciliation
          </p>
          <h2 className="ui-title mt-1">
            Multi-agent console
          </h2>
          <p className="ui-copy mt-1">
            Run validation, analysis, investigation, and report generation using schema v{specMetadata.version}.
          </p>
        </div>
        <div className="rounded-full border theme-border theme-muted px-3 py-1 text-xs theme-text-muted">
          4 agents
        </div>
      </header>

      {loading && (
        <AgentProgressIndicator currentStep={currentAgentStep} steps={AGENT_STEPS} />
      )}

      <OrchestratorForm
        ref={formRef}
        prompt={prompt}
        onPromptChange={setPrompt}
        materialityThreshold={materialityThreshold}
        onMaterialityChange={setMaterialityThreshold}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isOrganizationsLoading={isOrganizationsLoading}
        fieldErrors={fieldErrors}
        onFieldErrorClear={handleFieldErrorClear}
        onRun={runAgents}
        onStop={handleStop}
        isRunning={isRunning}
        isLoading={loading}
        hasData={!!reconciliationData}
      />

      {!reconciliationData && (
        <div className="mt-4 rounded-xl border theme-border theme-muted p-4 text-sm theme-text">
          <p className="font-semibold">No data ready</p>
          <p className="mt-1 theme-text-muted">
            Upload files and apply mappings before running agents.
          </p>
        </div>
      )}

      {reconciliationData && !result && !error && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
          <p className="font-semibold text-amber-100">Data ready to reconcile</p>
          <p className="mt-1 text-amber-200/90">
            {reconciliationData.glBalances.length} GL balances, {" "}
            {reconciliationData.subledgerBalances.length} subledger balances
            {reconciliationData.transactions &&
              `, ${reconciliationData.transactions.length} transactions`}
          </p>
        </div>
      )}

      {error && <ErrorDisplay error={error} />}
      {result && (
        <RunResultPanel
          result={result}
          onRetryReport={retryReport}
          isRetryingReport={isRetryingReport}
        />
      )}
    </section>
  );
}
