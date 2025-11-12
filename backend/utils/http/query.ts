/**
 * Safe query parameter helpers for Express req.query
 * Handles string | string[] | undefined → typed outputs
 */

export function qStr(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v[0] ?? undefined;
  return typeof v === 'string' ? v : String(v);
}

export function qStrArr(v: unknown): string[] | undefined {
  if (v == null) return undefined;
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') return [v];
  return [String(v)];
}

export function qInt(v: unknown, fallback: number): number {
  const s = qStr(v);
  const n = s ? Number(s) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

export function qBool(v: unknown, fallback: boolean): boolean {
  const s = qStr(v);
  if (s === 'true' || s === '1') return true;
  if (s === 'false' || s === '0') return false;
  return fallback;
}
