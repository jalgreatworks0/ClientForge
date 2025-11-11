-- Migration: Enable pg_stat_statements Extension
-- Description: Install pg_stat_statements for slow query tracking and analysis
-- Prerequisites: PostgreSQL must have been started with shared_preload_libraries='pg_stat_statements'
--
-- Note: If this migration fails with "extension not found", you need to:
-- 1. Update docker-compose.yml or postgresql.conf to add:
--    command: postgres -c shared_preload_libraries='pg_stat_statements'
-- 2. Restart PostgreSQL container
-- 3. Run this migration again

-- Check if extension is available
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_available_extensions WHERE name = 'pg_stat_statements'
    ) THEN
        RAISE EXCEPTION 'pg_stat_statements extension is not available in this PostgreSQL installation';
    END IF;
END $$;

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Grant access to monitoring schema (create if not exists)
CREATE SCHEMA IF NOT EXISTS monitoring;

-- Create a view for easy query performance analysis
CREATE OR REPLACE VIEW monitoring.query_performance AS
SELECT
    query,
    calls,
    ROUND(total_exec_time::numeric, 2) as total_time_ms,
    ROUND(mean_exec_time::numeric, 2) as mean_time_ms,
    ROUND(min_exec_time::numeric, 2) as min_time_ms,
    ROUND(max_exec_time::numeric, 2) as max_time_ms,
    ROUND(stddev_exec_time::numeric, 2) as stddev_time_ms,
    rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_ratio
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'  -- Exclude meta queries
ORDER BY mean_exec_time DESC;

COMMENT ON VIEW monitoring.query_performance IS 'Top queries by mean execution time for performance analysis';

-- Create a view for slow queries (>100ms mean execution time)
CREATE OR REPLACE VIEW monitoring.slow_queries AS
SELECT
    query,
    calls,
    ROUND(total_exec_time::numeric, 2) as total_time_ms,
    ROUND(mean_exec_time::numeric, 2) as mean_time_ms,
    ROUND(max_exec_time::numeric, 2) as max_time_ms,
    rows,
    ROUND(100.0 * total_exec_time / SUM(total_exec_time) OVER (), 2) as pct_total_time
FROM pg_stat_statements
WHERE mean_exec_time > 100  -- Queries taking more than 100ms on average
  AND query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_exec_time DESC;

COMMENT ON VIEW monitoring.slow_queries IS 'Queries with mean execution time > 100ms';

-- Create a view for queries by total time (most impactful queries)
CREATE OR REPLACE VIEW monitoring.top_queries_by_total_time AS
SELECT
    query,
    calls,
    ROUND(total_exec_time::numeric, 2) as total_time_ms,
    ROUND(mean_exec_time::numeric, 2) as mean_time_ms,
    ROUND(100.0 * total_exec_time / SUM(total_exec_time) OVER (), 2) as pct_total_time,
    rows,
    ROUND((rows::numeric / NULLIF(calls, 0)), 2) as rows_per_call
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 50;

COMMENT ON VIEW monitoring.top_queries_by_total_time IS 'Top 50 queries by total execution time (most impactful)';

-- Create a function to reset statistics
CREATE OR REPLACE FUNCTION monitoring.reset_query_stats()
RETURNS void AS $$
BEGIN
    PERFORM pg_stat_statements_reset();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION monitoring.reset_query_stats() IS 'Reset pg_stat_statements statistics';

-- Print success message
DO $$
BEGIN
    RAISE NOTICE '✓ pg_stat_statements extension enabled successfully';
    RAISE NOTICE '✓ Created monitoring schema with performance views';
    RAISE NOTICE '✓ Query: SELECT * FROM monitoring.slow_queries LIMIT 20;';
END $$;
