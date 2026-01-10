/**
 * File upload store
 * Manages uploaded files and their metadata
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UploadedFile, FileType, AccountingSystem, ReconciliationPayload } from "@/types/reconciliation";

interface FileUploadStore {
  /** Uploaded files */
  files: {
    glBalance: UploadedFile | null;
    subledgerBalance: UploadedFile | null;
    transactions: UploadedFile | null;
  };

  /** Set uploaded file for a specific type */
  setFile: (type: FileType, file: UploadedFile) => void;

  /** Clear uploaded file for a specific type */
  clearFile: (type: FileType) => void;

  /** Clear all uploaded files */
  clearAll: () => void;

  /** Update file metadata */
  updateMetadata: (
    type: FileType,
    metadata: {
      accountCode?: string;
      period?: string;
      currency?: string;
      reverseSign?: boolean;
    }
  ) => void;

  /** Update accounting system for a file */
  updateAccountingSystem: (type: FileType, accountingSystem: AccountingSystem) => void;

  /** Get file by type */
  getFile: (type: FileType) => UploadedFile | null;

  /** Check if required files are uploaded (GL + Subledger) */
  hasRequiredFiles: () => boolean;

  /** Check if all files are uploaded (including transactions) */
  hasAllFiles: () => boolean;

  /** Transformed reconciliation data (after applying mappings) */
  reconciliationData: ReconciliationPayload | null;

  /** Set reconciliation data */
  setReconciliationData: (data: ReconciliationPayload) => void;

  /** Clear reconciliation data */
  clearReconciliationData: () => void;

  /** Reset to initial state */
  reset: () => void;
}

const initialState = {
  files: {
    glBalance: null,
    subledgerBalance: null,
    transactions: null,
  },
  reconciliationData: null,
};

/**
 * Get the property name for a file type
 */
function getFileKey(type: FileType): "glBalance" | "subledgerBalance" | "transactions" {
  switch (type) {
    case "gl_balance":
      return "glBalance";
    case "subledger_balance":
      return "subledgerBalance";
    case "transactions":
      return "transactions";
  }
}

/**
 * Store for managing uploaded files and reconciliation data
 *
 * File types:
 * - gl_balance: General ledger balance file (required)
 * - subledger_balance: Subledger balance file (required)
 * - transactions: Transaction detail file (optional)
 *
 * @example
 * ```tsx
 * function FileUploader() {
 *   const { files, setFile, hasRequiredFiles } = useFileUploadStore();
 *
 *   const handleUpload = async (type: FileType, file: File) => {
 *     const parsed = await parseCSVFile(file, type);
 *     if (parsed.success) {
 *       setFile(type, parsed.data);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <UploadZone onUpload={(f) => handleUpload('gl_balance', f)} />
 *       <UploadZone onUpload={(f) => handleUpload('subledger_balance', f)} />
 *       {hasRequiredFiles() && <NextButton />}
 *     </div>
 *   );
 * }
 * ```
 */
export const useFileUploadStore = create<FileUploadStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setFile: (type, file) => {
        const fileKey = getFileKey(type);

        set((state) => ({
          files: {
            ...state.files,
            [fileKey]: file,
          },
        }));

        // Clear reconciliation data when source files change
        get().clearReconciliationData();
      },

      clearFile: (type) => {
        const fileKey = getFileKey(type);

        set((state) => ({
          files: {
            ...state.files,
            [fileKey]: null,
          },
        }));

        // Clear reconciliation data when files are removed
        get().clearReconciliationData();
      },

      clearAll: () => {
        set({
          files: initialState.files,
          reconciliationData: initialState.reconciliationData,
        });
      },

      updateMetadata: (type, metadata) => {
        const fileKey = getFileKey(type);
        const file = get().files[fileKey];

        if (!file) return;

        set((state) => ({
          files: {
            ...state.files,
            [fileKey]: {
              ...file,
              metadata: {
                ...file.metadata,
                ...metadata,
              },
            },
          },
        }));

        // Clear reconciliation data since metadata affects transformation
        get().clearReconciliationData();
      },

      updateAccountingSystem: (type, accountingSystem) => {
        const fileKey = getFileKey(type);
        const file = get().files[fileKey];

        if (!file) return;

        set((state) => ({
          files: {
            ...state.files,
            [fileKey]: {
              ...file,
              accountingSystem,
            },
          },
        }));

        // Clear reconciliation data since accounting system affects parsing
        get().clearReconciliationData();
      },

      getFile: (type) => {
        const fileKey = getFileKey(type);
        return get().files[fileKey];
      },

      hasRequiredFiles: () => {
        const { files } = get();
        return files.glBalance !== null && files.subledgerBalance !== null;
      },

      hasAllFiles: () => {
        const { files } = get();
        return (
          files.glBalance !== null &&
          files.subledgerBalance !== null &&
          files.transactions !== null
        );
      },

      setReconciliationData: (data) => {
        set({ reconciliationData: data });
      },

      clearReconciliationData: () => {
        set({ reconciliationData: null });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "file-upload-storage",
    }
  )
);
