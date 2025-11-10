#!/usr/bin/env node

/**
 * Ollama Fleet MCP Server
 * Specialized tools for managing the 7-agent Ollama swarm
 * Routes tasks, checks status, starts/stops fleet
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { exec } = require('child_process');
const http = require('http');

const server = new Server(
  {
    name: "ollama-fleet",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper to execute commands
function execCommand(command, cwd = 'D:\\clientforge-crm') {
  return new Promise((resolve, reject) => {
    exec(command, { cwd, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          success: false,
          error: error.message,
          stderr: stderr.toString()
        });
      } else {
        resolve({
          success: true,
          stdout: stdout.toString(),
          stderr: stderr.toString()
        });
      }
    });
  });
}

// Helper to check HTTP endpoint
function checkEndpoint(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          success: true,
          statusCode: res.statusCode,
          data: data
        });
      });
    });
    request.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });
    request.setTimeout(5000, () => {
      request.destroy();
      resolve({ success: false, error: 'Timeout' });
    });
  });
}

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "start_ollama_fleet",
        description: "Start the complete Ollama fleet (4 local agents on RTX 4090)",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "stop_ollama_fleet",
        description: "Stop all Ollama agents",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "check_fleet_status",
        description: "Check status of all 4 Ollama agents and MCP router",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "start_mcp_router",
        description: "Start the MCP Router (port 8765) and connect all agents",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "stop_mcp_router",
        description: "Stop the MCP Router and disconnect all agents",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "check_agent_models",
        description: "List all available models in each Ollama agent",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "get_fleet_stats",
        description: "Get comprehensive statistics about the fleet (throughput, cost savings, etc.)",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
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
      case "start_ollama_fleet":
        result = await execCommand('npm run fleet:start');
        break;

      case "stop_ollama_fleet":
        result = await execCommand('npm run fleet:stop');
        break;

      case "start_mcp_router":
        result = await execCommand('npm run mcp:all');
        break;

      case "stop_mcp_router":
        result = await execCommand('npm run mcp:stop');
        break;

      case "check_fleet_status":
        // Check all 4 Ollama agents
        const agents = [
          { name: 'Qwen32B', port: 11434 },
          { name: 'DeepSeek', port: 11435 },
          { name: 'CodeLlama', port: 11436 },
          { name: 'Mistral', port: 11437 }
        ];

        const statuses = await Promise.all(
          agents.map(async (agent) => {
            const check = await checkEndpoint(`http://localhost:${agent.port}/api/tags`);
            return {
              name: agent.name,
              port: agent.port,
              status: check.success ? 'RUNNING' : 'STOPPED',
              error: check.error
            };
          })
        );

        // Check MCP Router
        const routerCheck = await checkEndpoint('http://localhost:8765/stats');

        result = {
          success: true,
          agents: statuses,
          mcpRouter: {
            port: 8765,
            status: routerCheck.success ? 'RUNNING' : 'STOPPED'
          },
          summary: {
            running: statuses.filter(a => a.status === 'RUNNING').length,
            stopped: statuses.filter(a => a.status === 'STOPPED').length,
            total: statuses.length
          }
        };
        break;

      case "check_agent_models":
        const modelChecks = await Promise.all([
          checkEndpoint('http://localhost:11434/api/tags'),
          checkEndpoint('http://localhost:11435/api/tags'),
          checkEndpoint('http://localhost:11436/api/tags'),
          checkEndpoint('http://localhost:11437/api/tags')
        ]);

        result = {
          success: true,
          agents: [
            { name: 'Qwen32B (11434)', models: modelChecks[0].success ? JSON.parse(modelChecks[0].data) : null },
            { name: 'DeepSeek (11435)', models: modelChecks[1].success ? JSON.parse(modelChecks[1].data) : null },
            { name: 'CodeLlama (11436)', models: modelChecks[2].success ? JSON.parse(modelChecks[2].data) : null },
            { name: 'Mistral (11437)', models: modelChecks[3].success ? JSON.parse(modelChecks[3].data) : null }
          ]
        };
        break;

      case "get_fleet_stats":
        const stats = await checkEndpoint('http://localhost:8765/stats');
        if (stats.success) {
          result = {
            success: true,
            stats: JSON.parse(stats.data),
            message: 'Fleet statistics retrieved from MCP Router'
          };
        } else {
          result = {
            success: false,
            error: 'MCP Router not running',
            message: 'Start the router first with start_mcp_router'
          };
        }
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
          text: JSON.stringify({
            success: false,
            error: error.message
          }, null, 2)
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
  console.error('[Ollama Fleet MCP Server] Started');
}

main().catch((error) => {
  console.error('[Ollama Fleet MCP Server] Fatal error:', error);
  process.exit(1);
});
