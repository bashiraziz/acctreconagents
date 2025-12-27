"use client";

import { useState, useEffect } from "react";
import { useReconciliationStore } from "@/store/reconciliationStore";
import { parseCSVFile } from "@/lib/parseFile";
import type { FileType } from "@/types/reconciliation";

type UploadChannel = "structured" | "supporting";

type UploadRecord = {
  id: string;
  name: string;
  size: number;
  channel: UploadChannel;
  fileType?: FileType;
  status: "pending" | "uploading" | "ready" | "error";
  message?: string;
  rowCount?: number;
  columnCount?: number;
};

const ACCEPTED_CSV =
  ".csv,.tsv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ACCEPTED_CSV_OR_PDF =
  ".csv,.tsv,.xls,.xlsx,.pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf";
const ACCEPTED_SUPPORTING =
  ".pdf,.doc,.docx,.ppt,.pptx,.csv,.xls,.xlsx,.txt,image/*";

/**
 * Extract period (YYYY-MM) from filename or file content
 * Examples:
 * - "AP_Aging_2025-12.pdf" → "2025-12"
 * - "GL Summary Dec 31, 2025.pdf" → "2025-12"
 * - "Accounts Payable 12-2025.csv" → "2025-12"
 */
function extractPeriodFromFilename(filename: string): string | undefined {
  // Pattern 1: YYYY-MM format
  const yearMonthMatch = filename.match(/(\d{4})-(\d{2})/);
  if (yearMonthMatch) {
    return `${yearMonthMatch[1]}-${yearMonthMatch[2]}`;
  }

  // Pattern 2: MM-YYYY or MM/YYYY format
  const monthYearMatch = filename.match(/(\d{2})[-/](\d{4})/);
  if (monthYearMatch) {
    return `${monthYearMatch[2]}-${monthYearMatch[1]}`;
  }

  // Pattern 3: Month name YYYY (e.g., "December 2025" or "Dec 2025")
  const monthNameMatch = filename.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2})[,\s]+(\d{4})/i);
  if (monthNameMatch) {
    const monthMap: Record<string, string> = {
      jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
      jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
    };
    const month = monthMap[monthNameMatch[1].toLowerCase().slice(0, 3)];
    return `${monthNameMatch[3]}-${month}`;
  }

  return undefined;
}

