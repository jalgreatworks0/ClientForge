/**
 * Central Error Handler Middleware - RFC 7807 Problem Details
 *
 * Handles AppError instances and unexpected errors
 * Logs structured errors to MongoDB via Winston
 * Returns RFC 7807 compliant error responses
 */

import { Request, Response, NextFunction } from "express";

import { AppError } from "../../../../utils/errors/AppError";
import { logger } from "../../../../utils/logging/logger";
import { toProblemDetails } from "../../../../utils/errors/problem-details";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    // Structured log → MongoDB (no secrets)
    logger.error("[ERROR]", {
      id: err.id,
      name: err.name,
      severity: err.severity,
      status: err.status,
      message: err.message,
      timestamp: err.timestamp.toISOString(),
      correlationId: req.correlationId,
      tenantId: req.user?.tenantId,
      runbook: err.runbook,
      cause: err.causeData ? "[redacted]" : undefined,
    });

    // Trigger alerts for critical/notify errors
    if (err.shouldNotify()) {
      logger.error("[ERROR-ALERT]", {
        id: err.id,
        severity: err.severity,
        message: `Critical error requires attention: ${err.name}`,
        correlationId: req.correlationId,
        tenantId: req.user?.tenantId,
      });
    }

    // Convert to RFC 7807 Problem Details
    const problemDetails = toProblemDetails(err, req);

    // Set Content-Type header for RFC 7807
    res.setHeader("Content-Type", "application/problem+json");

    return res.status(problemDetails.status).json(problemDetails);
  }

  // Handle unexpected errors
  logger.error("[ERROR-UNHANDLED]", {
    message: err?.message,
    stack: err?.stack,
    type: err?.constructor?.name,
    correlationId: req.correlationId,
    tenantId: req.user?.tenantId,
  });

  // Convert unexpected error to RFC 7807
  const problemDetails = toProblemDetails(err, req);
  res.setHeader("Content-Type", "application/problem+json");

  return res.status(problemDetails.status).json(problemDetails);
}
