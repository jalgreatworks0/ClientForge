-- =============================================================================
-- Migration: 012_billing_system.sql
-- Description: Complete billing system schema for ClientForge CRM
-- Dependencies: Requires PostgreSQL 14+ with UUID extension
-- Author: Claude Code
-- Date: 2025-11-10
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search optimization

-- =============================================================================
-- TABLE: billing_customers
-- Description: Stores Stripe customer information linked to tenants
-- =============================================================================

CREATE TABLE IF NOT EXISTS billing_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL UNIQUE,
  stripe_customer_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  currency VARCHAR(3) DEFAULT 'usd',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_billing_customers_tenant_id ON billing_customers(tenant_id);
CREATE INDEX idx_billing_customers_stripe_customer_id ON billing_customers(stripe_customer_id);
CREATE INDEX idx_billing_customers_email ON billing_customers(email);

COMMENT ON TABLE billing_customers IS 'Stripe customer records linked to tenants';
COMMENT ON COLUMN billing_customers.tenant_id IS 'Reference to tenants table (foreign key)';
COMMENT ON COLUMN billing_customers.stripe_customer_id IS 'Stripe customer ID (cus_xxx)';

-- =============================================================================
-- TABLE: payment_methods
-- Description: Stores payment methods (cards, bank accounts) for customers
-- =============================================================================

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  stripe_payment_method_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'card', 'bank_account', 'sepa_debit', etc.
  is_default BOOLEAN DEFAULT false,
  card_brand VARCHAR(50), -- 'visa', 'mastercard', 'amex', etc.
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_tenant_id ON payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_stripe_payment_method_id ON payment_methods(stripe_payment_method_id);
CREATE INDEX idx_payment_methods_stripe_customer_id ON payment_methods(stripe_customer_id);
CREATE INDEX idx_payment_methods_is_default ON payment_methods(tenant_id, is_default) WHERE is_default = true;

COMMENT ON TABLE payment_methods IS 'Payment methods (cards, bank accounts) for billing';
COMMENT ON COLUMN payment_methods.is_default IS 'Whether this is the default payment method for the customer';
COMMENT ON COLUMN payment_methods.card_last4 IS 'Last 4 digits of card (for display purposes only)';

-- =============================================================================
-- TABLE: subscription_plans
-- Description: Available subscription plans with pricing and features
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_plan_id VARCHAR(255),
  amount INTEGER NOT NULL, -- Amount in cents
  currency VARCHAR(3) DEFAULT 'usd',
  interval VARCHAR(20) NOT NULL, -- 'month', 'year'
  interval_count INTEGER DEFAULT 1,
  features JSONB DEFAULT '{}',
  limits JSONB DEFAULT '{}', -- e.g., {"contacts": 1000, "apiCalls": 10000}
  is_active BOOLEAN DEFAULT true,
  trial_period_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_stripe_price_id ON subscription_plans(stripe_price_id);
CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX idx_subscription_plans_features ON subscription_plans USING GIN (features);
CREATE INDEX idx_subscription_plans_limits ON subscription_plans USING GIN (limits);

COMMENT ON TABLE subscription_plans IS 'Available subscription plans with pricing tiers';
COMMENT ON COLUMN subscription_plans.features IS 'JSON object of enabled features (e.g., {"sso": true, "advancedReports": true})';
COMMENT ON COLUMN subscription_plans.limits IS 'JSON object of usage limits (e.g., {"contacts": 1000, "storage": 10737418240})';
COMMENT ON COLUMN subscription_plans.amount IS 'Price in smallest currency unit (cents for USD)';

-- =============================================================================
-- TABLE: subscriptions
-- Description: Active and historical subscriptions for tenants
-- =============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  stripe_subscription_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL, -- 'active', 'trialing', 'past_due', 'canceled', 'unpaid'
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_plan_id ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);

COMMENT ON TABLE subscriptions IS 'Tenant subscriptions with billing periods and status';
COMMENT ON COLUMN subscriptions.status IS 'Stripe subscription status';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at end of current period';

-- =============================================================================
-- TABLE: invoices
-- Description: Invoice records from Stripe
-- =============================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  stripe_invoice_id VARCHAR(255) NOT NULL UNIQUE,
  stripe_customer_id VARCHAR(255) NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  invoice_number VARCHAR(255),
  status VARCHAR(50) NOT NULL, -- 'draft', 'open', 'paid', 'void', 'uncollectible'
  amount_due INTEGER NOT NULL,
  amount_paid INTEGER DEFAULT 0,
  amount_remaining INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'usd',
  tax INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  attempted_at TIMESTAMP WITH TIME ZONE,
  next_payment_attempt TIMESTAMP WITH TIME ZONE,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);

COMMENT ON TABLE invoices IS 'Invoice records synchronized from Stripe';
COMMENT ON COLUMN invoices.amount_due IS 'Total amount due in cents';
COMMENT ON COLUMN invoices.pdf_url IS 'Local path to generated PDF invoice';

