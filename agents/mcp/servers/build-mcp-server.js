#!/usr/bin/env node

/**
 * ClientForge Build MCP Server
 * Full MCP Protocol Implementation for LM Studio
 * Build orchestration, CI gate, type checking, and linting
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

// Build engine
class BuildEngine {
  async execCommand(command, args = []) {
    return new Promise((resolve) => {
      const proc = spawn(command, args, {
        cwd: WORKSPACE_ROOT,
        shell: true
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          exitCode: code,
          stdout,
          stderr,
          success: code === 0
        });
      });
    });
  }

  async typeCheck() {
    const result = await this.execCommand('npx', ['tsc', '--noEmit']);

    const errors = [];
    const errorLines = result.stderr.split('\n').filter(line =>
      line.includes(': error TS')
    );

    for (const line of errorLines.slice(0, 10)) {
      const match = line.match(/(.+)\((\d+),(\d+)\): error (TS\d+): (.+)/);
      if (match) {
        errors.push({
          file: match[1],
          line: parseInt(match[2]),
          column: parseInt(match[3]),
          code: match[4],
          message: match[5]
        });
      }
    }

    return {
      success: result.success,
      errors,
      errorCount: errorLines.length
    };
  }

  async lint() {
    const result = await this.execCommand('npx', ['eslint', '.', '--ext', '.ts,.tsx,.js,.jsx']);

    const warnings = (result.stdout.match(/warning/g) || []).length;
    const errors = (result.stdout.match(/error/g) || []).length;

    return {
      success: result.success,
      warnings,
      errors,
      output: result.stdout.substring(0, 1000)
    };
  }

  async build() {
    const result = await this.execCommand('npm', ['run', 'build']);

    return {
      success: result.success,
      output: result.stdout.substring(0, 500),
      errors: result.stderr.substring(0, 500)
    };
  }

  async runCIGate() {
    const results = {
      typeCheck: null,
      lint: null,
      build: null,
      overall: {
        success: false,
        passed: 0,
        failed: 0
      }
    };

    results.typeCheck = await this.typeCheck();
    if (results.typeCheck.success) results.overall.passed++;
    else results.overall.failed++;

    results.lint = await this.lint();
    if (results.lint.success) results.overall.passed++;
    else results.overall.failed++;

    results.build = await this.build();
    if (results.build.success) results.overall.passed++;
    else results.overall.failed++;

    results.overall.success = results.overall.failed === 0;

    return {
      success: results.overall.success,
      results,
      verificationCode: results.overall.success ? 'CI-GATE-PASSED' : 'CI-GATE-FAILED'
    };
  }

  async startDevBackend() {
    const result = await this.execCommand('npm', ['run', 'dev:backend']);

    return {
      success: true,
      message: 'Backend server started',
      port: 3000,
      output: result.stdout.substring(0, 500)
    };
  }

  async startDevFrontend() {
    const result = await this.execCommand('npm', ['run', 'dev:frontend']);

    return {
      success: true,
      message: 'Frontend server started',
      port: 3001,
      output: result.stdout.substring(0, 500)
    };
  }

  async startBothServers() {
    // Start backend
    const backendResult = await this.execCommand('start', ['cmd', '/k', 'npm', 'run', 'dev:backend']);

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Start frontend
    const frontendResult = await this.execCommand('start', ['cmd', '/k', 'npm', 'run', 'dev:frontend']);

    return {
      success: true,
      message: 'Both servers started in separate windows',
      backend: { port: 3000, status: 'started' },
      frontend: { port: 3001, status: 'started' }
    };
  }

  async getBuildInfo() {
    try {
      const packageJson = await fs.readFile(path.join(WORKSPACE_ROOT, 'package.json'), 'utf8');
      const pkg = JSON.parse(packageJson);

      return {
        success: true,
        name: pkg.name,
        version: pkg.version,
        scripts: Object.keys(pkg.scripts || {}),
        dependencies: Object.keys(pkg.dependencies || {}).length,
        devDependencies: Object.keys(pkg.devDependencies || {}).length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const buildEngine = new BuildEngine();

const server = new Server(
  {
    name: "clientforge-build",
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
        name: "type_check",
        description: "Run TypeScript type checking",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "lint",
        description: "Run ESLint on codebase",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "build",
        description: "Build the project",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "run_ci_gate",
        description: "Run complete CI gate (type check, lint, build)",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "get_build_info",
        description: "Get build information from package.json",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "start_dev_backend",
        description: "Start ClientForge backend development server (port 3000)",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "start_dev_frontend",
        description: "Start ClientForge frontend development server (port 3001)",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "start_both_servers",
        description: "Start both backend and frontend development servers in separate windows",
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
  const { name } = request.params;

  try {
    let result;

    switch (name) {
      case "type_check":
        result = await buildEngine.typeCheck();
        break;

      case "lint":
        result = await buildEngine.lint();
        break;

      case "build":
        result = await buildEngine.build();
        break;

      case "run_ci_gate":
        result = await buildEngine.runCIGate();
        break;

      case "get_build_info":
        result = await buildEngine.getBuildInfo();
        break;

      case "start_dev_backend":
        result = await buildEngine.startDevBackend();
        break;

      case "start_dev_frontend":
        result = await buildEngine.startDevFrontend();
        break;

      case "start_both_servers":
        result = await buildEngine.startBothServers();
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
  console.error("[ClientForge Build] MCP Server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
