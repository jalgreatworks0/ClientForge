/**
 * Analytics Service
 * Business logic for analytics and metrics
 */

import { Pool } from 'pg'

import { logger } from '../../utils/logging/logger'
import { AppError } from '../../utils/errors/app-error'

import { AnalyticsRepository } from './analytics-repository'
import {
  DashboardMetrics,
  ContactAnalytics,
  DealAnalytics,
  TaskAnalytics,
  ActivityAnalytics,
  RevenueForecast,
  SalesPipelineAnalytics,
  TeamPerformance,
  AnalyticsFilters,
  GetDashboardMetricsRequest,
  GetContactAnalyticsRequest,
  GetDealAnalyticsRequest,
  GetRevenueForecastRequest,
  GetSalesPipelineAnalyticsRequest,
  GetTaskAnalyticsRequest,
  GetActivityAnalyticsRequest,
  GetTeamPerformanceRequest,
} from './analytics-types'

export class AnalyticsService {
  private repository: AnalyticsRepository

  constructor(private pool: Pool) {
    this.repository = new AnalyticsRepository(pool)
  }

  /**
   * Get Dashboard Metrics
   * High-level overview for main dashboard
   */
  async getDashboardMetrics(
    tenantId: string,
    request: GetDashboardMetricsRequest
  ): Promise<DashboardMetrics> {
    try {
      logger.info('Fetching dashboard metrics', { tenantId })

      const metrics = await this.repository.getDashboardMetrics(
        tenantId,
        request.filters
      )

      logger.info('Dashboard metrics fetched successfully', {
        tenantId,
        totalContacts: metrics.totalContacts,
        totalDeals: metrics.totalDeals,
      })

      return metrics
    } catch (error) {
      logger.error('Error in getDashboardMetrics', { error, tenantId })
      throw new AppError('Failed to fetch dashboard metrics', 500, { originalError: error })
    }
  }

  /**
   * Get Contact Analytics
   * Detailed analytics about contacts/leads
   */
  async getContactAnalytics(
    tenantId: string,
    request: GetContactAnalyticsRequest
  ): Promise<ContactAnalytics> {
    try {
      logger.info('Fetching contact analytics', { tenantId })

      const analytics = await this.repository.getContactAnalytics(
        tenantId,
        request.filters
      )

      logger.info('Contact analytics fetched successfully', {
        tenantId,
        totalContacts: analytics.totalContacts,
      })

      return analytics
    } catch (error) {
      logger.error('Error in getContactAnalytics', { error, tenantId })
      throw new AppError('Failed to fetch contact analytics', 500, { originalError: error })
    }
  }

  /**
   * Get Deal Analytics
   * Detailed analytics about deals and revenue
   */
  async getDealAnalytics(
    tenantId: string,
    request: GetDealAnalyticsRequest
  ): Promise<DealAnalytics> {
    try {
      logger.info('Fetching deal analytics', { tenantId, pipelineId: request.pipelineId })

      const analytics = await this.repository.getDealAnalytics(
        tenantId,
        request.filters
      )

      logger.info('Deal analytics fetched successfully', {
        tenantId,
        totalDeals: analytics.totalDeals,
        totalRevenue: analytics.totalRevenue,
      })

      return analytics
    } catch (error) {
      logger.error('Error in getDealAnalytics', { error, tenantId })
      throw new AppError('Failed to fetch deal analytics', 500, { originalError: error })
    }
  }

