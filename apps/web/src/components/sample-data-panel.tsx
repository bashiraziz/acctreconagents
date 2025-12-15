"use client";

import { useEffect, useState } from "react";

interface SampleFile {
  name: string;
  path: string;
}

interface SampleModule {
  module: string;
  files: SampleFile[];
}

export function SampleDataPanel() {
  const [modules, setModules] = useState<SampleModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/mock-data")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Unable to load sample data");
        }
        return response.json();
      })
      .then((payload) => {
        setModules(payload.modules ?? []);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300">Sample data</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">Download mock accounting files</h3>
          <p className="mt-1 text-sm text-slate-400">
            Grab canned CSVs to test uploads, mapping, and reconciliation flows without touching real customer data.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-200 transition hover:border-slate-400"
          onClick={() => setOpen((previous) => !previous)}
        >
          {open ? "Hide sample files" : "Show sample files"}
        </button>
      </header>
      {!open ? null : loading ? (
        <p className="mt-4 text-sm text-slate-400">Loading mock data-</p>
      ) : error ? (
        <p className="mt-4 text-sm text-rose-300">{error}</p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {modules.map((module) => (
            <div key={module.module} className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4">
              <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">{module.module}</h4>
              <ul className="mt-3 space-y-2 text-sm">
                {module.files.map((file) => (
                  <li key={file.path} className="flex items-center justify-between gap-3">
                    <span className="text-slate-200">{file.name}</span>
                    <a
                      className="rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-100 transition hover:border-sky-400 hover:text-sky-200"
                      href={`/api/mock-data/download?file=${encodeURIComponent(file.path)}`}
                    >
                      Download
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
