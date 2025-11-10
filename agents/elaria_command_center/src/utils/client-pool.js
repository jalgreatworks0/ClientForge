/**
 * LM Studio Client Connection Pool
 * Location: D:\clientforge-crm\agents\elaria_command_center\src\utils\client-pool.js
 * Purpose: Singleton pattern for LMStudioClient to prevent memory leaks and connection waste
 */

import { LMStudioClient } from '@lmstudio/sdk';
import { logger } from './logger.js';

/**
 * Connection pool for LM Studio clients
 */
class LMStudioClientPool {
  constructor() {
    this.clients = new Map(); // baseUrl -> client instance
    this.modelCache = new Map(); // (baseUrl, modelId) -> model instance
    this.lastUsed = new Map(); // baseUrl -> timestamp
    this.maxIdleTime = 10 * 60 * 1000; // 10 minutes
    this.cleanupInterval = 60 * 1000; // 1 minute

    // Start cleanup timer
    this._startCleanup();
  }

  /**
   * Get or create client for base URL
   * @param {string} baseUrl - WebSocket URL for LM Studio
   * @returns {LMStudioClient} Client instance
   */
  getClient(baseUrl = 'ws://localhost:1234') {
    // Check if client exists
    if (this.clients.has(baseUrl)) {
      this.lastUsed.set(baseUrl, Date.now());
      logger.debug('Reusing existing LM Studio client', { baseUrl });
      return this.clients.get(baseUrl);
    }

    // Create new client
    logger.info('Creating new LM Studio client', { baseUrl });
    const client = new LMStudioClient({ baseUrl });

    this.clients.set(baseUrl, client);
    this.lastUsed.set(baseUrl, Date.now());

    return client;
  }

  /**
   * Get model from cache or load it
   * @param {string} baseUrl - WebSocket URL
   * @param {string} modelIdentifier - Model ID
   * @returns {Promise} Model instance
   */
  async getModel(baseUrl, modelIdentifier) {
    const cacheKey = `${baseUrl}:${modelIdentifier}`;

    // Check cache
    if (this.modelCache.has(cacheKey)) {
      logger.debug('Using cached model', { modelIdentifier });
      return this.modelCache.get(cacheKey);
    }

    // Load model
    logger.info('Loading model', { modelIdentifier, baseUrl });
    const client = this.getClient(baseUrl);

    try {
      const model = await client.llm.get({ identifier: modelIdentifier });
      this.modelCache.set(cacheKey, model);
      return model;
    } catch (error) {
      logger.error('Failed to load model', error, { modelIdentifier, baseUrl });
      throw error;
    }
  }

  /**
   * Clear model cache entry
   * @param {string} baseUrl - WebSocket URL
   * @param {string} modelIdentifier - Model ID
   */
  clearModelCache(baseUrl, modelIdentifier) {
    const cacheKey = `${baseUrl}:${modelIdentifier}`;
    if (this.modelCache.has(cacheKey)) {
      this.modelCache.delete(cacheKey);
      logger.debug('Cleared model cache', { modelIdentifier });
    }
  }

  /**
   * Clear all model caches for a base URL
   * @param {string} baseUrl - WebSocket URL
   */
  clearAllModelCaches(baseUrl) {
    let count = 0;
    for (const [key] of this.modelCache) {
      if (key.startsWith(`${baseUrl}:`)) {
        this.modelCache.delete(key);
        count++;
      }
    }
    if (count > 0) {
      logger.debug('Cleared all model caches', { baseUrl, count });
    }
  }

  /**
   * Close a client connection
   * @param {string} baseUrl - WebSocket URL
   */
  closeClient(baseUrl) {
    if (this.clients.has(baseUrl)) {
      logger.info('Closing LM Studio client', { baseUrl });

      this.clients.delete(baseUrl);
      this.lastUsed.delete(baseUrl);
      this.clearAllModelCaches(baseUrl);
    }
  }

  /**
   * Close all client connections
   */
  closeAll() {
    logger.info('Closing all LM Studio clients', { count: this.clients.size });

    this.clients.clear();
    this.lastUsed.clear();
    this.modelCache.clear();
  }

  /**
   * Start cleanup timer for idle connections
   */
  _startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this._cleanupIdleConnections();
    }, this.cleanupInterval);

    // Don't keep process alive for cleanup
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Clean up idle connections
   */
  _cleanupIdleConnections() {
    const now = Date.now();
    const toRemove = [];

    for (const [baseUrl, lastUsedTime] of this.lastUsed) {
      if (now - lastUsedTime > this.maxIdleTime) {
        toRemove.push(baseUrl);
      }
    }

    if (toRemove.length > 0) {
      logger.info('Cleaning up idle LM Studio clients', { count: toRemove.length });

      for (const baseUrl of toRemove) {
        this.closeClient(baseUrl);
      }
    }
  }

  /**
   * Stop cleanup timer
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get pool statistics
   */
  getStats() {
    return {
      activeClients: this.clients.size,
      cachedModels: this.modelCache.size,
      connections: Array.from(this.clients.keys()),
      lastUsed: Object.fromEntries(this.lastUsed),
    };
  }
}

// Singleton instance
let poolInstance = null;

/**
 * Get singleton pool instance
 * @returns {LMStudioClientPool} Pool instance
 */
export function getClientPool() {
  if (!poolInstance) {
    poolInstance = new LMStudioClientPool();
  }
  return poolInstance;
}

/**
 * Helper function to get client from pool
 * @param {string} baseUrl - WebSocket URL
 * @returns {LMStudioClient} Client instance
 */
export function getLMStudioClient(baseUrl = 'ws://localhost:1234') {
  return getClientPool().getClient(baseUrl);
}

/**
 * Helper function to get model from pool
 * @param {string} modelIdentifier - Model ID
 * @param {string} baseUrl - WebSocket URL
 * @returns {Promise} Model instance
 */
export async function getLMStudioModel(modelIdentifier, baseUrl = 'ws://localhost:1234') {
  return getClientPool().getModel(baseUrl, modelIdentifier);
}

/**
 * Close all connections (for graceful shutdown)
 */
export function closeAllConnections() {
  if (poolInstance) {
    poolInstance.closeAll();
    poolInstance.stopCleanup();
  }
}

export default {
  LMStudioClientPool,
  getClientPool,
  getLMStudioClient,
  getLMStudioModel,
  closeAllConnections,
};
