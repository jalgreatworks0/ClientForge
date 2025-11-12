/**
 * Error Fingerprinting
 *
 * Generates unique fingerprints for errors to enable deduplication
 * Prevents alert fatigue by grouping similar errors together
 */

import crypto from "node:crypto";

export interface FingerprintExtras {
  path?: string;
  method?: string;
  tenantId?: string;
  userId?: string;
}

/**
 * Generate a unique fingerprint for an error
 *
 * Combines error name, stack trace top line, and optional context
 * to create a consistent hash for grouping similar errors
 *
 * @param err - Error instance
 * @param extras - Additional context (path, method, tenant, user)
 * @returns 12-character hex fingerprint
 */
export function fingerprint(
  err: Error,
  extras?: FingerprintExtras
): string {
  // Extract first meaningful line from stack trace
  const stackLines = (err.stack || "").split("\n");
  const firstLine = stackLines[1]?.trim() || err.name;

  // Build fingerprint components
  const components = [
    err.name,
    firstLine,
    extras?.path ?? "",
    extras?.method ?? "",
  ];

  // Create hash
  const hash = crypto
    .createHash("sha1")
    .update(components.join("|"))
    .digest("hex");

  // Return first 12 characters (collision-resistant for error dedup)
  return hash.slice(0, 12);
}

/**
 * Generate a fingerprint from error properties directly
 * (Useful when Error instance not available)
 */
export function fingerprintFromProps(
  name: string,
  message: string,
  stack?: string,
  extras?: FingerprintExtras
): string {
  const stackLines = (stack || "").split("\n");
  const firstLine = stackLines[1]?.trim() || name;

  const components = [
    name,
    firstLine,
    message,
    extras?.path ?? "",
    extras?.method ?? "",
  ];

  const hash = crypto
    .createHash("sha1")
    .update(components.join("|"))
    .digest("hex");

  return hash.slice(0, 12);
}
