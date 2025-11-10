/**
 * AI Action Executor
 * Orchestrates AI tool calling and action execution
 *
 * This service:
 * 1. Takes natural language requests
 * 2. Uses Claude to determine which tools to call
 * 3. Executes the tools
 * 4. Returns results to the user
 */

import Anthropic from '@anthropic-ai/sdk';
import { ALL_TOOLS, getToolByName, getAllToolDefinitions, AIToolContext } from './ai-tools';

export interface ActionRequest {
  message: string;
  userId: number;
  tenantId?: number;
  context?: Record<string, any>;
}

export interface ActionResponse {
  success: boolean;
  message: string;
  actions: ActionResult[];
  totalCost: number;
  model: string;
}

export interface ActionResult {
  tool: string;
  parameters: Record<string, any>;
  result: any;
  success: boolean;
  error?: string;
}

export class AIActionExecutor {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Execute a natural language action
   * Example: "Create a contact named John Smith with email john@example.com"
   */
  async executeAction(request: ActionRequest): Promise<ActionResponse> {
    try {
      const toolContext: AIToolContext = {
        userId: request.userId,
        tenantId: request.tenantId,
      };

      // Build system prompt that explains available tools
      const systemPrompt = this.buildSystemPrompt();

      // Call Claude with tool definitions
      const response = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: request.message,
          },
        ],
        tools: getAllToolDefinitions() as any,
      });

      const actions: ActionResult[] = [];
      let conversationMessages: any[] = [
        {
          role: 'user',
          content: request.message,
        },
        {
          role: 'assistant',
          content: response.content,
        },
      ];

      // Type guard for ToolUseBlock
      const isToolUseBlock = (block: Anthropic.ContentBlock): block is Anthropic.ToolUseBlock => {
        return block.type === 'tool_use';
      };

      // Type guard for TextBlock
      const isTextBlock = (block: Anthropic.ContentBlock): block is Anthropic.TextBlock => {
        return block.type === 'text';
      };

      // Process tool uses
      const toolUses = response.content.filter(isToolUseBlock);

      if (toolUses.length === 0) {
        // No tools to execute, just return the text response
        const textBlocks = response.content.filter(isTextBlock);
        const responseText = textBlocks.map((block) => block.text).join('\n');

        return {
          success: true,
          message: responseText,
          actions: [],
          totalCost: this.calculateCost(response.usage),
          model: 'claude-3-5-sonnet',
        };
      }

      // Execute each tool
      const toolResults: any[] = [];

      for (const toolUse of toolUses) {
        try {
          const tool = getToolByName(toolUse.name);

          if (!tool) {
            throw new Error(`Unknown tool: ${toolUse.name}`);
          }

          // Execute the tool
          const result = await tool.execute(toolUse.input, toolContext);

          actions.push({
            tool: toolUse.name,
            parameters: toolUse.input,
            result: result,
            success: true,
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        } catch (error: any) {
          actions.push({
            tool: toolUse.name,
            parameters: toolUse.input,
            result: null,
            success: false,
            error: error.message,
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: error.message }),
            is_error: true,
          });
        }
      }

      // Send tool results back to Claude to get final response
      conversationMessages.push({
        role: 'user',
        content: toolResults,
      });

      const finalResponse = await this.client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: conversationMessages,
        tools: getAllToolDefinitions() as any,
      });

      // Extract final message
      const finalTextBlocks = finalResponse.content.filter((block: any) => block.type === 'text');
      const finalMessage = finalTextBlocks.map((block: any) => block.text).join('\n');

      const totalCost =
        this.calculateCost(response.usage) + this.calculateCost(finalResponse.usage);

      return {
        success: true,
        message: finalMessage,
        actions: actions,
        totalCost: totalCost,
        model: 'claude-3-5-sonnet',
      };
    } catch (error: any) {
      console.error('AI Action Executor error:', error);
      throw new Error(`Failed to execute action: ${error.message}`);
    }
  }

  /**
   * Check if a message requires action execution
   * Returns true if Claude should use tools, false for just chat
   */
  async shouldExecuteAction(message: string): Promise<boolean> {
    // Keywords that indicate action intent
    const actionKeywords = [
      'create', 'add', 'new', 'make',
      'update', 'change', 'modify', 'edit',
      'delete', 'remove',
      'send', 'email',
      'search', 'find', 'show', 'get', 'list',
      'complete', 'finish', 'done',
    ];

    const lowerMessage = message.toLowerCase();
    return actionKeywords.some((keyword) => lowerMessage.includes(keyword));
  }

  /**
   * Build system prompt explaining Albedo's capabilities
   */
  private buildSystemPrompt(): string {
    return `You are Albedo, an AI assistant integrated into ClientForge CRM. You have the ability to execute actions on behalf of the user.

Your capabilities include:
- Creating, updating, and searching contacts
- Managing deals and opportunities
- Creating and completing tasks
- Sending emails
- Querying CRM data and statistics

When a user asks you to perform an action, use the appropriate tools to execute it. After executing tools, provide a clear confirmation message summarizing what was done.

Guidelines:
1. Always confirm what action you're taking before executing
2. If information is missing, ask clarifying questions
3. After executing actions, provide clear feedback about what was done
4. If an action fails, explain why and suggest alternatives
5. Be proactive in suggesting related actions that might be helpful

Current date: ${new Date().toISOString().split('T')[0]}

Use tools whenever the user requests an action. For general questions or chat, respond normally without using tools.`;
  }

  /**
   * Calculate cost from usage stats
   */
  private calculateCost(usage: any): number {
    // Claude 3.5 Sonnet pricing
    const inputCost = (usage.input_tokens / 1000000) * 3.0;
    const outputCost = (usage.output_tokens / 1000000) * 15.0;
    const cacheWriteCost = ((usage.cache_creation_input_tokens || 0) / 1000000) * 3.75;
    const cacheReadCost = ((usage.cache_read_input_tokens || 0) / 1000000) * 0.3;

    return inputCost + outputCost + cacheWriteCost + cacheReadCost;
  }
}

export const aiActionExecutor = new AIActionExecutor();
