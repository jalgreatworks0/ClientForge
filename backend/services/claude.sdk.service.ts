/**
 * Claude SDK Service
 *
 * Wrapper for Anthropic Claude API (primary AI provider)
 * Supports all Claude models: Haiku, Sonnet, and Opus
 *
 * @module services/claude.sdk
 */

import Anthropic from '@anthropic-ai/sdk';
// import { dbRun } from '../utils/database'; // TODO: Create database utilities

interface ModelConfig {
  id: string;
  name: string;
  inputCost: number;
  outputCost: number;
  cacheWriteCost: number;
  cacheReadCost: number;
  description: string;
  maxTokens: number;
}

interface ChatOptions {
  model?: 'haiku' | 'sonnet' | 'opus';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  userId?: number;
  useCache?: boolean;
}

interface ChatResponse {
  success: boolean;
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cacheReadTokens?: number;
    cacheWriteTokens?: number;
  };
  cost: number;
  latency: number;
}

class ClaudeSDKService {
  private client: Anthropic;
  private models: Record<string, ModelConfig>;
  private defaultModel: string;

  constructor() {
    // Use ClientForge-specific API key for SDK bot
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY_CLIENTFORGE || process.env.ANTHROPIC_API_KEY,
    });

    // Model configurations (Claude 3.5 family)
    this.models = {
      haiku: {
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        inputCost: 1.0,     // $1.00 per 1M input tokens
        outputCost: 5.0,    // $5.00 per 1M output tokens
        cacheWriteCost: 1.25, // $1.25 per 1M tokens (cache write)
        cacheReadCost: 0.1,   // $0.10 per 1M tokens (cache read)
        description: 'Fastest, most cost-effective',
        maxTokens: 8192,
      },
      sonnet: {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        inputCost: 3.0,     // $3.00 per 1M input tokens
        outputCost: 15.0,   // $15.00 per 1M output tokens
        cacheWriteCost: 3.75, // $3.75 per 1M tokens (cache write)
        cacheReadCost: 0.3,   // $0.30 per 1M tokens (cache read)
        description: 'Best balance of speed and intelligence',
        maxTokens: 8192,
      },
      opus: {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        inputCost: 15.0,    // $15.00 per 1M input tokens
        outputCost: 75.0,   // $75.00 per 1M output tokens
        cacheWriteCost: 18.75, // $18.75 per 1M tokens (cache write)
        cacheReadCost: 1.5,    // $1.50 per 1M tokens (cache read)
        description: 'Most powerful, for complex reasoning',
        maxTokens: 4096,
      },
    };

    this.defaultModel = 'haiku';

    console.log('[OK] Claude SDK Service initialized');
  }

  /**
   * Chat completion with Claude
   */
  async chat(messages: any[], options: ChatOptions = {}): Promise<ChatResponse> {
    try {
      const model = this.models[options.model || this.defaultModel];
      const startTime = Date.now();

      // Build system message
      const systemBlocks: any[] = [];
      if (options.systemPrompt) {
        systemBlocks.push({
          type: 'text',
          text: options.systemPrompt,
          cache_control: options.useCache ? { type: 'ephemeral' } : undefined,
        });
      }

      // Create completion
      const response = await this.client.messages.create({
        model: model.id,
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature ?? 0.7,
        system: systemBlocks.length > 0 ? systemBlocks : undefined,
        messages: messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const latency = Date.now() - startTime;

      // Extract text content
      const content = response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');

      // Calculate cost
      const cost = this._calculateCost(
        response.usage.input_tokens,
        response.usage.output_tokens,
        response.usage.cache_creation_input_tokens || 0,
        response.usage.cache_read_input_tokens || 0,
        model
      );

      // Track usage
      // TODO: Re-enable once database utilities are created
      // if (options.userId) {
      //   await this._trackUsage(options.userId, model.id, response.usage, cost);
      // }

      return {
        success: true,
        content: content,
        model: model.name,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
          cacheReadTokens: response.usage.cache_read_input_tokens || 0,
          cacheWriteTokens: response.usage.cache_creation_input_tokens || 0,
        },
        cost: cost,
        latency: latency,
      };
    } catch (error: any) {
      console.error('Claude SDK error:', error);
      throw new Error(`Claude error: ${error.message}`);
    }
  }

  /**
   * Stream chat completion (for real-time responses)
   */
  async *chatStream(messages: any[], options: ChatOptions = {}): AsyncGenerator<string, void, unknown> {
    try {
      const model = this.models[options.model || this.defaultModel];

      // Build system message
      const systemBlocks: any[] = [];
      if (options.systemPrompt) {
        systemBlocks.push({
          type: 'text',
          text: options.systemPrompt,
          cache_control: options.useCache ? { type: 'ephemeral' } : undefined,
        });
      }

      // Create streaming completion
      const stream = await this.client.messages.create({
        model: model.id,
        max_tokens: options.maxTokens || model.maxTokens,
        temperature: options.temperature ?? 0.7,
        system: systemBlocks.length > 0 ? systemBlocks : undefined,
        messages: messages.map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
        stream: true,
      });

      // Process stream
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    } catch (error: any) {
      console.error('Claude SDK stream error:', error);
      throw new Error(`Claude stream error: ${error.message}`);
    }
  }

  /**
   * Get available models
   */
  getModels(): ModelConfig[] {
    return Object.values(this.models);
  }

  /**
   * Get specific model config
   */
  getModel(modelKey: string): ModelConfig | undefined {
    return this.models[modelKey];
  }

  // Private methods

  private _calculateCost(
    inputTokens: number,
    outputTokens: number,
    cacheWriteTokens: number,
    cacheReadTokens: number,
    model: ModelConfig
  ): number {
    const inputCost = (inputTokens / 1000000) * model.inputCost;
    const outputCost = (outputTokens / 1000000) * model.outputCost;
    const cacheWriteCost = (cacheWriteTokens / 1000000) * model.cacheWriteCost;
    const cacheReadCost = (cacheReadTokens / 1000000) * model.cacheReadCost;

    return inputCost + outputCost + cacheWriteCost + cacheReadCost;
  }

  // TODO: Re-enable once database utilities are created
  // private async _trackUsage(
  //   userId: number,
  //   modelId: string,
  //   usage: any,
  //   cost: number
  // ): Promise<void> {
  //   try {
  //     await dbRun(
  //       `INSERT INTO claude_usage (
  //         user_id, model, input_tokens, output_tokens,
  //         cache_read_tokens, cache_write_tokens, cost, created_at
  //       ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
  //       [
  //         userId,
  //         modelId,
  //         usage.input_tokens,
  //         usage.output_tokens,
  //         usage.cache_read_input_tokens || 0,
  //         usage.cache_creation_input_tokens || 0,
  //         cost,
  //       ]
  //     );
  //   } catch (error) {
  //     console.error('Failed to track Claude usage:', error);
  //   }
  // }
}

export default new ClaudeSDKService();
