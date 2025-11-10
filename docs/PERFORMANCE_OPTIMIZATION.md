# Performance Optimization Guide

## Overview

This document describes all performance optimizations implemented in ClientForge CRM to ensure fast, scalable, and efficient operation under production loads.

## Table of Contents

1. [Database Optimizations](#database-optimizations)
2. [Connection Pooling](#connection-pooling)
3. [Performance Monitoring](#performance-monitoring)
4. [Query Performance Tracking](#query-performance-tracking)
5. [Configuration](#configuration)
6. [Monitoring and Metrics](#monitoring-and-metrics)

---

## Database Optimizations

### Composite Indexes

We've added 30+ composite indexes optimized for common CRM query patterns:

#### Contact Queries
```sql
-- Filter by tenant + status (very common query)
idx_contacts_tenant_status ON contacts(tenant_id, lead_status)

-- Filter by tenant + lifecycle stage
idx_contacts_tenant_lifecycle ON contacts(tenant_id, lifecycle_stage)

-- "My contacts" view (tenant + owner + active status)
idx_contacts_tenant_owner_active ON contacts(tenant_id, owner_id) WHERE deleted_at IS NULL

-- Top leads dashboard (tenant + lead score)
idx_contacts_tenant_leadscore ON contacts(tenant_id, lead_score DESC)
```

#### Deal Queries
```sql
-- Pipeline view - VERY COMMON (tenant + stage)
idx_deals_tenant_stage ON deals(tenant_id, stage_id)

-- Top deals dashboard (tenant + amount)
idx_deals_tenant_amount ON deals(tenant_id, amount DESC)

-- Deal timeline queries (tenant + stage + dates)
idx_deals_tenant_stage_dates ON deals(tenant_id, stage_id, expected_close_date)
```

#### Task Queries
```sql
-- "My tasks" view (tenant + assignee + status)
idx_tasks_tenant_assignee_status ON tasks(tenant_id, assigned_to, status)

-- Overdue tasks (tenant + due date + status)
idx_tasks_tenant_duedate_status ON tasks(tenant_id, due_date, status)
```

#### Activity & Note Queries
```sql
-- Entity timeline (tenant + entity type + entity ID + timestamp)
idx_activities_tenant_entity_time ON activities(tenant_id, entity_type, entity_id, activity_date DESC)
idx_notes_tenant_entity_time ON notes(tenant_id, entity_type, entity_id, created_at DESC)
```

### Materialized Views

Pre-computed aggregations for dashboard performance:

#### Contact Statistics
```sql
CREATE MATERIALIZED VIEW contact_stats_by_tenant AS
SELECT
  tenant_id,
  count(*) as total_contacts,
  count(*) FILTER (WHERE is_active = true) as active_contacts,
  count(*) FILTER (WHERE lead_status = 'qualified') as qualified_leads,
  avg(lead_score) as avg_lead_score,
  count(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_last_30_days
FROM contacts
WHERE deleted_at IS NULL
GROUP BY tenant_id;
```

#### Deal Statistics
```sql
CREATE MATERIALIZED VIEW deal_stats_by_tenant AS
SELECT
  tenant_id,
  count(*) as total_deals,
  sum(amount) as total_value,
  avg(amount) as avg_deal_size,
  count(*) FILTER (WHERE stage_id IN (SELECT id FROM deal_stages WHERE is_won = true)) as won_deals,
  count(*) FILTER (WHERE expected_close_date < NOW() AND stage_id NOT IN (...)) as overdue_deals
FROM deals
WHERE deleted_at IS NULL
GROUP BY tenant_id;
```

**Refresh Strategy:**
```sql
-- Refresh all dashboard stats
SELECT refresh_dashboard_stats();

-- Schedule via cron or application scheduler (every 5 minutes recommended)
```

### Automatic Triggers

Automatic `updated_at` column maintenance:

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Applied to all main tables automatically
```

### Performance Monitoring Views

#### Index Usage Statistics
```sql
SELECT * FROM index_usage_stats
ORDER BY index_scans DESC;
```

#### Unused Indexes
```sql
SELECT * FROM unused_indexes;
-- Consider removing indexes with < 10 scans and large size
```

#### Missing Foreign Key Indexes
```sql
SELECT * FROM missing_fk_indexes;
-- Shows foreign keys without indexes (performance issue for joins)
```

#### Connection Statistics
```sql
SELECT * FROM connection_stats;
-- Monitor active connections, idle connections, and transaction state
```

---

## Connection Pooling

### Configuration

Optimized PostgreSQL connection pool settings in `backend/database/postgresql/pool.ts`:

```typescript
const config: PoolConfig = {
  // Connection string
  connectionString: process.env.DATABASE_URL,

  // Pool size (increased for better concurrency)
  max: parseInt(process.env.DATABASE_POOL_MAX || '20', 10),      // Default: 20
  min: parseInt(process.env.DATABASE_POOL_MIN || '5', 10),       // Default: 5

  // Timeouts
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),     // 30s
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECT_TIMEOUT || '5000', 10),  // 5s
  statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '30000', 10),     // 30s
  query_timeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000', 10),             // 30s

  // Application identification
  application_name: 'ClientForge-CRM',

  // Keep-alive to detect dead connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
}
```

### Pool Health Monitoring

Automatic health monitoring runs every 30 seconds:

```typescript
// Get current pool statistics
const stats = getPoolStats()
// Returns:
// {
//   totalCount: 8,
//   idleCount: 3,
//   waitingCount: 0,
//   maxConnections: 20,
//   minConnections: 5,
//   utilization: 62.5  // Percentage
// }

// Manual health check
monitorPoolHealth()
// Logs warnings if:
// - Utilization > 80%
// - Clients waiting for connections
// - At maximum capacity
```

### Best Practices

1. **Pool Size Tuning:**
   - Default max (20) works for most applications
   - For high-concurrency APIs: increase to 50-100
   - For background jobs: keep lower (10-20)
   - Monitor `waitingCount` - if consistently > 0, increase pool size

2. **Connection Leaks:**
   - Always use try/finally to release clients
   - Use `trackedQuery()` wrapper for automatic management
   - Monitor `idleCount` - if always 0, may have leaks

3. **Query Timeouts:**
   - Default 30s is conservative
   - For background jobs: increase to 60s+
   - For user-facing APIs: keep at 5-10s max

---

## Performance Monitoring

### Express Middleware

Performance monitoring middleware tracks all API requests:

**Location:** `backend/middleware/performance-monitoring.ts`

**Features:**
- Tracks request/response time for every endpoint
- Logs slow requests (>200ms by default)
- Adds `X-Response-Time` header to responses
- Aggregates metrics in memory for real-time analysis
- Optional database logging for slow requests

**Configuration:**
```bash
# Enable database logging for slow requests
LOG_PERFORMANCE_TO_DB=true

# Enable response time headers
PERF_HEADERS=true
```

### Performance Stats Endpoint

**GET `/api/v1/performance`**

Returns real-time performance statistics:

```json
{
  "stats": {
    "totalRequests": 1523,
    "averageResponseTime": 45,
    "minResponseTime": 3,
    "maxResponseTime": 523,
    "slowRequests": 12,
    "slowRequestPercentage": 1,
    "statusCodes": {
      "200": 1450,
      "201": 50,
      "400": 15,
      "404": 8
    },
    "endpoints": {
      "/api/v1/contacts": 450,
      "/api/v1/deals": 320,
      "/api/v1/tasks": 250
    },
    "methods": {
      "GET": 1200,
      "POST": 250,
      "PUT": 50,
      "DELETE": 23
    }
  },
  "slowEndpoints": [
    {
      "endpoint": "GET /api/v1/contacts",
      "averageTime": 125,
      "requestCount": 450,
      "maxTime": 523
    }
  ],
  "threshold": 200,
  "databaseLogging": false
}
```

### In-Memory Metrics

The performance middleware maintains a sliding window of the last 1000 requests for real-time analysis:

```typescript
import { getPerformanceStats, getSlowEndpoints, resetMetrics } from './middleware/performance-monitoring'

// Get current stats
const stats = getPerformanceStats()

// Get slowest endpoints
const slow = getSlowEndpoints(10)  // Top 10

// Reset metrics (useful for testing)
resetMetrics()
```

---

## Query Performance Tracking

### Database Query Wrapper

Track performance of individual database queries:

**Location:** `backend/database/postgresql/query-tracker.ts`

**Usage:**
```typescript
import { trackedQuery } from '../../database/postgresql/query-tracker'

// Wrap your queries
const result = await trackedQuery<Contact>(
  pool,
  `SELECT * FROM contacts WHERE tenant_id = $1`,
  [tenantId],
  {
    queryName: 'contacts.list',  // For grouping in logs
    tenantId,
    userId
  }
)
```

**Features:**
- Measures exact query execution time
- Logs slow queries (>100ms by default)
- Optional database logging
- Groups queries by name for aggregation
- Supports transactions with `trackedTransaction()`

### Query Performance Logging

All slow queries are logged to the `query_performance_log` table:

```sql
-- Get slowest queries in last 24 hours
SELECT
  query_name,
  COUNT(*) as execution_count,
  AVG(execution_time_ms)::integer as avg_time,
  MAX(execution_time_ms) as max_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms)::integer as p95_time
FROM query_performance_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY query_name
ORDER BY avg_time DESC
LIMIT 20;
```

### Helper Functions

```typescript
import {
  getQueryPerformanceStats,
  getSlowestQueries
} from '../../database/postgresql/query-tracker'

// Get aggregated stats
const stats = await getQueryPerformanceStats(pool, {
  limit: 50,
  minExecutionTime: 50,  // Only queries > 50ms
  tenantId: 'tenant-123',
  since: new Date('2025-01-01')
})

// Get individual slowest queries
const slowest = await getSlowestQueries(pool, 20)
```

---

## Configuration

### Environment Variables

```bash
# Database Connection Pool
DATABASE_URL=postgresql://user:pass@localhost:5432/clientforge
DATABASE_POOL_MAX=20           # Maximum connections
DATABASE_POOL_MIN=5            # Minimum connections (always ready)
DATABASE_IDLE_TIMEOUT=30000    # 30s - Close idle connections
DATABASE_CONNECT_TIMEOUT=5000  # 5s - Connection timeout
DATABASE_STATEMENT_TIMEOUT=30000  # 30s - Query timeout
DATABASE_QUERY_TIMEOUT=30000      # 30s - Query timeout

# Performance Monitoring
LOG_PERFORMANCE_TO_DB=true     # Log slow API requests to database
PERF_HEADERS=true              # Add X-Response-Time header
LOG_QUERY_PERF_TO_DB=true      # Log slow database queries to database
```

### Thresholds

Customize performance thresholds:

**API Request Threshold** (`backend/middleware/performance-monitoring.ts`):
```typescript
const SLOW_REQUEST_THRESHOLD_MS = 200  // Adjust as needed
```

**Database Query Threshold** (`backend/database/postgresql/query-tracker.ts`):
```typescript
const SLOW_QUERY_THRESHOLD_MS = 100  // Adjust as needed
```

---

## Monitoring and Metrics

### Production Monitoring Checklist

1. **Connection Pool Health**
   ```typescript
   // Check every 30 seconds (automatic)
   // Alerts if:
   // - Utilization > 80%
   // - Waiting clients > 0
   // - At max capacity
   ```

2. **API Performance**
   ```bash
   # Monitor /api/v1/performance endpoint
   curl http://localhost:3000/api/v1/performance
   ```

3. **Database Queries**
   ```sql
   -- Check slow queries
   SELECT * FROM query_performance_log
   WHERE execution_time_ms > 1000
   ORDER BY created_at DESC;

   -- Check index usage
   SELECT * FROM index_usage_stats
   WHERE index_scans < 10;
   ```

4. **Materialized View Refresh**
   ```sql
   -- Schedule via cron (every 5 minutes)
   */5 * * * * psql -U postgres -d clientforge -c "SELECT refresh_dashboard_stats();"
   ```

### Performance Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Average API Response Time | < 100ms | > 200ms |
| P95 API Response Time | < 200ms | > 500ms |
| Database Connection Pool Utilization | 40-60% | > 80% |
| Slow API Requests (>200ms) | < 1% | > 5% |
| Slow Database Queries (>100ms) | < 5% | > 15% |
| Database Connection Wait Time | 0ms | > 10ms |
| Index Cache Hit Ratio | > 99% | < 95% |

### Performance Testing

Run the backend test suite to ensure performance optimizations don't break functionality:

```bash
cd backend
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end tests
```

---

## Troubleshooting

### High Database Connection Pool Utilization

**Symptoms:** `waitingCount > 0`, utilization > 80%

**Solutions:**
1. Increase `DATABASE_POOL_MAX`
2. Check for connection leaks (always release clients)
3. Optimize slow queries
4. Add read replicas for read-heavy workloads

### Slow API Endpoints

**Symptoms:** Endpoints consistently > 200ms

**Diagnosis:**
1. Check `/api/v1/performance` for slow endpoints
2. Review database query logs
3. Check for N+1 query patterns

**Solutions:**
1. Add database indexes
2. Use eager loading for relationships
3. Implement caching for frequently accessed data
4. Use materialized views for complex aggregations

### Slow Database Queries

**Symptoms:** Queries > 100ms

**Diagnosis:**
```sql
-- Get query execution plan
SELECT explain_query('SELECT * FROM contacts WHERE tenant_id = $1');

-- Check missing indexes
SELECT * FROM missing_fk_indexes;

-- Check unused indexes
SELECT * FROM unused_indexes;
```

**Solutions:**
1. Add composite indexes for filter combinations
2. Use partial indexes for filtered queries
3. Analyze query plan and optimize
4. Consider query result caching

---

## Performance Optimization Roadmap

### Completed ✅
- [x] Database indexing strategy (30+ composite indexes)
- [x] Connection pool optimization
- [x] Performance monitoring middleware
- [x] Query performance tracking
- [x] Materialized views for dashboards
- [x] Automatic database triggers
- [x] Performance monitoring views

### Future Enhancements 🚀
- [ ] Redis caching layer for frequently accessed data
- [ ] GraphQL DataLoader for N+1 query prevention
- [ ] CDN integration for static assets
- [ ] Database read replicas for scaling
- [ ] Background job queue (Bull/BullMQ)
- [ ] API response compression (Brotli)
- [ ] HTTP/2 support
- [ ] Query result caching
- [ ] Elasticsearch for full-text search

---

## Additional Resources

- [PostgreSQL Performance Tuning Guide](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [Express.js Performance Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

**Last Updated:** 2025-01-06
**Phase:** 5 - Performance Optimization
**Status:** Complete
