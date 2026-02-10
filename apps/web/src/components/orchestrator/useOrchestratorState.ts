/**
 * Orchestrator State Hook
 * Custom hook for managing orchestrator console state and logic
 */

import { useState, useEffect, useMemo } from "react";
import { useFileUploadStore } from "@/store/fileUploadStore";
import { useAgentRunStore } from "@/store/agentRunStore";
import { useUserPreferencesStore } from "@/store/userPreferencesStore";
import type { OrchestratorResponse, UserOrganization } from "@/types/reconciliation";
import type { AgentError } from "./ErrorDisplay";
import type { OrchestratorFormHandle } from "./OrchestratorForm";

interface AgentStep {
  id: number;
  name: string;
  description: string;
}

export const AGENT_STEPS: AgentStep[] = [
  { id: 1, name: "Data Validation Agent", description: "Validating data quality and completeness" },
  { id: 2, name: "Reconciliation Analyst Agent", description: "Analyzing variances and patterns" },
  { id: 3, name: "Variance Investigator Agent", description: "Investigating material variances" },
  { id: 4, name: "Report Generator Agent", description: "Creating audit-ready documentation" },
];

/**
 * Helper function to make error messages more user-friendly
 */
function humanizeErrorMessage(errorText: string): string {
  if (errorText.includes("Too small") && errorText.includes("string")) {
    return "Prompt is too short. Please enter at least 1 character.";
  }

  return errorText
    .replace(/string/gi, "text")
    .replace(/>=(\d+)/g, "at least $1")
    .replace(/<=(\d+)/g, "at most $1")
    .replace(/>(\d+)/g, "more than $1")
    .replace(/<(\d+)/g, "less than $1");
}

/**
 * Extract field-level errors from API error message
 */
function extractFieldErrors(errorMessage: string | undefined): Record<string, string> {
  if (!errorMessage) return {};

  const errors: Record<string, string> = {};
  const fieldErrorPattern = /Field "(\w+)":\s*(.+?)(?=\n|$)/gi;
  let match;

  while ((match = fieldErrorPattern.exec(errorMessage)) !== null) {
    const fieldName = match[1];
    const errorText = match[2];

    if (fieldName === "userPrompt") {
      errors.prompt = humanizeErrorMessage(errorText);
    } else if (fieldName === "materialityThreshold") {
      errors.materiality = humanizeErrorMessage(errorText);
    }
  }

  return errors;
}

/**
 * Extract validation details from Zod issues
 */
function extractValidationDetails(issues: Record<string, unknown> | undefined): string | null {
  if (!issues) return null;

  const flattened = (issues.fieldErrors as Record<string, unknown>) ?? issues;
  const fragments: string[] = [];

  for (const [field, errors] of Object.entries(flattened)) {
    if (Array.isArray(errors) && errors.length > 0) {
      fragments.push(humanizeIssue(field, String(errors[0] ?? "is invalid")));
    }
  }

  return fragments.length === 0 ? null : fragments.slice(0, 3).join(" | ");
}

/**
 * Humanize validation issue for display
 */
