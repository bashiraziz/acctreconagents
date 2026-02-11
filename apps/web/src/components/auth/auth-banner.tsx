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
        <div className="auth-success-banner rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="auth-success-icon auth-success-title flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full">
              OK
            </div>
            <div className="min-w-0 flex-1">
              <p className="auth-success-title font-semibold">
                Signed in as {session.user.name || session.user.email}
              </p>
              <p className="auth-success-body mt-1 text-sm">
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
      <div className="auth-info-banner rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="auth-info-icon flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full auth-info-title">
            A
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="auth-info-title font-semibold">
                Anonymous mode
              </p>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="auth-info-link whitespace-nowrap text-xs font-medium underline"
                aria-expanded={isExpanded}
              >
                {isExpanded ? "Hide details" : "Show details"}
              </button>
            </div>

            <p className="auth-info-body mt-1 text-sm">
              Use all reconciliation features without signing in. Data persists in this browser.
            </p>

            {isExpanded && (
              <ul className="auth-info-body mt-2 space-y-1 text-sm">
                <li>- Base limits: 30 per hour, 50 per 2 hours, 70 per 3 hours</li>
                <li>- Sign in to double limits and save mappings to your account</li>
                <li>- AI analysis uses shared quota with retry and fallback</li>
                <li>
                  - Optional: use your own {" "}
                  <a
                    href="https://ai.google.dev/gemini-api/docs/api-key"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="auth-info-link font-medium underline"
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
