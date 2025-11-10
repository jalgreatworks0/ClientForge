#!/usr/bin/env node

/**
 * ClientForge Codebase MCP Server
 * Full MCP Protocol Implementation for LM Studio
 * Intelligent code navigation and dependency analysis
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
const ts = require('typescript');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';

// Codebase analysis engine
class CodebaseAnalyzer {
  constructor() {
    this.index = new Map();
    this.reverseIndex = new Map();
  }

  async buildIndex() {
    const patterns = [
      'backend/**/*.ts',
      'frontend/src/**/*.{ts,tsx}',
      'tests/**/*.test.ts'
    ];

    for (const pattern of patterns) {
      const files = await glob(path.join(WORKSPACE_ROOT, pattern), {
        ignore: ['**/node_modules/**', '**/dist/**']
      });

      for (const file of files) {
        await this.indexFile(file);
      }
    }

    return {
      success: true,
      filesIndexed: this.index.size
    };
  }

  async indexFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      const relativePath = path.relative(WORKSPACE_ROOT, filePath);
      const symbols = [];
      const imports = [];
      const exports = [];

      const visit = (node) => {
        if (ts.isClassDeclaration(node) && node.name) {
          symbols.push({
            type: 'class',
            name: node.name.text,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }

        if (ts.isFunctionDeclaration(node) && node.name) {
          symbols.push({
            type: 'function',
            name: node.name.text,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }

        if (ts.isInterfaceDeclaration(node)) {
          symbols.push({
            type: 'interface',
            name: node.name.text,
            line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
          });
        }

        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier;
          if (ts.isStringLiteral(moduleSpecifier)) {
            imports.push({
              module: moduleSpecifier.text,
              line: sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1
            });
          }
        }

        if (node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
          if (ts.isClassDeclaration(node) && node.name) {
            exports.push(node.name.text);
          } else if (ts.isFunctionDeclaration(node) && node.name) {
            exports.push(node.name.text);
          } else if (ts.isInterfaceDeclaration(node)) {
            exports.push(node.name.text);
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);

      this.index.set(relativePath, {
        path: relativePath,
        symbols,
        imports,
        exports
      });

      for (const symbol of symbols) {
        if (!this.reverseIndex.has(symbol.name)) {
          this.reverseIndex.set(symbol.name, []);
        }
        this.reverseIndex.get(symbol.name).push({
          file: relativePath,
          line: symbol.line,
          type: symbol.type
        });
      }

    } catch (error) {
      // Skip files that can't be parsed
    }
  }

  async findDefinition(symbol) {
    const results = this.reverseIndex.get(symbol) || [];
    return {
      success: true,
      symbol,
      definitions: results
    };
  }

  async findReferences(symbol) {
    const references = [];

    for (const [filePath, data] of this.index.entries()) {
      try {
        const fullPath = path.join(WORKSPACE_ROOT, filePath);
        const content = await fs.readFile(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          if (line.includes(symbol)) {
            references.push({
              file: filePath,
              line: index + 1,
              text: line.trim()
            });
          }
        });
      } catch {
        // Skip files that can't be read
      }
    }

    return {
      success: true,
      symbol,
      count: references.length,
      references: references.slice(0, 50)
    };
  }

  async dependencyGraph(filePath) {
    const data = this.index.get(filePath);
    if (!data) {
      return {
        success: false,
        error: 'File not indexed'
      };
    }

    const dependencies = data.imports.map(imp => imp.module);
    const dependents = [];

    for (const [otherFile, otherData] of this.index.entries()) {
      const relativeImport = './' + path.relative(
        path.dirname(otherFile),
        filePath
      ).replace(/\\/g, '/').replace(/\.tsx?$/, '');

      if (otherData.imports.some(imp =>
        imp.module === relativeImport ||
        imp.module === filePath.replace(/\.tsx?$/, '')
      )) {
        dependents.push(otherFile);
      }
    }

    return {
      success: true,
      file: filePath,
      dependencies,
      dependents,
      exports: data.exports
    };
  }

  async breakingChangeAnalysis(filePath) {
    const data = this.index.get(filePath);
    if (!data) {
      return {
        success: false,
        error: 'File not indexed'
      };
    }

    const affectedFiles = [];
    for (const [otherFile, otherData] of this.index.entries()) {
      const relativeImport = './' + path.relative(
        path.dirname(otherFile),
        filePath
      ).replace(/\\/g, '/').replace(/\.tsx?$/, '');

      if (otherData.imports.some(imp =>
        imp.module === relativeImport ||
        imp.module === filePath.replace(/\.tsx?$/, '')
      )) {
        affectedFiles.push({
          file: otherFile,
          importsFrom: filePath
        });
      }
    }

    const riskLevel =
      affectedFiles.length > 10 ? 'HIGH' :
      affectedFiles.length > 5 ? 'MEDIUM' :
      'LOW';

    return {
      success: true,
      file: filePath,
      exports: data.exports,
      affectedFiles,
      affectedCount: affectedFiles.length,
      riskLevel
    };
  }

  async moduleStructure(modulePath) {
    const moduleFiles = [];

    for (const [filePath] of this.index.entries()) {
      if (filePath.startsWith(modulePath)) {
        const data = this.index.get(filePath);
        moduleFiles.push({
          file: filePath,
          symbolCount: data.symbols.length,
          imports: data.imports.length,
          exports: data.exports.length
        });
      }
    }

    return {
      success: true,
      module: modulePath,
      fileCount: moduleFiles.length,
      files: moduleFiles
    };
  }
}

const analyzer = new CodebaseAnalyzer();

const server = new Server(
  {
    name: "clientforge-codebase",
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
        name: "find_definition",
        description: "Find definition of a symbol (class, function, interface)",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Symbol name to find"
            }
          },
          required: ["symbol"]
        }
      },
      {
        name: "find_references",
        description: "Find all references to a symbol in the codebase",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "Symbol name to search for"
            }
          },
          required: ["symbol"]
        }
      },
      {
        name: "dependency_graph",
        description: "Get dependency graph for a file (imports and dependents)",
        inputSchema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description: "Relative path to file"
            }
          },
          required: ["file"]
        }
      },
      {
        name: "breaking_change_analysis",
        description: "Analyze impact of changing a file",
        inputSchema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description: "Relative path to file"
            }
          },
          required: ["file"]
        }
      },
      {
        name: "module_structure",
        description: "Get structure overview of a module/directory",
        inputSchema: {
          type: "object",
          properties: {
            module: {
              type: "string",
              description: "Module path (e.g., 'backend/services')"
            }
          },
          required: ["module"]
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
      case "find_definition":
        result = await analyzer.findDefinition(args.symbol);
        break;

      case "find_references":
        result = await analyzer.findReferences(args.symbol);
        break;

      case "dependency_graph":
        result = await analyzer.dependencyGraph(args.file);
        break;

      case "breaking_change_analysis":
        result = await analyzer.breakingChangeAnalysis(args.file);
        break;

      case "module_structure":
        result = await analyzer.moduleStructure(args.module);
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
  console.error("[ClientForge Codebase] MCP Server running - Building index...");

  // Build index in background
  analyzer.buildIndex().then(result => {
    console.error("[ClientForge Codebase] Index built:", result.filesIndexed, "files");
  }).catch(err => {
    console.error("[ClientForge Codebase] Index build error:", err.message);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
