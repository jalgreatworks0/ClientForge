/**
 * Elaria Control Plane - Agent Core
 * Connects LM Studio (Elaria's brain) with tool execution capabilities
 */

import OpenAI from 'openai';
import { executeTool, TOOLS } from './tools.js';
import chalk from 'chalk';

export class ElariaAgent {
  constructor(options = {}) {
    this.lmStudio = new OpenAI({
      baseURL: options.baseURL || 'http://localhost:1234/v1',
      apiKey: options.apiKey || 'lm-studio'
    });

    this.model = options.model || 'meta-llama-3.1-70b-instruct@q3_k_s';
    this.systemPrompt = options.systemPrompt || this.getDefaultSystemPrompt();
    this.conversationHistory = [];
    this.maxIterations = options.maxIterations || 10; // Prevent infinite loops
  }

  getDefaultSystemPrompt() {
    const toolDescriptions = Object.entries(TOOLS)
      .map(([name, tool]) => {
        const params = Object.entries(tool.parameters)
          .map(([pName, pInfo]) =>
            `${pName}: ${pInfo.description}${pInfo.required ? ' (required)' : ''}`
          )
          .join(', ');

        return `- ${name}(${params}): ${tool.description}`;
      })
      .join('\n');

    return `You are Elaria, an autonomous AI agent with tool execution capabilities.

When the user asks you to do something, you should:
1. Plan the steps needed
2. Use tools to execute those steps
3. Analyze the results
4. Continue until the task is complete

## Available Tools

${toolDescriptions}

## How to Use Tools

To call a tool, respond with:
TOOL_CALL: tool_name
PARAMETERS: {"param1": "value1", "param2": "value2"}

You can call multiple tools in sequence. After each tool execution, you'll receive the results and can decide what to do next.

When the task is complete, respond with:
TASK_COMPLETE: [summary of what was accomplished]

## Guidelines

- Be proactive and autonomous
- Use tools to gather information before making suggestions
- If a tool fails, try an alternative approach
- Always validate your assumptions with tools before concluding
- For code analysis, actually read the files
- For project understanding, analyze the structure first

## Examples

User: "What TypeScript files are in the backend?"
Response:
TOOL_CALL: list_files
PARAMETERS: {"pattern": "backend/**/*.ts"}

User: "Analyze the contact service"
Response:
TOOL_CALL: read_file
PARAMETERS: {"filePath": "backend/core/contacts/contact-service.ts"}

User: "What changed recently?"
Response:
TOOL_CALL: git_log
PARAMETERS: {"limit": 5}

Now execute tasks autonomously using these tools.`;
  }

  /**
   * Parse tool calls from Elaria's response
   */
  parseToolCalls(response) {
    const toolCalls = [];
    const lines = response.split('\n');

    let currentTool = null;
    let parametersJson = '';
    let inParameters = false;

    for (const line of lines) {
      if (line.startsWith('TOOL_CALL:')) {
        if (currentTool) {
          // Save previous tool
          try {
            const params = parametersJson.trim() ? JSON.parse(parametersJson) : {};
            toolCalls.push({ tool: currentTool, parameters: params });
          } catch (e) {
            console.error(chalk.red(`Failed to parse parameters for ${currentTool}: ${e.message}`));
          }
        }

        currentTool = line.replace('TOOL_CALL:', '').trim();
        parametersJson = '';
        inParameters = false;
      } else if (line.startsWith('PARAMETERS:')) {
        inParameters = true;
        parametersJson = line.replace('PARAMETERS:', '').trim();
      } else if (inParameters && line.trim()) {
        parametersJson += line;
      }
    }

    // Save last tool
    if (currentTool) {
      try {
        const params = parametersJson.trim() ? JSON.parse(parametersJson) : {};
        toolCalls.push({ tool: currentTool, parameters: params });
      } catch (e) {
        console.error(chalk.red(`Failed to parse parameters for ${currentTool}: ${e.message}`));
      }
    }

    return toolCalls;
  }

  /**
   * Check if task is complete
   */
  isTaskComplete(response) {
    return response.includes('TASK_COMPLETE:');
  }

