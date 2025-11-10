#!/usr/bin/env node

/**
 * ClientForge Documentation MCP Server
 * Full MCP Protocol Implementation for LM Studio
 * Documentation generation, README management, and JSDoc
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

const DOCS_ROOT = process.env.DOCS_ROOT || 'D:\\clientforge-crm\\docs';
const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';

// Documentation engine
class DocumentationEngine {
  async listDocs() {
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
    const files = await glob('**/*.{ts,tsx,js,jsx}', {
      cwd: WORKSPACE_ROOT,
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
    });

    let documented = 0;
    let undocumented = 0;

    for (const file of files.slice(0, 50)) {
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

const docEngine = new DocumentationEngine();

const server = new Server(
  {
    name: "clientforge-documentation",
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
        name: "list_docs",
        description: "List all documentation files",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "read_doc",
        description: "Read a documentation file",
        inputSchema: {
          type: "object",
          properties: {
            doc: {
              type: "string",
              description: "Relative path to documentation file"
            }
          },
          required: ["doc"]
        }
      },
      {
        name: "update_readme",
        description: "Update a section in README.md",
        inputSchema: {
          type: "object",
          properties: {
            section: {
              type: "string",
              description: "Section name to update"
            },
            content: {
              type: "string",
              description: "New content for the section"
            }
          },
          required: ["section", "content"]
        }
      },
      {
        name: "generate_jsdoc",
        description: "Analyze file and suggest JSDoc documentation",
        inputSchema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description: "Relative path to source file"
            }
          },
          required: ["file"]
        }
      },
      {
        name: "check_doc_coverage",
        description: "Check documentation coverage across codebase",
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
      case "list_docs":
        result = await docEngine.listDocs();
        break;

      case "read_doc":
        result = await docEngine.readDoc(args.doc);
        break;

      case "update_readme":
        result = await docEngine.updateReadme(args.section, args.content);
        break;

      case "generate_jsdoc":
        result = await docEngine.generateJSDoc(args.file);
        break;

      case "check_doc_coverage":
        result = await docEngine.checkDocCoverage();
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
  console.error("[ClientForge Documentation] MCP Server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
