/**
 * User preferences store
 * Manages user-specific settings like materiality threshold
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserPreferencesStore {
  /** Materiality threshold for variance detection (default: 50) */
  materialityThreshold: number;

  /** Update materiality threshold */
  setMaterialityThreshold: (threshold: number) => void;

  /** Reset to defaults */
  reset: () => void;
}

const initialState = {
  materialityThreshold: 50,
};

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  persist(
    (set) => ({
      ...initialState,

      setMaterialityThreshold: (threshold) => {
        set({ materialityThreshold: threshold });
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
