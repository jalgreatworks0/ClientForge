/**
 * Monitoring and Observability Migration
 * Adds comprehensive database monitoring schema
 * Created: 2025-11-10
 * Phase: Production Monitoring Enhancement
 */

-- ============================================
-- Slow Query Tracking Enhancement
-- ============================================

-- Enhance existing query_performance_log with additional metadata
ALTER TABLE query_performance_log
  ADD COLUMN IF NOT EXISTS rows_returned INTEGER,
  ADD COLUMN IF NOT EXISTS buffers_hit INTEGER,
  ADD COLUMN IF NOT EXISTS buffers_read INTEGER,
  ADD COLUMN IF NOT EXISTS query_hash TEXT,
  ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255),
  ADD COLUMN IF NOT EXISTS method VARCHAR(10);

-- Add index on query hash for aggregation
CREATE INDEX IF NOT EXISTS idx_query_perf_log_hash
  ON query_performance_log(query_hash)
  WHERE query_hash IS NOT NULL;

-- Add index on endpoint for API monitoring
CREATE INDEX IF NOT EXISTS idx_query_perf_log_endpoint
  ON query_performance_log(endpoint)
  WHERE endpoint IS NOT NULL;

-- ============================================
-- Database Health Monitoring Views
-- ============================================

-- View: Active long-running queries
CREATE OR REPLACE VIEW active_long_queries AS
SELECT
  pid,
  usename as username,
  datname as database,
  application_name,
  client_addr,
  backend_start,
  state_change,
  NOW() - query_start AS query_duration,
  state,
  wait_event_type,
  wait_event,
  LEFT(query, 200) AS query_preview
FROM pg_stat_activity
WHERE state = 'active'
  AND NOW() - query_start > INTERVAL '5 seconds'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start;

-- View: Blocking queries and locks
CREATE OR REPLACE VIEW blocking_queries AS
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement,
  blocked_activity.application_name AS blocked_application,
  blocking_activity.application_name AS blocking_application
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- View: Table bloat analysis
CREATE OR REPLACE VIEW table_bloat_stats AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
  n_live_tup AS live_tuples,
  n_dead_tup AS dead_tuples,
  ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) AS dead_tuple_percent,
  last_vacuum,
  last_autovacuum
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;

-- View: Cache hit ratio per table
CREATE OR REPLACE VIEW table_cache_hit_ratio AS
SELECT
  schemaname,
  tablename,
  heap_blks_read AS disk_reads,
  heap_blks_hit AS cache_hits,
  CASE
    WHEN heap_blks_hit + heap_blks_read = 0 THEN NULL
    ELSE ROUND(100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read), 2)
  END AS cache_hit_ratio
FROM pg_statio_user_tables
WHERE schemaname = 'public'
ORDER BY heap_blks_read DESC;

-- ============================================
-- Tenant Isolation Verification
-- ============================================

-- Function: Verify tenant isolation for a given table
CREATE OR REPLACE FUNCTION verify_tenant_isolation(
  p_table_name TEXT,
  p_tenant_column TEXT DEFAULT 'tenant_id'
)
RETURNS TABLE(
  has_tenant_column BOOLEAN,
  has_tenant_index BOOLEAN,
  orphaned_records BIGINT,
  null_tenant_records BIGINT
) AS $$
DECLARE
  v_query TEXT;
  v_has_column BOOLEAN;
  v_has_index BOOLEAN;
  v_orphaned BIGINT;
  v_null_tenants BIGINT;
BEGIN
  -- Check if tenant column exists
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = p_table_name
      AND column_name = p_tenant_column
  ) INTO v_has_column;

  -- Check if there's an index on tenant column
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = p_table_name
      AND indexdef LIKE '%' || p_tenant_column || '%'
  ) INTO v_has_index;

  -- Count records with null tenant_id
  IF v_has_column THEN
    v_query := format('SELECT COUNT(*) FROM %I WHERE %I IS NULL', p_table_name, p_tenant_column);
    EXECUTE v_query INTO v_null_tenants;

    -- Count orphaned records (tenant_id doesn't exist in tenants table)
    v_query := format('
      SELECT COUNT(*)
      FROM %I t
      WHERE NOT EXISTS (
        SELECT 1 FROM tenants WHERE id = t.%I
      ) AND t.%I IS NOT NULL
    ', p_table_name, p_tenant_column, p_tenant_column);
    EXECUTE v_query INTO v_orphaned;
  ELSE
    v_null_tenants := 0;
    v_orphaned := 0;
  END IF;

  RETURN QUERY SELECT v_has_column, v_has_index, v_orphaned, v_null_tenants;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Query Performance Aggregation
-- ============================================

-- Materialized view: Aggregated query performance by name
CREATE MATERIALIZED VIEW IF NOT EXISTS query_performance_summary AS
SELECT
  query_name,
  COUNT(*) as execution_count,
  ROUND(AVG(execution_time_ms)) as avg_execution_time_ms,
  MIN(execution_time_ms) as min_execution_time_ms,
  MAX(execution_time_ms) as max_execution_time_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time_ms) as p50_execution_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms) as p95_execution_time_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time_ms) as p99_execution_time_ms,
  COUNT(*) FILTER (WHERE execution_time_ms > 1000) as slow_queries_count,
  MAX(created_at) as last_execution
