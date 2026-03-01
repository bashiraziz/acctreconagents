"use client";

import { useRateLimitStatus } from "@/hooks/useRateLimitStatus";

export function RateLimitStatus() {
  const { data: rateLimitInfo, isLoading } = useRateLimitStatus();

  // Don't show anything if loading or no data
  if (isLoading || !rateLimitInfo) {
    return null;
  }

  const { remaining, limit } = rateLimitInfo;
  const percentage = (remaining / limit) * 100;

  // Color coding based on remaining uses (anonymous mode thresholds)
  const lowThreshold = Math.max(2, Math.floor(limit * 0.1));
  const mediumThreshold = Math.max(lowThreshold + 1, Math.floor(limit * 0.2));

  const tone = remaining <= lowThreshold ? "danger" : remaining <= mediumThreshold ? "warning" : "success";
  const alertClass =
    tone === "danger"
      ? "alert alert-danger"
      : tone === "warning"
        ? "alert alert-warning"
        : "alert alert-success";
  const badgeClass =
    tone === "danger"
      ? "badge badge-danger"
      : tone === "warning"
        ? "badge badge-warning"
        : "badge badge-success";
  const fillColor =
    tone === "danger"
      ? "var(--danger-border)"
      : tone === "warning"
        ? "var(--warning-border)"
        : "var(--success-border)";

  return (
    <div className={`${alertClass} p-3 sm:p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${badgeClass}`}>
            {remaining}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {remaining === 0 ? "Rate limit reached" : `${remaining} reconciliation${remaining !== 1 ? "s" : ""} remaining`}
            </p>
            <p className="text-xs opacity-80">
              {remaining === 0
                ? "Wait for reset or contact support"
                : `per hour (${rateLimitInfo.authenticated ? "signed in" : "anonymous mode"})`}
            </p>
          </div>
        </div>
        {remaining > 0 && (
          <div className="h-2 w-20 flex-shrink-0 overflow-hidden rounded-full theme-border theme-muted sm:w-24">
            <div
              className="h-full transition-all"
              style={{ backgroundColor: fillColor, width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
