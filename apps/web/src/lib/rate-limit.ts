/**
 * Rate limiting for anonymous users
 *
 * Limits:
 * - 5 requests per 1 hour
 * - 8 requests per 2 hours
 * - 10 requests per 3 hours
 *
 * Uses in-memory storage for simplicity. For production at scale,
 * consider migrating to Vercel KV or Redis.
 */

interface RateLimitRecord {
  timestamps: number[];
}

// In-memory store - will reset on server restart
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  const threeHoursAgo = now - 3 * 60 * 60 * 1000;

  for (const [key, record] of rateLimitStore.entries()) {
    // Remove timestamps older than 3 hours
    record.timestamps = record.timestamps.filter(ts => ts > threeHoursAgo);

    // If no recent requests, remove the entry entirely
    if (record.timestamps.length === 0) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
  retryAfter?: number; // Seconds until next allowed request
  window: string; // Which time window was violated
}

/**
 * Check if a request is allowed based on rate limits
 * @param identifier - IP address or user ID
 * @param authenticated - Whether the user is authenticated (bypasses rate limits)
 */
export function checkRateLimit(
  identifier: string,
  authenticated: boolean = false
): RateLimitResult {
  // Authenticated users bypass rate limits
  if (authenticated) {
    return {
      allowed: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
      window: "authenticated",
    };
  }

  const now = Date.now();

  // Get or create record
  let record = rateLimitStore.get(identifier);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(identifier, record);
  }

  // Remove timestamps older than 3 hours
  const threeHoursAgo = now - 3 * 60 * 60 * 1000;
  record.timestamps = record.timestamps.filter(ts => ts > threeHoursAgo);

  // Define time windows (in milliseconds)
  const windows = [
    { duration: 60 * 60 * 1000, limit: 5, name: "1 hour" },      // 1 hour
    { duration: 2 * 60 * 60 * 1000, limit: 8, name: "2 hours" }, // 2 hours
    { duration: 3 * 60 * 60 * 1000, limit: 10, name: "3 hours" }, // 3 hours
  ];

  // Check each time window
  for (const window of windows) {
    const windowStart = now - window.duration;
    const requestsInWindow = record.timestamps.filter(ts => ts > windowStart);

    if (requestsInWindow.length >= window.limit) {
      // Rate limit exceeded
      const oldestRequest = Math.min(...requestsInWindow);
      const resetTime = oldestRequest + window.duration;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      return {
        allowed: false,
        limit: window.limit,
        remaining: 0,
        reset: resetTime,
        retryAfter,
        window: window.name,
      };
    }
  }

  // All checks passed - record this request
  record.timestamps.push(now);

  // Calculate remaining requests (most restrictive window)
  const oneHourAgo = now - 60 * 60 * 1000;
  const requestsInOneHour = record.timestamps.filter(ts => ts > oneHourAgo).length;
  const remaining = Math.max(0, 5 - requestsInOneHour);

  return {
    allowed: true,
    limit: 5,
    remaining,
    reset: now + 60 * 60 * 1000,
    window: "1 hour",
  };
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
  identifier: string,
  authenticated: boolean = false
): Omit<RateLimitResult, "allowed"> {
  if (authenticated) {
    return {
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
      window: "authenticated",
    };
  }

  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || record.timestamps.length === 0) {
    return {
      limit: 5,
      remaining: 5,
      reset: now + 60 * 60 * 1000,
      window: "1 hour",
    };
  }

  // Clean old timestamps
  const threeHoursAgo = now - 3 * 60 * 60 * 1000;
  const validTimestamps = record.timestamps.filter(ts => ts > threeHoursAgo);

  // Calculate for 1 hour window
  const oneHourAgo = now - 60 * 60 * 1000;
  const requestsInOneHour = validTimestamps.filter(ts => ts > oneHourAgo).length;
  const remaining = Math.max(0, 5 - requestsInOneHour);

  return {
    limit: 5,
    remaining,
    reset: now + 60 * 60 * 1000,
    window: "1 hour",
  };
}

/**
 * Clear rate limit for a specific identifier (admin function)
 */
export function clearRateLimit(identifier: string): void {
  rateLimitStore.delete(identifier);
}

/**
 * Get total number of tracked identifiers (monitoring)
 */
export function getRateLimitStats() {
  return {
    totalIdentifiers: rateLimitStore.size,
    identifiers: Array.from(rateLimitStore.entries()).map(([id, record]) => ({
      id,
      requestCount: record.timestamps.length,
      lastRequest: record.timestamps.length > 0
        ? new Date(Math.max(...record.timestamps)).toISOString()
        : null,
    })),
  };
}
