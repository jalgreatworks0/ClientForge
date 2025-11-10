/**
 * Analytics Controller
 * HTTP handlers for analytics endpoints
 */

import { Response, NextFunction } from 'express'
import { Pool } from 'pg'

import { AuthRequest } from '../../middleware/auth'
import { logger } from '../../utils/logging/logger'
import { AppError } from '../../utils/errors/app-error'

import { AnalyticsService } from './analytics-service'

export class AnalyticsController {
  private service: AnalyticsService

  constructor(pool: Pool) {
    this.service = new AnalyticsService(pool)
  }

  /**
   * GET /api/v1/analytics/dashboard
   * Get dashboard metrics
   */
  getDashboardMetrics = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400)
      }

      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        ownerId: req.query.ownerId as string | undefined,
      }

      const metrics = await this.service.getDashboardMetrics(tenantId, { filters })

      res.json({
        success: true,
        data: metrics,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/v1/analytics/contacts
   * Get contact analytics
   */
  getContactAnalytics = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400)
      }

      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        ownerId: req.query.ownerId as string | undefined,
      }

      const analytics = await this.service.getContactAnalytics(tenantId, { filters })

      res.json({
        success: true,
        data: analytics,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/v1/analytics/deals
   * Get deal analytics
   */
  getDealAnalytics = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400)
      }

      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        ownerId: req.query.ownerId as string | undefined,
        pipelineId: req.query.pipelineId as string | undefined,
      }

      const analytics = await this.service.getDealAnalytics(tenantId, {
        filters,
        pipelineId: req.query.pipelineId as string | undefined,
      })

      res.json({
        success: true,
        data: analytics,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/v1/analytics/revenue-forecast
   * Get revenue forecast
   */
  getRevenueForecast = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400)
      }

      const period = (req.query.period as 'month' | 'quarter' | 'year') || 'month'

      if (!['month', 'quarter', 'year'].includes(period)) {
        throw new AppError('Invalid period. Must be month, quarter, or year', 400)
      }

      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        ownerId: req.query.ownerId as string | undefined,
      }

      const forecast = await this.service.getRevenueForecast(tenantId, {
        period,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        filters,
      })

      res.json({
        success: true,
        data: forecast,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/v1/analytics/pipeline/:pipelineId
   * Get sales pipeline analytics
   */
  getSalesPipelineAnalytics = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400)
      }

      const { pipelineId } = req.params
      if (!pipelineId) {
        throw new AppError('Pipeline ID is required', 400)
      }

      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      }

      const analytics = await this.service.getSalesPipelineAnalytics(tenantId, {
        pipelineId,
        filters,
      })

      res.json({
        success: true,
        data: analytics,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/v1/analytics/tasks
   * Get task analytics
   */
  getTaskAnalytics = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400)
      }

      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        ownerId: req.query.ownerId as string | undefined,
      }

      const analytics = await this.service.getTaskAnalytics(tenantId, { filters })

      res.json({
        success: true,
        data: analytics,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/v1/analytics/activities
   * Get activity analytics
   */
  getActivityAnalytics = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400)
      }

      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        ownerId: req.query.ownerId as string | undefined,
      }

      const analytics = await this.service.getActivityAnalytics(tenantId, { filters })

      res.json({
        success: true,
        data: analytics,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * GET /api/v1/analytics/team-performance
   * Get team performance metrics
   */
  getTeamPerformance = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const tenantId = req.user?.tenantId
      if (!tenantId) {
        throw new AppError('Tenant ID is required', 400)
      }

      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10

      const performance = await this.service.getTeamPerformance(tenantId, {
        filters,
        limit,
      })

      res.json({
        success: true,
        data: performance,
      })
    } catch (error) {
      next(error)
    }
  }
}
