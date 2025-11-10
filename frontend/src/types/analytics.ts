/**
 * Analytics Types & Interfaces (Frontend)
 * TypeScript definitions for analytics and dashboard metrics
 * Mirrors backend/core/analytics/analytics-types.ts
 */

// =====================================================
// DASHBOARD METRICS
// =====================================================

export interface DashboardMetrics {
  totalContacts: number
  totalDeals: number
  totalTasks: number
  totalRevenue: number

  // Trends (compared to previous period)
  contactsChange: number // percentage
  dealsChange: number // percentage
  tasksChange: number // percentage
  revenueChange: number // percentage

  // Quick stats
  activeDeals: number
  pendingTasks: number
  overdueTasks: number
  dealsClosingSoon: number // within 7 days
}

// =====================================================
// CONTACT ANALYTICS
// =====================================================

export interface ContactAnalytics {
  totalContacts: number
  activeContacts: number
  inactiveContacts: number

  // By Lead Status
  byLeadStatus: {
    new: number
    contacted: number
    qualified: number
    unqualified: number
  }

  // By Lifecycle Stage
  byLifecycleStage: {
    lead: number
    mql: number
    sql: number
    opportunity: number
    customer: number
    evangelist: number
    other: number
  }

  // Scoring
  averageLeadScore: number
  highValueLeads: number // lead_score > 75

  // Activity
  contactedLast30Days: number
  newContactsThisMonth: number
  newContactsLastMonth: number

  // Conversion
  conversionRate: number // leads to customers
}

// =====================================================
// DEAL/REVENUE ANALYTICS
// =====================================================

export interface DealAnalytics {
  totalDeals: number
  openDeals: number
  closedDeals: number
  wonDeals: number
  lostDeals: number

  // Revenue
  totalRevenue: number
  wonRevenue: number
  lostRevenue: number
  projectedRevenue: number // weighted pipeline value
  averageDealSize: number

  // Performance
  winRate: number // percentage
  averageSalesCycle: number // days
  averageDaysInStage: number

  // Pipeline Health
  pipelineCoverage: number // pipeline value / target
  staleDealCount: number // not updated in 30+ days
  dealsClosingThisMonth: number
  dealsClosingNextMonth: number

  // By Stage
  byStage: Array<{
    stageId: string
    stageName: string
    dealCount: number
    totalValue: number
    weightedValue: number
  }>

  // By Pipeline
  byPipeline: Array<{
    pipelineId: string
    pipelineName: string
    dealCount: number
    totalValue: number
  }>

  // By Owner
  byOwner: Array<{
    ownerId: string
    ownerName: string
    dealCount: number
    totalValue: number
    wonDeals: number
    lostDeals: number
    winRate: number
  }>

  // Top Deals
  topDeals: Array<{
    id: string
    name: string
    amount: number
    probability: number
    weightedAmount: number
    stageName: string
    expectedCloseDate: string | null // ISO date string
  }>

  // At Risk Deals
  atRiskDeals: Array<{
    id: string
    name: string
    amount: number
    stageName: string
    daysInStage: number
    lastUpdated: string // ISO date string
  }>
}

// =====================================================
// REVENUE FORECAST
// =====================================================

export interface RevenueForecast {
  period: 'month' | 'quarter' | 'year'
  startDate: string // ISO date string
  endDate: string // ISO date string

  // Current Period Forecast
  projectedRevenue: number
  committedRevenue: number // high probability deals
  bestCaseRevenue: number
  worstCaseRevenue: number

  // Target Comparison
  target: number | null
  targetAchievement: number // percentage
  gap: number // target - projected

  // Historical Performance
  previousPeriodRevenue: number
  growthRate: number // percentage

  // AI-Powered Prediction (optional)
  aiProjectedRevenue?: number
  aiConfidence?: number // 0-100
  aiFactors?: Array<{
    factor: string
    impact: 'positive' | 'negative' | 'neutral'
    weight: number
  }>

