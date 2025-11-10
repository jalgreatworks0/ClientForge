/**
 * LM Studio Structured Output Service
 * Location: D:\ClientForge\02_CODE\backend\src\ai\lmstudio-structured.service.ts
 * Purpose: Structured outputs and tool use for ClientForge CRM
 */

import { Injectable, Logger } from '@nestjs/common';
import { LmStudioService } from './lmstudio.service';
import { CRMSchemas, type ContactAnalysis, type DealPrediction, type EmailGeneration, type MeetingSummary } from './schemas/crm-schemas';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

@Injectable()
export class LmStudioStructuredService {
  private readonly logger = new Logger(LmStudioStructuredService.name);

  constructor(private readonly lmStudio: LmStudioService) {}

  /**
   * Analyze contact and generate insights
   */
  async analyzeContact(contactData: any, model = 'qwen3-30b-a3b'): Promise<ContactAnalysis> {
    const prompt = `Analyze this contact and provide insights:

Contact Information:
${JSON.stringify(contactData, null, 2)}

Provide a structured analysis including lead score, engagement level, next actions, and summary.`;

    const response = await this.lmStudio.chat({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a CRM AI assistant specialized in contact analysis and lead scoring.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    });

    // For structured output, use response_format parameter
    const structuredResponse = await this.lmStudio.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a CRM AI assistant specialized in contact analysis and lead scoring.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: CRMSchemas.ContactAnalysis,
      temperature: 0.3,
    });

    const result = JSON.parse(structuredResponse.choices[0]?.message?.content || '{}');
    this.logger.debug(`Contact analysis complete: lead_score=${result.lead_score}`);

    return result;
  }

  /**
   * Predict deal outcome
   */
  async predictDeal(dealData: any, model = 'qwen3-30b-a3b'): Promise<DealPrediction> {
    const prompt = `Analyze this deal and predict its outcome:

Deal Information:
${JSON.stringify(dealData, null, 2)}

Provide win probability, predicted close date, risk factors, and recommendations.`;

    const structuredResponse = await this.lmStudio.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a CRM AI assistant specialized in sales forecasting and deal prediction.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: CRMSchemas.DealPrediction,
      temperature: 0.3,
    });

    const result = JSON.parse(structuredResponse.choices[0]?.message?.content || '{}');
    this.logger.debug(`Deal prediction: win_probability=${result.win_probability}%`);

    return result;
  }

  /**
   * Generate email with structure
   */
  async generateEmail(
    context: {
      recipientName: string;
      recipientRole?: string;
      purpose: string;
      keyPoints?: string[];
      tone?: 'formal' | 'friendly' | 'urgent' | 'casual';
    },
    model = 'qwen3-30b-a3b',
  ): Promise<EmailGeneration> {
    const prompt = `Generate a professional email with the following context:

Recipient: ${context.recipientName}${context.recipientRole ? ` (${context.recipientRole})` : ''}
Purpose: ${context.purpose}
${context.keyPoints ? `Key Points:\n${context.keyPoints.map((p) => `- ${p}`).join('\n')}` : ''}
Desired Tone: ${context.tone || 'professional'}

Generate a complete email with subject, body, and call-to-action.`;

    const structuredResponse = await this.lmStudio.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert email writer for business communications.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: CRMSchemas.EmailGeneration,
      temperature: 0.7,
    });

    const result = JSON.parse(structuredResponse.choices[0]?.message?.content || '{}');
    this.logger.debug(`Email generated: subject="${result.subject}"`);

    return result;
  }

  /**
   * Summarize meeting notes
   */
  async summarizeMeeting(notes: string, model = 'qwen3-30b-a3b'): Promise<MeetingSummary> {
    const prompt = `Analyze these meeting notes and create a structured summary:

Meeting Notes:
${notes}

Extract key points, action items, decisions, and suggest next meeting agenda.`;

    const structuredResponse = await this.lmStudio.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing meeting notes and extracting actionable information.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: CRMSchemas.MeetingSummary,
      temperature: 0.3,
    });

    const result = JSON.parse(structuredResponse.choices[0]?.message?.content || '{}');
    this.logger.debug(`Meeting summarized: ${result.action_items?.length || 0} action items`);

    return result;
  }

  /**
   * Tool use: Search products (example)
   */
  async searchWithTools(query: string, model = 'qwen3-30b-a3b'): Promise<any> {
    const tools = [
      {
        type: 'function' as const,
        function: {
          name: 'search_contacts',
          description: 'Search contacts in the CRM database by various criteria',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search terms or contact name',
              },
              company: {
                type: 'string',
                description: 'Filter by company name',
              },
              status: {
                type: 'string',
                description: 'Contact status',
                enum: ['lead', 'prospect', 'customer', 'inactive'],
              },
            },
            required: ['query'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'search_deals',
          description: 'Search deals in the CRM pipeline',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search terms',
              },
              stage: {
                type: 'string',
                description: 'Deal stage',
                enum: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed'],
              },
              min_value: {
                type: 'number',
                description: 'Minimum deal value in dollars',
              },
            },
            required: ['query'],
          },
        },
      },
    ];

    const response = await this.lmStudio.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: query,
        },
      ],
      tools,
      temperature: 0.3,
    });

    const message = response.choices[0]?.message;

    // Check if model requested tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      this.logger.debug(`Model requested ${message.tool_calls.length} tool call(s)`);

      const toolResults = [];

      for (const toolCall of message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);

        this.logger.debug(`Tool call: ${functionName}(${JSON.stringify(args)})`);

        // Execute the tool (in real implementation, call actual search functions)
        const result = await this.executeToolCall(functionName, args);
        toolResults.push({
          tool_call_id: toolCall.id,
          function_name: functionName,
          result,
        });
      }

      // Return to model with tool results
      const followUpMessages: ChatCompletionMessageParam[] = [
        {
          role: 'user',
          content: query,
        },
        message as ChatCompletionMessageParam,
      ];

      // Add tool results
      for (const toolResult of toolResults) {
        followUpMessages.push({
          role: 'tool',
          content: JSON.stringify(toolResult.result),
          tool_call_id: toolResult.tool_call_id,
        });
      }

      // Get final response from model
      const finalResponse = await this.lmStudio.client.chat.completions.create({
        model,
        messages: followUpMessages,
        temperature: 0.3,
      });

      return {
        toolCalls: toolResults,
        finalResponse: finalResponse.choices[0]?.message?.content,
      };
    }

    // No tool calls, return normal response
    return {
      response: message.content,
    };
  }

  /**
   * Execute tool call (stub - implement with actual business logic)
   */
  private async executeToolCall(functionName: string, args: any): Promise<any> {
    this.logger.debug(`Executing tool: ${functionName}`);

    // In real implementation, call actual services
    switch (functionName) {
      case 'search_contacts':
        // Call ContactService.search(args)
        return {
          contacts: [
            { id: '1', name: 'John Doe', company: 'Acme Corp', status: 'customer' },
            { id: '2', name: 'Jane Smith', company: 'Tech Inc', status: 'prospect' },
          ],
          total: 2,
        };

      case 'search_deals':
        // Call DealService.search(args)
        return {
          deals: [
            { id: '1', name: 'Enterprise Deal', value: 50000, stage: 'negotiation' },
            { id: '2', name: 'SMB Deal', value: 10000, stage: 'proposal' },
          ],
          total: 2,
        };

      default:
        throw new Error(`Unknown tool: ${functionName}`);
    }
  }

  /**
   * Generic structured output
   */
  async getStructuredOutput(
    prompt: string,
    schema: any,
    model = 'qwen3-30b-a3b',
  ): Promise<any> {
    const response = await this.lmStudio.client.chat.completions.create({
      model,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: schema,
      temperature: 0.3,
    });

    return JSON.parse(response.choices[0]?.message?.content || '{}');
  }
}
