/**
 * Analytics Repository
 * Database queries for analytics and metrics
 */

import { Pool } from 'pg'

import { logger } from '../../utils/logging/logger'

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
  TimeSeriesData,
} from './analytics-types'

export class AnalyticsRepository {
  constructor(private pool: Pool) {}

  /**
   * Get Dashboard Metrics
   * High-level overview metrics for dashboard
   */
  async getDashboardMetrics(
    tenantId: string,
    filters?: AnalyticsFilters
  ): Promise<DashboardMetrics> {
    const { startDate, endDate, ownerId } = filters || {}

    try {
      // Build dynamic where clauses
      const contactsWhere = this.buildWhereClause('contacts', tenantId, filters)
      const dealsWhere = this.buildWhereClause('deals', tenantId, filters)
      const tasksWhere = this.buildWhereClause('tasks', tenantId, filters)

      // Query for current period
      const query = `
        WITH current_metrics AS (
          SELECT
            (SELECT COUNT(*) FROM contacts WHERE ${contactsWhere}) as total_contacts,
            (SELECT COUNT(*) FROM deals WHERE ${dealsWhere}) as total_deals,
            (SELECT COUNT(*) FROM tasks WHERE ${tasksWhere}) as total_tasks,
            (SELECT COALESCE(SUM(amount), 0) FROM deals WHERE ${dealsWhere} AND is_won = true) as total_revenue,
            (SELECT COUNT(*) FROM deals WHERE ${dealsWhere} AND is_won IS NULL) as active_deals,
            (SELECT COUNT(*) FROM tasks WHERE ${tasksWhere} AND status = 'pending') as pending_tasks,
            (SELECT COUNT(*) FROM tasks WHERE ${tasksWhere} AND status != 'completed' AND due_date < NOW()) as overdue_tasks,
            (SELECT COUNT(*) FROM deals WHERE ${dealsWhere} AND is_won IS NULL AND expected_close_date BETWEEN NOW() AND NOW() + INTERVAL '7 days') as deals_closing_soon
        ),
        previous_metrics AS (
          SELECT
            (SELECT COUNT(*) FROM contacts WHERE tenantId = $1 AND created_at < $2 ${ownerId ? 'AND owner_id = $3' : ''}) as prev_contacts,
            (SELECT COUNT(*) FROM deals WHERE tenantId = $1 AND created_at < $2 ${ownerId ? 'AND owner_id = $3' : ''}) as prev_deals,
            (SELECT COUNT(*) FROM tasks WHERE tenantId = $1 AND created_at < $2 ${ownerId ? 'AND assigned_to = $3' : ''}) as prev_tasks,
            (SELECT COALESCE(SUM(amount), 0) FROM deals WHERE tenantId = $1 AND actual_close_date < $2 ${ownerId ? 'AND owner_id = $3' : ''} AND is_won = true) as prev_revenue
        )
        SELECT
          cm.*,
          pm.*,
          CASE WHEN pm.prev_contacts > 0 THEN ROUND(((cm.total_contacts - pm.prev_contacts)::numeric / pm.prev_contacts) * 100, 2) ELSE 0 END as contacts_change,
          CASE WHEN pm.prev_deals > 0 THEN ROUND(((cm.total_deals - pm.prev_deals)::numeric / pm.prev_deals) * 100, 2) ELSE 0 END as deals_change,
          CASE WHEN pm.prev_tasks > 0 THEN ROUND(((cm.total_tasks - pm.prev_tasks)::numeric / pm.prev_tasks) * 100, 2) ELSE 0 END as tasks_change,
          CASE WHEN pm.prev_revenue > 0 THEN ROUND(((cm.total_revenue - pm.prev_revenue)::numeric / pm.prev_revenue) * 100, 2) ELSE 0 END as revenue_change
        FROM current_metrics cm, previous_metrics pm
      `

      const params = ownerId
        ? [tenantId, startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), ownerId]
        : [tenantId, startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]

      const result = await this.pool.query(query, params)
      const row = result.rows[0]

      return {
        totalContacts: parseInt(row.total_contacts),
        totalDeals: parseInt(row.total_deals),
        totalTasks: parseInt(row.total_tasks),
        totalRevenue: parseFloat(row.total_revenue),
        contactsChange: parseFloat(row.contacts_change),
        dealsChange: parseFloat(row.deals_change),
        tasksChange: parseFloat(row.tasks_change),
        revenueChange: parseFloat(row.revenue_change),
        activeDeals: parseInt(row.active_deals),
        pendingTasks: parseInt(row.pending_tasks),
        overdueTasks: parseInt(row.overdue_tasks),
        dealsClosingSoon: parseInt(row.deals_closing_soon),
      }
    } catch (error) {
      logger.error('Error fetching dashboard metrics', { error, tenantId })
      throw error
    }
  }

  /**
   * Get Contact Analytics
   * Detailed analytics about contacts/leads
   */
  async getContactAnalytics(
    tenantId: string,
    filters?: AnalyticsFilters
  ): Promise<ContactAnalytics> {
    try {
      const where = this.buildWhereClause('contacts', tenantId, filters)

      const query = `
        WITH contact_stats AS (
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE is_active = true) as active,
            COUNT(*) FILTER (WHERE is_active = false) as inactive,
            -- By Lead Status
            COUNT(*) FILTER (WHERE lead_status = 'new') as status_new,
            COUNT(*) FILTER (WHERE lead_status = 'contacted') as status_contacted,
            COUNT(*) FILTER (WHERE lead_status = 'qualified') as status_qualified,
            COUNT(*) FILTER (WHERE lead_status = 'unqualified') as status_unqualified,
            -- Note: lifecycle_stage column doesn't exist in current schema
            -- Using lead_status as fallback for lifecycle stages
            COUNT(*) FILTER (WHERE lead_status = 'new') as stage_lead,
            0 as stage_mql,
            0 as stage_sql,
            COUNT(*) FILTER (WHERE lead_status = 'qualified') as stage_opportunity,
            0 as stage_customer,
            0 as stage_evangelist,
            COUNT(*) FILTER (WHERE lead_status NOT IN ('new', 'contacted', 'qualified', 'unqualified')) as stage_other,
            -- Scoring
            AVG(lead_score) as avg_lead_score,
            COUNT(*) FILTER (WHERE lead_score > 75) as high_value_leads,
            -- Activity
            -- Note: last_contacted_at column doesn't exist in current schema, using updated_at as proxy
            COUNT(*) FILTER (WHERE updated_at > NOW() - INTERVAL '30 days') as contacted_last_30_days,
            COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) as new_this_month,
            COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') AND created_at < DATE_TRUNC('month', NOW())) as new_last_month,
            -- Conversion
            COUNT(*) FILTER (WHERE lead_status IN ('new', 'contacted')) as leads_count,
            COUNT(*) FILTER (WHERE lead_status = 'qualified') as customers_count
          FROM contacts
          WHERE ${where}
        )
        SELECT
          *,
          CASE WHEN leads_count > 0 THEN ROUND((customers_count::numeric / leads_count) * 100, 2) ELSE 0 END as conversion_rate
        FROM contact_stats
      `

      const params = this.buildParams(tenantId, filters)
      const result = await this.pool.query(query, params)
      const row = result.rows[0]

      return {
        totalContacts: parseInt(row.total),
        activeContacts: parseInt(row.active),
        inactiveContacts: parseInt(row.inactive),
        byLeadStatus: {
          new: parseInt(row.status_new),
          contacted: parseInt(row.status_contacted),
          qualified: parseInt(row.status_qualified),
          unqualified: parseInt(row.status_unqualified),
        },
        byLifecycleStage: {
          lead: parseInt(row.stage_lead),
          mql: parseInt(row.stage_mql),
          sql: parseInt(row.stage_sql),
          opportunity: parseInt(row.stage_opportunity),
          customer: parseInt(row.stage_customer),
          evangelist: parseInt(row.stage_evangelist),
          other: parseInt(row.stage_other),
        },
        averageLeadScore: parseFloat(row.avg_lead_score || 0),
        highValueLeads: parseInt(row.high_value_leads),
        contactedLast30Days: parseInt(row.contacted_last_30_days),
        newContactsThisMonth: parseInt(row.new_this_month),
        newContactsLastMonth: parseInt(row.new_last_month),
        conversionRate: parseFloat(row.conversion_rate),
      }
    } catch (error) {
      logger.error('Error fetching contact analytics', { error, tenantId })
      throw error
    }
  }

  /**
   * Get Deal Analytics
   * Detailed analytics about deals and revenue
   */
  async getDealAnalytics(
    tenantId: string,
    filters?: AnalyticsFilters
  ): Promise<DealAnalytics> {
    try {
      const where = this.buildWhereClause('deals', tenantId, filters)

      const query = `
        WITH deal_stats AS (
          SELECT
            COUNT(*) as total,
            -- Note: is_closed column doesn't exist, using is_won IS NULL for open deals
            COUNT(*) FILTER (WHERE is_won IS NULL) as open_deals,
            COUNT(*) FILTER (WHERE is_won IS NOT NULL) as closed_deals,
            COUNT(*) FILTER (WHERE is_won = true) as won_deals,
            COUNT(*) FILTER (WHERE is_won = false) as lost_deals,
            -- Revenue
            COALESCE(SUM(amount), 0) as total_revenue,
            COALESCE(SUM(amount) FILTER (WHERE is_won = true), 0) as won_revenue,
            COALESCE(SUM(amount) FILTER (WHERE is_won = false), 0) as lost_revenue,
            -- Note: weighted_amount doesn't exist, calculating as amount * probability/100
            COALESCE(SUM(amount * (probability / 100.0)) FILTER (WHERE is_won IS NULL), 0) as projected_revenue,
            COALESCE(AVG(amount), 0) as avg_deal_size,
            -- Performance
            CASE WHEN COUNT(*) FILTER (WHERE is_won IS NOT NULL) > 0
              THEN ROUND((COUNT(*) FILTER (WHERE is_won = true)::numeric / COUNT(*) FILTER (WHERE is_won IS NOT NULL)) * 100, 2)
              ELSE 0
            END as win_rate,
            AVG(EXTRACT(EPOCH FROM (actual_close_date - created_at)) / 86400) FILTER (WHERE is_won IS NOT NULL) as avg_sales_cycle,
            -- Note: days_in_stage doesn't exist, calculating from updated_at
            AVG(EXTRACT(DAY FROM (NOW() - updated_at))) as avg_days_in_stage,
            -- Pipeline Health
            COUNT(*) FILTER (WHERE is_won IS NULL AND updated_at < NOW() - INTERVAL '30 days') as stale_deals,
            COUNT(*) FILTER (WHERE is_won IS NULL AND expected_close_date BETWEEN DATE_TRUNC('month', NOW()) AND DATE_TRUNC('month', NOW()) + INTERVAL '1 month') as closing_this_month,
            COUNT(*) FILTER (WHERE is_won IS NULL AND expected_close_date BETWEEN DATE_TRUNC('month', NOW()) + INTERVAL '1 month' AND DATE_TRUNC('month', NOW()) + INTERVAL '2 months') as closing_next_month
          FROM deals
          WHERE ${where}
        )
        SELECT * FROM deal_stats
      `

      const params = this.buildParams(tenantId, filters)
      const result = await this.pool.query(query, params)
      const row = result.rows[0]

      // Get by-stage breakdown
      // Note: No deal_stages table, grouping by stage VARCHAR column
      const stageQuery = `
        SELECT
          stage as stage_name,
          COUNT(id) as deal_count,
          COALESCE(SUM(amount), 0) as total_value,
          COALESCE(SUM(amount * (probability / 100.0)), 0) as weighted_value
        FROM deals
        WHERE tenantId = $1
        GROUP BY stage
        ORDER BY stage
      `
      const stageResult = await this.pool.query(stageQuery, [tenantId])

      // Get top deals
      const topDealsQuery = `
        SELECT
          id,
          name,
          amount,
          probability,
          (amount * (probability / 100.0)) as weighted_amount,
          stage as stage_name,
          expected_close_date
        FROM deals
        WHERE ${where} AND is_won IS NULL
        ORDER BY (amount * (probability / 100.0)) DESC NULLS LAST
        LIMIT 10
      `
      const topDealsResult = await this.pool.query(topDealsQuery, params)

      // Get at-risk deals (stale deals)
      const atRiskQuery = `
        SELECT
          id,
          name,
          amount,
          stage as stage_name,
          EXTRACT(DAY FROM (NOW() - updated_at))::integer as days_in_stage,
          updated_at as last_updated
        FROM deals
        WHERE ${where} AND is_won IS NULL AND updated_at < NOW() - INTERVAL '30 days'
        ORDER BY updated_at ASC
        LIMIT 10
      `
      const atRiskResult = await this.pool.query(atRiskQuery, params)

      return {
        totalDeals: parseInt(row.total),
        openDeals: parseInt(row.open_deals),
        closedDeals: parseInt(row.closed_deals),
        wonDeals: parseInt(row.won_deals),
        lostDeals: parseInt(row.lost_deals),
        totalRevenue: parseFloat(row.total_revenue),
        wonRevenue: parseFloat(row.won_revenue),
        lostRevenue: parseFloat(row.lost_revenue),
        projectedRevenue: parseFloat(row.projected_revenue),
        averageDealSize: parseFloat(row.avg_deal_size),
        winRate: parseFloat(row.win_rate),
        averageSalesCycle: parseFloat(row.avg_sales_cycle || 0),
        averageDaysInStage: parseFloat(row.avg_days_in_stage || 0),
        pipelineCoverage: 0, // TODO: Calculate based on target
        staleDealCount: parseInt(row.stale_deals),
        dealsClosingThisMonth: parseInt(row.closing_this_month),
        dealsClosingNextMonth: parseInt(row.closing_next_month),
        byStage: stageResult.rows.map((s) => ({
          stageId: s.stage_name, // Note: No stage_id, using stage name as ID
          stageName: s.stage_name,
          dealCount: parseInt(s.deal_count),
          totalValue: parseFloat(s.total_value),
          weightedValue: parseFloat(s.weighted_value),
        })),
        byPipeline: [], // TODO: Implement pipeline breakdown
        byOwner: [], // TODO: Implement owner breakdown
        topDeals: topDealsResult.rows.map((d) => ({
          id: d.id,
          name: d.name,
          amount: parseFloat(d.amount),
          probability: parseInt(d.probability),
          weightedAmount: parseFloat(d.weighted_amount),
          stageName: d.stage_name,
          expectedCloseDate: d.expected_close_date,
        })),
        atRiskDeals: atRiskResult.rows.map((d) => ({
          id: d.id,
          name: d.name,
          amount: parseFloat(d.amount),
          stageName: d.stage_name,
          daysInStage: parseInt(d.days_in_stage),
          lastUpdated: new Date(d.last_updated),
        })),
      }
    } catch (error) {
      logger.error('Error fetching deal analytics', { error, tenantId })
      throw error
    }
  }

  /**
   * Get Task Analytics
   * Task completion metrics and assignee performance
   */
  async getTaskAnalytics(
    tenantId: string,
    filters?: AnalyticsFilters
  ): Promise<TaskAnalytics> {
    try {
      const where = this.buildWhereClause('tasks', tenantId, filters)

      const query = `
        WITH task_stats AS (
          SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'pending') as pending,
            COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
            COUNT(*) FILTER (WHERE status = 'completed') as completed,
            COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
            COUNT(*) FILTER (WHERE status != 'completed' AND due_date < NOW()) as overdue,
            -- Due Soon
            COUNT(*) FILTER (WHERE status != 'completed' AND due_date::date = CURRENT_DATE) as due_today,
            COUNT(*) FILTER (WHERE status != 'completed' AND due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days') as due_this_week,
            COUNT(*) FILTER (WHERE status != 'completed' AND due_date BETWEEN NOW() AND NOW() + INTERVAL '30 days') as due_this_month,
            -- By Priority
            COUNT(*) FILTER (WHERE priority = 'low' AND status != 'completed') as priority_low,
            COUNT(*) FILTER (WHERE priority = 'medium' AND status != 'completed') as priority_medium,
            COUNT(*) FILTER (WHERE priority = 'high' AND status != 'completed') as priority_high,
            COUNT(*) FILTER (WHERE priority = 'urgent' AND status != 'completed') as priority_urgent,
            -- Performance
            CASE WHEN COUNT(*) > 0
              THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric / COUNT(*)) * 100, 2)
              ELSE 0
            END as completion_rate,
            AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 3600) FILTER (WHERE status = 'completed') as avg_completion_time,
            CASE WHEN COUNT(*) FILTER (WHERE status = 'completed') > 0
              THEN ROUND((COUNT(*) FILTER (WHERE status = 'completed' AND completed_at <= due_date)::numeric / COUNT(*) FILTER (WHERE status = 'completed')) * 100, 2)
              ELSE 0
            END as on_time_completion_rate
          FROM tasks
          WHERE ${where}
        )
        SELECT * FROM task_stats
      `

      const params = this.buildParams(tenantId, filters)
      const result = await this.pool.query(query, params)
      const row = result.rows[0]

      // Get by-assignee breakdown
      const assigneeQuery = `
        SELECT
          u.id as user_id,
          u.first_name || ' ' || u.last_name as user_name,
          COUNT(*) FILTER (WHERE t.status = 'pending') as pending_count,
          COUNT(*) FILTER (WHERE t.status = 'completed') as completed_count,
          COUNT(*) FILTER (WHERE t.status != 'completed' AND t.due_date < NOW()) as overdue_count,
          CASE WHEN COUNT(*) > 0
            THEN ROUND((COUNT(*) FILTER (WHERE t.status = 'completed')::numeric / COUNT(*)) * 100, 2)
            ELSE 0
          END as completion_rate
        FROM users u
        LEFT JOIN tasks t ON u.id = t.assigned_to AND t.tenantId = $1
        WHERE u.tenantId = $1
        GROUP BY u.id, u.first_name, u.last_name
        HAVING COUNT(*) > 0
        ORDER BY completion_rate DESC
        LIMIT 10
      `
      const assigneeResult = await this.pool.query(assigneeQuery, [tenantId])

      return {
        totalTasks: parseInt(row.total),
        pendingTasks: parseInt(row.pending),
        inProgressTasks: parseInt(row.in_progress),
        completedTasks: parseInt(row.completed),
        cancelledTasks: parseInt(row.cancelled),
        overdueTasks: parseInt(row.overdue),
        dueTodayTasks: parseInt(row.due_today),
        dueThisWeekTasks: parseInt(row.due_this_week),
        dueThisMonthTasks: parseInt(row.due_this_month),
        byPriority: {
          low: parseInt(row.priority_low),
          medium: parseInt(row.priority_medium),
          high: parseInt(row.priority_high),
          urgent: parseInt(row.priority_urgent),
        },
        byAssignee: assigneeResult.rows.map((a) => ({
          userId: a.user_id,
          userName: a.user_name,
          pendingCount: parseInt(a.pending_count),
          completedCount: parseInt(a.completed_count),
          overdueCount: parseInt(a.overdue_count),
          completionRate: parseFloat(a.completion_rate),
        })),
        completionRate: parseFloat(row.completion_rate),
        averageCompletionTime: parseFloat(row.avg_completion_time),
        onTimeCompletionRate: parseFloat(row.on_time_completion_rate),
      }
    } catch (error) {
      logger.error('Error fetching task analytics', { error, tenantId })
      throw error
    }
  }

  /**
   * Build WHERE clause for queries
   */
  private buildWhereClause(
    table: string,
    tenantId: string,
    filters?: AnalyticsFilters
  ): string {
    // Note: deleted_at column doesn't exist in current schema, removed soft delete check
    let where = `${table}.tenantId = $1`

    if (filters?.ownerId) {
      where += ` AND ${table === 'tasks' ? 'assigned_to' : 'owner_id'} = $${filters?.ownerId ? 3 : 2}`
    }

    if (filters?.startDate) {
      where += ` AND ${table}.created_at >= $${filters?.ownerId ? 2 : 2}`
    }

    if (filters?.endDate) {
      where += ` AND ${table}.created_at <= $${filters?.ownerId ? (filters?.startDate ? 4 : 3) : (filters?.startDate ? 3 : 2)}`
    }

    return where
  }

  /**
   * Build params array for queries
   */
  private buildParams(tenantId: string, filters?: AnalyticsFilters): any[] {
    const params: any[] = [tenantId]

    if (filters?.startDate) {
      params.push(filters.startDate)
    }

    if (filters?.ownerId) {
      params.push(filters.ownerId)
    }

    if (filters?.endDate) {
      params.push(filters.endDate)
    }

    return params
  }
}
