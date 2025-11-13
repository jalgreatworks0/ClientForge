/**
 * Environment Test Helper
 * Utilities for managing environment variables in tests
 */

type EnvSnapshot = Record<string, string | undefined>

/**
 * Set environment variables for testing
 */
export function setTestEnv(vars: Record<string, string>): void {
  Object.entries(vars).forEach(([key, value]) => {
    process.env[key] = value
  })
}

/**
 * Clear environment variables
 */
export function clearTestEnv(keys: string[]): void {
  keys.forEach((key) => {
    delete process.env[key]
  })
}

/**
 * Save current environment variables
 */
export function saveEnv(keys: string[]): EnvSnapshot {
  const snapshot: EnvSnapshot = {}
  keys.forEach((key) => {
    snapshot[key] = process.env[key]
  })
  return snapshot
}

/**
 * Restore environment variables from snapshot
 */
export function restoreEnv(snapshot: EnvSnapshot): void {
  Object.entries(snapshot).forEach(([key, value]) => {
    if (value === undefined) {
      delete process.env[key]
    } else {
      process.env[key] = value
    }
  })
}

/**
 * Run function with temporary environment variables
 */
export async function withEnv<T>(
  vars: Record<string, string>,
  fn: () => T | Promise<T>
): Promise<T> {
  const keys = Object.keys(vars)
  const snapshot = saveEnv(keys)

  try {
    setTestEnv(vars)
    return await fn()
  } finally {
    restoreEnv(snapshot)
  }
}

/**
 * Set default test environment
 */
export function setupTestEnv(): void {
  setTestEnv({
    NODE_ENV: 'test',
    JWT_SECRET: 'test-secret-key',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    REDIS_URL: 'redis://localhost:6379/0',
  })
}
