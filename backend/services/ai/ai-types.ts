/**
 * AI Service Types
 * Type definitions for the centralized AI service using Claude SDK
 */

import type Anthropic from '@anthropic-ai/sdk'

// =====================================================
// AI MODEL CONFIGURATION
// =====================================================

/**
 * Available Claude models mapped to subscription tiers
 */
export enum ClaudeModel {
  HAIKU = 'claude-3-5-haiku-20241022',
  SONNET = 'claude-3-5-sonnet-20241022',
  OPUS = 'claude-opus-4-20250514',
}

/**
 * Subscription plan types
 */
export enum SubscriptionPlan {
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

/**
 * Model selection based on complexity and subscription
 */
export interface ModelSelection {
  model: ClaudeModel
  maxTokens: number
  temperature: number
}

// =====================================================
// AI REQUEST TYPES
// =====================================================

/**
 * Query complexity levels for model selection
 */
export enum QueryComplexity {
  SIMPLE = 'simple', // Basic queries, quick responses
  MEDIUM = 'medium', // Standard analysis, recommendations
  COMPLEX = 'complex', // Deep analysis, forecasting, predictions
}

/**
 * AI feature types for tracking and quota management
 */
export enum AIFeatureType {
  // Albedo Chat Features
  CHAT = 'chat',
  NATURAL_LANGUAGE_QUERY = 'natural_language_query',
  ACTION_EXECUTION = 'action_execution',

  // Lead & Contact Features
  LEAD_SCORING = 'lead_scoring',
  CONTACT_ENRICHMENT = 'contact_enrichment',
  SENTIMENT_ANALYSIS = 'sentiment_analysis',

  // Deal & Sales Features
  DEAL_INSIGHTS = 'deal_insights',
  WIN_PROBABILITY = 'win_probability',
  SALES_FORECASTING = 'sales_forecasting',
  NEXT_BEST_ACTION = 'next_best_action',

  // Marketing & Campaign Features
  EMAIL_GENERATION = 'email_generation',
  CAMPAIGN_OPTIMIZATION = 'campaign_optimization',
  AUDIENCE_SEGMENTATION = 'audience_segmentation',

  // Analytics Features
  CHURN_PREDICTION = 'churn_prediction',
  TREND_ANALYSIS = 'trend_analysis',
  CUSTOM_INSIGHTS = 'custom_insights',

  // Automation
  WORKFLOW_SUGGESTIONS = 'workflow_suggestions',
  SMART_ASSIGNMENT = 'smart_assignment',
}

/**
 * Context data for AI requests
 */
export interface AIContext {
  tenantId: string
  userId: string
  userRole?: string

  // Entity context (if applicable)
  entityType?: string
  entityId?: string
  entityData?: Record<string, any>

  // CRM data context
  recentActivities?: any[]
  relatedContacts?: any[]
  relatedDeals?: any[]
  customFields?: any[]

  // User preferences
  preferences?: {
    language?: string
    timezone?: string
    dateFormat?: string
  }
}

/**
 * AI Request structure
 */
export interface AIRequest {
  // Request identification
  featureType: AIFeatureType
  complexity: QueryComplexity

  // User query
  prompt: string

  // Context
  context: AIContext

  // Options
  options?: {
    temperature?: number
    maxTokens?: number
    streamResponse?: boolean
    cacheKey?: string
    cacheTTL?: number // seconds
  }

  // System prompt override (optional)
  systemPrompt?: string
}

/**
 * AI Response structure
 */
export interface AIResponse {
  // Response data
  result: string
  confidence?: number // 0-1

  // Metadata
  model: ClaudeModel
  tokensUsed: {
    input: number
    output: number
    cacheRead?: number
    cacheWrite?: number
  }
  costUSD: number
  latencyMs: number

  // Context
  featureType: AIFeatureType
  cached: boolean

  // Additional data (feature-specific)
  data?: Record<string, any>