FROM query_performance_log
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY query_name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_query_perf_summary_name
  ON query_performance_summary(query_name);

-- Function to refresh performance summary
CREATE OR REPLACE FUNCTION refresh_query_performance_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY query_performance_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Database Size Monitoring
-- ============================================

-- Table to track database size over time
CREATE TABLE IF NOT EXISTS database_size_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  database_name VARCHAR(255) NOT NULL,
  total_size_bytes BIGINT NOT NULL,
  table_size_bytes BIGINT NOT NULL,
  index_size_bytes BIGINT NOT NULL,
  toast_size_bytes BIGINT NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_db_size_history_recorded
  ON database_size_history(recorded_at DESC);

-- Function to record current database size
CREATE OR REPLACE FUNCTION record_database_size()
RETURNS void AS $$
DECLARE
  v_db_name VARCHAR(255);
  v_total_size BIGINT;
  v_table_size BIGINT;
  v_index_size BIGINT;
  v_toast_size BIGINT;
BEGIN
  SELECT current_database() INTO v_db_name;

  SELECT
    pg_database_size(current_database()),
    SUM(pg_relation_size(c.oid)),
    SUM(pg_indexes_size(c.oid)),
    SUM(pg_total_relation_size(c.oid) - pg_relation_size(c.oid) - pg_indexes_size(c.oid))
  INTO v_total_size, v_table_size, v_index_size, v_toast_size
  FROM pg_class c
  LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public';

  INSERT INTO database_size_history (
    database_name,
    total_size_bytes,
    table_size_bytes,
    index_size_bytes,
    toast_size_bytes
  ) VALUES (
    v_db_name,
    v_total_size,
    v_table_size,
    v_index_size,
    v_toast_size
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Connection Pool Monitoring Enhancement
-- ============================================

-- Table to track connection pool metrics over time
CREATE TABLE IF NOT EXISTS connection_pool_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_connections INTEGER NOT NULL,
  active_connections INTEGER NOT NULL,
  idle_connections INTEGER NOT NULL,
  idle_in_transaction INTEGER NOT NULL,
  waiting_connections INTEGER DEFAULT 0,
  max_connections INTEGER NOT NULL,
  utilization_percent NUMERIC(5,2) NOT NULL,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conn_pool_history_recorded
  ON connection_pool_history(recorded_at DESC);

-- Function to record connection pool status
CREATE OR REPLACE FUNCTION record_connection_pool_status()
RETURNS void AS $$
DECLARE
  v_total INTEGER;
  v_active INTEGER;
  v_idle INTEGER;
  v_idle_in_tx INTEGER;
  v_max INTEGER;
BEGIN
  SELECT
    count(*),
    count(*) FILTER (WHERE state = 'active'),
    count(*) FILTER (WHERE state = 'idle'),
    count(*) FILTER (WHERE state = 'idle in transaction')
  INTO v_total, v_active, v_idle, v_idle_in_tx
  FROM pg_stat_activity
  WHERE datname = current_database();

  SELECT setting::INTEGER INTO v_max FROM pg_settings WHERE name = 'max_connections';

  INSERT INTO connection_pool_history (
    total_connections,
    active_connections,
    idle_connections,
    idle_in_transaction,
    max_connections,
    utilization_percent
  ) VALUES (
    v_total,
    v_active,
    v_idle,
    v_idle_in_tx,
    v_max,
    ROUND(100.0 * v_total / v_max, 2)
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Replication Lag Monitoring (if applicable)
-- ============================================

-- View: Replication status (only shows data if replication is configured)
CREATE OR REPLACE VIEW replication_status AS
SELECT
  client_addr,
  application_name,
  state,
  sync_state,
  pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS send_lag_bytes,
  pg_wal_lsn_diff(sent_lsn, write_lsn) AS write_lag_bytes,
  pg_wal_lsn_diff(write_lsn, flush_lsn) AS flush_lag_bytes,
  pg_wal_lsn_diff(flush_lsn, replay_lsn) AS replay_lag_bytes,
  pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS total_lag_bytes,
  EXTRACT(EPOCH FROM (NOW() - reply_time)) AS seconds_since_last_reply
FROM pg_stat_replication;

-- ============================================
-- Automated Cleanup Jobs
-- ============================================

-- Enhanced cleanup for old monitoring data (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_monitoring_data()
RETURNS TABLE(
  table_name TEXT,
  rows_deleted BIGINT
) AS $$
DECLARE
  v_deleted BIGINT;
BEGIN
  -- Clean query performance logs
  DELETE FROM query_performance_log WHERE created_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'query_performance_log'::TEXT, v_deleted;

  -- Clean database size history
  DELETE FROM database_size_history WHERE recorded_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'database_size_history'::TEXT, v_deleted;

  -- Clean connection pool history
  DELETE FROM connection_pool_history WHERE recorded_at < NOW() - INTERVAL '30 days';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN QUERY SELECT 'connection_pool_history'::TEXT, v_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Health Check Function
-- ============================================

-- Comprehensive health check function
CREATE OR REPLACE FUNCTION database_health_check()
RETURNS TABLE(
  check_name TEXT,
  status TEXT,
  value TEXT,
  threshold TEXT,
  is_healthy BOOLEAN
) AS $$
BEGIN
  -- Check cache hit ratio
  RETURN QUERY
  SELECT
    'Cache Hit Ratio'::TEXT,
    'INFO'::TEXT,
    ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0), 2)::TEXT || '%',
    '>= 95%'::TEXT,
    (ROUND(100.0 * sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0), 2) >= 95)
  FROM pg_statio_user_tables;

  -- Check connection usage
  RETURN QUERY
  SELECT
    'Connection Usage'::TEXT,
    CASE WHEN utilization >= 80 THEN 'WARNING' ELSE 'OK' END::TEXT,
    current_conn::TEXT || ' / ' || max_conn::TEXT,
    '< 80%'::TEXT,
    (utilization < 80)
  FROM (
    SELECT
      count(*)::INTEGER AS current_conn,
      (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') AS max_conn,
      ROUND(100.0 * count(*) / (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections'), 2) AS utilization
    FROM pg_stat_activity
    WHERE datname = current_database()
  ) conn_stats;

  -- Check for long-running queries
  RETURN QUERY
  SELECT
    'Long Running Queries'::TEXT,
    CASE WHEN count(*) > 0 THEN 'WARNING' ELSE 'OK' END::TEXT,
    count(*)::TEXT,
    '0'::TEXT,
    (count(*) = 0)
  FROM pg_stat_activity
  WHERE state = 'active'
    AND NOW() - query_start > INTERVAL '5 minutes'
    AND query NOT LIKE '%pg_stat_activity%';

  -- Check for table bloat
  RETURN QUERY
  SELECT
    'Tables with High Dead Tuples'::TEXT,
    CASE WHEN count(*) > 5 THEN 'WARNING' ELSE 'OK' END::TEXT,
    count(*)::TEXT,
    '<= 5'::TEXT,
    (count(*) <= 5)
  FROM pg_stat_user_tables
  WHERE n_dead_tup > 1000
    AND ROUND(100 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) > 20;

  -- Check for blocking queries
  RETURN QUERY
  SELECT
    'Blocking Queries'::TEXT,
    CASE WHEN count(*) > 0 THEN 'CRITICAL' ELSE 'OK' END::TEXT,
    count(*)::TEXT,
    '0'::TEXT,
    (count(*) = 0)
  FROM blocking_queries;

  -- Check database size
  RETURN QUERY
  SELECT
    'Database Size'::TEXT,
    'INFO'::TEXT,
    pg_size_pretty(pg_database_size(current_database())),
    'N/A'::TEXT,
    true;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Monitoring Schema Complete
-- ============================================

-- Run initial health check
SELECT * FROM database_health_check();

SELECT 'Monitoring schema migration complete!' as status;
