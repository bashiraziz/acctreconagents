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
    <div className="mt-4 rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-100">
            {steps[currentStep].name}
          </p>
          <p className="text-xs text-blue-200/80">
            {steps[currentStep].description}
          </p>
          <p className="mt-1 text-xs font-medium text-blue-300">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>
      </div>
      {/* Progress Bar */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-blue-900/30">
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>
  );
}
