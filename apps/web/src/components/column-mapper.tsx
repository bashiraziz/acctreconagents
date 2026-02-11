"use client";

import { useMemo, useState } from "react";
import {
  CanonicalField,
  canonicalBalanceFields,
  transactionFields,
} from "@/lib/spec";
import { useFileUploadStore } from "@/store/fileUploadStore";
import { useColumnMappingStore } from "@/store/columnMappingStore";
import { suggestColumnMappings } from "@/lib/parseFile";
import { createReconciliationPayload } from "@/lib/transformData";
import { useSession } from "@/lib/auth-client";
import type { ColumnMapping, FileType, UploadedFile } from "@/types/reconciliation";


export function ColumnMapper() {
  const [activeTab, setActiveTab] = useState<"gl" | "subledger" | "transactions">("gl");
  const [errors, setErrors] = useState<string[]>([]);

  // Get data from domain-specific stores (migrated from old reconciliationStore)
  const uploadedFiles = useFileUploadStore((state) => state.files);
  const columnMappings = useColumnMappingStore((state) => state.mappings);
  const setColumnMapping = useColumnMappingStore((state) => state.setMapping);
  const setReconciliationData = useFileUploadStore((state) => state.setReconciliationData);
  const { data: session } = useSession();

  // Auto-suggest mappings when files are uploaded
  const handleAutoSuggest = (fileType: FileType) => {
    const file =
      fileType === "gl_balance"
        ? uploadedFiles.glBalance
        : fileType === "subledger_balance"
          ? uploadedFiles.subledgerBalance
          : uploadedFiles.transactions;

    if (!file) {
      return;
    }

    const fields =
      fileType === "transactions" ? transactionFields : canonicalBalanceFields;

    // Filter out fields that already have metadata values
    const metadata = file.metadata;
    const fieldsToMap = fields.filter((f) => {
      // Skip fields that have metadata
      if (f.key === 'period' && metadata?.period) return false;
      if (f.key === 'currency' && metadata?.currency) return false;
      if (f.key === 'account_code' && metadata?.accountCode) return false;
      return true;
    });

    const suggestions = suggestColumnMappings(
      file.headers,
      fieldsToMap.map((f) => f.key),
    );

    setColumnMapping(fileType, suggestions);
  };

  // Apply mappings and transform data
  const handleApplyMappings = async () => {
    setErrors([]);

    const { payload, errors: transformErrors } = createReconciliationPayload(
      uploadedFiles.glBalance,
      columnMappings.gl_balance,
      uploadedFiles.subledgerBalance,
      columnMappings.subledger_balance,
      uploadedFiles.transactions,
      columnMappings.transactions,
    );

    if (transformErrors.length > 0) {
      setErrors(transformErrors);
    }

    if (payload) {
      setReconciliationData(payload);
      if (session?.user) {
        const entries = Object.entries(columnMappings).filter(
          ([, mapping]) => Object.keys(mapping).length > 0,
        ) as [FileType, ColumnMapping][];

        await Promise.all(
          entries.map(([fileType, mapping]) =>
            fetch("/api/user/mappings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ fileType, mapping }),
            }),
          ),
        );
      }
    }
  };

  // Mappings are automatically loaded from localStorage via Zustand persist

  const hasGLFile = !!uploadedFiles.glBalance;
  const hasSubledgerFile = !!uploadedFiles.subledgerBalance;
  const hasTransactionsFile = !!uploadedFiles.transactions;

  const glCompletion = useMemo(() => {
    if (!hasGLFile) return 0;
    const metadata = uploadedFiles.glBalance?.metadata;
    const requiredFields = canonicalBalanceFields.filter((f) => {
      if (!f.required) return false;
      // Exclude fields that have metadata values
      if (f.key === 'period' && metadata?.period) return false;
      if (f.key === 'currency' && metadata?.currency) return false;
      if (f.key === 'account_code' && metadata?.accountCode) return false;
      return true;
    });
    const mapped = requiredFields.filter((f) => columnMappings.gl_balance[f.key]);
    return requiredFields.length === 0 ? 100 : Math.round((mapped.length / requiredFields.length) * 100);
  }, [hasGLFile, columnMappings.gl_balance, uploadedFiles.glBalance?.metadata]);

  const subledgerCompletion = useMemo(() => {
    if (!hasSubledgerFile) return 0;
    const metadata = uploadedFiles.subledgerBalance?.metadata;
    const requiredFields = canonicalBalanceFields.filter((f) => {
      if (!f.required) return false;
      // Exclude fields that have metadata values
      if (f.key === 'period' && metadata?.period) return false;
      if (f.key === 'currency' && metadata?.currency) return false;
      if (f.key === 'account_code' && metadata?.accountCode) return false;
      return true;
    });
    const mapped = requiredFields.filter((f) => columnMappings.subledger_balance[f.key]);
    return requiredFields.length === 0 ? 100 : Math.round((mapped.length / requiredFields.length) * 100);
  }, [hasSubledgerFile, columnMappings.subledger_balance, uploadedFiles.subledgerBalance?.metadata]);

  const transactionsCompletion = useMemo(() => {
    if (!hasTransactionsFile) return 0;
    const requiredFields = transactionFields.filter((f) => f.required);
    const mapped = requiredFields.filter((f) => columnMappings.transactions[f.key]);
    return Math.round((mapped.length / requiredFields.length) * 100);
  }, [hasTransactionsFile, columnMappings.transactions]);

  const canApply = glCompletion === 100 && subledgerCompletion === 100;

  // Get missing required fields for validation messages
  const getMissingFields = (fileType: "gl_balance" | "subledger_balance") => {
    const file = fileType === "gl_balance" ? uploadedFiles.glBalance : uploadedFiles.subledgerBalance;
    if (!file) return [];

    const metadata = file.metadata;
    const mapping = columnMappings[fileType];
    const fields = canonicalBalanceFields;

    const missing: string[] = [];
    fields.forEach((field) => {
      if (!field.required) return;

      // Check if field has metadata
      const hasMetadata =
        (field.key === 'period' && metadata?.period) ||
        (field.key === 'currency' && metadata?.currency) ||
        (field.key === 'account_code' && metadata?.accountCode);

      // If no metadata and no mapping, it's missing
      if (!hasMetadata && !mapping[field.key]) {
        missing.push(field.label);
      }
    });

    return missing;
  };

  const glMissing = getMissingFields("gl_balance");
  const subledgerMissing = getMissingFields("subledger_balance");

  return (
    <section className="rounded-3xl border theme-border theme-card p-5 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="ui-kicker">
            Column Mapping
          </p>
          <h2 className="ui-title mt-1">
            Map your columns
          </h2>
          <p className="ui-copy mt-1">
            Map source columns to canonical fields. You can auto-suggest and then adjust only the mismatches.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b theme-border pb-2">
        <button
          onClick={() => setActiveTab("gl")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "gl"
              ? "theme-card theme-text"
              : "theme-text-muted hover:theme-text hover:theme-muted"
          }`}
        >
          GL Balance ({glCompletion}%)
        </button>
        <button
          onClick={() => setActiveTab("subledger")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "subledger"
              ? "theme-card theme-text"
              : "theme-text-muted hover:theme-text hover:theme-muted"
          }`}
        >
          Subledger ({subledgerCompletion}%)
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "transactions"
              ? "theme-card theme-text"
              : "theme-text-muted hover:theme-text hover:theme-muted"
          }`}
        >
          Transactions ({transactionsCompletion}%)
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "gl" && (
          <MappingTab
            fileType="gl_balance"
            file={uploadedFiles.glBalance}
            mapping={columnMappings.gl_balance}
            fields={canonicalBalanceFields}
            onAutoSuggest={() => handleAutoSuggest("gl_balance")}
            onMappingChange={(mapping) => setColumnMapping("gl_balance", mapping)}
          />
        )}

        {activeTab === "subledger" && (
          <MappingTab
            fileType="subledger_balance"
            file={uploadedFiles.subledgerBalance}
            mapping={columnMappings.subledger_balance}
            fields={canonicalBalanceFields}
            onAutoSuggest={() => handleAutoSuggest("subledger_balance")}
            onMappingChange={(mapping) => setColumnMapping("subledger_balance", mapping)}
          />
        )}

        {activeTab === "transactions" && (
          <MappingTab
            fileType="transactions"
            file={uploadedFiles.transactions}
            mapping={columnMappings.transactions}
            fields={transactionFields}
            onAutoSuggest={() => handleAutoSuggest("transactions")}
            onMappingChange={(mapping) => setColumnMapping("transactions", mapping)}
          />
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
          <p className="font-semibold text-rose-100">Validation Errors</p>
          <ul className="mt-2 list-disc pl-5 text-sm text-rose-100/90">
            {errors.slice(0, 10).map((error, i) => (
              <li key={i}>{error}</li>
            ))}
            {errors.length > 10 && (
              <li className="text-rose-100/70">...and {errors.length - 10} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Apply Button */}
      <div className="mt-6 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="font-semibold theme-text">
              {canApply
                ? "Ready to apply mappings"
                : "Complete required mappings to continue"}
            </p>
            {!canApply && (glMissing.length > 0 || subledgerMissing.length > 0) && (
              <div className="mt-2 space-y-1">
                {glMissing.length > 0 && (
                  <p className="text-sm text-amber-300">
                    <span className="font-medium">GL Missing:</span> {glMissing.join(", ")}
                    {glMissing.includes("Account Code") && " (fill in Upload Files metadata or map column)"}
                  </p>
                )}
                {subledgerMissing.length > 0 && (
                  <p className="text-sm text-amber-300">
                    <span className="font-medium">Subledger Missing:</span> {subledgerMissing.join(", ")}
                    {subledgerMissing.includes("Account Code") && " (fill in Upload Files metadata)"}
                  </p>
                )}
              </div>
            )}
            <p className="mt-1 text-sm theme-text-muted">
              {session?.user
                ? "Mappings are saved to your account"
                : "Mappings are saved locally in your browser"}
            </p>
          </div>
          <button
            onClick={handleApplyMappings}
            disabled={!canApply}
            className="rounded-full bg-sky-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-400 sm:ml-4"
          >
            Apply Mappings
          </button>
        </div>
      </div>
    </section>
  );
}

function MappingTab({
  fileType,
  file,
  mapping,
  fields,
  onAutoSuggest,
  onMappingChange,
}: {
  fileType: FileType;
  file: UploadedFile | null;
  mapping: ColumnMapping;
  fields: CanonicalField[];
  onAutoSuggest: () => void;
  onMappingChange: (mapping: ColumnMapping) => void;
}) {
  if (!file) {
    return (
    <div className="rounded-2xl border theme-border theme-muted p-8 text-center">
      <p className="text-sm theme-text">
        No file uploaded for {fileType.replace("_", " ")}
      </p>
      <p className="mt-2 text-xs theme-text-muted">
        Upload a file in the Upload Workspace above
      </p>
    </div>
  );
}

  const handleFieldChange = (fieldKey: string, sourceColumn: string) => {
    onMappingChange({
      ...mapping,
      [fieldKey]: sourceColumn,
    });
  };

  const metadata = file.metadata;

  // Filter required fields, excluding those with metadata values
  const requiredFields = fields.filter((f) => {
    if (!f.required) return false;
    // Exclude fields that have metadata values
    if (f.key === 'period' && metadata?.period) return false;
    if (f.key === 'currency' && metadata?.currency) return false;
    if (f.key === 'account_code' && metadata?.accountCode) return false;
    return true;
  });

  // Optional fields + fields that have metadata (so they're "optional" to map)
  const optionalFields = fields.filter((f) => {
    if (f.required) {
      // Include required fields that have metadata
      if (f.key === 'period' && metadata?.period) return true;
      if (f.key === 'currency' && metadata?.currency) return true;
      if (f.key === 'account_code' && metadata?.accountCode) return true;
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Auto-Suggest Button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm theme-text-muted">
            Detected {file.headers.length} columns in {file.name}
          </p>
          <p className="text-xs theme-text-muted">
            {file.rowCount} rows loaded
          </p>
        </div>
        <button
          onClick={onAutoSuggest}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          Auto-Suggest Mappings
        </button>
      </div>

      {/* Required Fields */}
      <div>
        <h3 className="text-sm font-semibold theme-text">Required Fields</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {requiredFields.map((field) => (
            <div key={field.key} className="rounded-xl border theme-border theme-muted p-3">
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium theme-text">
                    {field.label}
                  </span>
                  <span className="text-xs text-rose-400">Required</span>
                </div>
                {field.description && (
                  <p className="mt-1 text-xs theme-text-muted">{field.description}</p>
                )}
                <select
                  value={mapping[field.key] || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="mt-2 w-full rounded-lg border theme-border theme-card p-2 text-sm theme-text focus:border-sky-400 focus:outline-none"
                >
                  <option value="">-- Select Column --</option>
                  {file.headers.map((header: string) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Fields */}
      <details className="rounded-xl border theme-border theme-muted">
        <summary className="cursor-pointer p-4 text-sm font-semibold theme-text hover:theme-text">
          Optional Fields ({optionalFields.length})
        </summary>
        <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2">
          {optionalFields.map((field) => (
            <div key={field.key} className="rounded-xl border theme-border theme-card p-3">
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium theme-text">
                    {field.label}
                  </span>
                  <span className="text-xs theme-text-muted">Optional</span>
                </div>
                {field.description && (
                  <p className="mt-1 text-xs theme-text-muted">{field.description}</p>
                )}
                <select
                  value={mapping[field.key] || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="mt-2 w-full rounded-lg border theme-border theme-card p-2 text-sm theme-text focus:border-sky-400 focus:outline-none"
                >
                  <option value="">-- Skip Field --</option>
                  {file.headers.map((header: string) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </details>

      {/* Current Mappings Summary */}
      <div className="rounded-xl border theme-border theme-muted p-4">
        <h4 className="text-sm font-semibold theme-text">Current Mappings</h4>
        <div className="mt-2 space-y-1 text-xs">
          {Object.entries(mapping)
            .filter(([, value]) => value)
            .map(([key, value]) => (
              <div key={key} className="flex items-center justify-between theme-text-muted">
                <span>{key}</span>
                <span>{"->"}</span>
                <span className="font-mono theme-text">{value}</span>
              </div>
            ))}
          {Object.entries(mapping).filter(([, value]) => value).length === 0 && (
            <p className="theme-text-muted">No mappings set yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

