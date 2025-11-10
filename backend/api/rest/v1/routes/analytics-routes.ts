/**
 * Analytics API Routes
 * RESTful endpoints for analytics and metrics
 */

import { Router } from 'express'
import { Pool } from 'pg'
import { authenticate } from '../../../../middleware/authenticate'
import { requirePermission } from '../../../../middleware/authorize'
import { validateRequest } from '../../../../middleware/validate-request'
import { AnalyticsController } from '../../../../core/analytics/analytics-controller'
import {
  getDashboardMetricsValidator,
  getContactAnalyticsValidator,
  getDealAnalyticsValidator,
  getRevenueForecastValidator,
  getSalesPipelineAnalyticsValidator,
  getTaskAnalyticsValidator,
  getActivityAnalyticsValidator,
  getTeamPerformanceValidator,
} from '../../../../core/analytics/analytics-validators'

export function createAnalyticsRoutes(pool: Pool): Router {
  const router = Router()
  const controller = new AnalyticsController(pool)

  // All routes require authentication
  router.use(authenticate)

  /**
   * GET /api/v1/analytics/dashboard
   * Get dashboard overview metrics
   *
   * Query params:
   * @param {string} startDate - Filter start date (ISO 8601)
   * @param {string} endDate - Filter end date (ISO 8601)
   * @param {string} ownerId - Filter by owner ID
   *
   * @returns {200} Dashboard metrics object
   * @requires permission:analytics:read
   */
  router.get(
    '/dashboard',
    requirePermission('analytics:read'),
    validateRequest(getDashboardMetricsValidator),
    controller.getDashboardMetrics
  )

  /**
   * GET /api/v1/analytics/contacts
   * Get contact analytics and statistics
   *
   * Query params:
   * @param {string} startDate - Filter start date (ISO 8601)
   * @param {string} endDate - Filter end date (ISO 8601)
   * @param {string} ownerId - Filter by owner ID
   *
   * @returns {200} Contact analytics object
   * @requires permission:analytics:read
   */
  router.get(
    '/contacts',
    requirePermission('analytics:read'),
    validateRequest(getContactAnalyticsValidator),
    controller.getContactAnalytics
  )

  /**
   * GET /api/v1/analytics/deals
   * Get deal analytics and revenue metrics
   *
   * Query params:
   * @param {string} startDate - Filter start date (ISO 8601)
   * @param {string} endDate - Filter end date (ISO 8601)
   * @param {string} ownerId - Filter by owner ID
   * @param {string} pipelineId - Filter by pipeline ID
   *
   * @returns {200} Deal analytics object
   * @requires permission:analytics:read
   */
  router.get(
    '/deals',
    requirePermission('analytics:read'),
    validateRequest(getDealAnalyticsValidator),
    controller.getDealAnalytics
  )

  /**
   * GET /api/v1/analytics/revenue-forecast
   * Get revenue forecast with AI predictions
   *
   * Query params:
   * @param {string} period - Forecast period (month, quarter, year)
   * @param {string} startDate - Forecast start date (ISO 8601)
   * @param {string} endDate - Forecast end date (ISO 8601)
   * @param {string} ownerId - Filter by owner ID
   *
   * @returns {200} Revenue forecast object
   * @requires permission:analytics:read
   */
  router.get(
    '/revenue-forecast',
    requirePermission('analytics:read'),
    validateRequest(getRevenueForecastValidator),
    controller.getRevenueForecast
  )

  /**
   * GET /api/v1/analytics/pipeline/:pipelineId
   * Get sales pipeline analytics
   *
   * Path params:
   * @param {string} pipelineId - Pipeline ID (UUID)
   *
   * Query params:
   * @param {string} startDate - Filter start date (ISO 8601)
   * @param {string} endDate - Filter end date (ISO 8601)
   *
   * @returns {200} Sales pipeline analytics object
   * @requires permission:analytics:read
   */
  router.get(
    '/pipeline/:pipelineId',
    requirePermission('analytics:read'),
    validateRequest(getSalesPipelineAnalyticsValidator),
    controller.getSalesPipelineAnalytics
  )

  /**
   * GET /api/v1/analytics/tasks
   * Get task analytics and completion metrics
   *
   * Query params:
   * @param {string} startDate - Filter start date (ISO 8601)
   * @param {string} endDate - Filter end date (ISO 8601)
   * @param {string} ownerId - Filter by owner ID
   *
   * @returns {200} Task analytics object
   * @requires permission:analytics:read
   */
  router.get(
    '/tasks',
    requirePermission('analytics:read'),
    validateRequest(getTaskAnalyticsValidator),
    controller.getTaskAnalytics
  )

  /**
   * GET /api/v1/analytics/activities
   * Get activity analytics and engagement metrics
   *
   * Query params:
   * @param {string} startDate - Filter start date (ISO 8601)
   * @param {string} endDate - Filter end date (ISO 8601)
   * @param {string} ownerId - Filter by owner ID
   *
   * @returns {200} Activity analytics object
   * @requires permission:analytics:read
   */
  router.get(
    '/activities',
    requirePermission('analytics:read'),
    validateRequest(getActivityAnalyticsValidator),
    controller.getActivityAnalytics
  )

  /**
   * GET /api/v1/analytics/team-performance
   * Get team performance and leaderboard
   *
   * Query params:
   * @param {string} startDate - Filter start date (ISO 8601)
   * @param {string} endDate - Filter end date (ISO 8601)
   * @param {number} limit - Number of top performers to return (default: 10)
   *
   * @returns {200} Team performance object
   * @requires permission:analytics:read
   */
  router.get(
    '/team-performance',
    requirePermission('analytics:read'),
    validateRequest(getTeamPerformanceValidator),
    controller.getTeamPerformance
  )

  return router
}
