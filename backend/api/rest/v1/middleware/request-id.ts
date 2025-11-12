/**
 * Request ID Middleware
 *
 * Adds a unique correlation ID to each request for tracing
 * Sets X-Request-Id header for client correlation
 */

import { randomUUID } from "crypto";
import { Request, Response, NextFunction } from "express";

// Augment Express Request with correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Generate unique correlation ID for this request
  const correlationId = randomUUID();

  // Attach to request object
  req.correlationId = correlationId;

  // Set response header for client tracing
  res.setHeader("X-Request-Id", correlationId);

  next();
}
