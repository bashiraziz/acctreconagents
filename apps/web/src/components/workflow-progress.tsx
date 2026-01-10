/**
 * Workflow progress indicator
 * Shows user progress through: Upload → Map → Preview → Run
 */

"use client";

import { useWorkflowStore } from "@/store/workflowStore";

type Step = {
  id: string;
  label: string;
  icon: string;
  description: string;
};

const steps: Step[] = [
  {
    id: "upload",
    label: "Upload Files",
    icon: "📁",
    description: "Upload GL, subledger, and transaction data",
  },
  {
    id: "map",
    label: "Map Columns",
    icon: "🔗",
    description: "Map your CSV columns to canonical fields",
  },
  {
    id: "preview",
    label: "Preview Data",
    icon: "👁️",
    description: "Review transformed data before running",
  },
  {
    id: "run",
    label: "Run Agents",
    icon: "🤖",
    description: "Execute reconciliation with AI agents",
  },
];

export function WorkflowProgress() {
  const workflowStatus = useWorkflowStore((state) => state.status);

  const getStepStatus = (stepId: string): "complete" | "active" | "pending" | "incomplete" => {
    const status = workflowStatus[stepId as keyof typeof workflowStatus];

    if (status === "complete") {
      return "complete";
    }

    if (status === "running") {
      return "active";
    }

    if (status === "not_started") {
      return "pending";
    }

    return "incomplete";
  };

  const getCurrentStepIndex = () => {
    const statuses = Object.values(workflowStatus);
    const lastCompleteIndex = statuses.findIndex(
      (s) => s === "incomplete" || s === "not_started",
    );
    return lastCompleteIndex === -1 ? steps.length - 1 : lastCompleteIndex;
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
      <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
        Workflow Progress
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const isActive = index === currentStepIndex;

          return (
            <div
              key={step.id}
              className={`
                relative rounded-2xl border p-4 transition
                ${
                  status === "complete"
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : status === "active"
                      ? "border-sky-500/40 bg-sky-500/10"
                      : "border-slate-800 bg-slate-900/40"
                }
              `}
            >
              {/* Step Number & Icon */}
              <div className="flex items-center gap-3">
                <div
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full text-xl
                    ${
                      status === "complete"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : status === "active"
                          ? "bg-sky-500/20 text-sky-400"
                          : "bg-slate-800 text-slate-500"
                    }
                  `}
                >
                  {status === "complete" ? "✓" : step.icon}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p
                      className={`
                        text-sm font-semibold
                        ${
                          status === "complete"
                            ? "text-emerald-100"
                            : status === "active"
                              ? "text-sky-100"
                              : "text-slate-400"
                        }
                      `}
                    >
                      {step.label}
                    </p>
                    {status === "complete" && (
                      <span className="text-xs text-emerald-400">●</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="mt-3">
                <span
                  className={`
                    rounded-full px-2 py-0.5 text-xs font-medium
                    ${
                      status === "complete"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : status === "active"
                          ? "bg-sky-500/20 text-sky-300"
                          : "bg-slate-800 text-slate-500"
                    }
                  `}
                >
                  {status === "complete"
                    ? "Completed"
                    : status === "active"
                      ? "In Progress"
                      : "Pending"}
                </span>
              </div>

              {/* Connection Line (except last step) */}
              {index < steps.length - 1 && (
                <div
                  className={`
                    absolute right-0 top-1/2 hidden h-0.5 w-full -translate-y-1/2 sm:block
                    ${status === "complete" ? "bg-emerald-500/40" : "bg-slate-800"}
                  `}
                  style={{ width: "calc(100% + 0.75rem)", left: "100%" }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
