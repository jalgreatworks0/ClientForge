# Database Monitoring Setup - ClientForge CRM

## Overview

Comprehensive PostgreSQL slow query monitoring using `pg_stat_statements` extension with Grafana dashboards and automated analysis tools.

## Features

- ✅ Real-time query performance tracking
- ✅ Automatic slow query detection (>100ms mean time)
- ✅ Query impact analysis (by total execution time)
- ✅ 3 pre-built monitoring views
- ✅ Automated analysis scripts
- ✅ Grafana dashboard integration
- ✅ Docker-ready configuration

---

## Quick Start

### 1. Check Current Status

```powershell
npm run db:check-extensions
```

This will show:
- PostgreSQL version
- Available extensions
- Current configuration
- Whether pg_stat_statements is installed

### 2. Enable pg_stat_statements

#### Option A: Docker Compose (Recommended)

Add to your `docker-compose.yml` postgres service:

```yaml
services:
  postgres:
    image: postgres:15-alpine
    command: postgres -c shared_preload_libraries='pg_stat_statements'
    environment:
      - POSTGRES_DB=clientforge
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=yourpassword
```

Then restart:
```powershell
docker-compose down
docker-compose up -d postgres
```

#### Option B: Manual PostgreSQL Configuration

1. Edit `postgresql.conf`:
```ini
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
pg_stat_statements.save = on
```

2. Restart PostgreSQL

### 3. Install Extension and Create Views

```powershell
npm run db:setup-slow-query
```

This will:
- Create pg_stat_statements extension
- Create `monitoring` schema
- Create 3 performance views
- Show initial query statistics

---

## Monitoring Views

### 1. `monitoring.query_performance`

All queries ordered by mean execution time.

```sql
SELECT * FROM monitoring.query_performance LIMIT 20;
```

**Columns:**
- `query` - SQL query text
- `calls` - Number of times executed
- `total_time_ms` - Total execution time
- `mean_time_ms` - Average execution time
- `min_time_ms` - Minimum execution time
- `max_time_ms` - Maximum execution time
- `stddev_time_ms` - Standard deviation
- `rows` - Total rows returned
- `cache_hit_ratio` - Cache hit percentage

### 2. `monitoring.slow_queries`

Queries with mean execution time > 100ms.

```sql
SELECT * FROM monitoring.slow_queries;
```

**Additional Columns:**
- `pct_total_time` - Percentage of total execution time

### 3. `monitoring.top_queries_by_total_time`

Top 50 queries by cumulative execution time (most impactful).

```sql
SELECT * FROM monitoring.top_queries_by_total_time;
```

**Additional Columns:**
- `rows_per_call` - Average rows returned per call

---

## Analysis Scripts

### Check Extensions

```powershell
npm run db:check-extensions
```

Shows PostgreSQL version, available extensions, and configuration.

### Analyze Slow Queries

```powershell
npm run db:analyze-slow
```

Comprehensive analysis report:
- Overview statistics
- Slow queries list (>100ms)
- Most impactful queries (by total time)
- Optimization recommendations

**Custom thresholds:**
```powershell
npx tsx scripts/database/analyze-slow-queries.ts --min-time=50 --limit=30
```

### Reset Statistics

```sql
SELECT monitoring.reset_query_stats();
```

Clears all pg_stat_statements data. Useful after optimizations to start fresh.

---

## Example Queries

### Find Queries Using Sequential Scans

```sql
SELECT
  query,
  calls,
  ROUND(mean_exec_time::numeric, 2) as mean_ms
FROM pg_stat_statements
WHERE query LIKE '%Seq Scan%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### Find Queries with High Row Count

```sql
SELECT
  query,
  calls,
  rows,
  ROUND((rows::numeric / calls), 2) as avg_rows_per_call,
  ROUND(mean_exec_time::numeric, 2) as mean_ms
FROM pg_stat_statements
WHERE calls > 100
ORDER BY rows DESC
LIMIT 10;
```

### Find Most Frequently Called Queries

```sql
SELECT
  query,
  calls,
  ROUND(mean_exec_time::numeric, 2) as mean_ms,
  ROUND(total_exec_time::numeric, 2) as total_ms
FROM pg_stat_statements
ORDER BY calls DESC
LIMIT 20;
```

---

## Grafana Integration

### Adding Slow Query Panel

1. **Data Source**: PostgreSQL (your database connection)

2. **Query for Slow Queries Panel**:
```sql
SELECT
  NOW() as time,
  LEFT(query, 100) as metric,
  mean_exec_time as value
