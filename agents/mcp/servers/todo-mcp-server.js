#!/usr/bin/env node

/**
 * Todo MCP Server
 * Allows AI agents (like Elaria) to track tasks across context resets
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const fs = require('fs');
const path = require('path');

const server = new Server(
  {
    name: "todo-tracker",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Todo storage file
const TODO_FILE = path.join(process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm', '.elaria-todos.json');

// Helper to read todos
function readTodos() {
  try {
    if (fs.existsSync(TODO_FILE)) {
      const data = fs.readFileSync(TODO_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[Todo MCP] Error reading todos:', error.message);
  }
  return { todos: [], sessionId: Date.now() };
}

// Helper to write todos
function writeTodos(data) {
  try {
    fs.writeFileSync(TODO_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('[Todo MCP] Error writing todos:', error.message);
    return false;
  }
}

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add_todo",
        description: "Add a new todo item to track a task",
        inputSchema: {
          type: "object",
          properties: {
            task: {
              type: "string",
              description: "Description of the task to do"
            },
            priority: {
              type: "string",
              enum: ["low", "medium", "high"],
              description: "Priority level (default: medium)"
            }
          },
          required: ["task"]
        }
      },
      {
        name: "complete_todo",
        description: "Mark a todo item as completed",
        inputSchema: {
          type: "object",
          properties: {
            id: {
              type: "number",
              description: "ID of the todo to mark as completed"
            }
          },
          required: ["id"]
        }
      },
      {
        name: "list_todos",
        description: "List all current todos (pending and completed)",
        inputSchema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["all", "pending", "completed"],
              description: "Filter by status (default: all)"
            }
          }
        }
      },
      {
        name: "clear_completed_todos",
        description: "Remove all completed todos from the list",
        inputSchema: {
          type: "object",
          properties: {},
          required: []
        }
      },
      {
        name: "get_session_summary",
        description: "Get a summary of current session progress",
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
  const { name, arguments: args } = request.params;

  try {
    let result;
    const data = readTodos();

    switch (name) {
      case "add_todo":
        const newTodo = {
          id: data.todos.length + 1,
          task: args.task,
          priority: args.priority || 'medium',
          status: 'pending',
          createdAt: new Date().toISOString()
        };
        data.todos.push(newTodo);
        writeTodos(data);
        result = {
          success: true,
          todo: newTodo,
          message: `Added todo #${newTodo.id}: ${newTodo.task}`
        };
        break;

      case "complete_todo":
        const todoIndex = data.todos.findIndex(t => t.id === args.id);
        if (todoIndex === -1) {
          result = {
            success: false,
            error: `Todo #${args.id} not found`
          };
        } else {
          data.todos[todoIndex].status = 'completed';
          data.todos[todoIndex].completedAt = new Date().toISOString();
          writeTodos(data);
          result = {
            success: true,
            todo: data.todos[todoIndex],
            message: `Completed todo #${args.id}`
          };
        }
        break;

      case "list_todos":
        const status = args.status || 'all';
        let filtered = data.todos;

        if (status === 'pending') {
          filtered = data.todos.filter(t => t.status === 'pending');
        } else if (status === 'completed') {
          filtered = data.todos.filter(t => t.status === 'completed');
        }

        result = {
          success: true,
          todos: filtered,
          counts: {
            total: data.todos.length,
            pending: data.todos.filter(t => t.status === 'pending').length,
            completed: data.todos.filter(t => t.status === 'completed').length
          }
        };
        break;

      case "clear_completed_todos":
        const beforeCount = data.todos.length;
        data.todos = data.todos.filter(t => t.status === 'pending');
        writeTodos(data);
        result = {
          success: true,
          removedCount: beforeCount - data.todos.length,
          message: `Removed ${beforeCount - data.todos.length} completed todos`
        };
        break;

      case "get_session_summary":
        const pending = data.todos.filter(t => t.status === 'pending');
        const completed = data.todos.filter(t => t.status === 'completed');

        result = {
          success: true,
          sessionId: data.sessionId,
          summary: {
            totalTasks: data.todos.length,
            pending: pending.length,
            completed: completed.length,
            progress: data.todos.length > 0
              ? Math.round((completed.length / data.todos.length) * 100)
              : 0
          },
          pendingTasks: pending.map(t => ({ id: t.id, task: t.task, priority: t.priority })),
          recentCompletions: completed
            .slice(-5)
            .reverse()
            .map(t => ({ id: t.id, task: t.task, completedAt: t.completedAt }))
        };
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
  console.error('[Todo MCP Server] Started');
}

main().catch((error) => {
  console.error('[Todo MCP Server] Fatal error:', error);
  process.exit(1);
});
