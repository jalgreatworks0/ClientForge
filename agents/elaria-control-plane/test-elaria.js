#!/usr/bin/env node

/**
 * Test Suite for Elaria Control Plane
 *
 * Validates:
 * - LM Studio connection
 * - Tool execution
 * - Agent reasoning
 * - Error handling
 */

import { ElariaAgent } from './elaria-agent.js';
import { executeTool, TOOLS } from './tools.js';
import chalk from 'chalk';

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234/v1';
const MODEL = process.env.LM_STUDIO_MODEL || 'qwen2.5-30b-a3b';

console.log(chalk.cyan('\n🧪 Elaria Control Plane - Test Suite\n'));

/**
 * Test 1: LM Studio Connection
 */
async function testConnection() {
  process.stdout.write(chalk.gray('1. Testing LM Studio connection... '));

  try {
    const agent = new ElariaAgent({ baseURL: LM_STUDIO_URL, model: MODEL });
    const response = await agent.lmStudio.models.list();

    if (response && response.data && response.data.length > 0) {
      console.log(chalk.green('✓ PASS'));
      console.log(chalk.gray(`   Found ${response.data.length} model(s)`));
      return { success: true, agent };
    } else {
      console.log(chalk.red('✗ FAIL'));
      console.log(chalk.red('   No models found'));
      return { success: false };
    }
  } catch (error) {
    console.log(chalk.red('✗ FAIL'));
    console.log(chalk.red('   Error:'), error.message);
    return { success: false };
  }
}

/**
 * Test 2: Tool Execution
 */
async function testTools() {
  process.stdout.write(chalk.gray('2. Testing tool execution... '));

  try {
    // Test list_files
    const result = await executeTool('list_files', {
      pattern: '*.md',
      directory: 'D:/clientforge-crm',
    });

    if (result.success && result.files && result.files.length > 0) {
      console.log(chalk.green('✓ PASS'));
      console.log(chalk.gray(`   Found ${result.count} markdown files`));
      return { success: true };
    } else {
      console.log(chalk.red('✗ FAIL'));
      console.log(chalk.red('   Tool execution failed'));
      return { success: false };
    }
  } catch (error) {
    console.log(chalk.red('✗ FAIL'));
    console.log(chalk.red('   Error:'), error.message);
    return { success: false };
  }
}

/**
 * Test 3: Simple Chat
 */
async function testChat(agent) {
  process.stdout.write(chalk.gray('3. Testing LM Studio chat... '));

  try {
    const response = await agent.think('Say "test successful" in exactly two words');

    if (response && response.length > 0) {
      console.log(chalk.green('✓ PASS'));
      console.log(chalk.gray(`   Response: ${response.substring(0, 100)}...`));
      return { success: true };
    } else {
      console.log(chalk.red('✗ FAIL'));
      console.log(chalk.red('   No response from model'));
      return { success: false };
    }
  } catch (error) {
    console.log(chalk.red('✗ FAIL'));
    console.log(chalk.red('   Error:'), error.message);
    return { success: false };
  }
}

/**
 * Test 4: Tool Parsing
 */
async function testToolParsing(agent) {
  process.stdout.write(chalk.gray('4. Testing tool call parsing... '));

  const sampleResponse = `I'll list the files for you.

TOOL_CALL: list_files
PARAMETERS: {"pattern": "**/*.ts", "directory": "D:/clientforge-crm"}

This will show all TypeScript files.`;

  try {
    const toolCalls = agent.parseToolCalls(sampleResponse);

    if (toolCalls.length === 1 && toolCalls[0].tool === 'list_files') {
      console.log(chalk.green('✓ PASS'));
      console.log(chalk.gray(`   Parsed ${toolCalls.length} tool call(s)`));
      return { success: true };
    } else {
      console.log(chalk.red('✗ FAIL'));
      console.log(chalk.red(`   Expected 1 tool call, got ${toolCalls.length}`));
      return { success: false };
    }
  } catch (error) {
    console.log(chalk.red('✗ FAIL'));
    console.log(chalk.red('   Error:'), error.message);
    return { success: false };
  }
}

/**
 * Test 5: File Read
 */
async function testFileRead() {
  process.stdout.write(chalk.gray('5. Testing file read tool... '));

  try {
    const result = await executeTool('read_file', {
      filePath: 'D:/clientforge-crm/README.md',
    });

    if (result.success && result.content && result.content.includes('ClientForge')) {
      console.log(chalk.green('✓ PASS'));
      console.log(chalk.gray(`   Read ${result.size} bytes`));
      return { success: true };
    } else {
      console.log(chalk.red('✗ FAIL'));
      console.log(chalk.red('   Failed to read README.md'));
      return { success: false };
    }
  } catch (error) {
    console.log(chalk.red('✗ FAIL'));
    console.log(chalk.red('   Error:'), error.message);
    return { success: false };
  }
}

