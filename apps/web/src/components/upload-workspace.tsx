"use client";

/**
 * Upload Workspace - Main Component
 * Refactored into smaller, focused components for better maintainability
 */

import { useFileUploadStore } from "@/store/fileUploadStore";
import { FileTypeUploadZone } from "./upload/FileTypeUploadZone";
import { useFileUpload, type UploadRecord } from "./upload/useFileUpload";

const ACCEPTED_CSV =
  ".csv,.tsv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ACCEPTED_CSV_OR_PDF =
  ".csv,.tsv,.xls,.xlsx,.pdf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/pdf";
const ACCEPTED_SUPPORTING =
  ".pdf,.doc,.docx,.ppt,.pptx,.csv,.xls,.xlsx,.txt,image/*";

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

  return (
    <section className="theme-card theme-border border p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold theme-text">Upload Files</h2>
          <p className="mt-1 text-sm theme-text-muted">
            Upload your GL balance, subledger balance, and transaction files (CSV format).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded border theme-border theme-muted px-3 py-1 text-xs theme-text-muted">
            Max 20MB
          </div>
          {(uploadedFiles.glBalance || uploadedFiles.subledgerBalance || uploadedFiles.transactions || uploads.length > 0) && (
            <button
              onClick={() => {
                if (confirm("Clear all uploaded files? This will reset your workflow.")) {
                  clearAllFiles();
                  clearUploads();
                }
              }}
              className="rounded border theme-border theme-card px-3 py-1 text-xs font-medium theme-text-muted transition hover:theme-muted"
            >
              Clear All
            </button>
          )}
        </div>
      </header>

      {/* Three Separate Upload Zones */}
      <div className="mt-6 space-y-3">
        {/* GL Balance Upload */}
        <FileTypeUploadZone
          fileType="gl_balance"
          label="GL Trial Balance"
          description="CSV or PDF - Period auto-detected from filename"
          accept={ACCEPTED_CSV_OR_PDF}
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
          description="CSV or PDF - Period auto-detected from filename"
          accept={ACCEPTED_CSV_OR_PDF}
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
          description="Optional: Transaction-level detail for variance investigation"
          accept={ACCEPTED_CSV}
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
      </div>

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
                      <span>•</span>
                      <span className="capitalize">{upload.fileType.replace("_", " ")}</span>
                    </>
                  )}
                  {upload.rowCount && upload.columnCount && (
                    <>
                      <span>•</span>
                      <span>
                        {upload.rowCount} rows × {upload.columnCount} cols
                      </span>
                    </>
                  )}
                </div>
                {upload.message && <p className="mt-1 text-xs text-gray-500">{upload.message}</p>}
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
