-- =====================================================
-- Subscriptions & AI Tracking Schema
-- Week 11: AI service foundation with subscription management
-- =====================================================

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- Track subscription plans and AI quotas
-- =====================================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE, -- One subscription per tenant

  -- Plan Details
  plan_type VARCHAR(50) NOT NULL, -- starter, professional, business, enterprise
  plan_name VARCHAR(255) NOT NULL,
  plan_price_monthly DECIMAL(10,2) NOT NULL,

  -- AI Configuration
  ai_quota_monthly INTEGER NOT NULL DEFAULT 0, -- -1 for unlimited
  ai_quota_used INTEGER NOT NULL DEFAULT 0,
  ai_model VARCHAR(100), -- haiku, sonnet, opus

  -- Billing
  seats_purchased INTEGER NOT NULL DEFAULT 1,
  seats_used INTEGER NOT NULL DEFAULT 0,
  billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly', -- monthly, annual
  billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '1 month'),

  -- Payment
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  payment_method_id VARCHAR(255),

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'trial', -- trial, active, suspended, cancelled
  trial_ends_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT subscriptions_plan_type_check CHECK (
    plan_type IN ('starter', 'professional', 'business', 'enterprise')
  ),
  CONSTRAINT subscriptions_status_check CHECK (
    status IN ('trial', 'active', 'suspended', 'cancelled')
  ),
  CONSTRAINT subscriptions_billing_cycle_check CHECK (
    billing_cycle IN ('monthly', 'annual')
  ),
  CONSTRAINT subscriptions_seats_check CHECK (seats_purchased > 0 AND seats_used >= 0)
);

-- Indexes for subscriptions
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id) WHERE status IN ('trial', 'active');
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_billing_period ON subscriptions(billing_period_end) WHERE status = 'active';

-- =====================================================
-- AI_USAGE_TRACKING TABLE
-- Track all AI API calls for billing and analytics
-- =====================================================
CREATE TABLE ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- Request Details
  feature_type VARCHAR(100) NOT NULL, -- chat, lead_scoring, win_probability, etc.
  complexity VARCHAR(20) NOT NULL, -- simple, medium, complex
  model VARCHAR(100) NOT NULL, -- haiku, sonnet, opus

  -- Token Usage
  tokens_input INTEGER NOT NULL DEFAULT 0,
  tokens_output INTEGER NOT NULL DEFAULT 0,
  tokens_cache_read INTEGER NOT NULL DEFAULT 0,
  tokens_cache_write INTEGER NOT NULL DEFAULT 0,
  tokens_total INTEGER NOT NULL DEFAULT 0,

  -- Cost & Performance
  cost_usd DECIMAL(10,6) NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  cached BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT ai_usage_complexity_check CHECK (
    complexity IN ('simple', 'medium', 'complex')
  )
);

-- Indexes for ai_usage_tracking
CREATE INDEX idx_ai_usage_tenant_id ON ai_usage_tracking(tenant_id, created_at DESC);
CREATE INDEX idx_ai_usage_user_id ON ai_usage_tracking(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_feature_type ON ai_usage_tracking(feature_type, created_at DESC);
CREATE INDEX idx_ai_usage_created_at ON ai_usage_tracking(created_at DESC);
CREATE INDEX idx_ai_usage_tenant_period ON ai_usage_tracking(tenant_id, created_at);

-- Partitioning by month for better performance (optional, for high volume)
-- CREATE TABLE ai_usage_tracking_y2025m01 PARTITION OF ai_usage_tracking
-- FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- =====================================================
-- SUBSCRIPTION_FEATURES TABLE
-- Track which features are enabled per subscription
-- =====================================================
CREATE TABLE subscription_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL,
  feature_type VARCHAR(100) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  usage_limit INTEGER, -- Optional limit per feature
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_subscription_features_subscription FOREIGN KEY (subscription_id)
    REFERENCES subscriptions(id) ON DELETE CASCADE,
  CONSTRAINT subscription_features_unique UNIQUE (subscription_id, feature_type)
);

-- Indexes for subscription_features
CREATE INDEX idx_subscription_features_subscription_id ON subscription_features(subscription_id);
CREATE INDEX idx_subscription_features_feature_type ON subscription_features(feature_type);

-- =====================================================
-- PAYMENT_HISTORY TABLE
-- Track payment transactions
-- =====================================================
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  subscription_id UUID NOT NULL,

  -- Payment Details
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- pending, succeeded, failed, refunded
  payment_method VARCHAR(50), -- card, bank_transfer, etc.

  -- Stripe Integration
  stripe_payment_intent_id VARCHAR(255),
  stripe_invoice_id VARCHAR(255),

  -- Metadata
  description TEXT,
  invoice_url TEXT,
  receipt_url TEXT,

  -- Timestamps
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_payment_history_subscription FOREIGN KEY (subscription_id)
    REFERENCES subscriptions(id) ON DELETE CASCADE,
  CONSTRAINT payment_history_status_check CHECK (
    status IN ('pending', 'succeeded', 'failed', 'refunded')
  )
);

