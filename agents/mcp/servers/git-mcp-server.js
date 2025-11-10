#!/usr/bin/env node

/**
 * ClientForge Git MCP Server
 * Full MCP Protocol Implementation for LM Studio
 * Git operations, history tracking, and branch management
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const { spawn } = require('child_process');

const GIT_REPO = process.env.GIT_REPO || 'D:\\clientforge-crm';

// Git operations engine
class GitEngine {
  async execGit(args) {
    return new Promise((resolve, reject) => {
      const git = spawn('git', args, {
        cwd: GIT_REPO,
        shell: true
      });

      let stdout = '';
      let stderr = '';

      git.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      git.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      git.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(stderr || stdout || `Git command failed with code ${code}`));
        }
      });
    });
  }

  async status() {
    try {
      const output = await this.execGit(['status', '--porcelain']);
      const lines = output.split('\n').filter(line => line.trim());

      const files = {
        modified: [],
        added: [],
        deleted: [],
        untracked: [],
        renamed: []
      };

      for (const line of lines) {
        const status = line.substring(0, 2);
        const file = line.substring(3);

        if (status === ' M' || status === 'M ') files.modified.push(file);
        else if (status === 'A ' || status === ' A') files.added.push(file);
        else if (status === 'D ' || status === ' D') files.deleted.push(file);
        else if (status === '??') files.untracked.push(file);
        else if (status === 'R ') files.renamed.push(file);
      }

      const branch = await this.execGit(['branch', '--show-current']);

      return {
        success: true,
        branch: branch,
        files,
        totalChanges: lines.length,
        clean: lines.length === 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async log(options = {}) {
    const { limit = 10, since = null, author = null } = options;

    try {
      const args = [
        'log',
        `--max-count=${limit}`,
        '--pretty=format:%H|%an|%ae|%ad|%s',
        '--date=iso'
      ];

      if (since) args.push(`--since="${since}"`);
      if (author) args.push(`--author="${author}"`);

      const output = await this.execGit(args);
      const lines = output.split('\n');

      const commits = lines.map(line => {
        const [hash, authorName, authorEmail, date, message] = line.split('|');
        return {
          hash: hash.substring(0, 8),
          fullHash: hash,
          author: { name: authorName, email: authorEmail },
          date,
          message
        };
      });

      return {
        success: true,
        commits,
        count: commits.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async diff(options = {}) {
    const { staged = false, file = null } = options;

    try {
      const args = ['diff'];
      if (staged) args.push('--staged');
      if (file) args.push('--', file);

      const output = await this.execGit(args);
      const statsOutput = await this.execGit([...args, '--stat']);

      return {
        success: true,
        diff: output,
        stats: statsOutput,
        hasChanges: output.length > 0
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async branch(options = {}) {
    const { action = 'list', name = null } = options;

    try {
      switch (action) {
        case 'list': {
          const output = await this.execGit(['branch', '-a']);
          const branches = output.split('\n')
            .map(b => b.trim())
            .filter(b => b.length > 0)
            .map(b => ({
              name: b.replace(/^\*\s+/, ''),
              current: b.startsWith('*')
            }));

          return {
            success: true,
            branches,
            count: branches.length
          };
        }

        case 'create': {
          if (!name) {
            return { success: false, error: 'Branch name required' };
          }
          await this.execGit(['branch', name]);
          return {
            success: true,
            message: `Branch '${name}' created`,
            branch: name
          };
        }

        case 'switch': {
          if (!name) {
            return { success: false, error: 'Branch name required' };
          }
          await this.execGit(['checkout', name]);
          return {
            success: true,
            message: `Switched to branch '${name}'`,
            branch: name
          };
        }

        default:
          return {
            success: false,
            error: `Unknown branch action: ${action}`
          };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async commit(message, addAll = true) {
    try {
      if (addAll) {
        await this.execGit(['add', '.']);
      }

      await this.execGit(['commit', '-m', message]);

      return {
        success: true,
        message: 'Commit created successfully',
        commitMessage: message
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const gitEngine = new GitEngine();

const server = new Server(
  {
    name: "clientforge-git",
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
        name: "git_status",
        description: "Get git status of repository",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "git_log",
        description: "Get git commit history",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of commits to show (default 10)"
            },
            since: {
              type: "string",
              description: "Show commits since date (e.g., '2 weeks ago')"
            },
            author: {
              type: "string",
              description: "Filter by author name"
            }
          }
        }
      },
      {
        name: "git_diff",
        description: "Get git diff",
        inputSchema: {
          type: "object",
          properties: {
            staged: {
              type: "boolean",
              description: "Show staged changes"
            },
            file: {
              type: "string",
              description: "Specific file to diff"
            }
          }
        }
      },
      {
        name: "git_branch",
        description: "Manage git branches (list, create, switch)",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              description: "Action: list, create, switch",
              enum: ["list", "create", "switch"]
            },
            name: {
              type: "string",
              description: "Branch name (for create/switch)"
            }
          }
        }
      },
      {
        name: "git_commit",
        description: "Create a git commit",
        inputSchema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Commit message"
            },
            addAll: {
              type: "boolean",
              description: "Add all changes (default true)"
            }
          },
          required: ["message"]
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
      case "git_status":
        result = await gitEngine.status();
        break;

      case "git_log":
        result = await gitEngine.log(args);
        break;

      case "git_diff":
        result = await gitEngine.diff(args);
        break;

      case "git_branch":
        result = await gitEngine.branch(args);
        break;

      case "git_commit":
        result = await gitEngine.commit(args.message, args.addAll !== false);
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
  console.error("[ClientForge Git] MCP Server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
