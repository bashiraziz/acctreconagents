"use client";

import { useState } from "react";

type UploadChannel = "structured" | "supporting";

type UploadRecord = {
  id: string;
  name: string;
  size: number;
  channel: UploadChannel;
  status: "pending" | "uploading" | "ready" | "error";
  message?: string;
};

const ACCEPTED_STRUCTURED =
  ".csv,.tsv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ACCEPTED_SUPPORTING =
  ".pdf,.doc,.docx,.ppt,.pptx,.csv,.xls,.xlsx,.txt,image/*";

export function UploadWorkspace() {
  const [uploads, setUploads] = useState<UploadRecord[]>([]);

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
            Files are persisted locally before being normalized by the
            orchestrator service.
          </p>
        </div>
        <div className="rounded-full border border-slate-800 px-3 py-1 text-xs text-slate-300">
          Max 20MB / file
        </div>
      </header>
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
              <div>
                <p className="font-medium text-white">{upload.name}</p>
                <p className="text-xs text-slate-400">
                  {(upload.size / 1024).toFixed(1)} KB · {upload.status}
                </p>
                {upload.message && (
                  <p className="text-xs text-slate-500">{upload.message}</p>
                )}
              </div>
              <span
                className={
                  upload.status === "ready"
                    ? "rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300"
                    : upload.status === "error"
                      ? "rounded-full bg-rose-500/20 px-3 py-1 text-xs font-semibold text-rose-300"
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
