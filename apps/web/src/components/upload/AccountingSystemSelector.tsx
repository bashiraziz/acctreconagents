"use client";

/**
 * Accounting System Selector Component
 * Dropdown for selecting the accounting system for better parsing
 */

import type { AccountingSystem } from "@/types/reconciliation";

interface AccountingSystemSelectorProps {
  value: AccountingSystem;
  onChange: (system: AccountingSystem) => void;
  className?: string;
}

const SYSTEM_DESCRIPTIONS: Record<AccountingSystem, string> = {
  auto: "System will be detected from CSV patterns",
  quickbooks: "Handles parenthetical accounts, US date format",
  costpoint: "Supports debit/credit columns, project accounting",
  netsuite: "Handles multi-currency, dimensional data",
  sap: "Supports company codes, G/L accounts, multi-currency",
  dynamics: "Handles dimension sets, financial tags",
  xero: "Simple cloud accounting format",
  generic: "Basic CSV parsing with minimal assumptions",
};

export function AccountingSystemSelector({
  value,
  onChange,
  className = "",
}: AccountingSystemSelectorProps) {
  return (
    <div className={className}>
      <label className="upload-meta-label mb-2 block text-xs font-medium">
        Accounting System
        <span className="upload-meta-hint ml-1">(for better parsing)</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AccountingSystem)}
        className="upload-meta-input w-full rounded border px-3 py-2 text-sm focus:outline-none"
      >
        <option value="auto">Auto-detect (recommended)</option>
        <option value="quickbooks">QuickBooks</option>
        <option value="costpoint">Costpoint / Deltek</option>
        <option value="netsuite">NetSuite / Oracle</option>
        <option value="sap">SAP ERP</option>
        <option value="dynamics">Microsoft Dynamics 365</option>
        <option value="xero">Xero</option>
        <option value="generic">Generic / Other</option>
      </select>
      <p className="upload-meta-hint mt-1 text-xs">{SYSTEM_DESCRIPTIONS[value]}</p>
    </div>
  );
}
