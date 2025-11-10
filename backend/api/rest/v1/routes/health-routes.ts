/**
 * Health Check Routes
 * Defines health, readiness, and liveness endpoints
 */

import { Router } from 'express'

import * as healthController from '../controllers/health-controller'

const router = Router()

/**
 * GET /api/v1/health
 * Basic health check
 *
 * Returns basic application health status
 *
 * @returns {200} Application is running
 */
router.get('/', healthController.healthCheck)

/**
 * GET /api/v1/health/ready
 * Readiness probe
 *
 * Returns detailed health status including database connectivity
 * Used by Kubernetes/Docker orchestrators to determine if app is ready to receive traffic
 *
 * @returns {200} Application is ready (healthy or degraded)
 * @returns {503} Application is unhealthy (critical services down)
 */
router.get('/ready', healthController.readinessCheck)

/**
 * GET /api/v1/health/live
 * Liveness probe
 *
 * Simple check that process is running
 * Used by Kubernetes/Docker orchestrators to determine if container should be restarted
 *
 * @returns {200} Application is alive
 */
router.get('/live', healthController.livenessCheck)

export default router
