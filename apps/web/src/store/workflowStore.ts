/**
 * Workflow store
 * Manages workflow status and step progression
 */

import { create } from "zustand";
import type { WorkflowStatus } from "@/types/reconciliation";

interface WorkflowStore {
  /** Current status of each workflow step */
  status: WorkflowStatus;

  /** Update the status of a specific workflow step */
  updateStep: (step: keyof WorkflowStatus, status: WorkflowStatus[keyof WorkflowStatus]) => void;

  /** Mark a step as complete */
  completeStep: (step: keyof WorkflowStatus) => void;

  /** Mark a step as incomplete */
  incompleteStep: (step: keyof WorkflowStatus) => void;

  /** Reset workflow to initial state */
  reset: () => void;

  /** Check if workflow is ready to run (all steps complete) */
  isReadyToRun: () => boolean;
}

const initialState: WorkflowStatus = {
  upload: "incomplete",
  map: "incomplete",
  preview: "incomplete",
  run: "not_started",
};

/**
 * Store for managing reconciliation workflow status
 *
 * Workflow steps:
 * 1. upload - Upload GL, subledger, and transaction files
 * 2. map - Map columns to canonical fields
 * 3. preview - Preview transformed data
 * 4. run - Execute reconciliation agent
 *
 * @example
 * ```tsx
 * function WorkflowProgress() {
 *   const { status, isReadyToRun } = useWorkflowStore();
 *
 *   return (
 *     <div>
 *       <Step status={status.upload}>Upload Files</Step>
 *       <Step status={status.map}>Map Columns</Step>
 *       <Step status={status.preview}>Preview Data</Step>
 *       <Step status={status.run} disabled={!isReadyToRun()}>Run Agent</Step>
 *     </div>
 *   );
 * }
 * ```
 */
export const useWorkflowStore = create<WorkflowStore>()((set, get) => ({
  status: initialState,

  updateStep: (step, status) => {
    set((state) => ({
      status: {
        ...state.status,
        [step]: status,
      },
    }));
  },

  completeStep: (step) => {
    set((state) => ({
      status: {
        ...state.status,
        [step]: "complete",
      },
    }));
  },

  incompleteStep: (step) => {
    set((state) => ({
      status: {
        ...state.status,
        [step]: "incomplete",
      },
    }));
  },

  reset: () => {
    set({ status: initialState });
  },

  isReadyToRun: () => {
    const { status } = get();
    return (
      status.upload === "complete" &&
      status.map === "complete" &&
      status.preview === "complete"
    );
  },
}));

// Note: Workflow status is NOT persisted because it represents
// the current session state. According to Principle VII (Controlled Git Operations),
// workflow status should reset on page reload to prevent stale state issues.
