# Alert Routing Webhook Setup - Quickstart

**Version**: 1.0
**Last Updated**: 2025-11-11
**Status**: Production Ready

## Overview

This guide provides quick setup instructions for ClientForge CRM's alert routing webhooks.

## Prerequisites

- Redis running (already configured)
- PagerDuty account (optional, for critical alerts)
- Slack workspace (optional, for major alerts)
- Email service (optional, for daily digest)

## 5-Minute Setup

### 1. PagerDuty (Critical Alerts)

**Get Routing Key**:
1. Go to PagerDuty → Services → Your Service
2. Click "Integrations" → "Add Integration"
3. Select "Events API V2"
4. Copy the Integration Key

**Configure**:
```bash
# Add to .env
PAGERDUTY_ROUTING_KEY=<your-integration-key>
```

**Test**:
```bash
npm run chaos:db
# Check PagerDuty for new incident
```

### 2. Slack (Major Alerts)

**Get Webhook URL**:
1. Go to https://api.slack.com/apps
2. Create New App → From scratch
3. Add "Incoming Webhooks" feature
4. Activate webhooks
5. Add to workspace
6. Copy webhook URL

**Configure**:
```bash
# Add to .env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_ALERT_CHANNEL=#alerts-production
```

**Test**:
```bash
curl -X POST $SLACK_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"text":"Test alert from ClientForge CRM"}'
```

### 3. Daily Digest (Minor Alerts)

**Configure** (already working with Redis):
```bash
# Add to .env (optional, defaults shown)
ENABLE_ERROR_DIGEST=true
ERROR_DIGEST_KEY_PREFIX=error_digest
DIGEST_EMAIL_RECIPIENTS=ops@clientforge.com
```

**Schedule Job**:

**Linux/Mac**:
```bash
crontab -e
# Add line:
0 9 * * * cd /path/to/clientforge-crm && npm run errors:digest
```

**Windows**:
```powershell
$action = New-ScheduledTaskAction -Execute "npm" -Argument "run errors:digest" -WorkingDirectory "D:\clientforge-crm"
$trigger = New-ScheduledTaskTrigger -Daily -At 9am
Register-ScheduledTask -Action $action -Trigger $trigger -TaskName "ClientForge Error Digest"
```

**Test**:
```bash
npm run errors:digest
```

## Verification

Check that everything works:

```bash
# 1. Run error system check
npm run errors:check
# ✅ Should pass: lint, gen, grep

# 2. Trigger test alerts
npm run chaos:db          # → PagerDuty
npm run chaos:elasticsearch  # → Slack

# 3. Check logs
grep "\[ALERT-" logs/app.log | tail -20

# 4. Check Redis digest data
redis-cli ZREVRANGE error_digest:daily:$(date +%Y-%m-%d) 0 -1 WITHSCORES
```

## Environment Variables Summary

```bash
# PagerDuty (optional)
PAGERDUTY_ROUTING_KEY=your-integration-key
PAGERDUTY_API_URL=https://events.pagerduty.com/v2/enqueue

# Slack (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_ALERT_CHANNEL=#alerts-production

# Daily Digest (optional)
ENABLE_ERROR_DIGEST=true
ERROR_DIGEST_KEY_PREFIX=error_digest
DIGEST_EMAIL_RECIPIENTS=ops@clientforge.com
```

## Alert Routing Matrix

| Severity | Error Example | Destination | Time to Alert |
|----------|---------------|-------------|---------------|
| Critical | DB-001 (Database down) | PagerDuty | < 60 seconds |
| Major | API-003 (Integration failure) | Slack | < 60 seconds |
| Minor | VALID-001 (Validation error) | Daily Digest | Next day 9 AM |

## Troubleshooting

**PagerDuty not receiving alerts?**
```bash
# Check config
echo $PAGERDUTY_ROUTING_KEY

# Check logs
grep "ALERT-PAGER" logs/app.log | grep "Failed"

# Test manually
curl -X POST https://events.pagerduty.com/v2/enqueue \
  -H "Content-Type: application/json" \
  -d '{
    "routing_key": "YOUR_KEY",
    "event_action": "trigger",
    "payload": {
      "summary": "Test",
      "severity": "critical",
      "source": "manual-test"
    }
  }'
```

**Slack not receiving alerts?**
```bash
# Check config
echo $SLACK_WEBHOOK_URL

# Check logs
grep "ALERT-SLACK" logs/app.log | grep "Failed"

# Test manually
curl -X POST $SLACK_WEBHOOK_URL \
  -H "Content-Type: application/json" \
  -d '{"text":"Test"}'
```

**Digest not working?**
```bash
# Check Redis
redis-cli ping

# Check digest data
redis-cli KEYS "error_digest:*"

# Run manually
npm run errors:digest
```

## Next Steps

1. ✅ Configure PagerDuty and Slack webhooks
2. ✅ Schedule daily digest job
3. ✅ Test all alert routes
4. ✅ Review [ALERT_ROUTING_GUIDE.md](./ALERT_ROUTING_GUIDE.md) for details
5. ✅ Set up monitoring dashboards in Grafana

## Support

- **Documentation**: [ALERT_ROUTING_GUIDE.md](./ALERT_ROUTING_GUIDE.md)
- **Implementation**: [alert-router.ts](../../backend/utils/errors/alert-router.ts)
- **Session Log**: [2025-11-11-alert-routing-webhooks.md](../../logs/session-logs/2025-11-11-alert-routing-webhooks.md)

---

**Setup Time**: 5 minutes
**Status**: Production Ready
**Version**: 1.0
