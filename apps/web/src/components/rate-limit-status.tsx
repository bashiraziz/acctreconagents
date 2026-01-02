"use client";

import { useEffect, useState } from "react";

interface RateLimitInfo {
  authenticated: boolean;
  limit: number;
  remaining: number;
  reset: string;
  window: string;
}

export function RateLimitStatus() {
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRateLimitStatus() {
      try {
        const response = await fetch("/api/rate-limit");
        if (response.ok) {
          const data = await response.json();
          setRateLimitInfo(data);
        }
      } catch (error) {
        console.error("Failed to fetch rate limit status:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchRateLimitStatus();
    // Refresh every 30 seconds
    const interval = setInterval(fetchRateLimitStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  // Don't show anything if loading or no data
  if (loading || !rateLimitInfo) {
    return null;
  }

  const { remaining, limit } = rateLimitInfo;
  const percentage = (remaining / limit) * 100;

  // Color coding based on remaining uses (anonymous mode thresholds)
  const lowThreshold = Math.max(2, Math.floor(limit * 0.1));
  const mediumThreshold = Math.max(lowThreshold + 1, Math.floor(limit * 0.2));

  let statusColor = "text-emerald-400";
  let bgColor = "bg-emerald-500/20";
  let borderColor = "border-emerald-500/40";

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
    <div className={`rounded-2xl border ${borderColor} ${bgColor} p-4`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-800 text-base font-semibold text-white">
            {remaining}
          </div>
          <div>
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
          <div className="h-2 w-24 flex-shrink-0 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full transition-all ${
                remaining <= 2 ? "bg-rose-500" : remaining <= 3 ? "bg-amber-500" : "bg-emerald-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
