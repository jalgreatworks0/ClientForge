# Chaos Engineering Scripts

**⚠️ DEV/STAGING ONLY - DO NOT RUN IN PRODUCTION**

## Overview

Chaos engineering scripts to test error handling, alerting, and recovery mechanisms in controlled failure scenarios.

## Available Tests

### Database Outage
**Script**: `simulate-db-outage.ts`
**Command**: `npm run chaos:db`
**Duration**: 60 seconds
**Expected Error**: DB-001 (PostgresUnavailable)
**Expected Alert**: PagerDuty (critical)

**What it tests**:
- Database connection error handling
- Retry logic with exponential backoff
- Critical alert routing to PagerDuty
- Automatic reconnection after recovery
- Application resilience during outage

### Elasticsearch Outage
**Script**: `simulate-elasticsearch-down.ts`
**Command**: `npm run chaos:elasticsearch`
**Duration**: 60 seconds
**Expected Error**: ES-003 (ElasticsearchUnavailable)
**Expected Alert**: PagerDuty (critical)

**What it tests**:
- Search service degradation
- Graceful fallback behavior
- Critical alert routing
- Service recovery
- Index health monitoring

## Usage

### Prerequisites
1. Docker and docker-compose installed
2. Development or staging environment (`NODE_ENV != production`)
3. Services running via `npm run docker:dev`
4. Monitoring/alerting configured

### Running a Test

```bash
# 1. Ensure services are healthy
npm run verify:services

# 2. Run chaos test
npm run chaos:db

# 3. Monitor logs in real-time
docker logs clientforge-crm-backend-1 -f

# 4. Check MongoDB logs for errors
mongo clientforge_dev
db.app_logs.find({ "meta.id": "DB-001" }).sort({ timestamp: -1 }).limit(10).pretty()

# 5. Verify PagerDuty incident created

# 6. Wait for automatic recovery (60 seconds)

# 7. Verify service health restored
npm run verify:services
```

## Safety Checks

All scripts include safety checks:
- ✅ Environment check (`NODE_ENV != production`)
- ✅ Automatic recovery (services restart after 60s)
- ✅ Graceful failure handling
- ✅ Clear console output with status

## What to Monitor

### During Outage
1. **Application Logs**:
   - Error ID appears (e.g., DB-001)
   - Correlation IDs for request tracking
   - Fingerprints for deduplication
   - Retry attempts logged

2. **Alerting**:
   - PagerDuty incident created
   - Severity matches error (critical)
   - Runbook link included
   - Correlation ID in alert

3. **Observability**:
   - Prometheus metrics spike
   - Grafana dashboard shows red
   - Traces show error spans
   - Logs include OTel trace IDs

### After Recovery
1. **Application Behavior**:
   - Automatic reconnection
   - Error rate returns to zero
   - Retry logic successful
   - Services marked healthy

2. **Incident Resolution**:
   - PagerDuty auto-resolves (or manual close)
   - Post-mortem data collected
   - MTTR measured
   - Runbook effectiveness validated

## Creating New Tests

### Template
```typescript
#!/usr/bin/env tsx
import { execSync } from "node:child_process";

const OUTAGE_DURATION_MS = 60000;

console.log("⚠️  CHAOS ENGINEERING: [Service Name] Outage");
console.log("Expected Error: [ERROR-ID]");

// Safety check
if (process.env.NODE_ENV === "production") {
  console.error("❌ Cannot run in production!");
  process.exit(1);
}

try {
  console.log("🛑 Stopping service...");
  execSync("docker compose stop [service-name]", { stdio: "inherit" });

  setTimeout(() => {
    console.log("🔄 Restarting service...");
    execSync("docker compose start [service-name]", { stdio: "inherit" });
  }, OUTAGE_DURATION_MS);
} catch (error) {
  console.error("❌ Failed:", error);
  process.exit(1);
}
```

### Test Ideas
- **Redis Outage**: Test cache/session failure (RDS-001)
- **RabbitMQ Outage**: Test queue worker failure (QUEUE-001)
- **MinIO Outage**: Test file storage failure (STG-001)
- **High Load**: Stress test with k6 to trigger rate limits (RL-001)
- **Network Partition**: Use `docker network disconnect`
- **Slow Queries**: Inject artificial delays in database

## Metrics to Track

### Error Handling
- Time to first error detection: < 5 seconds
- Error fingerprint consistency: 100%
- Correlation ID presence: 100%
- Sensitive data redaction: 100%

### Alerting
- Time to alert: < 60 seconds (critical)
- Alert routing accuracy: 100%
- Runbook link included: 100%
- False positive rate: < 1%

### Recovery
- MTTR (Mean Time To Recovery): < 2 minutes
- Automatic recovery success: > 95%
- Data loss: 0%
- Service degradation duration: = outage duration

## Integration with CI/CD

### Scheduled Chaos Tests
Run chaos tests in staging on a schedule:

```yaml
# .github/workflows/chaos-test.yml
name: Chaos Engineering
on:
  schedule:
    - cron: '0 2 * * 1' # Every Monday at 2 AM
  workflow_dispatch:

jobs:
  chaos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run docker:dev
      - run: npm run chaos:db
      - run: npm run verify:services
```

## References

- [Error Registry](../../config/errors/error-registry.yaml)
- [Runbooks](../../docs/errors/runbooks/)
- [Alert Routing](../../backend/utils/errors/alert-router.ts)
- [Observability Guide](../../docs/observability/)

---

**Last Updated**: 2025-11-11
**Owner**: DevOps Team
**Environment**: Dev/Staging Only