  /**
   * Call LM Studio (Elaria's brain)
   */
  async think(userMessage) {
    const messages = [
      { role: 'system', content: this.systemPrompt },
      ...this.conversationHistory
    ];

    if (userMessage) {
      messages.push({ role: 'user', content: userMessage });
    }

    try {
      const response = await this.lmStudio.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      });

      const reply = response.choices[0].message.content;
      return reply;
    } catch (error) {
      throw new Error(`Elaria thinking failed: ${error.message}`);
    }
  }

  /**
   * Execute a command (main entry point)
   */
  async execute(userCommand) {
    console.log(chalk.cyan('\n🧠 Elaria:'), 'Processing your request...\n');

    this.conversationHistory = [
      { role: 'user', content: userCommand }
    ];

    let iteration = 0;
    let lastResponse = '';

    while (iteration < this.maxIterations) {
      iteration++;

      console.log(chalk.gray(`\n--- Iteration ${iteration} ---\n`));

      // Elaria thinks about what to do
      const response = await this.think(iteration === 1 ? null : lastResponse);
      lastResponse = response;

      console.log(chalk.yellow('Elaria says:'), response.substring(0, 500) + (response.length > 500 ? '...' : ''));

      // Check if task is complete
      if (this.isTaskComplete(response)) {
        const summary = response.split('TASK_COMPLETE:')[1]?.trim() || response;
        console.log(chalk.green('\n✅ Task Complete!\n'));
        console.log(summary);

        return {
          success: true,
          summary,
          iterations: iteration,
          fullResponse: response
        };
      }

      // Parse tool calls
      const toolCalls = this.parseToolCalls(response);

      if (toolCalls.length === 0) {
        // No tools called, but task not complete - ask Elaria to continue
        console.log(chalk.yellow('⚠️  No tool calls detected. Prompting Elaria to use tools...'));

        this.conversationHistory.push({ role: 'assistant', content: response });
        this.conversationHistory.push({
          role: 'user',
          content: 'Please use the available tools to complete the task. Call tools using the TOOL_CALL format.'
        });

        continue;
      }

      // Execute tools
      const toolResults = [];

      for (const { tool, parameters } of toolCalls) {
        console.log(chalk.blue(`\n🔧 Executing: ${tool}`), chalk.gray(JSON.stringify(parameters)));

        const result = await executeTool(tool, parameters);

        console.log(
          result.success ? chalk.green('✓ Success') : chalk.red('✗ Failed'),
          chalk.gray(JSON.stringify(result).substring(0, 200))
        );

        toolResults.push({
          tool,
          parameters,
          result
        });
      }

      // Feed results back to Elaria
      const resultsMessage = `Tool execution results:\n\n${toolResults
        .map(({ tool, result }) => `${tool}: ${JSON.stringify(result, null, 2)}`)
        .join('\n\n')}`;

      this.conversationHistory.push({ role: 'assistant', content: response });
      this.conversationHistory.push({ role: 'user', content: resultsMessage });
    }

    // Max iterations reached
    console.log(chalk.red('\n⚠️  Max iterations reached without completion\n'));

    return {
      success: false,
      error: 'Max iterations reached',
      iterations: iteration,
      lastResponse
    };
  }

  /**
   * Interactive mode
   */
  async chat(userMessage) {
    // Add to conversation
    if (this.conversationHistory.length === 0) {
      this.conversationHistory.push({ role: 'user', content: userMessage });
    }

    const response = await this.think();

    this.conversationHistory.push({ role: 'assistant', content: response });

    // Parse and execute any tool calls
    const toolCalls = this.parseToolCalls(response);

    if (toolCalls.length > 0) {
      console.log(chalk.blue(`\n🔧 Executing ${toolCalls.length} tool(s)...\n`));

      for (const { tool, parameters } of toolCalls) {
        const result = await executeTool(tool, parameters);
        console.log(chalk.gray(`  ${tool}:`), result.success ? chalk.green('✓') : chalk.red('✗'));

        // Add result to conversation
        this.conversationHistory.push({
          role: 'user',
          content: `Tool ${tool} result: ${JSON.stringify(result)}`
        });
      }

      // Get Elaria's response to the tool results
      const followUp = await this.think();
      this.conversationHistory.push({ role: 'assistant', content: followUp });

      return followUp;
    }

    return response;
  }
}
