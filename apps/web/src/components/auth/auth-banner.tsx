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
        <div className="alert alert-success">
          <div className="flex items-center gap-3">
            <div className="badge badge-success flex h-10 w-10 flex-shrink-0 items-center justify-center p-0 text-sm">
              OK
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Signed in as {session.user.name || session.user.email}
              </p>
              <p className="mt-1 text-sm opacity-90">
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
      <div className="alert alert-info">
        <div className="flex items-start gap-3">
          <div className="badge badge-info flex h-10 w-10 flex-shrink-0 items-center justify-center p-0 text-sm">
            A
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">
                Anonymous mode
              </p>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="whitespace-nowrap text-xs font-medium underline"
                aria-expanded={isExpanded}
              >
                {isExpanded ? "Hide details" : "Show details"}
              </button>
            </div>

            <p className="mt-1 text-sm opacity-90">
              Use all reconciliation features without signing in. Data persists in this browser.
            </p>

            {isExpanded && (
              <ul className="mt-2 space-y-1 text-sm opacity-90">
                <li>- Base limits: 30 per hour, 50 per 2 hours, 70 per 3 hours</li>
                <li>- Sign in to double limits and save mappings to your account</li>
                <li>- AI analysis uses shared quota with retry and fallback</li>
                <li>
                  - Optional: use your own {" "}
                  <a
                    href="https://ai.google.dev/gemini-api/docs/api-key"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline"
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
