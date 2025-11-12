/**
 * Usage Metering Service
 * Tracks usage metrics for metered billing including API calls, storage, and custom metrics
 * Provides usage reporting, overage calculation, and Stripe usage record synchronization
 */

import Stripe from 'stripe';
import { Pool } from 'pg';

import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';

import { StripeService } from './stripe.service';
import { SubscriptionService } from './subscription.service';

export interface UsageRecord {
  id: string;
  tenantId: string;
  subscriptionId: string;
  metricName: string;
  quantity: number;
  timestamp: Date;
  metadata?: Record<string, any>;
  reportedToStripe: boolean;
  stripeUsageRecordId?: string;
  createdAt: Date;
}

export interface UsageSummary {
  metricName: string;
  totalUsage: number;
  limit: number;
  percentage: number;
  isOverage: boolean;
  overageAmount: number;
  periodStart: Date;
  periodEnd: Date;
}

export interface RecordUsageParams {
  tenantId: string;
  metricName: string;
  quantity: number;
  timestamp?: Date;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
}

export class UsageMeteringService {
  private pool: Pool;
  private stripeService: StripeService;
  private subscriptionService: SubscriptionService;

  constructor() {
    this.pool = getPool();
    this.stripeService = new StripeService();
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Record a usage event
   */
  async recordUsage(params: RecordUsageParams): Promise<UsageRecord> {
    const {
      tenantId,
      metricName,
      quantity,
      timestamp = new Date(),
      metadata,
      idempotencyKey,
    } = params;

    try {
      if (!tenantId || !metricName || quantity === undefined || quantity === null) {
        throw new Error('tenantId, metricName, and quantity are required');
      }

      if (quantity < 0) {
        throw new Error('Quantity cannot be negative');
      }

      // Get current subscription
      const subscription = await this.subscriptionService.getCurrentSubscription(tenantId);
      if (!subscription) {
        logger.warn('[UsageMetering] No active subscription for usage tracking', {
          tenantId,
          metricName,
        });
        // Still record for historical purposes
      }

      // Store usage record
      const result = await this.pool.query(
        `INSERT INTO usage_records (
          tenantId, subscription_id, metric_name, quantity,
          timestamp, metadata, reported_to_stripe
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, tenantId, subscription_id, metric_name, quantity,
                  timestamp, metadata, reported_to_stripe, stripe_usage_record_id,
                  created_at`,
        [
          tenantId,
          subscription?.id || null,
          metricName,
          quantity,
          timestamp,
          metadata ? JSON.stringify(metadata) : null,
          false,
        ]
      );

      const record = this.mapRowToUsageRecord(result.rows[0]);

      logger.info('[UsageMetering] Usage recorded', {
        tenantId,
        metricName,
        quantity,
        timestamp,
      });

      // Report to Stripe if this is a metered subscription item
      if (subscription) {
        await this.reportUsageToStripe(record, idempotencyKey);
      }

      return record;
    } catch (error: any) {
      logger.error('[UsageMetering] Failed to record usage', {
        tenantId,
        metricName,
        quantity,
        error: error.message,
      });
      throw new Error('Failed to record usage');
    }
  }

  /**
   * Report usage to Stripe for metered billing
   */
  private async reportUsageToStripe(
    record: UsageRecord,
    idempotencyKey?: string
  ): Promise<void> {
    try {
      // Get subscription from Stripe
      const subscription = await this.subscriptionService.getCurrentSubscription(
        record.tenantId
      );
      if (!subscription) {
        return;
      }

      const stripe = this.stripeService.getStripeInstance();
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      // Find metered subscription item
      const meteredItem = stripeSubscription.items.data.find(item => {
        const price = item.price;
        return (
          price.recurring?.usage_type === 'metered' &&
          price.metadata?.metricName === record.metricName
        );
      });

      if (!meteredItem) {
        logger.debug('[UsageMetering] No metered item found for metric', {
          metricName: record.metricName,
        });
        return;
      }

      // Report usage to Stripe
      const usageRecord = await stripe.subscriptionItems.createUsageRecord(
        meteredItem.id,
        {
          quantity: record.quantity,
          timestamp: Math.floor(record.timestamp.getTime() / 1000),
          action: 'increment',
        },
        {
          idempotencyKey: idempotencyKey || `usage_${record.id}`,
        }
      );

      // Update record as reported
      await this.pool.query(
        `UPDATE usage_records
         SET reported_to_stripe = true,
             stripe_usage_record_id = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [usageRecord.id, record.id]
      );

      logger.info('[UsageMetering] Usage reported to Stripe', {
        tenantId: record.tenantId,
        metricName: record.metricName,
        quantity: record.quantity,
        stripeUsageRecordId: usageRecord.id,
      });
    } catch (error: any) {
      logger.error('[UsageMetering] Failed to report usage to Stripe', {
        recordId: record.id,
        metricName: record.metricName,
        error: error.message,
      });
      // Don't throw - usage is already recorded locally
    }
  }

  /**
   * Get usage summary for a tenant
   */
  async getUsageSummary(
    tenantId: string,
    periodStart?: Date,
    periodEnd?: Date
  ): Promise<UsageSummary[]> {
    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      // Get current subscription and plan
      const subscription = await this.subscriptionService.getCurrentSubscription(tenantId);
      if (!subscription) {
        return [];
      }

      // Use subscription period if not specified
      const start = periodStart || subscription.currentPeriodStart;
      const end = periodEnd || subscription.currentPeriodEnd;

      // Get usage aggregated by metric
      const result = await this.pool.query(
        `SELECT
          metric_name,
          SUM(quantity) as total_usage
         FROM usage_records
         WHERE tenantId = $1
           AND timestamp >= $2
           AND timestamp < $3
         GROUP BY metric_name`,
        [tenantId, start, end]
      );

      // Get plan limits
      const plan = await this.subscriptionService.getPlan(subscription.planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      const summaries: UsageSummary[] = result.rows.map(row => {
        const metricName = row.metric_name;
        const totalUsage = parseInt(row.total_usage);
        const limit = plan.limits[metricName] || 0;
        const percentage = limit > 0 ? (totalUsage / limit) * 100 : 0;
        const isOverage = limit > 0 && limit !== -1 && totalUsage > limit;
        const overageAmount = isOverage ? totalUsage - limit : 0;

        return {
          metricName,
          totalUsage,
          limit,
          percentage,
          isOverage,
          overageAmount,
          periodStart: start,
          periodEnd: end,
        };
      });

      logger.info('[UsageMetering] Retrieved usage summary', {
        tenantId,
        periodStart: start,
        periodEnd: end,
        metricsCount: summaries.length,
      });

      return summaries;
    } catch (error: any) {
      logger.error('[UsageMetering] Failed to get usage summary', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to get usage summary');
    }
  }

  /**
   * Get detailed usage records
   */
  async getUsageRecords(
    tenantId: string,
    options: {
      metricName?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ records: UsageRecord[]; total: number }> {
    const { metricName, startDate, endDate, limit = 100, offset = 0 } = options;

    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      let query = `
        SELECT
          id, tenantId, subscription_id, metric_name, quantity,
          timestamp, metadata, reported_to_stripe, stripe_usage_record_id,
          created_at
        FROM usage_records
        WHERE tenantId = $1
      `;

      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (metricName) {
        query += ` AND metric_name = $${paramIndex}`;
        params.push(metricName);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND timestamp >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND timestamp < $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.pool.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM usage_records WHERE tenantId = $1';
      const countParams: any[] = [tenantId];
      let countParamIndex = 2;

      if (metricName) {
        countQuery += ` AND metric_name = $${countParamIndex}`;
        countParams.push(metricName);
        countParamIndex++;
      }

      if (startDate) {
        countQuery += ` AND timestamp >= $${countParamIndex}`;
        countParams.push(startDate);
        countParamIndex++;
      }

      if (endDate) {
        countQuery += ` AND timestamp < $${countParamIndex}`;
        countParams.push(endDate);
      }

      const countResult = await this.pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      const records = result.rows.map(row => this.mapRowToUsageRecord(row));

      logger.info('[UsageMetering] Retrieved usage records', {
        tenantId,
        count: records.length,
        total,
        metricName,
      });

      return { records, total };
    } catch (error: any) {
      logger.error('[UsageMetering] Failed to get usage records', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to get usage records');
    }
  }

  /**
   * Check if tenant is within usage limit for a metric
   */
  async checkUsageLimit(
    tenantId: string,
    metricName: string,
    additionalUsage: number = 0
  ): Promise<{
    withinLimit: boolean;
    currentUsage: number;
    limit: number;
    available: number;
  }> {
    try {
      if (!tenantId || !metricName) {
        throw new Error('tenantId and metricName are required');
      }

      const subscription = await this.subscriptionService.getCurrentSubscription(tenantId);
      if (!subscription) {
        return {
          withinLimit: false,
          currentUsage: 0,
          limit: 0,
          available: 0,
        };
      }

      const plan = await this.subscriptionService.getPlan(subscription.planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      const limit = plan.limits[metricName];
      if (limit === undefined || limit === null) {
        // No limit set - allow unlimited
        return {
          withinLimit: true,
          currentUsage: 0,
          limit: -1,
          available: -1,
        };
      }

      if (limit === -1) {
        // Unlimited
        return {
          withinLimit: true,
          currentUsage: 0,
          limit: -1,
          available: -1,
        };
      }

      // Get current usage for this period
      const result = await this.pool.query(
        `SELECT SUM(quantity) as total_usage
         FROM usage_records
         WHERE tenantId = $1
           AND metric_name = $2
           AND timestamp >= $3
           AND timestamp < $4`,
        [
          tenantId,
          metricName,
          subscription.currentPeriodStart,
          subscription.currentPeriodEnd,
        ]
      );

      const currentUsage = parseInt(result.rows[0].total_usage || '0');
      const projectedUsage = currentUsage + additionalUsage;
      const withinLimit = projectedUsage <= limit;
      const available = limit - currentUsage;

      logger.info('[UsageMetering] Checked usage limit', {
        tenantId,
        metricName,
        currentUsage,
        limit,
        withinLimit,
        available,
      });

      return {
        withinLimit,
        currentUsage,
        limit,
        available: Math.max(0, available),
      };
    } catch (error: any) {
      logger.error('[UsageMetering] Failed to check usage limit', {
        tenantId,
        metricName,
        error: error.message,
      });
      throw new Error('Failed to check usage limit');
    }
  }

  /**
   * Reset usage for a new billing period (called by cron or webhook)
   */
  async resetUsageForNewPeriod(tenantId: string): Promise<void> {
    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      // Archive old usage records (optional - keep for historical data)
      // For now, we just log the reset
      logger.info('[UsageMetering] Usage period reset', {
        tenantId,
        timestamp: new Date(),
      });

      // Usage records are kept for historical purposes
      // Current period usage is calculated by querying within period dates
    } catch (error: any) {
      logger.error('[UsageMetering] Failed to reset usage', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to reset usage');
    }
  }

  /**
   * Batch record usage (for efficiency)
   */
  async batchRecordUsage(
    records: RecordUsageParams[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const record of records) {
      try {
        await this.recordUsage(record);
        success++;
      } catch (error: any) {
        logger.error('[UsageMetering] Failed to record usage in batch', {
          tenantId: record.tenantId,
          metricName: record.metricName,
          error: error.message,
        });
        failed++;
      }
    }

    logger.info('[UsageMetering] Batch usage recording completed', {
      total: records.length,
      success,
      failed,
    });

    return { success, failed };
  }

  /**
   * Get usage trends (daily aggregation)
   */
  async getUsageTrends(
    tenantId: string,
    metricName: string,
    days: number = 30
  ): Promise<Array<{ date: string; usage: number }>> {
    try {
      if (!tenantId || !metricName) {
        throw new Error('tenantId and metricName are required');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await this.pool.query(
        `SELECT
          DATE(timestamp) as date,
          SUM(quantity) as usage
         FROM usage_records
         WHERE tenantId = $1
           AND metric_name = $2
           AND timestamp >= $3
         GROUP BY DATE(timestamp)
         ORDER BY date ASC`,
        [tenantId, metricName, startDate]
      );

      const trends = result.rows.map(row => ({
        date: row.date,
        usage: parseInt(row.usage),
      }));

      logger.info('[UsageMetering] Retrieved usage trends', {
        tenantId,
        metricName,
        days,
        dataPoints: trends.length,
      });

      return trends;
    } catch (error: any) {
      logger.error('[UsageMetering] Failed to get usage trends', {
        tenantId,
        metricName,
        error: error.message,
      });
      throw new Error('Failed to get usage trends');
    }
  }

  /**
   * Map database row to UsageRecord
   */
  private mapRowToUsageRecord(row: any): UsageRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      subscriptionId: row.subscription_id,
      metricName: row.metric_name,
      quantity: row.quantity,
      timestamp: row.timestamp,
      metadata: row.metadata,
      reportedToStripe: row.reported_to_stripe,
      stripeUsageRecordId: row.stripe_usage_record_id,
      createdAt: row.created_at,
    };
  }
}
