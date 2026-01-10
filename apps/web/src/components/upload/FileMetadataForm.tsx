"use client";

/**
 * File Metadata Form Component
 * Form inputs for file metadata (account code, period, currency, etc.)
 */

import { useState, useEffect } from "react";
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
  const [localAccountCode, setLocalAccountCode] = useState(metadata.accountCode || "");
  const [localPeriod, setLocalPeriod] = useState(metadata.period || "");
  const [localCurrency, setLocalCurrency] = useState(metadata.currency || "USD");
  const [localReverseSign, setLocalReverseSign] = useState(metadata.reverseSign || false);
  const [localAccountingSystem, setLocalAccountingSystem] = useState<AccountingSystem>(accountingSystem);

  const isSubledger = fileType === "subledger_balance";
  const isGL = fileType === "gl_balance";

  // Sync with parent metadata changes
  useEffect(() => {
    if (metadata.accountCode !== undefined) setLocalAccountCode(metadata.accountCode);
    if (metadata.period !== undefined) setLocalPeriod(metadata.period);
    if (metadata.currency !== undefined) setLocalCurrency(metadata.currency);
    if (metadata.reverseSign !== undefined) setLocalReverseSign(metadata.reverseSign);
  }, [metadata]);

  // Handle metadata updates
  const handleMetadataUpdate = () => {
    onMetadataChange({
      accountCode: localAccountCode || undefined,
      period: localPeriod || undefined,
      currency: localCurrency || undefined,
      reverseSign: localReverseSign,
    });
  };

  return (
    <div className="mt-4 border-t border-emerald-500/20 pt-4">
      {/* Accounting System Selector */}
      <AccountingSystemSelector
        value={localAccountingSystem}
        onChange={(system) => {
          setLocalAccountingSystem(system);
          onAccountingSystemChange(system);
        }}
        className="mb-4"
      />

      {/* Metadata Inputs Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Account Code - Only for subledger */}
        {isSubledger && (
          <div>
            <label className="block text-xs font-medium text-emerald-200 mb-2">
              Account Code
              <span className="ml-1 text-emerald-300/60">(if missing in file)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., 2000"
              value={localAccountCode}
              onChange={(e) => setLocalAccountCode(e.target.value)}
              onBlur={handleMetadataUpdate}
              className="w-full rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-100 placeholder-emerald-300/30 focus:border-emerald-400 focus:outline-none"
            />
            <p className="mt-1 text-xs text-emerald-300/50">
              Leave blank if account code is in the file
            </p>
          </div>
        )}

        {/* Period */}
        <div>
          <label className="block text-xs font-medium text-emerald-200 mb-2">
            Period (YYYY-MM)
            <span className="ml-1 text-emerald-300/60">(if missing in file)</span>
          </label>
          <input
            type="text"
            placeholder="e.g., 2025-12"
            value={localPeriod}
            onChange={(e) => setLocalPeriod(e.target.value)}
            onBlur={handleMetadataUpdate}
            className="w-full rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-100 placeholder-emerald-300/30 focus:border-emerald-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-emerald-300/50">
            Auto-detected from filename or leave blank if in file
          </p>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-xs font-medium text-emerald-200 mb-2">
            Currency
          </label>
          <input
            type="text"
            placeholder="USD"
            value={localCurrency}
            onChange={(e) => setLocalCurrency(e.target.value)}
            onBlur={handleMetadataUpdate}
            className="w-full rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-100 placeholder-emerald-300/30 focus:border-emerald-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-emerald-300/50">
            Default: USD
          </p>
        </div>

        {/* Reverse Sign */}
        <div className="flex items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={localReverseSign}
              onChange={(e) => {
                setLocalReverseSign(e.target.checked);
                onMetadataChange({
                  accountCode: localAccountCode || undefined,
                  period: localPeriod || undefined,
                  currency: localCurrency || undefined,
                  reverseSign: e.target.checked,
                });
              }}
              className="h-4 w-4 rounded border-emerald-500/30 bg-emerald-500/5 text-emerald-500 focus:ring-emerald-500"
            />
            <span className="text-xs font-medium text-emerald-200">
              Reverse Sign
            </span>
          </label>
          <p className="ml-2 text-xs text-emerald-300/50">
            (multiply amounts by -1)
          </p>
        </div>
      </div>
    </div>
  );
}