-- =============================================================================
-- TABLE: usage_records
-- Description: Usage metering for consumption-based billing
-- =============================================================================

CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  metric_name VARCHAR(255) NOT NULL, -- 'api_calls', 'storage_gb', 'contacts', etc.
  quantity INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB,
  reported_to_stripe BOOLEAN DEFAULT false,
  stripe_usage_record_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_usage_records_tenant_id ON usage_records(tenant_id);
CREATE INDEX idx_usage_records_subscription_id ON usage_records(subscription_id);
CREATE INDEX idx_usage_records_metric_name ON usage_records(metric_name);
CREATE INDEX idx_usage_records_timestamp ON usage_records(timestamp);
CREATE INDEX idx_usage_records_tenant_metric_timestamp ON usage_records(tenant_id, metric_name, timestamp);
CREATE INDEX idx_usage_records_reported_to_stripe ON usage_records(reported_to_stripe) WHERE reported_to_stripe = false;

COMMENT ON TABLE usage_records IS 'Usage metering records for consumption-based billing';
COMMENT ON COLUMN usage_records.metric_name IS 'Type of usage being tracked (e.g., api_calls, storage_gb)';
COMMENT ON COLUMN usage_records.quantity IS 'Amount of usage in appropriate units';
COMMENT ON COLUMN usage_records.reported_to_stripe IS 'Whether this usage has been reported to Stripe for billing';

-- =============================================================================
-- TABLE: tax_transactions
-- Description: Tax transaction records for TaxJar compliance
-- =============================================================================

CREATE TABLE IF NOT EXISTS tax_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  transaction_id VARCHAR(255) NOT NULL UNIQUE,
  transaction_date DATE NOT NULL,
  from_country VARCHAR(2) NOT NULL,
  from_state VARCHAR(2),
  from_zip VARCHAR(20),
  to_country VARCHAR(2) NOT NULL,
  to_state VARCHAR(2),
  to_zip VARCHAR(20),
  amount INTEGER NOT NULL, -- Amount in cents
  shipping INTEGER DEFAULT 0,
  sales_tax INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_tax_transactions_tenant_id ON tax_transactions(tenant_id);
CREATE INDEX idx_tax_transactions_transaction_id ON tax_transactions(transaction_id);
CREATE INDEX idx_tax_transactions_transaction_date ON tax_transactions(transaction_date);

COMMENT ON TABLE tax_transactions IS 'Tax transaction records for TaxJar reporting and compliance';
COMMENT ON COLUMN tax_transactions.transaction_id IS 'Unique transaction identifier for TaxJar';
COMMENT ON COLUMN tax_transactions.sales_tax IS 'Calculated sales tax in cents';

-- =============================================================================
-- TABLE: dunning_attempts
-- Description: Failed payment retry tracking
-- =============================================================================

CREATE TABLE IF NOT EXISTS dunning_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  stripe_invoice_id VARCHAR(255) NOT NULL,
  attempt_number INTEGER NOT NULL,
  attempt_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'pending', 'retrying', 'succeeded', 'failed', 'abandoned'
  failure_reason TEXT,
  next_attempt_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dunning_attempts_tenant_id ON dunning_attempts(tenant_id);
CREATE INDEX idx_dunning_attempts_subscription_id ON dunning_attempts(subscription_id);
CREATE INDEX idx_dunning_attempts_invoice_id ON dunning_attempts(invoice_id);
CREATE INDEX idx_dunning_attempts_status ON dunning_attempts(status);
CREATE INDEX idx_dunning_attempts_next_attempt_date ON dunning_attempts(next_attempt_date) WHERE next_attempt_date IS NOT NULL;

COMMENT ON TABLE dunning_attempts IS 'Tracks failed payment retry attempts and schedules';
COMMENT ON COLUMN dunning_attempts.attempt_number IS 'Sequential retry attempt number (1, 2, 3, etc.)';
COMMENT ON COLUMN dunning_attempts.next_attempt_date IS 'Scheduled date/time for next retry attempt';

-- =============================================================================
-- TABLE: dunning_configs
-- Description: Dunning configuration per tenant (optional overrides)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dunning_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL UNIQUE,
  max_retries INTEGER DEFAULT 4,
  retry_intervals INTEGER[] DEFAULT ARRAY[3, 5, 7, 10], -- Days between retries
  grace_period_days INTEGER DEFAULT 3,
  suspend_after_failures INTEGER DEFAULT 2,
  cancel_after_days INTEGER DEFAULT 30,
  send_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_dunning_configs_tenant_id ON dunning_configs(tenant_id);

COMMENT ON TABLE dunning_configs IS 'Per-tenant dunning (failed payment retry) configuration';
COMMENT ON COLUMN dunning_configs.retry_intervals IS 'Array of days to wait between retry attempts';
COMMENT ON COLUMN dunning_configs.cancel_after_days IS 'Days after first failure to cancel subscription';

