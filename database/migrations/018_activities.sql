-- =============================================
-- Activity Timeline System Migration
-- Tracks all entity changes and user activities
-- Provides comprehensive audit trail
-- =============================================

-- Drop existing objects if they exist
DROP TABLE IF EXISTS activities CASCADE;
DROP INDEX IF EXISTS idx_activities_tenant_user;
DROP INDEX IF EXISTS idx_activities_entity;
DROP INDEX IF EXISTS idx_activities_type_action;
DROP INDEX IF EXISTS idx_activities_created_at;
DROP INDEX IF EXISTS idx_activities_changes;
DROP FUNCTION IF EXISTS get_entity_timeline CASCADE;
DROP FUNCTION IF EXISTS get_user_activity_feed CASCADE;
DROP VIEW IF EXISTS recent_activities CASCADE;

-- =============================================
-- Activities Table
-- =============================================

CREATE TABLE activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Activity metadata
    activity_type VARCHAR(50) NOT NULL,  -- contact, deal, company, lead, task, invoice, email, note, file, user, system
    entity_type VARCHAR(100) NOT NULL,   -- The type of entity affected
    entity_id VARCHAR(255) NOT NULL,     -- ID of the affected entity
    entity_name VARCHAR(255),            -- Human-readable name of entity

    -- Action details
    action VARCHAR(50) NOT NULL,         -- created, updated, deleted, viewed, archived, restored, etc.
    description TEXT NOT NULL,           -- Human-readable description
    changes JSONB DEFAULT '[]'::jsonb,   -- Array of field changes: [{field, oldValue, newValue}]
    metadata JSONB DEFAULT '{}'::jsonb,  -- Additional context data

    -- Request context
    ip_address INET,                     -- IP address of user
    user_agent TEXT,                     -- Browser/client user agent

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),

    -- Constraints
    CONSTRAINT valid_activity_type CHECK (activity_type IN (
        'contact', 'deal', 'company', 'lead', 'task', 'invoice',
        'email', 'note', 'file', 'user', 'system'
    )),
    CONSTRAINT valid_action CHECK (action IN (
        'created', 'updated', 'deleted', 'viewed', 'archived', 'restored',
        'assigned', 'unassigned', 'completed', 'reopened', 'sent', 'received',
        'uploaded', 'downloaded', 'shared', 'commented', 'mentioned',
        'logged_in', 'logged_out'
    ))
);

-- =============================================
-- Indexes for Performance
-- =============================================

-- Primary lookup indexes
CREATE INDEX idx_activities_tenant_user
    ON activities(tenant_id, user_id, created_at DESC);

CREATE INDEX idx_activities_entity
    ON activities(tenant_id, entity_type, entity_id, created_at DESC);

CREATE INDEX idx_activities_type_action
    ON activities(tenant_id, activity_type, action, created_at DESC);

CREATE INDEX idx_activities_created_at
    ON activities(created_at DESC);

-- GIN index for JSONB fields (for search and filtering)
CREATE INDEX idx_activities_changes
    ON activities USING GIN(changes);

CREATE INDEX idx_activities_metadata
    ON activities USING GIN(metadata);

-- Full-text search on descriptions
CREATE INDEX idx_activities_description_search
    ON activities USING GIN(to_tsvector('english', description));

-- =============================================
-- Helper Functions
-- =============================================

