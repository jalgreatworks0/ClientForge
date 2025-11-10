/**
 * LM Studio Service - Core AI Provider
 * Location: D:\ClientForge\02_CODE\backend\src\ai\lmstudio.service.ts
 * Purpose: OpenAI-compatible service wrapping local LM Studio instance
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam, ChatCompletionCreateParamsStreaming } from 'openai/resources/chat/completions';

export interface ChatOptions {
  model: string;
  messages: ChatCompletionMessageParam[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  capabilities?: string[];
}

export interface HealthStatus {
  ok: boolean;
  reason?: string;
  latency?: number;
  modelsAvailable?: number;
  currentModel?: string;
}

@Injectable()
export class LmStudioService {
  private readonly logger = new Logger(LmStudioService.name);
  public client: OpenAI;
  private readonly baseURL: string;
  private readonly apiKey: string;
  private readonly timeout: number;

  constructor(private configService: ConfigService) {
    // Get configuration from environment
    this.baseURL = this.configService.get<string>('LMSTUDIO_BASE_URL', 'http://localhost:1234/v1');
    this.apiKey = this.configService.get<string>('LMSTUDIO_API_KEY', 'lm-studio');
    this.timeout = parseInt(this.configService.get<string>('LMSTUDIO_TIMEOUT_MS', '600000'), 10);

    // Initialize OpenAI client pointing to LM Studio
    this.client = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseURL,
      timeout: this.timeout,
      defaultHeaders: {
        'X-Client': 'ClientForge-CRM',
      },
    });

    this.logger.log(`Initialized LM Studio client: ${this.baseURL}`);
  }

  /**
   * List all available models
   */
  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.client.models.list();
      const models = response.data.map((model) => ({
        id: model.id,
        object: model.object,
        created: model.created,
        owned_by: model.owned_by,
        capabilities: (model as any).capabilities || [],
      }));

      this.logger.debug(`Listed ${models.length} models`);
      return models;
    } catch (error) {
      this.logger.error('Failed to list models', error);
      throw error;
    }
  }

  /**
   * Chat completion (non-streaming)
   */
  async chat(options: ChatOptions) {
    const {
      model,
      messages,
      temperature = 0.2,
      maxTokens = 4096,
      topP = 0.9,
      frequencyPenalty = 0,
      presencePenalty = 0,
    } = options;

    try {
      this.logger.debug(`Chat request: model=${model}, messages=${messages.length}`);

      const completion = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stream: false,
      });

      this.logger.debug(`Chat response: tokens=${completion.usage?.total_tokens || 0}`);
      return completion;
    } catch (error) {
      this.logger.error('Chat completion failed', error);
      throw error;
    }
  }

  /**
   * Chat completion (streaming)
   */
  async *chatStream(options: ChatOptions) {
    const {
      model,
      messages,
      temperature = 0.2,
      maxTokens = 4096,
      topP = 0.9,
      frequencyPenalty = 0,
      presencePenalty = 0,
    } = options;

    try {
      this.logger.debug(`Streaming chat request: model=${model}, messages=${messages.length}`);

      const stream = await this.client.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        frequency_penalty: frequencyPenalty,
        presence_penalty: presencePenalty,
        stream: true,
      } as ChatCompletionCreateParamsStreaming);

      for await (const chunk of stream) {
        yield chunk;
      }

      this.logger.debug('Streaming chat completed');
    } catch (error) {
      this.logger.error('Streaming chat failed', error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async health(): Promise<HealthStatus> {
    const startTime = Date.now();

    try {
      const models = await this.client.models.list();
      const latency = Date.now() - startTime;

      const loadedModel = models.data.find((m) => (m as any).loaded === true);

      return {
        ok: true,
        latency,
        modelsAvailable: models.data.length,
        currentModel: loadedModel?.id,
      };
    } catch (error: any) {
      this.logger.error('Health check failed', error);

      return {
        ok: false,
        reason: error?.message || 'Unknown error',
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Get model info by ID
   */
  async getModel(modelId: string): Promise<ModelInfo | null> {
    try {
      const model = await this.client.models.retrieve(modelId);
      return {
        id: model.id,
        object: model.object,
        created: model.created,
        owned_by: model.owned_by,
        capabilities: (model as any).capabilities || [],
      };
    } catch (error) {
      this.logger.warn(`Model not found: ${modelId}`);
      return null;
    }
  }

  /**
   * Get embeddings for text (if model supports it)
   */
  async getEmbeddings(input: string | string[], model = 'text-embedding-ada-002'): Promise<number[][]> {
    try {
      const response = await this.client.embeddings.create({
        model,
        input,
      });

      return response.data.map((item) => item.embedding);
    } catch (error) {
      this.logger.error('Embeddings generation failed', error);
      throw error;
    }
  }

  /**
   * Quick chat helper for simple prompts
   */
  async quickChat(prompt: string, model: string): Promise<string> {
    const response = await this.chat({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    return response.choices[0]?.message?.content || '';
  }

  /**
   * Get default model (first available)
   */
  async getDefaultModel(): Promise<string | null> {
    try {
      const models = await this.listModels();
      return models.length > 0 ? models[0].id : null;
    } catch {
      return null;
    }
  }

  /**
   * Warm up model (trigger JIT load)
   */
  async warmup(modelId: string): Promise<void> {
    this.logger.log(`Warming up model: ${modelId}`);

    try {
      await this.quickChat('Hello', modelId);
      this.logger.log(`Model warmed up: ${modelId}`);
    } catch (error) {
      this.logger.error(`Warmup failed for ${modelId}`, error);
      throw error;
    }
  }
}