  /**
   * Get Revenue Forecast
   * AI-powered revenue forecasting (placeholder for AI integration)
   */
  async getRevenueForecast(
    tenantId: string,
    request: GetRevenueForecastRequest
  ): Promise<RevenueForecast> {
    try {
      logger.info('Generating revenue forecast', { tenantId, period: request.period })

      // Get deal analytics for baseline data
      const dealAnalytics = await this.repository.getDealAnalytics(
        tenantId,
        request.filters
      )

      // Calculate date range based on period
      const startDate = request.startDate || new Date()
      const endDate = this.calculateEndDate(startDate, request.period)

      // Calculate forecast metrics
      const projectedRevenue = dealAnalytics.projectedRevenue
      const committedRevenue = this.calculateCommittedRevenue(dealAnalytics)
      const bestCaseRevenue = projectedRevenue * 1.2 // 20% optimistic
      const worstCaseRevenue = projectedRevenue * 0.8 // 20% pessimistic

      // Calculate growth rate (compare to previous period)
      const previousPeriodRevenue = dealAnalytics.wonRevenue // Simplified
      const growthRate = previousPeriodRevenue > 0
        ? ((projectedRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100
        : 0

      // TODO: Integrate with AI service (Albedo) for ML-powered predictions
      const forecast: RevenueForecast = {
        period: request.period,
        startDate,
        endDate,
        projectedRevenue,
        committedRevenue,
        bestCaseRevenue,
        worstCaseRevenue,
        target: null, // TODO: Get from targets table
        targetAchievement: 0,
        gap: 0,
        previousPeriodRevenue,
        growthRate,
        byMonth: [], // TODO: Implement monthly breakdown
      }

      logger.info('Revenue forecast generated successfully', {
        tenantId,
        projectedRevenue: forecast.projectedRevenue,
      })

      return forecast
    } catch (error) {
      logger.error('Error in getRevenueForecast', { error, tenantId })
      throw new AppError('Failed to generate revenue forecast', 500, { originalError: error })
    }
  }

  /**
   * Get Sales Pipeline Analytics
   * Pipeline-specific metrics and conversion rates
   */
  async getSalesPipelineAnalytics(
    tenantId: string,
    request: GetSalesPipelineAnalyticsRequest
  ): Promise<SalesPipelineAnalytics> {
    try {
      logger.info('Fetching sales pipeline analytics', {
        tenantId,
        pipelineId: request.pipelineId,
      })

      // TODO: Implement comprehensive pipeline analytics
      // For now, return basic structure
      const analytics: SalesPipelineAnalytics = {
        pipelineId: request.pipelineId,
        pipelineName: 'Default Pipeline', // TODO: Get from database
        totalDeals: 0,
        totalValue: 0,
        weightedValue: 0,
        averageVelocity: 0,
        averageTimeToClose: 0,
        stageConversionRates: [],
        stages: [],
      }

      logger.info('Sales pipeline analytics fetched successfully', { tenantId })

      return analytics
    } catch (error) {
      logger.error('Error in getSalesPipelineAnalytics', { error, tenantId })
      throw new AppError('Failed to fetch sales pipeline analytics', 500, {
        originalError: error,
      })
    }
  }

  /**
   * Get Task Analytics
   * Task completion metrics and assignee performance
   */
  async getTaskAnalytics(
    tenantId: string,
    request: GetTaskAnalyticsRequest
  ): Promise<TaskAnalytics> {
    try {
      logger.info('Fetching task analytics', { tenantId })

      const analytics = await this.repository.getTaskAnalytics(
        tenantId,
        request.filters
      )

      logger.info('Task analytics fetched successfully', {
        tenantId,
        totalTasks: analytics.totalTasks,
      })

      return analytics
    } catch (error) {
      logger.error('Error in getTaskAnalytics', { error, tenantId })
      throw new AppError('Failed to fetch task analytics', 500, { originalError: error })
    }
  }

  /**
   * Get Activity Analytics
   * Activity tracking and engagement metrics
   */
  async getActivityAnalytics(
    tenantId: string,
    request: GetActivityAnalyticsRequest
  ): Promise<ActivityAnalytics> {
    try {
      logger.info('Fetching activity analytics', { tenantId })

      // TODO: Implement activity analytics
      // For now, return basic structure
      const analytics: ActivityAnalytics = {
        totalActivities: 0,
        activitiesThisWeek: 0,
        activitiesThisMonth: 0,
        byType: {
          call: 0,
          email: 0,
          meeting: 0,
          note: 0,
          task: 0,
          custom: 0,
        },
        byUser: [],
        last30Days: [],
        topContacts: [],
        topAccounts: [],
      }

      logger.info('Activity analytics fetched successfully', { tenantId })

      return analytics
    } catch (error) {
      logger.error('Error in getActivityAnalytics', { error, tenantId })
      throw new AppError('Failed to fetch activity analytics', 500, { originalError: error })
    }
  }

  /**
   * Get Team Performance
   * Team leaderboard and performance metrics
   */
  async getTeamPerformance(
    tenantId: string,
    request: GetTeamPerformanceRequest
  ): Promise<TeamPerformance> {
    try {
      logger.info('Fetching team performance', { tenantId })

      // TODO: Implement team performance analytics
      // For now, return basic structure
      const performance: TeamPerformance = {
        teamSize: 0,
        activeUsers: 0,
        totalDealsWon: 0,
        totalRevenue: 0,
        averageDealSize: 0,
        teamWinRate: 0,
        topPerformers: [],
        activityLeaders: [],
        leaderboard: [],
      }

      logger.info('Team performance fetched successfully', { tenantId })

      return performance
    } catch (error) {
      logger.error('Error in getTeamPerformance', { error, tenantId })
      throw new AppError('Failed to fetch team performance', 500, { originalError: error })
    }
  }

  // =====================================================
  // PRIVATE HELPER METHODS
  // =====================================================

  /**
   * Calculate end date based on period
   */
  private calculateEndDate(startDate: Date, period: 'month' | 'quarter' | 'year'): Date {
    const date = new Date(startDate)

    switch (period) {
      case 'month':
        date.setMonth(date.getMonth() + 1)
        break
      case 'quarter':
        date.setMonth(date.getMonth() + 3)
        break
      case 'year':
        date.setFullYear(date.getFullYear() + 1)
        break
    }

    return date
  }

  /**
   * Calculate committed revenue (high probability deals)
   */
  private calculateCommittedRevenue(analytics: DealAnalytics): number {
    // Sum of deals with probability >= 70%
    const highProbabilityDeals = analytics.topDeals.filter((d) => d.probability >= 70)
    return highProbabilityDeals.reduce((sum, deal) => sum + deal.amount, 0)
  }

  /**
   * Calculate pipeline coverage (pipeline value / target)
   */
  private calculatePipelineCoverage(pipelineValue: number, target: number | null): number {
    if (!target || target === 0) return 0
    return (pipelineValue / target) * 100
  }
}