  // Breakdown
  byMonth: Array<{
    month: string
    projected: number
    committed: number
    closed: number
    target: number | null
  }>
}

// =====================================================
// SALES PIPELINE ANALYTICS
// =====================================================

export interface SalesPipelineAnalytics {
  pipelineId: string
  pipelineName: string

  // Overview
  totalDeals: number
  totalValue: number
  weightedValue: number

  // Velocity
  averageVelocity: number // deals moved per week
  averageTimeToClose: number // days

  // Conversion Rates
  stageConversionRates: Array<{
    fromStageId: string
    fromStageName: string
    toStageId: string
    toStageName: string
    conversionRate: number
    averageTime: number // days
  }>

  // Stage Distribution
  stages: Array<{
    stageId: string
    stageName: string
    dealCount: number
    totalValue: number
    weightedValue: number
    averageDaysInStage: number
    bottleneck: boolean // true if average time > threshold
  }>
}

// =====================================================
// TASK ANALYTICS
// =====================================================

export interface TaskAnalytics {
  totalTasks: number
  pendingTasks: number
  inProgressTasks: number
  completedTasks: number
  cancelledTasks: number
  overdueTasks: number

  // Due Soon
  dueTodayTasks: number
  dueThisWeekTasks: number
  dueThisMonthTasks: number

  // By Priority
  byPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }

  // By Assignee
  byAssignee: Array<{
    userId: string
    userName: string
    pendingCount: number
    completedCount: number
    overdueCount: number
    completionRate: number
  }>

  // Performance
  completionRate: number
  averageCompletionTime: number | null // hours
  onTimeCompletionRate: number
}

// =====================================================
// ACTIVITY ANALYTICS
// =====================================================

export interface ActivityAnalytics {
  totalActivities: number
  activitiesThisWeek: number
  activitiesThisMonth: number

  // By Type
  byType: {
    call: number
    email: number
    meeting: number
    note: number
    task: number
    custom: number
  }

  // By User
  byUser: Array<{
    userId: string
    userName: string
    activityCount: number
    byType: {
      call: number
      email: number
      meeting: number
      note: number
      task: number
      custom: number
    }
  }>

  // Timeline
  last30Days: Array<{
    date: string // ISO date string
    count: number
  }>

  // Most Active Entities
  topContacts: Array<{
    id: string
    name: string
    activityCount: number
  }>

  topAccounts: Array<{
    id: string
    name: string
    activityCount: number
  }>
}

// =====================================================
// TEAM PERFORMANCE
// =====================================================

export interface TeamPerformance {
  teamSize: number
  activeUsers: number

  // Team Metrics
  totalDealsWon: number
  totalRevenue: number
  averageDealSize: number
  teamWinRate: number

  // Individual Performance
  topPerformers: Array<{
    userId: string
    userName: string
    dealsWon: number
    revenue: number
    winRate: number
    rank: number
  }>

  // Activity Leaders
  activityLeaders: Array<{
    userId: string
    userName: string
    activityCount: number
    callCount: number
    emailCount: number
    meetingCount: number
  }>

  // Leaderboard (by revenue)
  leaderboard: Array<{
    userId: string
    userName: string
    revenue: number
    deals: number
    activities: number
    score: number // composite score
  }>
}

// =====================================================
// ANALYTICS FILTERS
// =====================================================

export interface AnalyticsFilters {
  startDate?: string // ISO date string
  endDate?: string // ISO date string
  ownerId?: string
  pipelineId?: string
  teamId?: string
  compareWithPreviousPeriod?: boolean
}

// =====================================================
// TIME SERIES DATA
// =====================================================

export interface TimeSeriesDataPoint {
  date: string // ISO date string
  value: number
  label?: string
}

export interface TimeSeriesData {
  metric: string
  period: 'day' | 'week' | 'month' | 'quarter' | 'year'
  data: TimeSeriesDataPoint[]
}

// =====================================================
// API RESPONSE WRAPPERS
// =====================================================

export interface AnalyticsApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}
