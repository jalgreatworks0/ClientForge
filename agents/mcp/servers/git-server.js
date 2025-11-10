#!/usr/bin/env node

/**
 * ClientForge Git MCP Server
 * Git operations, history tracking, and branch management
 */

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const GIT_REPO = process.env.GIT_REPO || 'D:\\clientforge-crm';

class ClientForgeGit {
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

  async commit(message, options = {}) {
    const { addAll = true, amend = false } = options;

    try {
      // Add files if requested
      if (addAll) {
        await this.execGit(['add', '.']);
      }

      // Commit
      const args = ['commit', '-m', message];
      if (amend) {
        args.push('--amend');
      }

      await this.execGit(args);

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

  async log(options = {}) {
    const { limit = 10, since = null, author = null } = options;

    try {
      const args = [
        'log',
        `--max-count=${limit}`,
        '--pretty=format:%H|%an|%ae|%ad|%s',
        '--date=iso'
      ];

      if (since) {
        args.push(`--since="${since}"`);
      }

      if (author) {
        args.push(`--author="${author}"`);
      }

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

      if (staged) {
        args.push('--staged');
      }

      if (file) {
        args.push('--', file);
      }

      const output = await this.execGit(args);

      // Parse diff stats
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
    const { action = 'list', name = null, from = null } = options;

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

          const args = ['branch', name];
          if (from) {
            args.push(from);
          }

          await this.execGit(args);

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

        case 'delete': {
          if (!name) {
            return { success: false, error: 'Branch name required' };
          }

          await this.execGit(['branch', '-d', name]);

          return {
            success: true,
            message: `Branch '${name}' deleted`,
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

  async push(options = {}) {
    const { remote = 'origin', branch = null, force = false } = options;

    try {
      const args = ['push', remote];

      if (branch) {
        args.push(branch);
      }

      if (force) {
        args.push('--force');
      }

      await this.execGit(args);

      return {
        success: true,
        message: 'Pushed successfully',
        remote,
        branch
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async pull(options = {}) {
    const { remote = 'origin', branch = null } = options;

    try {
      const args = ['pull', remote];

      if (branch) {
        args.push(branch);
      }

      await this.execGit(args);

      return {
        success: true,
        message: 'Pulled successfully',
        remote,
        branch
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async blame(file, options = {}) {
    const { lineStart = null, lineEnd = null } = options;

    try {
      const args = ['blame', '--line-porcelain'];

      if (lineStart && lineEnd) {
        args.push(`-L${lineStart},${lineEnd}`);
      }

      args.push(file);

      const output = await this.execGit(args);

      // Parse blame output (simplified)
      const lines = output.split('\n');
      const blameInfo = [];
      let currentCommit = null;

      for (const line of lines) {
        if (line.match(/^[0-9a-f]{40}/)) {
          currentCommit = line.split(' ')[0].substring(0, 8);
        } else if (line.startsWith('author ')) {
          const author = line.substring(7);
          if (currentCommit) {
            blameInfo.push({ commit: currentCommit, author });
          }
        }
      }

      return {
        success: true,
        file,
        blameInfo: blameInfo.slice(0, 100) // Limit to 100 lines
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async stash(action = 'save', message = null) {
    try {
      const args = ['stash'];

      if (action === 'save') {
        args.push('push');
        if (message) {
          args.push('-m', message);
        }
      } else if (action === 'pop') {
        args.push('pop');
      } else if (action === 'list') {
        args.push('list');
      } else if (action === 'apply') {
        args.push('apply');
      }

      const output = await this.execGit(args);

      return {
        success: true,
        message: output || 'Stash operation completed',
        action
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// MCP Server Interface
const server = new ClientForgeGit();
console.error('[ClientForge Git MCP] Server started');

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    let response;

    switch (request.method) {
      case 'status':
        response = await server.status();
        break;
      case 'commit':
        response = await server.commit(request.params.message, request.params.options);
        break;
      case 'log':
        response = await server.log(request.params);
        break;
      case 'diff':
        response = await server.diff(request.params);
        break;
      case 'branch':
        response = await server.branch(request.params);
        break;
      case 'push':
        response = await server.push(request.params);
        break;
      case 'pull':
        response = await server.pull(request.params);
        break;
      case 'blame':
        response = await server.blame(request.params.file, request.params.options);
        break;
      case 'stash':
        response = await server.stash(request.params.action, request.params.message);
        break;
      default:
        response = {
          success: false,
          error: `Unknown method: ${request.method}`
        };
    }

    process.stdout.write(JSON.stringify({
      id: request.id,
      result: response
    }) + '\n');
  } catch (error) {
    process.stdout.write(JSON.stringify({
      id: request.id || null,
      error: {
        code: -32603,
        message: error.message
      }
    }) + '\n');
  }
});
