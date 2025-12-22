/**
 * Zustand store for reconciliation workflow
 * Supports both anonymous (localStorage) and authenticated (DB) modes
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  UploadedFile,
  ColumnMapping,
  ReconciliationPayload,
  WorkflowStatus,
  FileType,
} from "@/types/reconciliation";

type ReconciliationStore = {
  // ============================================
  // Uploaded Files State
  // ============================================
  uploadedFiles: {
    glBalance: UploadedFile | null;
    subledgerBalance: UploadedFile | null;
    transactions: UploadedFile | null;
  };

  setUploadedFile: (type: FileType, file: UploadedFile) => void;
  clearUploadedFile: (type: FileType) => void;
  clearAllFiles: () => void;

  // ============================================
  // Column Mappings State
  // ============================================
  columnMappings: {
    gl_balance: ColumnMapping;
    subledger_balance: ColumnMapping;
    transactions: ColumnMapping;
  };

  setColumnMapping: (type: FileType, mapping: ColumnMapping) => void;
  clearColumnMapping: (type: FileType) => void;

  // ============================================
  // Transformed Data (After Applying Mappings)
  // ============================================
  reconciliationData: ReconciliationPayload | null;

  setReconciliationData: (data: ReconciliationPayload) => void;
  clearReconciliationData: () => void;

  // ============================================
  // Workflow Status
  // ============================================
  workflowStatus: WorkflowStatus;

  updateWorkflowStatus: (step: keyof WorkflowStatus, status: WorkflowStatus[keyof WorkflowStatus]) => void;

  // ============================================
  // Reconciliation Settings
  // ============================================
  materialityThreshold: number;

  setMaterialityThreshold: (threshold: number) => void;

  // ============================================
  // Agent Run State
  // ============================================
  isRunning: boolean;
  currentRunId: string | null;
  abortController: AbortController | null;

  startRun: (runId: string, abortController: AbortController) => void;
  stopRun: () => void;
  completeRun: () => void;

  // ============================================
  // Reset All
  // ============================================
  reset: () => void;

  // ============================================
  // Sync with Database (for authenticated users)
  // ============================================
  syncWithDatabase: (userId: string) => Promise<void>;
};

const initialState = {
  uploadedFiles: {
    glBalance: null,
    subledgerBalance: null,
    transactions: null,
  },
  columnMappings: {
    gl_balance: {},
    subledger_balance: {},
    transactions: {},
  },
  reconciliationData: null,
  workflowStatus: {
    upload: "not_started" as const,
    map: "incomplete" as const,
    preview: "incomplete" as const,
    run: "not_started" as const,
  },
  materialityThreshold: 50, // Default materiality threshold
  isRunning: false,
  currentRunId: null,
  abortController: null,
};

export const useReconciliationStore = create<ReconciliationStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ============================================
      // File Management
      // ============================================
      setUploadedFile: (type, file) => {
        const currentStatus = get().workflowStatus.upload;

        set((state) => ({
          uploadedFiles: {
            ...state.uploadedFiles,
            [type === "gl_balance" ? "glBalance" : type === "subledger_balance" ? "subledgerBalance" : "transactions"]: file,
          },
        }));

        // Update workflow status based on uploaded files
        const files = get().uploadedFiles;

        // If this is the first file uploaded, set status to "running"
        if (currentStatus === "not_started") {
          get().updateWorkflowStatus("upload", "running");
        }

        // If both required files are uploaded, mark as complete
        if (files.glBalance && files.subledgerBalance) {
          get().updateWorkflowStatus("upload", "complete");
        }
      },

      clearUploadedFile: (type) => {
        set((state) => ({
          uploadedFiles: {
            ...state.uploadedFiles,
            [type === "gl_balance" ? "glBalance" : type === "subledger_balance" ? "subledgerBalance" : "transactions"]: null,
          },
        }));

        // Clear the corresponding column mapping
        get().clearColumnMapping(type);

        // Clear reconciliation data since source data changed
        get().clearReconciliationData();

        // Update workflow status based on remaining files
        const files = get().uploadedFiles;
        const hasAnyFiles = files.glBalance || files.subledgerBalance || files.transactions;

        if (hasAnyFiles) {
          get().updateWorkflowStatus("upload", "running");
        } else {
          get().updateWorkflowStatus("upload", "not_started");
        }

        get().updateWorkflowStatus("map", "incomplete");
        get().updateWorkflowStatus("preview", "incomplete");
      },

      clearAllFiles: () => {
        set({
          uploadedFiles: initialState.uploadedFiles,
          columnMappings: initialState.columnMappings,
          reconciliationData: initialState.reconciliationData,
        });
        get().updateWorkflowStatus("upload", "not_started");
        get().updateWorkflowStatus("map", "incomplete");
        get().updateWorkflowStatus("preview", "incomplete");
      },

      // ============================================
      // Column Mapping Management
      // ============================================
      setColumnMapping: (type, mapping) => {
        set((state) => ({
          columnMappings: {
            ...state.columnMappings,
            [type]: mapping,
          },
        }));

        // Check if mapping step is complete
        const mappings = get().columnMappings;
        const hasGLMapping = Object.keys(mappings.gl_balance).length > 0;
        const hasSubledgerMapping = Object.keys(mappings.subledger_balance).length > 0;

        if (hasGLMapping && hasSubledgerMapping) {
          get().updateWorkflowStatus("map", "complete");
        }
      },

      clearColumnMapping: (type) => {
        set((state) => ({
          columnMappings: {
            ...state.columnMappings,
            [type]: {},
          },
        }));

        get().updateWorkflowStatus("map", "incomplete");
      },

      // ============================================
      // Reconciliation Data
      // ============================================
      setReconciliationData: (data) => {
        set({ reconciliationData: data });
        get().updateWorkflowStatus("preview", "complete");
      },

      clearReconciliationData: () => {
        set({ reconciliationData: null });
        get().updateWorkflowStatus("preview", "incomplete");
      },

      // ============================================
      // Workflow Status
      // ============================================
      updateWorkflowStatus: (step, status) => {
        set((state) => ({
          workflowStatus: {
            ...state.workflowStatus,
            [step]: status,
          },
        }));
      },

      // ============================================
      // Reconciliation Settings
      // ============================================
      setMaterialityThreshold: (threshold) => {
        set({ materialityThreshold: threshold });
      },

      // ============================================
      // Agent Run Management
      // ============================================
      startRun: (runId, abortController) => {
        set({
          isRunning: true,
          currentRunId: runId,
          abortController,
        });
        get().updateWorkflowStatus("run", "running");
      },

      stopRun: () => {
        const { abortController } = get();
        if (abortController) {
          abortController.abort();
        }
        set({
          isRunning: false,
          abortController: null,
        });
        get().updateWorkflowStatus("run", "not_started");
      },

      completeRun: () => {
        set({
          isRunning: false,
          abortController: null,
        });
        get().updateWorkflowStatus("run", "complete");
      },

      // ============================================
      // Reset Everything
      // ============================================
      reset: () => {
        set(initialState);
      },

      // ============================================
      // Database Sync (for authenticated users)
      // ============================================
      syncWithDatabase: async (userId) => {
        try {
          // Load mappings from database
          const response = await fetch(`/api/user/mappings?userId=${userId}`);
          if (response.ok) {
            const { mappings } = await response.json();
            if (mappings) {
              set({ columnMappings: mappings });
            }
          }
        } catch (error) {
          console.error("Failed to sync with database:", error);
        }
      },
    }),
    {
      name: "acctrecon-storage", // localStorage key
      partialize: (state) => ({
        // Only persist these fields for anonymous users
        columnMappings: state.columnMappings,
        workflowStatus: state.workflowStatus,
        materialityThreshold: state.materialityThreshold,
      }),
    },
  ),
);
