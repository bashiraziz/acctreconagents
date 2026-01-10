/**
 * Performance monitoring and measurement utilities
 * Tracks key operations and sends data to analytics
 */

/**
 * Measure the execution time of an async function
 * Automatically logs performance and optionally sends to analytics
 *
 * @param name - Descriptive name for the operation (e.g., "Transform Data", "Parse CSV")
 * @param fn - Async function to measure
 * @param logToConsole - Whether to log to console (default: true in development)
 * @returns Result of the function execution
 *
 * @example
 * ```ts
 * const data = await measurePerformance('Parse CSV File', async () => {
 *   return parseCSVFile(file);
 * });
 * ```
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
  logToConsole: boolean = process.env.NODE_ENV === 'development'
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fn();
    const duration = performance.now() - start;

    // Log to console in development
    if (logToConsole) {
      console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
    }

    // Send to analytics in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      trackPerformanceMetric(name, duration);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    if (logToConsole) {
      console.error(`[Perf] ${name} failed after ${duration.toFixed(2)}ms:`, error);
    }

    throw error;
  }
}

/**
 * Measure the execution time of a synchronous function
 *
 * @param name - Descriptive name for the operation
 * @param fn - Synchronous function to measure
 * @param logToConsole - Whether to log to console (default: true in development)
 * @returns Result of the function execution
 *
 * @example
 * ```ts
 * const result = measureSync('Apply Column Mapping', () => {
 *   return applyMapping(rows, mapping);
 * });
 * ```
 */
export function measureSync<T>(
  name: string,
  fn: () => T,
  logToConsole: boolean = process.env.NODE_ENV === 'development'
): T {
  const start = performance.now();

  try {
    const result = fn();
    const duration = performance.now() - start;

    if (logToConsole) {
      console.log(`[Perf] ${name}: ${duration.toFixed(2)}ms`);
    }

    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      trackPerformanceMetric(name, duration);
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;

    if (logToConsole) {
      console.error(`[Perf] ${name} failed after ${duration.toFixed(2)}ms:`, error);
    }

    throw error;
  }
}

/**
 * Create a performance mark for the Performance API
 * Useful for tracking page load and navigation timing
 *
 * @param markName - Name of the performance mark
 *
 * @example
 * ```ts
 * // Mark start of operation
 * mark('data-load-start');
 *
 * // ... do work ...
 *
 * // Mark end and measure
 * mark('data-load-end');
 * measure('Data Load Time', 'data-load-start', 'data-load-end');
 * ```
 */
export function mark(markName: string): void {
  if (typeof window !== 'undefined' && window.performance?.mark) {
    try {
      performance.mark(markName);
    } catch (error) {
      console.warn(`Failed to create performance mark "${markName}":`, error);
    }
  }
}

/**
 * Measure the duration between two performance marks
 *
 * @param measureName - Name for this measurement
 * @param startMark - Name of the start mark
 * @param endMark - Name of the end mark
 * @returns Duration in milliseconds, or null if measurement failed
 *
 * @example
 * ```ts
 * mark('upload-start');
 * // ... upload file ...
 * mark('upload-end');
 * const duration = measure('File Upload', 'upload-start', 'upload-end');
 * console.log(`Upload took ${duration}ms`);
 * ```
 */
export function measure(measureName: string, startMark: string, endMark: string): number | null {
  if (typeof window !== 'undefined' && window.performance?.measure) {
    try {
      const measurement = performance.measure(measureName, startMark, endMark);
      const duration = measurement.duration;

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Perf] ${measureName}: ${duration.toFixed(2)}ms`);
      }

      // Send to analytics
      if (process.env.NODE_ENV === 'production') {
        trackPerformanceMetric(measureName, duration);
      }

      return duration;
    } catch (error) {
      console.warn(`Failed to measure "${measureName}":`, error);
      return null;
    }
  }

  return null;
}

/**
 * Send performance metric to analytics
 * TODO: Integrate with Sentry Performance Monitoring
 *
 * @param metricName - Name of the metric
 * @param value - Metric value (usually duration in ms)
 */
function trackPerformanceMetric(metricName: string, value: number): void {
  // TODO: Send to Sentry
  // if (window.Sentry) {
  //   window.Sentry.captureEvent({
  //     type: 'transaction',
  //     transaction: metricName,
  //     timestamp: Date.now() / 1000,
  //     contexts: {
  //       trace: {
  //         op: 'performance.metric',
  //       },
  //     },
  //     measurements: {
  //       duration: { value, unit: 'millisecond' },
  //     },
  //   });
  // }

  // Send to Vercel Analytics (custom event)
  if (typeof window !== 'undefined' && (window as any).va) {
    try {
      (window as any).va('event', {
        name: 'performance_metric',
        data: {
          metric: metricName,
          duration: Math.round(value),
        },
      });
    } catch (error) {
      console.warn('Failed to send performance metric to analytics:', error);
    }
  }
}

/**
 * Track Web Vitals (Core Web Vitals + other important metrics)
 * Automatically reports: LCP, FID, CLS, FCP, TTFB
 *
 * To use, call this function once when your app initializes
 *
 * @example
 * ```ts
 * // In your root component or layout
 * useEffect(() => {
 *   trackWebVitals();
 * }, []);
 * ```
 */
export function trackWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Track Core Web Vitals using Vercel's built-in support
  // Vercel Analytics automatically tracks these when installed
  // This function is here for custom tracking if needed

  // Additional custom vitals tracking can be added here
  // For example, tracking time to interactive, first contentful paint, etc.
}

/**
 * Report an error to error tracking service
 * TODO: Integrate with Sentry
 *
 * @param error - Error object or string
 * @param context - Additional context about the error
 *
 * @example
 * ```ts
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   reportError(error, {
 *     operation: 'Data Transform',
 *     fileType: 'gl_balance',
 *     userId: session.user.id,
 *   });
 *   throw error;
 * }
 * ```
 */
export function reportError(error: Error | string, context?: Record<string, any>): void {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', error, context);
  }

  // TODO: Send to Sentry in production
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     extra: context,
  //   });
  // }
}
