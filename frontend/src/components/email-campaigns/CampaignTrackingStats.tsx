/**
 * Campaign Tracking Statistics Component
 * Displays email open and click tracking data with beautiful charts
 */

import React, { useState, useEffect } from 'react'
import axios from 'axios'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface CampaignStats {
  campaign: {
    id: string
    name: string
    subject: string
    sentAt: string
  }
  statistics: {
    totalSent: number
    uniqueOpens: number
    totalOpens: number
    uniqueClicks: number
    totalClicks: number
    openRate: number
    clickRate: number
  }
  recentOpens: Array<{
    opened_at: string
    email: string
    first_name: string
    last_name: string
    user_agent: string
    ip_address: string
  }>
}

interface Props {
  campaignId: string
}

export const CampaignTrackingStats: React.FC<Props> = ({ campaignId }) => {
  const [stats, setStats] = useState<CampaignStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [campaignId])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/email-tracking/campaign/${campaignId}/stats`)
      setStats(response.data)
      setError(null)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tracking statistics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    )
  }

  if (!stats) return null

  const { campaign, statistics, recentOpens } = stats

  // Pie chart data for engagement overview
  const engagementData = [
    { name: 'Opened', value: statistics.uniqueOpens, color: '#10B981' },
    { name: 'Clicked', value: statistics.uniqueClicks, color: '#3B82F6' },
    {
      name: 'Not Opened',
      value: statistics.totalSent - statistics.uniqueOpens,
      color: '#E5E7EB',
    },
  ]

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      {/* Campaign Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{campaign.name}</h2>
        <p className="text-gray-600">{campaign.subject}</p>
        <p className="text-sm text-gray-500 mt-2">Sent: {formatDate(campaign.sentAt)}</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Sent"
          value={statistics.totalSent}
          icon="📧"
          color="bg-blue-50 text-blue-700"
        />
        <MetricCard
          title="Unique Opens"
          value={statistics.uniqueOpens}
          subtitle={`${statistics.openRate}% open rate`}
          icon="📬"
          color="bg-green-50 text-green-700"
        />
        <MetricCard
          title="Unique Clicks"
          value={statistics.uniqueClicks}
          subtitle={`${statistics.clickRate}% click rate`}
          icon="🖱️"
          color="bg-purple-50 text-purple-700"
        />
        <MetricCard
          title="Total Opens"
          value={statistics.totalOpens}
          subtitle={`${(statistics.totalOpens / Math.max(statistics.uniqueOpens, 1)).toFixed(1)}x avg`}
          icon="👀"
          color="bg-yellow-50 text-yellow-700"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Engagement Pie Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={engagementData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {engagementData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Engagement Rates Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement Rates</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={[
                { name: 'Open Rate', rate: statistics.openRate },
                { name: 'Click Rate', rate: statistics.clickRate },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="rate" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Opens Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Opens</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opened At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Device
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOpens.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No opens yet
                  </td>
                </tr>
              ) : (
                recentOpens.map((open, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {open.first_name} {open.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {open.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(open.opened_at)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <span title={open.user_agent}>
                        {getDeviceType(open.user_agent)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Metric Card Component
interface MetricCardProps {
  title: string
  value: number
  subtitle?: string
  icon: string
  color: string
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, icon, color }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <span className={`text-2xl ${color} rounded-full w-10 h-10 flex items-center justify-center`}>
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

// Helper: Detect device type from user agent
function getDeviceType(userAgent: string): string {
  if (!userAgent) return 'Unknown'

  const ua = userAgent.toLowerCase()

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return '📱 Mobile'
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    return '📱 Tablet'
  } else if (ua.includes('windows') || ua.includes('macintosh') || ua.includes('linux')) {
    return '💻 Desktop'
  } else {
    return '🌐 Other'
  }
}

export default CampaignTrackingStats
