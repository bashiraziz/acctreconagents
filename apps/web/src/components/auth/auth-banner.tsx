/**
 * Authentication status banner
 * Shows mode, persistence behavior, and rate-limit context.
 */

"use client";

import { useState } from "react";
import { RateLimitStatus } from "@/components/rate-limit-status";
import { useSession } from "@/lib/auth-client";

export function AuthBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: session } = useSession();

  if (session?.user) {
    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
              OK
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 dark:text-amber-100">
                Signed in as {session.user.name || session.user.email}
              </p>
              <p className="mt-1 text-sm text-slate-700 dark:text-amber-200/80">
                Mappings are saved to your account and your usage limits are doubled.
              </p>
            </div>
          </div>
        </div>

        <RateLimitStatus />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300">
            A
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-slate-900 dark:text-amber-100">
                Anonymous mode
              </p>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="whitespace-nowrap text-xs font-medium text-slate-900 underline hover:text-slate-950 dark:text-amber-200 dark:hover:text-amber-100"
                aria-expanded={isExpanded}
              >
                {isExpanded ? "Hide details" : "Show details"}
              </button>
            </div>

            <p className="mt-1 text-sm text-slate-900 dark:text-amber-200/80">
              Use all reconciliation features without signing in. Data persists in this browser.
            </p>

            {isExpanded && (
              <ul className="mt-2 space-y-1 text-sm text-slate-900 dark:text-amber-200/80">
                <li>- Base limits: 30 per hour, 50 per 2 hours, 70 per 3 hours</li>
                <li>- Sign in to double limits and save mappings to your account</li>
                <li>- AI analysis uses shared quota with retry and fallback</li>
                <li>
                  - Optional: use your own {" "}
                  <a
                    href="https://ai.google.dev/gemini-api/docs/api-key"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline text-slate-900 hover:text-slate-950 dark:text-amber-200 dark:hover:text-amber-100"
                  >
                    Gemini API key
                  </a>
                  {" "}for dedicated AI quota
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      <RateLimitStatus />
    </div>
  );
}

