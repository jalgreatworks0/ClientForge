#!/usr/bin/env node

/**
 * ClientForge Context Pack MCP Server
 * Smart context loading with 120KB budget management
 */

const fs = require('fs').promises;
const path = require('path');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';
const PACKS_FILE = process.env.PACKS_FILE || 'D:\\clientforge-crm\\docs\\claude\\11_CONTEXT_PACKS.md';
const BUDGET_LIMIT_KB = parseInt(process.env.BUDGET_LIMIT_KB || '120');

class ClientForgeContextPack {
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
    // Parse markdown file to extract pack definitions
    const packRegex = /###\s+(\w+_pack)\s+\(~(\d+)KB\)([\s\S]*?)(?=###|$)/g;
    let match;

    while ((match = packRegex.exec(content)) !== null) {
      const packName = match[1];
      const sizeKB = parseInt(match[2]);
      const packContent = match[3];

      // Extract file list
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

    // Check budget
    if (this.currentBudget + pack.sizeKB > BUDGET_LIMIT_KB) {
      return {
        success: false,
        error: `Budget exceeded: ${this.currentBudget + pack.sizeKB}KB > ${BUDGET_LIMIT_KB}KB`,
        suggestion: 'Clear loaded packs first'
      };
    }

    // Load files
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
          content: content.substring(0, 50000) // Limit to 50KB per file
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

  async createCustomPack(name, files) {
    const estimate = await this.estimateSize(files);

    if (!estimate.fitsInBudget) {
      return {
        success: false,
        error: `Pack too large: ${estimate.totalSizeKB}KB > ${BUDGET_LIMIT_KB}KB`
      };
    }

    this.packs.set(name, {
      name,
      sizeKB: estimate.totalSizeKB,
      files,
      description: 'Custom pack',
      custom: true
    });

    return {
      success: true,
      pack: name,
      sizeKB: estimate.totalSizeKB,
      fileCount: files.length
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

  async getPackDetails(packName) {
    const pack = this.packs.get(packName);

    if (!pack) {
      return {
        success: false,
        error: `Pack '${packName}' not found`
      };
    }

    // Get actual file sizes
    const fileDetails = [];
    for (const filePath of pack.files) {
      try {
        const fullPath = path.join(WORKSPACE_ROOT, filePath);
        const stats = await fs.stat(fullPath);
        const sizeKB = stats.size / 1024;

        fileDetails.push({
          path: filePath,
          sizeKB: Math.round(sizeKB * 10) / 10,
          exists: true
        });
      } catch {
        fileDetails.push({
          path: filePath,
          exists: false
        });
      }
    }

    return {
      success: true,
      pack: {
        ...pack,
        fileDetails
      }
    };
  }
}

// MCP Server Interface
const server = new ClientForgeContextPack();
console.error('[ClientForge Context Pack MCP] Initializing...');
server.initialize().then(result => {
  console.error('[ClientForge Context Pack MCP] Server started', result);
});

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    let response;

    switch (request.method) {
      case 'list_packs':
        response = await server.listPacks();
        break;
      case 'load_pack':
        response = await server.loadPack(request.params.pack);
        break;
      case 'estimate_size':
        response = await server.estimateSize(request.params.files);
        break;
      case 'create_custom_pack':
        response = await server.createCustomPack(request.params.name, request.params.files);
        break;
      case 'clear_loaded_packs':
        response = server.clearLoadedPacks();
        break;
      case 'get_pack_details':
        response = await server.getPackDetails(request.params.pack);
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
