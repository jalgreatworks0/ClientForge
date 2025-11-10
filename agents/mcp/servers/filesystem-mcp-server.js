#!/usr/bin/env node

/**
 * ClientForge Filesystem MCP Server
 * Full MCP Protocol Implementation for LM Studio
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

// Get workspace from environment or use default
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';
const STAGING_ROOT = process.env.STAGING_ROOT || path.join(WORKSPACE_ROOT, '_staging');

const server = new Server(
  {
    name: "clientforge-filesystem",
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
        name: "read_file",
        description: "Read file contents from workspace",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to file from workspace root"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "write_file",
        description: "Write content to a file in workspace",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to file from workspace root"
            },
            content: {
              type: "string",
              description: "Content to write to file"
            }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "list_directory",
        description: "List contents of a directory",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Relative path to directory",
              default: "."
            }
          }
        }
      },
      {
        name: "search_files",
        description: "Search for files by pattern",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search pattern (glob)"
            }
          },
          required: ["query"]
        }
      }
    ]
  };
});

// Tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "read_file": {
        const filePath = path.join(WORKSPACE_ROOT, args.path);
        const content = await fs.readFile(filePath, 'utf8');
        return {
          content: [
            {
              type: "text",
              text: `File: ${args.path}\n\n${content}`
            }
          ]
        };
      }

      case "write_file": {
        const filePath = path.join(WORKSPACE_ROOT, args.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, args.content, 'utf8');
        return {
          content: [
            {
              type: "text",
              text: `Successfully wrote to ${args.path}`
            }
          ]
        };
      }

      case "list_directory": {
        const dirPath = path.join(WORKSPACE_ROOT, args.path || '.');
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const formatted = entries.map(entry => ({
          name: entry.name,
          type: entry.isDirectory() ? 'directory' : 'file'
        }));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(formatted, null, 2)
            }
          ]
        };
      }

      case "search_files": {
        const pattern = path.join(WORKSPACE_ROOT, args.query);
        const files = await glob(pattern, {
          ignore: ['**/node_modules/**', '**/.next/**', '**/dist/**']
        });
        const relative = files.map(f => path.relative(WORKSPACE_ROOT, f));
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(relative, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
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
  console.error("[ClientForge Filesystem] MCP Server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
