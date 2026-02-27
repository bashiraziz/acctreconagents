"use client";

/**
 * File Metadata Form Component
 * Form inputs for file metadata (account code, period, currency, etc.)
 */

import { AccountingSystemSelector } from "./AccountingSystemSelector";
import type { AccountingSystem, FileType } from "@/types/reconciliation";

interface FileMetadata {
  accountCode?: string;
  period?: string;
  currency?: string;
  reverseSign?: boolean;
}

interface FileMetadataFormProps {
  fileType: FileType;
  metadata?: FileMetadata;
  accountingSystem?: AccountingSystem;
  onMetadataChange: (metadata: FileMetadata) => void;
  onAccountingSystemChange: (system: AccountingSystem) => void;
}

export function FileMetadataForm({
  fileType,
  metadata = {},
  accountingSystem = "auto",
  onMetadataChange,
  onAccountingSystemChange,
}: FileMetadataFormProps) {
  const isSubledger = fileType === "subledger_balance";
  const accountCode = metadata.accountCode ?? "";
  const period = metadata.period ?? "";
  const currency = metadata.currency ?? "USD";
  const reverseSign = metadata.reverseSign ?? false;

  return (
    <div className="upload-meta-divider mt-4 border-t pt-4">
      {/* Accounting System Selector */}
      <AccountingSystemSelector
        value={accountingSystem}
        onChange={onAccountingSystemChange}
        className="mb-4"
      />

      {/* Metadata Inputs Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Account Code - Only for subledger */}
        {isSubledger && (
          <div>
            <label className="upload-meta-label mb-2 block text-xs font-medium">
              Account Code
              <span className="upload-meta-hint ml-1">(if missing in file)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., 2000"
              value={accountCode}
              onChange={(e) =>
                onMetadataChange({
                  ...metadata,
                  accountCode: e.target.value || undefined,
                })
              }
              className="upload-meta-input w-full rounded border px-3 py-2 text-sm focus:outline-none"
            />
            <p className="upload-meta-hint mt-1 text-xs">
              Leave blank if account code is in the file
            </p>
          </div>
        )}

        {/* Period */}
        <div>
          <label className="upload-meta-label mb-2 block text-xs font-medium">
            Period (YYYY-MM)
            <span className="upload-meta-hint ml-1">(if missing in file)</span>
          </label>
          <input
            type="text"
            placeholder="e.g., 2025-12"
            value={period}
            onChange={(e) =>
              onMetadataChange({
                ...metadata,
                period: e.target.value || undefined,
              })
            }
            className="upload-meta-input w-full rounded border px-3 py-2 text-sm focus:outline-none"
          />
          <p className="upload-meta-hint mt-1 text-xs">
            Auto-detected from filename or leave blank if in file
          </p>
        </div>

        {/* Currency */}
        <div>
          <label className="upload-meta-label mb-2 block text-xs font-medium">
            Currency
          </label>
          <input
            type="text"
            placeholder="USD"
            value={currency}
            onChange={(e) =>
              onMetadataChange({
                ...metadata,
                currency: e.target.value || undefined,
              })
            }
            className="upload-meta-input w-full rounded border px-3 py-2 text-sm focus:outline-none"
          />
          <p className="upload-meta-hint mt-1 text-xs">Default: USD</p>
        </div>

        {/* Reverse Sign */}
        <div className="flex items-center">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={reverseSign}
              onChange={(e) => {
                onMetadataChange({
                  ...metadata,
                  reverseSign: e.target.checked,
                });
              }}
              className="upload-meta-checkbox h-4 w-4 rounded"
            />
            <span className="upload-meta-label text-xs font-medium">Reverse Sign</span>
          </label>
          <p className="upload-meta-hint ml-2 text-xs">(multiply amounts by -1)</p>
        </div>
      </div>
    </div>
  );
}
