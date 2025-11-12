# Alert Routing Guide

**Status**: ✅ Production Ready
**Date**: 2025-11-11
**Version**: v1.0

## Overview

ClientForge CRM implements severity-based alert routing to ensure critical errors reach on-call engineers immediately while preventing alert fatigue for minor issues.

## Routing Strategy

| Severity | Destination | Delivery Time | Use Case |
|----------|-------------|---------------|----------|
| **Critical** | PagerDuty | < 60 seconds | Database outages, service down, data loss risk |
| **Major** | Slack | < 60 seconds | API errors, integration failures, degraded performance |
| **Minor** | Daily Digest | Next day 9 AM | Validation errors, expected failures, rate limit hits |

## Architecture

```
┌─────────────────┐
│  Error Handler  │
│   (Enhanced)    │
└────────┬────────┘
         │
         v
┌─────────────────┐
│  Alert Router   │
│  (Severity-     │
│   Based)        │
└────────┬────────┘
         │
    ┌────┴─────┬──────────────┐
    v          v              v
┌───────┐  ┌───────┐     ┌─────────┐
│Pager  │  │Slack  │     │  Redis  │
│Duty   │  │Webhook│     │ Digest  │
└───────┘  └───────┘     └─────────┘
                              │
                              v
                         ┌─────────┐
                         │  Email  │
                         │ (Daily) │
                         └─────────┘
```

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# PagerDuty Configuration (Critical Alerts)
PAGERDUTY_ROUTING_KEY=your-pagerduty-routing-key
PAGERDUTY_API_URL=https://events.pagerduty.com/v2/enqueue

# Slack Configuration (Major Alerts)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_ALERT_CHANNEL=#alerts-production

# Daily Digest Configuration (Minor Alerts)
ENABLE_ERROR_DIGEST=true
ERROR_DIGEST_KEY_PREFIX=error_digest
DIGEST_EMAIL_RECIPIENTS=ops@clientforge.com
```

### PagerDuty Setup

1. **Create Integration**:
   - Go to PagerDuty → Services → Your Service
   - Click "Integrations" → "Add Integration"
   - Select "Events API V2"
   - Copy the "Integration Key" (this is your routing key)

2. **Configure Environment**:
   ```bash
   PAGERDUTY_ROUTING_KEY=<your-integration-key>
   ```

3. **Test Integration**:
   ```bash
   # Trigger a critical error to test PagerDuty
   npm run chaos:db
   ```

4. **Verify**:
   - Check PagerDuty for triggered incident
   - Verify deduplication with `dedup_key` format: `{errorId}-{correlationId}`
   - Confirm custom details include runbook link

### Slack Setup

1. **Create Incoming Webhook**:
   - Go to Slack → Apps → Incoming Webhooks
   - Click "Add to Slack"
   - Select channel (e.g., `#alerts-production`)
   - Copy webhook URL

