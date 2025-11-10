-- Migration: AI-Powered Features Tables
-- Description: Create tables for AI lead scoring and sentiment analysis storage
-- Date: 2025-11-10

-- =====================================================
-- AI LEAD SCORES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS ai_lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Score details
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  grade VARCHAR(1) NOT NULL CHECK (grade IN ('A', 'B', 'C', 'D', 'F')),
  priority VARCHAR(10) NOT NULL CHECK (priority IN ('hot', 'warm', 'cold')),
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),

  -- Factors (stored as JSONB for flexibility)
  factors JSONB NOT NULL,
  -- Example: {"engagement": 85, "companyFit": 75, "timing": 90, "budget": 60}

  -- Analysis
  reasoning TEXT NOT NULL,
  next_steps JSONB NOT NULL,
  -- Example: ["Schedule demo call within 48 hours", "Send product overview deck"]

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  -- Ensure one score per contact
  UNIQUE(contact_id)
);

-- Indexes for ai_lead_scores
CREATE INDEX idx_ai_lead_scores_tenant ON ai_lead_scores(tenant_id);
CREATE INDEX idx_ai_lead_scores_contact ON ai_lead_scores(contact_id);
CREATE INDEX idx_ai_lead_scores_score ON ai_lead_scores(score DESC);
CREATE INDEX idx_ai_lead_scores_grade ON ai_lead_scores(grade);
CREATE INDEX idx_ai_lead_scores_priority ON ai_lead_scores(priority);
CREATE INDEX idx_ai_lead_scores_updated_at ON ai_lead_scores(updated_at DESC);

-- =====================================================
-- EMAIL SENTIMENT COLUMNS
-- =====================================================

-- Add sentiment analysis columns to email_messages table
ALTER TABLE email_messages
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3, 2) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
ADD COLUMN IF NOT EXISTS sentiment_data JSONB;

-- Example sentiment_data:
-- {
--   "overallSentiment": "positive",
--   "confidence": 0.89,
--   "emotions": {"joy": 0.7, "anger": 0.1, "frustration": 0.05, "enthusiasm": 0.8, "concern": 0.15},
--   "keyPhrases": ["looking forward", "excited to collaborate"],
--   "urgencyLevel": "medium",
--   "actionRequired": false
-- }

-- Indexes for sentiment analysis
CREATE INDEX IF NOT EXISTS idx_email_messages_sentiment ON email_messages(sentiment_score) WHERE sentiment_score IS NOT NULL;

-- =====================================================
-- AI USAGE TRACKING (OPTIONAL - FOR FUTURE)
-- =====================================================

-- This table can be used to track AI feature usage and costs
CREATE TABLE IF NOT EXISTS ai_feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Feature tracking
  feature_type VARCHAR(50) NOT NULL,
  -- lead_scoring, next_best_action, email_generation, sentiment_analysis, pattern_recognition

  -- Usage details
  entity_type VARCHAR(50), -- contact, deal, email
  entity_id UUID,

  -- AI details
  model_used VARCHAR(50), -- claude-3-5-sonnet-20241022, etc.
  tokens_used INTEGER,
  cost_usd DECIMAL(10, 6),
  latency_ms INTEGER,
  cached BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for ai_feature_usage
CREATE INDEX idx_ai_feature_usage_tenant ON ai_feature_usage(tenant_id);
CREATE INDEX idx_ai_feature_usage_user ON ai_feature_usage(user_id);
CREATE INDEX idx_ai_feature_usage_feature ON ai_feature_usage(feature_type);
CREATE INDEX idx_ai_feature_usage_created_at ON ai_feature_usage(created_at DESC);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE ai_lead_scores IS 'Stores AI-generated lead scores with factors and recommendations';
COMMENT ON COLUMN ai_lead_scores.score IS 'Overall lead score from 0-100';
COMMENT ON COLUMN ai_lead_scores.grade IS 'Letter grade: A (90-100), B (80-89), C (70-79), D (60-69), F (<60)';
COMMENT ON COLUMN ai_lead_scores.priority IS 'Priority level: hot (A-B), warm (C), cold (D-F)';
COMMENT ON COLUMN ai_lead_scores.factors IS 'JSON object with engagement, companyFit, timing, budget scores';
COMMENT ON COLUMN ai_lead_scores.next_steps IS 'Array of recommended actions';

COMMENT ON COLUMN email_messages.sentiment_score IS 'Sentiment score from -1 (very negative) to 1 (very positive)';
COMMENT ON COLUMN email_messages.sentiment_data IS 'Detailed sentiment analysis including emotions, urgency, and trends';

COMMENT ON TABLE ai_feature_usage IS 'Tracks usage of AI-powered features for billing and analytics';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 008: AI Features Tables created successfully';
  RAISE NOTICE 'Tables: ai_lead_scores, ai_feature_usage';
  RAISE NOTICE 'Updated: email_messages (added sentiment columns)';
END $$;
