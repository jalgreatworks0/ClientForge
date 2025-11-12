/**
 * Analytics API Routes (Simplified)
 * Direct SQL aggregations for reporting dashboard
 */

import { Router, Request, Response } from 'express'

import { authenticate } from '../../../../middleware/authenticate'
import { db } from '../../../../database/postgresql/pool'
import { logger } from '../../../../utils/logging/logger'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/v1/analytics/revenue-metrics
 * Get revenue metrics with period comparison
 */
router.get('/revenue-metrics', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId
    const { startDate, endDate, comparisonStartDate, comparisonEndDate } = req.query

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate as string) : new Date()

    // Current period metrics
    const currentResult = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE is_won = true) as won_deals,
        SUM(amount) FILTER (WHERE is_won = true) as total_revenue,
        AVG(amount) FILTER (WHERE is_won = true) as average_deal_size,
        SUM(amount * (probability / 100.0)) FILTER (WHERE is_closed = false) as forecasted_revenue
       FROM deals
       WHERE tenantId = $1
         AND created_at >= $2
         AND created_at <= $3
         AND deleted_at IS NULL`,
      [tenantId, start, end]
    )

    const current = currentResult.rows[0]
    let periodComparison = { revenue: 0, percentChange: 0 }

    // Comparison period if provided
    if (comparisonStartDate && comparisonEndDate) {
      const compStart = new Date(comparisonStartDate as string)
      const compEnd = new Date(comparisonEndDate as string)

      const comparisonResult = await db.query(
        `SELECT SUM(amount) FILTER (WHERE is_won = true) as total_revenue
         FROM deals
         WHERE tenantId = $1
           AND created_at >= $2
           AND created_at <= $3
           AND deleted_at IS NULL`,
        [tenantId, compStart, compEnd]
      )

      const comparisonRevenue = parseFloat(comparisonResult.rows[0].total_revenue || '0')
      const currentRevenue = parseFloat(current.total_revenue || '0')

      periodComparison = {
        revenue: comparisonRevenue,
        percentChange:
          comparisonRevenue > 0 ? ((currentRevenue - comparisonRevenue) / comparisonRevenue) * 100 : 0,
      }
    }

    logger.info('[Analytics] Revenue metrics fetched', { tenantId })

    res.json({
      success: true,
      data: {
        totalRevenue: parseFloat(current.total_revenue || '0'),
        wonDeals: parseInt(current.won_deals || '0'),
        averageDealSize: parseFloat(current.average_deal_size || '0'),
        forecastedRevenue: parseFloat(current.forecasted_revenue || '0'),
        periodComparison,
      },
    })
  } catch (error: any) {
    logger.error('[Analytics] Failed to get revenue metrics', { error: error.message })
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue metrics',
      error: error.message,
    })
  }
})

/**
 * GET /api/v1/analytics/sales-funnel
 * Get sales funnel data by stage
 */
router.get('/sales-funnel', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId
    const { pipelineId } = req.query

    const query = `
      SELECT
        ds.id as stage_id,
        ds.name as stage,
        ds.display_order,
        ds.probability as average_probability,
        COUNT(d.id) as deal_count,
        COALESCE(SUM(d.amount), 0) as total_value
      FROM deal_stages ds
      LEFT JOIN deals d ON d.stage_id = ds.id
        AND d.tenantId = $1
        AND d.deleted_at IS NULL
        ${pipelineId ? 'AND d.pipeline_id = $2' : ''}
      WHERE ds.deleted_at IS NULL
        ${pipelineId ? 'AND ds.pipeline_id = $2' : ''}
      GROUP BY ds.id, ds.name, ds.display_order, ds.probability
      ORDER BY ds.display_order
    `

    const params = pipelineId ? [tenantId, pipelineId] : [tenantId]
    const result = await db.query(query, params)

    const funnelData = result.rows.map((row) => ({
      stage: row.stage,
      stageId: row.stage_id,
      dealCount: parseInt(row.deal_count),
      totalValue: parseFloat(row.total_value),
      averageProbability: parseFloat(row.average_probability || '0'),
    }))

    logger.info('[Analytics] Sales funnel data fetched', { tenantId, stages: funnelData.length })

    res.json({
      success: true,
      data: funnelData,
    })
  } catch (error: any) {
    logger.error('[Analytics] Failed to get sales funnel data', { error: error.message })
    res.status(500).json({
      success: false,
      message: 'Failed to get sales funnel data',
      error: error.message,
    })
  }
})

/**
 * GET /api/v1/analytics/team-performance
 * Get team performance metrics
 */
router.get('/team-performance', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId
    const { startDate, endDate } = req.query

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate as string) : new Date()

    const result = await db.query(
      `SELECT
        u.id as user_id,
        u.first_name || ' ' || u.last_name as user_name,
        COUNT(*) FILTER (WHERE d.is_won = true) as deals_won,
        COUNT(*) FILTER (WHERE d.is_closed = true AND d.is_won = false) as deals_lost,
        COALESCE(SUM(d.amount) FILTER (WHERE d.is_closed = false), 0) as pipeline_value,
        ROUND(
          (COUNT(*) FILTER (WHERE d.is_won = true)::numeric /
           NULLIF(COUNT(*) FILTER (WHERE d.is_closed = true), 0)) * 100,
          2
        ) as conversion_rate,
        AVG(d.amount) FILTER (WHERE d.is_won = true) as average_deal_size
       FROM users u
       LEFT JOIN deals d ON d.owner_id = u.id
         AND d.created_at >= $2
         AND d.created_at <= $3
         AND d.deleted_at IS NULL
       WHERE u.tenantId = $1
         AND u.is_active = true
       GROUP BY u.id, u.first_name, u.last_name
       HAVING COUNT(d.id) > 0
       ORDER BY deals_won DESC, pipeline_value DESC`,
      [tenantId, start, end]
    )

    const teamPerformance = result.rows.map((row) => ({
      userId: row.user_id,
      userName: row.user_name,
      dealsWon: parseInt(row.deals_won || '0'),
      dealsLost: parseInt(row.deals_lost || '0'),
      pipelineValue: parseFloat(row.pipeline_value || '0'),
      conversionRate: parseFloat(row.conversion_rate || '0'),
      averageDealSize: parseFloat(row.average_deal_size || '0'),
    }))

    logger.info('[Analytics] Team performance fetched', { tenantId, teamSize: teamPerformance.length })

    res.json({
      success: true,
      data: teamPerformance,
    })
  } catch (error: any) {
    logger.error('[Analytics] Failed to get team performance', { error: error.message })
    res.status(500).json({
      success: false,
      message: 'Failed to get team performance',
      error: error.message,
    })
  }
})

/**
 * GET /api/v1/analytics/revenue-trend
 * Get revenue trend over time
 */
router.get('/revenue-trend', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId
    const { startDate, endDate, granularity = 'month' } = req.query

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate as string) : new Date()

    const dateFormat = granularity === 'day' ? 'YYYY-MM-DD' : granularity === 'week' ? 'IYYY-IW' : 'YYYY-MM'

    const result = await db.query(
      `SELECT
        TO_CHAR(actual_close_date, $4) as date,
        COALESCE(SUM(amount), 0) as revenue,
        COUNT(*) as deal_count
       FROM deals
       WHERE tenantId = $1
         AND is_won = true
         AND actual_close_date >= $2
         AND actual_close_date <= $3
         AND deleted_at IS NULL
       GROUP BY date
       ORDER BY date`,
      [tenantId, start, end, dateFormat]
    )

    const trendData = result.rows.map((row) => ({
      date: row.date,
      revenue: parseFloat(row.revenue),
      dealCount: parseInt(row.deal_count),
    }))

    logger.info('[Analytics] Revenue trend fetched', { tenantId, dataPoints: trendData.length })

    res.json({
      success: true,
      data: trendData,
    })
  } catch (error: any) {
    logger.error('[Analytics] Failed to get revenue trend', { error: error.message })
    res.status(500).json({
      success: false,
      message: 'Failed to get revenue trend',
      error: error.message,
    })
  }
})

/**
 * GET /api/v1/analytics/lead-sources
 * Get lead source analysis
 */
router.get('/lead-sources', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId
    const { startDate, endDate } = req.query

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate as string) : new Date()

    const result = await db.query(
      `SELECT
        COALESCE(lead_source, 'Unknown') as source,
        COUNT(*) as lead_count,
        COUNT(*) FILTER (WHERE is_won = true) as won_count,
        COALESCE(SUM(amount) FILTER (WHERE is_won = true), 0) as total_revenue,
        ROUND(
          (COUNT(*) FILTER (WHERE is_won = true)::numeric /
           NULLIF(COUNT(*), 0)) * 100,
          2
        ) as conversion_rate
       FROM deals
       WHERE tenantId = $1
         AND created_at >= $2
         AND created_at <= $3
         AND deleted_at IS NULL
       GROUP BY lead_source
       ORDER BY total_revenue DESC`,
      [tenantId, start, end]
    )

    const leadSources = result.rows.map((row) => ({
      source: row.source,
      leadCount: parseInt(row.lead_count),
      wonCount: parseInt(row.won_count || '0'),
      totalRevenue: parseFloat(row.total_revenue),
      conversionRate: parseFloat(row.conversion_rate || '0'),
    }))

    logger.info('[Analytics] Lead sources fetched', { tenantId, sources: leadSources.length })

    res.json({
      success: true,
      data: leadSources,
    })
  } catch (error: any) {
    logger.error('[Analytics] Failed to get lead sources', { error: error.message })
    res.status(500).json({
      success: false,
      message: 'Failed to get lead sources',
      error: error.message,
    })
  }
})

/**
 * GET /api/v1/analytics/pipeline-health
 * Get pipeline health metrics
 */
router.get('/pipeline-health', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId
    const { pipelineId } = req.query

    const query = `
      SELECT
        COUNT(*) as total_deals,
        COALESCE(SUM(amount), 0) as total_value,
        ROUND(AVG(EXTRACT(DAY FROM (NOW() - created_at)))) as average_age,
        COUNT(*) FILTER (WHERE EXTRACT(DAY FROM (NOW() - updated_at)) > 30) as stale_deals,
        COUNT(*) FILTER (WHERE expected_close_date <= NOW() + INTERVAL '7 days'
                          AND expected_close_date >= NOW()
                          AND is_closed = false) as hot_deals
      FROM deals
      WHERE tenantId = $1
        ${pipelineId ? 'AND pipeline_id = $2' : ''}
        AND is_closed = false
        AND deleted_at IS NULL
    `

    const params = pipelineId ? [tenantId, pipelineId] : [tenantId]
    const result = await db.query(query, params)
    const row = result.rows[0]

    const healthMetrics = {
      totalDeals: parseInt(row.total_deals || '0'),
      totalValue: parseFloat(row.total_value || '0'),
      averageAge: parseInt(row.average_age || '0'),
      staleDeals: parseInt(row.stale_deals || '0'),
      hotDeals: parseInt(row.hot_deals || '0'),
    }

    logger.info('[Analytics] Pipeline health fetched', { tenantId, totalDeals: healthMetrics.totalDeals })

    res.json({
      success: true,
      data: healthMetrics,
    })
  } catch (error: any) {
    logger.error('[Analytics] Failed to get pipeline health', { error: error.message })
    res.status(500).json({
      success: false,
      message: 'Failed to get pipeline health',
      error: error.message,
    })
  }
})

export default router
