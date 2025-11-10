/**
 * LM Studio Controller - REST API Endpoints
 * Location: D:\ClientForge\02_CODE\backend\src\ai\lmstudio.controller.ts
 * Purpose: Expose AI capabilities to frontend via REST
 */

import { Controller, Get, Post, Body, Query, Param, Sse, MessageEvent } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LmStudioService, ChatOptions } from './lmstudio.service';
import { LmStudioStructuredService } from './lmstudio-structured.service';
import { Observable, from, map } from 'rxjs';

@ApiTags('AI')
@Controller('ai')
export class LmStudioController {
  constructor(
    private readonly lmStudio: LmStudioService,
    private readonly structured: LmStudioStructuredService,
  ) {}

  /**
   * Health check endpoint
   */
  @Get('health')
  @ApiOperation({ summary: 'Check LM Studio service health' })
  @ApiResponse({ status: 200, description: 'Health status returned' })
  async health() {
    return this.lmStudio.health();
  }

  /**
   * List available models
   */
  @Get('models')
  @ApiOperation({ summary: 'List all available AI models' })
  @ApiResponse({ status: 200, description: 'Models list returned' })
  async listModels() {
    return this.lmStudio.listModels();
  }

  /**
   * Get specific model info
   */
  @Get('models/:id')
  @ApiOperation({ summary: 'Get specific model information' })
  @ApiResponse({ status: 200, description: 'Model info returned' })
  @ApiResponse({ status: 404, description: 'Model not found' })
  async getModel(@Param('id') modelId: string) {
    const model = await this.lmStudio.getModel(modelId);

    if (!model) {
      return { error: 'Model not found' };
    }

    return model;
  }

  /**
   * Chat completion (non-streaming)
   */
  @Post('chat')
  @ApiOperation({ summary: 'Send chat completion request' })
  @ApiResponse({ status: 200, description: 'Chat response returned' })
  async chat(@Body() options: ChatOptions) {
    return this.lmStudio.chat(options);
  }

  /**
   * Chat completion (streaming via SSE)
   */
  @Sse('chat/stream')
  @ApiOperation({ summary: 'Stream chat completion response' })
  chatStream(@Body() options: ChatOptions): Observable<MessageEvent> {
    const generator = this.lmStudio.chatStream(options);

    return from(
      (async function* () {
        for await (const chunk of generator) {
          yield chunk;
        }
      })(),
    ).pipe(
      map((chunk) => ({
        data: chunk,
      })),
    );
  }

  /**
   * Quick chat helper
   */
  @Post('quick-chat')
  @ApiOperation({ summary: 'Quick single-prompt chat' })
  @ApiResponse({ status: 200, description: 'Response returned' })
  async quickChat(@Body() body: { prompt: string; model: string }) {
    const { prompt, model } = body;
    const response = await this.lmStudio.quickChat(prompt, model);

    return {
      response,
      model,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get embeddings
   */
  @Post('embeddings')
  @ApiOperation({ summary: 'Generate text embeddings' })
  @ApiResponse({ status: 200, description: 'Embeddings returned' })
  async getEmbeddings(@Body() body: { input: string | string[]; model?: string }) {
    const { input, model } = body;
    const embeddings = await this.lmStudio.getEmbeddings(input, model);

    return {
      embeddings,
      count: embeddings.length,
      dimensions: embeddings[0]?.length || 0,
    };
  }

  /**
   * Warm up model (trigger JIT load)
   */
  @Post('warmup/:modelId')
  @ApiOperation({ summary: 'Warm up a model (trigger JIT load)' })
  @ApiResponse({ status: 200, description: 'Model warmed up' })
  async warmup(@Param('modelId') modelId: string) {
    await this.lmStudio.warmup(modelId);

    return {
      success: true,
      model: modelId,
      message: 'Model warmed up successfully',
    };
  }

  /**
   * Get default model
   */
  @Get('default-model')
  @ApiOperation({ summary: 'Get default model ID' })
  @ApiResponse({ status: 200, description: 'Default model returned' })
  async getDefaultModel() {
    const modelId = await this.lmStudio.getDefaultModel();

    return {
      modelId,
      available: modelId !== null,
    };
  }

  // ============================================================
  // STRUCTURED OUTPUT ENDPOINTS
  // ============================================================

  /**
   * Analyze contact with structured output
   */
  @Post('analyze-contact')
  @ApiOperation({ summary: 'Analyze contact and generate structured insights' })
  @ApiResponse({ status: 200, description: 'Contact analysis returned' })
  async analyzeContact(@Body() body: { contactData: any; model?: string }) {
    const { contactData, model } = body;
    const analysis = await this.structured.analyzeContact(contactData, model);

    return {
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Predict deal outcome with structured output
   */
  @Post('predict-deal')
  @ApiOperation({ summary: 'Predict deal outcome with structured analysis' })
  @ApiResponse({ status: 200, description: 'Deal prediction returned' })
  async predictDeal(@Body() body: { dealData: any; model?: string }) {
    const { dealData, model } = body;
    const prediction = await this.structured.predictDeal(dealData, model);

    return {
      success: true,
      prediction,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generate email with structured output
   */
  @Post('generate-email')
  @ApiOperation({ summary: 'Generate professional email with structured format' })
  @ApiResponse({ status: 200, description: 'Email generated' })
  async generateEmail(
    @Body()
    body: {
      recipientName: string;
      recipientRole?: string;
      purpose: string;
      keyPoints?: string[];
      tone?: 'formal' | 'friendly' | 'urgent' | 'casual';
      model?: string;
    },
  ) {
    const { model, ...context } = body;
    const email = await this.structured.generateEmail(context, model);

    return {
      success: true,
      email,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Summarize meeting notes with structured output
   */
  @Post('summarize-meeting')
  @ApiOperation({ summary: 'Summarize meeting notes into structured format' })
  @ApiResponse({ status: 200, description: 'Meeting summary returned' })
  async summarizeMeeting(@Body() body: { notes: string; model?: string }) {
    const { notes, model } = body;
    const summary = await this.structured.summarizeMeeting(notes, model);

    return {
      success: true,
      summary,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Search with tools (function calling)
   */
  @Post('search-with-tools')
  @ApiOperation({ summary: 'Execute search with AI tool calling' })
  @ApiResponse({ status: 200, description: 'Search results returned' })
  async searchWithTools(@Body() body: { query: string; model?: string }) {
    const { query, model } = body;
    const result = await this.structured.searchWithTools(query, model);

    return {
      success: true,
      result,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Generic structured output
   */
  @Post('structured-output')
  @ApiOperation({ summary: 'Get structured output with custom schema' })
  @ApiResponse({ status: 200, description: 'Structured output returned' })
  async getStructuredOutput(@Body() body: { prompt: string; schema: any; model?: string }) {
    const { prompt, schema, model } = body;
    const result = await this.structured.getStructuredOutput(prompt, schema, model);

    return {
      success: true,
      result,
      timestamp: new Date().toISOString(),
    };
  }
}
