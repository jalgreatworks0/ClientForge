#!/usr/bin/env node

/**
 * ClientForge Orchestrator MCP Server
 * Full MCP Protocol Implementation for LM Studio
 * Multi-agent coordination and task routing
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

// Orchestrator engine (simplified version)
class OrchestratorEngine {
  constructor() {
    this.agents = new Map();
    this.tasks = new Map();
    this.taskIdCounter = 0;

    // Initialize agents
    this.initializeAgents();
  }

  initializeAgents() {
    // Define available agents
    const agentConfigs = [
      {
        id: 'filesystem',
        name: 'Filesystem Agent',
        capabilities: ['file_read', 'file_write', 'file_search'],
        status: 'idle'
      },
      {
        id: 'codebase',
        name: 'Codebase Agent',
        capabilities: ['code_analysis', 'dependency_graph', 'find_definition'],
        status: 'idle'
      },
      {
        id: 'testing',
        name: 'Testing Agent',
        capabilities: ['run_tests', 'coverage', 'test_watch'],
        status: 'idle'
      },
      {
        id: 'git',
        name: 'Git Agent',
        capabilities: ['git_status', 'git_commit', 'git_diff', 'git_branch'],
        status: 'idle'
      },
      {
        id: 'documentation',
        name: 'Documentation Agent',
        capabilities: ['generate_docs', 'update_readme', 'jsdoc'],
        status: 'idle'
      },
      {
        id: 'build',
        name: 'Build Agent',
        capabilities: ['type_check', 'lint', 'build', 'ci_gate'],
        status: 'idle'
      },
      {
        id: 'security',
        name: 'Security Agent',
        capabilities: ['scan_file', 'scan_workspace', 'audit_dependencies'],
        status: 'idle'
      }
    ];

    agentConfigs.forEach(agent => {
      this.agents.set(agent.id, agent);
    });
  }

  async listAgents() {
    const agentList = Array.from(this.agents.values()).map(agent => ({
      id: agent.id,
      name: agent.name,
      capabilities: agent.capabilities,
      status: agent.status
    }));

    return {
      success: true,
      agents: agentList,
      count: agentList.length
    };
  }

  async routeTask(objective, requiredCapabilities = []) {
    // Find the best agent for the task
    let selectedAgent = null;

    for (const [agentId, agent] of this.agents.entries()) {
      if (agent.status === 'idle') {
        // Check if agent has required capabilities
        const hasCapabilities = requiredCapabilities.length === 0 ||
          requiredCapabilities.some(cap => agent.capabilities.includes(cap));

        if (hasCapabilities) {
          selectedAgent = agent;
          break;
        }
      }
    }

    if (!selectedAgent) {
      // Try to find any agent with the capabilities (even if busy)
      for (const [agentId, agent] of this.agents.entries()) {
        const hasCapabilities = requiredCapabilities.length === 0 ||
          requiredCapabilities.some(cap => agent.capabilities.includes(cap));

        if (hasCapabilities) {
          selectedAgent = agent;
          break;
        }
      }
    }

    if (!selectedAgent) {
      return {
        success: false,
        error: 'No suitable agent found for task',
        requiredCapabilities
      };
    }

    // Create task
    const taskId = `task_${this.taskIdCounter++}`;
    const task = {
      taskId,
      objective,
      assignedAgent: selectedAgent.id,
      status: 'queued',
      createdAt: new Date().toISOString()
    };

    this.tasks.set(taskId, task);
    selectedAgent.status = 'busy';

    return {
      success: true,
      taskId,
      assignedAgent: selectedAgent.name,
      agentId: selectedAgent.id,
      message: `Task routed to ${selectedAgent.name}`
    };
  }

  async getTaskStatus(taskId) {
    const task = this.tasks.get(taskId);

    if (!task) {
      return {
        success: false,
        error: `Task ${taskId} not found`
      };
    }

    return {
      success: true,
      task
    };
  }

  async coordinateMultiAgent(objective, subtasks) {
    const results = [];

    for (const subtask of subtasks) {
      const result = await this.routeTask(
        subtask.description,
        subtask.requiredCapabilities || []
      );
      results.push(result);
    }

    return {
      success: true,
      objective,
      subtasks: results,
      totalSubtasks: subtasks.length
    };
  }

  async getSystemStatus() {
    const agentStatus = {};
    let idleCount = 0;
    let busyCount = 0;

    for (const [agentId, agent] of this.agents.entries()) {
      agentStatus[agentId] = agent.status;
      if (agent.status === 'idle') idleCount++;
      else if (agent.status === 'busy') busyCount++;
    }

    return {
      success: true,
      agents: agentStatus,
      summary: {
        total: this.agents.size,
        idle: idleCount,
        busy: busyCount
      },
      activeTasks: this.tasks.size
    };
  }
}

const orchestrator = new OrchestratorEngine();

const server = new Server(
  {
    name: "clientforge-orchestrator",
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
        name: "list_agents",
        description: "List all available agents and their capabilities",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "route_task",
        description: "Route a task to the best available agent",
        inputSchema: {
          type: "object",
          properties: {
            objective: {
              type: "string",
              description: "Task objective"
            },
            requiredCapabilities: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Required agent capabilities"
            }
          },
          required: ["objective"]
        }
      },
      {
        name: "get_task_status",
        description: "Get status of a routed task",
        inputSchema: {
          type: "object",
          properties: {
            taskId: {
              type: "string",
              description: "Task ID"
            }
          },
          required: ["taskId"]
        }
      },
      {
        name: "coordinate_multi_agent",
        description: "Coordinate multiple agents for complex tasks",
        inputSchema: {
          type: "object",
          properties: {
            objective: {
              type: "string",
              description: "Overall objective"
            },
            subtasks: {
              type: "array",
              items: {
                type: "object"
              },
              description: "Array of subtasks to coordinate"
            }
          },
          required: ["objective", "subtasks"]
        }
      },
      {
        name: "get_system_status",
        description: "Get overall orchestrator system status",
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
      case "list_agents":
        result = await orchestrator.listAgents();
        break;

      case "route_task":
        result = await orchestrator.routeTask(args.objective, args.requiredCapabilities || []);
        break;

      case "get_task_status":
        result = await orchestrator.getTaskStatus(args.taskId);
        break;

      case "coordinate_multi_agent":
        result = await orchestrator.coordinateMultiAgent(args.objective, args.subtasks);
        break;

      case "get_system_status":
        result = await orchestrator.getSystemStatus();
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
  console.error("[ClientForge Orchestrator] MCP Server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
