#!/usr/bin/env node

/**
 * Elaria Command Center - Comprehensive Health Check
 * Tests all systems: LM Studio, MCP, Security, Logging, Memory
 */

import { LMStudioClient } from '@lmstudio/sdk';
import chalk from 'chalk';
import { existsSync, statSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Health check results
const results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function log(emoji, message, level = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  console.log(`${chalk.gray(timestamp)} ${emoji} ${message}`);
}

function test(name, fn) {
  return async () => {
    try {
      log('🧪', chalk.cyan(`Testing: ${name}`));
      const result = await fn();

      if (result.passed) {
        results.passed++;
        results.tests.push({ name, status: 'passed', ...result });
        log('✅', chalk.green(`PASS: ${name}${result.details ? ` - ${result.details}` : ''}`));
      } else if (result.warning) {
        results.warnings++;
        results.tests.push({ name, status: 'warning', ...result });
        log('⚠️', chalk.yellow(`WARN: ${name} - ${result.message}`));
      } else {
        results.failed++;
        results.tests.push({ name, status: 'failed', ...result });
        log('❌', chalk.red(`FAIL: ${name} - ${result.message}`));
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'failed', error: error.message });
      log('❌', chalk.red(`ERROR: ${name} - ${error.message}`));
    }
  };
}

// Test 1: Check LM Studio Connection
const testLMStudio = test('LM Studio Connection', async () => {
  try {
    const client = new LMStudioClient({ baseUrl: 'ws://localhost:1234' });
    const models = await client.llm.listLoaded();

    if (models.length === 0) {
      return { passed: false, message: 'No models loaded in LM Studio' };
    }

    return {
      passed: true,
      details: `${models.length} model(s) loaded: ${models.map(m => m.path).join(', ')}`
    };
  } catch (error) {
    return { passed: false, message: `Cannot connect to LM Studio: ${error.message}` };
  }
});

// Test 2: Check Core Modules Exist
const testCoreModules = test('Core Modules', async () => {
  const modules = [
    'src/elaria.js',
    'src/agent-act.js',
    'src/vision-multimodal.js',
    'src/embeddings-rag.js',
    'src/mcp-integration-ws.js',
    'src/advanced-features.js',
    'src/config.js'
  ];

  const missing = modules.filter(m => !existsSync(join(__dirname, m)));

  if (missing.length > 0) {
    return { passed: false, message: `Missing modules: ${missing.join(', ')}` };
  }

  return { passed: true, details: `${modules.length} core modules found` };
});

// Test 3: Check Security Utils
const testSecurityUtils = test('Security Utilities', async () => {
  const utils = [
    'src/utils/security.js',
    'src/utils/logger.js',
    'src/utils/retry.js',
    'src/utils/client-pool.js',
    'src/utils/memory.js',
    'src/utils/config-validator.js'
  ];

  const missing = utils.filter(u => !existsSync(join(__dirname, u)));

  if (missing.length > 0) {
    return { passed: false, message: `Missing utils: ${missing.join(', ')}` };
  }

  return { passed: true, details: `${utils.length} utility modules found` };
});

// Test 4: Check Logging Directory
const testLogging = test('Logging Setup', async () => {
  const logsDir = join(__dirname, 'logs');

  if (!existsSync(logsDir)) {
    return { warning: true, message: 'Logs directory not created yet (will be created on first run)' };
  }

  const files = ['elaria-combined.log', 'elaria-error.log']
    .filter(f => existsSync(join(logsDir, f)));

  return {
    passed: true,
    details: `Logs directory exists${files.length > 0 ? `, ${files.length} log file(s) found` : ''}`
  };
});

// Test 5: Check .gitignore Protection
const testGitignore = test('Secrets Protection', async () => {
  const gitignore = join(__dirname, '.gitignore');

  if (!existsSync(gitignore)) {
    return { passed: false, message: '.gitignore missing - secrets may be exposed' };
  }

  const content = await import('fs/promises').then(fs => fs.readFile(gitignore, 'utf-8'));
  const protects = ['.env', 'logs/', 'node_modules/'];
  const missing = protects.filter(p => !content.includes(p));

  if (missing.length > 0) {
    return { warning: true, message: `.gitignore missing: ${missing.join(', ')}` };
  }

  return { passed: true, details: 'All critical paths protected' };
});

// Test 6: Check Dependencies
const testDependencies = test('NPM Dependencies', async () => {
  const pkg = await import('./package.json', { assert: { type: 'json' } });
  const required = [
    '@lmstudio/sdk',
    '@modelcontextprotocol/sdk',
    'winston',
    'chalk',
    'dotenv',
    'ora'
  ];

  const missing = required.filter(dep => !pkg.default.dependencies[dep]);

  if (missing.length > 0) {
    return { passed: false, message: `Missing dependencies: ${missing.join(', ')}` };
  }

  return { passed: true, details: `${Object.keys(pkg.default.dependencies).length} dependencies installed` };
});

