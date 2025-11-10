/**
 * AI Service Configuration
 * Configuration management for the centralized AI service
 */

import type {
  AIServiceConfig,
  ClaudeModel,
  AIFeatureType,
  CacheConfig,
  QueryComplexity,
  ModelSelection,
  SubscriptionPlan,
} from './ai-types'
import {
  ClaudeModel as Models,
  AIFeatureType as Features,
  SubscriptionPlan as Plans,
  PLAN_MODEL_MAP,
  MODEL_PRICING,
} from './ai-types'

// =====================================================
// ENVIRONMENT CONFIGURATION
// =====================================================

/**
 * Load AI service configuration from environment
 */
export function loadAIConfig(): AIServiceConfig {
  // Use ClientForge-specific API key for Albedo AI assistant
  const apiKey = process.env.ANTHROPIC_API_KEY_CLIENTFORGE || process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY_CLIENTFORGE or ANTHROPIC_API_KEY environment variable is required')
  }

  return {
    // Anthropic API
    apiKey,
    baseURL: process.env.ANTHROPIC_BASE_URL,
    timeout: parseInt(process.env.AI_TIMEOUT || '60000'), // 60 seconds
    maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3'),

    // Model defaults
    defaultModel: (process.env.AI_DEFAULT_MODEL as ClaudeModel) || Models.SONNET,
    defaultTemperature: parseFloat(process.env.AI_DEFAULT_TEMPERATURE || '0.7'),
    defaultMaxTokens: parseInt(process.env.AI_DEFAULT_MAX_TOKENS || '4096'),

    // Caching
    cache: {
      enabled: process.env.AI_CACHE_ENABLED !== 'false',
      ttl: parseInt(process.env.AI_CACHE_TTL || '3600'), // 1 hour
      maxSize: parseInt(process.env.AI_CACHE_MAX_SIZE || '100'), // 100 MB
      provider: (process.env.AI_CACHE_PROVIDER as 'redis' | 'memory') || 'redis',
    },

    // Rate limiting
    rateLimiting: {
      enabled: process.env.AI_RATE_LIMIT_ENABLED !== 'false',
      requestsPerMinute: parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || '60'),
      requestsPerHour: parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '1000'),
    },

    // Features (all enabled by default, restricted by subscription plan)
    enabledFeatures: Object.values(Features),

    // Monitoring
    monitoring: {
      enabled: process.env.AI_MONITORING_ENABLED !== 'false',
      logRequests: process.env.AI_LOG_REQUESTS === 'true',
      logResponses: process.env.AI_LOG_RESPONSES === 'true',
    },
  }
}

// =====================================================
// MODEL SELECTION LOGIC
// =====================================================

/**
 * Select appropriate model based on complexity and subscription plan
 */
export function selectModel(
  complexity: QueryComplexity,
  plan: SubscriptionPlan,
  forceModel?: ClaudeModel
): ModelSelection {
  // If model is forced (for testing or enterprise custom configs)
  if (forceModel) {
    return {
      model: forceModel,
      maxTokens: getMaxTokensForModel(forceModel),
      temperature: getDefaultTemperature(complexity),
    }
  }

  // Get base model from plan
  let model = PLAN_MODEL_MAP[plan]

  // For complex queries on Business plan, consider upgrading to Sonnet if not already
  if (complexity === 'complex' && plan === Plans.BUSINESS && model !== Models.SONNET) {
    model = Models.SONNET
  }

  // For enterprise, select based on complexity
  if (plan === Plans.ENTERPRISE) {
    switch (complexity) {
      case 'simple':
        model = Models.HAIKU
        break
      case 'medium':
        model = Models.SONNET
        break
      case 'complex':
        model = Models.OPUS
        break
    }
  }

  return {
    model,
    maxTokens: getMaxTokensForModel(model),
    temperature: getDefaultTemperature(complexity),
  }
}

/**
 * Get max tokens for a model
 */
function getMaxTokensForModel(model: ClaudeModel): number {
  switch (model) {
    case Models.HAIKU:
      return 4096
    case Models.SONNET:
      return 8192
    case Models.OPUS:
      return 16384
    default:
      return 4096
  }
}

/**
 * Get default temperature based on complexity
 */
