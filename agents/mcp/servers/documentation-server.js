#!/usr/bin/env node

/**
 * ClientForge Documentation MCP Server
 * Documentation generation, README management, and JSDoc
 */

const fs = require('fs').promises;
const path = require('path');

const DOCS_ROOT = process.env.DOCS_ROOT || 'D:\\clientforge-crm\\docs';
const WORKSPACE_ROOT = 'D:\\clientforge-crm';

class ClientForgeDocumentation {
  async listDocs() {
    const { glob } = require('glob');
    const docs = await glob('**/*.md', {
      cwd: DOCS_ROOT,
      ignore: ['**/node_modules/**']
    });

    return {
      success: true,
      docs,
      count: docs.length
    };
  }

  async readDoc(docPath) {
    try {
      const fullPath = path.join(DOCS_ROOT, docPath);
      const content = await fs.readFile(fullPath, 'utf8');

      return {
        success: true,
        path: docPath,
        content,
        size: Buffer.byteLength(content, 'utf8') / 1024
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateReadme(section, content) {
    try {
      const readmePath = path.join(WORKSPACE_ROOT, 'README.md');
      const existing = await fs.readFile(readmePath, 'utf8');

      // Simple section replacement (would need more sophisticated parsing in production)
      const updatedContent = existing.replace(
        new RegExp(`(##\\s+${section}[\\s\\S]*?)(?=##|$)`),
        `## ${section}\n\n${content}\n\n`
      );

      await fs.writeFile(readmePath, updatedContent, 'utf8');

      return {
        success: true,
        message: `Section '${section}' updated`
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async generateJSDoc(filePath) {
    try {
      const fullPath = path.join(WORKSPACE_ROOT, filePath);
      const content = await fs.readFile(fullPath, 'utf8');

      // Extract functions and classes
      const functions = [...content.matchAll(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g)];
      const classes = [...content.matchAll(/(?:export\s+)?class\s+(\w+)/g)];

      return {
        success: true,
        file: filePath,
        functions: functions.map(m => m[1]),
        classes: classes.map(m => m[1]),
        needsDocumentation: functions.length + classes.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkDocCoverage() {
    const { glob } = require('glob');
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: WORKSPACE_ROOT,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    let documented = 0;
    let undocumented = 0;

    for (const file of files.slice(0, 50)) { // Limit to 50 files
      try {
        const content = await fs.readFile(path.join(WORKSPACE_ROOT, file), 'utf8');
        const hasJSDoc = content.includes('/**');
        if (hasJSDoc) documented++;
        else undocumented++;
      } catch {
        // Skip files that can't be read
      }
    }

    return {
      success: true,
      filesChecked: Math.min(files.length, 50),
      documented,
      undocumented,
      coverage: Math.round((documented / (documented + undocumented)) * 100)
    };
  }
}

// MCP Server Interface
const server = new ClientForgeDocumentation();
console.error('[ClientForge Documentation MCP] Server started');

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    let response;

    switch (request.method) {
      case 'list_docs':
        response = await server.listDocs();
        break;
      case 'read_doc':
        response = await server.readDoc(request.params.doc);
        break;
      case 'update_readme':
        response = await server.updateReadme(request.params.section, request.params.content);
        break;
      case 'generate_jsdoc':
        response = await server.generateJSDoc(request.params.file);
        break;
      case 'check_doc_coverage':
        response = await server.checkDocCoverage();
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
