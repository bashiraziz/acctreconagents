/**
 * React Query hook for fetching and caching rate limit status
 */

import { QueryClient, useQuery } from '@tanstack/react-query';

export interface RateLimitStatus {
  authenticated: boolean;
  limit: number;
  remaining: number;
  reset: string; // ISO 8601 timestamp
  window: string;
}

/**
 * Fetch rate limit status from API
 */
async function fetchRateLimitStatus(): Promise<RateLimitStatus> {
  const response = await fetch('/api/rate-limit');

  if (!response.ok) {
    throw new Error(`Failed to fetch rate limit status: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Hook to get current rate limit status with automatic caching
 *
 * Features:
 * - Caches data for 30 seconds (staleTime)
 * - Auto-refreshes every 5 minutes (refetchInterval)
 * - Retries failed requests 3 times
 * - Background updates don't block UI
 *
 * @example
 * ```tsx
 * function RateLimitBanner() {
 *   const { data, isLoading, error } = useRateLimitStatus();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       {data.remaining} / {data.limit} requests remaining
 *     </div>
 *   );
 * }
 * ```
 */
export function useRateLimitStatus() {
  return useQuery({
    queryKey: ['rateLimitStatus'],
    queryFn: fetchRateLimitStatus,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 300000, // Refresh every 5 minutes
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    retry: 3, // Retry failed requests up to 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
}

/**
 * Prefetch rate limit status (useful for preloading before user navigates)
 *
 * @example
 * ```tsx
 * import { useQueryClient } from '@tanstack/react-query';
 * import { prefetchRateLimitStatus } from '@/hooks/useRateLimitStatus';
 *
 * function MyComponent() {
 *   const queryClient = useQueryClient();
 *
 *   const handleMouseEnter = () => {
 *     prefetchRateLimitStatus(queryClient);
 *   };
 *
 *   return <button onMouseEnter={handleMouseEnter}>...</button>;
 * }
 * ```
 */
export async function prefetchRateLimitStatus(queryClient: QueryClient) {
  await queryClient.prefetchQuery({
    queryKey: ['rateLimitStatus'],
    queryFn: fetchRateLimitStatus,
    staleTime: 30000,
  });
}
