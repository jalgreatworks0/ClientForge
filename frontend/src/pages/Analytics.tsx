import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Calendar, TrendingUp, Users, DollarSign, Target, AlertCircle, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { format, subDays, subMonths } from 'date-fns'
import {
  getRevenueMetrics,
  getSalesFunnel,
  getRevenueTrend,
  getLeadSources,
  getPipelineHealth,
  getTeamPerformance,
} from '../services/analyticsService'
import {
  exportAllAnalytics,
  exportRevenueMetricsCSV,
  exportSalesFunnelCSV,
  exportRevenueTrendCSV,
  exportLeadSourcesCSV,
  exportTeamPerformanceCSV,
  exportAnalyticsPDF,
} from '../utils/analyticsExport'
import type { AnalyticsFilters } from '../types/analytics'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

interface DateRange {
  startDate: string
  endDate: string
}

export default function Analytics() {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const endDate = new Date()
    const startDate = subDays(endDate, 30)
    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    }
  })

  const [trendGranularity, setTrendGranularity] = useState<'day' | 'week' | 'month'>('week')
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Fetch revenue metrics
  const { data: revenueMetrics, isLoading: loadingRevenue } = useQuery({
    queryKey: ['revenue-metrics', dateRange],
    queryFn: () => getRevenueMetrics(dateRange),
  })

  // Fetch sales funnel
  const { data: salesFunnel, isLoading: loadingFunnel } = useQuery({
    queryKey: ['sales-funnel'],
    queryFn: () => getSalesFunnel(),
  })

  // Fetch revenue trend
  const { data: revenueTrend, isLoading: loadingTrend } = useQuery({
    queryKey: ['revenue-trend', dateRange, trendGranularity],
    queryFn: () => getRevenueTrend({ ...dateRange, granularity: trendGranularity }),
  })

  // Fetch lead sources
  const { data: leadSources, isLoading: loadingSources } = useQuery({
    queryKey: ['lead-sources', dateRange],
    queryFn: () => getLeadSources(dateRange),
  })

  // Fetch pipeline health
  const { data: pipelineHealth, isLoading: loadingHealth } = useQuery({
    queryKey: ['pipeline-health'],
    queryFn: () => getPipelineHealth(),
  })

  // Fetch team performance
  const { data: teamPerformance, isLoading: loadingTeam } = useQuery({
    queryKey: ['team-performance', dateRange],
    queryFn: () => getTeamPerformance({ ...dateRange }),
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const handleDatePreset = (preset: '7d' | '30d' | '90d' | '6m' | '1y') => {
    const endDate = new Date()
    let startDate: Date

    switch (preset) {
      case '7d':
        startDate = subDays(endDate, 7)
        break
      case '30d':
        startDate = subDays(endDate, 30)
        break
      case '90d':
        startDate = subDays(endDate, 90)
        break
      case '6m':
        startDate = subMonths(endDate, 6)
        break
      case '1y':
        startDate = subMonths(endDate, 12)
        break
    }

    setDateRange({
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    })
  }

  const handleExportCSV = async () => {
    if (revenueMetrics && salesFunnel && revenueTrend && leadSources && teamPerformance) {
      await exportAllAnalytics(
        {
          revenueMetrics,
          salesFunnel,
          revenueTrend,
          leadSources,
          teamPerformance: teamPerformance.data || [],
          pipelineHealth,
          dateRange,
        },
        'csv'
      )
      setShowExportMenu(false)
    }
  }

  const handleExportPDF = async () => {
    if (revenueMetrics && salesFunnel && teamPerformance) {
      await exportAnalyticsPDF(
        revenueMetrics,
        salesFunnel,
        teamPerformance.data || [],
        dateRange
      )
      setShowExportMenu(false)
    }
  }

  return (
    <div className="p-8 space-y-8 bg-alabaster-50 dark:bg-dark-secondary min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50">
            Analytics Dashboard
          </h1>
          <p className="mt-1 text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
            Revenue metrics, team performance, and pipeline insights
          </p>
        </div>

        <div className="relative">
          <button
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-syne-mono text-sm"
            onClick={() => setShowExportMenu(!showExportMenu)}
          >
            <Download className="w-4 h-4" />
            Export Report
          </button>

          {showExportMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-tertiary rounded-lg shadow-lg border border-alabaster-200 dark:border-dark-border z-10">
              <button
                onClick={handleExportPDF}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-alabaster-50 dark:hover:bg-dark-hover transition-colors text-left text-sm font-syne-mono text-charcoal-700 dark:text-charcoal-300 rounded-t-lg"
              >
                <FileText className="w-4 h-4" />
                Export as PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-alabaster-50 dark:hover:bg-dark-hover transition-colors text-left text-sm font-syne-mono text-charcoal-700 dark:text-charcoal-300 rounded-b-lg"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Export as CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Date Range Filters */}
      <div className="bg-white dark:bg-dark-tertiary rounded-lg p-4 shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-charcoal-600 dark:text-charcoal-400" />
            <span className="text-sm font-syne-mono text-charcoal-700 dark:text-charcoal-300">
              Date Range:
            </span>
          </div>

          <div className="flex gap-2">
            {(['7d', '30d', '90d', '6m', '1y'] as const).map((preset) => (
              <button
                key={preset}
                onClick={() => handleDatePreset(preset)}
                className="px-3 py-1 text-xs font-syne-mono rounded-md bg-alabaster-100 dark:bg-dark-secondary hover:bg-alabaster-200 dark:hover:bg-dark-hover transition-colors text-charcoal-700 dark:text-charcoal-300"
              >
                {preset === '7d' && 'Last 7 Days'}
                {preset === '30d' && 'Last 30 Days'}
                {preset === '90d' && 'Last 90 Days'}
                {preset === '6m' && 'Last 6 Months'}
                {preset === '1y' && 'Last Year'}
              </button>
            ))}
          </div>

          <div className="flex gap-2 ml-auto">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-1 text-xs font-syne-mono rounded-md border border-alabaster-300 dark:border-dark-border bg-white dark:bg-dark-secondary text-charcoal-700 dark:text-charcoal-300"
            />
            <span className="text-charcoal-600 dark:text-charcoal-400">to</span>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-1 text-xs font-syne-mono rounded-md border border-alabaster-300 dark:border-dark-border bg-white dark:bg-dark-secondary text-charcoal-700 dark:text-charcoal-300"
            />
          </div>
        </div>
      </div>

      {/* Revenue Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(revenueMetrics?.totalRevenue || 0)}
          change={revenueMetrics?.periodComparison.percentChange}
          icon={<DollarSign className="w-6 h-6" />}
          iconBg="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          loading={loadingRevenue}
        />
        <MetricCard
          title="Won Deals"
          value={revenueMetrics?.wonDeals.toString() || '0'}
          icon={<Target className="w-6 h-6" />}
          iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
          loading={loadingRevenue}
        />
        <MetricCard
          title="Average Deal Size"
          value={formatCurrency(revenueMetrics?.averageDealSize || 0)}
          icon={<TrendingUp className="w-6 h-6" />}
          iconBg="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          loading={loadingRevenue}
        />
        <MetricCard
          title="Forecasted Revenue"
          value={formatCurrency(revenueMetrics?.forecastedRevenue || 0)}
          icon={<TrendingUp className="w-6 h-6" />}
          iconBg="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
          loading={loadingRevenue}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <ChartCard
          title="Revenue Trend"
          loading={loadingTrend}
          toolbar={
            <div className="flex gap-2">
              {(['day', 'week', 'month'] as const).map((granularity) => (
                <button
                  key={granularity}
                  onClick={() => setTrendGranularity(granularity)}
                  className={`px-2 py-1 text-xs font-syne-mono rounded ${
                    trendGranularity === granularity
                      ? 'bg-blue-600 text-white'
                      : 'bg-alabaster-100 dark:bg-dark-secondary text-charcoal-600 dark:text-charcoal-400'
                  }`}
                >
                  {granularity.charAt(0).toUpperCase() + granularity.slice(1)}
                </button>
              ))}
            </div>
          }
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis tick={{ fontSize: 12 }} stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sales Funnel Chart */}
        <ChartCard title="Sales Funnel" loading={loadingFunnel}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesFunnel || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#6b7280" />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} stroke="#6b7280" width={100} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => {
                  if (name === 'totalValue') return formatCurrency(value)
                  return value
                }}
              />
              <Legend />
              <Bar dataKey="dealCount" fill="#3b82f6" name="Deal Count" />
              <Bar dataKey="totalValue" fill="#10b981" name="Total Value" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Lead Sources Chart */}
        <ChartCard title="Lead Sources" loading={loadingSources}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={leadSources || []}
                dataKey="totalRevenue"
                nameKey="source"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => entry.source}
              >
                {(leadSources || []).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Pipeline Health */}
        <ChartCard title="Pipeline Health" loading={loadingHealth}>
          <div className="space-y-4 p-4">
            <HealthMetric
              label="Total Deals"
              value={pipelineHealth?.totalDeals || 0}
              icon={<Target className="w-5 h-5" />}
            />
            <HealthMetric
              label="Total Pipeline Value"
              value={formatCurrency(pipelineHealth?.totalValue || 0)}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <HealthMetric
              label="Average Deal Age"
              value={`${pipelineHealth?.averageAge || 0} days`}
              icon={<Calendar className="w-5 h-5" />}
            />
            <HealthMetric
              label="Stale Deals (>30 days)"
              value={pipelineHealth?.staleDeals || 0}
              icon={<AlertCircle className="w-5 h-5" />}
              warning={pipelineHealth && pipelineHealth.staleDeals > 0}
            />
            <HealthMetric
              label="Hot Deals (closing in 7 days)"
              value={pipelineHealth?.hotDeals || 0}
              icon={<TrendingUp className="w-5 h-5" />}
              success
            />
          </div>
        </ChartCard>
      </div>

      {/* Team Performance Table */}
      <ChartCard title="Team Performance" loading={loadingTeam}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-alabaster-200 dark:border-dark-border">
                <th className="text-left py-3 px-4 text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                  Team Member
                </th>
                <th className="text-right py-3 px-4 text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                  Deals Won
                </th>
                <th className="text-right py-3 px-4 text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                  Deals Lost
                </th>
                <th className="text-right py-3 px-4 text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                  Pipeline Value
                </th>
                <th className="text-right py-3 px-4 text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                  Conversion Rate
                </th>
                <th className="text-right py-3 px-4 text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                  Avg Deal Size
                </th>
              </tr>
            </thead>
            <tbody>
              {(teamPerformance?.data || []).map((member: any) => (
                <tr
                  key={member.userId}
                  className="border-b border-alabaster-100 dark:border-dark-border hover:bg-alabaster-50 dark:hover:bg-dark-hover transition-colors"
                >
                  <td className="py-3 px-4 font-syne text-sm text-charcoal-900 dark:text-charcoal-50">
                    {member.userName}
                  </td>
                  <td className="py-3 px-4 text-right font-syne-mono text-sm text-charcoal-700 dark:text-charcoal-300">
                    {member.dealsWon}
                  </td>
                  <td className="py-3 px-4 text-right font-syne-mono text-sm text-charcoal-700 dark:text-charcoal-300">
                    {member.dealsLost}
                  </td>
                  <td className="py-3 px-4 text-right font-syne-mono text-sm text-charcoal-700 dark:text-charcoal-300">
                    {formatCurrency(member.pipelineValue)}
                  </td>
                  <td className="py-3 px-4 text-right font-syne-mono text-sm text-charcoal-700 dark:text-charcoal-300">
                    {member.conversionRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-right font-syne-mono text-sm text-charcoal-700 dark:text-charcoal-300">
                    {formatCurrency(member.averageDealSize)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  )
}

// =====================================================
// COMPONENTS
// =====================================================

interface MetricCardProps {
  title: string
  value: string
  change?: number
  icon: React.ReactNode
  iconBg: string
  loading?: boolean
}

function MetricCard({ title, value, change, icon, iconBg, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-tertiary rounded-lg p-6 shadow-sm animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 rounded-lg bg-alabaster-200 dark:bg-dark-hover"></div>
          <div className="w-16 h-4 rounded bg-alabaster-200 dark:bg-dark-hover"></div>
        </div>
        <div className="w-24 h-8 rounded bg-alabaster-200 dark:bg-dark-hover mb-2"></div>
        <div className="w-32 h-4 rounded bg-alabaster-200 dark:bg-dark-hover"></div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-tertiary rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`${iconBg} w-12 h-12 rounded-lg flex items-center justify-center`}>{icon}</div>
        {change !== undefined && (
          <div
            className={`flex items-center text-sm font-syne-mono ${
              change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            <TrendingUp className={`w-4 h-4 mr-1 ${change < 0 ? 'rotate-180' : ''}`} />
            <span>{Math.abs(change).toFixed(1)}%</span>
          </div>
        )}
      </div>
      <div className="text-3xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-1">
        {value}
      </div>
      <div className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">{title}</div>
    </div>
  )
}

interface ChartCardProps {
  title: string
  loading?: boolean
  toolbar?: React.ReactNode
  children: React.ReactNode
}

function ChartCard({ title, loading, toolbar, children }: ChartCardProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-tertiary rounded-lg p-6 shadow-sm">
        <div className="h-8 w-32 bg-alabaster-200 dark:bg-dark-hover rounded mb-4 animate-pulse"></div>
        <div className="h-64 bg-alabaster-100 dark:bg-dark-secondary rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-dark-tertiary rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-syne font-bold text-charcoal-900 dark:text-charcoal-50">{title}</h2>
        {toolbar}
      </div>
      {children}
    </div>
  )
}

interface HealthMetricProps {
  label: string
  value: string | number
  icon: React.ReactNode
  warning?: boolean
  success?: boolean
}

function HealthMetric({ label, value, icon, warning, success }: HealthMetricProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-alabaster-100 dark:border-dark-border last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`${
            warning
              ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
              : success
              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
          } w-10 h-10 rounded-lg flex items-center justify-center`}
        >
          {icon}
        </div>
        <span className="text-sm font-syne text-charcoal-700 dark:text-charcoal-300">{label}</span>
      </div>
      <span
        className={`text-lg font-syne-mono font-bold ${
          warning
            ? 'text-orange-600 dark:text-orange-400'
            : success
            ? 'text-green-600 dark:text-green-400'
            : 'text-charcoal-900 dark:text-charcoal-50'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
