/**
 * Retry and Timeout Utilities for Elaria Command Center
 * Location: D:\clientforge-crm\agents\elaria_command_center\src\utils\retry.js
 * Purpose: Exponential backoff, circuit breaker, timeout handling
 */

import { logger } from './logger.js';

/**
 * Exponential backoff retry wrapper
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of successful execution
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    onRetry = null,
    retryableErrors = null,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (retryableErrors && !retryableErrors.some(errType => error instanceof errType || error.name === errType)) {
        throw error; // Non-retryable error, throw immediately
      }

      if (attempt === maxAttempts) {
        logger.error('Max retry attempts reached', error, {
          attempts: maxAttempts,
          operation: fn.name || 'anonymous',
        });
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(initialDelay * Math.pow(factor, attempt - 1), maxDelay);

      logger.warn(`Retry attempt ${attempt}/${maxAttempts} after ${delay}ms`, {
        error: error.message,
        attempt,
        maxAttempts,
        delay,
      });

      if (onRetry) {
        onRetry(error, attempt);
      }

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Execute function with timeout
 * @param {Function} fn - Async function to execute
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {string} operationName - Name of operation (for error messages)
 * @returns {Promise} Result of execution
 */
export async function withTimeout(fn, timeoutMs, operationName = 'operation') {
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      const error = new Error(`${operationName} timed out after ${timeoutMs}ms`);
      error.name = 'TimeoutError';
      logger.error('Operation timeout', error, {
        operation: operationName,
        timeout: timeoutMs,
      });
      reject(error);
    }, timeoutMs);

    try {
      const result = await fn();
      clearTimeout(timer);
      resolve(result);
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

/**
 * Execute with both timeout and retry
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Combined options
 * @returns {Promise} Result of execution
 */
export async function withTimeoutAndRetry(fn, options = {}) {
  const {
    timeout = 30000,
    operationName = 'operation',
    ...retryOptions
  } = options;

  const wrappedFn = () => withTimeout(fn, timeout, operationName);

  return retryWithBackoff(wrappedFn, {
    ...retryOptions,
    retryableErrors: ['TimeoutError', 'NetworkError', ...(retryOptions.retryableErrors || [])],
  });
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise}
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Circuit Breaker pattern implementation
 */
export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000;
    this.monitoringPeriod = options.monitoringPeriod || 10000;
    this.onStateChange = options.onStateChange || null;

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.successes = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }

  /**
   * Execute function through circuit breaker
   */
  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttemptTime) {
        const error = new Error('Circuit breaker is OPEN');
        error.name = 'CircuitBreakerError';
        throw error;
      }

      // Try half-open
      this._setState('HALF_OPEN');
    }

    try {
      const result = await fn();
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  _onSuccess() {
    this.successes++;

    if (this.state === 'HALF_OPEN') {
      logger.info('Circuit breaker recovered', {
        state: 'HALF_OPEN -> CLOSED',
        failures: this.failures,
      });
      this._reset();
    }
  }

  /**
   * Handle failed execution
   */
  _onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      logger.warn('Circuit breaker failure in HALF_OPEN state', {
        state: 'HALF_OPEN -> OPEN',
      });
      this._trip();
      return;
    }

    if (this.failures >= this.failureThreshold) {
      logger.error('Circuit breaker threshold reached', null, {
        failures: this.failures,
        threshold: this.failureThreshold,
        state: 'CLOSED -> OPEN',
      });
      this._trip();
    }
  }

  /**
   * Trip the circuit breaker (open it)
   */
  _trip() {
    this._setState('OPEN');
    this.nextAttemptTime = Date.now() + this.resetTimeout;
  }

  /**
   * Reset the circuit breaker
   */
  _reset() {
    this._setState('CLOSED');
    this.failures = 0;
    this.successes = 0;
    this.nextAttemptTime = null;
  }

  /**
   * Change state and notify
   */
  _setState(newState) {
    const oldState = this.state;
    this.state = newState;

    if (this.onStateChange) {
      this.onStateChange(oldState, newState);
    }
  }

  /**
   * Get current state
   */
  getState() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  constructor(options = {}) {
    this.maxTokens = options.maxTokens || 10;
    this.refillRate = options.refillRate || 1; // tokens per second
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Try to acquire a token
   * @returns {boolean} True if token acquired
   */
  tryAcquire() {
    this._refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  /**
   * Wait until token is available
   * @returns {Promise}
   */
  async acquire() {
    while (!this.tryAcquire()) {
      await sleep(100); // Check every 100ms
    }
  }

  /**
   * Execute function with rate limiting
   */
  async execute(fn) {
    await this.acquire();
    return fn();
  }

  /**
   * Refill tokens based on time elapsed
   */
  _refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefillTime) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Get current state
   */
  getState() {
    this._refill();
    return {
      tokens: this.tokens,
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
    };
  }
}

/**
 * Batch executor with concurrency control
 */
export class BatchExecutor {
  constructor(options = {}) {
    this.concurrency = options.concurrency || 5;
    this.onProgress = options.onProgress || null;
  }

  /**
   * Execute array of tasks with concurrency limit
   * @param {Array<Function>} tasks - Array of async functions
   * @returns {Promise<Array>} Array of results
   */
  async execute(tasks) {
    const results = [];
    const queue = [...tasks];
    let completed = 0;

    const workers = Array(Math.min(this.concurrency, tasks.length))
      .fill(null)
      .map(async () => {
        while (queue.length > 0) {
          const task = queue.shift();
          if (!task) break;

          try {
            const result = await task();
            results.push({ success: true, result });
          } catch (error) {
            results.push({ success: false, error });
          }

          completed++;
          if (this.onProgress) {
            this.onProgress(completed, tasks.length);
          }
        }
      });

    await Promise.all(workers);
    return results;
  }
}

export default {
  retryWithBackoff,
  withTimeout,
  withTimeoutAndRetry,
  sleep,
  CircuitBreaker,
  RateLimiter,
  BatchExecutor,
};
