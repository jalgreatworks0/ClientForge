/**
 * Alert Routing
 *
 * Routes error alerts based on severity:
 * - critical → PagerDuty
 * - major → Slack
 * - minor → Daily digest
 */

import { logger } from "../logging/logger";
import type { ProblemDetails } from "./problem-details";
import axios from "axios";

export type Severity = "minor" | "major" | "critical";

interface AlertConfig {
  pagerduty?: {
    enabled: boolean;
    routingKey?: string;
    apiUrl?: string;
  };
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
    channel?: string;
  };
  digest?: {
    enabled: boolean;
    redisKeyPrefix?: string;
  };
}

// Load alert configuration from environment
const alertConfig: AlertConfig = {
  pagerduty: {
    enabled: !!process.env.PAGERDUTY_ROUTING_KEY,
    routingKey: process.env.PAGERDUTY_ROUTING_KEY,
    apiUrl: process.env.PAGERDUTY_API_URL || "https://events.pagerduty.com/v2/enqueue",
  },
  slack: {
    enabled: !!process.env.SLACK_WEBHOOK_URL,
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
    channel: process.env.SLACK_ALERT_CHANNEL || "#alerts-production",
  },
  digest: {
    enabled: process.env.ENABLE_ERROR_DIGEST !== "false",
    redisKeyPrefix: process.env.ERROR_DIGEST_KEY_PREFIX || "error_digest",
  },
};

/**
 * Route alert based on severity and error details
 *
 * @param problem - RFC 7807 Problem Details
 * @param severity - Error severity level
 */
export function routeAlert(problem: ProblemDetails, severity: Severity): void {
  // Fire and forget - don't block error handling on alerting
  if (severity === "critical") {
    // Route to PagerDuty
    sendToPager(problem).catch((err) =>
      logger.error("[ALERT-ROUTER] PagerDuty send failed", { error: err })
    );
  } else if (severity === "major") {
    // Route to Slack
    sendToSlack(problem).catch((err) =>
      logger.error("[ALERT-ROUTER] Slack send failed", { error: err })
    );
  } else {
    // Minor errors: Add to daily digest
    addToDailyDigest(problem).catch((err) =>
      logger.error("[ALERT-ROUTER] Digest add failed", { error: err })
    );
  }
}

/**
 * Send critical alert to PagerDuty
 */
async function sendToPager(problem: ProblemDetails): Promise<void> {
  // Always log for audit trail
  logger.warn("[ALERT-PAGER]", {
    errorId: problem.errorId,
    correlationId: problem.correlationId,
    path: problem.instance,
    tenantId: problem.tenantId,
    title: problem.title,
    detail: problem.detail,
    runbook: problem.runbook,
  });

  // Skip webhook if not configured
  if (!alertConfig.pagerduty?.enabled || !alertConfig.pagerduty?.routingKey) {
    logger.debug("[ALERT-PAGER] PagerDuty not configured, skipping webhook");
    return;
  }

  try {
    const payload = {
      routing_key: alertConfig.pagerduty.routingKey,
      event_action: "trigger" as const,
      dedup_key: `${problem.errorId}-${problem.correlationId}`,
      payload: {
        summary: `${problem.title} (${problem.errorId})`,
        severity: "critical" as const,
        source: problem.instance || "unknown",
        timestamp: new Date().toISOString(),
        custom_details: {
          error_id: problem.errorId,
          correlation_id: problem.correlationId,
          tenant_id: problem.tenantId || "N/A",
          runbook: problem.runbook || "N/A",
          detail: problem.detail,
          http_status: problem.status,
        },
      },
    };

    const response = await axios.post(
      alertConfig.pagerduty.apiUrl!,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000, // 5 second timeout
      }
    );

    logger.info("[ALERT-PAGER] Successfully sent to PagerDuty", {
      dedupKey: payload.dedup_key,
      responseStatus: response.data.status,
    });
  } catch (error) {
    logger.error("[ALERT-PAGER] Failed to send to PagerDuty", {
      error: error instanceof Error ? error.message : String(error),
      errorId: problem.errorId,
    });
    // Don't throw - alerting failure shouldn't break error handling
  }
}

