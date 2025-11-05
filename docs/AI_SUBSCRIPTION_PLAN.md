# ClientForge CRM - AI & Subscription Strategy

**Document Version**: 1.0
**Last Updated**: 2025-11-05
**Status**: Planning Phase

---

## 🎯 Executive Summary

ClientForge CRM implements a **subscription-based SaaS model** where AI capabilities scale with plan tier. This document outlines the complete AI strategy, pricing model, and technical implementation approach.

---

## 🤖 Core AI Components

### 1. Centralized AI Service (Week 11)
**Purpose**: Single, unified AI service powering all modules

**Architecture**:
```
backend/services/ai/
├── ai-service.ts              # Claude SDK client (singleton)
├── ai-types.ts                # TypeScript interfaces
├── prompt-templates/          # Module-specific prompts
│   ├── contacts-prompts.ts
│   ├── deals-prompts.ts
│   ├── tasks-prompts.ts
│   ├── notes-prompts.ts
│   └── albedo-prompts.ts
├── context-builders/          # Build AI context
│   ├── contact-context.ts
│   ├── deal-context.ts
│   └── task-context.ts
└── caching/
    └── ai-cache.ts            # Redis + Claude caching
```

**Key Features**:
- Single Claude SDK instance (cost efficiency)
- Model routing (Haiku/Sonnet/Opus based on plan + complexity)
- Prompt caching (83% cost reduction)
- Rate limiting & quota enforcement
- Usage tracking & analytics

### 2. Albedo AI Companion (Week 17-18)
**UI Location**: Bottom-right chat window (à la Intercom, Drift)

**User Experience**:
```
User: "Show me my top 5 deals this quarter"
Albedo: "Here are your top 5 deals:
1. Acme Corp - $500K (95% win probability)
2. TechStart Inc - $300K (75% win probability)
...

Would you like me to analyze risks or suggest next actions?"

User: "What's blocking the Acme deal?"
Albedo: "Analysis shows:
- No activity in 12 days (high risk)
- Missing key stakeholder approval
- Competitor evaluation in progress

Suggested action: Schedule follow-up call with CFO by Friday."
```

**Capabilities by Plan**:

| Capability | Professional | Business | Enterprise |
|------------|--------------|----------|------------|
| Natural language queries | ✅ Basic | ✅ Advanced | ✅ Full |
| Action execution | ❌ | ✅ (tasks, notes) | ✅ (all) |
| Data insights | ✅ Basic | ✅ Advanced | ✅ Predictive |
| Multi-turn context | ✅ 5 turns | ✅ 20 turns | ✅ Unlimited |
| Conversation history | 7 days | 30 days | Forever |
| Proactive suggestions | ❌ | ✅ | ✅ |

**Technical Stack**:
```typescript
// Frontend: React chat widget
<AlbedoChat
  position="bottom-right"
  theme="light|dark"
  quotaRemaining={450}
  quotaLimit={500}
  onMessage={(msg) => sendToAPI(msg)}
  streaming={true}
/>

// Backend: Dedicated endpoints
POST /api/v1/albedo/chat          // Send message
GET  /api/v1/albedo/conversations // History
POST /api/v1/albedo/action        // Execute action
GET  /api/v1/albedo/suggestions   // Get proactive tips
```

### 3. Module-Specific AI Features

#### Contacts Intelligence
- **Lead Scoring** (0-100)
  - Engagement metrics
  - Fit analysis
  - Intent signals
- **Churn Prediction** (low/medium/high)
- **Next Best Action** recommendations
- **Email Personalization**

#### Deals Intelligence
- **Revenue Forecasting** (Q1/Q2/Q3/Q4)
- **Win/Loss Probability** (0-100%)
- **Deal Risk Analysis**
- **Pipeline Optimization**

#### Tasks Intelligence
- **Smart Task Suggestions**
- **Priority Scoring**
- **Due Date Predictions**
- **Workload Balancing**

#### Notes Intelligence
- **Auto-Summarization**
- **Semantic Search**
- **Tag Suggestions**
- **Meeting Notes Extraction**

#### Marketing Intelligence (Phase 3)
- **Email Subject Line Optimization**
- **Send Time Prediction**
- **Audience Segmentation**
- **Campaign Performance Analysis**
- **A/B Test Recommendations**

---

## 💰 Subscription Pricing Model

### Tier Comparison

