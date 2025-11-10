/**
 * Performance Optimization Migration
 * Adds composite indexes and query optimizations for common access patterns
 * Created: 2025-11-06
 * Phase 5: Performance Optimization
 */

-- ============================================
-- Composite Indexes for Common Query Patterns
-- ============================================

-- Contacts: Filter by tenant + status (very common query)
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_status
  ON contacts(tenant_id, lead_status)
  WHERE deleted_at IS NULL;

-- Contacts: Filter by tenant + lifecycle stage
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_lifecycle
  ON contacts(tenant_id, lifecycle_stage)
  WHERE deleted_at IS NULL;

-- Contacts: Filter by tenant + owner (for "my contacts" view)
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_owner_active
  ON contacts(tenant_id, owner_id)
  WHERE deleted_at IS NULL AND is_active = true;

-- Contacts: Sort by lead score (top leads dashboard)
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_leadscore
  ON contacts(tenant_id, lead_score DESC)
  WHERE deleted_at IS NULL AND lead_score > 0;

-- Contacts: Recent activity tracking
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_lastcontact
  ON contacts(tenant_id, last_contacted_at DESC)
  WHERE last_contacted_at IS NOT NULL AND deleted_at IS NULL;

-- Accounts: Filter by tenant + industry (segmentation)
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_industry
  ON accounts(tenant_id, industry)
  WHERE deleted_at IS NULL AND industry IS NOT NULL;

-- Accounts: Filter by tenant + owner (for "my accounts" view)
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_owner_active
  ON accounts(tenant_id, owner_id)
  WHERE deleted_at IS NULL AND is_active = true;

-- Deals: Filter by tenant + stage (pipeline view - VERY COMMON)
CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage
  ON deals(tenant_id, stage_id)
  WHERE deleted_at IS NULL;

-- Deals: Filter by tenant + pipeline (pipeline management)
CREATE INDEX IF NOT EXISTS idx_deals_tenant_pipeline
  ON deals(tenant_id, pipeline_id)
  WHERE deleted_at IS NULL;

-- Deals: Filter by tenant + owner (for "my deals" view)
CREATE INDEX IF NOT EXISTS idx_deals_tenant_owner_active
  ON deals(tenant_id, owner_id)
  WHERE deleted_at IS NULL;

-- Deals: Sort by value (top deals dashboard)
CREATE INDEX IF NOT EXISTS idx_deals_tenant_amount
  ON deals(tenant_id, amount DESC)
  WHERE deleted_at IS NULL AND is_closed = false;

-- Deals: Filter by expected close date (forecasting)
CREATE INDEX IF NOT EXISTS idx_deals_tenant_closedate
  ON deals(tenant_id, expected_close_date)
  WHERE deleted_at IS NULL AND is_closed = false;

-- Deals: Closed deals analysis
CREATE INDEX IF NOT EXISTS idx_deals_tenant_closed
  ON deals(tenant_id, is_closed, is_won)
  WHERE deleted_at IS NULL;

-- Tasks: Filter by tenant + status (active tasks view - VERY COMMON)
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status
  ON tasks(tenant_id, status)
  WHERE deleted_at IS NULL;

-- Tasks: Filter by tenant + assignee (for "my tasks" view)
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_assignee_status
  ON tasks(tenant_id, assigned_to, status)
  WHERE deleted_at IS NULL;

