/**
 * Distributed Rate Limiting
 *
 * Anonymous User Limits:
 * - 30 requests per 1 hour
 * - 50 requests per 2 hours
 * - 70 requests per 3 hours
 *
 * Authenticated User Limits (2x anonymous):
 * - 60 requests per 1 hour
 * - 100 requests per 2 hours
 * - 140 requests per 3 hours
 *
 * Storage:
 * - Production: Vercel KV (distributed, persistent)
 * - Development: In-memory (simple, fast)
 */

interface RateLimitRecord {
  timestamps: number[];
}

// Check if Vercel KV is configured
const isKVConfigured = !!(
  process.env.KV_REST_API_URL &&
  process.env.KV_REST_API_TOKEN
);

// In-memory store for development (will reset on server restart)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 10 minutes (in-memory only)
if (!isKVConfigured) {
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
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp when the limit resets
  retryAfter?: number; // Seconds until next allowed request
  window: string; // Which time window was violated
}

/**
 * Get KV client (lazy loaded)
 */
async function getKVClient() {
  if (!isKVConfigured) {
    throw new Error("Vercel KV is not configured");
  }
  const { kv } = await import("@vercel/kv");
  return kv;
}

/**
 * Get rate limit record from storage
 */
async function getRecord(identifier: string): Promise<RateLimitRecord> {
  if (isKVConfigured) {
    const kv = await getKVClient();
    const record = await kv.get<RateLimitRecord>(`ratelimit:${identifier}`);
    return record || { timestamps: [] };
  } else {
    return rateLimitStore.get(identifier) || { timestamps: [] };
  }
}

/**
 * Save rate limit record to storage
 */
async function setRecord(
  identifier: string,
  record: RateLimitRecord
): Promise<void> {
  if (isKVConfigured) {
    const kv = await getKVClient();
    // Set with 3 hour expiration (auto cleanup)
    await kv.set(`ratelimit:${identifier}`, record, { ex: 3 * 60 * 60 });
  } else {
    rateLimitStore.set(identifier, record);
  }
}

/**
 * Check if a request is allowed based on rate limits
 * @param identifier - IP address or user ID
 * @param authenticated - Whether the user is authenticated
 */
export async function checkRateLimit(
  identifier: string,
  authenticated: boolean = false
): Promise<RateLimitResult> {
  const now = Date.now();

  // Get record from storage
  const record = await getRecord(identifier);

  // Remove timestamps older than 3 hours
  const threeHoursAgo = now - 3 * 60 * 60 * 1000;
  record.timestamps = record.timestamps.filter(ts => ts > threeHoursAgo);

  // Define time windows based on authentication status
  const windows = authenticated
    ? [
        { duration: 60 * 60 * 1000, limit: 60, name: "1 hour" },       // 1 hour
        { duration: 2 * 60 * 60 * 1000, limit: 100, name: "2 hours" }, // 2 hours
        { duration: 3 * 60 * 60 * 1000, limit: 140, name: "3 hours" }, // 3 hours
      ]
    : [
        { duration: 60 * 60 * 1000, limit: 30, name: "1 hour" },      // 1 hour
        { duration: 2 * 60 * 60 * 1000, limit: 50, name: "2 hours" }, // 2 hours
        { duration: 3 * 60 * 60 * 1000, limit: 70, name: "3 hours" }, // 3 hours
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
  await setRecord(identifier, record);

  // Calculate remaining requests (most restrictive window)
  const oneHourLimit = authenticated ? 60 : 30;
  const oneHourAgo = now - 60 * 60 * 1000;
  const requestsInOneHour = record.timestamps.filter(ts => ts > oneHourAgo).length;
  const remaining = Math.max(0, oneHourLimit - requestsInOneHour);

  return {
    allowed: true,
    limit: oneHourLimit,
    remaining,
    reset: now + 60 * 60 * 1000,
    window: "1 hour",
  };
}

/**
 * Get current rate limit status without incrementing
 */
export async function getRateLimitStatus(
  identifier: string,
  authenticated: boolean = false
): Promise<Omit<RateLimitResult, "allowed">> {
  const now = Date.now();
  const oneHourLimit = authenticated ? 60 : 30;
  const record = await getRecord(identifier);

  if (!record || record.timestamps.length === 0) {
    return {
      limit: oneHourLimit,
      remaining: oneHourLimit,
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
  const remaining = Math.max(0, oneHourLimit - requestsInOneHour);

  return {
    limit: oneHourLimit,
    remaining,
    reset: now + 60 * 60 * 1000,
    window: "1 hour",
  };
}

/**
 * Clear rate limit for a specific identifier (admin function)
 */
export async function clearRateLimit(identifier: string): Promise<void> {
  if (isKVConfigured) {
    const kv = await getKVClient();
    await kv.del(`ratelimit:${identifier}`);
  } else {
    rateLimitStore.delete(identifier);
  }
}

/**
 * Get total number of tracked identifiers (monitoring)
 * Note: Only works with in-memory storage
 */
export function getRateLimitStats() {
  if (isKVConfigured) {
    return {
      totalIdentifiers: -1, // KV doesn't support listing all keys efficiently
      storageType: "kv" as const,
      identifiers: [],
    };
  }

  return {
    totalIdentifiers: rateLimitStore.size,
    storageType: "memory" as const,
    identifiers: Array.from(rateLimitStore.entries()).map(([id, record]) => ({
      id,
      requestCount: record.timestamps.length,
      lastRequest: record.timestamps.length > 0
        ? new Date(Math.max(...record.timestamps)).toISOString()
        : null,
    })),
  };
}

/**
 * Check if KV storage is available
 */
export function isKVStorageAvailable(): boolean {
  return isKVConfigured;
}

/**
 * Get storage type
 */
export function getRateLimitStorageType(): "kv" | "memory" {
  return isKVConfigured ? "kv" : "memory";
}