function humanizeIssue(path: string, message: string): string {
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
    fieldKey && fieldKey !== categoryKey ? `"${fieldKey.replace(/_/g, " ")}"` : "";

  const readableMessage = message
    .replace(/required/i, "is required")
    .replace(/invalid/i, "looks invalid");

  return [category, rowLabel, fieldLabel, readableMessage]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Custom hook for orchestrator console state management
 */
export function useOrchestratorState(formRef: React.RefObject<OrchestratorFormHandle | null>) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OrchestratorResponse | null>(null);
  const [error, setError] = useState<AgentError | null>(null);
  const [currentAgentStep, setCurrentAgentStep] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isRetryingReport, setIsRetryingReport] = useState(false);
  const [organizations, setOrganizations] = useState<UserOrganization[]>([]);
  const [isOrganizationsLoading, setIsOrganizationsLoading] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

  // New domain-specific stores
  const reconciliationData = useFileUploadStore((state) => state.reconciliationData);
  const isRunning = useAgentRunStore((state) => state.isRunning);
  const startRun = useAgentRunStore((state) => state.startRun);
  const stopRun = useAgentRunStore((state) => state.stopRun);
  const completeRun = useAgentRunStore((state) => state.completeRun);
  const materialityThreshold = useUserPreferencesStore((state) => state.materialityThreshold);
  const setMaterialityThreshold = useUserPreferencesStore((state) => state.setMaterialityThreshold);

  // Clear results when reconciliation data changes
  useEffect(() => {
    if (!reconciliationData) {
      setResult(null);
      setError(null);
      setFieldErrors({});
    }
  }, [reconciliationData]);

  useEffect(() => {
    let isMounted = true;
    const loadOrganizations = async () => {
      setIsOrganizationsLoading(true);
      try {
        const response = await fetch("/api/user/organizations");
        if (response.status === 401) {
          return;
        }
        const data = await response.json();
        if (!response.ok) {
          return;
        }
        const orgs = Array.isArray(data.organizations) ? data.organizations : [];
        if (!isMounted) return;
        setOrganizations(orgs);
        const defaultOrg = orgs.find((org: UserOrganization) => org.isDefault);
        const fallbackId = defaultOrg?.id ?? orgs[0]?.id ?? "";
        setSelectedOrganizationId((prev) => prev || fallbackId);
      } catch (error) {
        console.warn("Failed to load organizations:", error);
      } finally {
        if (isMounted) {
          setIsOrganizationsLoading(false);
        }
      }
    };
    void loadOrganizations();
    return () => {
      isMounted = false;
    };
  }, []);

  const selectedOrganizationName = useMemo(() => {
    if (!selectedOrganizationId) return undefined;
    return organizations.find((org) => org.id === selectedOrganizationId)?.name;
  }, [organizations, selectedOrganizationId]);

  // Simulate agent progress during loading
  useEffect(() => {
    if (!loading) {
      setCurrentAgentStep(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentAgentStep((prev) => {
        if (prev >= AGENT_STEPS.length - 1) return prev;
        return prev + 1;
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [loading]);

  // Clear field error when user fixes it
  const handleFieldErrorClear = (field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Scroll to first error field
  const scrollToFirstError = (errors: Record<string, string>) => {
    if (errors.prompt && formRef.current) {
      formRef.current.focusPrompt();
    } else if (errors.materiality && formRef.current) {
      formRef.current.focusMateriality();
    }
  };

  // Run reconciliation agents
  const runAgents = async () => {
    setFieldErrors({});

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
          payload: reconciliationData,
          materialityThreshold,
          organizationName: selectedOrganizationName,
        }),
        signal: abortController.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        let details: string | undefined;
        if (Array.isArray(data?.errors)) {
          details = data.errors.join("\n\n");
        } else if (data?.issues) {
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

        const errors = extractFieldErrors(details);
        if (Object.keys(errors).length > 0) {
          setFieldErrors(errors);
          scrollToFirstError(errors);
        }

        return;
      }

      setResult(data as OrchestratorResponse);
      setError(null);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        console.log("Agent run was cancelled");
        return;
      }

      setError({
        message: "Failed to run agents",
        detail: err instanceof Error ? err.message : "An unexpected error occurred",
        help: ["Check your internet connection", "Try again in a few moments"],
      });
    } finally {
      setLoading(false);
      completeRun();
    }
  };

  // Stop running agents
  const handleStop = () => {
    stopRun();
    setLoading(false);
    setCurrentAgentStep(0);
  };

  const retryReport = async () => {
    if (!result || !result.geminiAgents) return;

    setIsRetryingReport(true);
    try {
      const response = await fetch("/api/agent/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userPrompt: prompt,
          toolOutput: result.toolOutput,
          validationResult: result.geminiAgents.validation,
          analysisResult: result.geminiAgents.analysis,
          investigationResult: result.geminiAgents.investigation,
          organizationName: selectedOrganizationName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError({
          message: "Failed to regenerate report",
          detail: data?.message ?? "Report retry failed. Please try again.",
          help: ["Try again in a few moments", "Verify your Gemini API key is valid"],
        });
        return;
      }

      setResult((prev) => {
        if (!prev?.geminiAgents) return prev;
        return {
          ...prev,
          geminiAgents: {
            ...prev.geminiAgents,
            report: data.report ?? prev.geminiAgents.report,
            status: {
              ...prev.geminiAgents.status,
              report: data.status ?? prev.geminiAgents.status.report,
            },
          },
        };
      });
    } catch (err) {
      setError({
        message: "Failed to regenerate report",
        detail: err instanceof Error ? err.message : "Report retry failed.",
        help: ["Try again in a few moments"],
      });
    } finally {
      setIsRetryingReport(false);
    }
  };

  return {
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
    organizations,
    selectedOrganizationId,
    isOrganizationsLoading,

    // Actions
    setPrompt,
    setMaterialityThreshold,
    setSelectedOrganizationId,
    runAgents,
    handleStop,
    retryReport,
    isRetryingReport,
    handleFieldErrorClear,
  };
}
