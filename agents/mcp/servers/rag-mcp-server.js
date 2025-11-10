#!/usr/bin/env node

/**
 * ClientForge RAG MCP Server
 * Full MCP Protocol Implementation for LM Studio
 * Local semantic search and retrieval
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

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';

// RAG engine
class RAGEngine {
  constructor() {
    this.index = new Map();
  }

  async indexWorkspace() {
    const files = await glob('**/*.{ts,tsx,js,jsx,md}', {
      cwd: WORKSPACE_ROOT,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    let indexed = 0;
    for (const file of files.slice(0, 100)) {
      try {
        const fullPath = path.join(WORKSPACE_ROOT, file);
        const content = await fs.readFile(fullPath, 'utf8');

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
      results: results.slice(0, 10),
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

const ragEngine = new RAGEngine();

const server = new Server(
  {
    name: "clientforge-rag",
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
        name: "index_workspace",
        description: "Index workspace for semantic search",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "semantic_search",
        description: "Search codebase semantically",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "Search query"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "find_similar",
        description: "Find files similar to a given file",
        inputSchema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description: "File path to find similar files for"
            }
          },
          required: ["file"]
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
      case "index_workspace":
        result = await ragEngine.indexWorkspace();
        break;

      case "semantic_search":
        result = await ragEngine.semanticSearch(args.query);
        break;

      case "find_similar":
        result = await ragEngine.findSimilar(args.file);
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
  console.error("[ClientForge RAG] MCP Server running - Initializing index...");

  ragEngine.indexWorkspace().then(result => {
    console.error("[ClientForge RAG] Index ready:", result.filesIndexed, "files");
  }).catch(err => {
    console.error("[ClientForge RAG] Index error:", err.message);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
