/**
 * Agent run store
 * Manages agent execution state and lifecycle
 */

import { create } from "zustand";

interface AgentRunStore {
  /** Whether an agent run is currently in progress */
  isRunning: boolean;

  /** Current run ID (if running) */
  currentRunId: string | null;

  /** AbortController for canceling the current run */
  abortController: AbortController | null;

  /** Start a new agent run */
  startRun: (runId: string, abortController: AbortController) => void;

  /** Stop/cancel the current run */
  stopRun: () => void;

  /** Mark the current run as complete */
  completeRun: () => void;

  /** Reset to initial state */
  reset: () => void;
}

const initialState = {
  isRunning: false,
  currentRunId: null,
  abortController: null,
};

/**
 * Store for managing agent execution state
 *
 * @example
 * ```tsx
 * function RunButton() {
 *   const { isRunning, startRun, stopRun } = useAgentRunStore();
 *
 *   const handleRun = () => {
 *     const abortController = new AbortController();
 *     const runId = `run_${Date.now()}`;
 *     startRun(runId, abortController);
 *
 *     // ... start agent execution ...
 *   };
 *
 *   return (
 *     <button onClick={isRunning ? stopRun : handleRun}>
 *       {isRunning ? 'Cancel' : 'Run'}
 *     </button>
 *   );
 * }
 * ```
 */
export const useAgentRunStore = create<AgentRunStore>()((set, get) => ({
  ...initialState,

  startRun: (runId, abortController) => {
    set({
      isRunning: true,
      currentRunId: runId,
      abortController,
    });
  },

  stopRun: () => {
    const { abortController } = get();

    // Cancel the ongoing request
    if (abortController) {
      abortController.abort();
    }

    set({
      isRunning: false,
      currentRunId: null,
      abortController: null,
    });
  },

  completeRun: () => {
    set({
      isRunning: false,
      currentRunId: null,
      abortController: null,
    });
  },

  reset: () => {
    // Stop any running execution first
    const { stopRun } = get();
    stopRun();

    set(initialState);
  },
}));
