-- =============================================================================
-- Notification System
-- Multi-channel notifications (in-app, email, SMS, push)
-- =============================================================================

-- Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    channels JSONB DEFAULT '["in_app"]'::jsonb,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    expires_at TIMESTAMP
);

-- Notification Preferences Table
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    channels JSONB DEFAULT '{"in_app":true,"email":true,"sms":false,"push":true}'::jsonb,
    types JSONB DEFAULT '{}'::jsonb,
    quiet_hours JSONB DEFAULT '{"enabled":false,"start":"22:00","end":"08:00"}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, tenant_id)
);

-- User Devices Table (for push notifications)
CREATE TABLE IF NOT EXISTS user_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_type VARCHAR(20) NOT NULL CHECK (device_type IN ('ios', 'android', 'web')),
    device_token VARCHAR(255),
    fcm_token TEXT,
    last_active TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (user_id, device_token)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Composite index for user's unread notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, tenant_id, read, created_at DESC)
WHERE read = false AND (expires_at IS NULL OR expires_at > NOW());

-- Notification preferences indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant ON notification_preferences(tenant_id);

-- User devices indexes
CREATE INDEX IF NOT EXISTS idx_user_devices_user ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices(last_active DESC);

-- GIN index for JSON data searches
CREATE INDEX IF NOT EXISTS idx_notifications_data_gin ON notifications USING GIN (data);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at timestamp for preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Update last_active for user devices
CREATE OR REPLACE FUNCTION update_user_device_last_active()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_active = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_device_last_active
    BEFORE UPDATE ON user_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_user_device_last_active();

-- =============================================================================
-- AUDIT LOGGING
-- =============================================================================

-- Log notification creation
CREATE OR REPLACE FUNCTION log_notification_created()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        metadata,
        ip_address
    ) VALUES (
        NEW.tenant_id,
        NEW.user_id,
        'notification_created',
        'notification',
        NEW.id,
        jsonb_build_object(
            'type', NEW.type,
            'title', NEW.title,
            'priority', NEW.priority,
            'channels', NEW.channels
        ),
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_created_audit
    AFTER INSERT ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION log_notification_created();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO unread_count
    FROM notifications
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND read = false
    AND (expires_at IS NULL OR expires_at > NOW());

    RETURN unread_count;
END;
$$ LANGUAGE plpgsql;

-- Mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(
    p_user_id UUID,
    p_tenant_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE notifications
    SET read = true, read_at = NOW()
    WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND read = false;

    GET DIAGNOSTICS updated_count = ROW_COUNT;

    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Clean up old read notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications(
    p_days_old INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications
    WHERE read = true
    AND read_at < NOW() - (p_days_old || ' days')::INTERVAL;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Also delete expired notifications
    DELETE FROM notifications
    WHERE expires_at IS NOT NULL
    AND expires_at < NOW();

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Get notifications with pagination
CREATE OR REPLACE FUNCTION get_user_notifications(
    p_user_id UUID,
    p_tenant_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    type VARCHAR,
    title VARCHAR,
    message TEXT,
    data JSONB,
    priority VARCHAR,
    read BOOLEAN,
    action_url TEXT,
    image_url TEXT,
    created_at TIMESTAMP,
    read_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.priority,
        n.read,
        n.action_url,
        n.image_url,
        n.created_at,
        n.read_at
    FROM notifications n
    WHERE n.user_id = p_user_id
    AND n.tenant_id = p_tenant_id
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
    AND (NOT p_unread_only OR n.read = false)
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for active notifications
CREATE OR REPLACE VIEW active_notifications AS
SELECT
    n.*,
    u.email as user_email,
    u.first_name || ' ' || u.last_name as user_name,
    t.name as tenant_name
FROM notifications n
JOIN users u ON n.user_id = u.id
JOIN tenants t ON n.tenant_id = t.id
WHERE n.read = false
AND (n.expires_at IS NULL OR n.expires_at > NOW())
ORDER BY n.created_at DESC;

-- View for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT
    tenant_id,
    type,
    COUNT(*) as total_count,
    COUNT(*) FILTER (WHERE read = true) as read_count,
    COUNT(*) FILTER (WHERE read = false) as unread_count,
    COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_count,
    AVG(EXTRACT(EPOCH FROM (read_at - created_at))) as avg_read_time_seconds
FROM notifications
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY tenant_id, type;

-- View for user notification summary
CREATE OR REPLACE VIEW user_notification_summary AS
SELECT
    user_id,
    tenant_id,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE read = false) as unread_count,
    COUNT(*) FILTER (WHERE read = false AND priority = 'urgent') as urgent_unread_count,
    MAX(created_at) as last_notification_at
FROM notifications
WHERE expires_at IS NULL OR expires_at > NOW()
GROUP BY user_id, tenant_id;

-- =============================================================================
-- NOTIFICATION TYPES
-- =============================================================================

COMMENT ON TABLE notifications IS 'Stores all user notifications across multiple channels (in-app, email, SMS, push)';

COMMENT ON COLUMN notifications.type IS 'Notification types: deal_created, deal_updated, deal_won, deal_lost, contact_created, contact_updated, task_assigned, task_due_soon, task_overdue, invoice_paid, invoice_overdue, payment_failed, subscription_renewed, subscription_cancelled, team_mention, comment_added, file_uploaded, report_ready, system_alert';

COMMENT ON COLUMN notifications.channels IS 'Delivery channels: in_app, email, sms, push';

COMMENT ON COLUMN notifications.priority IS 'Priority levels: low, normal, high, urgent';

COMMENT ON COLUMN notifications.data IS 'Additional data payload (entity IDs, URLs, etc.)';

COMMENT ON TABLE notification_preferences IS 'User notification preferences and quiet hours';

COMMENT ON TABLE user_devices IS 'User devices for push notifications (FCM tokens)';

-- =============================================================================
-- SCHEDULED CLEANUP JOB
-- =============================================================================

-- Create a scheduled job to clean up old notifications (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-notifications', '0 2 * * *', $$SELECT cleanup_old_notifications(30)$$);

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO clientforge_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO clientforge_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_devices TO clientforge_app;
GRANT SELECT ON active_notifications TO clientforge_app;
GRANT SELECT ON notification_stats TO clientforge_app;
GRANT SELECT ON user_notification_summary TO clientforge_app;
GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID, UUID) TO clientforge_app;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID, UUID) TO clientforge_app;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications(INTEGER) TO clientforge_app;
GRANT EXECUTE ON FUNCTION get_user_notifications(UUID, UUID, INTEGER, INTEGER, BOOLEAN) TO clientforge_app;
