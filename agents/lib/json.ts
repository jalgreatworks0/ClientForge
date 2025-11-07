// Shared JSON parsing utility with strict validation
// Strips markdown fences, validates against schema

export interface ParseResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Parse JSON string, stripping markdown fences if present
 * @param jsonStr - Raw JSON string (may include ```json fences)
 * @returns ParseResult with data or error
 */
export function safeParseJSON<T = any>(jsonStr: string): ParseResult<T> {
  try {
    // Strip markdown code fences
    let cleaned = jsonStr.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```(?:json)?\n?/g, '').trim();
    }

    const data = JSON.parse(cleaned) as T;
    return { ok: true, data };
  } catch (error: any) {
    return { ok: false, error: error.message };
  }
}

/**
 * Validate object has required fields
 * @param obj - Object to validate
 * @param requiredFields - Array of required field names
 * @returns ParseResult with validated data or error
 */
export function validateFields<T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[]
): ParseResult<T> {
  const missing = requiredFields.filter(field => !(field in obj));
  if (missing.length > 0) {
    return { ok: false, error: `Missing required fields: ${missing.join(', ')}` };
  }
  return { ok: true, data: obj };
}
