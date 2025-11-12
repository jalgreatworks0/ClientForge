/**
 * Type safety helpers for exhaustive checks and null handling
 */

export function assertNever(x: never): never {
  throw new Error(`Unexpected variant: ${String(x)}`);
}

export type Nullable<T> = T | null | undefined;

export function assertDefined<T>(value: T | null | undefined, message?: string): T {
  if (value == null) {
    throw new Error(message ?? 'Expected value to be defined');
  }
  return value;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
