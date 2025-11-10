#!/usr/bin/env node

/**
 * Elaria Control Plane - CLI Entry Point
 *
 * Direct CLI interface to Elaria (LM Studio) with tool execution.
 * Bypasses broken MCP system by using OpenAI-compatible API + tool parsing.
 *
 * Usage:
 *   node index.js                           # Interactive mode
 *   node index.js "analyze the backend"     # Single command
 *   npm start                                # Interactive mode
 */

import { ElariaAgent } from './elaria-agent.js';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';

// ASCII Art Banner
const banner = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███████╗██╗      █████╗ ██████╗ ██╗ █████╗            ║
║   ██╔════╝██║     ██╔══██╗██╔══██╗██║██╔══██╗           ║
║   █████╗  ██║     ███████║██████╔╝██║███████║           ║
║   ██╔══╝  ██║     ██╔══██║██╔══██╗██║██╔══██║           ║
║   ███████╗███████╗██║  ██║██║  ██║██║██║  ██║           ║
║   ╚══════╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═╝           ║
║                                                           ║
║   Control Plane for LM Studio                            ║
║   Autonomous AI Agent with Tool Execution                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

// Configuration
const CONFIG = {
  lmStudioURL: process.env.LM_STUDIO_URL || 'http://localhost:1234/v1',
  model: process.env.LM_STUDIO_MODEL || 'qwen2.5-30b-a3b',
  maxIterations: parseInt(process.env.MAX_ITERATIONS || '10'),
};

/**
 * Print banner and status
 */
async function printBanner(agent) {
  console.log(chalk.cyan(banner));

  const spinner = ora('Connecting to LM Studio...').start();

  try {
    // Test connection by listing models
    const response = await agent.lmStudio.models.list();
    const models = response.data || [];

    spinner.succeed(chalk.green('Connected to LM Studio'));

    console.log(chalk.gray('\n┌─ Configuration ──────────────────────────────────┐'));
    console.log(chalk.gray('│'), chalk.white('Server:  '), chalk.cyan(CONFIG.lmStudioURL));
    console.log(chalk.gray('│'), chalk.white('Model:   '), chalk.cyan(CONFIG.model));
    console.log(chalk.gray('│'), chalk.white('Models:  '), chalk.yellow(models.length), 'available');
    console.log(chalk.gray('│'), chalk.white('Tools:   '), chalk.yellow(Object.keys(agent.tools || {}).length || 10), 'tools ready');
    console.log(chalk.gray('└──────────────────────────────────────────────────┘\n'));

    return true;
  } catch (error) {
    spinner.fail(chalk.red('Failed to connect to LM Studio'));
    console.log(chalk.red('\n✗ Error:'), error.message);
    console.log(chalk.yellow('\n⚠ Make sure LM Studio is running on'), chalk.cyan(CONFIG.lmStudioURL));
    console.log(chalk.yellow('⚠ Load a model in LM Studio before using Elaria\n'));
    return false;
  }
}

/**
 * Interactive mode
 */
async function interactiveMode(agent) {
  console.log(chalk.green('\n🤖 Interactive Mode'));
  console.log(chalk.gray('Type your commands or questions. Type "exit" to quit.\n'));
  console.log(chalk.cyan('Examples:'));
  console.log(chalk.gray('  • "Analyze the ClientForge backend structure"'));
  console.log(chalk.gray('  • "What TypeScript files are in the backend?"'));
  console.log(chalk.gray('  • "Show me recent git commits"'));
  console.log(chalk.gray('  • "Read the README.md file"\n'));

  while (true) {
    const { command } = await inquirer.prompt([
      {
        type: 'input',
        name: 'command',
        message: chalk.cyan('Elaria >'),
        prefix: '',
      },
    ]);

    if (!command.trim()) continue;

    if (command.toLowerCase() === 'exit' || command.toLowerCase() === 'quit') {
      console.log(chalk.cyan('\n👋 Goodbye!\n'));
      break;
    }

    if (command.toLowerCase() === 'help') {
      printHelp();
      continue;
    }

    if (command.toLowerCase() === 'tools') {
      printTools(agent);
      continue;
    }

    // Execute command
    console.log('');
    const spinner = ora('Elaria is thinking...').start();

    try {
      const result = await agent.execute(command);
      spinner.stop();

      if (result.success) {
        console.log(chalk.green('\n✓ Task Complete\n'));
      } else {
        console.log(chalk.yellow('\n⚠ Task incomplete or timed out\n'));
        console.log(chalk.gray('Last response:'), result.lastResponse?.substring(0, 200));
      }
    } catch (error) {
      spinner.fail('Execution failed');
      console.log(chalk.red('Error:'), error.message);
    }

    console.log('');
  }
}