-- Get timeline for a specific entity
CREATE OR REPLACE FUNCTION get_entity_timeline(
    p_tenant_id UUID,
    p_entity_type VARCHAR,
    p_entity_id VARCHAR,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_name TEXT,
    user_avatar TEXT,
    activity_type VARCHAR,
    action VARCHAR,
    description TEXT,
    changes JSONB,
    metadata JSONB,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        u.avatar_url AS user_avatar,
        a.activity_type,
        a.action,
        a.description,
        a.changes,
        a.metadata,
        a.created_at
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.tenant_id = p_tenant_id
        AND a.entity_type = p_entity_type
        AND a.entity_id = p_entity_id
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get user's activity feed
CREATE OR REPLACE FUNCTION get_user_activity_feed(
    p_user_id UUID,
    p_tenant_id UUID,
    p_activity_types VARCHAR[] DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    activity_type VARCHAR,
    entity_type VARCHAR,
    entity_id VARCHAR,
    entity_name VARCHAR,
    action VARCHAR,
    description TEXT,
    changes JSONB,
    metadata JSONB,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.activity_type,
        a.entity_type,
        a.entity_id,
        a.entity_name,
        a.action,
        a.description,
        a.changes,
        a.metadata,
        a.created_at
    FROM activities a
    WHERE a.tenant_id = p_tenant_id
        AND a.user_id = p_user_id
        AND (p_activity_types IS NULL OR a.activity_type = ANY(p_activity_types))
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Get activity statistics
CREATE OR REPLACE FUNCTION get_activity_statistics(
    p_tenant_id UUID,
    p_start_date TIMESTAMP DEFAULT NULL,
    p_end_date TIMESTAMP DEFAULT NULL,
    p_group_by VARCHAR DEFAULT 'day'
)
RETURNS TABLE (
    period TEXT,
    activity_type VARCHAR,
    action VARCHAR,
    count BIGINT
) AS $$
DECLARE
    date_format TEXT;
BEGIN
    -- Determine date format based on grouping
    date_format := CASE p_group_by
        WHEN 'week' THEN 'YYYY-"W"IW'
        WHEN 'month' THEN 'YYYY-MM'
        ELSE 'YYYY-MM-DD'
    END;

    RETURN QUERY EXECUTE format('
        SELECT
            TO_CHAR(created_at, %L) as period,
            activity_type,
            action,
            COUNT(*) as count
        FROM activities
        WHERE tenant_id = $1
            AND ($2 IS NULL OR created_at >= $2)
            AND ($3 IS NULL OR created_at <= $3)
        GROUP BY period, activity_type, action
        ORDER BY period DESC, count DESC
    ', date_format)
    USING p_tenant_id, p_start_date, p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Search activities
CREATE OR REPLACE FUNCTION search_activities(
    p_tenant_id UUID,
    p_search_query TEXT,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_name TEXT,
    activity_type VARCHAR,
    entity_type VARCHAR,
    entity_id VARCHAR,
    entity_name VARCHAR,
    action VARCHAR,
    description TEXT,
    created_at TIMESTAMP,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        a.id,
        a.user_id,
        CONCAT(u.first_name, ' ', u.last_name) AS user_name,
        a.activity_type,
        a.entity_type,
        a.entity_id,
        a.entity_name,
        a.action,
        a.description,
        a.created_at,
        ts_rank(
            to_tsvector('english', a.description || ' ' || COALESCE(a.entity_name, '')),
            plainto_tsquery('english', p_search_query)
        ) AS rank
    FROM activities a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.tenant_id = p_tenant_id
        AND (
            to_tsvector('english', a.description || ' ' || COALESCE(a.entity_name, '')) @@
            plainto_tsquery('english', p_search_query)
            OR u.first_name ILIKE '%' || p_search_query || '%'
            OR u.last_name ILIKE '%' || p_search_query || '%'
        )
    ORDER BY rank DESC, a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Views
-- =============================================

-- Recent activities view (last 100 activities with user info)
CREATE VIEW recent_activities AS
SELECT
    a.id,
    a.tenant_id,
    a.user_id,
    CONCAT(u.first_name, ' ', u.last_name) AS user_name,
    u.avatar_url AS user_avatar,
    u.email AS user_email,
    a.activity_type,
    a.entity_type,
    a.entity_id,
    a.entity_name,
    a.action,
    a.description,
    a.changes,
    a.metadata,
    a.ip_address,
    a.created_at
FROM activities a
LEFT JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC
LIMIT 100;

-- =============================================
-- Cleanup Function
-- =============================================

-- Function to cleanup old activities (for scheduled maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_activities(
    p_days_old INT DEFAULT 365
)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM activities
    WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RAISE NOTICE 'Cleaned up % old activities (older than % days)', deleted_count, p_days_old;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE activities IS 'Activity timeline and audit trail for all entity changes';
COMMENT ON COLUMN activities.activity_type IS 'Category of activity (contact, deal, task, etc.)';
COMMENT ON COLUMN activities.action IS 'Action performed (created, updated, deleted, etc.)';
COMMENT ON COLUMN activities.changes IS 'Array of field changes: [{field, oldValue, newValue}]';
COMMENT ON COLUMN activities.metadata IS 'Additional context data as JSON';

COMMENT ON FUNCTION get_entity_timeline IS 'Get activity timeline for a specific entity';
COMMENT ON FUNCTION get_user_activity_feed IS 'Get activity feed for a specific user';
COMMENT ON FUNCTION get_activity_statistics IS 'Get activity statistics grouped by time period';
COMMENT ON FUNCTION search_activities IS 'Full-text search across activities';
COMMENT ON FUNCTION cleanup_old_activities IS 'Delete activities older than specified days';
