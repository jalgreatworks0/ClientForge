/**
 * Centralized AI Service
 * Main service for all AI interactions using Claude SDK
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient, type RedisClientType } from 'redis'
import type {
  AIRequest,
  AIResponse,
  AIContext,
  AIStreamCallback,
  AIStreamChunk,
  ClaudeModel,
  QueryComplexity,
  AIFeatureType,
  SubscriptionPlan,
  ModelSelection,
  AIError,
  AIErrorCode,
} from './ai-types'
import {
  aiConfig,
  selectModel,
  calculateCost,
  getSystemPrompt,
  shouldUseCache,
  getCacheTTL,
} from './ai-config'
import { ValidationError } from '../../../utils/errors'

// =====================================================
// AI SERVICE CLASS
// =====================================================

export class AIService {
  private client: Anthropic
  private redis: RedisClientType | null = null
  private cacheEnabled: boolean

  constructor() {
    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: aiConfig.apiKey,
      baseURL: aiConfig.baseURL,
      timeout: aiConfig.timeout,
      maxRetries: aiConfig.maxRetries,
    })

    this.cacheEnabled = aiConfig.cache.enabled

    // Initialize Redis for caching if enabled
    if (this.cacheEnabled && aiConfig.cache.provider === 'redis') {
      this.initializeRedis()
    }
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      this.redis = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      })

      this.redis.on('error', (err) => {
        console.error('Redis Client Error:', err)
      })

      await this.redis.connect()
      console.log('AI Service: Redis cache connected')
    } catch (error) {
      console.error('AI Service: Failed to connect to Redis, caching disabled', error)
      this.cacheEnabled = false
      this.redis = null
    }
  }

  /**
   * Main method to execute AI requests
   */
  async execute(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      // Validate request
      this.validateRequest(request)

      // Check cache first
      if (this.cacheEnabled && shouldUseCache(request.featureType)) {
        const cached = await this.getFromCache(request)
        if (cached) {
          return {
            ...cached,
            cached: true,
            latencyMs: Date.now() - startTime,
          }
        }
      }

      // Select appropriate model based on complexity and subscription
      const modelSelection = this.selectModelForRequest(request)

      // Build system prompt
      const systemPrompt = this.buildSystemPrompt(request)

      // Build user message with context
      const userMessage = this.buildUserMessage(request)

      // Execute Claude API request
      const response = await this.callClaude(
        systemPrompt,
        userMessage,
        modelSelection,
        request.options?.temperature,
        shouldUseCache(request.featureType)
      )

      // Calculate cost
      const cost = calculateCost(
        modelSelection.model,
        response.usage.input_tokens,
        response.usage.output_tokens,
        response.usage.cache_creation_input_tokens || 0,
        response.usage.cache_read_input_tokens || 0
      )

      // Build AI response
      const aiResponse: AIResponse = {
        result: this.extractTextFromResponse(response),
        model: modelSelection.model,
        tokensUsed: {
          input: response.usage.input_tokens,
          output: response.usage.output_tokens,
          cacheRead: response.usage.cache_read_input_tokens,
          cacheWrite: response.usage.cache_creation_input_tokens,
        },
        costUSD: cost,
        latencyMs: Date.now() - startTime,
        featureType: request.featureType,
        cached: false,
      }

      // Parse structured data if present
      aiResponse.data = this.parseStructuredData(aiResponse.result)

      // Extract suggested actions if present
      aiResponse.suggestedActions = this.extractActions(aiResponse.result)

      // Cache response if applicable
      if (this.cacheEnabled && shouldUseCache(request.featureType)) {
        await this.saveToCache(request, aiResponse)
      }

      return aiResponse
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * Execute AI request with streaming response
   */
  async executeStream(request: AIRequest, callback: AIStreamCallback): Promise<void> {
    try {
      this.validateRequest(request)

      const modelSelection = this.selectModelForRequest(request)
      const systemPrompt = this.buildSystemPrompt(request)
      const userMessage = this.buildUserMessage(request)

      // Create streaming request
      const stream = await this.client.messages.create({
        model: modelSelection.model,
        max_tokens: modelSelection.maxTokens,
        temperature: request.options?.temperature || modelSelection.temperature,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: shouldUseCache(request.featureType)
              ? { type: 'ephemeral' }
              : undefined,
          },
        ],
        messages: [
          {
            role: 'user',
            content: userMessage,
          },
        ],
        stream: true,
      })

      let chunkIndex = 0

      // Process stream
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          const chunk: AIStreamChunk = {
            type: 'text',
            content: event.delta.text,
            index: chunkIndex++,
            done: false,
          }
          callback(chunk)
        }

        if (event.type === 'message_stop') {
          const chunk: AIStreamChunk = {
            type: 'text',
            content: '',
            index: chunkIndex,
            done: true,
          }
          callback(chunk)
        }
      }
    } catch (error) {
      const errorChunk: AIStreamChunk = {
        type: 'error',
        content: this.handleError(error).message,
        index: -1,
        done: true,
      }
      callback(errorChunk)
    }
  }

  /**
   * Call Claude API
   */
  private async callClaude(
    systemPrompt: string,
    userMessage: string,
    modelSelection: ModelSelection,
    temperature?: number,
    useCache: boolean = false
  ): Promise<Anthropic.Message> {
    const response = await this.client.messages.create({
      model: modelSelection.model,
      max_tokens: modelSelection.maxTokens,
      temperature: temperature || modelSelection.temperature,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          cache_control: useCache ? { type: 'ephemeral' } : undefined,
        },
      ],
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    return response
  }

  /**
   * Validate AI request
   */
  private validateRequest(request: AIRequest): void {
    if (!request.prompt || request.prompt.trim().length === 0) {
      throw new ValidationError('Prompt is required')
    }

    if (request.prompt.length > 50000) {
      throw new ValidationError('Prompt exceeds maximum length of 50,000 characters')
    }

    if (!request.context.tenantId || !request.context.userId) {
      throw new ValidationError('Context must include tenantId and userId')
    }
  }

  /**
   * Select model for request based on complexity and plan
   */
  private selectModelForRequest(request: AIRequest): ModelSelection {
    // For now, we'll use a default plan (this will be replaced with actual subscription lookup)
    // TODO: Fetch actual subscription plan from database
    const plan = SubscriptionPlan.BUSINESS // Default for development

    return selectModel(request.complexity, plan, request.options?.cacheKey as ClaudeModel)
  }

  /**
   * Build system prompt with context
   */
  private buildSystemPrompt(request: AIRequest): string {
    let systemPrompt = getSystemPrompt(request.featureType, request.systemPrompt)

    // Replace variables
    const now = new Date()
    systemPrompt = systemPrompt.replace('{{current_date}}', now.toISOString())
    systemPrompt = systemPrompt.replace(
      '{{user_timezone}}',
      request.context.preferences?.timezone || 'UTC'
    )

    return systemPrompt
  }

  /**
   * Build user message with full context
   */
  private buildUserMessage(request: AIRequest): string {
    const parts: string[] = []

    // Add CRM context if available
    if (request.context.entityType && request.context.entityId) {
      parts.push(`Context: ${request.context.entityType} (ID: ${request.context.entityId})`)

      if (request.context.entityData) {
        parts.push(`\nEntity Data:\n${JSON.stringify(request.context.entityData, null, 2)}`)
      }
    }

    // Add recent activities
    if (request.context.recentActivities && request.context.recentActivities.length > 0) {
      parts.push(
        `\nRecent Activities:\n${JSON.stringify(request.context.recentActivities, null, 2)}`
      )
    }

    // Add related entities
    if (request.context.relatedContacts && request.context.relatedContacts.length > 0) {
      parts.push(
        `\nRelated Contacts:\n${JSON.stringify(request.context.relatedContacts, null, 2)}`
      )
    }

    if (request.context.relatedDeals && request.context.relatedDeals.length > 0) {
      parts.push(`\nRelated Deals:\n${JSON.stringify(request.context.relatedDeals, null, 2)}`)
    }

    // Add custom fields
    if (request.context.customFields && request.context.customFields.length > 0) {
      parts.push(`\nCustom Fields:\n${JSON.stringify(request.context.customFields, null, 2)}`)
    }

    // Add user prompt
    parts.push(`\n\nUser Query:\n${request.prompt}`)

    return parts.join('\n')
  }

  /**
   * Extract text from Claude response
   */
  private extractTextFromResponse(response: Anthropic.Message): string {
    const textBlocks = response.content.filter((block) => block.type === 'text')
    return textBlocks.map((block: any) => block.text).join('\n')
  }

  /**
   * Parse structured data from response (JSON blocks)
   */
  private parseStructuredData(responseText: string): Record<string, any> | undefined {
    // Look for JSON code blocks
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1])
      } catch {
        return undefined
      }
    }
    return undefined
  }

  /**
   * Extract suggested actions from response
   */
  private extractActions(responseText: string): any[] | undefined {
    // Look for action blocks
    const data = this.parseStructuredData(responseText)
    if (data && data.actions) {
      return data.actions
    }
    return undefined
  }

  /**
   * Get response from cache
   */
  private async getFromCache(request: AIRequest): Promise<AIResponse | null> {
    if (!this.redis) return null

    try {
      const cacheKey = this.buildCacheKey(request)
      const cached = await this.redis.get(cacheKey)

      if (cached) {
        return JSON.parse(cached)
      }
    } catch (error) {
      console.error('Cache read error:', error)
    }

    return null
  }

  /**
   * Save response to cache
   */
  private async saveToCache(request: AIRequest, response: AIResponse): Promise<void> {
    if (!this.redis) return

    try {
      const cacheKey = this.buildCacheKey(request)
      const ttl = request.options?.cacheTTL || getCacheTTL(request.featureType)

      await this.redis.setEx(cacheKey, ttl, JSON.stringify(response))
    } catch (error) {
      console.error('Cache write error:', error)
    }
  }

  /**
   * Build cache key from request
   */
  private buildCacheKey(request: AIRequest): string {
    const parts = [
      'ai',
      request.featureType,
      request.context.tenantId,
      request.complexity,
      this.hashString(request.prompt),
    ]

    if (request.context.entityType && request.context.entityId) {
      parts.push(request.context.entityType, request.context.entityId)
    }

    return parts.join(':')
  }

  /**
   * Simple string hash for cache keys
   */
  private hashString(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return hash.toString(36)
  }

  /**
   * Handle errors and convert to AIError
   */
  private handleError(error: any): Error {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return new Error('AI_RATE_LIMIT: Rate limit exceeded. Please try again later.')
      }
      if (error.status === 401) {
        return new Error('AI_API_ERROR: Invalid API key')
      }
      return new Error(`AI_API_ERROR: ${error.message}`)
    }

    if (error instanceof ValidationError) {
      return error
    }

    return new Error(`AI_ERROR: ${error.message || 'Unknown error'}`)
  }

  /**
   * Close connections
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
    }
  }
}

// =====================================================
// SINGLETON INSTANCE
// =====================================================

export const aiService = new AIService()
