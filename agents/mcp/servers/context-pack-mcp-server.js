#!/usr/bin/env node

/**
 * ClientForge Context Pack MCP Server
 * Full MCP Protocol Implementation for LM Studio
 * Smart context loading with 120KB budget management
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';
const PACKS_FILE = process.env.PACKS_FILE || 'D:\\clientforge-crm\\docs\\claude\\11_CONTEXT_PACKS.md';
const BUDGET_LIMIT_KB = parseInt(process.env.BUDGET_LIMIT_KB || '120');

// Context pack engine
class ContextPackEngine {
  constructor() {
    this.packs = new Map();
    this.loadedPacks = [];
    this.currentBudget = 0;
  }

  async initialize() {
    try {
      const packsContent = await fs.readFile(PACKS_FILE, 'utf8');
      this.parsePacks(packsContent);
      return { success: true, packsCount: this.packs.size };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  parsePacks(content) {
    const packRegex = /###\s+(\w+_pack)\s+\(~(\d+)KB\)([\s\S]*?)(?=###|$)/g;
    let match;

    while ((match = packRegex.exec(content)) !== null) {
      const packName = match[1];
      const sizeKB = parseInt(match[2]);
      const packContent = match[3];

      const files = [];
      const fileRegex = /-\s+`([^`]+)`/g;
      let fileMatch;

      while ((fileMatch = fileRegex.exec(packContent)) !== null) {
        files.push(fileMatch[1]);
      }

      this.packs.set(packName, {
        name: packName,
        sizeKB,
        files,
        description: packContent.split('\n')[0].trim()
      });
    }
  }

  async listPacks() {
    const packs = Array.from(this.packs.values()).map(pack => ({
      name: pack.name,
      sizeKB: pack.sizeKB,
      fileCount: pack.files.length,
      description: pack.description
    }));

    return {
      success: true,
      packs,
      count: packs.length,
      budgetLimit: BUDGET_LIMIT_KB,
      currentBudget: this.currentBudget
    };
  }

  async loadPack(packName) {
    const pack = this.packs.get(packName);

    if (!pack) {
      return {
        success: false,
        error: `Pack '${packName}' not found`,
        availablePacks: Array.from(this.packs.keys())
      };
    }

    if (this.currentBudget + pack.sizeKB > BUDGET_LIMIT_KB) {
      return {
        success: false,
        error: `Budget exceeded: ${this.currentBudget + pack.sizeKB}KB > ${BUDGET_LIMIT_KB}KB`,
        suggestion: 'Clear loaded packs first'
      };
    }

    const files = [];
    let actualSize = 0;

    for (const filePath of pack.files) {
      try {
        const fullPath = path.join(WORKSPACE_ROOT, filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        const sizeKB = Buffer.byteLength(content, 'utf8') / 1024;

        files.push({
          path: filePath,
          sizeKB: Math.round(sizeKB * 10) / 10,
          lines: content.split('\n').length,
          content: content.substring(0, 50000)
        });

        actualSize += sizeKB;
      } catch (error) {
        files.push({
          path: filePath,
          error: error.message
        });
      }
    }

    this.loadedPacks.push(packName);
    this.currentBudget += actualSize;

    return {
      success: true,
      pack: packName,
      files,
      estimatedSize: pack.sizeKB,
      actualSize: Math.round(actualSize * 10) / 10,
      budgetUsed: Math.round(this.currentBudget * 10) / 10,
      budgetRemaining: Math.round((BUDGET_LIMIT_KB - this.currentBudget) * 10) / 10
    };
  }

  async estimateSize(files) {
    let totalSize = 0;
    const fileDetails = [];

    for (const filePath of files) {
      try {
        const fullPath = path.join(WORKSPACE_ROOT, filePath);
        const stats = await fs.stat(fullPath);
        const sizeKB = stats.size / 1024;

        totalSize += sizeKB;
        fileDetails.push({
          path: filePath,
          sizeKB: Math.round(sizeKB * 10) / 10
        });
      } catch (error) {
        fileDetails.push({
          path: filePath,
          error: error.message
        });
      }
    }

    return {
      success: true,
      totalSizeKB: Math.round(totalSize * 10) / 10,
      files: fileDetails,
      fitsInBudget: totalSize <= BUDGET_LIMIT_KB,
      budgetRemaining: Math.round((BUDGET_LIMIT_KB - totalSize) * 10) / 10
    };
  }

  clearLoadedPacks() {
    const cleared = [...this.loadedPacks];
    this.loadedPacks = [];
    this.currentBudget = 0;

    return {
      success: true,
      clearedPacks: cleared,
      budgetFreed: this.currentBudget
    };
  }
}

const contextPackEngine = new ContextPackEngine();

const server = new Server(
  {
    name: "clientforge-context-pack",
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
        name: "list_packs",
        description: "List available context packs",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "load_pack",
        description: "Load a context pack",
        inputSchema: {
          type: "object",
          properties: {
            pack: {
              type: "string",
              description: "Pack name to load"
            }
          },
          required: ["pack"]
        }
      },
      {
        name: "estimate_size",
        description: "Estimate size of files",
        inputSchema: {
          type: "object",
          properties: {
            files: {
              type: "array",
              items: {
                type: "string"
              },
              description: "Array of file paths"
            }
          },
          required: ["files"]
        }
      },
      {
        name: "clear_loaded_packs",
        description: "Clear all loaded packs and reset budget",
        inputSchema: {
          type: "object",
          properties: {}
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
      case "list_packs":
        result = await contextPackEngine.listPacks();
        break;

      case "load_pack":
        result = await contextPackEngine.loadPack(args.pack);
        break;

      case "estimate_size":
        result = await contextPackEngine.estimateSize(args.files);
        break;

      case "clear_loaded_packs":
        result = contextPackEngine.clearLoadedPacks();
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
  console.error("[ClientForge Context Pack] MCP Server running - Initializing...");

  contextPackEngine.initialize().then(result => {
    console.error("[ClientForge Context Pack] Ready:", result.packsCount, "packs available");
  }).catch(err => {
    console.error("[ClientForge Context Pack] Init error:", err.message);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
