/**
 * Authentication banner for all users
 * Shows rate limit information
 */

"use client";

import { useState } from "react";
import { RateLimitStatus } from "@/components/rate-limit-status";
import { useSession } from "@/lib/auth-client";

export function AuthBanner() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
            ℹ️
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-blue-100">
                {isAuthenticated ? "Rate Limits" : "Anonymous Mode"}
              </p>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-blue-300 hover:text-blue-100 underline whitespace-nowrap"
                aria-expanded={isExpanded}
              >
                {isExpanded ? "Hide details" : "Show details"}
              </button>
            </div>
            <p className="mt-1 text-sm text-blue-200/80">
              {isAuthenticated
                ? "Your rate limits help ensure fair usage for all users."
                : "You can use all reconciliation features without signing in. Your work is saved locally in this browser session."}
            </p>
            {isExpanded && (
              <ul className="mt-2 space-y-1 text-sm text-blue-200/80">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>
                    Rate limits: {isAuthenticated ? "60" : "30"} reconciliations per hour
                  </span>
                </li>
                {isAuthenticated && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <span>Extended limits: 120 per 2 hours, 180 per 3 hours</span>
                  </li>
                )}
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">•</span>
                  <span>AI analysis: shared quotas with auto-retry</span>
                </li>
                {!isAuthenticated && (
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    <span className="text-xs">
                      💡 Sign in for higher limits (60/hour) or use your own{" "}
                      <a
                        href="https://ai.google.dev/gemini-api/docs/api-key"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-blue-100"
                      >
                        free Gemini API key
                      </a>
                    </span>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      <RateLimitStatus />
    </div>
  );
}
