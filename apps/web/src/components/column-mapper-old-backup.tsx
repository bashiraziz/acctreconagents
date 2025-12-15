"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CanonicalField,
  canonicalBalanceFields,
  transactionFields,
} from "@/lib/spec";

type Mapping = Record<string, string>;

const STORAGE_KEY = "acctreconagents.column-mapping";
const UPLOADED_HEADERS_STORAGE_KEY = "acctreconagents.uploaded-file-headers";

type StoredHeaderSnapshot = {
  version: 1;
  files: StoredHeaderFile[];
};

type StoredHeaderFile = {
  name: string;
  channel: "structured" | "supporting";
  headers: string[];
  capturedAt: number;
};

const parseHeaders = (raw: string) =>
  raw
    .split(/,|\n/)
    .map((header) => header.trim())
    .filter(Boolean);

const allFields = [...canonicalBalanceFields, ...transactionFields];

export function ColumnMapper() {
  const [balanceRawHeaders, setBalanceRawHeaders] = useState("");
  const [transactionRawHeaders, setTransactionRawHeaders] = useState("");
  const [mappingPanelOpen, setMappingPanelOpen] = useState(false);
  const [showAllBalanceFields, setShowAllBalanceFields] = useState(false);
  const [showAllTransactionFields, setShowAllTransactionFields] = useState(false);
  const [uploadedHeaders, setUploadedHeaders] = useState<StoredHeaderFile[]>([]);
  const [balanceHeaderSource, setBalanceHeaderSource] = useState("");
  const [transactionHeaderSource, setTransactionHeaderSource] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const read = () => {
      try {
        const raw = window.localStorage.getItem(UPLOADED_HEADERS_STORAGE_KEY);
        if (!raw) {
          setUploadedHeaders([]);
          return;
        }
        const parsed = JSON.parse(raw) as StoredHeaderSnapshot;
        const files = Array.isArray(parsed?.files) ? parsed.files : [];
        setUploadedHeaders(files);
      } catch {
        setUploadedHeaders([]);
      }
    };

    read();

    const onCustom = () => read();
    window.addEventListener("storage", read);
    window.addEventListener("acctreconagents:uploaded-headers", onCustom);

    return () => {
      window.removeEventListener("storage", read);
      window.removeEventListener("acctreconagents:uploaded-headers", onCustom);
    };
  }, []);

  const balanceHeaders = useMemo(
    () => parseHeaders(balanceRawHeaders),
    [balanceRawHeaders],
  );
  const transactionHeaders = useMemo(
    () => parseHeaders(transactionRawHeaders),
    [transactionRawHeaders],
  );

  const usingDefaultBalanceHeaders = balanceHeaders.length === 0;
  const usingDefaultTransactionHeaders = transactionHeaders.length === 0;

  const balancePlaceholder = useMemo(
    () =>
      canonicalBalanceFields
        .map((field) => field.label ?? field.key)
        .join(", "),
    [],
  );
  const transactionPlaceholder = useMemo(
    () => transactionFields.map((field) => field.label ?? field.key).join(", "),
    [],
  );

  const defaultMapping = useMemo(() => {
    const entries: Mapping = {};
    allFields.forEach((field) => {
      entries[field.key] = field.key;
    });
    return entries;
  }, []);

  const [mapping, setMapping] = useState<Mapping>(() => {
    if (typeof window === "undefined") {
      return defaultMapping;
    }
    try {
      const cached = window.localStorage.getItem(STORAGE_KEY);
      if (!cached) {
        return defaultMapping;
      }
      const parsed = JSON.parse(cached) as Mapping;
      return Object.keys(parsed).length > 0 ? parsed : defaultMapping;
    } catch (error) {
      if (typeof window !== "undefined") {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          // ignore security errors when storage access is blocked
        }
      }
      console.warn("ColumnMapper: unable to read stored mapping", error);
      return defaultMapping;
    }
  });

  const saveMapping = () => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping));
    } catch (error) {
      console.warn("ColumnMapper: unable to save mapping to localStorage", error);
    }
  };

  const resetMapping = () => {
    setMapping({ ...defaultMapping });
    setBalanceRawHeaders("");
    setTransactionRawHeaders("");
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn("ColumnMapper: unable to clear mapping storage", error);
      }
    }
  };

  const clearMappingsForFields = (
    fields: CanonicalField[],
    restoreDefault: boolean,
  ) => {
    setMapping((previous) => {
      const next = { ...previous };
      fields.forEach((field) => {
        delete next[field.key];
        if (restoreDefault) {
          next[field.key] = field.key;
        }
      });
      return next;
    });
  };

  const balanceCompletion = useMemo(() => {
    if (usingDefaultBalanceHeaders) {
      return 0;
    }
    const filled = canonicalBalanceFields.filter((field) =>
      Boolean(mapping[field.key]),
    ).length;
    return Math.round((filled / canonicalBalanceFields.length) * 100);
  }, [mapping, usingDefaultBalanceHeaders]);

  const transactionCompletion = useMemo(() => {
    if (usingDefaultTransactionHeaders) {
      return 0;
    }
    const filled = transactionFields.filter((field) =>
      Boolean(mapping[field.key]),
    ).length;
    return Math.round((filled / transactionFields.length) * 100);
  }, [mapping, usingDefaultTransactionHeaders]);

  const handleChange = (fieldKey: string, value: string) => {
    setMapping((previous) => ({
      ...previous,
      [fieldKey]: value,
    }));
  };

  const structuredHeaderFiles = useMemo(
    () =>
      uploadedHeaders
        .filter((file) => file.channel === "structured" && file.headers.length > 0)
        .sort((a, b) => b.capturedAt - a.capturedAt),
    [uploadedHeaders],
  );

  const applyHeaderFile = (
    fileName: string,
    kind: "balances" | "transactions",
  ) => {
    const snapshot = structuredHeaderFiles.find((file) => file.name === fileName);
    if (!snapshot) {
      return;
    }
    const raw = snapshot.headers.join(", ");
    const hasHeaders = snapshot.headers.length > 0;

    if (kind === "balances") {
      setBalanceRawHeaders(raw);
      clearMappingsForFields(canonicalBalanceFields, !hasHeaders);
    } else {
      setTransactionRawHeaders(raw);
      clearMappingsForFields(transactionFields, !hasHeaders);
    }

    if (hasHeaders) {
      setMappingPanelOpen(true);
    }
  };

  const renderFieldSection = (
    title: string,
    fields: CanonicalField[],
    options: string[],
    hasCustomHeaders: boolean,
    showAllFields: boolean,
    onToggleShowAll: () => void,
  ) => (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4">
      {(() => {
        const unmappedFields = fields.filter((field) => !mapping[field.key]);
        const visibleFields = hasCustomHeaders
          ? showAllFields
            ? fields
            : unmappedFields
          : fields;

        return (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
                {title}
              </div>
              {hasCustomHeaders && fields.length > 0 ? (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-slate-800/70 px-3 py-1">
                    {unmappedFields.length} unmapped
                  </span>
                  {unmappedFields.length !== fields.length ? (
                    <button
                      type="button"
                      className="rounded-full border border-slate-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-300 transition hover:border-slate-300 hover:text-slate-100"
                      onClick={onToggleShowAll}
                    >
                      {showAllFields ? "Show unmapped" : "Show all"}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="mt-3 max-h-[28rem] space-y-3 overflow-auto pr-1">
              {hasCustomHeaders && visibleFields.length === 0 ? (
                <div className="rounded-xl border border-slate-800/70 bg-slate-950/40 p-3 text-sm text-slate-300">
                  All fields are mapped.
                </div>
              ) : (
                visibleFields.map((field) => (
          <div
            key={field.key}
            className="rounded-xl border border-slate-800/70 bg-slate-950/70 p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {field.label}
                </p>
                {field.description ? (
                  <p className="text-xs text-slate-400">{field.description}</p>
                ) : null}
              </div>
              <span
                className={
                  field.required
                    ? "rounded-full bg-rose-500/20 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-200"
                    : "rounded-full bg-slate-700/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300"
                }
              >
                {field.required ? "Required" : "Optional"}
              </span>
            </div>
            {hasCustomHeaders ? (
              <select
                className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-sky-400"
                value={mapping[field.key] ?? ""}
                onChange={(event) =>
                  handleChange(field.key, event.target.value)
                }
              >
                <option value="" disabled>
                  Select the column for &ldquo;{field.label ?? field.key}&rdquo;
                </option>
                {options.map((header) => (
                  <option key={`${field.key}-${header}`} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            ) : (
              <div className="mt-3 w-full rounded-lg border border-slate-700/80 bg-slate-900/60 px-3 py-2 text-sm text-slate-300">
                Using the default column &ldquo;{field.label ?? field.key}
                &rdquo;. Paste your header row to remap this field.
              </div>
            )}
          </div>
                ))
              )}
            </div>
          </>
        );
      })()}
    </div>
  );

  const [previewOpen, setPreviewOpen] = useState(false);
  const balanceUnmapped = canonicalBalanceFields.filter(
    (field) => !mapping[field.key],
  ).length;
  const transactionUnmapped = transactionFields.filter(
    (field) => !mapping[field.key],
  ).length;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 shadow-xl shadow-black/30">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300">
            Required column mapping
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Column harmonizer
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Match your file&apos;s column headers to the names this app expects
            before the agents run their tools.
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Tip: the field mapping panel below is collapsible — expand it when you&apos;re ready to map columns.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
            <span className="rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1">
              1. Paste headers
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1">
              2. Map fields
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1">
              3. Save mapping
            </span>
          </div>
          <details className="mt-2 text-xs text-slate-400">
            <summary className="cursor-pointer select-none uppercase tracking-[0.3em] text-slate-500 hover:text-slate-200">
              Need help?
            </summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Paste the exact header row from your CSV or Excel file.</li>
              <li>
                Use the dropdowns to choose which source column matches each
                required field.
              </li>
              <li>
                Click <span className="text-slate-200">Save mapping</span> to
                reuse it next time.
              </li>
            </ol>
          </details>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 transition hover:border-slate-300"
            onClick={saveMapping}
          >
            Save mapping
          </button>
          <button
            type="button"
            className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400 transition hover:border-rose-400 hover:text-rose-200"
            onClick={resetMapping}
          >
            Reset
          </button>
        </div>
      </header>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Paste balances header row
            <textarea
              className="mt-2 w-full rounded-xl border border-slate-700 bg-black/40 p-3 text-sm text-slate-200 focus:border-sky-400 focus:outline-none"
              rows={2}
              value={balanceRawHeaders}
              onChange={(event) => {
                const raw = event.target.value;
                setBalanceRawHeaders(raw);
                const hasHeaders = parseHeaders(raw).length > 0;
                clearMappingsForFields(canonicalBalanceFields, !hasHeaders);
                if (hasHeaders) {
                  setMappingPanelOpen(true);
                }
              }}
              placeholder={balancePlaceholder}
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="rounded-full bg-slate-800/70 px-3 py-1">
              {balanceHeaders.length} headers detected
            </span>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-200">
              {balanceCompletion}% mapped
            </span>
          </div>
          {structuredHeaderFiles.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="uppercase tracking-[0.25em] text-slate-500">
                Use uploaded file
              </span>
              <select
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-400"
                value={balanceHeaderSource}
                onChange={(event) => setBalanceHeaderSource(event.target.value)}
              >
                <option value="">Select…</option>
                {structuredHeaderFiles.map((file) => (
                  <option key={`balances-${file.name}`} value={file.name}>
                    {file.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-full border border-slate-700 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:border-slate-300"
                onClick={() => applyHeaderFile(balanceHeaderSource, "balances")}
                disabled={!balanceHeaderSource}
              >
                Fill
              </button>
            </div>
          ) : null}
        </div>
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-4">
          <label className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
            Paste transaction header row
            <textarea
              className="mt-2 w-full rounded-xl border border-slate-700 bg-black/40 p-3 text-sm text-slate-200 focus:border-sky-400 focus:outline-none"
              rows={2}
              value={transactionRawHeaders}
              onChange={(event) => {
                const raw = event.target.value;
                setTransactionRawHeaders(raw);
                const hasHeaders = parseHeaders(raw).length > 0;
                clearMappingsForFields(transactionFields, !hasHeaders);
                if (hasHeaders) {
                  setMappingPanelOpen(true);
                }
              }}
              placeholder={transactionPlaceholder}
            />
          </label>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="rounded-full bg-slate-800/70 px-3 py-1">
              {transactionHeaders.length} headers detected
            </span>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-200">
              {transactionCompletion}% mapped
            </span>
          </div>
          {structuredHeaderFiles.length > 0 ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="uppercase tracking-[0.25em] text-slate-500">
                Use uploaded file
              </span>
              <select
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-xs text-slate-100 outline-none focus:border-sky-400"
                value={transactionHeaderSource}
                onChange={(event) => setTransactionHeaderSource(event.target.value)}
              >
                <option value="">Select…</option>
                {structuredHeaderFiles.map((file) => (
                  <option key={`transactions-${file.name}`} value={file.name}>
                    {file.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded-full border border-slate-700 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-200 transition hover:border-slate-300"
                onClick={() =>
                  applyHeaderFile(transactionHeaderSource, "transactions")
                }
                disabled={!transactionHeaderSource}
              >
                Fill
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <details
        className="mt-4 rounded-2xl border border-slate-800/80 bg-black/20 p-4"
        open={mappingPanelOpen}
        onToggle={(event) => setMappingPanelOpen(event.currentTarget.open)}
      >
        <summary className="cursor-pointer select-none text-sm font-semibold text-slate-100">
          Field mapping{" "}
          <span className="ml-2 inline-flex flex-wrap gap-2 align-middle text-xs font-normal text-slate-400">
            {!usingDefaultBalanceHeaders ? (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-200">
                balances {balanceCompletion}% ({balanceUnmapped} unmapped)
              </span>
            ) : (
              <span className="rounded-full bg-slate-800/70 px-3 py-1">
                paste balance headers to map
              </span>
            )}
            {!usingDefaultTransactionHeaders ? (
              <span className="rounded-full bg-emerald-500/15 px-3 py-1 font-semibold text-emerald-200">
                transactions {transactionCompletion}% ({transactionUnmapped} unmapped)
              </span>
            ) : (
              <span className="rounded-full bg-slate-800/70 px-3 py-1">
                paste transaction headers to map
              </span>
            )}
          </span>
        </summary>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {renderFieldSection(
            "Balances columns",
            canonicalBalanceFields,
            balanceHeaders,
            !usingDefaultBalanceHeaders,
            showAllBalanceFields,
            () => setShowAllBalanceFields((prev) => !prev),
          )}
          {renderFieldSection(
            "Transaction columns",
            transactionFields,
            transactionHeaders,
            !usingDefaultTransactionHeaders,
            showAllTransactionFields,
            () => setShowAllTransactionFields((prev) => !prev),
          )}
        </div>

        <MappingPreview
          mapping={mapping}
          balanceActive={!usingDefaultBalanceHeaders}
          transactionActive={!usingDefaultTransactionHeaders}
          open={previewOpen}
          onToggle={() => setPreviewOpen((prev) => !prev)}
        />
      </details>
    </section>
  );
}

type PreviewProps = {
  mapping: Mapping;
  balanceActive: boolean;
  transactionActive: boolean;
  open: boolean;
  onToggle: () => void;
};

function MappingPreview({
  mapping,
  balanceActive,
  transactionActive,
  open,
  onToggle,
}: PreviewProps) {
  const preview = Object.entries(mapping)
    .filter(([, column]) => Boolean(column))
    .filter(([target]) => {
      const isBalance = canonicalBalanceFields.some(
        (field) => field.key === target,
      );
      if (isBalance && !balanceActive) {
        return false;
      }
      if (!isBalance && !transactionActive) {
        return false;
      }
      return true;
    })
    .map(([target, column]) => ({ target, column }));
  const totalMapped = preview.length;

  const describe = (target: string, column: string) => {
    const isBalance = canonicalBalanceFields.some(
      (field) => field.key === target,
    );
    const fieldMeta =
      (isBalance
        ? canonicalBalanceFields.find((field) => field.key === target)
        : transactionFields.find((field) => field.key === target)) ?? null;
    const friendlyName = fieldMeta?.label ?? target;
    const section = isBalance ? "Balances column" : "Transaction column";
    const source =
      column === target
        ? `uses the column named "${column}"`
        : `is mapped to the column "${column}"`;
    return `${section} "${friendlyName}" ${source}.`;
  };

  return (
    <div className="mt-6 rounded-2xl border border-slate-800/80 bg-black/30 p-4 text-sm text-slate-300">
      <div className="flex items-center justify-between">
        <button
          type="button"
          className="text-xs uppercase tracking-[0.3em] text-slate-500 transition hover:text-slate-200"
          onClick={onToggle}
        >
          {open ? "Hide mapping preview" : "Show mapping preview"}
        </button>
        <span className="rounded-full bg-slate-800/80 px-3 py-1 text-xs font-semibold text-slate-200">
          {totalMapped} fields mapped
        </span>
      </div>
      {open ? (
        <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-200">
          {preview.length === 0 ? (
            <li>No mappings defined yet.</li>
          ) : (
            preview.map((item) => (
              <li key={`${item.target}-${item.column}`}>
                {describe(item.target, item.column)}
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
