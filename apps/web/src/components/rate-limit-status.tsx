"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/auth-client";

interface RateLimitInfo {
  authenticated: boolean;
  limit: number;
  remaining: number;
  reset: string;
  window: string;
}

export function RateLimitStatus() {
  const { data: session } = useSession();
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
  }, [session]);

  // Don't show anything if authenticated (no limits)
  if (session?.user || loading || !rateLimitInfo) {
    return null;
  }

  const { remaining, limit } = rateLimitInfo;
  const percentage = (remaining / limit) * 100;

  // Color coding based on remaining uses
  let statusColor = "text-emerald-400";
  let bgColor = "bg-emerald-500/20";
  let borderColor = "border-emerald-500/40";

  if (remaining <= 2) {
    statusColor = "text-rose-400";
    bgColor = "bg-rose-500/20";
    borderColor = "border-rose-500/40";
  } else if (remaining <= 3) {
    statusColor = "text-amber-400";
    bgColor = "bg-amber-500/20";
    borderColor = "border-amber-500/40";
  }

  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} p-3`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
            {remaining}
          </div>
          <div>
            <p className={`text-sm font-medium ${statusColor}`}>
              {remaining === 0 ? "Rate limit reached" : `${remaining} reconciliation${remaining !== 1 ? "s" : ""} remaining`}
            </p>
            <p className="text-xs text-slate-400">
              {remaining === 0 ? "Sign in for unlimited access" : "per hour for anonymous users"}
            </p>
          </div>
        </div>
        {remaining > 0 && (
          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-800">
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