2. **Configure Environment**:
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX
   SLACK_ALERT_CHANNEL=#alerts-production
   ```

3. **Test Integration**:
   ```bash
   # Trigger a major error to test Slack
   curl -X GET http://localhost:3000/api/v1/nonexistent-endpoint
   ```

4. **Verify**:
   - Check Slack channel for message
   - Verify rich attachments with error details
   - Confirm runbook links are clickable

### Daily Digest Setup

1. **Redis Configuration** (already configured):
   ```bash
   REDIS_URL=redis://localhost:6379
   ENABLE_ERROR_DIGEST=true
   ERROR_DIGEST_KEY_PREFIX=error_digest
   ```

2. **Schedule Digest Job**:

   **Linux/Mac (cron)**:
   ```bash
   # Edit crontab
   crontab -e

   # Add line to run daily at 9 AM
   0 9 * * * cd /path/to/clientforge-crm && npm run errors:digest >> /var/log/error-digest.log 2>&1
   ```

   **Windows (Task Scheduler)**:
   ```powershell
   # Create scheduled task
   $action = New-ScheduledTaskAction -Execute "npm" -Argument "run errors:digest" -WorkingDirectory "D:\clientforge-crm"
   $trigger = New-ScheduledTaskTrigger -Daily -At 9am
   Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "ClientForge Error Digest"
   ```

3. **Manual Test**:
   ```bash
   npm run errors:digest
   ```

## Alert Payload Formats

### PagerDuty Event

```json
{
  "routing_key": "your-routing-key",
  "event_action": "trigger",
  "dedup_key": "DB-001-req_7h3f8a2d",
  "payload": {
    "summary": "PostgresUnavailable (DB-001)",
    "severity": "critical",
    "source": "/api/v1/contacts",
    "timestamp": "2025-11-11T10:30:00.000Z",
    "custom_details": {
      "error_id": "DB-001",
      "correlation_id": "req_7h3f8a2d-9c4e-4b7a-8f3d-1a2b3c4d5e6f",
      "tenant_id": "org_123",
      "runbook": "docs/errors/runbooks/DB-001.md",
      "detail": "Database connection refused",
      "http_status": 503
    }
  }
}
```

### Slack Message

```json
{
  "channel": "#alerts-production",
  "username": "ClientForge Error Bot",
  "icon_emoji": ":warning:",
  "text": "*PostgresUnavailable* (DB-001)",
  "attachments": [
    {
      "color": "warning",
      "fallback": "Error DB-001: PostgresUnavailable",
      "fields": [
        {"title": "Error ID", "value": "DB-001", "short": true},
        {"title": "Correlation ID", "value": "req_7h3f8a2d...", "short": true},
        {"title": "HTTP Status", "value": "503", "short": true},
        {"title": "Tenant", "value": "org_123", "short": true},
        {"title": "Endpoint", "value": "/api/v1/contacts", "short": false},
        {"title": "Detail", "value": "Database connection refused", "short": false},
        {"title": "Runbook", "value": "docs/errors/runbooks/DB-001.md", "short": false}
      ],
      "footer": "ClientForge CRM",
      "ts": 1731322200
    }
  ]
}
```

### Daily Digest Email

```
ClientForge CRM - Error Digest for 2025-11-10

Total Errors: 142
Unique Error Types: 8

Error Breakdown:
================================================================================

VALID-001: InvalidRequestFormat
  Count: 85
  Last Seen: 2025-11-10T23:45:12.000Z
  Last Path: /api/v1/contacts
  HTTP Status: 400

DB-002: PostgresQueryTimeout
  Count: 23
  Last Seen: 2025-11-10T22:15:30.000Z
  Last Path: /api/v1/reports/analytics
  HTTP Status: 504
  Runbook: docs/errors/runbooks/DB-002.md

...
```

## Redis Data Structure

### Daily Error Counts

```bash
# Sorted set: error_digest:daily:{date}
# Key format: error_digest:daily:2025-11-10
# Members: Error IDs
# Scores: Occurrence count

redis> ZREVRANGE error_digest:daily:2025-11-10 0 -1 WITHSCORES
1) "VALID-001"
2) "85"
3) "DB-002"
4) "23"
```

### Error Details

```bash
# Hash: error_digest:details:{errorId}
# Stores last occurrence details for each error

redis> HGETALL error_digest:details:DB-001
 1) "errorId"
 2) "DB-001"
 3) "title"
 4) "PostgresUnavailable"
 5) "lastSeen"
 6) "1731368712000"
 7) "lastPath"
 8) "/api/v1/contacts"
 9) "lastTenant"
10) "org_123"
11) "lastCorrelationId"
12) "req_7h3f8a2d-9c4e-4b7a-8f3d-1a2b3c4d5e6f"
13) "httpStatus"
14) "503"
15) "runbook"
16) "docs/errors/runbooks/DB-001.md"
```

### TTL Policy

All digest data has 7-day TTL:
```bash
redis> TTL error_digest:daily:2025-11-10
604800  # 7 days in seconds
```

## Monitoring Alert System Health

### Check PagerDuty Status

```bash
# View recent PagerDuty logs
grep "\[ALERT-PAGER\]" logs/app.log | tail -20

