/**
 * Workflow progress indicator
 * Shows user progress through: Upload -> Map -> Preview -> Run
 */

"use client";

import { useAgentRunStore } from "@/store/agentRunStore";
import { useColumnMappingStore } from "@/store/columnMappingStore";
import { useFileUploadStore } from "@/store/fileUploadStore";

type Step = {
  id: string;
  label: string;
  step: string;
  description: string;
};

const steps: Step[] = [
  {
    id: "upload",
    label: "Upload Files",
    step: "1",
    description: "Upload GL, subledger, and transaction data",
  },
  {
    id: "map",
    label: "Map Columns",
    step: "2",
    description: "Map your CSV columns to canonical fields",
  },
  {
    id: "preview",
    label: "Preview Data",
    step: "3",
    description: "Review transformed data before running",
  },
  {
    id: "run",
    label: "Run Agents",
    step: "4",
    description: "Execute reconciliation with AI agents",
  },
];

export function WorkflowProgress() {
  const files = useFileUploadStore((state) => state.files);
  const reconciliationData = useFileUploadStore((state) => state.reconciliationData);
  const mappings = useColumnMappingStore((state) => state.mappings);
  const isRunning = useAgentRunStore((state) => state.isRunning);

  const hasRequiredFiles = Boolean(files.glBalance && files.subledgerBalance);
  const hasAnyMapping =
    Object.keys(mappings.gl_balance).length > 0 ||
    Object.keys(mappings.subledger_balance).length > 0 ||
    Object.keys(mappings.transactions).length > 0;
  const hasPreparedData = Boolean(reconciliationData);

  const getStepStatus = (stepId: string): "complete" | "active" | "pending" | "incomplete" => {
    if (stepId === "upload") {
      return hasRequiredFiles ? "complete" : "pending";
    }

    if (stepId === "map") {
      if (hasPreparedData) return "complete";
      if (hasRequiredFiles && hasAnyMapping) return "active";
      return "pending";
    }

    if (stepId === "preview") {
      return hasPreparedData ? "complete" : "pending";
    }

    if (stepId === "run") {
      return isRunning ? "active" : hasPreparedData ? "pending" : "pending";
    }

    return "incomplete";
  };

  return (
    <div className="rounded-3xl border theme-border theme-card p-5 sm:p-6">
      <h3 className="ui-kicker theme-text-muted">
        Workflow Progress
      </h3>
      <p className="simple-mode-compact ui-copy mt-2 theme-text-muted">
        Follow the sequence below to move from raw files to final reconciliation output.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isComplete = status === "complete";
          const isActive = status === "active";
          const cardClass = isComplete
            ? "alert alert-success"
            : isActive
              ? "alert alert-info"
              : "rounded-2xl border theme-border theme-muted";
          const indexBadgeClass = isComplete
            ? "badge badge-success"
            : isActive
              ? "badge badge-info"
              : "badge badge-neutral";
          const statusBadgeClass = isComplete
            ? "badge badge-success"
            : isActive
              ? "badge badge-info"
              : "badge badge-neutral";

          return (
            <div
              key={step.id}
              className={`relative p-4 transition ${cardClass}`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm ${indexBadgeClass}`}
                >
                  {status === "complete" ? "OK" : step.step}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold theme-text">
                      {step.label}
                    </p>
                    {status === "complete" && <span className="badge badge-success">Done</span>}
                  </div>
                  <p className="simple-mode-compact mt-1 text-xs theme-text-muted">{step.description}</p>
                </div>
              </div>

              <div className="mt-3">
                <span className={statusBadgeClass}>
                  {status === "complete"
                    ? "Completed"
                    : status === "active"
                      ? "In Progress"
                      : "Pending"}
                </span>
              </div>

              {index < steps.length - 1 && (
                <div
                  className="absolute right-0 top-1/2 hidden h-0.5 w-full -translate-y-1/2 sm:block"
                  style={{
                    backgroundColor:
                      status === "complete"
                        ? "var(--success-border)"
                        : "var(--card-border)",
                    width: "calc(100% + 0.75rem)",
                    left: "100%",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
