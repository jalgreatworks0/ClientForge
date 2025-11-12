/**
 * RFC 7807 Problem Details
 *
 * Standardizes API error responses following RFC 7807
 * https://datatracker.ietf.org/doc/html/rfc7807
 */

import { Request } from "express";

import { AppError } from "./AppError";

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  errorId: string;
  correlationId?: string;
  tenantId?: string;
  runbook?: string;
  retryable?: boolean;
  retryStrategy?: string;
  userMessageKey?: string;
}

/**
 * Convert AppError to RFC 7807 Problem Details format
 */
export function toProblemDetails(
  err: AppError | Error,
  req: Request
): ProblemDetails {
  if (err instanceof AppError) {
    const problem: ProblemDetails = {
      type: `https://clientforge.com/errors/${err.id}`,
      title: err.name,
      status: err.status,
      detail: err.message,
      instance: req.originalUrl || req.path || "/",
      errorId: err.id,
      correlationId: req.correlationId,
      tenantId: req.user?.tenantId,
    };

    // Add user message key for user-facing errors
    if (err.isUserFacing() && err.userMessageKey) {
      problem.userMessageKey = err.userMessageKey;
    }

    // Add runbook for internal errors
    if (err.visibility === "internal" && err.runbook) {
      problem.runbook = err.runbook;
    }

    // Add retry information
    if (err.canRetry()) {
      problem.retryable = true;
      problem.retryStrategy = err.retry;
    }

    return problem;
  }

  // Handle unexpected errors
  return {
    type: "about:blank",
    title: "UnexpectedError",
    status: 500,
    detail: "An unexpected error occurred",
    instance: req.originalUrl || req.path || "/",
    errorId: "GEN-001",
    correlationId: req.correlationId,
    tenantId: req.user?.tenantId,
  };
}
