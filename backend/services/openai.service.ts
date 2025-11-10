/**
 * OpenAI Service
 *
 * Wrapper for OpenAI API (fallback + vision capabilities)
 *
 * @module services/openai
 */

import OpenAI from 'openai';
// import { dbRun } from '../utils/database'; // TODO: Create database utilities

interface ModelConfig {
  id: string;
  name: string;
  inputCost: number;
  outputCost: number;
  description: string;
}

interface ChatOptions {
  model?: 'mini' | 'standard';
  temperature?: number;
  maxTokens?: number;
  userId?: number;
}

interface ChatResponse {
  success: boolean;
  content: string;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: number;
  latency: number;
}

class OpenAIService {
  private client: OpenAI;
  private models: Record<string, ModelConfig>;
  private defaultModel: string;

  constructor() {
    // Use ClientForge-specific API key for SDK bot
    const apiKey = process.env.OPENAI_API_KEY_CLIENTFORGE || process.env.OPENAI_API_KEY || 'placeholder-key';
    this.client = new OpenAI({
      apiKey: apiKey,
    });

    // Model configurations
    this.models = {
      mini: {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        inputCost: 0.15,  // $0.15 per 1M input tokens
        outputCost: 0.60, // $0.60 per 1M output tokens
        description: 'Cheapest, good for simple tasks',
      },
      standard: {
        id: 'gpt-4o',
        name: 'GPT-4o',
        inputCost: 2.5,   // $2.50 per 1M input tokens
        outputCost: 10.0, // $10.00 per 1M output tokens
        description: 'Multimodal, good for vision',
      },
    };

    this.defaultModel = 'mini';

    console.log('[OK] OpenAI Service initialized');
  }

  /**
   * Chat completion
   */
  async chat(messages: any[], options: ChatOptions = {}): Promise<ChatResponse> {
    try {
      const model = this.models[options.model || this.defaultModel];

      const startTime = Date.now();
      const response = await this.client.chat.completions.create({
        model: model.id,
        messages: messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens || 4096,
      });

      const latency = Date.now() - startTime;

      // Calculate cost
      const cost = this._calculateCost(
        response.usage!.prompt_tokens,
        response.usage!.completion_tokens,
        model
      );

      // Track usage
      // TODO: Re-enable once database utilities are created
      // if (options.userId) {
      //   await this._trackUsage(options.userId, model.id, response.usage!, cost);
      // }

      return {
        success: true,
        content: response.choices[0].message.content || '',
        model: model.name,
        usage: {
          inputTokens: response.usage!.prompt_tokens,
          outputTokens: response.usage!.completion_tokens,
          totalTokens: response.usage!.total_tokens,
        },
        cost: cost,
        latency: latency,
      };
    } catch (error: any) {
      console.error('OpenAI chat error:', error);
      throw new Error(`OpenAI error: ${error.message}`);
    }
  }

  /**
   * Vision analysis
   */
  async vision(imageUrl: string, prompt: string, options: ChatOptions = {}): Promise<ChatResponse> {
    try {
      const messages = [
        {
          role: 'user' as const,
          content: [
            { type: 'text' as const, text: prompt },
            { type: 'image_url' as const, image_url: { url: imageUrl } },
          ],
        },
      ];

      return await this.chat(messages, { ...options, model: 'standard' });
    } catch (error) {
      console.error('OpenAI vision error:', error);
      throw error;
    }
  }

  // Private methods
  private _calculateCost(inputTokens: number, outputTokens: number, model: ModelConfig): number {
    const inputCost = (inputTokens / 1000000) * model.inputCost;
    const outputCost = (outputTokens / 1000000) * model.outputCost;
    return inputCost + outputCost;
  }

  // TODO: Re-enable once database utilities are created
  // private async _trackUsage(userId: number, modelId: string, usage: any, cost: number): Promise<void> {
  //   try {
  //     await dbRun(
  //       `INSERT INTO openai_usage (
  //         user_id, model, input_tokens, output_tokens, cost, created_at
  //       ) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
  //       [userId, modelId, usage.prompt_tokens, usage.completion_tokens, cost]
  //       );
  //   } catch (error) {
  //     console.error('Failed to track OpenAI usage:', error);
  //   }
  // }
}

export default new OpenAIService();
