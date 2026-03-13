"use client";

/**
 * Upload Workspace - Main Component
 * Refactored into smaller, focused components for better maintainability
 */

import { useState } from "react";
import { useFileUploadStore } from "@/store/fileUploadStore";
import { FileTypeUploadZone } from "./upload/FileTypeUploadZone";
import { FileUploadZone } from "./upload/FileUploadZone";
import { useFileUpload, type UploadRecord } from "./upload/useFileUpload";

const ACCEPTED_DELIMITED =
  ".csv,.tsv,.txt,.xlsx,.xls,text/csv,text/plain,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";
const ACCEPTED_SUPPORTING = ACCEPTED_DELIMITED;

export function UploadWorkspace() {
  // File upload store (migrated from old reconciliationStore)
  const uploadedFiles = useFileUploadStore((state) => state.files);
  const setUploadedFile = useFileUploadStore((state) => state.setFile);
  const clearUploadedFile = useFileUploadStore((state) => state.clearFile);
  const clearAllFiles = useFileUploadStore((state) => state.clearAll);
  const updateFileMetadata = useFileUploadStore((state) => state.updateMetadata);
  const updateAccountingSystem = useFileUploadStore((state) => state.updateAccountingSystem);

  // File upload logic
  const {
    uploads,
    handleStructuredFiles,
    handleSupportingFiles,
    removeUploadByFileType,
    clearUploads,
  } = useFileUpload();

  const structuredUploads = uploads.filter((record) => record.channel === "structured");
  const supportingUploads = uploads.filter((record) => record.channel === "supporting");

  // Get upload records by file type for error display
  const glUploadRecord = uploads.find((r) => r.fileType === "gl_balance");
  const subledgerUploadRecord = uploads.find((r) => r.fileType === "subledger_balance");
  const transactionsUploadRecord = uploads.find((r) => r.fileType === "transactions");

  const hasRequiredFiles = Boolean(uploadedFiles.glBalance && uploadedFiles.subledgerBalance);
  const [collapsed, setCollapsed] = useState(() =>
    Boolean(uploadedFiles.glBalance && uploadedFiles.subledgerBalance)
  );

  return (
    <section id="upload-files" className="ui-panel scroll-mt-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="ui-kicker">Step 1</p>
          <div className="flex items-center gap-3 mt-1">
            <h2 className="ui-title">Upload Files</h2>
            {hasRequiredFiles && (
              <span className="badge badge-success">Done</span>
            )}
          </div>
          {!collapsed && (
            <p className="ui-copy mt-1">
              Upload your GL balance, subledger balance, and transaction files. Supports CSV, TSV, TXT, and Excel (.xlsx) from any accounting system.
            </p>
          )}
          {collapsed && hasRequiredFiles && (
            <p className="mt-1 text-xs theme-text-muted truncate">
              {uploadedFiles.glBalance?.name ?? "GL uploaded"}
              {" · "}
              {uploadedFiles.subledgerBalance?.name ?? "Subledger uploaded"}
              {uploadedFiles.transactions && ` · ${uploadedFiles.transactions.name}`}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {(uploadedFiles.glBalance || uploadedFiles.subledgerBalance || uploadedFiles.transactions || uploads.length > 0) && !collapsed && (
            <button
              onClick={() => {
                if (confirm("Clear all uploaded files? This will reset your workflow.")) {
                  clearAllFiles();
                  clearUploads();
                }
              }}
              className="btn btn-secondary btn-sm"
            >
              Clear All
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="btn btn-secondary btn-sm"
            aria-expanded={!collapsed}
            aria-controls="upload-files-body"
          >
            {collapsed ? "Expand" : "Collapse"}
          </button>
        </div>
      </header>

      {/* Three Separate Upload Zones */}
      <div id="upload-files-body" className={`mt-6 space-y-3 ${collapsed ? "hidden" : ""}`}>
        {/* GL Balance Upload */}
        <FileTypeUploadZone
          fileType="gl_balance"
          label="GL Trial Balance"
          description="CSV/TSV/TXT - Period auto-detected from filename"
          accept={ACCEPTED_DELIMITED}
          uploadedFile={uploadedFiles.glBalance}
          uploadRecord={glUploadRecord}
          onFiles={(files) => handleStructuredFiles(files, "gl_balance", (file) => setUploadedFile("gl_balance", file))}
          onRemove={() => {
            clearUploadedFile("gl_balance");
            removeUploadByFileType("gl_balance");
          }}
          onMetadataUpdate={(metadata) => updateFileMetadata("gl_balance", metadata)}
          onAccountingSystemUpdate={(system) => updateAccountingSystem("gl_balance", system)}
          required
        />

        {/* Subledger Balance Upload */}
        <FileTypeUploadZone
          fileType="subledger_balance"
          label="Subledger Balance (AP/AR Aging)"
          description="CSV/TSV/TXT - Period auto-detected from filename"
          accept={ACCEPTED_DELIMITED}
          uploadedFile={uploadedFiles.subledgerBalance}
          uploadRecord={subledgerUploadRecord}
          onFiles={(files) =>
            handleStructuredFiles(files, "subledger_balance", (file) =>
              setUploadedFile("subledger_balance", file)
            )
          }
          onRemove={() => {
            clearUploadedFile("subledger_balance");
            removeUploadByFileType("subledger_balance");
          }}
          onMetadataUpdate={(metadata) => updateFileMetadata("subledger_balance", metadata)}
          onAccountingSystemUpdate={(system) => updateAccountingSystem("subledger_balance", system)}
          required
        />

        {/* Transactions Upload */}
        <FileTypeUploadZone
          fileType="transactions"
          label="Transaction Detail"
          description="Optional: Transaction-level detail for variance investigation (CSV/TSV/TXT)"
          accept={ACCEPTED_DELIMITED}
          uploadedFile={uploadedFiles.transactions}
          uploadRecord={transactionsUploadRecord}
          onFiles={(files) =>
            handleStructuredFiles(files, "transactions", (file) => setUploadedFile("transactions", file))
          }
          onRemove={() => {
            clearUploadedFile("transactions");
            removeUploadByFileType("transactions");
          }}
          required={false}
        />

        <FileUploadZone
          label="Supporting Files"
          description="Optional: Upload supporting CSV/TSV/TXT files (multiple files allowed)."
          accept={ACCEPTED_SUPPORTING}
          required={false}
          multiple
          onFiles={handleSupportingFiles}
        />
      </div>

      {/* Upload History */}
      {!collapsed && (structuredUploads.length > 0 || supportingUploads.length > 0) && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <UploadList label="Structured files" uploads={structuredUploads} />
          <UploadList label="Supporting files" uploads={supportingUploads} />
        </div>
      )}
    </section>
  );
}

function UploadList({ label, uploads }: { label: string; uploads: UploadRecord[] }) {
  return (
    <div className="rounded border theme-border theme-card p-4">
      <div className="text-xs font-medium uppercase theme-text-muted">{label}</div>
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
                      <span>|</span>
                      <span className="capitalize">{upload.fileType.replace("_", " ")}</span>
                    </>
                  )}
                  {upload.rowCount && upload.columnCount && (
                    <>
                      <span>|</span>
                      <span>
                        {upload.rowCount} rows x {upload.columnCount} cols
                      </span>
                    </>
                  )}
                </div>
                {upload.message && <p className="mt-1 text-xs text-gray-500">{upload.message}</p>}
              </div>
              <span
                className={`badge ${
                  upload.status === "ready"
                    ? "badge-success"
                    : upload.status === "error"
                      ? "badge-danger"
                      : upload.status === "uploading"
                        ? "badge-info"
                        : "badge-neutral"
                }`}
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