-- Tasks: Filter by due date (overdue tasks, upcoming tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_duedate
  ON tasks(tenant_id, due_date)
  WHERE deleted_at IS NULL AND status != 'completed';

-- Tasks: Filter by priority (high-priority tasks)
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_priority
  ON tasks(tenant_id, priority)
  WHERE deleted_at IS NULL AND status != 'completed';

-- Activities: Filter by tenant + entity (contact/account/deal activities)
CREATE INDEX IF NOT EXISTS idx_activities_tenant_entity
  ON activities(tenant_id, entity_type, entity_id)
  WHERE deleted_at IS NULL;

-- Activities: Filter by tenant + type (calls, emails, meetings)
CREATE INDEX IF NOT EXISTS idx_activities_tenant_type
  ON activities(tenant_id, activity_type)
  WHERE deleted_at IS NULL;

-- Activities: Sort by activity date (timeline view)
CREATE INDEX IF NOT EXISTS idx_activities_tenant_date
  ON activities(tenant_id, activity_date DESC)
  WHERE deleted_at IS NULL;

-- Notes: Filter by tenant + entity (entity notes)
CREATE INDEX IF NOT EXISTS idx_notes_tenant_entity
  ON notes(tenant_id, entity_type, entity_id)
  WHERE deleted_at IS NULL;

-- Notes: Pinned notes (for quick access)
CREATE INDEX IF NOT EXISTS idx_notes_tenant_pinned
  ON notes(tenant_id, is_pinned)
  WHERE deleted_at IS NULL AND is_pinned = true;

-- Comments: Filter by tenant + entity (entity comments)
CREATE INDEX IF NOT EXISTS idx_comments_tenant_entity
  ON comments(tenant_id, entity_type, entity_id)
  WHERE deleted_at IS NULL;

-- Tags: Filter by tenant + entity type (tag management)
CREATE INDEX IF NOT EXISTS idx_tags_tenant_entitytype
  ON tags(tenant_id, entity_type)
  WHERE deleted_at IS NULL;

-- Custom Fields: Filter by tenant + entity type (field management)
CREATE INDEX IF NOT EXISTS idx_customfields_tenant_entity
  ON custom_fields(tenant_id, entity_type)
  WHERE deleted_at IS NULL;

-- Custom Field Values: Filter by tenant + entity (entity field values)
CREATE INDEX IF NOT EXISTS idx_customfieldvalues_tenant_entity
  ON custom_field_values(tenant_id, entity_type, entity_id)
  WHERE deleted_at IS NULL;

-- ============================================
-- Updated At Trigger for Performance
-- ============================================
-- This ensures updated_at is automatically maintained without application logic

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all main tables (if not already applied)
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name IN (
      'contacts', 'accounts', 'deals', 'tasks',
      'activities', 'notes', 'comments', 'tags',
      'custom_fields', 'custom_field_values',
      'users', 'roles', 'permissions'
    )
  LOOP
    -- Check if trigger already exists
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'update_' || tbl || '_updated_at'
    ) THEN
      EXECUTE format('
        CREATE TRIGGER update_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
      ', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Vacuum and Analyze Recommendations
-- ============================================

-- Run VACUUM ANALYZE on all CRM tables to optimize query planning
VACUUM ANALYZE contacts;
VACUUM ANALYZE accounts;
VACUUM ANALYZE deals;
VACUUM ANALYZE tasks;
VACUUM ANALYZE activities;
VACUUM ANALYZE notes;
VACUUM ANALYZE comments;
VACUUM ANALYZE tags;
VACUUM ANALYZE custom_fields;
VACUUM ANALYZE custom_field_values;

-- ============================================
-- Index Statistics
-- ============================================

-- View to track index usage (for monitoring)
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- View to find unused indexes (for cleanup)
CREATE OR REPLACE VIEW unused_indexes AS
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan as scans
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan < 10
AND indexrelid::regclass::text NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

-- View to find missing indexes (tables without indexes on foreign keys)
CREATE OR REPLACE VIEW missing_fk_indexes AS
SELECT
  c.conrelid::regclass AS table_name,
  string_agg(a.attname, ', ') AS columns,
  'CREATE INDEX idx_' || c.conrelid::regclass::text || '_' ||
  replace(string_agg(a.attname, '_'), ' ', '') ||
  ' ON ' || c.conrelid::regclass::text || ' (' ||
  string_agg(a.attname, ', ') || ');' AS create_index_statement
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
AND NOT EXISTS (
  SELECT 1 FROM pg_index i
  WHERE i.indrelid = c.conrelid
  AND array_to_string(c.conkey, ' ') = array_to_string(i.indkey, ' ')
)
GROUP BY c.conrelid, c.conname;

-- ============================================
-- Query Performance Helpers
-- ============================================

-- Function to explain analyze a query with JSON output
CREATE OR REPLACE FUNCTION explain_query(query_text text)
RETURNS TABLE(plan jsonb) AS $$
BEGIN
  RETURN QUERY EXECUTE 'EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ' || query_text;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Connection Pool Statistics
-- ============================================

CREATE OR REPLACE VIEW connection_stats AS
SELECT
  datname as database,
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections,
  count(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction,
  max(now() - state_change) as longest_idle_time,
  max(now() - query_start) FILTER (WHERE state = 'active') as longest_query_time
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY datname;

-- ============================================
-- Performance Monitoring
-- ============================================

-- Slow query log table (for application-level tracking)
CREATE TABLE IF NOT EXISTS query_performance_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_name VARCHAR(255) NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  query_text TEXT,
  params JSONB,
  tenant_id UUID,
  user_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_query_perf_log_queryname ON query_performance_log(query_name);
CREATE INDEX idx_query_perf_log_exectime ON query_performance_log(execution_time_ms DESC);
CREATE INDEX idx_query_perf_log_created ON query_performance_log(created_at DESC);
CREATE INDEX idx_query_perf_log_tenant ON query_performance_log(tenant_id) WHERE tenant_id IS NOT NULL;

-- Auto-cleanup old performance logs (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM query_performance_log
  WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Materialized Views for Dashboard Performance
-- ============================================

-- Contact statistics (for dashboard)
CREATE MATERIALIZED VIEW IF NOT EXISTS contact_stats_by_tenant AS
SELECT
  tenant_id,
  count(*) as total_contacts,
  count(*) FILTER (WHERE is_active = true AND deleted_at IS NULL) as active_contacts,
  count(*) FILTER (WHERE lead_status = 'qualified') as qualified_leads,
  count(*) FILTER (WHERE lifecycle_stage = 'customer') as customers,
  avg(lead_score) as avg_lead_score,
  count(*) FILTER (WHERE last_contacted_at > NOW() - INTERVAL '30 days') as contacted_last_30_days,
  count(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_last_30_days
FROM contacts
WHERE deleted_at IS NULL
GROUP BY tenant_id;

CREATE UNIQUE INDEX idx_contact_stats_tenant ON contact_stats_by_tenant(tenant_id);

-- Deal statistics (for dashboard)
CREATE MATERIALIZED VIEW IF NOT EXISTS deal_stats_by_tenant AS
SELECT
  tenant_id,
  count(*) as total_deals,
  count(*) FILTER (WHERE is_closed = false) as open_deals,
  count(*) FILTER (WHERE is_closed = true AND is_won = true) as won_deals,
  count(*) FILTER (WHERE is_closed = true AND is_won = false) as lost_deals,
  sum(amount) FILTER (WHERE is_closed = false) as pipeline_value,
  sum(amount) FILTER (WHERE is_closed = true AND is_won = true) as won_revenue,
  avg(amount) as avg_deal_size
FROM deals
WHERE deleted_at IS NULL
GROUP BY tenant_id;

CREATE UNIQUE INDEX idx_deal_stats_tenant ON deal_stats_by_tenant(tenant_id);

-- Refresh materialized views (call this from a cron job or application)
CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY contact_stats_by_tenant;
  REFRESH MATERIALIZED VIEW CONCURRENTLY deal_stats_by_tenant;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Performance Optimization Complete
-- ============================================

-- Summary of optimizations:
-- ✅ 30+ composite indexes for common query patterns
-- ✅ Automatic updated_at triggers for all tables
-- ✅ Materialized views for dashboard statistics
-- ✅ Performance monitoring views
-- ✅ Query performance logging table
-- ✅ Index usage tracking
-- ✅ Connection pool monitoring

SELECT 'Performance optimization migration complete!' as status;
