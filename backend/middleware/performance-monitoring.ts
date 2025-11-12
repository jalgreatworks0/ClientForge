/**
 * Performance Monitoring Middleware
 * Tracks API request/response times and logs slow endpoints
 */

import { Request, Response, NextFunction } from 'express'

import { logger } from '../utils/logging/logger'
import { getPool } from '../database/postgresql/pool'

interface PerformanceMetrics {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  tenantId?: string
  userId?: string
  userAgent?: string
  ip?: string
}

// Configuration
const SLOW_REQUEST_THRESHOLD_MS = 200
const LOG_TO_DATABASE = process.env.LOG_PERFORMANCE_TO_DB === 'true'
const ENABLE_RESPONSE_HEADERS = process.env.PERF_HEADERS === 'true' || true

/**
 * Performance monitoring middleware
 * Tracks request timing and logs slow endpoints
 */
export function performanceMonitoring(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now()
  const startHrTime = process.hrtime()

  // Store original end function
  const originalEnd = res.end

  // Override res.end to capture response time
  res.end = function (chunk?: any, encoding?: any, callback?: any): Response {
    // Calculate response time
    const hrDiff = process.hrtime(startHrTime)
    const responseTimeMs = Math.round(hrDiff[0] * 1000 + hrDiff[1] / 1000000)

    // Extract metrics
    const metrics: PerformanceMetrics = {
      endpoint: req.route?.path || req.path,
      method: req.method,
      statusCode: res.statusCode,
      responseTime: responseTimeMs,
      tenantId: (req as any).tenantId,
      userId: (req as any).userId,
      userAgent: req.get('user-agent'),
      ip: req.ip || req.socket.remoteAddress,
    }

    // Add response time header
    if (ENABLE_RESPONSE_HEADERS) {
      res.setHeader('X-Response-Time', `${responseTimeMs}ms`)
    }

    // Log slow requests
    if (responseTimeMs > SLOW_REQUEST_THRESHOLD_MS) {
      logger.warn('Slow API endpoint detected', {
        ...metrics,
        threshold: SLOW_REQUEST_THRESHOLD_MS,
      })

      // Log to database if enabled
      if (LOG_TO_DATABASE) {
        logPerformanceToDatabase(metrics).catch((error) => {
          logger.error('Failed to log performance metrics to database', { error })
        })
      }
    } else {
      // Log all requests at debug level
      logger.debug('API request completed', metrics)
    }

    // Track metrics in memory for aggregation
    trackMetricsInMemory(metrics)

    // Call original end function
    if (typeof chunk === 'function') {
      return originalEnd.call(this, chunk)
    } else if (typeof encoding === 'function') {
      return originalEnd.call(this, chunk, encoding)
    } else {
      return originalEnd.call(this, chunk, encoding, callback)
    }
  } as any

  next()
}

/**
 * Log performance metrics to database
 */
async function logPerformanceToDatabase(metrics: PerformanceMetrics): Promise<void> {
  try {
    const pool = getPool()
    await pool.query(
      `
      INSERT INTO query_performance_log (
        query_name,
        execution_time_ms,
        query_text,
        params,
        tenantId,
        user_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        `${metrics.method} ${metrics.endpoint}`,
        metrics.responseTime,
        `${metrics.method} ${metrics.endpoint} -> ${metrics.statusCode}`,
        JSON.stringify({
          userAgent: metrics.userAgent,
          ip: metrics.ip,
        }),
        metrics.tenantId || null,
        metrics.userId || null,
      ]
    )
  } catch (error) {
    // Don't throw - logging should never break the app
    logger.error('Failed to log performance to database', { error, metrics })
  }
}

/**
 * In-memory metrics aggregation
 * Stores last 1000 requests for real-time analysis
 */
class MetricsAggregator {
  private metrics: PerformanceMetrics[] = []
  private readonly MAX_METRICS = 1000

  track(metric: PerformanceMetrics) {
    this.metrics.push(metric)

    // Keep only last 1000 metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift()
    }
  }

  getStats() {
    if (this.metrics.length === 0) {
      return null
    }

    const responseTimes = this.metrics.map((m) => m.responseTime)
    const sum = responseTimes.reduce((a, b) => a + b, 0)

    return {
      totalRequests: this.metrics.length,
      averageResponseTime: Math.round(sum / this.metrics.length),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      slowRequests: this.metrics.filter((m) => m.responseTime > SLOW_REQUEST_THRESHOLD_MS).length,
      slowRequestPercentage: Math.round(
        (this.metrics.filter((m) => m.responseTime > SLOW_REQUEST_THRESHOLD_MS).length /
          this.metrics.length) *
          100
      ),
      statusCodes: this.countByField('statusCode'),
      endpoints: this.countByField('endpoint'),
      methods: this.countByField('method'),
    }
  }

  getSlowEndpoints(limit: number = 10) {
    const endpointTimes = new Map<string, number[]>()

    // Group response times by endpoint
    this.metrics.forEach((m) => {
      const key = `${m.method} ${m.endpoint}`
      if (!endpointTimes.has(key)) {
        endpointTimes.set(key, [])
      }
      endpointTimes.get(key)!.push(m.responseTime)
    })

    // Calculate average for each endpoint
    const averages = Array.from(endpointTimes.entries()).map(([endpoint, times]) => ({
      endpoint,
      averageTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      requestCount: times.length,
      maxTime: Math.max(...times),
    }))

    // Sort by average time descending
    return averages.sort((a, b) => b.averageTime - a.averageTime).slice(0, limit)
  }

  private countByField(field: keyof PerformanceMetrics): Record<string, number> {
    const counts: Record<string, number> = {}
    this.metrics.forEach((m) => {
      const value = String(m[field])
      counts[value] = (counts[value] || 0) + 1
    })
    return counts
  }

  reset() {
    this.metrics = []
  }
}

// Singleton aggregator
const metricsAggregator = new MetricsAggregator()

function trackMetricsInMemory(metrics: PerformanceMetrics) {
  metricsAggregator.track(metrics)
}

/**
 * Get current performance statistics
 */
export function getPerformanceStats() {
  return metricsAggregator.getStats()
}

/**
 * Get slowest endpoints
 */
export function getSlowEndpoints(limit: number = 10) {
  return metricsAggregator.getSlowEndpoints(limit)
}

/**
 * Reset metrics (useful for testing)
 */
export function resetMetrics() {
  metricsAggregator.reset()
}

/**
 * Middleware to add performance stats endpoint
 */
export function performanceStatsEndpoint(req: Request, res: Response) {
  const stats = getPerformanceStats()
  const slowEndpoints = getSlowEndpoints()

  res.json({
    stats,
    slowEndpoints,
    threshold: SLOW_REQUEST_THRESHOLD_MS,
    databaseLogging: LOG_TO_DATABASE,
  })
}
