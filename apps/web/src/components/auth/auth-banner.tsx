/**
 * Authentication banner for anonymous users
 * Shows rate limit information (auth temporarily disabled)
 */

"use client";

import { RateLimitStatus } from "@/components/rate-limit-status";

export function AuthBanner() {
  // Authentication is temporarily disabled due to technical issues
  // Just show rate limit status for now

  return (
    <div className="space-y-3">
      <RateLimitStatus />

      <div className="rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
            ℹ️
          </div>
          <div>
            <p className="font-semibold text-blue-100">
              Anonymous Mode
            </p>
            <p className="mt-1 text-sm text-blue-200/80">
              You can use all reconciliation features without signing in. Your work is saved locally in this browser session. Rate limits apply to prevent abuse.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
