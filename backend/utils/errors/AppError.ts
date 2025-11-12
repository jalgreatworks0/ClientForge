/**
 * Central Error Registry - AppError Class
 *
 * This error class enforces structured error handling across the application
 * by requiring all errors to be registered in config/errors/error-registry.yaml
 */

export type Severity = "minor" | "major" | "critical";
export type Visibility = "internal" | "user";
export type RetryStrategy = "none" | "safe" | "idempotent";

export interface RegistryError {
  id: string;
  name: string;
  http_status: number;
  severity: Severity;
  visibility: Visibility;
  user_message_key?: string;
  runbook?: string;
  retry?: RetryStrategy;
  notify?: boolean;
}

/**
 * Application Error class backed by the central error registry
 *
 * Usage:
 * ```ts
 * import { AppError } from './utils/errors/AppError';
 * import { getErrorById } from './utils/errors/registry';
 *
 * throw new AppError(
 *   getErrorById('DB-001'),
 *   'PostgreSQL connection failed',
 *   { host: 'localhost', port: 5432 }
 * );
 * ```
 */
export class AppError extends Error {
  public readonly id: string;
  public readonly status: number;
  public readonly severity: Severity;
  public readonly visibility: Visibility;
  public readonly userMessageKey?: string;
  public readonly runbook?: string;
  public readonly retry: RetryStrategy;
  public readonly notify: boolean;
  public readonly causeData?: unknown;
  public readonly timestamp: Date;

  constructor(
    reg: RegistryError,
    message?: string,
    causeData?: unknown
  ) {
    super(message ?? reg.name);
    this.name = reg.name;
    this.id = reg.id;
    this.status = reg.http_status;
    this.severity = reg.severity;
    this.visibility = reg.visibility;
    this.userMessageKey = reg.user_message_key;
    this.runbook = reg.runbook;
    this.retry = reg.retry ?? "none";
    this.notify = reg.notify ?? false;
    this.causeData = causeData;
    this.timestamp = new Date();

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error for logging (excludes sensitive data)
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      severity: this.severity,
      status: this.status,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      runbook: this.runbook,
      // Note: causeData is intentionally excluded for security
    };
  }

  /**
   * Check if error is user-facing
   */
  isUserFacing(): boolean {
    return this.visibility === "user";
  }

  /**
   * Check if error should trigger alerts
   */
  shouldNotify(): boolean {
    return this.notify || this.severity === "critical";
  }

  /**
   * Check if operation can be retried
   */
  canRetry(): boolean {
    return this.retry !== "none";
  }
}

/**
 * Check if an error is an AppError instance
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Extract error ID from any error
 */
export function getErrorId(error: unknown): string {
  if (isAppError(error)) {
    return error.id;
  }
  return "GEN-001"; // Default to UnexpectedError
}
