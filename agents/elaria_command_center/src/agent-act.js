/**
 * LM Studio TypeScript SDK - Agent-Oriented API (.act())
 * Location: D:\ClientForge\03_BOTS\elaria_command_center\src\agent-act.js
 * Purpose: Autonomous agent implementation with tool use
 */

import { LMStudioClient } from '@lmstudio/sdk';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { validateToolArgs, validateFilePath } from './utils/security.js';

// ============================================================
// AGENT TOOL DEFINITIONS
// ============================================================

/**
 * Search contacts in ClientForge CRM
 */
const searchContacts = {
  name: 'search_contacts',
  description: 'Search contacts in the ClientForge CRM database',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search terms for contact name or email',
      },
      company: {
        type: 'string',
        description: 'Optional company name filter',
      },
      status: {
        type: 'string',
        description: 'Contact status filter',
        enum: ['lead', 'prospect', 'customer', 'inactive'],
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results',
        default: 10,
      },
    },
    required: ['query'],
  },
  async execute({ query, company, status, limit = 10 }) {
    // In production, query actual database
    // For now, return mock data
    return {
      contacts: [
        {
          id: 1,
          name: 'Sarah Johnson',
          email: 'sarah@techcorp.com',
          company: 'TechCorp',
          status: 'prospect',
        },
        {
          id: 2,
          name: 'Mike Chen',
          email: 'mike@techcorp.com',
          company: 'TechCorp',
          status: 'customer',
        },
      ],
      total: 2,
      query,
      filters: { company, status },
    };
  },
};

/**
 * Search deals in CRM pipeline
 */
const searchDeals = {
  name: 'search_deals',
  description: 'Search deals in the ClientForge CRM pipeline',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search terms for deal name',
      },
      stage: {
        type: 'string',
        description: 'Deal stage filter',
        enum: ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed'],
      },
      min_value: {
        type: 'number',
        description: 'Minimum deal value in dollars',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results',
        default: 10,
      },
    },
    required: ['query'],
  },
  async execute({ query, stage, min_value, limit = 10 }) {
    return {
      deals: [
        {
          id: 1,
          name: 'Enterprise SaaS Deal - TechCorp',
          value: 75000,
          stage: 'negotiation',
          probability: 70,
        },
        {
          id: 2,
          name: 'SMB Deal - StartupCo',
          value: 15000,
          stage: 'proposal',
          probability: 50,
        },
      ],
      total: 2,
      query,
      filters: { stage, min_value },
    };
  },
};

/**
 * Create a report file
 */
const createReport = {
  name: 'create_report',
  description: 'Create a report file in the reports directory',
  parameters: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Report filename without extension',
      },
      content: {
        type: 'string',
        description: 'Report content in markdown format',
      },
      format: {
        type: 'string',
        description: 'File format',
        enum: ['md', 'txt', 'json'],
        default: 'md',
      },
    },
    required: ['name', 'content'],
  },
  async execute({ name, content, format = 'md' }) {
    try {
      const reportsDir = path.join('D:', 'ClientForge', '02_CODE', 'backend', 'reports');

      // Create directory if it doesn't exist
      await fs.mkdir(reportsDir, { recursive: true });

      const filename = `${name}.${format}`;
      const filePath = path.join(reportsDir, filename);

      // Check if file exists
      if (existsSync(filePath)) {
        return { error: `Report '${filename}' already exists` };
      }

      await fs.writeFile(filePath, content, 'utf-8');

      return {
        success: true,
        filename,
        path: filePath,
        message: `Report created successfully: ${filename}`,
      };
    } catch (error) {
      return { error: `Error creating report: ${error.message}` };
    }
  },
};

/**
 * Read context files
 */
const readContextFile = {
  name: 'read_context_file',
  description: 'Read a context file from the ClientForge shared AI context pack',
  parameters: {
    type: 'object',
    properties: {
      filename: {
        type: 'string',
        description: 'Name of the context file (e.g., "project_overview.md")',
      },
    },
    required: ['filename'],
  },
  async execute({ filename }) {
    try {
      const contextDir = path.join('D:', 'ClientForge', '05_SHARED_AI', 'context_pack');
      const filePath = path.join(contextDir, filename);

      if (!existsSync(filePath)) {
        return { error: `File '${filename}' not found in context pack` };
      }

      const content = await fs.readFile(filePath, 'utf-8');

      return {
        success: true,
        filename,
        content,
        size: content.length,
      };
    } catch (error) {
      return { error: `Error reading file: ${error.message}` };
    }
  },
};

/**
 * Calculate deal forecast
 */
