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
    <section className="ui-panel">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="ui-kicker theme-text-muted">Sample data</p>
          <h3 className="ui-title mt-1 theme-text">Download test scenario files</h3>
          <p className="simple-mode-compact ui-copy mt-1 theme-text-muted">
            Realistic reconciliation scenarios for balanced cases, variances, cutoff timing differences, and multi-period analysis.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => setOpen((previous) => !previous)}
        >
          {open ? "Hide sample files" : "Show sample files"}
        </button>
      </header>
      {!open ? null : loading ? (
        <div className="mt-4 grid gap-4 animate-pulse lg:grid-cols-2" aria-label="Loading sample files">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border theme-border theme-muted p-4">
              <div className="h-4 w-36 rounded theme-card" />
              <div className="mt-3 space-y-3">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="flex items-center gap-3">
                    <div className="h-3 flex-1 rounded theme-card" />
                    <div className="h-7 w-20 rounded theme-card flex-shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <p className="alert alert-danger mt-4 text-sm">{error}</p>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {modules.map((module) => (
            <div key={module.module} className="rounded-2xl border theme-border theme-muted p-4">
              <h4 className="text-sm font-semibold theme-text">{module.module}</h4>
              <ul className="mt-3 space-y-2.5 text-sm">
                {module.files.map((file) => (
                  <li key={file.path} className="flex items-center gap-3">
                    <span className="min-w-0 flex-1 truncate theme-text" title={file.name}>
                      {file.name}
                    </span>
                    <a
                      className="btn btn-secondary btn-sm flex-shrink-0"
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