function getDefaultTemperature(complexity: QueryComplexity): number {
  switch (complexity) {
    case 'simple':
      return 0.3 // More deterministic for simple queries
    case 'medium':
      return 0.7 // Balanced
    case 'complex':
      return 0.9 // More creative for complex analysis
    default:
      return 0.7
  }
}

// =====================================================
// COST CALCULATION
// =====================================================

/**
 * Calculate cost in USD for token usage
 */
export function calculateCost(
  model: ClaudeModel,
  tokensInput: number,
  tokensOutput: number,
  tokensCacheWrite: number = 0,
  tokensCacheRead: number = 0
): number {
  const pricing = MODEL_PRICING[model]

  if (!pricing) {
    throw new Error(`Unknown model: ${model}`)
  }

  const inputCost = (tokensInput / 1_000_000) * pricing.input
  const outputCost = (tokensOutput / 1_000_000) * pricing.output
  const cacheWriteCost = (tokensCacheWrite / 1_000_000) * pricing.cacheWrite
  const cacheReadCost = (tokensCacheRead / 1_000_000) * pricing.cacheRead

  return inputCost + outputCost + cacheWriteCost + cacheReadCost
}

// =====================================================
// FEATURE AVAILABILITY
// =====================================================

/**
 * Check if a feature is available for a subscription plan
 */
export function isFeatureAvailable(feature: AIFeatureType, plan: SubscriptionPlan): boolean {
  // Starter plan has no AI features
  if (plan === Plans.STARTER) {
    return false
  }

  // Enterprise has all features
  if (plan === Plans.ENTERPRISE) {
    return true
  }

  // Check plan-specific features
  const allowedFeatures: Record<SubscriptionPlan, AIFeatureType[]> = {
    [Plans.STARTER]: [],
    [Plans.PROFESSIONAL]: [
      Features.CHAT,
      Features.NATURAL_LANGUAGE_QUERY,
      Features.LEAD_SCORING,
      Features.SENTIMENT_ANALYSIS,
    ],
    [Plans.BUSINESS]: [
      Features.CHAT,
      Features.NATURAL_LANGUAGE_QUERY,
      Features.ACTION_EXECUTION,
      Features.LEAD_SCORING,
      Features.CONTACT_ENRICHMENT,
      Features.SENTIMENT_ANALYSIS,
      Features.DEAL_INSIGHTS,
      Features.WIN_PROBABILITY,
      Features.NEXT_BEST_ACTION,
      Features.EMAIL_GENERATION,
      Features.CHURN_PREDICTION,
      Features.TREND_ANALYSIS,
      Features.CAMPAIGN_OPTIMIZATION,
    ],
    [Plans.ENTERPRISE]: Object.values(Features),
  }

  return allowedFeatures[plan]?.includes(feature) || false
}

// =====================================================
// PROMPT CACHE CONFIGURATION
// =====================================================

/**
 * Features that benefit from prompt caching
 */
export const CACHEABLE_FEATURES: Set<AIFeatureType> = new Set([
  Features.LEAD_SCORING,
  Features.WIN_PROBABILITY,
  Features.SENTIMENT_ANALYSIS,
  Features.DEAL_INSIGHTS,
  Features.CHURN_PREDICTION,
  Features.TREND_ANALYSIS,
])

/**
 * Check if a feature should use prompt caching
 */
export function shouldUseCache(feature: AIFeatureType): boolean {
  return CACHEABLE_FEATURES.has(feature)
}

/**
 * Get cache TTL for a feature (in seconds)
 */
export function getCacheTTL(feature: AIFeatureType): number {
  // Cache times based on data volatility
  const cacheTTLMap: Partial<Record<AIFeatureType, number>> = {
    [Features.LEAD_SCORING]: 3600, // 1 hour
    [Features.WIN_PROBABILITY]: 1800, // 30 minutes
    [Features.SENTIMENT_ANALYSIS]: 7200, // 2 hours
    [Features.DEAL_INSIGHTS]: 3600, // 1 hour
    [Features.CHURN_PREDICTION]: 86400, // 24 hours
    [Features.TREND_ANALYSIS]: 86400, // 24 hours
    [Features.CHAT]: 300, // 5 minutes
    [Features.NATURAL_LANGUAGE_QUERY]: 600, // 10 minutes
  }

  return cacheTTLMap[feature] || 3600 // Default 1 hour
}

// =====================================================
// SYSTEM PROMPTS
// =====================================================

