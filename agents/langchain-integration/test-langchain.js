#!/usr/bin/env node

/**
 * LangChain + LM Studio Integration Test Suite
 * Tests all components and chains
 */

import { ChatOpenAI } from '@langchain/openai';
import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';

dotenv.config();

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';
const LM_STUDIO_API_KEY = process.env.LM_STUDIO_API_KEY || 'lm-studio';

console.log(chalk.blue.bold('\n🔗 LangChain + LM Studio Integration Tests\n'));

// Test 1: LM Studio Connection
async function testLMStudioConnection() {
  const spinner = ora('Test 1: LM Studio Connection').start();

  try {
    const response = await fetch(`${LM_STUDIO_URL.replace('/v1', '')}/v1/models`);

    if (!response.ok) {
      throw new Error(`LM Studio not running or not accessible at ${LM_STUDIO_URL}`);
    }

    const data = await response.json();
    const models = data.data || [];

    spinner.succeed(chalk.green(`✓ Test 1: LM Studio Connection - ${models.length} models available`));
    console.log(chalk.gray(`  Models: ${models.map(m => m.id).join(', ')}`));

    return { success: true, models };
  } catch (error) {
    spinner.fail(chalk.red(`✗ Test 1: LM Studio Connection - ${error.message}`));
    return { success: false, error: error.message };
  }
}

// Test 2: LangChain LLM Call
async function testLangChainLLM() {
  const spinner = ora('Test 2: LangChain LLM Call').start();

  try {
    const llm = new ChatOpenAI({
      openAIApiKey: LM_STUDIO_API_KEY,
      modelName: 'local-model',
      temperature: 0.2,
      configuration: {
        baseURL: LM_STUDIO_URL,
      },
    });

    const response = await llm.invoke('Say "Hello from LangChain" in exactly 5 words');

    if (!response.content) {
      throw new Error('No response from LLM');
    }

    spinner.succeed(chalk.green('✓ Test 2: LangChain LLM Call'));
    console.log(chalk.gray(`  Response: "${response.content}"`));

    return { success: true, response: response.content };
  } catch (error) {
    spinner.fail(chalk.red(`✗ Test 2: LangChain LLM Call - ${error.message}`));
    return { success: false, error: error.message };
  }
}

// Test 3: Streaming Response
async function testStreaming() {
  const spinner = ora('Test 3: Streaming Response').start();

  try {
    const llm = new ChatOpenAI({
      openAIApiKey: LM_STUDIO_API_KEY,
      modelName: 'local-model',
      configuration: {
        baseURL: LM_STUDIO_URL,
      },
    });

    let chunks = [];
    const stream = await llm.stream('Count to 5 slowly: 1, 2, 3, 4, 5');

    for await (const chunk of stream) {
      chunks.push(chunk.content);
    }

    const fullResponse = chunks.join('');

    spinner.succeed(chalk.green('✓ Test 3: Streaming Response'));
    console.log(chalk.gray(`  Streamed ${chunks.length} chunks`));
    console.log(chalk.gray(`  Full response: "${fullResponse}"`));

    return { success: true, chunks: chunks.length };
  } catch (error) {
    spinner.fail(chalk.red(`✗ Test 3: Streaming Response - ${error.message}`));
    return { success: false, error: error.message };
  }
}

// Test 4: Multi-turn Conversation
async function testConversation() {
  const spinner = ora('Test 4: Multi-turn Conversation').start();

  try {
    const llm = new ChatOpenAI({
      openAIApiKey: LM_STUDIO_API_KEY,
      modelName: 'local-model',
      temperature: 0.3,
      configuration: {
        baseURL: LM_STUDIO_URL,
      },
    });

    const messages = [
      { role: 'system', content: 'You are a helpful assistant. Be concise.' },
      { role: 'user', content: 'What is ClientForge?' },
    ];

    const response1 = await llm.invoke(messages);
    messages.push({ role: 'assistant', content: response1.content });
    messages.push({ role: 'user', content: 'What databases does it use?' });

    const response2 = await llm.invoke(messages);

    spinner.succeed(chalk.green('✓ Test 4: Multi-turn Conversation'));
    console.log(chalk.gray(`  Turn 1: ${response1.content.slice(0, 50)}...`));
    console.log(chalk.gray(`  Turn 2: ${response2.content.slice(0, 50)}...`));

    return { success: true };
  } catch (error) {
    spinner.fail(chalk.red(`✗ Test 4: Multi-turn Conversation - ${error.message}`));
    return { success: false, error: error.message };
  }
}

// Test 5: Tool Use (Simulated)
async function testToolUse() {
  const spinner = ora('Test 5: Tool Use Capability').start();

  try {
    const llm = new ChatOpenAI({
      openAIApiKey: LM_STUDIO_API_KEY,
      modelName: 'local-model',
      temperature: 0.1,
      configuration: {
        baseURL: LM_STUDIO_URL,
      },
    });

    const prompt = `You have a tool called "read_file" that takes a path parameter.

When I ask you to "read the README.md file", respond with EXACTLY:

TOOL_CALL: read_file
PARAMETERS: {"path": "README.md"}

Now: Read the README.md file.`;

    const response = await llm.invoke(prompt);

    const hasToolCall = response.content.includes('TOOL_CALL:');
    const hasParameters = response.content.includes('PARAMETERS:');

    if (!hasToolCall || !hasParameters) {
      throw new Error('Model did not generate tool call format');
    }

    spinner.succeed(chalk.green('✓ Test 5: Tool Use Capability'));
    console.log(chalk.gray(`  Tool call detected: ${hasToolCall && hasParameters}`));

    return { success: true };
  } catch (error) {
    spinner.fail(chalk.red(`✗ Test 5: Tool Use Capability - ${error.message}`));
    return { success: false, error: error.message };
  }
}

// Run all tests
async function runAllTests() {
  const results = [];

  results.push(await testLMStudioConnection());
  results.push(await testLangChainLLM());
  results.push(await testStreaming());
  results.push(await testConversation());
  results.push(await testToolUse());

  const passed = results.filter(r => r.success).length;
  const total = results.length;

  console.log(chalk.blue.bold(`\n📊 Test Results: ${passed}/${total} passed\n`));

  if (passed === total) {
    console.log(chalk.green.bold('✅ All tests passed! LangChain integration is ready.\n'));
  } else {
    console.log(chalk.yellow.bold('⚠️  Some tests failed. Check errors above.\n'));
  }

  // Print summary
  console.log(chalk.blue('Next steps:'));
  console.log(chalk.gray('  1. Install dependencies: npm install'));
  console.log(chalk.gray('  2. Set up .env file with database credentials'));
  console.log(chalk.gray('  3. Try example chains: npm run chain:code-review'));
  console.log();
}

// Execute
runAllTests().catch(console.error);
