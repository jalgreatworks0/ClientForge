#!/usr/bin/env node

/**
 * ClientForge MCP Server Test Suite
 *
 * Tests all 12 MCP servers to verify they respond correctly
 * to stdin/stdout JSON-RPC protocol
 */

const { spawn } = require('child_process');
const path = require('path');

const SERVERS_DIR = path.join(__dirname, 'servers');
const TIMEOUT_MS = 5000;

// Test configuration
const tests = [
  {
    name: 'filesystem-server',
    file: 'filesystem-server.js',
    env: {
      WORKSPACE_ROOT: 'D:\\clientforge-crm',
      STAGING_ROOT: 'D:\\clientforge-crm\\_staging'
    },
    testRequest: {
      id: 'test-1',
      method: 'read_file',
      params: {
        relativePath: 'README.md'
      }
    },
    expectStub: false
  },
  {
    name: 'database-server',
    file: 'database-server.js',
    env: {
      POSTGRES_URL: 'postgres://localhost:5432/clientforge',
      MONGODB_URL: 'mongodb://localhost:27017/clientforge?authSource=admin',
      ELASTICSEARCH_URL: 'http://localhost:9200',
      REDIS_URL: 'redis://localhost:6379'
    },
    testRequest: {
      id: 'test-2',
      method: 'database_health',
      params: {}
    },
    expectStub: false
  },
  {
    name: 'codebase-server',
    file: 'codebase-server.js',
    env: {
      WORKSPACE_ROOT: 'D:\\clientforge-crm'
    },
    testRequest: {
      id: 'test-3',
      method: 'find_definition',
      params: {
        symbol: 'ContactService'
      }
    },
    expectStub: false
  },
  {
    name: 'testing-server',
    file: 'testing-server.js',
    env: {
      WORKSPACE_ROOT: 'D:\\clientforge-crm',
      TEST_RUNNER: 'jest'
    },
    testRequest: {
      id: 'test-4',
      method: 'run_tests',
      params: {}
    },
    expectStub: true
  },
  {
    name: 'git-server',
    file: 'git-server.js',
    env: {
      GIT_REPO: 'D:\\clientforge-crm'
    },
    testRequest: {
      id: 'test-5',
      method: 'status',
      params: {}
    },
    expectStub: true
  },
  {
    name: 'documentation-server',
    file: 'documentation-server.js',
    env: {
      DOCS_ROOT: 'D:\\clientforge-crm\\docs'
    },
    testRequest: {
      id: 'test-6',
      method: 'generate_jsdoc',
      params: {}
    },
    expectStub: true
  },
  {
    name: 'build-server',
    file: 'build-server.js',
    env: {
      WORKSPACE_ROOT: 'D:\\clientforge-crm',
      SCRIPTS_ROOT: 'D:\\clientforge-crm\\scripts'
    },
    testRequest: {
      id: 'test-7',
      method: 'run_ci_gate',
      params: {}
    },
    expectStub: true
  },
  {
    name: 'rag-server',
    file: 'rag-server.js',
    env: {
      RAG_ENDPOINT: 'http://127.0.0.1:8920',
      INDEX_PATH: 'D:\\clientforge-crm\\agents\\rag-index'
    },
    testRequest: {
      id: 'test-8',
      method: 'semantic_search',
      params: {}
    },
    expectStub: true
  },
  {
    name: 'security-server',
    file: 'security-server.js',
    env: {
      WORKSPACE_ROOT: 'D:\\clientforge-crm'
    },
    testRequest: {
      id: 'test-9',
      method: 'scan_vulnerabilities',
      params: {}
    },
    expectStub: true
  },
  {
    name: 'logger-server',
    file: 'logger-server.js',
    env: {
      MONGODB_URL: 'mongodb://localhost:27017/clientforge?authSource=admin'
    },
    testRequest: {
      id: 'test-10',
      method: 'log',
      params: {}
    },
    expectStub: true
  },
  {
    name: 'context-pack-server',
    file: 'context-pack-server.js',
    env: {
      WORKSPACE_ROOT: 'D:\\clientforge-crm',
      PACKS_FILE: 'D:\\clientforge-crm\\docs\\claude\\11_CONTEXT_PACKS.md',
      BUDGET_LIMIT_KB: '120'
    },
    testRequest: {
      id: 'test-11',
      method: 'load_pack',
      params: {
        pack: 'crm_pack'
      }
    },
    expectStub: true
  }
];

