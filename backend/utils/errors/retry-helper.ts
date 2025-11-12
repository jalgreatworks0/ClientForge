/**
 * Retry Helper
 *
 * Centralized retry logic based on error registry
 * Used by API clients, queue workers, and circuit breakers
 */

import { getErrorById, isRegisteredError } from "./registry";

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Check if an error ID supports retry
 */
export function shouldRetry(errorId: string): boolean {
  if (!isRegisteredError(errorId)) {
    return false;
  }

  const error = getErrorById(errorId);
  return error.retry !== "none";
}

/**
 * Get retry strategy for an error ID
 */
export function getRetryStrategy(
  errorId: string
): "none" | "safe" | "idempotent" {
  if (!isRegisteredError(errorId)) {
    return "none";
  }

  const error = getErrorById(errorId);
  return error.retry ?? "none";
}

/**
 * Calculate exponential backoff delay
 */
export function calculateBackoffDelay(
  attemptNumber: number,
  config: Partial<RetryConfig> = {}
): number {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };

  const delay =
    finalConfig.baseDelayMs *
    Math.pow(finalConfig.backoffMultiplier, attemptNumber - 1);

  // Add jitter (±20%)
  const jitter = delay * 0.2 * (Math.random() - 0.5) * 2;

  return Math.min(delay + jitter, finalConfig.maxDelayMs);
}

/**
 * Retry an operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  errorId: string,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  if (!shouldRetry(errorId)) {
    return operation();
  }

  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt === finalConfig.maxAttempts) {
        break;
      }

      // Calculate delay
      const delay = calculateBackoffDelay(attempt, finalConfig);

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if operation is safe to retry
 * (Use for GET requests and idempotent operations)
 */
export function isSafeToRetry(errorId: string, httpMethod: string): boolean {
  if (!shouldRetry(errorId)) {
    return false;
  }

  const strategy = getRetryStrategy(errorId);

  // Safe strategy: Only retry GET/HEAD
  if (strategy === "safe") {
    return ["GET", "HEAD"].includes(httpMethod.toUpperCase());
  }

  // Idempotent strategy: Retry GET/HEAD/PUT/DELETE
  if (strategy === "idempotent") {
    return ["GET", "HEAD", "PUT", "DELETE"].includes(httpMethod.toUpperCase());
  }

  return false;
}
