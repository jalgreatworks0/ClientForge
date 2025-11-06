/**
 * Multi-Provider AI Service
 *
 * Intelligent routing between Claude, OpenAI, and fallbacks
 * Maximizes quality while minimizing cost
 *
 * @module services/ai.multi-provider
 */

import claudeService from './claude.sdk.service';
import openaiService from './openai.service';

interface ChatOptions {
  collaborative?: boolean;
  provider?: 'claude' | 'openai';
  model?: string;
  systemPrompt?: string;
  userId?: number;
  maxTokens?: number;
  temperature?: number;
  needsValidation?: boolean;
  image?: string;
  imageUrl?: string;
  hasImage?: boolean;
  audio?: string;
  hasAudio?: boolean;
  fallback?: boolean;
}

interface ChatResponse {
  success: boolean;
  content: string;
  model?: string;
  usage?: any;
  cost?: number;
  latency?: number;
  routedTo?: string;
  routingReason?: string;
  collaborative?: boolean;
  claudeAnalysis?: string;
  openaiReview?: string;
  totalCost?: number;
}

class AIMultiProviderService {
  private providers: Record<string, any>;
  private strategy: Record<string, string>;

  constructor() {
    this.providers = {
      claude: claudeService,
      openai: openaiService,
    };

    // Provider selection strategy
    this.strategy = {
      // Use Claude for these (best quality)
      reasoning: 'claude',
      analysis: 'claude',
      writing: 'claude',
      strategy: 'claude',

      // Use OpenAI for these (has vision)
      images: 'openai',
      voice: 'openai',

      // Use pattern matching for these (free)
      navigation: 'pattern',
      simple: 'pattern',
    };

    console.log('✅ Multi-Provider AI Service initialized');
  }

  /**
   * Smart routing - picks best provider for task
   */
  async chat(message: string, options: ChatOptions = {}): Promise<ChatResponse> {
    try {
      // Collaborative mode: Use both Claude and OpenAI together
      if (options.collaborative) {
        return await this._collaborativeChat(message, options);
      }

      // Determine best provider
      const provider = this._selectProvider(message, options);

      switch (provider) {
        case 'claude':
          return await this._useClaude(message, options);

        case 'openai':
          return await this._useOpenAI(message, options);

        default:
          return await this._useClaude(message, options); // Default to Claude
      }
    } catch (error: any) {
      console.error('Primary provider failed, trying fallback:', error);

      // Fallback chain: Claude → OpenAI → Error
      if (options.provider !== 'openai') {
        return await this._useOpenAI(message, {...options, fallback: true});
      }

      throw error;
    }
  }

  /**
   * Collaborative mode: Claude + OpenAI work together
   * Claude handles reasoning, OpenAI validates or adds vision
   */
  private async _collaborativeChat(message: string, options: ChatOptions): Promise<ChatResponse> {
    try {
      // Step 1: Claude analyzes and plans
      const claudeResponse = await this._useClaude(
        `Analyze this request and create an action plan:\n${message}`,
        { ...options, model: 'sonnet' }
      );

      // Step 2: If complex or needs validation, consult OpenAI
      if (options.needsValidation || message.length > 200) {
        const openaiResponse = await this._useOpenAI(
          `Review this plan and suggest improvements:\n${claudeResponse.content}`,
          { ...options, model: 'mini' }
        );

        // Combine insights
        return {
          success: true,
          content: openaiResponse.content,
          collaborative: true,
          claudeAnalysis: claudeResponse.content,
          openaiReview: openaiResponse.content,
          totalCost: (claudeResponse.cost || 0) + (openaiResponse.cost || 0),
          model: 'Claude Sonnet + GPT-4o Mini',
        };
      }

      return claudeResponse;
    } catch (error) {
      console.error('Collaborative chat error:', error);
      throw error;
    }
  }

  /**
   * Use Claude (primary for CRM)
   */
  private async _useClaude(message: string, options: ChatOptions): Promise<ChatResponse> {
    const messages = [{ role: 'user', content: message }];

    return await claudeService.chat(messages, {
      model: options.model || 'haiku',
      systemPrompt: options.systemPrompt,
      userId: options.userId,
      maxTokens: options.maxTokens || 4096,
    });
  }

  /**
   * Use OpenAI (fallback + vision)
   */
  private async _useOpenAI(message: string, options: ChatOptions): Promise<ChatResponse> {
    const openai = this.providers.openai;

    // Handle vision requests
    if (options.image || options.imageUrl) {
      return await openai.vision(options.image || options.imageUrl, message, {
        model: 'standard',
        userId: options.userId,
      });
    }

    // Standard chat
    const messages = [{ role: 'user', content: message }];

    return await openai.chat(messages, {
      model: options.model || 'mini',
      userId: options.userId,
      maxTokens: options.maxTokens || 4096,
      temperature: options.temperature,
    });
  }

  /**
   * Select best provider based on task
   */
  private _selectProvider(message: string, options: ChatOptions): string {
    // User can force a provider
    if (options.provider) return options.provider;

    // Has image → needs OpenAI (Claude doesn't have vision yet)
    if (options.image || options.hasImage) return 'openai';

    // Has voice → needs OpenAI
    if (options.audio || options.hasAudio) return 'openai';

    // Default to Claude (best for text reasoning)
    return 'claude';
  }

  /**
   * Get cost estimate before calling
   */
  estimateCost(message: string, provider: string = 'claude'): number {
    const tokenCount = Math.ceil(message.length / 4); // Rough estimate

    const costs: Record<string, number> = {
      claude_haiku: tokenCount * 0.000001,  // $1 per 1M tokens
      claude_sonnet: tokenCount * 0.000003, // $3 per 1M tokens
      openai_mini: tokenCount * 0.00000015, // $0.15 per 1M tokens
    };

    return costs[`${provider}_haiku`] || costs.claude_haiku;
  }
}

export default new AIMultiProviderService();