/**
 * Base system prompt for all AI interactions
 */
export const BASE_SYSTEM_PROMPT = `You are Albedo, an AI assistant integrated into ClientForge CRM. Your role is to help users manage their customer relationships, analyze data, and make informed business decisions.

Key Guidelines:
- Be professional, concise, and actionable
- Always consider the business context and CRM data provided
- Suggest specific actions when appropriate
- Acknowledge uncertainty when you don't have enough data
- Format responses clearly with bullet points or numbered lists when helpful
- When suggesting actions, provide clear reasoning
- Respect data privacy and security - never suggest sharing sensitive information externally

Available CRM Context:
- Contacts and accounts
- Deals and pipeline data
- Tasks and activities
- Notes, tags, and custom fields
- Historical interactions and communications

Current Date: {{current_date}}
User Timezone: {{user_timezone}}`

/**
 * Feature-specific system prompt additions
 */
export const FEATURE_PROMPTS: Partial<Record<AIFeatureType, string>> = {
  [Features.LEAD_SCORING]: `
You are scoring a lead based on CRM data. Provide a score from 0-100 and explain the key factors.
Consider: engagement level, company fit, budget indicators, timeline, decision-making authority.`,

  [Features.WIN_PROBABILITY]: `
You are analyzing deal win probability. Provide a percentage (0-100%) and key factors.
Consider: deal stage, engagement, competition, budget alignment, timeline, stakeholder involvement.`,

  [Features.SENTIMENT_ANALYSIS]: `
You are analyzing sentiment from communications. Categorize as positive, neutral, or negative.
Provide confidence level and key sentiment indicators.`,

  [Features.DEAL_INSIGHTS]: `
You are analyzing a deal and providing actionable insights.
Focus on: risks, opportunities, next steps, competitive positioning, stakeholder engagement.`,

  [Features.NEXT_BEST_ACTION]: `
You are recommending the next best action for maximum impact.
Prioritize actions by: urgency, impact, effort required, success probability.`,

  [Features.EMAIL_GENERATION]: `
You are generating a professional email. Match the tone to the context.
Keep emails: personalized, concise, action-oriented, professional.`,

  [Features.CHURN_PREDICTION]: `
You are predicting customer churn risk. Provide risk level (low/medium/high) and indicators.
Consider: engagement trends, support tickets, renewal date, usage patterns, sentiment.`,

  [Features.SALES_FORECASTING]: `
You are forecasting sales based on pipeline and historical data.
Provide: forecast amount, confidence level, key assumptions, risks and opportunities.`,

  [Features.CAMPAIGN_OPTIMIZATION]: `
You are analyzing campaign performance and suggesting optimizations.
Focus on: audience targeting, messaging, timing, channels, conversion rates.`,

  [Features.WORKFLOW_SUGGESTIONS]: `
You are suggesting workflow automations to improve efficiency.
Recommend: trigger conditions, actions, expected benefits, implementation complexity.`,
}

/**
 * Get system prompt for a feature
 */
export function getSystemPrompt(
  feature: AIFeatureType,
  customPrompt?: string
): string {
  if (customPrompt) {
    return customPrompt
  }

  const featurePrompt = FEATURE_PROMPTS[feature] || ''
  return BASE_SYSTEM_PROMPT + '\n\n' + featurePrompt
}

// =====================================================
// RATE LIMITING CONFIGURATION
// =====================================================

/**
 * Rate limit tiers by subscription plan
 */
export const RATE_LIMIT_TIERS: Record<
  SubscriptionPlan,
  { perMinute: number; perHour: number; perDay: number }
> = {
  [Plans.STARTER]: { perMinute: 0, perHour: 0, perDay: 0 },
  [Plans.PROFESSIONAL]: { perMinute: 10, perHour: 100, perDay: 500 },
  [Plans.BUSINESS]: { perMinute: 30, perHour: 500, perDay: 2000 },
  [Plans.ENTERPRISE]: { perMinute: 100, perHour: 2000, perDay: 10000 },
}

/**
 * Get rate limits for a subscription plan
 */
export function getRateLimits(plan: SubscriptionPlan) {
  return RATE_LIMIT_TIERS[plan]
}

// =====================================================
// EXPORT CONFIGURATION
// =====================================================

export const aiConfig = loadAIConfig()