/**
 * Single command mode
 */
async function singleCommandMode(agent, command) {
  console.log(chalk.cyan('\n🤖 Executing:'), chalk.white(command), '\n');

  const spinner = ora('Elaria is working...').start();

  try {
    const result = await agent.execute(command);
    spinner.stop();

    console.log('');
    if (result.success) {
      console.log(chalk.green('✓ Success\n'));
      console.log(result.summary || result.fullResponse);
    } else {
      console.log(chalk.yellow('⚠ Incomplete\n'));
      console.log(chalk.gray('Iterations:'), result.iterations);
      if (result.error) {
        console.log(chalk.red('Error:'), result.error);
      }
    }
    console.log('');

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    spinner.fail('Failed');
    console.log(chalk.red('\n✗ Error:'), error.message, '\n');
    process.exit(1);
  }
}

/**
 * Print help
 */
function printHelp() {
  console.log(chalk.cyan('\n📖 Elaria Control Plane - Help\n'));
  console.log(chalk.white('Usage:'));
  console.log(chalk.gray('  node index.js                    # Interactive mode'));
  console.log(chalk.gray('  node index.js "your command"     # Single command\n'));

  console.log(chalk.white('Interactive Commands:'));
  console.log(chalk.gray('  help     # Show this help'));
  console.log(chalk.gray('  tools    # List available tools'));
  console.log(chalk.gray('  exit     # Exit interactive mode\n'));

  console.log(chalk.white('Environment Variables:'));
  console.log(chalk.gray('  LM_STUDIO_URL        # LM Studio server URL (default: http://localhost:1234/v1)'));
  console.log(chalk.gray('  LM_STUDIO_MODEL      # Model name (default: qwen2.5-30b-a3b)'));
  console.log(chalk.gray('  MAX_ITERATIONS       # Max tool iterations (default: 10)\n'));
}

/**
 * Print available tools
 */
function printTools(agent) {
  console.log(chalk.cyan('\n🔧 Available Tools\n'));

  const tools = [
    { name: 'list_files', desc: 'List files matching a pattern' },
    { name: 'read_file', desc: 'Read file contents' },
    { name: 'write_file', desc: 'Write content to a file' },
    { name: 'search_files', desc: 'Search for text across files' },
    { name: 'git_status', desc: 'Get git repository status' },
    { name: 'git_log', desc: 'Get git commit history' },
    { name: 'git_diff', desc: 'Get git diff of changes' },
    { name: 'run_command', desc: 'Run safe shell commands' },
    { name: 'analyze_project', desc: 'Analyze project structure' },
    { name: 'query_database', desc: 'Query database schema' },
  ];

  tools.forEach(({ name, desc }) => {
    console.log(chalk.yellow('  •'), chalk.white(name.padEnd(20)), chalk.gray(desc));
  });

  console.log('');
}

/**
 * Main entry point
 */
async function main() {
  // Create Elaria agent
  const agent = new ElariaAgent({
    baseURL: CONFIG.lmStudioURL,
    model: CONFIG.model,
    maxIterations: CONFIG.maxIterations,
  });

  // Print banner and check connection
  const connected = await printBanner(agent);

  if (!connected) {
    process.exit(1);
  }

  // Get command from arguments
  const command = process.argv.slice(2).join(' ');

  if (command) {
    // Single command mode
    await singleCommandMode(agent, command);
  } else {
    // Interactive mode
    await interactiveMode(agent);
  }
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('\n✗ Unhandled error:'), error.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.cyan('\n\n👋 Interrupted. Goodbye!\n'));
  process.exit(0);
});

// Run
main().catch((error) => {
  console.error(chalk.red('\n✗ Fatal error:'), error.message);
  console.error(error.stack);
  process.exit(1);
});
