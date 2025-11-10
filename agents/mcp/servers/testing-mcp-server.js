#!/usr/bin/env node

/**
 * ClientForge Testing MCP Server
 * Full MCP Protocol Implementation for LM Studio
 * Jest test execution, coverage analysis, and watch mode
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';

// Testing engine
class TestingEngine {
  constructor() {
    this.watchProcess = null;
  }

  async runTests(options = {}) {
    const {
      path: testPath = '',
      coverage = false,
      verbose = false,
      watch = false,
      updateSnapshots = false
    } = options;

    const args = [];

    if (testPath) args.push(testPath);
    if (coverage) {
      args.push('--coverage');
      args.push('--coverageReporters=json');
      args.push('--coverageReporters=text');
    }
    if (verbose) args.push('--verbose');
    if (watch) args.push('--watch');
    if (updateSnapshots) args.push('--updateSnapshot');

    return new Promise((resolve) => {
      const jest = spawn('npx', ['jest', ...args], {
        cwd: WORKSPACE_ROOT,
        shell: true
      });

      let stdout = '';
      let stderr = '';

      jest.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      jest.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      jest.on('close', (code) => {
        const result = this.parseJestOutput(stdout, stderr);
        resolve({
          success: code === 0,
          exitCode: code,
          ...result
        });
      });
    });
  }

  parseJestOutput(stdout, stderr) {
    const result = {
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      coverage: null,
      failures: [],
      duration: null
    };

    const testMatch = stdout.match(/Tests:\s+(?:(\d+) failed,\s*)?(?:(\d+) skipped,\s*)?(?:(\d+) passed,\s*)?(\d+) total/);
    if (testMatch) {
      result.tests.failed = parseInt(testMatch[1] || '0');
      result.tests.skipped = parseInt(testMatch[2] || '0');
      result.tests.passed = parseInt(testMatch[3] || '0');
      result.tests.total = parseInt(testMatch[4] || '0');
    }

    const coverageMatch = stdout.match(/All files\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      result.coverage = {
        statements: parseFloat(coverageMatch[1]),
        branches: parseFloat(coverageMatch[2]),
        functions: parseFloat(coverageMatch[3]),
        lines: parseFloat(coverageMatch[4])
      };
    }

    const durationMatch = stdout.match(/Time:\s+([\d.]+)\s*s/);
    if (durationMatch) {
      result.duration = parseFloat(durationMatch[1]);
    }

    return result;
  }

  async getCoverageReport() {
    try {
      const coveragePath = path.join(WORKSPACE_ROOT, 'coverage', 'coverage-summary.json');
      const coverageData = await fs.readFile(coveragePath, 'utf8');
      const coverageJson = JSON.parse(coverageData);

      return {
        success: true,
        total: coverageJson.total,
        summary: {
          statements: coverageJson.total.statements.pct,
          branches: coverageJson.total.branches.pct,
          functions: coverageJson.total.functions.pct,
          lines: coverageJson.total.lines.pct
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Coverage report not found. Run tests with coverage first.'
      };
    }
  }
}

const testEngine = new TestingEngine();

const server = new Server(
  {
    name: "clientforge-testing",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "run_tests",
        description: "Run Jest tests with optional filters and coverage",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Test file or directory path"
            },
            coverage: {
              type: "boolean",
              description: "Generate coverage report"
            },
            verbose: {
              type: "boolean",
              description: "Verbose output"
            }
          }
        }
      },
      {
        name: "run_single_file",
        description: "Run tests for a single file",
        inputSchema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description: "Test file path"
            }
          },
          required: ["file"]
        }
      },
      {
        name: "run_with_coverage",
        description: "Run all tests with coverage analysis",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "get_coverage_report",
        description: "Get the latest coverage report",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "update_snapshots",
        description: "Update Jest snapshots",
        inputSchema: {
          type: "object",
          properties: {}
        }
      }
    ]
  };
});

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case "run_tests":
        result = await testEngine.runTests(args);
        break;

      case "run_single_file":
        result = await testEngine.runTests({ path: args.file, verbose: true });
        break;

      case "run_with_coverage":
        result = await testEngine.runTests({ coverage: true });
        break;

      case "get_coverage_report":
        result = await testEngine.getCoverageReport();
        break;

      case "update_snapshots":
        result = await testEngine.runTests({ updateSnapshots: true });
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[ClientForge Testing] MCP Server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
