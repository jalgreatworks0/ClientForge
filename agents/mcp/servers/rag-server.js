#!/usr/bin/env node

/**
 * ClientForge RAG MCP Server
 * Local semantic search and retrieval (simplified implementation)
 */

const fs = require('fs').promises;
const path = require('path');

const RAG_ENDPOINT = process.env.RAG_ENDPOINT || 'http://127.0.0.1:8920';
const INDEX_PATH = process.env.INDEX_PATH || 'D:\\clientforge-crm\\agents\\rag-index';
const WORKSPACE_ROOT = 'D:\\clientforge-crm';

class ClientForgeRAG {
  constructor() {
    this.index = new Map();
  }

  async indexWorkspace() {
    const { glob } = require('glob');
    const files = await glob('**/*.{ts,tsx,js,jsx,md}', {
      cwd: WORKSPACE_ROOT,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    let indexed = 0;
    for (const file of files.slice(0, 100)) { // Limit to 100 files
      try {
        const fullPath = path.join(WORKSPACE_ROOT, file);
        const content = await fs.readFile(fullPath, 'utf8');

        // Simple keyword extraction (production would use embeddings)
        const keywords = this.extractKeywords(content);

        this.index.set(file, {
          path: file,
          keywords,
          size: Buffer.byteLength(content, 'utf8')
        });

        indexed++;
      } catch {
        // Skip files that can't be read
      }
    }

    return {
      success: true,
      filesIndexed: indexed,
      totalFiles: files.length
    };
  }

  extractKeywords(content) {
    // Simple keyword extraction (find class/function/interface names)
    const keywords = new Set();

    const classMatches = [...content.matchAll(/class\s+(\w+)/g)];
    const functionMatches = [...content.matchAll(/function\s+(\w+)/g)];
    const interfaceMatches = [...content.matchAll(/interface\s+(\w+)/g)];

    classMatches.forEach(m => keywords.add(m[1].toLowerCase()));
    functionMatches.forEach(m => keywords.add(m[1].toLowerCase()));
    interfaceMatches.forEach(m => keywords.add(m[1].toLowerCase()));

    return Array.from(keywords);
  }

  async semanticSearch(query) {
    const queryLower = query.toLowerCase();
    const results = [];

    for (const [file, data] of this.index.entries()) {
      const relevance = data.keywords.filter(k =>
        k.includes(queryLower) || queryLower.includes(k)
      ).length;

      if (relevance > 0) {
        results.push({
          file,
          relevance,
          keywords: data.keywords.slice(0, 5)
        });
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);

    return {
      success: true,
      query,
      results: results.slice(0, 10), // Top 10 results
      total: results.length
    };
  }

  async findSimilar(filePath) {
    const fileData = this.index.get(filePath);

    if (!fileData) {
      return {
        success: false,
        error: 'File not indexed'
      };
    }

    const results = [];

    for (const [file, data] of this.index.entries()) {
      if (file === filePath) continue;

      // Calculate similarity based on shared keywords
      const sharedKeywords = fileData.keywords.filter(k =>
        data.keywords.includes(k)
      );

      if (sharedKeywords.length > 0) {
        results.push({
          file,
          similarity: sharedKeywords.length,
          sharedKeywords
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);

    return {
      success: true,
      sourceFile: filePath,
      similar: results.slice(0, 10)
    };
  }
}

// MCP Server Interface
const server = new ClientForgeRAG();
console.error('[ClientForge RAG MCP] Initializing index...');
server.indexWorkspace().then(result => {
  console.error('[ClientForge RAG MCP] Server started', result);
});

process.stdin.on('data', async (data) => {
  let request;
  try {
    request = JSON.parse(data.toString());
    let response;

    switch (request.method) {
      case 'index_workspace':
        response = await server.indexWorkspace();
        break;
      case 'semantic_search':
        response = await server.semanticSearch(request.params.query);
        break;
      case 'find_similar':
        response = await server.findSimilar(request.params.file);
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
