/**
 * AI Usage Tracking Repository
 * Track AI usage for billing, analytics, and quota management
 */

import { getPool } from '../../database/postgresql/pool'
import type {
  AIUsageRecord,
  SubscriptionQuota,
  AIUsageStats,
  QueryComplexity,
} from './ai-types'
import {
  AIFeatureType,
  ClaudeModel,
  SubscriptionPlan,
} from './ai-types'

// Get database pool
const pool = getPool()

// =====================================================
// AI USAGE REPOSITORY
// =====================================================

export class AIUsageRepository {
  /**
   * Record AI usage
   */
  async recordUsage(record: Omit<AIUsageRecord, 'id' | 'createdAt'>): Promise<AIUsageRecord> {
    const query = `
      INSERT INTO ai_usage_tracking (
        tenant_id,
        user_id,
        feature_type,
        complexity,
        model,
        tokens_input,
        tokens_output,
        tokens_cache_read,
        tokens_cache_write,
        tokens_total,
        cost_usd,
        latency_ms,
        cached
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `

    const tokensTotal =
      record.tokensInput +
      record.tokensOutput +
      record.tokensCacheRead +
      record.tokensCacheWrite

    const values = [
      record.tenantId,
      record.userId,
      record.featureType,
      record.complexity,
      record.model,
      record.tokensInput,
      record.tokensOutput,
      record.tokensCacheRead,
      record.tokensCacheWrite,
      tokensTotal,
      record.costUSD,
      record.latencyMs,
      record.cached,
    ]

    const result = await pool.query(query, values)
    return this.mapToUsageRecord(result.rows[0])
  }