export function UploadWorkspace() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);

  const uploadedFiles = useReconciliationStore((state) => state.uploadedFiles);
  const setUploadedFile = useReconciliationStore((state) => state.setUploadedFile);
  const clearUploadedFile = useReconciliationStore((state) => state.clearUploadedFile);
  const clearAllFiles = useReconciliationStore((state) => state.clearAllFiles);
  const updateFileMetadata = useReconciliationStore((state) => state.updateFileMetadata);

  const removeUploadByFileType = (fileType: FileType) => {
    setUploads((records) => records.filter((record) => record.fileType !== fileType));
  };

  const handleFiles = async (
    files: FileList | null,
    fileType: FileType,
  ) => {
    if (!files?.length) {
      return;
    }

    const file = files[0]; // Only take first file

    // Remove any existing uploads for this file type before adding new one
    removeUploadByFileType(fileType);

    const pending: UploadRecord = {
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      channel: "structured",
      fileType,
      size: file.size,
      status: "pending",
    };

    setUploads((records) => [pending, ...records]);

    try {
      setUploads((records) =>
        records.map((entry) =>
          entry.id === pending.id ? { ...entry, status: "uploading" } : entry,
        ),
      );

      const result = await parseCSVFile(file, fileType);

      if (result.success && result.data) {
        // Auto-extract period from filename for GL and subledger files
        const extractedPeriod = extractPeriodFromFilename(file.name);
        if (extractedPeriod && (fileType === "gl_balance" || fileType === "subledger_balance")) {
          result.data.metadata = {
            ...result.data.metadata,
            period: extractedPeriod,
            reportDate: file.name, // Store original filename as reference
          };
        }

        // Store in Zustand
        setUploadedFile(fileType, result.data);

        setUploads((records) =>
          records.map((entry) =>
            entry.id === pending.id
              ? {
                  ...entry,
                  status: "ready",
                  rowCount: result.data!.rowCount,
                  columnCount: result.data!.columnCount,
                  message: `✓ ${result.data!.rowCount} rows, ${result.data!.columnCount} columns${extractedPeriod ? ` • Period: ${extractedPeriod}` : ""}`,
                }
              : entry,
          ),
        );
      } else {
        throw new Error(result.error || "Failed to parse file");
      }
    } catch (error) {
      setUploads((records) =>
        records.map((entry) =>
          entry.id === pending.id
            ? {
                ...entry,
                status: "error",
                message:
                  error instanceof Error ? error.message : "Upload failed",
              }
            : entry,
        ),
      );
    }
  };

  const handleSupportingFiles = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    const pending = Array.from(files).map<UploadRecord>((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      channel: "supporting",
      size: file.size,
      status: "pending",
    }));

    setUploads((records) => [...pending, ...records]);

    await Promise.all(
      pending.map(async (record, index) => {
        try {
          setUploads((records) =>
            records.map((entry) =>
              entry.id === record.id ? { ...entry, status: "uploading" } : entry,
            ),
          );

          const file = files[index];
          const form = new FormData();
          form.append("file", file);
          form.append("kind", "supporting");
          const response = await fetch("/api/uploads", {
            method: "POST",
            body: form,
          });

          if (!response.ok) {
            const text = await response.text();
            throw new Error(text || "Upload failed");
          }

          const payload = await response.json();
          setUploads((records) =>
            records.map((entry) =>
              entry.id === record.id
                ? {
                    ...entry,
                    status: "ready",
                    message: `stored as ${payload.fileName}`,
                  }
                : entry,
            ),
          );
        } catch (error) {
          setUploads((records) =>
            records.map((entry) =>
              entry.id === record.id
                ? {
                    ...entry,
                    status: "error",
                    message:
                      error instanceof Error ? error.message : "Upload failed",
                  }
                : entry,
            ),
          );
        }
      }),
    );
  };

  const structuredUploads = uploads.filter(
    (record) => record.channel === "structured",
  );
  const supportingUploads = uploads.filter(
    (record) => record.channel === "supporting",
  );

  return (
    <section className="theme-card theme-border border p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold theme-text">
            Upload Files
          </h2>
          <p className="mt-1 text-sm theme-text-muted">
            Upload your GL balance, subledger balance, and transaction files (CSV format).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded border theme-border theme-muted px-3 py-1 text-xs theme-text-muted">
            Max 20MB
          </div>
          {(uploadedFiles.glBalance || uploadedFiles.subledgerBalance || uploadedFiles.transactions) && (
            <button
              onClick={() => {
                if (confirm("Clear all uploaded files? This will reset your workflow.")) {
                  clearAllFiles();
                  setUploads([]);
                }
              }}
              className="rounded border theme-border theme-card px-3 py-1 text-xs font-medium theme-text-muted transition hover:theme-muted"
            >
              Clear All
            </button>
          )}
        </div>
      </header>

      {/* Three Separate Upload Zones for Each File Type */}
      <div className="mt-6 space-y-3">
        {/* GL Balance Upload */}
        <FileTypeUploadZone
          fileType="gl_balance"
          label="GL Trial Balance"
          description="CSV or PDF - Period auto-detected from filename"
          accept={ACCEPTED_CSV_OR_PDF}
          uploadedFile={uploadedFiles.glBalance}
          onFiles={(files) => handleFiles(files, "gl_balance")}
          onRemove={() => {
            clearUploadedFile("gl_balance");
            removeUploadByFileType("gl_balance");
          }}
          onMetadataUpdate={(metadata) => updateFileMetadata("gl_balance", metadata)}
          required
        />

        {/* Subledger Balance Upload */}
        <FileTypeUploadZone
          fileType="subledger_balance"
          label="Subledger Balance (AP/AR Aging)"
          description="CSV or PDF - Period auto-detected from filename"
          accept={ACCEPTED_CSV_OR_PDF}
          uploadedFile={uploadedFiles.subledgerBalance}
          onFiles={(files) => handleFiles(files, "subledger_balance")}
          onRemove={() => {
            clearUploadedFile("subledger_balance");
            removeUploadByFileType("subledger_balance");
          }}
          onMetadataUpdate={(metadata) => updateFileMetadata("subledger_balance", metadata)}
          required
        />

        {/* Transactions Upload */}
        <FileTypeUploadZone
          fileType="transactions"
          label="Transaction Detail"
          description="Optional: Transaction-level detail for variance investigation"
          accept={ACCEPTED_CSV}
          uploadedFile={uploadedFiles.transactions}
          onFiles={(files) => handleFiles(files, "transactions")}
          onRemove={() => {
            clearUploadedFile("transactions");
            removeUploadByFileType("transactions");
          }}
          required={false}
        />
      </div>

      {/* Supporting Documents Upload */}
      <SupportingDocumentsZone
        onFiles={handleSupportingFiles}
        accept={ACCEPTED_SUPPORTING}
      />

      {/* Upload History */}
      {(structuredUploads.length > 0 || supportingUploads.length > 0) && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <UploadList label="Structured files" uploads={structuredUploads} />
          <UploadList label="Supporting files" uploads={supportingUploads} />
        </div>
      )}
    </section>
  );
}