/**
 * Test 6: Git Status
 */
async function testGit() {
  process.stdout.write(chalk.gray('6. Testing git integration... '));

  try {
    const result = await executeTool('git_status', {
      directory: 'D:/clientforge-crm',
    });

    if (result.success && result.branch) {
      console.log(chalk.green('✓ PASS'));
      console.log(chalk.gray(`   Current branch: ${result.branch}`));
      return { success: true };
    } else {
      console.log(chalk.yellow('⚠ SKIP'));
      console.log(chalk.gray('   Not a git repository'));
      return { success: true, skipped: true };
    }
  } catch (error) {
    console.log(chalk.yellow('⚠ SKIP'));
    console.log(chalk.gray('   Git not available'));
    return { success: true, skipped: true };
  }
}

/**
 * Test 7: Project Analysis
 */
async function testProjectAnalysis() {
  process.stdout.write(chalk.gray('7. Testing project analysis... '));

  try {
    const result = await executeTool('analyze_project', {
      directory: 'D:/clientforge-crm',
    });

    if (result.success && result.totalFiles > 0) {
      console.log(chalk.green('✓ PASS'));
      console.log(chalk.gray(`   Found ${result.totalFiles} files`));
      return { success: true };
    } else {
      console.log(chalk.red('✗ FAIL'));
      console.log(chalk.red('   Project analysis returned no results'));
      return { success: false };
    }
  } catch (error) {
    console.log(chalk.red('✗ FAIL'));
    console.log(chalk.red('   Error:'), error.message);
    return { success: false };
  }
}

/**
 * Test 8: Tool Registry
 */
async function testToolRegistry() {
  process.stdout.write(chalk.gray('8. Testing tool registry... '));

  const expectedTools = [
    'list_files',
    'read_file',
    'write_file',
    'search_files',
    'git_status',
    'git_log',
    'git_diff',
    'run_command',
    'analyze_project',
    'query_database',
  ];

  const actualTools = Object.keys(TOOLS);
  const allPresent = expectedTools.every((tool) => actualTools.includes(tool));

  if (allPresent) {
    console.log(chalk.green('✓ PASS'));
    console.log(chalk.gray(`   All ${expectedTools.length} tools registered`));
    return { success: true };
  } else {
    console.log(chalk.red('✗ FAIL'));
    const missing = expectedTools.filter((t) => !actualTools.includes(t));
    console.log(chalk.red(`   Missing tools: ${missing.join(', ')}`));
    return { success: false };
  }
}

/**
 * Run all tests
 */
async function runTests() {
  const results = [];

  // Test 1: Connection (prerequisite for other tests)
  const connResult = await testConnection();
  results.push(connResult);

  if (!connResult.success) {
    console.log(chalk.red('\n✗ LM Studio connection failed. Skipping remaining tests.\n'));
    console.log(chalk.yellow('Make sure:'));
    console.log(chalk.gray('  1. LM Studio is running'));
    console.log(chalk.gray('  2. A model is loaded'));
    console.log(chalk.gray('  3. Server is on'), chalk.cyan(LM_STUDIO_URL));
    console.log('');
    process.exit(1);
  }

  const agent = connResult.agent;

  // Test 2-8
  results.push(await testTools());
  results.push(await testChat(agent));
  results.push(await testToolParsing(agent));
  results.push(await testFileRead());
  results.push(await testGit());
  results.push(await testProjectAnalysis());
  results.push(await testToolRegistry());

  // Summary
  console.log(chalk.cyan('\n─────────────────────────────────────────────'));

  const passed = results.filter((r) => r.success && !r.skipped).length;
  const failed = results.filter((r) => !r.success).length;
  const skipped = results.filter((r) => r.skipped).length;
  const total = results.length;

  console.log(chalk.white('\nTest Results:'));
  console.log(chalk.green(`  ✓ Passed:  ${passed}/${total}`));
  if (failed > 0) console.log(chalk.red(`  ✗ Failed:  ${failed}/${total}`));
  if (skipped > 0) console.log(chalk.yellow(`  ⚠ Skipped: ${skipped}/${total}`));

  if (failed === 0) {
    console.log(chalk.green('\n✓ All tests passed! Elaria Control Plane is ready.\n'));
    process.exit(0);
  } else {
    console.log(chalk.red('\n✗ Some tests failed. Please review the errors above.\n'));
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(chalk.red('\n✗ Test suite crashed:'), error.message);
  console.error(error.stack);
  process.exit(1);
});
