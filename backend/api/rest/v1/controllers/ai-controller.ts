/**
 * AI Controller
 * Handles all AI-related requests (Albedo chat, insights, actions)
 */

import { Request, Response } from 'express';

import aiMultiProviderService from '../../../../services/ai.multi-provider.service';
import { aiActionExecutor } from '../../../../services/ai/ai-action-executor';
import { getAllToolDefinitions } from '../../../../services/ai/ai-tools';

/**
 * POST /api/v1/ai/chat
 * Send message to Albedo (AI assistant)
 * Intelligently routes to action executor or simple chat
 */
export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const { message, collaborative, provider, model, context, enableActions } = req.body;

    if (!message || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      });
      return;
    }

    // Get user ID from session (assuming auth middleware sets req.user)
    const userId = (req as any).user?.id || 1; // Default to 1 for development

    // Check if this requires action execution (default: enabled)
    const shouldExecuteActions = enableActions !== false;

    if (shouldExecuteActions) {
      const shouldExecute = await aiActionExecutor.shouldExecuteAction(message);

      if (shouldExecute) {
        // Use action executor for commands like "create contact", "send email", etc.
        const actionResponse = await aiActionExecutor.executeAction({
          message: message,
          userId: userId,
          context: context,
        });

        res.json({
          success: true,
          data: {
            ...actionResponse,
            type: 'action',
          },
        });
        return;
      }
    }

    // Fall back to regular chat for questions and conversations
    const response = await aiMultiProviderService.chat(message, {
      collaborative: collaborative || false,
      provider: provider,
      model: model,
      userId: userId,
      systemPrompt: context?.systemPrompt,
      temperature: context?.temperature,
      maxTokens: context?.maxTokens,
    });

    res.json({
      success: true,
      data: {
        ...response,
        type: 'chat',
      },
    });
  } catch (error: any) {
    console.error('AI chat error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process AI request',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

/**
 * POST /api/v1/ai/chat/stream
 * Stream AI response in real-time
 */
export async function chatStream(req: Request, res: Response): Promise<void> {
  try {
    const { message, provider, model, context } = req.body;

    if (!message || message.trim().length === 0) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      });
      return;
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connected event
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // TODO: Implement streaming with Claude SDK
    // For now, fall back to regular chat and send as chunks
    const userId = (req as any).user?.id || 1;

    const response = await aiMultiProviderService.chat(message, {
      provider: provider,
      model: model,
      userId: userId,
      systemPrompt: context?.systemPrompt,
    });

    // Send content in chunks
    const content = response.content;
    const chunkSize = 20;

    for (let i = 0; i < content.length; i += chunkSize) {
      const chunk = content.slice(i, i + chunkSize);
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Send done event
    res.write(`data: ${JSON.stringify({ type: 'done', ...response })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('AI chat stream error:', error);
    res.write(
      `data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`
    );
    res.end();
  }
}

/**
 * POST /api/v1/ai/analyze
 * Analyze CRM data and provide insights
 */
export async function analyze(req: Request, res: Response): Promise<void> {
  try {
    const { entityType, entityId, analysisType, context } = req.body;

    if (!entityType || !entityId) {
      res.status(400).json({
        success: false,
        error: 'Entity type and ID are required',
      });
      return;
    }

    const userId = (req as any).user?.id || 1;

    // Build analysis prompt based on type
    let prompt = '';
    switch (analysisType) {
      case 'insights':
        prompt = `Analyze this ${entityType} and provide key insights, risks, and opportunities.`;
        break;
      case 'nextAction':
        prompt = `What is the next best action for this ${entityType}?`;
        break;
      case 'prediction':
        prompt = `Predict the outcome for this ${entityType}.`;
        break;
      default:
        prompt = `Provide analysis for this ${entityType}.`;
    }

    // Add context data if available
    if (context?.data) {
      prompt += `\n\nData: ${JSON.stringify(context.data, null, 2)}`;
    }

    const response = await aiMultiProviderService.chat(prompt, {
      provider: 'claude',
      model: 'sonnet',
      userId: userId,
      systemPrompt: `You are Albedo, a CRM AI assistant analyzing ${entityType} data.`,
    });

    res.json({
      success: true,
      data: {
        analysis: response.content,
        confidence: response.model,
        cost: response.cost,
      },
    });
  } catch (error: any) {
    console.error('AI analyze error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to analyze data',
    });
  }
}

/**
 * POST /api/v1/ai/execute
 * Execute an action through AI (e.g., create task, send email)
 */
export async function executeAction(req: Request, res: Response): Promise<void> {
  try {
    const { action, parameters, context: _context } = req.body;

    if (!action) {
      res.status(400).json({
        success: false,
        error: 'Action is required',
      });
      return;
    }

    const userId = (req as any).user?.id || 1;

    // Use collaborative mode for action execution (Claude plans, OpenAI validates)
    const prompt = `Execute this action: ${action}\n\nParameters: ${JSON.stringify(parameters, null, 2)}`;

    const response = await aiMultiProviderService.chat(prompt, {
      collaborative: true,
      userId: userId,
      needsValidation: true,
      systemPrompt: `You are Albedo, executing CRM actions. Provide step-by-step execution plan.`,
    });

    res.json({
      success: true,
      data: {
        executionPlan: response.claudeAnalysis,
        validation: response.openaiReview,
        combined: response.content,
        cost: response.totalCost,
      },
    });
  } catch (error: any) {
    console.error('AI execute action error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to execute action',
    });
  }
}

/**
 * GET /api/v1/ai/models
 * Get available AI models and their capabilities
 */
export function getModels(req: Request, res: Response): void {
  const tools = getAllToolDefinitions();

  res.json({
    success: true,
    data: {
      providers: ['claude', 'openai'],
      models: {
        claude: [
          { id: 'haiku', name: 'Claude 3.5 Haiku', speed: 'fast', cost: 'low', description: 'Best for simple tasks' },
          { id: 'sonnet', name: 'Claude 3.5 Sonnet', speed: 'medium', cost: 'medium', description: 'Balanced performance' },
          { id: 'opus', name: 'Claude 3 Opus', speed: 'slow', cost: 'high', description: 'Most powerful reasoning' },
        ],
        openai: [
          { id: 'mini', name: 'GPT-4o Mini', speed: 'fast', cost: 'low', description: 'Lightweight model' },
          { id: 'standard', name: 'GPT-4o', speed: 'medium', cost: 'medium', description: 'Multimodal capable' },
        ],
      },
      features: {
        collaborative: 'Use both Claude and OpenAI together for validation',
        actions: 'Execute CRM actions directly through natural language',
        tools: `${tools.length} tools available for autonomous actions`,
        streaming: 'Real-time response streaming',
      },
      availableTools: tools.map((t: any) => ({
        name: t.name,
        description: t.description,
      })),
      toolCount: tools.length,
    },
  });
}

/**
 * GET /api/v1/ai/usage
 * Get AI usage statistics for current user
 */
export async function getUsage(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id || 1;

    // TODO: Implement usage tracking from database
    // For now, return mock data
    res.json({
      success: true,
      data: {
        userId: userId,
        period: 'month',
        totalRequests: 0,
        totalCost: 0,
        byProvider: {
          claude: { requests: 0, cost: 0 },
          openai: { requests: 0, cost: 0 },
        },
        byModel: {},
      },
    });
  } catch (error: any) {
    console.error('AI usage error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get usage data',
    });
  }
}
