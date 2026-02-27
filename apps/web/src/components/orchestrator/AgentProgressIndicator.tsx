"use client";

/**
 * Agent Progress Indicator Component
 * Displays current agent step and progress bar during reconciliation
 */

interface AgentStep {
  id: number;
  name: string;
  description: string;
}

interface AgentProgressIndicatorProps {
  currentStep: number;
  steps: AgentStep[];
}

export function AgentProgressIndicator({
  currentStep,
  steps,
}: AgentProgressIndicatorProps) {
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="agent-progress-card mt-4 rounded-2xl border p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
          <div className="agent-progress-spinner h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
        </div>
        <div className="flex-1">
          <p className="agent-progress-title text-sm font-semibold">
            {steps[currentStep].name}
          </p>
          <p className="agent-progress-copy text-xs">
            {steps[currentStep].description}
          </p>
          <p className="agent-progress-step mt-1 text-xs font-medium">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>
      </div>
      {/* Progress Bar */}
      <div className="agent-progress-track mt-3 h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="agent-progress-fill h-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}
