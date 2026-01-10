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
      <label className="block text-xs font-medium text-emerald-200 mb-2">
        Accounting System
        <span className="ml-1 text-emerald-300/60">(for better parsing)</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as AccountingSystem)}
        className="w-full rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-100 focus:border-emerald-400 focus:outline-none [&>option]:text-slate-900 [&>option]:bg-white"
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
      <p className="mt-1 text-xs text-emerald-300/50">
        {SYSTEM_DESCRIPTIONS[value]}
      </p>
    </div>
  );
}