| Feature | Starter<br>$29/user | Professional<br>$79/user | Business<br>$149/user | Enterprise<br>Custom |
|---------|---------------------|--------------------------|------------------------|----------------------|
| **Core CRM** | ✅ | ✅ | ✅ | ✅ |
| **Email Integration** | ✅ | ✅ | ✅ | ✅ |
| **Mobile App** | ✅ | ✅ | ✅ | ✅ |
| **Custom Fields** | ❌ | ✅ | ✅ | ✅ |
| **Workflows** | ❌ | ✅ Basic | ✅ Advanced | ✅ Custom |
| **API Access** | ❌ | 5K calls/mo | 50K calls/mo | Unlimited |
| | | | | |
| **Albedo Chat** | ❌ | ✅ Basic | ✅ Advanced | ✅ Unlimited |
| **AI Queries/User/Mo** | 0 | 100 | 500 | Unlimited |
| **AI Model** | - | Haiku 4.5 | Sonnet 4.5 | Opus 4.1 |
| **Lead Scoring** | ❌ | ✅ Basic | ✅ Advanced | ✅ Custom |
| **Deal Forecasting** | ❌ | ✅ Basic | ✅ Advanced | ✅ Predictive |
| **Churn Prediction** | ❌ | ❌ | ✅ | ✅ |
| **Task Automation** | ❌ | ❌ | ✅ | ✅ |
| **Semantic Search** | ❌ | ❌ | ✅ | ✅ |
| **Custom AI Training** | ❌ | ❌ | ❌ | ✅ |
| | | | | |
| **Storage/User** | 5GB | 25GB | 100GB | Unlimited |
| **Support** | Email (24h) | Email+Chat | Phone+Priority | 24/7 Dedicated |
| **SLA** | - | - | 99.5% | 99.9% |

### AI Cost Economics

**Claude API Pricing** (Nov 2025):
- Haiku 4.5: $1 input / $5 output per 1M tokens
- Sonnet 4.5: $3 input / $15 output per 1M tokens
- Opus 4.1: $15 input / $75 output per 1M tokens

**Average Query Cost** (with caching):
- Simple query (Haiku): $0.0002 per query
- Medium query (Sonnet): $0.0015 per query
- Complex query (Opus): $0.0080 per query

**Cost Per User Per Month**:

| Plan | AI Queries | Avg Cost/Query | Total AI Cost | Plan Price | AI Margin |
|------|------------|----------------|---------------|------------|-----------|
| Professional | 100 | $0.0003 | $0.03 | $79 | 99.96% |
| Business | 500 | $0.0015 | $0.75 | $149 | 99.50% |
| Enterprise | 2000 | $0.0050 | $10.00 | $300+ | 96.67% |

**With Prompt Caching (83% reduction)**:
- Professional: $0.005/user/month
- Business: $0.13/user/month
- Enterprise: $1.70/user/month

**Incredible margins on AI features!**

---

## 🗄️ Database Schema

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE,

  -- Plan Details
  plan_type VARCHAR(50) NOT NULL, -- starter, professional, business, enterprise
  billing_cycle VARCHAR(20) NOT NULL, -- monthly, annual
  price_per_user DECIMAL(10,2) NOT NULL,

  -- Seats
  seats_purchased INTEGER NOT NULL,
  seats_used INTEGER DEFAULT 0,

  -- AI Quota
  ai_quota_monthly INTEGER DEFAULT 0, -- AI queries per user per month
  ai_quota_used INTEGER DEFAULT 0,
  ai_model VARCHAR(50), -- haiku, sonnet, opus
  ai_features JSONB, -- {"lead_scoring": true, "forecasting": true, ...}

  -- Billing Status
  status VARCHAR(20) NOT NULL, -- trial, active, past_due, suspended, cancelled
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,

  -- Payment
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT subscriptions_plan_check CHECK (plan_type IN ('starter', 'professional', 'business', 'enterprise')),
  CONSTRAINT subscriptions_status_check CHECK (status IN ('trial', 'active', 'past_due', 'suspended', 'cancelled'))
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_trial_ends ON subscriptions(trial_ends_at) WHERE status = 'trial';
```

### AI Usage Tracking Table
```sql
CREATE TABLE ai_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- Query Details
  query_type VARCHAR(50) NOT NULL, -- chat, lead_score, forecast, churn, etc.
  query_text TEXT, -- Sanitized query (no PII)

  -- AI Response
  model_used VARCHAR(50) NOT NULL,
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  tokens_cached INTEGER DEFAULT 0,

  -- Performance
  response_time_ms INTEGER,
  cache_hit BOOLEAN DEFAULT false,

  -- Cost
  cost_usd DECIMAL(10,6),

  -- Metadata
  endpoint VARCHAR(255), -- Which API endpoint
  user_agent TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_usage_tenant ON ai_usage_tracking(tenant_id, created_at DESC);
