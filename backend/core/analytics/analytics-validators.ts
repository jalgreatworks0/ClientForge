/**
 * Analytics Validators
 * Input validation using Zod schemas
 */

import { z } from 'zod'

// =====================================================
// COMMON SCHEMAS
// =====================================================

export const analyticsFiltersSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ownerId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
  teamId: z.string().uuid().optional(),
  compareWithPreviousPeriod: z.boolean().optional(),
})

// =====================================================
// REQUEST VALIDATORS
// =====================================================

export const getDashboardMetricsValidator = {
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    ownerId: z.string().uuid().optional(),
  }).optional(),
}

export const getContactAnalyticsValidator = {
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    ownerId: z.string().uuid().optional(),
  }).optional(),
}

export const getDealAnalyticsValidator = {
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    ownerId: z.string().uuid().optional(),
    pipelineId: z.string().uuid().optional(),
  }).optional(),
}

export const getRevenueForecastValidator = {
  query: z.object({
    period: z.enum(['month', 'quarter', 'year']).default('month'),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    ownerId: z.string().uuid().optional(),
  }),
}

export const getSalesPipelineAnalyticsValidator = {
  params: z.object({
    pipelineId: z.string().uuid(),
  }),
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }).optional(),
}

export const getTaskAnalyticsValidator = {
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    ownerId: z.string().uuid().optional(),
  }).optional(),
}

export const getActivityAnalyticsValidator = {
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    ownerId: z.string().uuid().optional(),
  }).optional(),
}

export const getTeamPerformanceValidator = {
  query: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    limit: z.string().regex(/^\d+$/).transform(Number).default('10'),
  }).optional(),
}

// =====================================================
// TYPE EXPORTS
// =====================================================
// Note: Type inference removed since validators are now plain objects
// matching ValidationSchemas interface expected by validateRequest middleware
