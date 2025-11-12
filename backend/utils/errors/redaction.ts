/**
 * Data Redaction Utility
 *
 * Redacts sensitive data from error payloads before logging
 * Supports different classification levels: public, internal, secret
 */

type DataClass = "public" | "internal" | "secret";

/**
 * Redact sensitive fields from any object
 *
 * @param obj - Object to redact
 * @param cls - Classification level (public, internal, secret)
 * @returns Redacted copy of object
 */
export function redact(obj: unknown, cls: DataClass = "internal"): unknown {
  try {
    // Secret classification: redact everything
    if (cls === "secret") {
      return "[redacted]";
    }

    // Primitive types: return as-is
    if (typeof obj !== "object" || obj === null) {
      return obj;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      return obj.map((item) => redact(item, cls));
    }

    // Handle objects
    const out: any = {};
    for (const [key, value] of Object.entries(obj as Record<string, any>)) {
      // Redact fields matching sensitive patterns
      if (
        /pass|password|secret|token|key|authorization|apikey|api_key|auth|credential|private/i.test(
          key
        )
      ) {
        out[key] = "[redacted]";
        continue;
      }

      // Recursively redact nested objects
      out[key] =
        typeof value === "object" && value !== null
          ? redact(value, cls)
          : value;
    }

    return out;
  } catch (error) {
    // If redaction fails, return safe fallback
    return "[redacted]";
  }
}

/**
 * Redact specific fields by name
 */
export function redactFields(
  obj: Record<string, any>,
  fields: string[]
): Record<string, any> {
  const out = { ...obj };
  for (const field of fields) {
    if (field in out) {
      out[field] = "[redacted]";
    }
  }
  return out;
}

/**
 * Check if a value contains sensitive data
 */
export function isSensitive(key: string): boolean {
  return /pass|password|secret|token|key|authorization|apikey|api_key|auth|credential|private|ssn|credit_card|cvv/i.test(
    key
  );
}
