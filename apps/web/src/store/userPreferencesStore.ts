/**
 * User preferences store
 * Manages user-specific settings like materiality threshold
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserPreferencesStore {
  /** Materiality threshold for variance detection (default: 50) */
  materialityThreshold: number;
  /** Reporting period default (e.g., 2026-03), optionally sourced from Xero pull */
  reportingPeriodDefault: string;

  /** Update materiality threshold */
  setMaterialityThreshold: (threshold: number) => void;
  /** Update reporting period default */
  setReportingPeriodDefault: (period: string) => void;

  /** Reset to defaults */
  reset: () => void;
}

const initialState = {
  materialityThreshold: 50,
  reportingPeriodDefault: "",
};

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  persist(
    (set) => ({
      ...initialState,

      setMaterialityThreshold: (threshold) => {
        set({ materialityThreshold: threshold });
      },

      setReportingPeriodDefault: (period) => {
        set({ reportingPeriodDefault: period.trim() });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: "user-preferences-storage",
    }
  )
);
