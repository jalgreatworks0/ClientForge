import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load .env base then overlay per NODE_ENV
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
const envFile = path.resolve(process.cwd(), "config", "env", `.env.${process.env.NODE_ENV ?? "development"}`);
if (fs.existsSync(envFile)) dotenv.config({ path: envFile });

export function validateEnv(required: string[]): void {
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    console.error("❌ Missing environment variables:", missing.join(", "));
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required env vars: ${missing.join(", ")}`);
    }
  }
}

export const REQUIRED_ENV = [
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "SESSION_SECRET",
  "ENCRYPTION_KEY",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
];

export function initEnvValidation(): void {
  validateEnv(REQUIRED_ENV);
}
