/**
 * Workflow progress indicator
 * Shows user progress through: Upload -> Map -> Preview -> Run
 */

"use client";

import { useWorkflowStore } from "@/store/workflowStore";

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
  const workflowStatus = useWorkflowStore((state) => state.status);

  const getStepStatus = (
    stepId: string,
  ): "complete" | "active" | "pending" | "incomplete" => {
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

  return (
    <div className="rounded-3xl border theme-border theme-card p-5 sm:p-6">
      <h3 className="ui-kicker theme-text-muted">
        Workflow Progress
      </h3>
      <p className="ui-copy mt-2 theme-text-muted">
        Follow the sequence below to move from raw files to final reconciliation output.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);

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
                      : "theme-border theme-muted"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`
                    flex h-10 w-10 items-center justify-center rounded-full text-base font-semibold
                    ${
                      status === "complete"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : status === "active"
                          ? "bg-sky-500/20 text-sky-300"
                        : "theme-muted theme-text-muted"
                    }
                  `}
                >
                  {status === "complete" ? "OK" : step.step}
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
                              : "theme-text-muted"
                        }
                      `}
                    >
                      {step.label}
                    </p>
                    {status === "complete" && (
                      <span className="text-xs text-emerald-400">Done</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs theme-text-muted">{step.description}</p>
                </div>
              </div>

              <div className="mt-3">
                <span
                  className={`
                    rounded-full px-2 py-0.5 text-xs font-medium
                    ${
                      status === "complete"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : status === "active"
                          ? "bg-sky-500/20 text-sky-300"
                        : "theme-muted theme-text-muted"
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

              {index < steps.length - 1 && (
                <div
                  className={`
                    absolute right-0 top-1/2 hidden h-0.5 w-full -translate-y-1/2 sm:block
                    ${status === "complete" ? "bg-emerald-500/40" : "bg-slate-300/70"}
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
