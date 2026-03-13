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
    reportingPeriodDefault,
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
    <section id="run-agents" className="ui-panel scroll-mt-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="ui-kicker">
            Step 4
          </p>
          <h2 className="ui-title mt-1">
            Illuminate
          </h2>
          <p className="ui-copy mt-1">
            AI agents validate, analyse variances, investigate, and generate your reconciliation report.
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
        reportingPeriodDefault={reportingPeriodDefault}
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
        <div className="mt-4 rounded-xl border theme-border theme-muted p-6 text-center">
          <p className="text-sm font-semibold theme-text">Nothing to reconcile yet</p>
          <p className="mt-2 text-sm theme-text-muted">
            Complete steps 1–3 first: upload GL and subledger files, map the columns, and apply the mappings.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <a href="#upload-files" className="btn btn-secondary btn-sm">1. Upload files</a>
            <a href="#map-columns" className="btn btn-secondary btn-sm">2. Map columns</a>
            <a href="#preview-data" className="btn btn-secondary btn-sm">3. Preview data</a>
          </div>
        </div>
      )}

      {reconciliationData && !result && !error && (
        <div className="reconcile-ready-card mt-4 rounded-xl border p-4 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="reconcile-ready-title font-semibold">Data ready to reconcile</p>
              <p className="reconcile-ready-body mt-1 text-xs">
                {reconciliationData.glBalances.length} GL balance{reconciliationData.glBalances.length !== 1 ? "s" : ""},{" "}
                {reconciliationData.subledgerBalances.length} subledger balance{reconciliationData.subledgerBalances.length !== 1 ? "s" : ""}
                {reconciliationData.transactions && reconciliationData.transactions.length > 0
                  ? `, ${reconciliationData.transactions.length} transaction${reconciliationData.transactions.length !== 1 ? "s" : ""}`
                  : ""}
              </p>
            </div>
            <span className="badge badge-success">Ready</span>
          </div>
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
