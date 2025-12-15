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
    <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6 shadow-xl shadow-black/30">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-300">
            Intake
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Upload workspace
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Drag reports and supporting packages directly into these dropzones.
            Structured files are parsed immediately and stored in memory.
          </p>
        </div>
        <div className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300">
          Max 20MB / file
        </div>
      </header>

      {/* Currently Uploaded Files */}
      {(uploadedFiles.glBalance || uploadedFiles.subledgerBalance || uploadedFiles.transactions) && (
        <div className="mt-6 rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-emerald-100">Active Files</h3>
            <button
              onClick={() => {
                if (confirm("Clear all uploaded files? This will reset your workflow.")) {
                  clearAllFiles();
                  setUploads([]);
                }
              }}
              className="rounded-lg bg-red-900/50 px-3 py-1 text-xs font-medium text-red-100 transition hover:bg-red-900/80"
            >
              Clear All
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {uploadedFiles.glBalance && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-3">
                <div>
                  <p className="text-sm font-medium text-emerald-100">
                    📊 GL Balance: {uploadedFiles.glBalance.name}
                  </p>
                  <p className="text-xs text-emerald-200/70">
                    {uploadedFiles.glBalance.rowCount} rows, {uploadedFiles.glBalance.columnCount} columns
                  </p>
                </div>
                <button
                  onClick={() => clearUploadedFile("gl_balance")}
                  className="rounded-lg bg-red-900/50 px-3 py-1 text-xs font-medium text-red-100 transition hover:bg-red-900/80"
                >
                  Remove
                </button>
              </div>
            )}
            {uploadedFiles.subledgerBalance && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-3">
                <div>
                  <p className="text-sm font-medium text-emerald-100">
                    📋 Subledger Balance: {uploadedFiles.subledgerBalance.name}
                  </p>
                  <p className="text-xs text-emerald-200/70">
                    {uploadedFiles.subledgerBalance.rowCount} rows, {uploadedFiles.subledgerBalance.columnCount} columns
                  </p>
                </div>
                <button
                  onClick={() => clearUploadedFile("subledger_balance")}
                  className="rounded-lg bg-red-900/50 px-3 py-1 text-xs font-medium text-red-100 transition hover:bg-red-900/80"
                >
                  Remove
                </button>
              </div>
            )}
            {uploadedFiles.transactions && (
              <div className="flex items-center justify-between rounded-lg border border-emerald-700/30 bg-emerald-900/20 p-3">
                <div>
                  <p className="text-sm font-medium text-emerald-100">
                    💳 Transactions: {uploadedFiles.transactions.name}
                  </p>
                  <p className="text-xs text-emerald-200/70">
                    {uploadedFiles.transactions.rowCount} rows, {uploadedFiles.transactions.columnCount} columns
                  </p>
                </div>
                <button
                  onClick={() => clearUploadedFile("transactions")}
                  className="rounded-lg bg-red-900/50 px-3 py-1 text-xs font-medium text-red-100 transition hover:bg-red-900/80"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Type Selector for Structured Data */}
      <div className="mt-6 rounded-2xl border border-sky-800/40 bg-sky-500/10 p-4">
        <label className="block text-sm font-medium text-sky-100">
          File Type (for structured data)
          <select
            value={selectedFileType}
            onChange={(e) => setSelectedFileType(e.target.value as FileType)}
            className="mt-2 w-full rounded-xl border border-sky-700 bg-sky-900/50 p-3 text-white focus:border-sky-400 focus:outline-none"
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
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-6 text-center transition hover:border-sky-500/70 hover:bg-slate-900/80">
      <span className="text-base font-semibold text-white">{label}</span>
      <span className="mt-1 text-sm text-slate-400">{description}</span>
      <span className="mt-4 rounded-full bg-slate-800/70 px-3 py-1 text-xs text-slate-300">
        Click to pick files
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
    <div className="rounded-2xl border border-slate-800/70 bg-slate-900/40 p-4">
      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 space-y-2">
        {uploads.length === 0 ? (
          <p className="text-sm text-slate-500">Awaiting files...</p>
        ) : (
          uploads.map((upload) => (
            <div
              key={upload.id}
              className="flex items-center justify-between rounded-xl border border-slate-800/70 bg-slate-950/60 px-3 py-2 text-sm"
            >
              <div className="flex-1">
                <p className="font-medium text-white">{upload.name}</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
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
                  <p className="mt-1 text-xs text-slate-500">{upload.message}</p>
                )}
              </div>
              <span
                className={
                  upload.status === "ready"
                    ? "rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300"
                    : upload.status === "error"
                      ? "rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300"
                      : upload.status === "uploading"
                        ? "rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-300"
                        : "rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200"
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
