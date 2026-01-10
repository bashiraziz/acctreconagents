/**
 * Store exports and utilities
 * Provides access to all domain-specific stores
 */

import { useFileUploadStore } from "./fileUploadStore";
import { useColumnMappingStore } from "./columnMappingStore";
import { useWorkflowStore } from "./workflowStore";
import { useAgentRunStore } from "./agentRunStore";
import { useUserPreferencesStore } from "./userPreferencesStore";

export { useFileUploadStore } from "./fileUploadStore";
export { useColumnMappingStore } from "./columnMappingStore";
export { useWorkflowStore } from "./workflowStore";
export { useAgentRunStore } from "./agentRunStore";
export { useUserPreferencesStore } from "./userPreferencesStore";

/**
 * Reset all stores to initial state
 * Useful for logout, session cleanup, or testing
 *
 * @example
 * ```tsx
 * function LogoutButton() {
 *   const handleLogout = () => {
 *     resetAllStores();
 *     // ... logout logic ...
 *   };
 *
 *   return <button onClick={handleLogout}>Logout</button>;
 * }
 * ```
 */
export function resetAllStores() {
  useFileUploadStore.getState().reset();
  useColumnMappingStore.getState().reset();
  useWorkflowStore.getState().reset();
  useAgentRunStore.getState().reset();
  useUserPreferencesStore.getState().reset();
}

/**
 * Hook to access all stores at once
 * Use this sparingly - prefer individual store hooks for better performance
 *
 * @example
 * ```tsx
 * function DebugPanel() {
 *   const stores = useAllStores();
 *
 *   return (
 *     <div>
 *       <h3>Store State</h3>
 *       <pre>{JSON.stringify(stores, null, 2)}</pre>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAllStores() {
  const fileUpload = useFileUploadStore();
  const columnMapping = useColumnMappingStore();
  const workflow = useWorkflowStore();
  const agentRun = useAgentRunStore();
  const userPreferences = useUserPreferencesStore();

  return {
    fileUpload,
    columnMapping,
    workflow,
    agentRun,
    userPreferences,
  };
}
