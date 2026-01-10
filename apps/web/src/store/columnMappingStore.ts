/**
 * Column mapping store
 * Manages column mappings for each file type
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ColumnMapping, FileType } from "@/types/reconciliation";

interface ColumnMappingStore {
  /** Column mappings for each file type */
  mappings: {
    gl_balance: ColumnMapping;
    subledger_balance: ColumnMapping;
    transactions: ColumnMapping;
  };

  /** Set column mapping for a specific file type */
  setMapping: (type: FileType, mapping: ColumnMapping) => void;

  /** Clear column mapping for a specific file type */
  clearMapping: (type: FileType) => void;

  /** Clear all column mappings */
  clearAll: () => void;

  /** Get column mapping for a specific file type */
  getMapping: (type: FileType) => ColumnMapping;

  /** Check if mapping exists for a file type */
  hasMapping: (type: FileType) => boolean;

  /** Reset to initial state */
  reset: () => void;
}

const initialState = {
  mappings: {
    gl_balance: {},
    subledger_balance: {},
    transactions: {},
  },
};

/**
 * Store for managing column mappings
 *
 * Column mappings define how CSV columns map to canonical fields:
 * - gl_balance: Maps to account_code, amount, period
 * - subledger_balance: Maps to account_code, amount, period
 * - transactions: Maps to transaction_id, account_code, amount, booked_at, description
 *
 * @example
 * ```tsx
 * function ColumnMapper() {
 *   const { mappings, setMapping } = useColumnMappingStore();
 *
 *   const handleMapping = (column: string, field: string) => {
 *     setMapping('gl_balance', {
 *       ...mappings.gl_balance,
 *       [field]: column,
 *     });
 *   };
 *
 *   return <MappingUI onMap={handleMapping} />;
 * }
 * ```
 */
export const useColumnMappingStore = create<ColumnMappingStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      setMapping: (type, mapping) => {
        set((state) => ({
          mappings: {
            ...state.mappings,
            [type]: mapping,
          },
        }));
      },

      clearMapping: (type) => {
        set((state) => ({
          mappings: {
            ...state.mappings,
            [type]: {},
          },
        }));
      },

      clearAll: () => {
        set({ mappings: initialState.mappings });
      },

      getMapping: (type) => {
        return get().mappings[type];
      },

      hasMapping: (type) => {
        const mapping = get().mappings[type];
        return Object.keys(mapping).length > 0;
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "column-mapping-storage",
    }
  )
);
