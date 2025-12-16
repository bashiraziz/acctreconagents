"use client";

import { useState } from "react";
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

const ACCEPTED_STRUCTURED =
  ".csv,.tsv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ACCEPTED_SUPPORTING =
  ".pdf,.doc,.docx,.ppt,.pptx,.csv,.xls,.xlsx,.txt,image/*";

export function UploadWorkspace() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [selectedFileType, setSelectedFileType] = useState<FileType>("gl_balance");

  const uploadedFiles = useReconciliationStore((state) => state.uploadedFiles);
  const setUploadedFile = useReconciliationStore((state) => state.setUploadedFile);
  const clearUploadedFile = useReconciliationStore((state) => state.clearUploadedFile);
  const clearAllFiles = useReconciliationStore((state) => state.clearAllFiles);

  const handleFiles = async (
    files: FileList | null,
    channel: UploadChannel,
  ) => {
    if (!files?.length) {
      return;
    }

    const pending = Array.from(files).map<UploadRecord>((file) => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      channel,
      fileType: channel === "structured" ? selectedFileType : undefined,
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

          // Parse CSV file if it's structured data
          if (channel === "structured" && selectedFileType) {
            const result = await parseCSVFile(file, selectedFileType);

            if (result.success && result.data) {
              // Store in Zustand
              setUploadedFile(selectedFileType, result.data);

              setUploads((records) =>
                records.map((entry) =>
                  entry.id === record.id
                    ? {
                        ...entry,
                        status: "ready",
                        rowCount: result.data!.rowCount,
                        columnCount: result.data!.columnCount,
                        message: `✓ ${result.data!.rowCount} rows, ${result.data!.columnCount} columns`,
                      }
                    : entry,
                ),
              );
            } else {
              throw new Error(result.error || "Failed to parse file");
            }
          } else {
            // For supporting documents, just upload the file
            const form = new FormData();
            form.append("file", file);
            form.append("kind", channel);
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
          }
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
    <section className="border border-gray-200 bg-white p-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Upload Files
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Upload your GL balance, subledger balance, and transaction files.
          </p>
        </div>
        <div className="rounded border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-600">
          Max 20MB
        </div>
      </header>

      {/* Currently Uploaded Files */}
      {(uploadedFiles.glBalance || uploadedFiles.subledgerBalance || uploadedFiles.transactions) && (
        <div className="mt-6 rounded border border-gray-300 bg-gray-50 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Uploaded Files</h3>
            <button
              onClick={() => {
                if (confirm("Clear all uploaded files? This will reset your workflow.")) {
                  clearAllFiles();
                  setUploads([]);
                }
              }}
              className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
            >
              Clear All
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {uploadedFiles.glBalance && (
              <div className="flex items-center justify-between rounded border border-gray-300 bg-white p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    GL Balance: {uploadedFiles.glBalance.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {uploadedFiles.glBalance.rowCount} rows, {uploadedFiles.glBalance.columnCount} columns
                  </p>
                </div>
                <button
                  onClick={() => clearUploadedFile("gl_balance")}
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Remove
                </button>
              </div>
            )}
            {uploadedFiles.subledgerBalance && (
              <div className="flex items-center justify-between rounded border border-gray-300 bg-white p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Subledger Balance: {uploadedFiles.subledgerBalance.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {uploadedFiles.subledgerBalance.rowCount} rows, {uploadedFiles.subledgerBalance.columnCount} columns
                  </p>
                </div>
                <button
                  onClick={() => clearUploadedFile("subledger_balance")}
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Remove
                </button>
              </div>
            )}
            {uploadedFiles.transactions && (
              <div className="flex items-center justify-between rounded border border-gray-300 bg-white p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Transactions: {uploadedFiles.transactions.name}
                  </p>
                  <p className="text-xs text-gray-600">
                    {uploadedFiles.transactions.rowCount} rows, {uploadedFiles.transactions.columnCount} columns
                  </p>
                </div>
                <button
                  onClick={() => clearUploadedFile("transactions")}
                  className="rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Type Selector for Structured Data */}
      <div className="mt-6 rounded border border-gray-300 bg-gray-50 p-4">
        <label className="block text-sm font-medium text-gray-900">
          Select File Type
          <select
            value={selectedFileType}
            onChange={(e) => setSelectedFileType(e.target.value as FileType)}
            className="mt-2 w-full rounded border border-gray-300 bg-white p-2.5 text-gray-900 focus:border-gray-400 focus:outline-none"
          >
            <option value="gl_balance">
              {uploadedFiles.glBalance ? "✓ " : ""}GL Trial Balance
            </option>
            <option value="subledger_balance">
              {uploadedFiles.subledgerBalance ? "✓ " : ""}Subledger Balance (AP/AR Aging)
            </option>
            <option value="transactions">
              {uploadedFiles.transactions ? "✓ " : ""}Transaction Detail
            </option>
          </select>
        </label>
        <p className="mt-2 text-xs text-sky-200/80">
          Select the type before uploading. Uploading a new file will replace the existing one.
        </p>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <UploadDropzone
          label="Structured data"
          description="GL & subledger balances, transaction detail, roll-forward templates."
          accept={ACCEPTED_STRUCTURED}
          onFiles={(files) => handleFiles(files, "structured")}
        />
        <UploadDropzone
          label="Supporting documents"
          description="PDFs, decks, approvals, tie-out screenshots—anything for audit trail."
          accept={ACCEPTED_SUPPORTING}
          onFiles={(files) => handleFiles(files, "supporting")}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <UploadList label="Structured files" uploads={structuredUploads} />
        <UploadList label="Supporting files" uploads={supportingUploads} />
      </div>
    </section>
  );
}

function UploadDropzone({
  label,
  description,
  accept,
  onFiles,
}: {
  label: string;
  description: string;
  accept: string;
  onFiles: (files: FileList | null) => void;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded border-2 border-dashed border-gray-300 bg-white p-6 text-center transition hover:border-gray-400 hover:bg-gray-50">
      <span className="text-sm font-medium text-gray-900">{label}</span>
      <span className="mt-1 text-sm text-gray-600">{description}</span>
      <span className="mt-4 rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-xs text-gray-700">
        Click to select files
      </span>
      <input
        type="file"
        multiple
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
    <div className="rounded border border-gray-300 bg-white p-4">
      <div className="text-xs font-medium uppercase text-gray-700">
        {label}
      </div>
      <div className="mt-2 space-y-2">
        {uploads.length === 0 ? (
          <p className="text-sm text-gray-500">No files uploaded</p>
        ) : (
          uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center justify-between rounded border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-900">{upload.name}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-600">
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
                    ? "rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-900"
                    : upload.status === "error"
                      ? "rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-900"
                      : upload.status === "uploading"
                        ? "rounded border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700"
                        : "rounded border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600"
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