# Count PagerDuty alerts today
grep "\[ALERT-PAGER\]" logs/app.log | grep "$(date +%Y-%m-%d)" | wc -l
```

### Check Slack Status

```bash
# View recent Slack logs
grep "\[ALERT-SLACK\]" logs/app.log | tail -20

# Count Slack alerts today
grep "\[ALERT-SLACK\]" logs/app.log | grep "$(date +%Y-%m-%d)" | wc -l
```

### Check Digest Data

```bash
# Query Redis for today's digest
redis-cli ZREVRANGE error_digest:daily:$(date +%Y-%m-%d) 0 -1 WITHSCORES

# Count unique errors today
redis-cli ZCARD error_digest:daily:$(date +%Y-%m-%d)

# Get total error count today
redis-cli ZREVRANGE error_digest:daily:$(date +%Y-%m-%d) 0 -1 WITHSCORES | \
  awk 'NR%2==0 {sum+=$1} END {print sum}'
```

## Troubleshooting

### PagerDuty Not Receiving Alerts

1. **Check Configuration**:
   ```bash
   echo $PAGERDUTY_ROUTING_KEY
   # Should output your routing key
   ```

2. **Verify Logs**:
   ```bash
   grep "ALERT-PAGER.*Failed" logs/app.log
   # Look for error messages
   ```

3. **Test Manually**:
   ```bash
   curl -X POST https://events.pagerduty.com/v2/enqueue \
     -H "Content-Type: application/json" \
     -d '{
       "routing_key": "YOUR_KEY",
       "event_action": "trigger",
       "payload": {
         "summary": "Test Alert",
         "severity": "critical",
         "source": "manual-test"
       }
     }'
   ```

4. **Common Issues**:
   - Invalid routing key → Check PagerDuty integration settings
   - Network timeout → Check firewall rules
   - Rate limiting → PagerDuty has rate limits per service

### Slack Not Receiving Alerts

1. **Check Configuration**:
   ```bash
   echo $SLACK_WEBHOOK_URL
   # Should start with https://hooks.slack.com/
   ```

2. **Verify Logs**:
   ```bash
   grep "ALERT-SLACK.*Failed" logs/app.log
   ```

3. **Test Manually**:
   ```bash
   curl -X POST $SLACK_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"text": "Test Alert from ClientForge CRM"}'
   ```

4. **Common Issues**:
   - Webhook expired → Regenerate in Slack settings
   - Channel not found → Update SLACK_ALERT_CHANNEL
   - Message too large → Slack has 3000 char limit per field

### Daily Digest Not Working

1. **Check Redis Connection**:
   ```bash
   redis-cli ping
   # Should return PONG
   ```

2. **Verify Data Exists**:
   ```bash
   redis-cli KEYS "error_digest:*"
   # Should list digest keys
   ```

3. **Check Cron/Scheduled Task**:
   ```bash
   # Linux/Mac
   crontab -l | grep error-digest

   # Windows
   Get-ScheduledTask | Where-Object {$_.TaskName -like "*Error*"}
   ```

4. **Run Manual Test**:
   ```bash
   npm run errors:digest
   # Should generate digest and log output
   ```

## Best Practices

### 1. Alert Severity Guidelines

**Use Critical (PagerDuty) for**:
- Database connectivity loss
- Service completely down
- Data loss or corruption risk
- Security breaches

**Use Major (Slack) for**:
- API endpoint failures
- Integration errors (Stripe, SendGrid, etc.)
- High error rates (> 10% of requests)
- Performance degradation

**Use Minor (Digest) for**:
- Validation errors
- Rate limit hits
- Expected failures (e.g., invalid API keys)
- Client-side errors

### 2. Avoiding Alert Fatigue

- Use error fingerprinting for deduplication
- Set up PagerDuty rate limiting per service
- Review digest weekly and adjust severity levels
- Use circuit breakers to prevent alert storms

### 3. Runbook Links

Always include runbook links in error registry:
```yaml
- id: DB-001
  runbook: docs/errors/runbooks/DB-001.md
