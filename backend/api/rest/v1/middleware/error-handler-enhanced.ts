/**
 * Enhanced Error Handler Middleware
 *
 * Integrates:
 * - RFC 7807 Problem Details
 * - OpenTelemetry correlation
 * - Error fingerprinting & deduplication
 * - Data redaction
 * - Alert routing by severity
 */

import { Request, Response, NextFunction } from "express";
import { AppError } from "../../../../utils/errors/AppError";
import { toProblemDetails } from "../../../../utils/errors/problem-details";
import { logger } from "../../../../utils/logging/logger";
import { fingerprint } from "../../../../utils/errors/fingerprint";
import { redact } from "../../../../utils/errors/redaction";
import { routeAlert, type Severity } from "../../../../utils/errors/alert-router";

// OpenTelemetry imports (optional - gracefully degrade if not available)
// Note: Using require() here intentionally for optional dependency loading
let otelAvailable = false;
let trace: any, context: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const otel = require("@opentelemetry/api");
  trace = otel.trace;
  context = otel.context;
  otelAvailable = true;
} catch (error) {
  // OpenTelemetry not installed, continue without it
  otelAvailable = false;
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Convert to RFC 7807 Problem Details
  const problemDetails = toProblemDetails(err, req);

  // Generate error fingerprint for deduplication
  const fp = fingerprint(err, {
    path: req.originalUrl,
    method: req.method,
    tenantId: req.user?.tenantId,
  });

  // Get OpenTelemetry span if available
  const span = otelAvailable ? trace?.getSpan(context?.active()) : null;

  // Determine severity
  const severity: Severity =
    err instanceof AppError ? err.severity : "major";

  // OpenTelemetry correlation
  if (span) {
    span.recordException(err);
    span.setAttribute("cf.error_id", problemDetails.errorId);
    span.setAttribute("cf.severity", severity);
    span.setAttribute("cf.fingerprint", fp);
    span.setAttribute("cf.correlation_id", problemDetails.correlationId);
    span.setAttribute("cf.tenant_id", problemDetails.tenantId || "");
    span.setStatus({ code: 2, message: problemDetails.title }); // ERROR
  }

  if (err instanceof AppError) {
    // Structured log → MongoDB (with redaction)
    logger.error("[ERROR]", {
      problem: problemDetails,
      fingerprint: fp,
      severity: severity,
      timestamp: err.timestamp.toISOString(),
      payload: redact(err.causeData ?? {}, "secret"),
      stack: err.stack,
    });

    // Route alerts based on severity
    if (err.shouldNotify() || severity === "critical") {
      routeAlert(problemDetails, severity);
    }

    // Set RFC 7807 headers and return
    res.setHeader("Content-Type", "application/problem+json");
    res.setHeader("X-Error-Fingerprint", fp);

    return res.status(problemDetails.status).json(problemDetails);
  }

  // Handle unexpected errors
  logger.error("[ERROR-UNHANDLED]", {
    problem: problemDetails,
    fingerprint: fp,
    severity: "major",
    message: err?.message,
    stack: err?.stack,
    type: err?.constructor?.name,
  });

  // Route major alert for unhandled errors
  routeAlert(problemDetails, "major");

  // Set RFC 7807 headers and return
  res.setHeader("Content-Type", "application/problem+json");
  res.setHeader("X-Error-Fingerprint", fp);

  return res.status(problemDetails.status).json(problemDetails);
}
