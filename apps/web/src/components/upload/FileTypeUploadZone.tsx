"use client";

/**
 * File Type Upload Zone Component
 * Combines file upload with metadata form for structured files
 */

import { FileUploadZone } from "./FileUploadZone";
import { FileMetadataForm } from "./FileMetadataForm";
import type { FileType, AccountingSystem } from "@/types/reconciliation";

interface FileTypeUploadZoneProps {
  fileType: FileType;
  label: string;
  description: string;
  accept: string;
  uploadedFile: any;
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
  onFiles,
  onRemove,
  onMetadataUpdate,
  onAccountingSystemUpdate,
  required,
}: FileTypeUploadZoneProps) {
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