CREATE INDEX idx_ai_usage_user ON ai_usage_tracking(user_id, created_at DESC);
CREATE INDEX idx_ai_usage_type ON ai_usage_tracking(query_type);
CREATE INDEX idx_ai_usage_cost ON ai_usage_tracking(cost_usd DESC);
```

### Albedo Conversations Table
```sql
CREATE TABLE albedo_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID NOT NULL,

  -- Conversation Details
  title VARCHAR(255), -- Auto-generated from first message
  context JSONB, -- Current conversation context

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE albedo_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES albedo_conversations(id) ON DELETE CASCADE,

  -- Message
  role VARCHAR(20) NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,

  -- AI Metadata (for assistant messages)
  model_used VARCHAR(50),
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_albedo_conversations_user ON albedo_conversations(user_id, last_message_at DESC);
CREATE INDEX idx_albedo_messages_conversation ON albedo_messages(conversation_id, created_at ASC);
```

---

## 🛡️ Middleware: AI Quota Enforcement

```typescript
// backend/middleware/check-ai-quota.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './authenticate';
import { subscriptionService } from '../services/subscription/subscription-service';

export const checkAIQuota = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId;
    const subscription = await subscriptionService.getByTenantId(tenantId);

    // Check if plan has AI features
    if (subscription.plan_type === 'starter') {
      return res.status(403).json({
        success: false,
        error: 'AI features not available on Starter plan',
        message: 'Upgrade to Professional or higher to access Albedo AI',
        upgrade_url: '/billing/upgrade',
        current_plan: 'starter',
        required_plan: 'professional'
      });
    }

    // Check monthly quota
    const quotaPerUser = subscription.ai_quota_monthly;
    const usersCount = subscription.seats_used || 1;
    const totalQuota = quotaPerUser * usersCount;
    const quotaUsed = subscription.ai_quota_used;

    if (quotaUsed >= totalQuota) {
      return res.status(429).json({
        success: false,
        error: 'Monthly AI quota exceeded',
        message: `You've used ${quotaUsed} of ${totalQuota} AI queries this month`,
        quota_limit: totalQuota,
        quota_used: quotaUsed,
        quota_remaining: 0,
        resets_at: subscription.current_period_end,
        upgrade_url: '/billing/upgrade'
      });
    }

    // Attach subscription to request for usage tracking
    req.subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
};
```

**Usage in routes**:
```typescript
// Apply to all Albedo endpoints
router.post('/albedo/chat', authenticate, checkAIQuota, albedoController.chat);
router.get('/contacts/:id/insights', authenticate, checkAIQuota, contactController.getInsights);
```

---

## 📊 Analytics & Monitoring

### Admin Dashboard Metrics

**Real-Time Monitoring**:
- AI queries per minute
- Average response time
- Cache hit rate
- Cost per query
- Quota usage by tenant
- Model usage distribution

**Billing & Revenue**:
- MRR by plan tier
- AI cost per tenant
- AI margin per plan
- Quota overage opportunities
- Upgrade conversion rate

**User Engagement**:
- Albedo chat usage frequency
- Most popular AI features
- Query success rate
- User satisfaction (thumbs up/down)

**Cost Optimization**:
- Caching effectiveness
- Model routing efficiency
- High-cost queries (alert if >$0.10)
- Batch processing opportunities

---

## 🚀 Implementation Roadmap

### Week 11: AI Service Foundation
- [ ] Install @anthropic-ai/sdk
- [ ] Create centralized ai-service.ts
- [ ] Implement Redis caching
- [ ] Build first prompt template (contacts)
- [ ] Add usage tracking
- [ ] Create admin dashboard

### Week 12: Subscription System
- [ ] Create subscriptions table
- [ ] Create ai_usage_tracking table
- [ ] Build subscription service
- [ ] Implement checkAIQuota middleware
- [ ] Add Stripe integration
- [ ] Build billing UI

### Week 13-16: Module AI Features
- [ ] Contacts: Lead scoring, churn, next action
- [ ] Deals: Forecasting, risk analysis
- [ ] Tasks: Smart suggestions, priority
- [ ] Notes: Summarization, semantic search

### Week 17-18: Albedo Chat Companion
- [ ] React chat widget component
- [ ] Backend chat endpoints
- [ ] Conversation persistence
- [ ] Streaming responses
- [ ] Context management
- [ ] Action execution

### Week 19-20: Advanced AI Features
- [ ] Email optimization
- [ ] Campaign intelligence
- [ ] Predictive analytics
- [ ] Custom model training (Enterprise)

---

## 🎯 Success Metrics

**Technical**:
- AI response time <2s (p95)
- Cache hit rate >70%
- API uptime 99.9%
- Cost per query <$0.002

**Business**:
- Professional → Business upgrade rate >15%
- AI feature engagement >60% of paid users
- Albedo chat sessions >5/user/week
- Net revenue retention >120%

**User Satisfaction**:
- Albedo helpfulness rating >4.5/5
- AI accuracy (thumbs up) >85%
- Support ticket reduction 40%+

---

**Document Status**: ✅ Complete and ready for implementation
**Next Review**: After Week 10 completion
**Owner**: Development Team + Product

