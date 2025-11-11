# Operations Runbook - ClientForge CRM

**Version**: 1.0
**Last Updated**: 2025-11-10
**Maintainer**: Engineering Team

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Dashboard Locations](#dashboard-locations)
3. [Common Operations](#common-operations)
4. [Alert Remediation](#alert-remediation)
5. [Database Maintenance](#database-maintenance)
6. [Backup & Recovery](#backup--recovery)
7. [Incident Response](#incident-response)
8. [Performance Troubleshooting](#performance-troubleshooting)
9. [Queue Management](#queue-management)
10. [Elasticsearch Operations](#elasticsearch-operations)

---

## System Overview

### Architecture
- **Backend**: Node.js/Express (TypeScript)
- **Database**: PostgreSQL 15.14
- **Cache**: Redis (ioredis)
- **Search**: Elasticsearch 8.11.0
- **Queue**: BullMQ v3.15.8
- **Storage**: MinIO (dev) / Cloudflare R2 (prod)
- **Monitoring**: Prometheus + Grafana

### Key Services
- **API Server**: Port 3000 (default)
- **PostgreSQL**: Port 5432
- **Redis**: Port 6379
- **Elasticsearch**: Port 9200
- **Prometheus**: Port 9090
- **Grafana**: Port 3001

---

## Dashboard Locations

### Grafana Dashboards
- **Queue Dashboard**: http://grafana:3001/d/queue-metrics
  - Real-time queue health
  - Job counts (waiting, active, failed, DLQ)
  - Lag monitoring
  - Worker activity

### Prometheus Metrics
- **Metrics Endpoint**: http://api:3000/metrics
- **Prometheus UI**: http://prometheus:9090

### Health Checks
- **API Health**: `GET http://api:3000/health`
- **Deployment Verification**: `npm run deploy:verify`

---

## Common Operations

### Checking System Health

```powershell
# Quick health check
curl http://localhost:3000/health

# Comprehensive deployment verification
npm run deploy:verify

# Check all services
npm run verify:services

# Check queue health
npm run queue:health
```

### Viewing Logs

```powershell
# Backend logs (if running as service)
Get-Content logs\backend.log -Tail 100 -Wait

# Database backup logs
Get-Content logs\backup.log -Tail 50

# Search for errors
Select-String -Path logs\*.log -Pattern "ERROR" | Select-Object -Last 20
```

### Restarting Services

```powershell
# Restart backend
scripts\deployment\restart-clean.bat

# Restart with verification
scripts\deployment\restart-clean.bat && npm run deploy:verify
```

---

## Alert Remediation

### QueueDLQJobsPresent

**Severity**: Warning
**Description**: Dead Letter Queue has jobs that failed processing

**Remediation**:
```powershell
# 1. Check DLQ contents
npm run queue:health

# 2. View failed jobs
npx tsx scripts/queue/check-queue-health.ts

# 3. Clear DLQ after investigation
npm run queue:clear-dlq <queue-name>

# Example: Clear email queue DLQ
npm run queue:clear-dlq email
```

**Root Causes**:
- External API failures (email, AI services)
- Data validation errors
- Temporary network issues

### QueueHighWaitingCount

**Severity**: Warning
**Description**: Queue has >1000 waiting jobs

**Remediation**:
```powershell
# 1. Check queue lag
npm run queue:health

# 2. Scale workers (manual)
# Increase WORKER_CONCURRENCY in .env
# Restart backend

# 3. Monitor improvement
# Watch Grafana queue dashboard
```

**Root Causes**:
- Traffic spike
- Slow job processing
- Worker crashes

### QueueHighLag

**Severity**: Critical
**Description**: Oldest job >300s old

**Remediation**:
```powershell
# 1. Identify bottleneck
npm run queue:health

# 2. Check worker logs
Get-Content logs\backend.log | Select-String "worker"

# 3. Scale workers immediately
# Update WORKER_CONCURRENCY=10 in .env
# Restart backend

# 4. Monitor queue drain rate
npm run queue:health
```

### Slow Database Queries

**Severity**: Warning
**Description**: Queries taking >100ms on average

**Remediation**:
```powershell
# 1. Analyze slow queries
npm run db:analyze-slow

# 2. Check missing indexes
npm run db:add-indexes

# 3. Update statistics
npx tsx scripts/database/analyze-tables.ts

# 4. Review top queries
npm run db:analyze-slow --min-time=50 --limit=20
```

### High Cache Miss Rate

**Severity**: Info
**Description**: Redis cache hit rate <60%

**Remediation**:
```powershell
# 1. Check cache performance
npm run cache:test

# 2. Review cache stats
redis-cli INFO stats

# 3. Increase cache TTL if appropriate
# Edit backend/core/analytics/analytics-service.ts
# Change CacheTTL.MEDIUM to CacheTTL.LONG

# 4. Warm cache on startup
# Add cache warming logic to backend startup
```

---

## Database Maintenance

### Daily Tasks

```powershell
# Run ANALYZE (updates statistics)
psql $DATABASE_URL -c "ANALYZE;"

# Check database size
psql $DATABASE_URL -c "SELECT pg_size_pretty(pg_database_size(current_database()));"

# Check active connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"
```

### Weekly Tasks

```powershell
# Vacuum full (during maintenance window)
psql $DATABASE_URL -c "VACUUM FULL ANALYZE;"

# Check for bloat
psql $DATABASE_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC LIMIT 10;"

# Review slow queries
npm run db:analyze-slow

# Check for missing indexes
npm run db:add-indexes
```

### Monthly Tasks

```powershell
# Full backup with verification
npm run db:backup
npm run db:test-backup

# Review and optimize top queries
npm run db:analyze-slow --min-time=100

# Check database extensions
npm run db:check-extensions

# Review storage growth
psql $DATABASE_URL -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## Backup & Recovery

### Creating Backups

```powershell
# Manual backup
npm run db:backup

# Schedule nightly backups (run as Administrator)
scripts\database\schedule-nightly-backup.bat

# View scheduled task
schtasks /query /tn "ClientForge-DatabaseBackup" /fo LIST /v
```

### Restoring from Backup

```powershell
# Test backup integrity (dry-run)
npm run db:restore -- --verify-only

# List available backups
dir backups\database\

# Restore latest backup
npm run db:restore

# Restore specific backup
npm run db:restore -- --file backup-2025-11-10T02-00-00.dump
```

### Backup Verification

```powershell
# Run comprehensive backup drill
npm run db:test-backup

# This will:
# 1. Create test backup
# 2. Verify integrity
# 3. Test restore process
# 4. Validate data consistency
# 5. Clean up test files
```

### Backup Best Practices

1. **Test restores monthly** - `npm run db:test-backup`
2. **Monitor backup logs** - Check `logs/backup.log`
3. **Verify backup size** - Should be consistent unless data growth
4. **Off-site backups** - Upload to R2/S3 for disaster recovery
5. **Document procedures** - Keep runbook updated

---

## Incident Response

### Incident Severity Levels

- **P0 (Critical)**: Complete system outage, data loss
- **P1 (High)**: Major feature broken, affecting multiple users
- **P2 (Medium)**: Minor feature issue, workaround available
- **P3 (Low)**: Cosmetic issue, no functional impact

### P0 Incident Checklist

1. **Acknowledge** - Update status page
2. **Assess** - Check all systems
   ```powershell
   npm run deploy:verify
   npm run queue:health
   npm run verify:services
   ```
3. **Mitigate** - Apply immediate fix
4. **Communicate** - Notify stakeholders
5. **Monitor** - Watch for recurrence
6. **Document** - Create incident report

### P1 Incident Checklist

1. **Investigate** - Check logs, metrics
   ```powershell
   Get-Content logs\backend.log -Tail 200 | Select-String "ERROR"
   ```
2. **Isolate** - Determine affected component
3. **Fix** - Apply patch or rollback
4. **Test** - Verify resolution
5. **Deploy** - Push fix to production
6. **Verify** - Run `npm run deploy:verify`

---

## Performance Troubleshooting

### High CPU Usage

```powershell
# 1. Check process CPU
Get-Process -Name node | Select-Object CPU, WS

# 2. Profile application (if dev)
node --prof backend/index.js

# 3. Check for runaway queries
npm run db:analyze-slow --min-time=1000

# 4. Review queue lag
npm run queue:health
```

### High Memory Usage

```powershell
# 1. Check memory usage
Get-Process -Name node | Select-Object WS, PM

# 2. Check Redis memory
redis-cli INFO memory

# 3. Review cache size
redis-cli DBSIZE

# 4. Check for memory leaks
# Restart backend and monitor growth
```

### Slow API Responses

```powershell
# 1. Check database performance
npm run db:analyze-slow

# 2. Test cache performance
npm run cache:test

# 3. Check Elasticsearch lag
npm run es:check-status

# 4. Review search performance
npm run search:analyze
```

---

## Queue Management

### Monitoring Queues

```powershell
# Real-time queue health
npm run queue:health

# Clear DLQ
npm run queue:clear-dlq <queue-name>

# Inject test failure
npm run queue:inject-failure <queue-name> <count>
```

### Queue Types

1. **email** - Email sending jobs
2. **notifications** - Push/SMS notifications
3. **ai-processing** - AI/ML tasks
4. **data-sync** - Elasticsearch sync
5. **reporting** - Report generation

### Scaling Workers

```env
# .env configuration
WORKER_CONCURRENCY=5    # Jobs per queue
MAX_JOBS_PER_WORKER=100 # Before restart
```

After changing, restart backend:
```powershell
scripts\deployment\restart-clean.bat
```

---

## Elasticsearch Operations

### Checking Health

```powershell
# Check cluster status
npm run es:check-status

# View indices
curl http://localhost:9200/_cat/indices?v

# Check aliases
curl http://localhost:9200/_cat/aliases?v
```

### Reindexing

```powershell
# Create new index with updated mappings
curl -X PUT "http://localhost:9200/contacts_v2" -H 'Content-Type: application/json' -d @config/elasticsearch/contacts-mapping.json

# Reindex data
curl -X POST "http://localhost:9200/_reindex" -H 'Content-Type: application/json' -d '{
  "source": { "index": "contacts" },
  "dest": { "index": "contacts_v2" }
}'

# Update alias
curl -X POST "http://localhost:9200/_aliases" -H 'Content-Type: application/json' -d '{
  "actions": [
    { "remove": { "index": "contacts_v1", "alias": "contacts" } },
    { "add": { "index": "contacts_v2", "alias": "contacts" } }
  ]
}'
```

### Search Performance

```powershell
# Analyze search queries
npm run search:analyze

# View zero-result queries
psql $DATABASE_URL -c "SELECT query_lowercase, COUNT(*) FROM search_telemetry WHERE result_count = 0 GROUP BY query_lowercase ORDER BY COUNT(*) DESC LIMIT 10;"
```

---

## Emergency Contacts

- **On-Call Engineer**: [Rotation schedule]
- **Database Admin**: [Contact]
- **DevOps Lead**: [Contact]
- **CTO**: [Contact]

## External Resources

- **Grafana**: http://grafana:3001
- **Prometheus**: http://prometheus:9090
- **API Docs**: http://api:3000/docs
- **Status Page**: [URL]

---

## Revision History

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-10 | 1.0 | Initial runbook | System |
