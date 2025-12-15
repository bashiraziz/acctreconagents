"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CanonicalField,
  canonicalBalanceFields,
  transactionFields,
} from "@/lib/spec";
import { useReconciliationStore } from "@/store/reconciliationStore";
import { suggestColumnMappings } from "@/lib/parseFile";
import { createReconciliationPayload } from "@/lib/transformData";
import { useSession } from "@/lib/auth-client";
import type { ColumnMapping, FileType } from "@/types/reconciliation";

const allFields = [...canonicalBalanceFields, ...transactionFields];

export function ColumnMapper() {
  const [activeTab, setActiveTab] = useState<"gl" | "subledger" | "transactions">("gl");
  const [errors, setErrors] = useState<string[]>([]);

  // Get data from Zustand store
  const uploadedFiles = useReconciliationStore((state) => state.uploadedFiles);
  const columnMappings = useReconciliationStore((state) => state.columnMappings);
  const setColumnMapping = useReconciliationStore((state) => state.setColumnMapping);
  const setReconciliationData = useReconciliationStore((state) => state.setReconciliationData);

  // Get auth session
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
    const suggestions = suggestColumnMappings(
      file.headers,
      fields.map((f) => f.key),
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

      // If authenticated, save mappings to database
      if (session?.user) {
        try {
          await Promise.all([
            fetch("/api/user/mappings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: session.user.id,
                fileType: "gl_balance",
                mapping: columnMappings.gl_balance,
              }),
            }),
            fetch("/api/user/mappings", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: session.user.id,
                fileType: "subledger_balance",
                mapping: columnMappings.subledger_balance,
              }),
            }),
            uploadedFiles.transactions &&
              fetch("/api/user/mappings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  userId: session.user.id,
                  fileType: "transactions",
                  mapping: columnMappings.transactions,
                }),
              }),
          ]);
        } catch (error) {
          console.error("Failed to save mappings to database:", error);
        }
      }
    }
  };

  // Load saved mappings for authenticated users
  useEffect(() => {
    if (session?.user) {
      fetch(`/api/user/mappings?userId=${session.user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.mappings) {
            data.mappings.forEach((m: any) => {
              setColumnMapping(m.fileType, m.mapping);
            });
          }
        })
        .catch((err) => console.error("Failed to load mappings:", err));
    }
  }, [session, setColumnMapping]);

  const hasGLFile = !!uploadedFiles.glBalance;
  const hasSubledgerFile = !!uploadedFiles.subledgerBalance;
  const hasTransactionsFile = !!uploadedFiles.transactions;

  const glCompletion = useMemo(() => {
    if (!hasGLFile) return 0;
    const requiredFields = canonicalBalanceFields.filter((f) => f.required);
    const mapped = requiredFields.filter((f) => columnMappings.gl_balance[f.key]);
    return Math.round((mapped.length / requiredFields.length) * 100);
  }, [hasGLFile, columnMappings.gl_balance]);

  const subledgerCompletion = useMemo(() => {
    if (!hasSubledgerFile) return 0;
    const requiredFields = canonicalBalanceFields.filter((f) => f.required);
    const mapped = requiredFields.filter((f) => columnMappings.subledger_balance[f.key]);
    return Math.round((mapped.length / requiredFields.length) * 100);
  }, [hasSubledgerFile, columnMappings.subledger_balance]);

  const transactionsCompletion = useMemo(() => {
    if (!hasTransactionsFile) return 0;
    const requiredFields = transactionFields.filter((f) => f.required);
    const mapped = requiredFields.filter((f) => columnMappings.transactions[f.key]);
    return Math.round((mapped.length / requiredFields.length) * 100);
  }, [hasTransactionsFile, columnMappings.transactions]);

  const canApply = glCompletion === 100 && subledgerCompletion === 100;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-300">
            Column Mapping
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Map your columns
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Map CSV columns to canonical fields. Auto-suggest is available for quick setup.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("gl")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "gl"
              ? "border-b-2 border-sky-400 text-sky-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          GL Balance ({glCompletion}%)
        </button>
        <button
          onClick={() => setActiveTab("subledger")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "subledger"
              ? "border-b-2 border-sky-400 text-sky-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Subledger ({subledgerCompletion}%)
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "transactions"
              ? "border-b-2 border-sky-400 text-sky-400"
              : "text-slate-400 hover:text-slate-200"
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
      <div className="mt-6 flex items-center justify-between rounded-2xl border border-sky-800/40 bg-sky-500/10 p-4">
        <div>
          <p className="font-semibold text-sky-100">
            {canApply
              ? "✓ Ready to apply mappings"
              : "Complete GL and Subledger mappings to continue"}
          </p>
          <p className="mt-1 text-sm text-sky-200/80">
            {session?.user
              ? "Mappings will be saved to your account"
              : "Sign in to save mappings across sessions"}
          </p>
        </div>
        <button
          onClick={handleApplyMappings}
          disabled={!canApply}
          className="rounded-full bg-sky-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          Apply Mappings
        </button>
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
  file: any;
  mapping: ColumnMapping;
  fields: CanonicalField[];
  onAutoSuggest: () => void;
  onMappingChange: (mapping: ColumnMapping) => void;
}) {
  if (!file) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8 text-center">
        <p className="text-sm text-slate-400">
          No file uploaded for {fileType.replace("_", " ")}
        </p>
        <p className="mt-2 text-xs text-slate-500">
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

  const requiredFields = fields.filter((f) => f.required);
  const optionalFields = fields.filter((f) => !f.required);

  return (
    <div className="space-y-6">
      {/* Auto-Suggest Button */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-300">
            Detected {file.headers.length} columns in {file.name}
          </p>
          <p className="text-xs text-slate-500">
            {file.rowCount} rows loaded
          </p>
        </div>
        <button
          onClick={onAutoSuggest}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400"
        >
          🪄 Auto-Suggest Mappings
        </button>
      </div>

      {/* Required Fields */}
      <div>
        <h3 className="text-sm font-semibold text-white">Required Fields</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {requiredFields.map((field) => (
            <div key={field.key} className="rounded-xl border border-slate-800 bg-slate-900/40 p-3">
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">
                    {field.label}
                  </span>
                  <span className="text-xs text-rose-400">Required</span>
                </div>
                {field.description && (
                  <p className="mt-1 text-xs text-slate-500">{field.description}</p>
                )}
                <select
                  value={mapping[field.key] || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white focus:border-sky-400 focus:outline-none"
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
      <details className="rounded-xl border border-slate-800 bg-slate-900/40">
        <summary className="cursor-pointer p-4 text-sm font-semibold text-slate-300 hover:text-white">
          Optional Fields ({optionalFields.length})
        </summary>
        <div className="grid gap-3 p-4 pt-0 sm:grid-cols-2">
          {optionalFields.map((field) => (
            <div key={field.key} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-200">
                    {field.label}
                  </span>
                  <span className="text-xs text-slate-500">Optional</span>
                </div>
                {field.description && (
                  <p className="mt-1 text-xs text-slate-500">{field.description}</p>
                )}
                <select
                  value={mapping[field.key] || ""}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-white focus:border-sky-400 focus:outline-none"
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
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <h4 className="text-sm font-semibold text-slate-300">Current Mappings</h4>
        <div className="mt-2 space-y-1 text-xs">
          {Object.entries(mapping)
            .filter(([_, value]) => value)
            .map(([key, value]) => (
              <div key={key} className="flex items-center justify-between text-slate-400">
                <span>{key}</span>
                <span>→</span>
                <span className="font-mono text-slate-200">{value}</span>
              </div>
            ))}
          {Object.entries(mapping).filter(([_, value]) => value).length === 0 && (
            <p className="text-slate-500">No mappings set yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