```

Runbooks should include:
- Root cause analysis steps
- Resolution procedures
- Escalation contacts
- Known issues and workarounds

### 4. Testing Alert Routing

Test alert routing in staging before production:

```bash
# Set NODE_ENV=staging
export NODE_ENV=staging

# Run chaos tests
npm run chaos:db          # Triggers critical alert
npm run chaos:elasticsearch  # Triggers major alert

# Verify alerts received in test channels
```

## Integration with Observability Stack

### Grafana Dashboards

Query errors by alert type:

```promql
# Count critical errors (PagerDuty)
sum(rate(http_errors_total{severity="critical"}[5m]))

# Count major errors (Slack)
sum(rate(http_errors_total{severity="major"}[5m]))

# Count minor errors (Digest)
sum(rate(http_errors_total{severity="minor"}[5m]))
```

### Loki Queries

```logql
# All PagerDuty alerts
{job="clientforge"} |= "[ALERT-PAGER]"

# Slack alerts for specific tenant
{job="clientforge"} |= "[ALERT-SLACK]" | json | tenant_id="org_123"

# Digest entries for specific error
{job="clientforge"} |= "[ALERT-DIGEST]" | json | errorId="VALID-001"
```

### Tempo Traces

Link traces to alerts via correlation ID:
```
trace_id=req_7h3f8a2d-9c4e-4b7a-8f3d-1a2b3c4d5e6f
```

## Future Enhancements

### 1. Email Integration

Add email support for daily digest:

```typescript
import { SendGrid } from "@sendgrid/mail";

const sg = new SendGrid(process.env.SENDGRID_API_KEY);
await sg.send({
  to: process.env.DIGEST_EMAIL_RECIPIENTS,
  from: "alerts@clientforge.com",
  subject: `Error Digest - ${date}`,
  text: digestMessage,
  html: formatDigestHTML(date, totalErrors, errorDetails),
});
```

### 2. Teams/Discord Support

Add Microsoft Teams or Discord webhooks:

```typescript
// Teams
await axios.post(process.env.TEAMS_WEBHOOK_URL, {
  "@type": "MessageCard",
  title: problem.title,
  text: problem.detail,
  // ...
});

// Discord
await axios.post(process.env.DISCORD_WEBHOOK_URL, {
  username: "ClientForge Error Bot",
  content: `**${problem.title}** (${problem.errorId})`,
  // ...
});
```

### 3. Auto-Resolution

Implement auto-resolution for PagerDuty:

```typescript
// After service recovery
await pagerduty.resolve({
  dedup_key: `${errorId}-${correlationId}`,
  event_action: "resolve",
});
```

### 4. Alert Grouping

Group similar errors in Slack threads:

```typescript
// Store thread_ts in Redis
const threadTs = await redis.get(`alert_thread:${errorId}`);

await slack.postMessage({
  channel: "#alerts-production",
  thread_ts: threadTs, // Reply to existing thread
  text: "Same error occurred again",
});
```

## References

- [Alert Router Implementation](../../backend/utils/errors/alert-router.ts)
- [Enhanced Error Handler](../../backend/api/rest/v1/middleware/error-handler-enhanced.ts)
- [Error Registry](../../config/errors/error-registry.yaml)
- [RFC 7807 Upgrade Guide](./RFC7807_UPGRADE_GUIDE.md)
- [PagerDuty Events API v2 Docs](https://developer.pagerduty.com/docs/ZG9jOjExMDI5NTgw-events-api-v2-overview)
- [Slack Incoming Webhooks Docs](https://api.slack.com/messaging/webhooks)

---

**Last Updated**: 2025-11-11
**Version**: 1.0
**Status**: Production Ready
**Owner**: Backend Team
