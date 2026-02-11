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
    <section className="rounded-3xl border theme-border theme-card p-5 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="ui-kicker theme-text-muted">Sample data</p>
          <h3 className="ui-title mt-1 theme-text">Download test scenario files</h3>
          <p className="ui-copy mt-1 theme-text-muted">
            Realistic reconciliation scenarios for balanced cases, variances, cutoff timing differences, and multi-period analysis.
          </p>
        </div>
        <button
          type="button"
          className="rounded-full border theme-border theme-card px-4 py-2 text-xs font-semibold uppercase tracking-wider theme-text transition hover:theme-muted"
          onClick={() => setOpen((previous) => !previous)}
        >
          {open ? "Hide sample files" : "Show sample files"}
        </button>
      </header>
      {!open ? null : loading ? (
        <p className="mt-4 text-sm theme-text-muted">Loading sample files...</p>
      ) : error ? (
        <p className="mt-4 text-sm text-rose-500">{error}</p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {modules.map((module) => (
            <div key={module.module} className="rounded-2xl border theme-border theme-muted p-4">
              <h4 className="text-sm font-semibold uppercase tracking-[0.3em] theme-text-muted">{module.module}</h4>
              <ul className="mt-3 space-y-2.5 text-sm">
                {module.files.map((file) => (
                  <li key={file.path} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate theme-text" title={file.name}>
                      {file.name}
                    </span>
                    <a
                      className="flex-shrink-0 rounded-full border theme-border theme-card px-4 py-1.5 text-xs font-semibold uppercase tracking-wide theme-text transition hover:theme-muted"
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
