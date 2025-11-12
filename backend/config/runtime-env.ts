/**
 * Centralized, Docker-safe environment access.
 * In production: env vars are REQUIRED.
 * In dev: fall back to Docker service names (never localhost).
 */
const NODE_ENV = process.env.NODE_ENV ?? "development";
const isProd = NODE_ENV === "production";

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    if (isProd) throw new Error(`Missing required env var: ${name}`);
    return ""; // dev may use fallback below
  }
  return v;
}

export const RUNTIME_ENV = {
  NODE_ENV,
  PORT: parseInt(process.env.PORT ?? "3000", 10),

  // Prefer explicit URLs; never default to localhost. In dev, use Docker service names.
  REDIS_URL:
    process.env.REDIS_URL?.trim() ||
    (isProd ? "" : "redis://redis:6379"),

  MONGODB_URL:
    process.env.MONGODB_URL?.trim() ||
    process.env.MONGO_URL?.trim() || // tolerate legacy name
    process.env.MONGODB_URI?.trim() || // tolerate another legacy name
    (isProd ? "" : "mongodb://mongodb:27017/clientforge"),
};

// Validate in prod
if (isProd) {
  const missing: string[] = [];
  if (!RUNTIME_ENV.REDIS_URL) missing.push("REDIS_URL");
  if (!RUNTIME_ENV.MONGODB_URL) missing.push("MONGODB_URL");
  if (missing.length) throw new Error(`Missing required env vars: ${missing.join(", ")}`);
}
