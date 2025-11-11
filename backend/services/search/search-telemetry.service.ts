/**
 * Search Telemetry Service
 * Tracks search queries, results, and user behavior for analytics and improvements
 */

import { Pool } from 'pg'
import { logger } from '../../utils/logging/logger'

export interface SearchTelemetryEvent {
  tenantId: string
  userId: string
  query: string
  type?: string // 'contacts', 'accounts', 'deals', 'all'
  resultCount: number
  responseTime: number // milliseconds
  clicked?: boolean
  clickedId?: string
  clickedIndex?: number
}

export interface SearchAnalytics {
  totalSearches: number
  uniqueQueries: number
  avgResultCount: number
  avgResponseTime: number
  topQueries: Array<{
    query: string
    count: number
    avgResults: number
  }>
  zeroResultQueries: Array<{
    query: string
    count: number
  }>
  clickThroughRate: number
}

export class SearchTelemetryService {
  private pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  /**
   * Track a search query
   */
  async trackSearch(event: SearchTelemetryEvent): Promise<void> {
    try {
      await this.pool.query(
        `
        INSERT INTO search_telemetry (
          tenant_id,
          user_id,
          query,
          query_lowercase,
          type,
          result_count,
          response_time_ms,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `,
        [
          event.tenantId,
          event.userId,
          event.query,
          event.query.toLowerCase(),
          event.type || 'all',
          event.resultCount,
          event.responseTime,
        ]
      )

      logger.debug('Search tracked', {
        tenantId: event.tenantId,
        query: event.query,
        results: event.resultCount,
      })
    } catch (error) {
      logger.error('Failed to track search', { error, event })
    }
  }

  /**
   * Track a click on search result
   */
  async trackClick(
    tenantId: string,
    userId: string,
    query: string,
    clickedId: string,
    clickedIndex: number
  ): Promise<void> {
    try {
      await this.pool.query(
        `
        UPDATE search_telemetry
        SET clicked = true,
            clicked_id = $1,
            clicked_index = $2,
            clicked_at = NOW()
        WHERE tenant_id = $3
          AND user_id = $4
          AND query_lowercase = $5
          AND created_at >= NOW() - INTERVAL '1 hour'
          AND clicked IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [clickedId, clickedIndex, tenantId, userId, query.toLowerCase()]
      )

      logger.debug('Search click tracked', {
        tenantId,
        query,
        clickedId,
        clickedIndex,
      })
    } catch (error) {
      logger.error('Failed to track click', { error, tenantId, query })
    }
  }

  /**
   * Get search analytics for a tenant
   */
  async getAnalytics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<SearchAnalytics> {
    try {
      const dateFilter = this.buildDateFilter(startDate, endDate)

      // Get overall stats
      const statsResult = await this.pool.query(
        `
        SELECT
          COUNT(*) as total_searches,
          COUNT(DISTINCT query_lowercase) as unique_queries,
          ROUND(AVG(result_count), 2) as avg_result_count,
          ROUND(AVG(response_time_ms), 2) as avg_response_time,
          ROUND(
            100.0 * COUNT(CASE WHEN clicked = true THEN 1 END) / NULLIF(COUNT(*), 0),
            2
          ) as click_through_rate
        FROM search_telemetry
        WHERE tenant_id = $1
          ${dateFilter}
        `,
        [tenantId]
      )

      const stats = statsResult.rows[0]

      // Get top queries
      const topQueriesResult = await this.pool.query(
        `
        SELECT
          query_lowercase as query,
          COUNT(*) as count,
          ROUND(AVG(result_count), 2) as avg_results
        FROM search_telemetry
        WHERE tenant_id = $1
          ${dateFilter}
        GROUP BY query_lowercase
        ORDER BY count DESC
        LIMIT 10
        `,
        [tenantId]
      )

      // Get zero-result queries
      const zeroResultResult = await this.pool.query(
        `
        SELECT
          query_lowercase as query,
          COUNT(*) as count
        FROM search_telemetry
        WHERE tenant_id = $1
          AND result_count = 0
          ${dateFilter}
        GROUP BY query_lowercase
        ORDER BY count DESC
        LIMIT 10
        `,
        [tenantId]
      )

      return {
        totalSearches: parseInt(stats.total_searches, 10),
        uniqueQueries: parseInt(stats.unique_queries, 10),
        avgResultCount: parseFloat(stats.avg_result_count) || 0,
        avgResponseTime: parseFloat(stats.avg_response_time) || 0,
        topQueries: topQueriesResult.rows.map((row) => ({
          query: row.query,
          count: parseInt(row.count, 10),
          avgResults: parseFloat(row.avg_results),
        })),
        zeroResultQueries: zeroResultResult.rows.map((row) => ({
          query: row.query,
          count: parseInt(row.count, 10),
        })),
        clickThroughRate: parseFloat(stats.click_through_rate) || 0,
      }
    } catch (error) {
      logger.error('Failed to get search analytics', { error, tenantId })
      throw error
    }
  }

  /**
   * Get zero-result queries for synonym suggestions
   */
  async getZeroResultQueries(
    tenantId: string,
    limit: number = 50
  ): Promise<Array<{ query: string; count: number }>> {
    try {
      const result = await this.pool.query(
        `
        SELECT
          query_lowercase as query,
          COUNT(*) as count
        FROM search_telemetry
        WHERE tenant_id = $1
          AND result_count = 0
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY query_lowercase
        HAVING COUNT(*) >= 3
        ORDER BY count DESC
        LIMIT $2
        `,
        [tenantId, limit]
      )

      return result.rows.map((row) => ({
        query: row.query,
        count: parseInt(row.count, 10),
      }))
    } catch (error) {
      logger.error('Failed to get zero-result queries', { error, tenantId })
      return []
    }
  }

  /**
   * Build date filter for queries
   */
  private buildDateFilter(startDate?: Date, endDate?: Date): string {
    const filters = []

    if (startDate) {
      filters.push(`AND created_at >= '${startDate.toISOString()}'`)
    }

    if (endDate) {
      filters.push(`AND created_at <= '${endDate.toISOString()}'`)
    }

    return filters.join(' ')
  }
}
