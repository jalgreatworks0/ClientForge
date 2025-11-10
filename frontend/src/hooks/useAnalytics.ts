/**
 * Analytics React Query Hooks
 * Custom hooks for fetching analytics data with caching, loading, and error states
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  getDashboardMetrics,
  getContactAnalytics,
  getDealAnalytics,
  getTaskAnalytics,
  getActivityAnalytics,
  getTeamPerformance,
  getRevenueForecast,
  getPipelineAnalytics,
} from '../services/analyticsService'
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
// QUERY KEYS
// =====================================================

export const analyticsKeys = {
  all: ['analytics'] as const,
  dashboard: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, 'dashboard', filters] as const,
  contacts: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, 'contacts', filters] as const,
  deals: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, 'deals', filters] as const,
  tasks: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, 'tasks', filters] as const,
  activities: (filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, 'activities', filters] as const,
  teamPerformance: (filters?: AnalyticsFilters, limit?: number) =>
    [...analyticsKeys.all, 'team-performance', filters, limit] as const,
  revenueForecast: (
    period: 'month' | 'quarter' | 'year',
    filters?: AnalyticsFilters
  ) => [...analyticsKeys.all, 'revenue-forecast', period, filters] as const,
  pipeline: (pipelineId: string, filters?: AnalyticsFilters) =>
    [...analyticsKeys.all, 'pipeline', pipelineId, filters] as const,
}

// =====================================================
// HOOK OPTIONS
// =====================================================

const DEFAULT_STALE_TIME = 5 * 60 * 1000 // 5 minutes
const DEFAULT_RETRY = 3

// =====================================================
// DASHBOARD METRICS HOOK
// =====================================================

/**
 * Fetch dashboard metrics with automatic caching and refetching
 * @param filters Optional filters (date range, owner, etc.)
 * @returns Query result with data, loading, and error states
 */
export function useDashboardMetrics(
  filters?: AnalyticsFilters
): UseQueryResult<DashboardMetrics, Error> {
  return useQuery({
    queryKey: analyticsKeys.dashboard(filters),
    queryFn: () => getDashboardMetrics(filters),
    staleTime: DEFAULT_STALE_TIME,
    retry: DEFAULT_RETRY,
    refetchOnWindowFocus: true,
  })
}

// =====================================================
// CONTACT ANALYTICS HOOK
// =====================================================

/**
 * Fetch contact analytics with lead scoring and breakdowns
 * @param filters Optional filters (date range, owner, etc.)
 * @returns Query result with contact analytics data
 */
export function useContactAnalytics(
  filters?: AnalyticsFilters
): UseQueryResult<ContactAnalytics, Error> {
  return useQuery({
    queryKey: analyticsKeys.contacts(filters),
    queryFn: () => getContactAnalytics(filters),
    staleTime: DEFAULT_STALE_TIME,
    retry: DEFAULT_RETRY,
    refetchOnWindowFocus: true,
  })
}

// =====================================================
// DEAL ANALYTICS HOOK
// =====================================================

/**
 * Fetch deal analytics with revenue metrics and pipeline breakdowns
 * @param filters Optional filters (date range, owner, pipeline, etc.)
 * @returns Query result with deal analytics data
 */
export function useDealAnalytics(
  filters?: AnalyticsFilters
): UseQueryResult<DealAnalytics, Error> {
  return useQuery({
    queryKey: analyticsKeys.deals(filters),
    queryFn: () => getDealAnalytics(filters),
    staleTime: DEFAULT_STALE_TIME,
    retry: DEFAULT_RETRY,
    refetchOnWindowFocus: true,
  })
}

// =====================================================
// TASK ANALYTICS HOOK
// =====================================================

/**
 * Fetch task analytics with completion rates
 * @param filters Optional filters (date range, assignee, etc.)
 * @returns Query result with task analytics data
 */
export function useTaskAnalytics(
  filters?: AnalyticsFilters
): UseQueryResult<TaskAnalytics, Error> {
  return useQuery({
    queryKey: analyticsKeys.tasks(filters),
    queryFn: () => getTaskAnalytics(filters),
    staleTime: DEFAULT_STALE_TIME,
    retry: DEFAULT_RETRY,
    refetchOnWindowFocus: true,
  })
}

// =====================================================
// ACTIVITY ANALYTICS HOOK
// =====================================================

/**
 * Fetch activity analytics with engagement metrics
 * @param filters Optional filters (date range, user, etc.)
 * @returns Query result with activity analytics data
 */
export function useActivityAnalytics(
  filters?: AnalyticsFilters
): UseQueryResult<ActivityAnalytics, Error> {
  return useQuery({
    queryKey: analyticsKeys.activities(filters),
    queryFn: () => getActivityAnalytics(filters),
    staleTime: DEFAULT_STALE_TIME,
    retry: DEFAULT_RETRY,
    refetchOnWindowFocus: true,
  })
}

// =====================================================
// TEAM PERFORMANCE HOOK
// =====================================================

/**
 * Fetch team performance metrics and leaderboard
 * @param filters Optional filters (date range, team, etc.)
 * @param limit Maximum number of results (default: 10)
 * @returns Query result with team performance data
 */
export function useTeamPerformance(
  filters?: AnalyticsFilters,
  limit: number = 10
): UseQueryResult<TeamPerformance, Error> {
  return useQuery({
    queryKey: analyticsKeys.teamPerformance(filters, limit),
    queryFn: () => getTeamPerformance(filters, limit),
    staleTime: DEFAULT_STALE_TIME,
    retry: DEFAULT_RETRY,
    refetchOnWindowFocus: true,
  })
}

// =====================================================
// REVENUE FORECAST HOOK
// =====================================================

/**
 * Fetch AI-powered revenue forecast
 * @param period Forecast period ('month', 'quarter', or 'year')
 * @param filters Optional filters (date range, owner, etc.)
 * @returns Query result with revenue forecast data
 */
export function useRevenueForecast(
  period: 'month' | 'quarter' | 'year',
  filters?: AnalyticsFilters
): UseQueryResult<RevenueForecast, Error> {
  return useQuery({
    queryKey: analyticsKeys.revenueForecast(period, filters),
    queryFn: () => getRevenueForecast(period, filters),
    staleTime: DEFAULT_STALE_TIME,
    retry: DEFAULT_RETRY,
    refetchOnWindowFocus: true,
  })
}

// =====================================================
// PIPELINE ANALYTICS HOOK
// =====================================================

/**
 * Fetch pipeline-specific analytics with stage conversion rates
 * @param pipelineId Pipeline UUID
 * @param filters Optional filters (date range, owner, etc.)
 * @returns Query result with pipeline analytics data
 */
export function usePipelineAnalytics(
  pipelineId: string,
  filters?: AnalyticsFilters
): UseQueryResult<SalesPipelineAnalytics, Error> {
  return useQuery({
    queryKey: analyticsKeys.pipeline(pipelineId, filters),
    queryFn: () => getPipelineAnalytics(pipelineId, filters),
    staleTime: DEFAULT_STALE_TIME,
    retry: DEFAULT_RETRY,
    refetchOnWindowFocus: true,
    enabled: !!pipelineId, // Only run if pipelineId is provided
  })
}
