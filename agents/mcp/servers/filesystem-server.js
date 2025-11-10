#!/usr/bin/env node

/**
 * ClientForge Filesystem MCP Server
 * Provides workspace-aware file operations with automatic staging and smart navigation
 */

const fs = require('fs').promises;
const path = require('path');
const { glob } = require('glob');

const WORKSPACE_ROOT = 'D:\\clientforge-crm';
const STAGING_ROOT = path.join(WORKSPACE_ROOT, '_staging');

// Exclude patterns
const EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/.next/**',
  '**/dist/**',
  '**/.turbo/**',
  '**/coverage/**',
  '**/*.map',
  '**/*.{png,jpg,jpeg,gif,svg,webp,mp4,avi}'
];

class ClientForgeFilesystem {
  constructor() {
    this.recentFiles = [];
    this.workspaceTree = null;
  }

  /**
   * Read file with automatic path resolution
   */
  async readFile(relativePath) {
    const fullPath = this.resolvePath(relativePath);

    // Verify path is within workspace
    if (!this.isValidPath(fullPath)) {
      throw new Error(`Path outside workspace: ${relativePath}`);
    }

    try {
      const content = await fs.readFile(fullPath, 'utf8');
      this.trackRecentFile(relativePath);

      return {
        success: true,
        path: relativePath,
        content: content,
        size: Buffer.byteLength(content, 'utf8'),
        lines: content.split('\n').length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Write file with automatic staging
   */
  async writeFile(relativePath, content, options = {}) {
    const { autoStage = true, overwrite = true } = options;

    const targetPath = autoStage
      ? path.join(STAGING_ROOT, relativePath)
      : this.resolvePath(relativePath);

    if (!this.isValidPath(targetPath)) {
      throw new Error(`Path outside workspace: ${relativePath}`);
    }

    // Check if file exists and overwrite is false
    if (!overwrite) {
      try {
        await fs.access(targetPath);
        return {
          success: false,
          error: 'File exists and overwrite is false'
        };
      } catch {
        // File doesn't exist, proceed
      }
    }

    // Ensure directory exists
    const dir = path.dirname(targetPath);
    await fs.mkdir(dir, { recursive: true });

    try {
      await fs.writeFile(targetPath, content, 'utf8');

      return {
        success: true,
        path: relativePath,
        staged: autoStage,
        location: autoStage ? '_staging' : 'main',
        size: Buffer.byteLength(content, 'utf8')
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List directory with smart filtering
   */
  async listDirectory(relativePath = '.', options = {}) {
    const {
      recursive = false,
      pattern = '*',
      sort = 'name',
      limit = 100
    } = options;

    const fullPath = this.resolvePath(relativePath);

    if (!this.isValidPath(fullPath)) {
      throw new Error(`Path outside workspace: ${relativePath}`);
    }

    try {
      const globPattern = recursive
        ? path.join(fullPath, '**', pattern)
        : path.join(fullPath, pattern);

      const files = await glob(globPattern, {
        ignore: EXCLUDE_PATTERNS,
        nodir: false,
        stat: true,
        withFileTypes: true
      });

      // Sort files
      const sorted = this.sortFiles(files, sort);

      // Limit results
      const limited = sorted.slice(0, limit);

      // Format output
      const formatted = await Promise.all(
        limited.map(async (file) => {
          const stats = await fs.stat(file.fullpath());
          const relativePath = path.relative(WORKSPACE_ROOT, file.fullpath());

          return {
            path: relativePath.replace(/\\/g, '/'),
            name: file.name,
            type: file.isDirectory() ? 'directory' : 'file',
            size: stats.size,
            modified: stats.mtime.toISOString(),
            extension: path.extname(file.name)
          };
        })
      );

      return {
        success: true,
        path: relativePath,
        count: formatted.length,
        total: files.length,
        files: formatted
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Search files by content or name
   */
  async searchFiles(query, options = {}) {
    const {
      searchType = 'content',  // 'content' or 'name'
      caseSensitive = false,
      filePattern = '*.{ts,tsx,js,jsx,md}',
      maxResults = 50
    } = options;

    const globPattern = path.join(WORKSPACE_ROOT, '**', filePattern);
    const files = await glob(globPattern, {
      ignore: EXCLUDE_PATTERNS,
      nodir: true
    });

    const results = [];
    const regex = new RegExp(
      query,
      caseSensitive ? 'g' : 'gi'
    );

    for (const file of files) {
      if (results.length >= maxResults) break;

      if (searchType === 'name') {
        if (regex.test(path.basename(file))) {
          results.push({
            path: path.relative(WORKSPACE_ROOT, file).replace(/\\/g, '/'),
            matchType: 'filename'
          });
        }
      } else {
        // Content search
        try {
          const content = await fs.readFile(file, 'utf8');
          const matches = [...content.matchAll(regex)];

          if (matches.length > 0) {
            const lines = content.split('\n');
            const matchedLines = matches.map(match => {
              const pos = match.index;
              let lineNum = 0;
              let charCount = 0;

              for (let i = 0; i < lines.length; i++) {
                charCount += lines[i].length + 1;
                if (charCount > pos) {
                  lineNum = i + 1;
                  break;
                }
              }

              return {
                line: lineNum,
                text: lines[lineNum - 1].trim(),
                match: match[0]
              };
            });

            results.push({
              path: path.relative(WORKSPACE_ROOT, file).replace(/\\/g, '/'),
              matchType: 'content',
              matches: matchedLines.slice(0, 5) // First 5 matches per file
            });
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }

    return {
      success: true,
      query: query,
      count: results.length,
      results: results
    };
  }

  /**
   * Get workspace tree structure
   */
  async getWorkspaceTree(maxDepth = 3) {
    const buildTree = async (dir, depth = 0) => {
      if (depth >= maxDepth) return null;

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const children = [];

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(WORKSPACE_ROOT, fullPath);

          // Skip excluded patterns
          if (this.shouldExclude(relativePath)) continue;

          if (entry.isDirectory()) {
            const subtree = await buildTree(fullPath, depth + 1);
            if (subtree) {
              children.push({
                name: entry.name,
                type: 'directory',
                path: relativePath.replace(/\\/g, '/'),
                children: subtree
              });
            }
          } else {
            children.push({
              name: entry.name,
              type: 'file',
              path: relativePath.replace(/\\/g, '/'),
              extension: path.extname(entry.name)
            });
          }
        }

        return children;
      } catch {
        return null;
      }
    };

    this.workspaceTree = await buildTree(WORKSPACE_ROOT);

    return {
      success: true,
      root: 'D:\\clientforge-crm',
      depth: maxDepth,
      tree: this.workspaceTree
    };
  }

  /**
   * Get recent files accessed
   */
  getRecentFiles(limit = 10) {
    return {
      success: true,
      count: Math.min(this.recentFiles.length, limit),
      files: this.recentFiles.slice(0, limit)
    };
  }

  /**
   * Get staged files
   */
  async getStagedFiles() {
    try {
      const globPattern = path.join(STAGING_ROOT, '**', '*');
      const files = await glob(globPattern, {
        nodir: true
      });

      const formatted = await Promise.all(
        files.map(async (file) => {
          const stats = await fs.stat(file);
          const relativePath = path.relative(STAGING_ROOT, file);

          return {
            path: relativePath.replace(/\\/g, '/'),
            size: stats.size,
            modified: stats.mtime.toISOString()
          };
        })
      );

      return {
        success: true,
        count: formatted.length,
        files: formatted
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Smart navigate - suggest paths based on partial input
   */
  async smartNavigate(partial) {
    const suggestions = [];

    // Try to match directories first
    const dirPattern = path.join(WORKSPACE_ROOT, '**', `*${partial}*`);
    const matches = await glob(dirPattern, {
      ignore: EXCLUDE_PATTERNS,
      maxDepth: 4
    });

    for (const match of matches.slice(0, 10)) {
      const relativePath = path.relative(WORKSPACE_ROOT, match);
      const stats = await fs.stat(match);

      suggestions.push({
        path: relativePath.replace(/\\/g, '/'),
        type: stats.isDirectory() ? 'directory' : 'file',
        score: this.calculateMatchScore(partial, relativePath)
      });
    }

    // Sort by score
    suggestions.sort((a, b) => b.score - a.score);

    return {
      success: true,
      partial: partial,
      suggestions: suggestions.slice(0, 10)
    };
  }

  // Helper methods

  resolvePath(relativePath) {
    return path.resolve(WORKSPACE_ROOT, relativePath);
  }

  isValidPath(fullPath) {
    const normalized = path.normalize(fullPath);
    return normalized.startsWith(WORKSPACE_ROOT) ||
           normalized.startsWith(STAGING_ROOT);
  }

  shouldExclude(relativePath) {
    return EXCLUDE_PATTERNS.some(pattern => {
      const regex = new RegExp(
        pattern
          .replace(/\*\*/g, '.*')
          .replace(/\*/g, '[^/]*')
          .replace(/\./g, '\\.')
      );
      return regex.test(relativePath);
    });
  }

  trackRecentFile(relativePath) {
    this.recentFiles = [
      relativePath,
      ...this.recentFiles.filter(f => f !== relativePath)
    ].slice(0, 20);
  }

  sortFiles(files, sortType) {
    switch (sortType) {
      case 'name':
        return files.sort((a, b) => a.name.localeCompare(b.name));
      case 'modified_desc':
        return files.sort((a, b) => b.mtime - a.mtime);
      case 'modified_asc':
        return files.sort((a, b) => a.mtime - b.mtime);
      case 'size':
        return files.sort((a, b) => b.size - a.size);
      default:
        return files;
    }
  }

  calculateMatchScore(partial, fullPath) {
    const basename = path.basename(fullPath);
    const lowerPartial = partial.toLowerCase();
    const lowerBasename = basename.toLowerCase();

    // Exact match
    if (lowerBasename === lowerPartial) return 100;

    // Starts with
    if (lowerBasename.startsWith(lowerPartial)) return 90;

    // Contains
    if (lowerBasename.includes(lowerPartial)) return 70;

    // Fuzzy match
    let score = 50;
    for (const char of lowerPartial) {
      if (lowerBasename.includes(char)) score += 5;
    }

    return Math.min(score, 100);
  }
}

// MCP Server Interface
const server = new ClientForgeFilesystem();

// Handle stdin for MCP protocol
process.stdin.on('data', async (data) => {
  let request;
  try {
    request = JSON.parse(data.toString());
    let response;

    switch (request.method) {
      case 'read_file':
        response = await server.readFile(request.params.path);
        break;
      case 'write_file':
        response = await server.writeFile(
          request.params.path,
          request.params.content,
          request.params.options
        );
        break;
      case 'list_directory':
        response = await server.listDirectory(
          request.params.path,
          request.params.options
        );
        break;
      case 'search_files':
        response = await server.searchFiles(
          request.params.query,
          request.params.options
        );
        break;
      case 'workspace_tree':
        response = await server.getWorkspaceTree(request.params.maxDepth);
        break;
      case 'recent_files':
        response = server.getRecentFiles(request.params.limit);
        break;
      case 'staged_files':
        response = await server.getStagedFiles();
        break;
      case 'smart_navigate':
        response = await server.smartNavigate(request.params.partial);
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
      id: request ? request.id : null,
      error: {
        code: -32603,
        message: error.message
      }
    }) + '\n');
  }
});

console.error('[ClientForge Filesystem MCP] Server started');
