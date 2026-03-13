"use client";

import { useFileUploadStore } from "@/store/fileUploadStore";

export function StickyRunBar() {
  const reconciliationData = useFileUploadStore((state) => state.reconciliationData);

  if (!reconciliationData) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border theme-border theme-card shadow-lg px-5 py-3">
        <span className="text-sm theme-text-muted">
          {reconciliationData.glBalances.length} GL · {reconciliationData.subledgerBalances.length} subledger
          {reconciliationData.transactions && reconciliationData.transactions.length > 0
            ? ` · ${reconciliationData.transactions.length} transactions`
            : ""}
        </span>
        <a
          href="#run-agents"
          className="btn btn-primary btn-sm btn-pill"
        >
          Illuminate ↓
        </a>
      </div>
    </div>
  );
}