FROM pg_stat_statements
WHERE mean_exec_time > 100
  AND query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC
LIMIT 20
```

3. **Panel Type**: Table or Bar Gauge

4. **Refresh**: 1m

### Query for Time Series Graph

```sql
SELECT
  $__timeGroup(NOW(), '5m') as time,
  'slow_queries' as metric,
  COUNT(*) as value
FROM pg_stat_statements
WHERE mean_exec_time > $threshold
GROUP BY time
ORDER BY time
```

**Variables**:
- `$threshold`: Custom variable (default: 100)

---

## Optimization Workflow

### 1. Identify Slow Query

```powershell
npm run db:analyze-slow
```

### 2. Get Query Details

```sql
SELECT * FROM monitoring.query_performance
WHERE query LIKE '%your_table%'
LIMIT 1;
```

### 3. Analyze Query Plan

```sql
EXPLAIN (ANALYZE, BUFFERS) <your-slow-query>;
```

Look for:
- Sequential Scans on large tables → Add index
- High buffer reads → Increase cache or optimize query
- Nested loops with high cost → Consider JOINs optimization

### 4. Implement Fix

Options:
- **Add Index**: `CREATE INDEX idx_table_column ON table(column);`
- **Rewrite Query**: Use better JOINs, CTEs, or subqueries
- **Add Partial Index**: For filtered queries
- **Materialize View**: For complex aggregations

### 5. Verify Improvement

```sql
-- Reset stats
SELECT monitoring.reset_query_stats();

-- Run queries for a period
-- Then check again
npm run db:analyze-slow
```

---

## Maintenance

### Regular Checks

Run weekly:
```powershell
npm run db:analyze-slow
```

Review:
- New slow queries appeared?
- Query performance degraded?
- High total time queries changed?

### Reset Statistics

After major optimizations or schema changes:
```sql
SELECT monitoring.reset_query_stats();
```

### Update Configuration

If tracking too many queries (>10000):
```sql
-- Check current count
SELECT COUNT(*) FROM pg_stat_statements;

-- Increase limit (requires restart)
-- Edit postgresql.conf:
-- pg_stat_statements.max = 20000
```

---

## Troubleshooting

### Extension Not Available

**Error**: `extension not found`

**Solution**:
1. Check PostgreSQL version (needs 9.2+)
2. Ensure `postgresql-contrib` package installed
3. For Docker: Use official PostgreSQL image

### Extension Won't Install

**Error**: `must be loaded via shared_preload_libraries`

**Solution**:
1. Add to postgresql.conf: `shared_preload_libraries = 'pg_stat_statements'`
2. Restart PostgreSQL
3. Run: `CREATE EXTENSION pg_stat_statements;`

### No Queries Showing

**Possible Causes**:
- Extension just installed (no data yet)
- Statistics were reset recently
- No queries executed since restart

**Solution**: Wait for queries to accumulate or generate test load.

### High Memory Usage

**Cause**: `pg_stat_statements.max` set too high

**Solution**: Reduce max tracked queries:
```sql
-- Check current memory usage
SELECT pg_size_pretty(pg_stat_statements_info().dealloc);

-- Reduce max in postgresql.conf
pg_stat_statements.max = 5000
```

---

## Performance Impact

pg_stat_statements has minimal overhead:
- **CPU**: < 1% for normal workloads
- **Memory**: ~20MB for 10,000 queries
- **Disk**: Statistics saved across restarts

Safe for production use.

---

## Files Created

- `scripts/database/check-pg-extensions.ts` - Extension checker
- `scripts/database/setup-slow-query-monitoring.ts` - Setup script
- `scripts/database/analyze-slow-queries.ts` - Analysis tool
- `database/migrations/010_enable_pg_stat_statements.sql` - Migration
- `deployment/docker/postgres-init/enable-pg-stat-statements.sh` - Docker init script

---

## npm Scripts

```json
{
  "db:check-extensions": "Check PostgreSQL extensions",
  "db:setup-slow-query": "Install pg_stat_statements and create views",
  "db:analyze-slow": "Analyze slow queries and show report"
}
```

---

## References

- [PostgreSQL pg_stat_statements Documentation](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [Query Optimization Guide](https://www.postgresql.org/docs/current/performance-tips.html)
- [EXPLAIN Documentation](https://www.postgresql.org/docs/current/using-explain.html)

---

**Last Updated**: 2025-11-10
**Status**: Production Ready
