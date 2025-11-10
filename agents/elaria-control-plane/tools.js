/**
 * Tool Executors for Elaria Control Plane
 * These are the actual functions Elaria can call
 */

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { glob } from 'glob';
import simpleGit from 'simple-git';

const execAsync = promisify(exec);

// Default project path
const PROJECT_ROOT = 'D:\\clientforge-crm';

/**
 * FILESYSTEM TOOLS
 */

export async function listFiles({ pattern = '**/*', directory = PROJECT_ROOT }) {
  try {
    const files = await glob(pattern, {
      cwd: directory,
      nodir: true,
      ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
    });

    return {
      success: true,
      files: files.slice(0, 100), // Limit to 100 files
      count: files.length,
      directory
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function readFile({ filePath }) {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    return {
      success: true,
      content: content.slice(0, 50000), // Limit to 50KB
      path: fullPath,
      size: content.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function writeFile({ filePath, content }) {
  try {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);

    // Ensure directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    await fs.writeFile(fullPath, content, 'utf-8');

    return {
      success: true,
      path: fullPath,
      size: content.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function searchFiles({ query, filePattern = '**/*.{js,ts,jsx,tsx}', directory = PROJECT_ROOT }) {
  try {
    const files = await glob(filePattern, {
      cwd: directory,
      nodir: true,
      ignore: ['node_modules/**', '.git/**', 'dist/**']
    });

    const matches = [];

    for (const file of files.slice(0, 50)) {
      const fullPath = path.join(directory, file);
      const content = await fs.readFile(fullPath, 'utf-8');

      if (content.includes(query)) {
        const lines = content.split('\n');
        const matchingLines = lines
          .map((line, index) => ({ line, number: index + 1 }))
          .filter(({ line }) => line.includes(query))
          .slice(0, 5);

        matches.push({
          file,
          matches: matchingLines
        });
      }
    }

    return {
      success: true,
      query,
      matches,
      filesSearched: files.length
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * GIT TOOLS
 */

export async function gitStatus({ directory = PROJECT_ROOT }) {
  try {
    const git = simpleGit(directory);
    const status = await git.status();

    return {
      success: true,
      branch: status.current,
      modified: status.modified,
      created: status.created,
      deleted: status.deleted,
      ahead: status.ahead,
      behind: status.behind
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function gitLog({ limit = 10, directory = PROJECT_ROOT }) {
  try {
    const git = simpleGit(directory);
    const log = await git.log({ maxCount: limit });

    return {
      success: true,
      commits: log.all.map(commit => ({
        hash: commit.hash.substring(0, 7),
        message: commit.message,
        author: commit.author_name,
        date: commit.date
      }))
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function gitDiff({ file = null, directory = PROJECT_ROOT }) {
  try {
    const git = simpleGit(directory);
    const diff = file ? await git.diff([file]) : await git.diff();

    return {
      success: true,
      diff: diff.slice(0, 10000), // Limit to 10KB
      file: file || 'all changes'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * COMMAND EXECUTION TOOLS
 */

export async function runCommand({ command, directory = PROJECT_ROOT }) {
  try {
    // Security: Only allow specific safe commands
    const allowedCommands = ['npm', 'git', 'node', 'tsc', 'jest', 'eslint', 'ls', 'dir'];
    const commandStart = command.split(' ')[0];

    if (!allowedCommands.some(cmd => commandStart.includes(cmd))) {
      return {
        success: false,
        error: `Command '${commandStart}' not allowed. Allowed: ${allowedCommands.join(', ')}`
      };
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: directory,
      timeout: 30000 // 30 second timeout
    });

    return {
      success: true,
      stdout: stdout.slice(0, 5000),
      stderr: stderr.slice(0, 1000),
      command
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout?.slice(0, 5000),
      stderr: error.stderr?.slice(0, 1000)
    };
  }
}

/**
 * PROJECT ANALYSIS TOOLS
 */

export async function analyzeProject({ directory = PROJECT_ROOT }) {
  try {
    // Count files by type
    const allFiles = await glob('**/*', {
      cwd: directory,
      nodir: true,
      ignore: ['node_modules/**', '.git/**', 'dist/**']
    });

    const filesByType = {};
    allFiles.forEach(file => {
      const ext = path.extname(file) || 'no-extension';
      filesByType[ext] = (filesByType[ext] || 0) + 1;
    });

    // Get git info
    const git = simpleGit(directory);
    const status = await git.status();
    const log = await git.log({ maxCount: 1 });

    // Check for package.json
    let packageInfo = null;
    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(directory, 'package.json'), 'utf-8')
      );
      packageInfo = {
        name: packageJson.name,
        version: packageJson.version,
        dependencies: Object.keys(packageJson.dependencies || {}).length,
        devDependencies: Object.keys(packageJson.devDependencies || {}).length
      };
    } catch (e) {
      // No package.json
    }

    return {
      success: true,
      totalFiles: allFiles.length,
      filesByType,
      git: {
        branch: status.current,
        uncommittedChanges: status.modified.length + status.created.length,
        lastCommit: log.latest?.message
      },
      package: packageInfo
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * DATABASE TOOLS (for ClientForge)
 */

export async function queryDatabase({ query, database = 'postgresql' }) {
  try {
    // For now, just return schema info from files
    // In production, you'd connect to actual DB

    if (query.toLowerCase().includes('schema')) {
      const migrations = await glob('backend/database/**/*.sql', {
        cwd: PROJECT_ROOT
      });

      return {
        success: true,
        database,
        migrations: migrations.map(f => path.basename(f)),
        note: 'Schema info from migration files (actual DB connection not implemented)'
      };
    }

    return {
      success: false,
      error: 'Direct database queries not yet implemented. Use file-based analysis.'
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * TOOL REGISTRY
 * Maps tool names to functions and their schemas
 */

export const TOOLS = {
  list_files: {
    function: listFiles,
    description: 'List files in a directory matching a pattern',
    parameters: {
      pattern: { type: 'string', description: 'Glob pattern (e.g., **/*.ts)', default: '**/*' },
      directory: { type: 'string', description: 'Directory to search', default: PROJECT_ROOT }
    }
  },

  read_file: {
    function: readFile,
    description: 'Read the contents of a file',
    parameters: {
      filePath: { type: 'string', description: 'Path to file (absolute or relative to project root)', required: true }
    }
  },

  write_file: {
    function: writeFile,
    description: 'Write content to a file',
    parameters: {
      filePath: { type: 'string', description: 'Path to file', required: true },
      content: { type: 'string', description: 'Content to write', required: true }
    }
  },

  search_files: {
    function: searchFiles,
    description: 'Search for text across files',
    parameters: {
      query: { type: 'string', description: 'Text to search for', required: true },
      filePattern: { type: 'string', description: 'File pattern to search', default: '**/*.{js,ts}' },
      directory: { type: 'string', description: 'Directory to search', default: PROJECT_ROOT }
    }
  },

  git_status: {
    function: gitStatus,
    description: 'Get git repository status',
    parameters: {
      directory: { type: 'string', description: 'Repository directory', default: PROJECT_ROOT }
    }
  },

  git_log: {
    function: gitLog,
    description: 'Get git commit history',
    parameters: {
      limit: { type: 'number', description: 'Number of commits', default: 10 },
      directory: { type: 'string', description: 'Repository directory', default: PROJECT_ROOT }
    }
  },

  git_diff: {
    function: gitDiff,
    description: 'Get git diff of changes',
    parameters: {
      file: { type: 'string', description: 'Specific file to diff (optional)' },
      directory: { type: 'string', description: 'Repository directory', default: PROJECT_ROOT }
    }
  },

  run_command: {
    function: runCommand,
    description: 'Run a shell command (limited to safe commands)',
    parameters: {
      command: { type: 'string', description: 'Command to execute', required: true },
      directory: { type: 'string', description: 'Working directory', default: PROJECT_ROOT }
    }
  },

  analyze_project: {
    function: analyzeProject,
    description: 'Analyze project structure and get overview',
    parameters: {
      directory: { type: 'string', description: 'Project directory', default: PROJECT_ROOT }
    }
  },

  query_database: {
    function: queryDatabase,
    description: 'Query database or get schema information',
    parameters: {
      query: { type: 'string', description: 'Query to execute', required: true },
      database: { type: 'string', description: 'Database type', default: 'postgresql' }
    }
  }
};

/**
 * Execute a tool by name
 */
export async function executeTool(toolName, parameters) {
  const tool = TOOLS[toolName];

  if (!tool) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}. Available tools: ${Object.keys(TOOLS).join(', ')}`
    };
  }

  try {
    const result = await tool.function(parameters || {});
    return result;
  } catch (error) {
    return {
      success: false,
      error: `Tool execution failed: ${error.message}`
    };
  }
}