// Test results
const results = {
  passed: 0,
  failed: 0,
  total: tests.length,
  details: []
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Test a single MCP server
 */
async function testServer(test) {
  return new Promise((resolve) => {
    const serverPath = path.join(SERVERS_DIR, test.file);

    console.log(`${colors.cyan}[TEST]${colors.reset} ${test.name}...`);

    const server = spawn('node', [serverPath], {
      env: { ...process.env, ...test.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdoutData = '';
    let stderrData = '';
    let timeout;
    let resolved = false;

    // Timeout handler
    timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        server.kill();
        resolve({
          name: test.name,
          passed: false,
          error: 'Timeout - no response within 5 seconds',
          expectStub: test.expectStub
        });
      }
    }, TIMEOUT_MS);

    // Capture stdout
    server.stdout.on('data', (data) => {
      stdoutData += data.toString();

      // Try to parse JSON response
      try {
        const lines = stdoutData.split('\n').filter(line => line.trim());
        for (const line of lines) {
          const response = JSON.parse(line);

          if (response.id === test.testRequest.id) {
            clearTimeout(timeout);
            if (!resolved) {
              resolved = true;
              server.kill();

              // Check if response is valid
              const isStub = response.result?.stub === true;
              const hasError = !!response.error;

              if (hasError) {
                resolve({
                  name: test.name,
                  passed: false,
                  error: response.error.message,
                  expectStub: test.expectStub
                });
              } else if (test.expectStub && isStub) {
                resolve({
                  name: test.name,
                  passed: true,
                  message: 'Stub server responding correctly',
                  expectStub: test.expectStub
                });
              } else if (!test.expectStub && !isStub) {
                resolve({
                  name: test.name,
                  passed: true,
                  message: 'Server responding with real data',
                  expectStub: test.expectStub
                });
              } else {
                resolve({
                  name: test.name,
                  passed: false,
                  error: `Expected ${test.expectStub ? 'stub' : 'real'} response, got ${isStub ? 'stub' : 'real'}`,
                  expectStub: test.expectStub
                });
              }
            }
          }
        }
      } catch (e) {
        // Not valid JSON yet, keep accumulating
      }
    });

    // Capture stderr
    server.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    // Handle exit
    server.on('exit', (code) => {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        resolve({
          name: test.name,
          passed: false,
          error: `Server exited with code ${code}`,
          stderr: stderrData,
          expectStub: test.expectStub
        });
      }
    });

    // Send test request after a short delay (let server initialize)
    setTimeout(() => {
      try {
        server.stdin.write(JSON.stringify(test.testRequest) + '\n');
      } catch (e) {
        if (!resolved) {
          clearTimeout(timeout);
          resolved = true;
          resolve({
            name: test.name,
            passed: false,
            error: `Failed to send request: ${e.message}`,
            expectStub: test.expectStub
          });
        }
      }
    }, 500);
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log(`${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║   ClientForge MCP Server Test Suite                       ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');
  console.log(`Testing ${tests.length} MCP servers...\n`);

  // Run tests sequentially
  for (const test of tests) {
    const result = await testServer(test);
    results.details.push(result);

    if (result.passed) {
      results.passed++;
      const badge = result.expectStub ? '🟡 STUB' : '✅ LIVE';
      console.log(`  ${colors.green}✓${colors.reset} ${result.name.padEnd(30)} ${badge}`);
      if (result.message) {
        console.log(`    ${colors.gray}${result.message}${colors.reset}`);
      }
    } else {
      results.failed++;
      console.log(`  ${colors.red}✗${colors.reset} ${result.name.padEnd(30)} ${colors.red}FAILED${colors.reset}`);
      console.log(`    ${colors.red}${result.error}${colors.reset}`);
      if (result.stderr) {
        console.log(`    ${colors.gray}stderr: ${result.stderr.substring(0, 100)}${colors.reset}`);
      }
    }
    console.log('');
  }

  // Summary
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Test Summary${colors.reset}`);
  console.log(`${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`Total Tests:  ${results.total}`);
  console.log(`${colors.green}Passed:       ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed:       ${results.failed}${colors.reset}`);
  console.log('');

  // Breakdown by type
  const liveServers = results.details.filter(r => !r.expectStub);
  const stubServers = results.details.filter(r => r.expectStub);

  console.log(`${colors.cyan}Live Servers:${colors.reset} ${liveServers.filter(r => r.passed).length}/${liveServers.length} operational`);
  console.log(`${colors.yellow}Stub Servers:${colors.reset} ${stubServers.filter(r => r.passed).length}/${stubServers.length} responding`);
  console.log('');

  // Overall status
  if (results.failed === 0) {
    console.log(`${colors.green}✓ All MCP servers are operational!${colors.reset}`);
    console.log(`${colors.green}Verification Code: MCP-TEST-SUITE-PASSED${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Some MCP servers failed${colors.reset}`);
    console.log(`${colors.red}Please check the errors above${colors.reset}`);
  }

  console.log('');

  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
