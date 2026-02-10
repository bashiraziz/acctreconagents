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

  let statusColor = "text-amber-300";
  let bgColor = "bg-amber-500/10";
  let borderColor = "border-amber-500/30";

  if (remaining <= lowThreshold) {
    statusColor = "text-rose-400";
    bgColor = "bg-rose-500/20";
    borderColor = "border-rose-500/40";
  } else if (remaining <= mediumThreshold) {
    statusColor = "text-amber-400";
    bgColor = "bg-amber-500/20";
    borderColor = "border-amber-500/40";
  }

  return (
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-3 sm:p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white sm:text-base">
            {remaining}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${statusColor}`}>
              {remaining === 0 ? "Rate limit reached" : `${remaining} reconciliation${remaining !== 1 ? "s" : ""} remaining`}
            </p>
            <p className="text-xs text-slate-400">
              {remaining === 0
                ? "Wait for reset or contact support"
                : `per hour (${rateLimitInfo.authenticated ? "signed in" : "anonymous mode"})`}
            </p>
          </div>
        </div>
        {remaining > 0 && (
          <div className="h-2 w-20 flex-shrink-0 overflow-hidden rounded-full bg-slate-800 sm:w-24">
            <div
              className={`h-full transition-all ${
                remaining <= 2 ? "bg-rose-500" : "bg-amber-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

