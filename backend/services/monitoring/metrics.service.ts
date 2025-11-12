/**
 * Prometheus Metrics Service
 * Provides application-level metrics for monitoring and observability
 */

import { register, Counter, Histogram, Gauge, Summary, collectDefaultMetrics } from 'prom-client';
import { Request, Response, NextFunction } from 'express';

import { logger } from '../../utils/logging/logger';

// Initialize default metrics (CPU, memory, etc.)
collectDefaultMetrics({ prefix: 'crm_' });

// ============================================
// HTTP Metrics
// ============================================

export const httpRequestDuration = new Histogram({
  name: 'crm_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
});

export const httpRequestsTotal = new Counter({
  name: 'crm_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

export const httpActiveConnections = new Gauge({
  name: 'crm_http_active_connections',
  help: 'Number of active HTTP connections'
});

// ============================================
// Database Metrics
// ============================================

export const dbQueryDuration = new Histogram({
  name: 'crm_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5]
});

export const dbQueryTotal = new Counter({
  name: 'crm_db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status']
});

export const dbConnectionsActive = new Gauge({
  name: 'crm_db_connections_active',
  help: 'Number of active database connections',
  labelNames: ['database']
});

export const dbConnectionsIdle = new Gauge({
  name: 'crm_db_connections_idle',
  help: 'Number of idle database connections',
  labelNames: ['database']
});

export const dbConnectionsTotal = new Gauge({
  name: 'crm_db_connections_total',
  help: 'Total number of database connections',
  labelNames: ['database']
});

// ============================================
// Queue Metrics
// ============================================

export const queueJobsProcessed = new Counter({
  name: 'crm_queue_jobs_processed_total',
  help: 'Total number of queue jobs processed',
  labelNames: ['queue', 'status']
});

export const queueJobsDLQ = new Counter({
  name: 'crm_queue_jobs_dlq_total',
  help: 'Total number of jobs sent to DLQ',
  labelNames: ['queue']
});

export const queueJobDuration = new Histogram({
  name: 'crm_queue_job_duration_seconds',
  help: 'Duration of queue job processing',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300]
});

export const queueJobsWaiting = new Gauge({
  name: 'crm_queue_jobs_waiting',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue']
});

export const queueJobsActive = new Gauge({
  name: 'crm_queue_jobs_active',
  help: 'Number of jobs currently being processed',
  labelNames: ['queue']
});

export const queueJobsDelayed = new Gauge({
  name: 'crm_queue_jobs_delayed',
  help: 'Number of delayed jobs in queue',
  labelNames: ['queue']
});

export const queueJobsFailed = new Gauge({
  name: 'crm_queue_jobs_failed',
  help: 'Number of failed jobs in queue',
  labelNames: ['queue']
});

// ============================================
// Business Metrics
// ============================================

export const activeUsers = new Gauge({
  name: 'crm_active_users',
  help: 'Number of active users in last 5 minutes',
  labelNames: ['tenantId']
});

export const activeSessions = new Gauge({
  name: 'crm_active_sessions',
  help: 'Number of active user sessions',
  labelNames: ['tenantId']
});

export const apiCallsTotal = new Counter({
  name: 'crm_api_calls_total',
  help: 'Total number of API calls',
  labelNames: ['tenantId', 'endpoint', 'status']
});

// ============================================
// Search Metrics
// ============================================

export const searchLatency = new Summary({
  name: 'crm_search_latency_seconds',
  help: 'Search query latency',
  labelNames: ['index', 'type'],
  percentiles: [0.5, 0.9, 0.95, 0.99]
});

export const searchQueriesTotal = new Counter({
  name: 'crm_search_queries_total',
  help: 'Total number of search queries',
  labelNames: ['index', 'status']
});

export const searchResultsReturned = new Histogram({
  name: 'crm_search_results_returned',
  help: 'Number of search results returned',
  labelNames: ['index'],
  buckets: [0, 1, 5, 10, 20, 50, 100, 500]
});

// ============================================
// Cache Metrics
// ============================================

export const cacheHitsTotal = new Counter({
  name: 'crm_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type']
});

export const cacheMissesTotal = new Counter({
  name: 'crm_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type']
});

export const cacheOperationDuration = new Histogram({
  name: 'crm_cache_operation_duration_seconds',
  help: 'Duration of cache operations',
  labelNames: ['operation', 'cache_type'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1]
});

// ============================================
// AI/Embeddings Metrics
// ============================================