  /**
   * Get usage statistics for a tenant
   */
  async getUsageStats(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AIUsageStats> {
    // Total queries
    const totalQuery = `
      SELECT
        COUNT(*) as total_queries,
        SUM(tokens_total) as total_tokens,
        SUM(tokens_input) as input_tokens,
        SUM(tokens_output) as output_tokens,
        SUM(tokens_cache_read + tokens_cache_write) as cached_tokens,
        SUM(cost_usd) as total_cost,
        AVG(latency_ms) as avg_latency,
        CAST(COUNT(CASE WHEN cached = true THEN 1 END) AS FLOAT) / NULLIF(COUNT(*), 0) as cache_hit_rate
      FROM ai_usage_tracking
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `

    const totalResult = await pool.query(totalQuery, [tenantId, startDate, endDate])
    const totals = totalResult.rows[0]

    // Queries by feature
    const featureQuery = `
      SELECT feature_type, COUNT(*) as count
      FROM ai_usage_tracking
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY feature_type
    `

    const featureResult = await pool.query(featureQuery, [tenantId, startDate, endDate])
    const queriesByFeature: Partial<Record<AIFeatureType, number>> = {}
    featureResult.rows.forEach((row) => {
      queriesByFeature[row.feature_type as AIFeatureType] = parseInt(row.count)
    })

    // Queries by model
    const modelQuery = `
      SELECT model, COUNT(*) as count
      FROM ai_usage_tracking
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY model
    `

    const modelResult = await pool.query(modelQuery, [tenantId, startDate, endDate])
    const queriesByModel: Partial<Record<ClaudeModel, number>> = {}
    modelResult.rows.forEach((row) => {
      queriesByModel[row.model as ClaudeModel] = parseInt(row.count)
    })

    // Cost by feature
    const costFeatureQuery = `
      SELECT feature_type, SUM(cost_usd) as cost
      FROM ai_usage_tracking
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY feature_type
    `

    const costFeatureResult = await pool.query(costFeatureQuery, [tenantId, startDate, endDate])
    const costByFeature: Partial<Record<AIFeatureType, number>> = {}
    costFeatureResult.rows.forEach((row) => {
      costByFeature[row.feature_type as AIFeatureType] = parseFloat(row.cost)
    })

    // Cost by model
    const costModelQuery = `
      SELECT model, SUM(cost_usd) as cost
      FROM ai_usage_tracking
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
      GROUP BY model
    `

    const costModelResult = await pool.query(costModelQuery, [tenantId, startDate, endDate])
    const costByModel: Partial<Record<ClaudeModel, number>> = {}
    costModelResult.rows.forEach((row) => {
      costByModel[row.model as ClaudeModel] = parseFloat(row.cost)
    })

    // Get quota information
    const quota = await this.getSubscriptionQuota(tenantId)

    return {
      tenantId,
      period: {
        start: startDate,
        end: endDate,
      },
      totalQueries: parseInt(totals.total_queries) || 0,
      queriesByFeature: queriesByFeature as Record<AIFeatureType, number>,
      queriesByModel: queriesByModel as Record<ClaudeModel, number>,
      totalTokens: parseInt(totals.total_tokens) || 0,
      inputTokens: parseInt(totals.input_tokens) || 0,
      outputTokens: parseInt(totals.output_tokens) || 0,
      cachedTokens: parseInt(totals.cached_tokens) || 0,
      totalCostUSD: parseFloat(totals.total_cost) || 0,
      costByFeature: costByFeature as Record<AIFeatureType, number>,
      costByModel: costByModel as Record<ClaudeModel, number>,
      avgLatencyMs: parseFloat(totals.avg_latency) || 0,
      cacheHitRate: parseFloat(totals.cache_hit_rate) || 0,
      quotaUsed: quota.aiQuotaUsed,
      quotaRemaining: quota.aiQuotaRemaining,
      quotaUtilization:
        quota.aiQuotaMonthly > 0 ? quota.aiQuotaUsed / quota.aiQuotaMonthly : 0,
    }
  }

  /**
   * Get subscription quota for a tenant
   */
  async getSubscriptionQuota(tenantId: string): Promise<SubscriptionQuota> {
    const query = `
      SELECT
        s.tenant_id,
        s.plan_type,
        s.ai_quota_monthly,
        s.ai_quota_used,
        s.ai_model,
        s.status,
        s.billing_period_start,
        s.billing_period_end
      FROM subscriptions s
      WHERE s.tenant_id = $1
        AND s.status = 'active'
    `

    const result = await pool.query(query, [tenantId])

    if (result.rows.length === 0) {
      // Return default starter plan if no subscription found
      return {
        tenantId,
        plan: SubscriptionPlan.STARTER,
        aiQuotaMonthly: 0,
        aiQuotaUsed: 0,
        aiQuotaRemaining: 0,
        allowedModels: [],
        enabledFeatures: [],
        billingPeriodStart: new Date(),
        billingPeriodEnd: new Date(),
        status: 'active',
      }
    }

    const row = result.rows[0]

    return {
      tenantId: row.tenant_id,
      plan: row.plan_type as SubscriptionPlan,
      aiQuotaMonthly: row.ai_quota_monthly,
      aiQuotaUsed: row.ai_quota_used,
      aiQuotaRemaining: row.ai_quota_monthly - row.ai_quota_used,
      allowedModels: this.getAllowedModels(row.plan_type),
      enabledFeatures: this.getEnabledFeatures(row.plan_type),
      billingPeriodStart: row.billing_period_start,
      billingPeriodEnd: row.billing_period_end,
      status: row.status,
    }
  }

  /**
   * Increment quota usage for a tenant
   */
  async incrementQuotaUsage(tenantId: string, count: number = 1): Promise<void> {
    const query = `
      UPDATE subscriptions
      SET ai_quota_used = ai_quota_used + $2
      WHERE tenant_id = $1
    `

    await pool.query(query, [tenantId, count])
  }

  /**
   * Check if tenant has available quota
   */
  async hasAvailableQuota(tenantId: string): Promise<boolean> {
    const quota = await this.getSubscriptionQuota(tenantId)

    // Unlimited quota for enterprise
    if (quota.aiQuotaMonthly === -1) {
      return true
    }

    // Check if under quota
    return quota.aiQuotaUsed < quota.aiQuotaMonthly
  }

  /**
   * Reset monthly quota (called by cron job)
   */
  async resetMonthlyQuota(tenantId?: string): Promise<void> {
    let query = `
      UPDATE subscriptions
      SET ai_quota_used = 0,
          billing_period_start = NOW(),
          billing_period_end = NOW() + INTERVAL '1 month'
      WHERE status = 'active'
    `

    const values: any[] = []

    if (tenantId) {
      query += ` AND tenant_id = $1`
      values.push(tenantId)
    }

    await pool.query(query, values)
  }

  /**
   * Get usage records for a tenant
   */
  async getUsageRecords(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    limit: number = 100
  ): Promise<AIUsageRecord[]> {
    const query = `
      SELECT *
      FROM ai_usage_tracking
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
      ORDER BY created_at DESC
      LIMIT $4
    `

    const result = await pool.query(query, [tenantId, startDate, endDate, limit])
    return result.rows.map(this.mapToUsageRecord)
  }

  /**
   * Get total cost for a tenant in a period
   */
  async getTotalCost(tenantId: string, startDate: Date, endDate: Date): Promise<number> {
    const query = `
      SELECT COALESCE(SUM(cost_usd), 0) as total_cost
      FROM ai_usage_tracking
      WHERE tenant_id = $1
        AND created_at >= $2
        AND created_at <= $3
    `

    const result = await pool.query(query, [tenantId, startDate, endDate])
    return parseFloat(result.rows[0].total_cost)
  }

  /**
   * Get allowed models for a plan
   */
  private getAllowedModels(plan: SubscriptionPlan): ClaudeModel[] {
    switch (plan) {
      case SubscriptionPlan.STARTER:
        return []
      case SubscriptionPlan.PROFESSIONAL:
        return [ClaudeModel.HAIKU]
      case SubscriptionPlan.BUSINESS:
        return [ClaudeModel.HAIKU, ClaudeModel.SONNET]
      case SubscriptionPlan.ENTERPRISE:
        return [ClaudeModel.HAIKU, ClaudeModel.SONNET, ClaudeModel.OPUS]
      default:
        return []
    }
  }

  /**
   * Get enabled features for a plan
   */
  private getEnabledFeatures(plan: SubscriptionPlan): AIFeatureType[] {
    // This would come from ai-config.ts PLAN_FEATURES_MAP
    // For now, return empty array - will be populated from config
    return []
  }

  /**
   * Map database row to AIUsageRecord
   */
  private mapToUsageRecord(row: any): AIUsageRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      featureType: row.feature_type,
      complexity: row.complexity,
      model: row.model,
      tokensInput: row.tokens_input,
      tokensOutput: row.tokens_output,
      tokensCacheRead: row.tokens_cache_read,
      tokensCacheWrite: row.tokens_cache_write,
      tokensTotal: row.tokens_total,
      costUSD: parseFloat(row.cost_usd),
      latencyMs: row.latency_ms,
      cached: row.cached,
      createdAt: row.created_at,
    }
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const aiUsageRepository = new AIUsageRepository()
