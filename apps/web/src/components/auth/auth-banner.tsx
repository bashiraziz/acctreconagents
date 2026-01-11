/**
 * Anonymous mode banner
 * Shows rate limit information for anonymous users
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
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 dark:text-emerald-300 text-emerald-700">
              ✓
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold dark:text-emerald-100 text-slate-900">
                Signed in as {session.user.name || session.user.email}
              </p>
              <p className="mt-1 text-sm dark:text-emerald-200/80 text-slate-700">
                Your mappings are saved to your account and your rate limits are doubled.
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
      <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 dark:text-blue-400 text-blue-700">
            👤
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold dark:text-blue-100 text-blue-900">
                Anonymous Mode
              </p>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs dark:text-blue-300 dark:hover:text-blue-100 text-blue-900 hover:text-blue-950 underline whitespace-nowrap font-medium"
                aria-expanded={isExpanded}
              >
                {isExpanded ? "Hide details" : "Show details"}
              </button>
            </div>
            <p className="mt-1 text-sm dark:text-blue-200/80 text-slate-900">
              You can use all reconciliation features without signing in. Your work is saved locally in this browser session.
            </p>
            {isExpanded && (
              <ul className="mt-2 space-y-1 text-sm dark:text-blue-200/80 text-slate-900">
                <li className="flex items-start gap-2">
                  <span className="dark:text-blue-400 text-blue-900">•</span>
                  <span>
                    Rate limits: 30 reconciliations per hour
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="dark:text-blue-400 text-blue-900">•</span>
                  <span>
                    Sign in to double your rate limits and save mappings
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="dark:text-blue-400 text-blue-900">•</span>
                  <span>Extended limits: 50 per 2 hours, 70 per 3 hours</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="dark:text-blue-400 text-blue-900">•</span>
                  <span>AI analysis: shared quotas with auto-retry</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="dark:text-blue-400 text-blue-900">•</span>
                  <span className="text-xs">
                    💡 Use your own{" "}
                    <a
                      href="https://ai.google.dev/gemini-api/docs/api-key"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium dark:text-blue-300 dark:hover:text-blue-100 text-blue-900 hover:text-blue-950"
                    >
                      free Gemini API key
                    </a>
                    {" "}for unlimited AI analysis
                  </span>
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
