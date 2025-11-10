/**
 * Analytics API Service
 * Functions to call analytics endpoints
 */

import { api } from '../lib/api'
import type {
  DashboardMetrics,
  ContactAnalytics,
  DealAnalytics,
  TaskAnalytics,
  ActivityAnalytics,
  TeamPerformance,
  RevenueForecast,
  SalesPipelineAnalytics,
  AnalyticsFilters,
} from '../types/analytics'

// =====================================================
// API BASE URL
// =====================================================

const ANALYTICS_BASE = '/v1/analytics'

// =====================================================
// DASHBOARD METRICS
// =====================================================

/**
 * Get high-level dashboard metrics
 * @param filters Optional date range, owner, etc.
 * @returns Dashboard metrics with trends
 */
export async function getDashboardMetrics(
  filters?: AnalyticsFilters
): Promise<DashboardMetrics> {
  const response = await api.get<{ success: boolean; data: DashboardMetrics }>(
    `${ANALYTICS_BASE}/dashboard`,
    { params: filters }
  )
  return response.data.data
}

// =====================================================
// CONTACT ANALYTICS
// =====================================================

/**
 * Get detailed contact analytics and lead scoring
 * @param filters Optional date range, owner, etc.
 * @returns Contact analytics breakdown
 */
export async function getContactAnalytics(
  filters?: AnalyticsFilters
): Promise<ContactAnalytics> {
  const response = await api.get<{ success: boolean; data: ContactAnalytics }>(
    `${ANALYTICS_BASE}/contacts`,
    { params: filters }
  )
  return response.data.data
}

// =====================================================
// DEAL ANALYTICS
// =====================================================

/**
 * Get deal analytics and revenue metrics
 * @param filters Optional date range, owner, pipeline, etc.
 * @returns Deal analytics with pipeline breakdowns
 */
export async function getDealAnalytics(
  filters?: AnalyticsFilters
): Promise<DealAnalytics> {
  const response = await api.get<{ success: boolean; data: DealAnalytics }>(
    `${ANALYTICS_BASE}/deals`,
    { params: filters }
  )
  return response.data.data
}

// =====================================================
// REVENUE FORECAST
// =====================================================

/**
 * Get AI-powered revenue forecast
 * @param period 'month', 'quarter', or 'year'
 * @param filters Optional date range, owner, etc.
 * @returns Revenue forecast with projections
 */
export async function getRevenueForecast(
  period: 'month' | 'quarter' | 'year',
  filters?: AnalyticsFilters
): Promise<RevenueForecast> {
  const response = await api.get<{ success: boolean; data: RevenueForecast }>(
    `${ANALYTICS_BASE}/revenue-forecast`,
    { params: { period, ...filters } }
  )
  return response.data.data
}

// =====================================================
// PIPELINE ANALYTICS
// =====================================================

/**
 * Get sales pipeline-specific analytics
 * @param pipelineId Pipeline UUID
 * @param filters Optional date range, owner, etc.
 * @returns Pipeline analytics with stage conversion rates
 */
export async function getPipelineAnalytics(
  pipelineId: string,
  filters?: AnalyticsFilters
): Promise<SalesPipelineAnalytics> {
  const response = await api.get<{
    success: boolean
    data: SalesPipelineAnalytics
  }>(`${ANALYTICS_BASE}/pipeline/${pipelineId}`, { params: filters })
  return response.data.data
}

// =====================================================
// TASK ANALYTICS
// =====================================================

/**
 * Get task completion metrics
 * @param filters Optional date range, assignee, etc.
 * @returns Task analytics with completion rates
 */
export async function getTaskAnalytics(
  filters?: AnalyticsFilters
): Promise<TaskAnalytics> {
  const response = await api.get<{ success: boolean; data: TaskAnalytics }>(
    `${ANALYTICS_BASE}/tasks`,
    { params: filters }
  )
  return response.data.data
}

// =====================================================
// ACTIVITY ANALYTICS
// =====================================================

/**
 * Get activity tracking and engagement metrics
 * @param filters Optional date range, user, etc.
 * @returns Activity analytics with type breakdowns
 */
export async function getActivityAnalytics(
  filters?: AnalyticsFilters
): Promise<ActivityAnalytics> {
  const response = await api.get<{ success: boolean; data: ActivityAnalytics }>(
    `${ANALYTICS_BASE}/activities`,
    { params: filters }
  )
  return response.data.data
}

// =====================================================
// TEAM PERFORMANCE
// =====================================================

/**
 * Get team leaderboard and performance metrics
 * @param filters Optional date range, team, etc.
 * @param limit Max number of results (default: 10)
 * @returns Team performance with top performers
 */
export async function getTeamPerformance(
  filters?: AnalyticsFilters,
  limit: number = 10
): Promise<TeamPerformance> {
  const response = await api.get<{ success: boolean; data: TeamPerformance }>(
    `${ANALYTICS_BASE}/team-performance`,
    { params: { ...filters, limit } }
  )
  return response.data.data
}
