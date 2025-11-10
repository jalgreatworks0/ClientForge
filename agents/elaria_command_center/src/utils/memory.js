/**
 * Memory Management Utilities for Elaria Command Center
 * Location: D:\clientforge-crm\agents\elaria_command_center\src\utils\memory.js
 * Purpose: Prevent memory leaks, limit conversation history, monitor usage
 */

import { logger } from './logger.js';

/**
 * Conversation history manager with size limits
 */
export class ConversationHistory {
  constructor(options = {}) {
    this.maxMessages = options.maxMessages || 50;
    this.maxTokens = options.maxTokens || 100000;
    this.messages = [];
    this.totalTokens = 0;
  }

  /**
   * Add message to history
   * @param {Object} message - Message object
   */
  add(message) {
    this.messages.push(message);

    // Estimate token count (rough approximation: 1 token ≈ 4 characters)
    const content = JSON.stringify(message);
    const estimatedTokens = Math.ceil(content.length / 4);
    this.totalTokens += estimatedTokens;

    // Trim if necessary
    this._trim();
  }

  /**
   * Get all messages
   * @returns {Array} Messages
   */
  getAll() {
    return [...this.messages];
  }

  /**
   * Get last N messages
   * @param {number} count - Number of messages to get
   * @returns {Array} Messages
   */
  getLast(count) {
    return this.messages.slice(-count);
  }

  /**
   * Clear all messages
   */
  clear() {
    const count = this.messages.length;
    this.messages = [];
    this.totalTokens = 0;

    if (count > 0) {
      logger.info('Conversation history cleared', { messagesRemoved: count });
    }
  }

  /**
   * Trim history to stay within limits
   */
  _trim() {
    // Trim by message count
    while (this.messages.length > this.maxMessages) {
      const removed = this.messages.shift();
      const content = JSON.stringify(removed);
      const estimatedTokens = Math.ceil(content.length / 4);
      this.totalTokens -= estimatedTokens;
    }

    // Trim by token count
    while (this.totalTokens > this.maxTokens && this.messages.length > 1) {
      const removed = this.messages.shift();
      const content = JSON.stringify(removed);
      const estimatedTokens = Math.ceil(content.length / 4);
      this.totalTokens -= estimatedTokens;
    }

    if (this.messages.length === this.maxMessages) {
      logger.debug('Conversation history trimmed', {
        maxMessages: this.maxMessages,
        currentMessages: this.messages.length,
        estimatedTokens: this.totalTokens,
      });
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      messageCount: this.messages.length,
      maxMessages: this.maxMessages,
      estimatedTokens: this.totalTokens,
      maxTokens: this.maxTokens,
    };
  }
}

/**
 * Memory usage monitor
 */
export class MemoryMonitor {
  constructor(options = {}) {
    this.warningThreshold = options.warningThreshold || 0.8; // 80%
    this.criticalThreshold = options.criticalThreshold || 0.9; // 90%
    this.checkInterval = options.checkInterval || 30000; // 30 seconds
    this.onWarning = options.onWarning || null;
    this.onCritical = options.onCritical || null;

    this.monitoring = false;
    this.timer = null;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.monitoring) {
      return;
    }

    this.monitoring = true;
    this.timer = setInterval(() => {
      this.check();
    }, this.checkInterval);

    // Don't keep process alive
    if (this.timer.unref) {
      this.timer.unref();
    }

    logger.info('Memory monitoring started', {
      checkInterval: this.checkInterval,
      warningThreshold: `${this.warningThreshold * 100}%`,
      criticalThreshold: `${this.criticalThreshold * 100}%`,
    });
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.monitoring = false;
    logger.info('Memory monitoring stopped');
  }

  /**
   * Check current memory usage
   */
  check() {
    const usage = process.memoryUsage();
    const stats = this.getStats();

    // Check heap usage percentage
    const heapPercentage = usage.heapUsed / usage.heapTotal;

    if (heapPercentage >= this.criticalThreshold) {
      logger.error('Critical memory usage', null, stats);
      if (this.onCritical) {
        this.onCritical(stats);
      }
    } else if (heapPercentage >= this.warningThreshold) {
      logger.warn('High memory usage', stats);
      if (this.onWarning) {
        this.onWarning(stats);
      }
    }

    return stats;
  }

  /**
   * Get memory statistics
   */
  getStats() {
    const usage = process.memoryUsage();

    return {
      rss: formatBytes(usage.rss),
      rssMB: Math.round(usage.rss / 1024 / 1024),
      heapTotal: formatBytes(usage.heapTotal),
      heapTotalMB: Math.round(usage.heapTotal / 1024 / 1024),
      heapUsed: formatBytes(usage.heapUsed),
      heapUsedMB: Math.round(usage.heapUsed / 1024 / 1024),
      heapPercentage: `${Math.round((usage.heapUsed / usage.heapTotal) * 100)}%`,
      external: formatBytes(usage.external),
      externalMB: Math.round(usage.external / 1024 / 1024),
    };
  }

  /**
   * Force garbage collection (if available)
   */
  static forceGC() {
    if (global.gc) {
      logger.info('Forcing garbage collection');
      global.gc();
      return true;
    } else {
      logger.warn('Garbage collection not available (run with --expose-gc)');
      return false;
    }
  }
}

/**
 * Cache with size limit and TTL
 */
export class LRUCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.cache = new Map();
    this.accessOrder = [];
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const entry = this.cache.get(key);

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }

    // Update access order
    this._updateAccessOrder(key);

    return entry.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Optional TTL override
   */
  set(key, value, ttl = null) {
    const expiresAt = Date.now() + (ttl || this.ttl);

    this.cache.set(key, { value, expiresAt });
    this._updateAccessOrder(key);

    // Evict if over size
    if (this.cache.size > this.maxSize) {
      this._evictLRU();
    }
  }

  /**
   * Delete key from cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Update access order for LRU
   */
  _updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict least recently used entry
   */
  _evictLRU() {
    const lruKey = this.accessOrder.shift();
    if (lruKey) {
      this.cache.delete(lruKey);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      utilizationPercent: Math.round((this.cache.size / this.maxSize) * 100),
    };
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  return `${Math.round(bytes / 1024 / 1024 / 1024)} GB`;
}

export default {
  ConversationHistory,
  MemoryMonitor,
  LRUCache,
  formatBytes,
};
