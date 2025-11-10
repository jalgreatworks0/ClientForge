-- ============================================================================
-- Email Tracking Tables Migration
-- Adds comprehensive email open and click tracking infrastructure
-- ============================================================================

-- Email Campaigns Table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  reply_to VARCHAR(255),
  html_content TEXT NOT NULL,
  text_content TEXT,
  segment_filters JSONB DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'canceled')),
  send_at TIMESTAMP,
  sent_at TIMESTAMP,
  total_recipients INTEGER DEFAULT 0,
  is_ab_test BOOLEAN DEFAULT FALSE,
  ab_test_percentage INTEGER CHECK (ab_test_percentage BETWEEN 10 AND 50),
  ab_test_winner_criteria VARCHAR(50) CHECK (ab_test_winner_criteria IN ('open_rate', 'click_rate', 'conversion_rate')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email Sends Table (tracks individual emails sent to contacts)
CREATE TABLE IF NOT EXISTS email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  variant VARCHAR(1) DEFAULT 'A' CHECK (variant IN ('A', 'B')),
  status VARCHAR(50) NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'bounced')),
  sent_at TIMESTAMP,
  failed_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email Events Table (tracks opens, clicks, bounces, etc.)
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_send_id UUID NOT NULL REFERENCES email_sends(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('open', 'click', 'bounce', 'complaint', 'unsubscribe')),
  event_data JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email Unsubscribes Table
CREATE TABLE IF NOT EXISTS email_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  reason TEXT,
  unsubscribed_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Email Campaigns Indexes
CREATE INDEX IF NOT EXISTS idx_email_campaigns_tenant_id ON email_campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_at ON email_campaigns(created_at DESC);

-- Email Sends Indexes
CREATE INDEX IF NOT EXISTS idx_email_sends_campaign_id ON email_sends(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_contact_id ON email_sends(contact_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_tenant_id ON email_sends(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_status ON email_sends(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_sent_at ON email_sends(sent_at DESC);

-- Email Events Indexes (Critical for tracking performance)
CREATE INDEX IF NOT EXISTS idx_email_events_email_send_id ON email_events(email_send_id);
CREATE INDEX IF NOT EXISTS idx_email_events_campaign_id ON email_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_events_tenant_id ON email_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_events_event_type ON email_events(event_type);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON email_events(created_at DESC);
-- Composite index for open/click rate calculations
CREATE INDEX IF NOT EXISTS idx_email_events_campaign_type ON email_events(campaign_id, event_type);

-- Email Unsubscribes Indexes
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_tenant_email ON email_unsubscribes(tenant_id, email);

-- ============================================================================
-- TRIGGER FUNCTIONS
-- ============================================================================

-- Update email_campaigns.updated_at on changes
CREATE OR REPLACE FUNCTION update_email_campaign_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_email_campaigns_updated_at
BEFORE UPDATE ON email_campaigns
FOR EACH ROW
EXECUTE FUNCTION update_email_campaign_timestamp();

-- ============================================================================
-- MATERIALIZED VIEW FOR CAMPAIGN STATISTICS (Fast Analytics)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS email_campaign_stats AS
SELECT
  c.id as campaign_id,
  c.tenant_id,
  c.name as campaign_name,
  c.status,
  c.sent_at,
  COUNT(DISTINCT es.id) as total_sent,
  COUNT(DISTINCT CASE WHEN es.status = 'sent' THEN es.id END) as total_delivered,
  COUNT(DISTINCT CASE WHEN ee.event_type = 'open' THEN es.id END) as unique_opens,
  COUNT(CASE WHEN ee.event_type = 'open' THEN 1 END) as total_opens,
  COUNT(DISTINCT CASE WHEN ee.event_type = 'click' THEN es.id END) as unique_clicks,
  COUNT(CASE WHEN ee.event_type = 'click' THEN 1 END) as total_clicks,
  COUNT(DISTINCT CASE WHEN ee.event_type = 'bounce' THEN es.id END) as total_bounced,
  COUNT(DISTINCT CASE WHEN ee.event_type = 'unsubscribe' THEN es.id END) as total_unsubscribed,
  ROUND(
    (COUNT(DISTINCT CASE WHEN ee.event_type = 'open' THEN es.id END)::numeric /
     NULLIF(COUNT(DISTINCT es.id), 0) * 100), 2
  ) as open_rate,
  ROUND(
    (COUNT(DISTINCT CASE WHEN ee.event_type = 'click' THEN es.id END)::numeric /
     NULLIF(COUNT(DISTINCT es.id), 0) * 100), 2
  ) as click_rate,
  ROUND(
    (COUNT(DISTINCT CASE WHEN ee.event_type = 'bounce' THEN es.id END)::numeric /
     NULLIF(COUNT(DISTINCT es.id), 0) * 100), 2
  ) as bounce_rate
FROM email_campaigns c
LEFT JOIN email_sends es ON c.id = es.campaign_id
LEFT JOIN email_events ee ON es.id = ee.email_send_id
GROUP BY c.id, c.tenant_id, c.name, c.status, c.sent_at;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_campaign_id ON email_campaign_stats(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_campaign_stats_tenant_id ON email_campaign_stats(tenant_id);

-- ============================================================================
-- SAMPLE DATA (Development Only)
-- ============================================================================

-- Insert sample campaign (only if in development)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
    INSERT INTO email_campaigns (
      id,
      tenant_id,
      created_by,
      name,
      subject,
      from_name,
      from_email,
      html_content,
      status,
      sent_at,
      total_recipients
    )
    SELECT
      '00000000-0000-0000-0000-000000000001'::UUID,
      (SELECT id FROM tenants LIMIT 1),
      (SELECT id FROM users LIMIT 1),
      'Welcome Campaign - Sample',
      'Welcome to ClientForge CRM!',
      'ClientForge Team',
      'noreply@clientforge.com',
      '<html><body><h1>Welcome!</h1><p>Track email opens with ease.</p></body></html>',
      'sent',
      NOW() - INTERVAL '7 days',
      100
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- ============================================================================
-- GRANTS (Ensure backend can access tables)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON email_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_sends TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_unsubscribes TO authenticated;
GRANT SELECT ON email_campaign_stats TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE email_campaigns IS 'Email marketing campaigns with A/B testing support';
COMMENT ON TABLE email_sends IS 'Individual emails sent to contacts (one row per recipient)';
COMMENT ON TABLE email_events IS 'Tracking events: opens, clicks, bounces, unsubscribes';
COMMENT ON TABLE email_unsubscribes IS 'Global unsubscribe list per tenant';
COMMENT ON MATERIALIZED VIEW email_campaign_stats IS 'Pre-computed campaign statistics for fast dashboard loading';

COMMENT ON COLUMN email_events.ip_address IS 'IP address of recipient (for geolocation analytics)';
COMMENT ON COLUMN email_events.user_agent IS 'Browser/email client for device analytics';
COMMENT ON COLUMN email_sends.variant IS 'A/B test variant (A or B)';