// Test 7: Check MCP Router Availability
const testMCPRouter = test('MCP Router Availability', async () => {
  const routerPath = join(__dirname, '..', 'mcp', 'router.ts');

  if (!existsSync(routerPath)) {
    return { warning: true, message: 'MCP router not found at expected path' };
  }

  // Try to connect via WebSocket
  try {
    const ws = await import('ws').then(m => m.default);
    const socket = new ws('ws://localhost:8765');

    return await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        socket.close();
        resolve({
          warning: true,
          message: 'MCP router not running (start with: npm run mcp:all)'
        });
      }, 2000);

      socket.on('open', () => {
        clearTimeout(timeout);
        socket.close();
        resolve({ passed: true, details: 'MCP router running on port 8765' });
      });

      socket.on('error', () => {
        clearTimeout(timeout);
        resolve({
          warning: true,
          message: 'MCP router not running (start with: npm run mcp:all)'
        });
      });
    });
  } catch (error) {
    return { warning: true, message: 'Cannot check MCP router (ws module missing)' };
  }
});

// Test 8: Check File System Permissions
const testFilePermissions = test('File System Access', async () => {
  const fs = await import('fs/promises');
  const testFile = join(__dirname, '.health-check-test');

  try {
    await fs.writeFile(testFile, 'test');
    await fs.readFile(testFile);
    await fs.unlink(testFile);

    return { passed: true, details: 'Read/write permissions OK' };
  } catch (error) {
    return { passed: false, message: `File system error: ${error.message}` };
  }
});

// Test 9: Memory Check
const testMemory = test('Memory Usage', async () => {
  const used = process.memoryUsage();
  const heapUsedMB = Math.round(used.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(used.heapTotal / 1024 / 1024);
  const percentage = Math.round((used.heapUsed / used.heapTotal) * 100);

  if (percentage > 90) {
    return { warning: true, message: `High memory usage: ${percentage}% (${heapUsedMB}MB / ${heapTotalMB}MB)` };
  }

  return { passed: true, details: `${heapUsedMB}MB / ${heapTotalMB}MB (${percentage}%)` };
});

// Test 10: Node.js Version
const testNodeVersion = test('Node.js Version', async () => {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);

  if (major < 18) {
    return { passed: false, message: `Node.js ${version} too old (requires >=18.0.0)` };
  }

  return { passed: true, details: version };
});

// Main execution
async function runHealthCheck() {
  console.log('\n' + '='.repeat(70));
  log('🏥', chalk.bold.cyan('ELARIA COMMAND CENTER - HEALTH CHECK'));
  console.log('='.repeat(70) + '\n');

  const startTime = Date.now();

  // Run all tests
  await testNodeVersion();
  await testCoreModules();
  await testSecurityUtils();
  await testDependencies();
  await testFilePermissions();
  await testLogging();
  await testGitignore();
  await testLMStudio();
  await testMCPRouter();
  await testMemory();

  const duration = Date.now() - startTime;

  // Summary
  console.log('\n' + '='.repeat(70));
  log('📊', chalk.bold.cyan('HEALTH CHECK SUMMARY'));
  console.log('='.repeat(70) + '\n');

  log('✅', chalk.green(`Passed: ${results.passed}`));
  log('⚠️', chalk.yellow(`Warnings: ${results.warnings}`));
  log('❌', chalk.red(`Failed: ${results.failed}`));
  log('⏱️', chalk.gray(`Duration: ${duration}ms`));

  // Overall health score
  const total = results.passed + results.warnings + results.failed;
  const score = Math.round(((results.passed + results.warnings * 0.5) / total) * 100);

  console.log();
  if (score >= 90) {
    log('🎉', chalk.green.bold(`Overall Health: ${score}/100 - EXCELLENT`));
  } else if (score >= 70) {
    log('👍', chalk.cyan.bold(`Overall Health: ${score}/100 - GOOD`));
  } else if (score >= 50) {
    log('⚠️', chalk.yellow.bold(`Overall Health: ${score}/100 - NEEDS ATTENTION`));
  } else {
    log('❌', chalk.red.bold(`Overall Health: ${score}/100 - CRITICAL`));
  }

  console.log('\n' + '='.repeat(70) + '\n');

  // Recommendations
  if (results.failed > 0 || results.warnings > 0) {
    log('💡', chalk.bold('RECOMMENDATIONS:'));
    console.log();

    results.tests.forEach(test => {
      if (test.status === 'failed') {
        log('  ❌', chalk.red(`Fix: ${test.name} - ${test.message || test.error}`));
      } else if (test.status === 'warning') {
        log('  ⚠️', chalk.yellow(`Check: ${test.name} - ${test.message}`));
      }
    });

    console.log();
  }

  // Exit code
  process.exit(results.failed > 0 ? 1 : 0);
}

runHealthCheck().catch(error => {
  log('💥', chalk.red.bold(`Fatal error: ${error.message}`));
  console.error(error);
  process.exit(1);
});