/**
 * Send major alert to Slack
 */
async function sendToSlack(problem: ProblemDetails): Promise<void> {
  // Always log for audit trail
  logger.warn("[ALERT-SLACK]", {
    errorId: problem.errorId,
    correlationId: problem.correlationId,
    path: problem.instance,
    tenantId: problem.tenantId,
    title: problem.title,
  });

  // Skip webhook if not configured
  if (!alertConfig.slack?.enabled || !alertConfig.slack?.webhookUrl) {
    logger.debug("[ALERT-SLACK] Slack webhook not configured, skipping");
    return;
  }

  try {
    const payload = {
      channel: alertConfig.slack.channel,
      username: "ClientForge Error Bot",
      icon_emoji: ":warning:",
      text: `*${problem.title}* (${problem.errorId})`,
      attachments: [
        {
          color: "warning",
          fallback: `Error ${problem.errorId}: ${problem.title}`,
          fields: [
            {
              title: "Error ID",
              value: problem.errorId,
              short: true,
            },
            {
              title: "Correlation ID",
              value: problem.correlationId || "N/A",
              short: true,
            },
            {
              title: "HTTP Status",
              value: String(problem.status),
              short: true,
            },
            {
              title: "Tenant",
              value: problem.tenantId || "N/A",
              short: true,
            },
            {
              title: "Endpoint",
              value: problem.instance || "Unknown",
              short: false,
            },
            {
              title: "Detail",
              value: problem.detail || "No additional details",
              short: false,
            },
            {
              title: "Runbook",
              value: problem.runbook || "N/A",
              short: false,
            },
          ],
          footer: "ClientForge CRM",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await axios.post(
      alertConfig.slack.webhookUrl!,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 5000, // 5 second timeout
      }
    );

    if (response.status === 200 && response.data === "ok") {
      logger.info("[ALERT-SLACK] Successfully sent to Slack", {
        errorId: problem.errorId,
        channel: alertConfig.slack.channel,
      });
    } else {
      logger.warn("[ALERT-SLACK] Unexpected Slack response", {
        status: response.status,
        data: response.data,
      });
    }
  } catch (error) {
    logger.error("[ALERT-SLACK] Failed to send to Slack", {
      error: error instanceof Error ? error.message : String(error),
      errorId: problem.errorId,
    });
    // Don't throw - alerting failure shouldn't break error handling
  }
}

/**
 * Add minor error to daily digest
 */
async function addToDailyDigest(problem: ProblemDetails): Promise<void> {
  // Log for daily digest aggregation
  logger.info("[ALERT-DIGEST]", {
    errorId: problem.errorId,
    correlationId: problem.correlationId,
    path: problem.instance,
    tenantId: problem.tenantId,
  });

  // Skip Redis storage if not configured
  if (!alertConfig.digest?.enabled) {
    logger.debug("[ALERT-DIGEST] Digest storage not enabled");
    return;
  }

  try {
    // Lazy load Redis client
    const Redis = await import("ioredis");
    const redis = new Redis.default(process.env.REDIS_URL || "redis://localhost:6379");

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const keyPrefix = alertConfig.digest.redisKeyPrefix || "error_digest";

    // Increment error count for today
    await redis.zincrby(`${keyPrefix}:daily:${today}`, 1, problem.errorId);

    // Store error details (hash with last occurrence details)
    await redis.hset(`${keyPrefix}:details:${problem.errorId}`, {
      errorId: problem.errorId,
      title: problem.title,
      lastSeen: Date.now(),
      lastPath: problem.instance || "unknown",
      lastTenant: problem.tenantId || "N/A",
      lastCorrelationId: problem.correlationId || "N/A",
      httpStatus: problem.status,
      runbook: problem.runbook || "N/A",
    });

    // Set TTL of 7 days for digest data
    await redis.expire(`${keyPrefix}:daily:${today}`, 7 * 24 * 60 * 60);
    await redis.expire(`${keyPrefix}:details:${problem.errorId}`, 7 * 24 * 60 * 60);

    await redis.quit();

    logger.debug("[ALERT-DIGEST] Stored in Redis", {
      errorId: problem.errorId,
      date: today,
    });
  } catch (error) {
    logger.error("[ALERT-DIGEST] Failed to store in Redis", {
      error: error instanceof Error ? error.message : String(error),
      errorId: problem.errorId,
    });
    // Don't throw - digest failure shouldn't break error handling
  }
}

/**
 * Send daily digest email
 * (Called by scheduled job)
 */
export async function sendDailyDigest(): Promise<void> {
  if (!alertConfig.digest?.enabled) {
    logger.info("[ALERT-DIGEST] Digest not enabled, skipping");
    return;
  }

  try {
    const Redis = await import("ioredis");
    const redis = new Redis.default(process.env.REDIS_URL || "redis://localhost:6379");

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const keyPrefix = alertConfig.digest.redisKeyPrefix || "error_digest";
    const digestKey = `${keyPrefix}:daily:${yesterday}`;

    // Get all errors from yesterday with their counts
    const errorCounts = await redis.zrevrange(digestKey, 0, -1, "WITHSCORES");

    if (errorCounts.length === 0) {
      logger.info("[ALERT-DIGEST] No errors to report for", { date: yesterday });
      await redis.quit();
      return;
    }

    // Parse error counts
    const errors: Array<{ errorId: string; count: number }> = [];
    for (let i = 0; i < errorCounts.length; i += 2) {
      errors.push({
        errorId: errorCounts[i],
        count: parseInt(errorCounts[i + 1], 10),
      });
    }

    // Fetch details for each error
    const errorDetails = await Promise.all(
      errors.map(async (e) => {
        const details = await redis.hgetall(`${keyPrefix}:details:${e.errorId}`);
        return { ...e, ...details };
      })
    );

    await redis.quit();

    // Format digest message
    const totalErrors = errors.reduce((sum, e) => sum + e.count, 0);
    const digestMessage = formatDigestMessage(yesterday, totalErrors, errorDetails);

    // Log digest (can be extended to send email)
    logger.info("[ALERT-DIGEST] Daily digest generated", {
      date: yesterday,
      totalErrors,
      uniqueErrors: errors.length,
      digest: digestMessage,
    });

    // TODO: Send email via SendGrid/Nodemailer
    // Example:
    // await emailService.send({
    //   to: process.env.DIGEST_EMAIL_RECIPIENTS || "ops@clientforge.com",
    //   subject: `ClientForge Error Digest - ${yesterday}`,
    //   text: digestMessage,
    //   html: formatDigestHTML(yesterday, totalErrors, errorDetails),
    // });

  } catch (error) {
    logger.error("[ALERT-DIGEST] Failed to generate daily digest", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Format digest message for email/logging
 */
function formatDigestMessage(
  date: string,
  totalErrors: number,
  errorDetails: any[]
): string {
  let message = `ClientForge CRM - Error Digest for ${date}\n\n`;
  message += `Total Errors: ${totalErrors}\n`;
  message += `Unique Error Types: ${errorDetails.length}\n\n`;
  message += `Error Breakdown:\n`;
  message += `${"=".repeat(80)}\n\n`;

  errorDetails.forEach((error) => {
    message += `${error.errorId}: ${error.title || "Unknown"}\n`;
    message += `  Count: ${error.count}\n`;
    message += `  Last Seen: ${new Date(parseInt(error.lastSeen)).toISOString()}\n`;
    message += `  Last Path: ${error.lastPath}\n`;
    message += `  HTTP Status: ${error.httpStatus}\n`;
    if (error.runbook && error.runbook !== "N/A") {
      message += `  Runbook: ${error.runbook}\n`;
    }
    message += `\n`;
  });

  return message;
}
