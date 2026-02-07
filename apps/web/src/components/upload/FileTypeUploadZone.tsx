"use client";

/**
 * File Type Upload Zone Component
 * Combines file upload with metadata form for structured files
 */

import { FileUploadZone } from "./FileUploadZone";
import { FileMetadataForm } from "./FileMetadataForm";
import type { FileType, AccountingSystem, UploadedFile } from "@/types/reconciliation";
import type { UploadRecord } from "./useFileUpload";

interface FileTypeUploadZoneProps {
  fileType: FileType;
  label: string;
  description: string;
  accept: string;
  uploadedFile: UploadedFile | null;
  uploadRecord?: UploadRecord;
  onFiles: (files: FileList | null) => void;
  onRemove: () => void;
  onMetadataUpdate?: (metadata: {
    accountCode?: string;
    period?: string;
    currency?: string;
    reverseSign?: boolean;
  }) => void;
  onAccountingSystemUpdate?: (system: AccountingSystem) => void;
  required: boolean;
}

export function FileTypeUploadZone({
  fileType,
  label,
  description,
  accept,
  uploadedFile,
  uploadRecord,
  onFiles,
  onRemove,
  onMetadataUpdate,
  onAccountingSystemUpdate,
  required,
}: FileTypeUploadZoneProps) {
  // Show error state if upload failed
  if (uploadRecord?.status === "error") {
    return (
      <div className="rounded border border-red-500/40 bg-red-500/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-500/20 dark:text-red-400 text-red-700">
              ✕
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold dark:text-red-100 text-red-900">{label}</p>
              <p className="mt-0.5 text-xs dark:text-red-200/80 text-red-800 truncate">
                {uploadRecord.name}
              </p>
              {uploadRecord.message && (
                <p className="mt-1 text-xs dark:text-red-300 text-red-700">
                  Error: {uploadRecord.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <label className="cursor-pointer">
              <div className="rounded border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-medium dark:text-blue-200 text-blue-900 transition hover:bg-blue-500/20">
                Try Again
              </div>
              <input
                type="file"
                className="hidden"
                accept={accept}
                onChange={(e) => onFiles(e.target.files)}
              />
            </label>
            <button
              onClick={onRemove}
              className="rounded border theme-border theme-card px-3 py-1 text-xs font-medium theme-text-muted transition hover:theme-muted"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (uploadedFile) {
    // Show uploaded file info + metadata form
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

        {/* Metadata Form */}
        {onMetadataUpdate && onAccountingSystemUpdate && (
          <FileMetadataForm
            fileType={fileType}
            metadata={uploadedFile.metadata}
            accountingSystem={uploadedFile.accountingSystem}
            onMetadataChange={onMetadataUpdate}
            onAccountingSystemChange={onAccountingSystemUpdate}
          />
        )}
      </div>
    );
  }

  // Show upload zone
  return (
    <FileUploadZone
      label={label}
      description={description}
      accept={accept}
      required={required}
      onFiles={onFiles}
    />
  );
}