const calculateForecast = {
  name: 'calculate_forecast',
  description: 'Calculate deal forecast for the next N days',
  parameters: {
    type: 'object',
    properties: {
      days_ahead: {
        type: 'number',
        description: 'Number of days to forecast',
        default: 30,
      },
    },
  },
  async execute({ days_ahead = 30 }) {
    // Mock forecast data
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days_ahead);

    return {
      forecast_period_days: days_ahead,
      end_date: endDate.toISOString().split('T')[0],
      by_stage: [
        {
          stage: 'negotiation',
          count: 5,
          total_value: 250000,
          avg_probability: 65,
          weighted_value: 162500,
        },
        {
          stage: 'proposal',
          count: 8,
          total_value: 180000,
          avg_probability: 45,
          weighted_value: 81000,
        },
      ],
      total_deals: 13,
      total_value: 430000,
      weighted_forecast: 243500,
    };
  },
};

/**
 * Send notification
 */
const sendNotification = {
  name: 'send_notification',
  description: 'Send a notification to the system log',
  parameters: {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description: 'Notification title',
      },
      message: {
        type: 'string',
        description: 'Notification message',
      },
      priority: {
        type: 'string',
        description: 'Priority level',
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal',
      },
    },
    required: ['title', 'message'],
  },
  async execute({ title, message, priority = 'normal' }) {
    try {
      const logDir = path.join('D:', 'ClientForge', '02_CODE', 'backend', 'logs');
      await fs.mkdir(logDir, { recursive: true });

      const logFile = path.join(logDir, 'agent_notifications.log');
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${priority.toUpperCase()}] ${title}: ${message}\n`;

      await fs.appendFile(logFile, logEntry, 'utf-8');

      return {
        success: true,
        message: `Notification logged: ${title}`,
      };
    } catch (error) {
      return { error: `Error sending notification: ${error.message}` };
    }
  },
};

// ============================================================
// AGENT IMPLEMENTATION
// ============================================================

export class CRMAgent {
  constructor(modelName = 'qwen3-30b-a3b') {
    this.client = new LMStudioClient({ baseUrl: 'ws://localhost:1234' });
    this.modelName = modelName;
    this.model = null;

    // Tool registry
    this.tools = {
      search_contacts: searchContacts,
      search_deals: searchDeals,
      create_report: createReport,
      read_context_file: readContextFile,
      calculate_forecast: calculateForecast,
      send_notification: sendNotification,
    };
  }

  async initialize() {
    this.model = await this.client.llm.get({ identifier: this.modelName });
    console.log(chalk.green(`✓ Model loaded: ${this.modelName}`));
  }

  /**
   * Execute autonomous task with tools (.act() API)
   */
  async act(task, toolNames = Object.keys(this.tools), options = {}) {
    if (!this.model) {
      await this.initialize();
    }

    const spinner = ora('Agent working...').start();

    try {
      // Prepare tools for the model
      const enabledTools = toolNames.map((name) => {
        const tool = this.tools[name];
        return {
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          },
        };
      });

      console.log(chalk.cyan(`\nTask: ${task}\n`));
      console.log(chalk.gray(`Tools available: ${toolNames.join(', ')}\n`));

      const messages = [
        {
          role: 'system',
          content:
            'You are an autonomous CRM agent. Use the available tools to complete tasks. ' +
            'Break complex tasks into steps. Call tools as needed. ' +
            'Provide clear, actionable responses.',
        },
        {
          role: 'user',
          content: task,
        },
      ];

      let iteration = 0;
      const maxIterations = options.maxIterations || 10;

      while (iteration < maxIterations) {
        iteration++;
        spinner.text = `Agent working (iteration ${iteration})...`;

        // Get response from model
        const response = await this.model.complete({
          messages,
          tools: enabledTools,
          temperature: 0.3,
        });

        const message = response.choices[0]?.message;

        if (!message) {
          throw new Error('No response from model');
        }

        // Add assistant message to history
        messages.push(message);

        // Check if model wants to use tools
        if (message.tool_calls && message.tool_calls.length > 0) {
          spinner.text = `Agent calling ${message.tool_calls.length} tool(s)...`;

          for (const toolCall of message.tool_calls) {
            const toolName = toolCall.function.name;

            // Prevent prototype pollution attacks
            if (toolName === '__proto__' || toolName === 'constructor' || toolName === 'prototype') {
              throw new Error(`Invalid tool name: ${toolName}`);
            }

            let args;
            try {
              args = JSON.parse(toolCall.function.arguments);
            } catch (e) {
              throw new Error(`Invalid tool arguments JSON: ${e.message}`);
            }

            console.log(chalk.yellow(`\n🔧 Tool Call: ${toolName}`));
            console.log(chalk.gray(`   Args: ${JSON.stringify(args, null, 2)}`));

            // Execute tool
            const tool = this.tools[toolName];
            if (!tool) {
              throw new Error(`Unknown tool: ${toolName}`);
            }

            // Validate arguments against tool schema
            let validatedArgs;
            try {
              validatedArgs = this.validateToolArguments(toolName, args, tool);
            } catch (validationError) {
              throw new Error(`Tool argument validation failed for ${toolName}: ${validationError.message}`);
            }

            const result = await tool.execute(validatedArgs);

            console.log(chalk.green(`   Result: ${JSON.stringify(result).substring(0, 200)}...`));

            // Add tool result to messages
            messages.push({
              role: 'tool',
              content: JSON.stringify(result),
              tool_call_id: toolCall.id,
            });
          }
        } else {
          // No more tool calls, agent is done
          spinner.succeed('Agent completed task');

          console.log(chalk.green('\n✓ Final Response:\n'));
          console.log(message.content);

          return {
            success: true,
            response: message.content,
            iterations: iteration,
            messages,
          };
        }
      }

      spinner.warn(`Agent reached max iterations (${maxIterations})`);
      return {
        success: false,
        error: 'Max iterations reached',
        iterations: iteration,
        messages,
      };
    } catch (error) {
      spinner.fail('Agent failed');
      console.error(chalk.red(`Error: ${error.message}`));
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate tool arguments against schema
   */
  validateToolArguments(toolName, args, tool) {
    if (!tool.parameters || !tool.parameters.properties) {
      // Tool has no schema, return args as-is
      return args;
    }

    const schema = {};

    // Convert JSON schema to validation schema format
    for (const [key, prop] of Object.entries(tool.parameters.properties)) {
      schema[key] = {
        type: prop.type,
        required: tool.parameters.required?.includes(key),
        maxLength: prop.maxLength,
        pattern: prop.pattern ? new RegExp(prop.pattern) : undefined,
        min: prop.minimum,
        max: prop.maximum,
        noShellChars: prop.type === 'string' && !prop.allowShellChars,
      };
    }

    // Use security validation function
    return validateToolArgs(args, schema);
  }

  /**
   * Add custom tool
   */
  addTool(tool) {
    // Validate tool structure
    if (!tool.name || typeof tool.name !== 'string') {
      throw new Error('Tool must have a valid name');
    }
    if (!tool.execute || typeof tool.execute !== 'function') {
      throw new Error('Tool must have an execute function');
    }

    this.tools[tool.name] = tool;
  }

  /**
   * List available tools
   */
  listTools() {
    return Object.values(this.tools).map((tool) => ({
      name: tool.name,
      description: tool.description,
    }));
  }
}

// ============================================================
// PRE-CONFIGURED WORKFLOWS
// ============================================================

export async function salesIntelligenceAgent() {
  const agent = new CRMAgent();

  const task = `
Analyze our sales pipeline and provide a comprehensive intelligence report:

1. Calculate the 30-day deal forecast
2. Search for all deals in negotiation stage
3. Create a sales intelligence report with:
   - Executive summary
   - Forecast breakdown
   - Top opportunities
   - Recommended actions
4. Save the report as 'sales_intelligence_report'
`;

  const tools = ['calculate_forecast', 'search_deals', 'create_report'];

  return agent.act(task, tools);
}

export async function quarterlyBusinessReview() {
  const agent = new CRMAgent();

  const task = `
Generate a Quarterly Business Review (QBR):

1. Calculate 90-day deal forecast
2. Search for all customer contacts
3. Search for all deals in the pipeline
4. Create a comprehensive QBR report with:
   - Executive Summary
   - Revenue Forecast
   - Pipeline Analysis
   - Customer Health
   - Strategic Recommendations
5. Save as 'Q1_2025_Business_Review'
`;

  const tools = ['calculate_forecast', 'search_contacts', 'search_deals', 'create_report'];

  return agent.act(task, tools);
}

export async function smartSearch(query) {
  const agent = new CRMAgent();

  const task = `
The user asked: "${query}"

Help answer their question by:
1. Understanding what they're looking for
2. Using appropriate tools to search data
3. Analyzing the results
4. Providing a clear, actionable answer
`;

  return agent.act(task); // Use all tools
}

// ============================================================
// EXAMPLE USAGE
// ============================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log(chalk.cyan.bold('\n╔════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║  ClientForge CRM Autonomous Agent     ║'));
    console.log(chalk.cyan.bold('║  LM Studio TypeScript SDK (.act())    ║'));
    console.log(chalk.cyan.bold('╚════════════════════════════════════════╝\n'));

    const command = process.argv[2] || 'sales';

    if (command === 'sales') {
      await salesIntelligenceAgent();
    } else if (command === 'qbr') {
      await quarterlyBusinessReview();
    } else if (command === 'search') {
      const query = process.argv.slice(3).join(' ') || 'Find all prospects';
      await smartSearch(query);
    } else {
      const agent = new CRMAgent();
      const task = process.argv.slice(2).join(' ');
      await agent.act(task);
    }
  })();
}
