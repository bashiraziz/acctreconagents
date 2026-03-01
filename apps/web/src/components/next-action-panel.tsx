"use client";

import { useMemo } from "react";
import { useAgentRunStore } from "@/store/agentRunStore";
import { useColumnMappingStore } from "@/store/columnMappingStore";
import { useFileUploadStore } from "@/store/fileUploadStore";

type FlowStep = {
  label: string;
  ready: boolean;
  status: string;
  href: string;
};

type NextAction = {
  title: string;
  detail: string;
  href: string;
  cta: string;
};

export function NextActionPanel() {
  const files = useFileUploadStore((state) => state.files);
  const reconciliationData = useFileUploadStore((state) => state.reconciliationData);
  const mappings = useColumnMappingStore((state) => state.mappings);
  const isRunning = useAgentRunStore((state) => state.isRunning);

  const hasRequiredFiles = Boolean(files.glBalance && files.subledgerBalance);
  const hasAnyMapping =
    Object.keys(mappings.gl_balance).length > 0 ||
    Object.keys(mappings.subledger_balance).length > 0 ||
    Object.keys(mappings.transactions).length > 0;
  const hasPreparedData = Boolean(reconciliationData);

  const nextAction = useMemo<NextAction>(() => {
    if (!hasRequiredFiles) {
      return {
        title: "Upload required files",
        detail: "Start with GL and subledger balances so mapping can begin.",
        href: "#upload-files",
        cta: "Go to Upload",
      };
    }

    if (!hasPreparedData && !hasAnyMapping) {
      return {
        title: "Map required columns",
        detail: "Use Auto-Suggest, review required fields, then apply mappings.",
        href: "#map-columns",
        cta: "Go to Mapping",
      };
    }

    if (!hasPreparedData) {
      return {
        title: "Apply mappings and preview",
        detail: "Generate transformed data, then verify issues before running agents.",
        href: "#map-columns",
        cta: "Finalize Mapping",
      };
    }

    if (isRunning) {
      return {
        title: "Monitor running agents",
        detail: "Validation, analysis, investigation, and report are now in progress.",
        href: "#run-agents",
        cta: "Open Run Console",
      };
    }

    return {
      title: "Run AI reconciliation",
      detail: "Data is prepared. Launch agents to generate analysis and report output.",
      href: "#run-agents",
      cta: "Run Agents",
    };
  }, [hasAnyMapping, hasPreparedData, hasRequiredFiles, isRunning]);

  const steps: FlowStep[] = [
    {
      label: "1. Upload",
      ready: hasRequiredFiles,
      status: hasRequiredFiles ? "Ready" : "Pending",
      href: "#upload-files",
    },
    {
      label: "2. Map",
      ready: hasPreparedData || hasAnyMapping,
      status: hasPreparedData ? "Applied" : hasAnyMapping ? "In progress" : "Pending",
      href: "#map-columns",
    },
    {
      label: "3. Preview",
      ready: hasPreparedData,
      status: hasPreparedData ? "Ready" : "Pending",
      href: "#preview-data",
    },
    {
      label: "4. Reconcile",
      ready: isRunning || hasPreparedData,
      status: isRunning ? "Running" : hasPreparedData ? "Ready" : "Pending",
      href: "#run-agents",
    },
  ];

  return (
    <section className="ui-panel">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="ui-kicker">Next Action</p>
          <h3 className="mt-1 text-lg font-semibold theme-text">{nextAction.title}</h3>
          <p className="mt-1 text-sm theme-text-muted">{nextAction.detail}</p>
        </div>
        <a href={nextAction.href} className="btn btn-primary btn-md btn-pill">
          {nextAction.cta}
        </a>
      </div>

      <div className="simple-mode-compact mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <div key={step.label} className="rounded-xl border theme-border theme-muted p-3">
            <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">{step.label}</p>
            <span
              className={`mt-2 inline-flex ${
                step.href === nextAction.href ? "badge badge-info" : "badge badge-neutral"
              }`}
            >
              {step.status}
            </span>
          </div>
        ))}
      </div>

      <div className="simple-mode-compact mt-4 flex flex-wrap gap-2">
        <a className="btn btn-secondary btn-sm" href="#upload-files">
          Upload
        </a>
        <a className="btn btn-secondary btn-sm" href="#map-columns">
          Map
        </a>
        <a className="btn btn-secondary btn-sm" href="#preview-data">
          Preview
        </a>
        <a className="btn btn-secondary btn-sm" href="#run-agents">
          Run
        </a>
      </div>
    </section>
  );
}
