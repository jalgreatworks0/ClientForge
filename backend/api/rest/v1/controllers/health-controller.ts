/**
 * Health Check Controller
 * Handles health check and readiness probe endpoints
 */

import { Request, Response, NextFunction } from 'express'

import { getPostgresPool } from '../../../../../config/database/postgres-config'
import { getRedisClient } from '../../../../../config/database/redis-config'
import { getMongoClient } from '../../../../../config/database/mongodb-config'
import { getElasticsearchClient } from '../../../../../config/database/elasticsearch-config'
import { logger } from '../../../../utils/logging/logger'
import { appConfig } from '../../../../../config/app/app-config'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  uptime: number
  environment: string
  version: string
  services: {
    postgres: ServiceStatus
    redis: ServiceStatus
    mongodb: ServiceStatus
    elasticsearch: ServiceStatus
  }
}

interface ServiceStatus {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  error?: string
  metadata?: Record<string, any>
}

/**
 * Check PostgreSQL connection
 */
async function checkPostgres(): Promise<ServiceStatus> {
  const start = Date.now()

  try {
    const pool = getPostgresPool()
    await pool.query('SELECT 1')

    return {
      status: 'up',
      responseTime: Date.now() - start,
    }
  } catch (error) {
    logger.error('PostgreSQL health check failed', { error })

    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check Redis connection
 */
async function checkRedis(): Promise<ServiceStatus> {
  const start = Date.now()

  try {
    const redis = await getRedisClient()
    await redis.ping()

    return {
      status: 'up',
      responseTime: Date.now() - start,
    }
  } catch (error) {
    logger.error('Redis health check failed', { error })

    return {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check MongoDB connection
 */
async function checkMongoDB(): Promise<ServiceStatus> {
  const start = Date.now()

  try {
    const client = await getMongoClient()
    await client.db().admin().ping()

    return {
      status: 'up',
      responseTime: Date.now() - start,
    }
  } catch (error) {
    logger.warn('MongoDB health check failed (non-critical)', { error })

    return {
      status: 'degraded',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check Elasticsearch connection
 */
async function checkElasticsearch(): Promise<ServiceStatus> {
  const start = Date.now()

  try {
    const client = await getElasticsearchClient()
    const health = await client.cluster.health()

    return {
      status: health.status === 'red' ? 'degraded' : 'up',
      responseTime: Date.now() - start,
      metadata: {
        clusterStatus: health.status,
        numberOfNodes: health.number_of_nodes,
        activeShards: health.active_shards,
      },
    }
  } catch (error) {
    logger.warn('Elasticsearch health check failed (non-critical)', { error })

    return {
      status: 'degraded',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Basic health check
 * GET /api/v1/health
 *
 * Returns basic application health status
 */
export async function healthCheck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: appConfig.env,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Detailed readiness check
 * GET /api/v1/health/ready
 *
 * Returns detailed health status including database connectivity
 * Used by Kubernetes/Docker for readiness probes
 */
export async function readinessCheck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check all services in parallel
    const [postgresStatus, redisStatus, mongoStatus, elasticsearchStatus] = await Promise.all([
      checkPostgres(),
      checkRedis(),
      checkMongoDB(),
      checkElasticsearch(),
    ])

    // Determine overall health
    // Critical services: PostgreSQL, Redis
    // Non-critical: MongoDB, Elasticsearch (can be degraded)
    const criticalServicesUp = postgresStatus.status === 'up' && redisStatus.status === 'up'
    const allServicesUp =
      criticalServicesUp &&
      mongoStatus.status === 'up' &&
      elasticsearchStatus.status === 'up'

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'

    if (allServicesUp) {
      overallStatus = 'healthy'
    } else if (criticalServicesUp) {
      // Critical services up, but some non-critical services degraded
      overallStatus = 'degraded'
    } else {
      // Critical services down
      overallStatus = 'unhealthy'
    }

    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: appConfig.env,
      version: appConfig.apiVersion,
      services: {
        postgres: postgresStatus,
        redis: redisStatus,
        mongodb: mongoStatus,
        elasticsearch: elasticsearchStatus,
      },
    }

    // Return 200 if healthy or degraded, 503 if unhealthy
    const statusCode = overallStatus === 'unhealthy' ? 503 : 200

    res.status(statusCode).json({
      success: overallStatus !== 'unhealthy',
      data: healthStatus,
    })
  } catch (error) {
    logger.error('Readiness check failed', { error })
    next(error)
  }
}

/**
 * Liveness check
 * GET /api/v1/health/live
 *
 * Simple liveness probe - just checks if the process is running
 * Used by Kubernetes/Docker for liveness probes
 */
export async function livenessCheck(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.status(200).json({
      success: true,
      data: {
        status: 'alive',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    next(error)
  }
}
