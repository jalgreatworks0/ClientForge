#!/usr/bin/env node

/**
 * ClientForge Filesystem MCP Server (MCP Protocol Compliant)
 * Implements full MCP specification with initialize, tools/list, tools/call
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';
const STAGING_ROOT = process.env.STAGING_ROOT || path.join(WORKSPACE_ROOT, '_staging');

class FilesystemMCPServer {
  constructor() {
    this.protocolVersion = "0.1.0";
    this.serverInfo = {
      name: "clientforge-filesystem",
      version: "1.0.0"
    };
  }

  // MCP Protocol: Initialize
  async initialize(params) {
    console.error('[Filesystem MCP] Initialize called');
    return {
      protocolVersion: this.protocolVersion,
      capabilities: {
        tools: {}
      },
      serverInfo: this.serverInfo
    };
  }

  // MCP Protocol: List Tools
  async listTools() {
    console.error('[Filesystem MCP] Tools list requested');
    return {
      tools: [
        {
          name: "read_file",
          description: "Read a file from the workspace. Use relative path from D:\\clientforge-crm",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Relative path from workspace root (e.g., 'backend/server.js')"
              }
            },
            required: ["path"]
          }
        },
        {
          name: "write_file",
          description: "Write content to a file in the workspace",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Relative path from workspace root"
              },
              content: {
                type: "string",
                description: "File content to write"
              }
            },
            required: ["path", "content"]
          }
        },
        {
          name: "list_directory",
          description: "List files in a directory",
          inputSchema: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description: "Relative path from workspace root (default: '.')"
              }
            }
          }
        },
        {
          name: "search_files",
          description: "Search for files matching a pattern (uses glob)",
          inputSchema: {
            type: "object",
            properties: {
              pattern: {
                type: "string",
                description: "Glob pattern (e.g., '**/*.ts', 'backend/**/*.js')"
              }
            },
            required: ["pattern"]
          }
        },
        {
          name: "workspace_tree",
          description: "Get directory tree structure of the workspace",
          inputSchema: {
            type: "object",
            properties: {
              maxDepth: {
                type: "number",
                description: "Maximum depth to traverse (default: 3)"
              }
            }
          }
        }
      ]
    };
  }

  // MCP Protocol: Call Tool
  async callTool(name, args) {
    console.error(`[Filesystem MCP] Tool called: ${name}`);

    switch (name) {
      case "read_file":
        return await this.readFile(args.path);
      case "write_file":
        return await this.writeFile(args.path, args.content);
      case "list_directory":
        return await this.listDirectory(args.path || '.');
      case "search_files":
        return await this.searchFiles(args.pattern);
      case "workspace_tree":
        return await this.getWorkspaceTree(args.maxDepth || 3);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  // Tool Implementations
  async readFile(relativePath) {
    const fullPath = path.join(WORKSPACE_ROOT, relativePath);

    // Security check
    if (!fullPath.startsWith(WORKSPACE_ROOT)) {
      throw new Error('Access denied: Path outside workspace');
    }

    try {
      const content = await fs.readFile(fullPath, 'utf8');
      return {
        content: [
          {
            type: "text",
            text: `File: ${relativePath}\n\n${content}`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error reading file: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async writeFile(relativePath, content) {
    const fullPath = path.join(WORKSPACE_ROOT, relativePath);

    if (!fullPath.startsWith(WORKSPACE_ROOT)) {
      throw new Error('Access denied: Path outside workspace');
    }

    try {
      // Create directory if needed
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');

      return {
        content: [
          {
            type: "text",
            text: `✓ File written successfully: ${relativePath}\n${Buffer.byteLength(content, 'utf8')} bytes`
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error writing file: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async listDirectory(relativePath) {
    const fullPath = path.join(WORKSPACE_ROOT, relativePath);

    if (!fullPath.startsWith(WORKSPACE_ROOT)) {
      throw new Error('Access denied: Path outside workspace');
    }

    try {
      const entries = await fs.readdir(fullPath, { withFileTypes: true });
      const files = [];
      const dirs = [];

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;
        if (entry.name === 'node_modules') continue;

        if (entry.isDirectory()) {
          dirs.push(entry.name + '/');
        } else {
          const stats = await fs.stat(path.join(fullPath, entry.name));
          files.push(`${entry.name} (${stats.size} bytes)`);
        }
      }

      const output = [
        `Directory: ${relativePath}`,
        '',
        'Directories:',
        ...dirs.map(d => `  📁 ${d}`),
        '',
        'Files:',
        ...files.map(f => `  📄 ${f}`)
      ].join('\n');

      return {
        content: [
          {
            type: "text",
            text: output
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error listing directory: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async searchFiles(pattern) {
    try {
      const files = await glob(pattern, {
        cwd: WORKSPACE_ROOT,
        ignore: ['**/node_modules/**', '**/dist/**', '**/.git/**', '**/coverage/**']
      });

      const output = [
        `Search results for: ${pattern}`,
        `Found ${files.length} files:`,
        '',
        ...files.slice(0, 50).map(f => `  ${f}`)
      ];

      if (files.length > 50) {
        output.push('', `... and ${files.length - 50} more`);
      }

      return {
        content: [
          {
            type: "text",
            text: output.join('\n')
          }
        ]
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error searching files: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  async getWorkspaceTree(maxDepth) {
    const tree = [];

    async function buildTree(dir, depth, prefix = '') {
      if (depth > maxDepth) return;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const [index, entry] of entries.entries()) {
          if (entry.name.startsWith('.')) continue;
          if (entry.name === 'node_modules') continue;

          const isLast = index === entries.length - 1;
          const connector = isLast ? '└─' : '├─';
          const extension = isLast ? '  ' : '│ ';

          tree.push(`${prefix}${connector} ${entry.name}${entry.isDirectory() ? '/' : ''}`);

          if (entry.isDirectory()) {
            await buildTree(
              path.join(dir, entry.name),
              depth + 1,
              prefix + extension
            );
          }
        }
      } catch (error) {
        // Skip directories we can't read
      }
    }

    await buildTree(WORKSPACE_ROOT, 0);

    return {
      content: [
        {
          type: "text",
          text: `Workspace Tree:\n${tree.join('\n')}`
        }
      ]
    };
  }

  // Main handler
  async handleRequest(request) {
    const { id, method, params } = request;

    try {
      let result;

      switch (method) {
        case "initialize":
          result = await this.initialize(params);
          break;

        case "tools/list":
          result = await this.listTools();
          break;

        case "tools/call":
          result = await this.callTool(params.name, params.arguments || {});
          break;

        default:
          throw new Error(`Unknown method: ${method}`);
      }

      return {
        jsonrpc: "2.0",
        id,
        result
      };
    } catch (error) {
      console.error(`[Filesystem MCP] Error:`, error);
      return {
        jsonrpc: "2.0",
        id: id || null,
        error: {
          code: -32603,
          message: error.message
        }
      };
    }
  }
}

// Start server
const server = new FilesystemMCPServer();
console.error('[Filesystem MCP] Server starting...');

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    const response = await server.handleRequest(request);
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (error) {
    console.error('[Filesystem MCP] Parse error:', error);
    process.stdout.write(JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: "Parse error"
      }
    }) + '\n');
  }
});

console.error('[Filesystem MCP] Server ready');