-- Indexes for payment_history
CREATE INDEX idx_payment_history_tenant_id ON payment_history(tenant_id, created_at DESC);
CREATE INDEX idx_payment_history_subscription_id ON payment_history(subscription_id);
CREATE INDEX idx_payment_history_status ON payment_history(status, created_at DESC);
CREATE INDEX idx_payment_history_stripe_payment ON payment_history(stripe_payment_intent_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp for subscriptions
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_subscriptions_updated_at();

-- Auto-reset AI quota at start of new billing period
CREATE OR REPLACE FUNCTION reset_ai_quota_if_new_period()
RETURNS TRIGGER AS $$
BEGIN
  -- If billing period has ended, reset quota
  IF NEW.billing_period_end < NOW() AND OLD.billing_period_end >= NOW() THEN
    NEW.ai_quota_used := 0;
    NEW.billing_period_start := NOW();
    NEW.billing_period_end := NOW() + INTERVAL '1 month';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_ai_quota_if_new_period
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION reset_ai_quota_if_new_period();

-- Update updated_at timestamp for subscription_features
CREATE OR REPLACE FUNCTION update_subscription_features_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscription_features_updated_at
BEFORE UPDATE ON subscription_features
FOR EACH ROW
EXECUTE FUNCTION update_subscription_features_updated_at();

-- =====================================================
-- VIEWS
-- =====================================================

-- View for active subscriptions with quota information
CREATE VIEW active_subscriptions_with_quota AS
SELECT
  s.id,
  s.tenant_id,
  s.plan_type,
  s.plan_name,
  s.plan_price_monthly,
  s.ai_quota_monthly,
  s.ai_quota_used,
  (s.ai_quota_monthly - s.ai_quota_used) as ai_quota_remaining,
  CASE
    WHEN s.ai_quota_monthly = -1 THEN 0 -- Unlimited
    WHEN s.ai_quota_monthly = 0 THEN 0
    ELSE ROUND((s.ai_quota_used::DECIMAL / s.ai_quota_monthly) * 100, 2)
  END as quota_utilization_percent,
  s.seats_purchased,
  s.seats_used,
  s.status,
  s.billing_period_start,
  s.billing_period_end,
  s.created_at
FROM subscriptions s
WHERE s.status IN ('trial', 'active');

-- View for monthly AI usage by tenant
CREATE VIEW monthly_ai_usage_by_tenant AS
SELECT
  tenant_id,
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as total_requests,
  SUM(tokens_total) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(latency_ms) as avg_latency_ms,
  SUM(CASE WHEN cached THEN 1 ELSE 0 END)::FLOAT / NULLIF(COUNT(*), 0) as cache_hit_rate
FROM ai_usage_tracking
GROUP BY tenant_id, DATE_TRUNC('month', created_at);

-- View for AI usage by feature type
CREATE VIEW ai_usage_by_feature AS
SELECT
  tenant_id,
  feature_type,
  DATE_TRUNC('day', created_at) as day,
  COUNT(*) as request_count,
  SUM(tokens_total) as total_tokens,
  SUM(cost_usd) as total_cost,
  AVG(latency_ms) as avg_latency_ms
FROM ai_usage_tracking
GROUP BY tenant_id, feature_type, DATE_TRUNC('day', created_at);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE subscriptions IS 'Subscription plans and billing information per tenant';
COMMENT ON TABLE ai_usage_tracking IS 'Detailed tracking of all AI API calls for billing and analytics';
COMMENT ON TABLE subscription_features IS 'Feature flags and usage limits per subscription';
COMMENT ON TABLE payment_history IS 'Payment transaction history';

COMMENT ON COLUMN subscriptions.ai_quota_monthly IS 'Monthly AI query quota (-1 for unlimited)';
COMMENT ON COLUMN subscriptions.ai_quota_used IS 'AI queries used in current billing period';
COMMENT ON COLUMN subscriptions.plan_type IS 'Subscription tier: starter, professional, business, enterprise';
COMMENT ON COLUMN ai_usage_tracking.tokens_cache_read IS 'Tokens served from prompt cache (cost savings)';
COMMENT ON COLUMN ai_usage_tracking.tokens_cache_write IS 'Tokens written to prompt cache';
COMMENT ON COLUMN ai_usage_tracking.cost_usd IS 'Actual API cost in USD';

-- =====================================================
-- SEED DATA (Development)
-- =====================================================

-- Insert default subscription plans (for reference)
-- These would typically be managed through admin panel

-- Starter Plan (No AI)
-- Professional Plan (100 queries/month, Haiku)
-- Business Plan (500 queries/month, Sonnet)
-- Enterprise Plan (Unlimited, Opus)