  // Suggestions/Actions
  suggestedActions?: AIAction[]
}

/**
 * AI-suggested actions
 */
export interface AIAction {
  type: string // 'create_task', 'send_email', 'update_deal', etc.
  label: string
  description?: string
  params: Record<string, any>
  confidence: number
}

// =====================================================
// STREAMING RESPONSES
// =====================================================

/**
 * Stream chunk for real-time responses
 */
export interface AIStreamChunk {
  type: 'text' | 'action' | 'metadata' | 'error'
  content: string
  index: number
  done: boolean
}

/**
 * Stream callback type
 */
export type AIStreamCallback = (chunk: AIStreamChunk) => void

// =====================================================
// USAGE TRACKING
// =====================================================

/**
 * AI usage record for tracking and billing
 */
export interface AIUsageRecord {
  id?: string
  tenantId: string
  userId: string

  // Request details
  featureType: AIFeatureType
  complexity: QueryComplexity
  model: ClaudeModel

  // Usage metrics
  tokensInput: number
  tokensOutput: number
  tokensCacheRead: number
  tokensCacheWrite: number
  tokensTotal: number

  // Cost
  costUSD: number

  // Performance
  latencyMs: number
  cached: boolean

  // Timestamps
  createdAt: Date
}

/**
 * Subscription quota information
 */
export interface SubscriptionQuota {
  tenantId: string
  plan: SubscriptionPlan

  // Monthly quota
  aiQuotaMonthly: number
  aiQuotaUsed: number
  aiQuotaRemaining: number

  // Model access
  allowedModels: ClaudeModel[]

  // Feature access
  enabledFeatures: AIFeatureType[]

  // Billing period
  billingPeriodStart: Date
  billingPeriodEnd: Date

  // Status
  status: 'active' | 'trial' | 'suspended' | 'cancelled'
}

// =====================================================
// PROMPT TEMPLATES
// =====================================================

/**
 * Prompt template structure
 */
export interface PromptTemplate {
  name: string
  featureType: AIFeatureType
  systemPrompt: string
  userPromptTemplate: string
  variables: string[]
  complexity: QueryComplexity

  // Cache configuration
  cacheSystemPrompt: boolean
  cacheTTL?: number
}

/**
 * Prompt variables for template rendering
 */
export interface PromptVariables {
  [key: string]: any
}

// =====================================================
// CACHING
// =====================================================

/**
 * Cache entry structure
 */
export interface AICacheEntry {
  key: string
  response: AIResponse
  createdAt: Date
  expiresAt: Date
  hitCount: number
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  enabled: boolean
  ttl: number // seconds
  maxSize: number // MB
  provider: 'redis' | 'memory'
}

// =====================================================
// ERROR TYPES
// =====================================================

/**
 * AI Service error codes
 */
export enum AIErrorCode {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  INVALID_MODEL = 'INVALID_MODEL',
  FEATURE_NOT_ENABLED = 'FEATURE_NOT_ENABLED',
  INVALID_REQUEST = 'INVALID_REQUEST',
  API_ERROR = 'API_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  CACHE_ERROR = 'CACHE_ERROR',
}

/**
 * AI Service error
 */
export interface AIError {
  code: AIErrorCode
  message: string
  details?: any
  retryable: boolean
}

// =====================================================
// STATISTICS & ANALYTICS
// =====================================================

/**
 * AI usage statistics
 */
export interface AIUsageStats {
  tenantId: string
  period: {
    start: Date
    end: Date
  }

  // Query metrics
  totalQueries: number
  queriesByFeature: Record<AIFeatureType, number>
  queriesByModel: Record<ClaudeModel, number>

  // Token usage
  totalTokens: number
  inputTokens: number
  outputTokens: number
  cachedTokens: number

  // Cost
  totalCostUSD: number
  costByFeature: Record<AIFeatureType, number>
  costByModel: Record<ClaudeModel, number>

  // Performance
  avgLatencyMs: number
  cacheHitRate: number // 0-1