export const embeddingGenerationDuration = new Histogram({
  name: 'crm_embedding_generation_duration_seconds',
  help: 'Duration of embedding generation',
  labelNames: ['model'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const embeddingGenerationTotal = new Counter({
  name: 'crm_embedding_generation_total',
  help: 'Total number of embeddings generated',
  labelNames: ['model', 'status']
});

export const aiRequestsTotal = new Counter({
  name: 'crm_ai_requests_total',
  help: 'Total number of AI API requests',
  labelNames: ['provider', 'model', 'status']
});

export const aiTokensUsed = new Counter({
  name: 'crm_ai_tokens_used_total',
  help: 'Total number of AI tokens used',
  labelNames: ['provider', 'model', 'type']
});

// ============================================
// Middleware
// ============================================

/**
 * Express middleware to track HTTP request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  // Increment active connections
  httpActiveConnections.inc();

  // Track when response finishes
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const status = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe({ method, route, status }, duration);
    httpRequestsTotal.inc({ method, route, status });
    httpActiveConnections.dec();

    // Log slow requests
    if (duration > 1) {
      logger.warn('Slow HTTP request', {
        method,
        route,
        status,
        duration,
        tenantId: (req as any).tenantId
      });
    }
  });

  next();
}

/**
 * Database query tracker wrapper
 */
export function trackDbQuery<T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  return queryFn()
    .then((result) => {
      const duration = (Date.now() - start) / 1000;
      dbQueryDuration.observe({ operation, table, status: 'success' }, duration);
      dbQueryTotal.inc({ operation, table, status: 'success' });

      // Log slow queries
      if (duration > 0.1) {
        logger.warn('Slow database query', {
          operation,
          table,
          duration
        });
      }

      return result;
    })
    .catch((error) => {
      const duration = (Date.now() - start) / 1000;
      dbQueryDuration.observe({ operation, table, status: 'error' }, duration);
      dbQueryTotal.inc({ operation, table, status: 'error' });

      logger.error('Database query error', {
        operation,
        table,
        duration,
        error: error.message
      });

      throw error;
    });
}

/**
 * Search query tracker wrapper
 */
export function trackSearchQuery<T>(
  index: string,
  type: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  return queryFn()
    .then((result) => {
      const duration = (Date.now() - start) / 1000;
      searchLatency.observe({ index, type }, duration);
      searchQueriesTotal.inc({ index, status: 'success' });

      // Log slow searches
      if (duration > 0.1) {
        logger.warn('Slow search query', {
          index,
          type,
          duration
        });
      }

      return result;
    })
    .catch((error) => {
      const duration = (Date.now() - start) / 1000;
      searchLatency.observe({ index, type }, duration);
      searchQueriesTotal.inc({ index, status: 'error' });

      logger.error('Search query error', {
        index,
        type,
        duration,
        error: error.message
      });

      throw error;
    });
}

/**
 * Cache operation tracker wrapper
 */
export function trackCacheOperation<T>(
  operation: 'get' | 'set' | 'del',
  cacheType: string,
  operationFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  return operationFn()
    .then((result) => {
      const duration = (Date.now() - start) / 1000;
      cacheOperationDuration.observe({ operation, cache_type: cacheType }, duration);

      if (operation === 'get') {
        if (result !== null && result !== undefined) {
          cacheHitsTotal.inc({ cache_type: cacheType });
        } else {
          cacheMissesTotal.inc({ cache_type: cacheType });
        }
      }

      return result;
    })
    .catch((error) => {
      logger.error('Cache operation error', {
        operation,
        cacheType,
        error: error.message
      });
      throw error;
    });
}

/**
 * Get metrics endpoint handler
 */
export async function getMetrics(req: Request, res: Response) {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    logger.error('Error generating metrics', { error });
    res.status(500).send('Error generating metrics');
  }
}

/**
 * Reset all metrics (useful for testing)
 */
export function resetMetrics() {
  register.resetMetrics();
}

// ============================================
// Metric Collection Helpers
// ============================================

/**
 * Update database connection pool metrics
 */
export async function updateDbConnectionMetrics(
  database: string,
  stats: { active: number; idle: number; total: number }
) {
  dbConnectionsActive.set({ database }, stats.active);
  dbConnectionsIdle.set({ database }, stats.idle);
  dbConnectionsTotal.set({ database }, stats.total);
}

/**
 * Update queue metrics
 */
export async function updateQueueMetrics(
  queue: string,
  stats: { waiting: number; active: number; delayed: number; failed: number }
) {
  queueJobsWaiting.set({ queue }, stats.waiting);
  queueJobsActive.set({ queue }, stats.active);
  queueJobsDelayed.set({ queue }, stats.delayed);
  queueJobsFailed.set({ queue }, stats.failed);
}

/**
 * Update active users metric
 */
export async function updateActiveUsersMetric(tenantId: string, count: number) {
  activeUsers.set({ tenantId: tenantId }, count);
}

/**
 * Update active sessions metric
 */
export async function updateActiveSessionsMetric(tenantId: string, count: number) {
  activeSessions.set({ tenantId: tenantId }, count);
}

export default {
  metricsMiddleware,
  getMetrics,
  resetMetrics,
  trackDbQuery,
  trackSearchQuery,
  trackCacheOperation,
  updateDbConnectionMetrics,
  updateQueueMetrics,
  updateActiveUsersMetric,
  updateActiveSessionsMetric,
  // Export all metrics for direct use
  httpRequestDuration,
  httpRequestsTotal,
  httpActiveConnections,
  dbQueryDuration,
  dbQueryTotal,
  queueJobsProcessed,
  queueJobsDLQ,
  queueJobDuration,
  searchLatency,
  searchQueriesTotal,
  cacheHitsTotal,
  cacheMissesTotal,
  embeddingGenerationDuration,
  embeddingGenerationTotal,
  aiRequestsTotal,
  aiTokensUsed
};
