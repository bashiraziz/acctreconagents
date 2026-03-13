"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const LS_KEY = "rowshni_onboarding_dismissed";

const steps = [
  {
    number: "1",
    label: "Upload files",
    detail: "GL trial balance + subledger balance (CSV, TSV, or Excel). Transactions optional.",
  },
  {
    number: "2",
    label: "Map columns",
    detail: "Match your file's column headers to the canonical fields. Auto-Suggest does most of the work.",
  },
  {
    number: "3",
    label: "Preview data",
    detail: "Review the transformed records and fix any validation issues before running.",
  },
  {
    number: "4",
    label: "Run agents",
    detail: "AI agents validate, analyse, investigate variances, and generate a reconciliation report.",
  },
];

export function GettingStarted() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(LS_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(LS_KEY, "true");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  const reopen = () => {
    try {
      localStorage.removeItem(LS_KEY);
    } catch {
      // ignore
    }
    setDismissed(false);
  };

  // Not yet read from storage — render nothing to avoid flash
  if (dismissed === null) return null;

  // Dismissed: show a small "?" help button so users can get back
  if (dismissed) {
    return (
      <div className="flex justify-end">
        <button
          type="button"
          onClick={reopen}
          className="btn btn-secondary btn-sm"
          title="Show getting started guide"
          aria-label="Show getting started guide"
        >
          ? Getting started
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border theme-border theme-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="ui-kicker">Getting started</p>
          <h2 className="mt-1 text-lg font-semibold theme-text">
            Welcome to Rowshni
          </h2>
          <p className="mt-1 text-sm theme-text-muted">
            Reconcile your GL to your subledger in four steps. No accounting system connection required — just upload your files.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="flex-shrink-0 rounded-lg p-1 text-xs theme-text-muted hover:theme-muted transition"
          aria-label="Dismiss getting started guide"
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <div key={step.number} className="rounded-2xl border theme-border theme-muted p-4">
            <div className="flex items-center gap-2">
              <span className="badge badge-neutral">{step.number}</span>
              <span className="text-sm font-semibold theme-text">{step.label}</span>
            </div>
            <p className="mt-2 text-xs theme-text-muted leading-relaxed">{step.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link href="/user-guide" className="btn btn-secondary btn-sm">
            User Guide
          </Link>
          <a href="#upload-files" className="btn btn-primary btn-sm btn-pill" onClick={dismiss}>
            Start — Upload files
          </a>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="text-xs theme-text-muted hover:underline"
        >
          Don&apos;t show again
        </button>
      </div>
    </div>
  );
}
