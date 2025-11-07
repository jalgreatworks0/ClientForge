// Retry logic with exponential backoff, jitter, and circuit breaker

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  circuitBreakerThreshold: number; // consecutive failures before circuit opens
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 4,
  baseDelayMs: 300,
  maxDelayMs: 5000,
  circuitBreakerThreshold: 3
};

// Circuit breaker state (in-memory, per-process)
const circuitState: Record<string, { failures: number; lastFailure: number }> = {};

/**
 * Execute function with exponential backoff retry
 * @param fn - Async function to retry
 * @param key - Circuit breaker key (e.g., "planner_claude")
 * @param config - Retry configuration
 * @returns Result of fn or throws after max retries
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  key: string,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Check circuit breaker
  const circuit = circuitState[key] || { failures: 0, lastFailure: 0 };
  if (circuit.failures >= cfg.circuitBreakerThreshold) {
    const timeSinceLastFailure = Date.now() - circuit.lastFailure;
    if (timeSinceLastFailure < 60000) { // 1 min cooldown
      throw new Error(`Circuit breaker open for ${key} (cooldown: ${Math.ceil((60000 - timeSinceLastFailure) / 1000)}s)`);
    }
    // Reset circuit after cooldown
    circuit.failures = 0;
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const result = await fn();
      // Reset circuit on success
      if (circuit.failures > 0) {
        circuit.failures = 0;
      }
      return result;
    } catch (error: any) {
      lastError = error;
      circuit.failures++;
      circuit.lastFailure = Date.now();
      circuitState[key] = circuit;

      if (attempt < cfg.maxRetries) {
        // Calculate delay with exponential backoff + jitter
        const baseDelay = Math.min(cfg.baseDelayMs * Math.pow(2, attempt), cfg.maxDelayMs);
        const jitter = Math.random() * 0.3 * baseDelay; // ±30% jitter
        const delay = baseDelay + jitter;

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Check if circuit is open for a key
 */
export function isCircuitOpen(key: string, threshold: number = DEFAULT_CONFIG.circuitBreakerThreshold): boolean {
  const circuit = circuitState[key];
  return circuit ? circuit.failures >= threshold : false;
}