-- =============================================================================
-- TRIGGERS: Update timestamps automatically
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_billing_customers_updated_at BEFORE UPDATE ON billing_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_records_updated_at BEFORE UPDATE ON usage_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tax_transactions_updated_at BEFORE UPDATE ON tax_transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dunning_attempts_updated_at BEFORE UPDATE ON dunning_attempts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dunning_configs_updated_at BEFORE UPDATE ON dunning_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- SEED DATA: Sample subscription plans
-- =============================================================================

INSERT INTO subscription_plans (name, stripe_price_id, stripe_plan_id, amount, currency, interval, features, limits, trial_period_days)
VALUES
  (
    'Starter',
    'price_starter_monthly',
    'plan_starter',
    2900, -- $29/month
    'usd',
    'month',
    '{"sso": false, "advancedReports": false, "apiAccess": true, "customFields": false}',
    '{"contacts": 1000, "users": 5, "apiCalls": 10000, "storage": 5368709120}', -- 5GB
    14
  ),
  (
    'Professional',
    'price_professional_monthly',
    'plan_professional',
    9900, -- $99/month
    'usd',
    'month',
    '{"sso": true, "advancedReports": true, "apiAccess": true, "customFields": true}',
    '{"contacts": 10000, "users": 20, "apiCalls": 100000, "storage": 53687091200}', -- 50GB
    14
  ),
  (
    'Enterprise',
    'price_enterprise_monthly',
    'plan_enterprise',
    29900, -- $299/month
    'usd',
    'month',
    '{"sso": true, "advancedReports": true, "apiAccess": true, "customFields": true, "whiteLabel": true}',
    '{"contacts": -1, "users": -1, "apiCalls": -1, "storage": -1}', -- -1 = unlimited
    14
  )
ON CONFLICT (stripe_price_id) DO NOTHING;

-- =============================================================================
-- VIEWS: Helpful reporting views
-- =============================================================================

-- View: Active subscriptions with plan details
CREATE OR REPLACE VIEW active_subscriptions_with_plans AS
SELECT
  s.id,
  s.tenant_id,
  s.stripe_subscription_id,
  s.status,
  s.current_period_start,
  s.current_period_end,
  s.cancel_at_period_end,
  sp.name AS plan_name,
  sp.amount AS plan_amount,
  sp.currency,
  sp.interval,
  sp.features,
  sp.limits
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status IN ('active', 'trialing');

COMMENT ON VIEW active_subscriptions_with_plans IS 'Active subscriptions joined with plan details';

-- View: Monthly recurring revenue (MRR)
CREATE OR REPLACE VIEW monthly_recurring_revenue AS
SELECT
  DATE_TRUNC('month', s.current_period_start) AS month,
  COUNT(DISTINCT s.id) AS subscription_count,
  SUM(CASE WHEN sp.interval = 'month' THEN sp.amount ELSE sp.amount / 12 END) AS mrr_cents,
  ROUND(SUM(CASE WHEN sp.interval = 'month' THEN sp.amount ELSE sp.amount / 12 END) / 100.0, 2) AS mrr_dollars
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status IN ('active', 'trialing')
GROUP BY DATE_TRUNC('month', s.current_period_start)
ORDER BY month DESC;

COMMENT ON VIEW monthly_recurring_revenue IS 'Monthly recurring revenue aggregated by month';

-- View: Overdue invoices
CREATE OR REPLACE VIEW overdue_invoices AS
SELECT
  i.id,
  i.tenant_id,
  i.stripe_invoice_id,
  i.invoice_number,
  i.amount_due,
  i.amount_remaining,
  i.currency,
  i.due_date,
  EXTRACT(DAY FROM NOW() - i.due_date) AS days_overdue
FROM invoices i
WHERE i.status = 'open'
  AND i.due_date < NOW()
  AND i.amount_remaining > 0
ORDER BY i.due_date ASC;

COMMENT ON VIEW overdue_invoices IS 'Invoices that are past due and unpaid';

-- =============================================================================
-- GRANTS: Ensure application user has appropriate permissions
-- =============================================================================

-- Note: Replace 'clientforge_app' with your actual application database user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO clientforge_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO clientforge_app;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO clientforge_app;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

-- Log migration completion
DO $$
BEGIN
  RAISE NOTICE 'Migration 012_billing_system.sql completed successfully';
  RAISE NOTICE 'Created tables: billing_customers, payment_methods, subscription_plans, subscriptions, invoices, usage_records, tax_transactions, dunning_attempts, dunning_configs';
  RAISE NOTICE 'Created views: active_subscriptions_with_plans, monthly_recurring_revenue, overdue_invoices';
  RAISE NOTICE 'Seeded 3 sample subscription plans (Starter, Professional, Enterprise)';
END $$;
