/**
 * Standardized API error handling utility
 * Provides consistent error response format across all API routes
 */

import { NextResponse } from "next/server";

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: string;
  help?: string[];
  technical?: string;
  timestamp?: string;
}

export interface ApiErrorOptions {
  /** HTTP status code (default: 500) */
  status?: number;
  /** Additional details about the error */
  details?: string;
  /** Helpful suggestions for the user */
  help?: string[];
  /** Technical error information (only in development) */
  technical?: string | Error;
  /** Additional headers to include in response */
  headers?: Record<string, string>;
  /** Whether to log the error (default: true) */
  log?: boolean;
}

/**
 * Create a standardized API error response
 *
 * @param error - Short error identifier (e.g., "auth_required", "validation_failed")
 * @param message - User-friendly error message
 * @param options - Additional error options
 * @returns NextResponse with standardized error format
 *
 * @example
 * ```ts
 * return apiError(
 *   "auth_required",
 *   "Authentication required",
 *   {
 *     status: 401,
 *     details: "You must be logged in to access this resource",
 *     help: ["Sign in to continue", "Create an account if you don't have one"]
 *   }
 * );
 * ```
 */
export function apiError(
  error: string,
  message: string,
  options: ApiErrorOptions = {}
): NextResponse<ApiErrorResponse> {
  const {
    status = 500,
    details,
    help,
    technical,
    headers = {},
    log = true,
  } = options;

  // Log error if enabled (skip for expected errors like 400, 401, 404)
  if (log && status >= 500) {
    console.error(`[API Error ${status}] ${error}: ${message}`, {
      details,
      technical: technical instanceof Error ? technical.message : technical,
    });
  }

  // Build error response
  const response: ApiErrorResponse = {
    error,
    message,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.details = details;
  }

  if (help && help.length > 0) {
    response.help = help;
  }

  // Include technical details only in development
  if (technical && process.env.NODE_ENV === "development") {
    response.technical = technical instanceof Error ? technical.stack || technical.message : technical;
  }

  return NextResponse.json(response, {
    status,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

/**
 * Common API error responses for frequently used cases
 */
export const ApiErrors = {
  /** 400 - Bad Request */
  badRequest: (message: string, details?: string, help?: string[]) =>
    apiError("bad_request", message, { status: 400, details, help, log: false }),

  /** 401 - Unauthorized */
  unauthorized: (message = "Authentication required", details?: string) =>
    apiError("auth_required", message, {
      status: 401,
      details,
      help: [
        "Sign in to continue",
        "Create an account if you don't have one",
      ],
      log: false,
    }),

  /** 403 - Forbidden */
  forbidden: (message = "Access denied", details?: string) =>
    apiError("access_denied", message, { status: 403, details, log: false }),

  /** 404 - Not Found */
  notFound: (resource = "Resource", details?: string) =>
    apiError("not_found", `${resource} not found`, { status: 404, details, log: false }),

  /** 409 - Conflict */
  conflict: (message: string, details?: string) =>
    apiError("conflict", message, { status: 409, details, log: false }),

  /** 413 - Payload Too Large */
  payloadTooLarge: (message: string, details?: string) =>
    apiError("payload_too_large", message, { status: 413, details, log: false }),

  /** 422 - Unprocessable Entity */
  validationFailed: (message: string, details?: string, help?: string[]) =>
    apiError("validation_failed", message, { status: 422, details, help, log: false }),

  /** 429 - Too Many Requests */
  rateLimitExceeded: (message: string, headers: Record<string, string>, help?: string[]) =>
    apiError("rate_limit_exceeded", message, { status: 429, headers, help, log: false }),

  /** 500 - Internal Server Error */
  internalError: (message = "Internal server error", technical?: string | Error) =>
    apiError("internal_error", message, {
      status: 500,
      technical,
      help: [
        "This is a server-side error. Please try again later.",
        "If the problem persists, contact support.",
      ],
    }),

  /** 503 - Service Unavailable */
  serviceUnavailable: (serviceName: string, technical?: string | Error, help?: string[]) =>
    apiError("service_unavailable", `${serviceName} is unavailable`, {
      status: 503,
      technical,
      help,
    }),
};

/**
 * Wrap an async API handler with error handling
 * Catches errors and returns standardized error responses
 *
 * @example
 * ```ts
 * export const POST = withErrorHandler(async (request: Request) => {
 *   const data = await request.json();
 *   // ... your handler logic ...
 *   return NextResponse.json({ success: true });
 * });
 * ```
 */
export function withErrorHandler<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      console.error("Unhandled error in API handler:", error);
      return ApiErrors.internalError(
        "An unexpected error occurred",
        error instanceof Error ? error : undefined
      );
    }
  };
}
