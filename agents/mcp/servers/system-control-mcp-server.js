#!/usr/bin/env node

/**
 * System Control MCP Server - Full PC Access
 * Gives Elaria complete access to entire system:
 * - All drives (C:, D:, E:, etc.)
 * - Read/write anywhere
 * - Execute code and commands
 * - System navigation
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const fs = require('fs').promises;
const { exec, spawn } = require('child_process');
const path = require('path');
const { glob } = require('glob');
const os = require('os');

const server = new Server(
  {
    name: "system-control",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Helper to execute commands
function execCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    exec(command, { ...options, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
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

// Tool definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // FILE SYSTEM OPERATIONS
      {
        name: "read_file_anywhere",
        description: "Read any file from any location on the PC (supports all drives: C:, D:, E:, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Absolute path to file (e.g., C:/Users/file.txt, D:/Projects/code.js)"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "write_file_anywhere",
        description: "Write/create file anywhere on the PC",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Absolute path where to write file"
            },
            content: {
              type: "string",
              description: "Content to write"
            }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "list_directory_anywhere",
        description: "List contents of any directory on any drive",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Absolute path to directory (e.g., C:/Users, D:/ScrollForge)",
              default: "C:/"
            }
          }
        }
      },
      {
        name: "list_drives",
        description: "List all available drives on the PC (C:, D:, E:, etc.)",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "create_directory_anywhere",
        description: "Create directory anywhere on the PC",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Absolute path for new directory"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "delete_file_anywhere",
        description: "Delete file from anywhere (use with caution!)",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Absolute path to file to delete"
            }
          },
          required: ["path"]
        }
      },
      {
        name: "search_files_anywhere",
        description: "Search for files anywhere using glob patterns",
        inputSchema: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description: "Glob pattern (e.g., **/*.js, D:/Projects/**/*.py)"
            },
            directory: {
              type: "string",
              description: "Starting directory for search",
              default: "C:/"
            }
          },
          required: ["pattern"]
        }
      },

      // CODE EXECUTION
      {
        name: "execute_javascript",
        description: "Execute JavaScript code using Node.js",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "JavaScript code to execute"
            },
            workingDirectory: {
              type: "string",
              description: "Working directory for execution",
              default: process.cwd()
            }
          },
          required: ["code"]
        }
      },
      {
        name: "execute_python",
        description: "Execute Python code",
        inputSchema: {
          type: "object",
          properties: {
            code: {
              type: "string",
              description: "Python code to execute"
            },
            workingDirectory: {
              type: "string",
              description: "Working directory for execution"
            }
          },
          required: ["code"]
        }
      },
      {
        name: "execute_powershell",
        description: "Execute PowerShell script",
        inputSchema: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "PowerShell script to execute"
            },
            workingDirectory: {
              type: "string",
              description: "Working directory for execution"
            }
          },
          required: ["script"]
        }
      },
      {
        name: "execute_command",
        description: "Execute any system command (cmd, programs, batch files, etc.)",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "Command to execute"
            },
            workingDirectory: {
              type: "string",
              description: "Working directory for command"
            }
          },
          required: ["command"]
        }
      },

      // SYSTEM INFORMATION
      {
        name: "get_system_info",
        description: "Get system information (OS, drives, memory, etc.)",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "get_environment_variables",
        description: "Get system environment variables",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "navigate_to",
        description: "Change working directory context",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "Directory to navigate to"
            }
          },
          required: ["path"]
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
      // FILE OPERATIONS
      case "read_file_anywhere":
        try {
          const content = await fs.readFile(args.path, 'utf-8');
          result = {
            success: true,
            content: content.slice(0, 100000), // Limit to 100KB
            path: args.path,
            size: content.length
          };
        } catch (error) {
          result = { success: false, error: error.message };
        }
        break;

      case "write_file_anywhere":
        try {
          // Ensure directory exists
          await fs.mkdir(path.dirname(args.path), { recursive: true });
          await fs.writeFile(args.path, args.content, 'utf-8');
          result = {
            success: true,
            message: `File written successfully`,
            path: args.path,
            size: args.content.length
          };
        } catch (error) {
          result = { success: false, error: error.message };
        }
        break;

      case "list_directory_anywhere":
        try {
          const items = await fs.readdir(args.path || 'C:/', { withFileTypes: true });
          result = {
            success: true,
            path: args.path || 'C:/',
            items: items.slice(0, 200).map(item => ({
              name: item.name,
              type: item.isDirectory() ? 'directory' : 'file',
              isFile: item.isFile(),
              isDirectory: item.isDirectory()
            })),
            count: items.length
          };
        } catch (error) {
          result = { success: false, error: error.message };
        }
        break;

      case "list_drives":
        try {
          const drives = [];
          for (let letter of 'CDEFGHIJKLMNOPQRSTUVWXYZ') {
            try {
              await fs.access(`${letter}:/`);
              drives.push(`${letter}:/`);
            } catch (e) {
              // Drive doesn't exist, skip
            }
          }
          result = {
            success: true,
            drives,
            count: drives.length
          };
        } catch (error) {
          result = { success: false, error: error.message };
        }
        break;

      case "create_directory_anywhere":
        try {
          await fs.mkdir(args.path, { recursive: true });
          result = {
            success: true,
            message: `Directory created`,
            path: args.path
          };
        } catch (error) {
          result = { success: false, error: error.message };
        }
        break;

      case "delete_file_anywhere":
        try {
          await fs.unlink(args.path);
          result = {
            success: true,
            message: `File deleted`,
            path: args.path
          };
        } catch (error) {
          result = { success: false, error: error.message };
        }
        break;

      case "search_files_anywhere":
        try {
          const files = await glob(args.pattern, {
            cwd: args.directory || 'C:/',
            nodir: true,
            ignore: ['**/node_modules/**', '**/.git/**'],
            windowsPathsNoEscape: true
          });
          result = {
            success: true,
            files: files.slice(0, 100),
            count: files.length,
            pattern: args.pattern
          };
        } catch (error) {
          result = { success: false, error: error.message };
        }
        break;

      // CODE EXECUTION
      case "execute_javascript":
        try {
          const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.js`);
          await fs.writeFile(tempFile, args.code);
          const execResult = await execCommand(`node "${tempFile}"`, {
            cwd: args.workingDirectory || process.cwd()
          });
          await fs.unlink(tempFile);
          result = execResult;
        } catch (error) {
          result = { success: false, error: error.message };
        }
        break;

      case "execute_python":
        try {
          const tempFile = path.join(os.tmpdir(), `temp_${Date.now()}.py`);
          await fs.writeFile(tempFile, args.code);
          const execResult = await execCommand(`python "${tempFile}"`, {
            cwd: args.workingDirectory || process.cwd()
          });
          await fs.unlink(tempFile);
          result = execResult;
        } catch (error) {
          result = { success: false, error: error.message };
        }
        break;

      case "execute_powershell":
        try {
          const execResult = await execCommand(`powershell -Command "${args.script.replace(/"/g, '\\"')}"`, {
            cwd: args.workingDirectory || process.cwd()
          });
          result = execResult;
        } catch (error) {
          result = { success: false, error: error.message };
        }
        break;

      case "execute_command":
        try {
          const execResult = await execCommand(args.command, {
            cwd: args.workingDirectory || process.cwd()
          });
          result = execResult;
        } catch (error) {
          result = { success: false, error: error.message };
        }
        break;

      // SYSTEM INFO
      case "get_system_info":
        result = {
          success: true,
          system: {
            platform: os.platform(),
            arch: os.arch(),
            hostname: os.hostname(),
            totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
            freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
            cpus: os.cpus().length,
            homeDir: os.homedir(),
            tmpDir: os.tmpdir(),
            currentUser: os.userInfo().username
          }
        };
        break;

      case "get_environment_variables":
        result = {
          success: true,
          variables: process.env
        };
        break;

      case "navigate_to":
        try {
          process.chdir(args.path);
          result = {
            success: true,
            message: `Changed directory to ${args.path}`,
            currentDirectory: process.cwd()
          };
        } catch (error) {
          result = { success: false, error: error.message };
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
  console.error('[System Control MCP Server] Started - Full PC access enabled');
}

main().catch((error) => {
  console.error('[System Control MCP Server] Fatal error:', error);
  process.exit(1);
});