  // Quota
  quotaUsed: number
  quotaRemaining: number
  quotaUtilization: number // 0-1
}

/**
 * Model performance metrics
 */
export interface ModelPerformance {
  model: ClaudeModel
  avgLatencyMs: number
  avgTokensPerRequest: number
  avgCostPerRequest: number
  errorRate: number
  successRate: number
}

// =====================================================
// CONFIGURATION
// =====================================================

/**
 * AI Service configuration
 */
export interface AIServiceConfig {
  // Anthropic API
  apiKey: string
  baseURL?: string
  timeout?: number
  maxRetries?: number

  // Model defaults
  defaultModel: ClaudeModel
  defaultTemperature: number
  defaultMaxTokens: number

  // Caching
  cache: CacheConfig

  // Rate limiting
  rateLimiting: {
    enabled: boolean
    requestsPerMinute: number
    requestsPerHour: number
  }

  // Features
  enabledFeatures: AIFeatureType[]

  // Monitoring
  monitoring: {
    enabled: boolean
    logRequests: boolean
    logResponses: boolean
  }
}

// =====================================================
// SUBSCRIPTION MODEL MAPPING
// =====================================================

/**
 * Plan to model mapping
 */
export const PLAN_MODEL_MAP: Record<SubscriptionPlan, ClaudeModel> = {
  [SubscriptionPlan.STARTER]: ClaudeModel.HAIKU, // No AI actually
  [SubscriptionPlan.PROFESSIONAL]: ClaudeModel.HAIKU,
  [SubscriptionPlan.BUSINESS]: ClaudeModel.SONNET,
  [SubscriptionPlan.ENTERPRISE]: ClaudeModel.OPUS,
}

/**
 * Plan quota mapping
 */
export const PLAN_QUOTA_MAP: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.STARTER]: 0,
  [SubscriptionPlan.PROFESSIONAL]: 100,
  [SubscriptionPlan.BUSINESS]: 500,
  [SubscriptionPlan.ENTERPRISE]: -1, // Unlimited
}

/**
 * Plan features mapping
 */
export const PLAN_FEATURES_MAP: Record<SubscriptionPlan, AIFeatureType[]> = {
  [SubscriptionPlan.STARTER]: [],
  [SubscriptionPlan.PROFESSIONAL]: [
    AIFeatureType.CHAT,
    AIFeatureType.NATURAL_LANGUAGE_QUERY,
    AIFeatureType.LEAD_SCORING,
    AIFeatureType.SENTIMENT_ANALYSIS,
  ],
  [SubscriptionPlan.BUSINESS]: [
    AIFeatureType.CHAT,
    AIFeatureType.NATURAL_LANGUAGE_QUERY,
    AIFeatureType.ACTION_EXECUTION,
    AIFeatureType.LEAD_SCORING,
    AIFeatureType.CONTACT_ENRICHMENT,
    AIFeatureType.SENTIMENT_ANALYSIS,
    AIFeatureType.DEAL_INSIGHTS,
    AIFeatureType.WIN_PROBABILITY,
    AIFeatureType.NEXT_BEST_ACTION,
    AIFeatureType.EMAIL_GENERATION,
    AIFeatureType.CHURN_PREDICTION,
  ],
  [SubscriptionPlan.ENTERPRISE]: Object.values(AIFeatureType),
}

// =====================================================
// PRICING (per 1M tokens)
// =====================================================

export const MODEL_PRICING = {
  [ClaudeModel.HAIKU]: {
    input: 1.0,
    output: 5.0,
    cacheWrite: 1.25,
    cacheRead: 0.1,
  },
  [ClaudeModel.SONNET]: {
    input: 3.0,
    output: 15.0,
    cacheWrite: 3.75,
    cacheRead: 0.3,
  },
  [ClaudeModel.OPUS]: {
    input: 15.0,
    output: 75.0,
    cacheWrite: 18.75,
    cacheRead: 1.5,
  },
}