function SupportingDocumentsZone({
  onFiles,
  accept,
}: {
  onFiles: (files: FileList | null) => void;
  accept: string;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files?.length) {
      onFiles(files);
    }
  };

  return (
    <div className="mt-6">
      <label
        className={`flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed p-6 text-center transition ${
          isDragging
            ? "border-blue-500 bg-blue-500/10"
            : "theme-border theme-card hover:border-gray-400 hover:theme-muted"
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <span className={`text-sm font-medium ${isDragging ? "text-blue-300" : "theme-text"}`}>
          {isDragging ? "Drop Supporting Documents Here" : "Supporting Documents"}
        </span>
        <span className={`mt-1 text-sm ${isDragging ? "text-blue-200/80" : "theme-text-muted"}`}>
          {isDragging
            ? "Release to upload files"
            : "PDFs, decks, approvals, tie-out screenshots—anything for audit trail"}
        </span>
        <span className={`mt-4 rounded border px-3 py-1.5 text-xs ${
          isDragging
            ? "border-blue-500 bg-blue-500/20 text-blue-300 font-medium"
            : "theme-border theme-muted theme-text-muted"
        }`}>
          {isDragging ? "Drop Files Here" : "Click to select files"}
        </span>
        <input
          type="file"
          multiple
          className="sr-only"
          accept={accept}
          onChange={(event) => onFiles(event.target.files)}
        />
      </label>
    </div>
  );
}

function FileTypeUploadZone({
  fileType,
  label,
  description,
  accept,
  uploadedFile,
  onFiles,
  onRemove,
  onMetadataUpdate,
  required,
}: {
  fileType: FileType;
  label: string;
  description: string;
  accept: string;
  uploadedFile: any;
  onFiles: (files: FileList | null) => void;
  onRemove: () => void;
  onMetadataUpdate?: (metadata: { accountCode?: string; period?: string; currency?: string; reverseSign?: boolean }) => void;
  required: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [localAccountCode, setLocalAccountCode] = useState(uploadedFile?.metadata?.accountCode || "");
  const [localPeriod, setLocalPeriod] = useState(uploadedFile?.metadata?.period || "");
  const [localCurrency, setLocalCurrency] = useState(uploadedFile?.metadata?.currency || "USD");
  const [localReverseSign, setLocalReverseSign] = useState(uploadedFile?.metadata?.reverseSign || false);

  // Sync local state with uploaded file metadata (e.g., auto-extracted period)
  useEffect(() => {
    if (uploadedFile?.metadata) {
      if (uploadedFile.metadata.accountCode) {
        setLocalAccountCode(uploadedFile.metadata.accountCode);
      }
      if (uploadedFile.metadata.period) {
        setLocalPeriod(uploadedFile.metadata.period);
      }
      if (uploadedFile.metadata.currency) {
        setLocalCurrency(uploadedFile.metadata.currency);
      }
    }
  }, [uploadedFile?.metadata]);

  // Initialize metadata with default currency when file is uploaded
  useEffect(() => {
    if (uploadedFile && !uploadedFile.metadata?.currency) {
      // Set default USD if no currency is set
      onMetadataUpdate({
        accountCode: uploadedFile.metadata?.accountCode || "",
        period: uploadedFile.metadata?.period || "",
        currency: "USD",
        reverseSign: uploadedFile.metadata?.reverseSign || false
      });
    }
  }, [uploadedFile?.id, onMetadataUpdate]); // Only run when file changes

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files?.length) {
      onFiles(files);
    }
  };

  if (uploadedFile) {
    // Show uploaded file info
    const needsMetadata = onMetadataUpdate !== undefined;
    const isSubledger = fileType === "subledger_balance";
    const isGL = fileType === "gl_balance";

    return (
      <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              ✓
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-100">{label}</p>
              <p className="mt-0.5 text-xs text-emerald-200/80">
                {uploadedFile.name} • {uploadedFile.rowCount} rows × {uploadedFile.columnCount} columns
              </p>
            </div>
          </div>
          <button
            onClick={onRemove}
            className="flex-shrink-0 rounded border theme-border theme-card px-3 py-1 text-xs font-medium theme-text-muted transition hover:theme-muted"
          >
            Remove
          </button>
        </div>

        {/* Metadata inputs for GL and subledger files */}
        {needsMetadata && (
          <div className="mt-4 border-t border-emerald-500/20 pt-4">
            <div className={`grid gap-3 ${isSubledger ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {/* Account Code (only for subledger) */}
              {isSubledger && (
                <div>
                  <label className="block text-xs font-medium text-emerald-200">
                    GL Account Code
                    <span className="ml-1 text-emerald-300/60">(e.g., 200 for AP)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="200"
                    value={localAccountCode}
                    onChange={(e) => {
                      setLocalAccountCode(e.target.value);
                      onMetadataUpdate({ accountCode: e.target.value, period: localPeriod, currency: localCurrency, reverseSign: localReverseSign });
                    }}
                    className="mt-1 w-full rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-sm text-emerald-100 placeholder-emerald-300/40 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              )}

              {/* Period (for both GL and subledger) */}
              <div>
                <label className="block text-xs font-medium text-emerald-200">
                  Period
                  <span className="ml-1 text-emerald-300/60">(YYYY-MM)</span>
                </label>
                <input
                  type="text"
                  placeholder="2025-12"
                  value={localPeriod}
                  onChange={(e) => {
                    setLocalPeriod(e.target.value);
                    onMetadataUpdate({ accountCode: localAccountCode, period: e.target.value, currency: localCurrency, reverseSign: localReverseSign });
                  }}
                  className="mt-1 w-full rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-sm text-emerald-100 placeholder-emerald-300/40 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              {/* Currency (for both GL and subledger) */}
              <div>
                <label className="block text-xs font-medium text-emerald-200">
                  Currency
                  <span className="ml-1 text-emerald-300/60">(e.g., USD, EUR)</span>
                </label>
                <input
                  type="text"
                  placeholder="USD"
                  value={localCurrency}
                  onChange={(e) => {
                    setLocalCurrency(e.target.value.toUpperCase());
                    onMetadataUpdate({ accountCode: localAccountCode, period: localPeriod, currency: e.target.value.toUpperCase(), reverseSign: localReverseSign });
                  }}
                  className="mt-1 w-full rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 text-sm text-emerald-100 placeholder-emerald-300/40 focus:border-emerald-400 focus:outline-none"
                  maxLength={3}
                />
              </div>
            </div>

            {/* Sign Reversal Option */}
            <div className="mt-3 rounded border border-amber-500/30 bg-amber-500/5 p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localReverseSign}
                  onChange={(e) => {
                    setLocalReverseSign(e.target.checked);
                    onMetadataUpdate({ accountCode: localAccountCode, period: localPeriod, currency: localCurrency, reverseSign: e.target.checked });
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-amber-500/50 bg-amber-500/10 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                />
                <div>
                  <span className="text-xs font-medium text-amber-200">
                    Reverse signs (multiply all amounts by -1)
                  </span>
                  <p className="mt-1 text-xs text-amber-300/60">
                    Check this if balances have opposite signs (e.g., GL shows -10,768.63 but subledger shows 10,768.63)
                  </p>
                </div>
              </label>
            </div>

            <div className="mt-3">
              <p className="text-xs text-emerald-200/60">
                💡 {isSubledger
                  ? "These values will be added to every row in this file during mapping"
                  : "Missing values will be filled in from metadata"}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show upload zone with drag-and-drop support
  return (
    <label
      className={`flex cursor-pointer items-center justify-between rounded border-2 border-dashed p-4 transition ${
        isDragging
          ? "border-blue-500 bg-blue-500/10"
          : "theme-border theme-card hover:border-gray-400 hover:theme-muted"
      }`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isDragging ? "text-blue-300" : "theme-text"}`}>
            {isDragging ? `Drop ${label} here` : label}
          </span>
          {required && !isDragging && (
            <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-xs font-medium text-blue-400">
              Required
            </span>
          )}
        </div>
        <span className={`mt-1 block text-xs ${isDragging ? "text-blue-200/80" : "theme-text-muted"}`}>
          {isDragging ? "Release to upload" : description}
        </span>
      </div>
      <span className={`ml-4 rounded border px-3 py-1.5 text-xs font-medium ${
        isDragging
          ? "border-blue-500 bg-blue-500/20 text-blue-300"
          : "theme-border theme-muted theme-text-muted"
      }`}>
        {isDragging ? "Drop Here" : "Choose File"}
      </span>
      <input
        type="file"
        className="sr-only"
        accept={accept}
        onChange={(event) => onFiles(event.target.files)}
      />
    </label>
  );
}

function UploadList({
  label,
  uploads,
}: {
  label: string;
  uploads: UploadRecord[];
}) {
  return (
    <div className="rounded border theme-border theme-card p-4">
      <div className="text-xs font-medium uppercase theme-text-muted">
        {label}
      </div>
      <div className="mt-2 space-y-2">
        {uploads.length === 0 ? (
          <p className="text-sm theme-text-muted">No files uploaded</p>
        ) : (
          uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center justify-between rounded border theme-border theme-muted px-3 py-2 text-sm"
            >
              <div className="flex-1">
                <p className="font-medium theme-text">{upload.name}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs theme-text-muted">
                  <span>{(upload.size / 1024).toFixed(1)} KB</span>
                  {upload.fileType && (
                    <>
                      <span>•</span>
                      <span className="capitalize">{upload.fileType.replace("_", " ")}</span>
                    </>
                  )}
                  {upload.rowCount && upload.columnCount && (
                    <>
                      <span>•</span>
                      <span>{upload.rowCount} rows × {upload.columnCount} cols</span>
                    </>
                  )}
                </div>
                {upload.message && (
                  <p className="mt-1 text-xs text-gray-500">{upload.message}</p>
                )}
              </div>
              <span
                className={
                  upload.status === "ready"
                    ? "rounded border theme-border theme-card px-3 py-1 text-xs font-medium theme-text"
                    : upload.status === "error"
                      ? "rounded border theme-border theme-card px-3 py-1 text-xs font-medium theme-text"
                      : upload.status === "uploading"
                        ? "rounded border theme-border theme-muted px-3 py-1 text-xs font-medium theme-text-muted"
                        : "rounded border theme-border theme-card px-3 py-1 text-xs font-medium theme-text-muted"
                }
              >
                {upload.status}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
