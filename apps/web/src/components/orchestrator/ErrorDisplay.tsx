"use client";

/**
 * Error Display Component
 * Shows error messages with details, help text, and technical information
 */

export interface AgentError {
  message: string;
  detail?: string;
  help?: string[];
  technical?: string;
}

interface ErrorDisplayProps {
  error: AgentError;
}

export function ErrorDisplay({ error }: ErrorDisplayProps) {
  return (
    <div className="mt-4 rounded border theme-border theme-muted p-4 text-sm theme-text">
      <p className="font-semibold">Error: {error.message}</p>
      {error.detail && (
        <p className="mt-1 text-sm theme-text">{error.detail}</p>
      )}
      {error.help && error.help.length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm theme-text">
          {error.help.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
      {error.technical && (
        <details className="mt-3 text-xs theme-text">
          <summary className="cursor-pointer select-none font-medium uppercase theme-text hover:theme-text">
            Show Details
          </summary>
          <pre className="mt-2 whitespace-pre-wrap rounded border theme-border theme-muted p-3 text-[11px] theme-text">
            {error.technical}
          </pre>
        </details>
      )}
    </div>
  );
}
