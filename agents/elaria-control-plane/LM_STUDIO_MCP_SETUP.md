# LM Studio MCP Setup Guide - Working Configuration

**Based on**: Web research 2025-11-08
**LM Studio Version Required**: 0.3.17+
**Status**: ✅ **MCP DOES WORK** - Follow this guide exactly

---

## 🎯 What This Enables

Use Elaria **directly in LM Studio's chat interface** without the CLI:

```
You (in LM Studio chat): "Read the ClientForge README.md file"
Elaria: *calls read_file tool*
        *analyzes content*
        "The ClientForge CRM is an enterprise..."
```

---

## ✅ Prerequisites Checklist

- [ ] LM Studio version **0.3.17 or higher** installed
- [ ] A **tool-capable model** loaded (Qwen2.5-30B-A3B, Llama-3.1-70B, Mistral)
- [ ] Node.js in system PATH (`node --version` works in cmd)
- [ ] MCP servers at `D:\clientforge-crm\agents\mcp\servers\` exist

---

## 📝 Step 1: Configure LM Studio mcp.json

### Option A: Via LM Studio UI (Recommended)

1. **Open LM Studio**
2. **Go to**: Settings → Developer → **Edit mcp.json**
3. **Paste this configuration**:

```json
{
  "mcpServers": {
    "elaria-filesystem": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\filesystem-mcp-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:\\clientforge-crm"
      },
      "timeout": 30000
    }
  }
}
```

4. **Save** (LM Studio auto-loads servers)
5. **Close and restart LM Studio**

### Option B: Manual File Creation

**File location**: `C:\Users\ScrollForge\.lmstudio\mcp.json`

Create the file with the same JSON content above.

---

## 🔧 Step 2: Verify MCP Server is Ready

Check that your MCP server exists:

```powershell
# Test if server file exists
Test-Path "D:\clientforge-crm\agents\mcp\servers\filesystem-mcp-server.js"

# Should return: True
```

If **False**, you need to create the MCP server (see Step 4 below).

---

## 🧪 Step 3: Test in LM Studio Chat

### A. Start a New Chat

1. **Open LM Studio**
2. **Start a new chat**
3. **Load your model** (Qwen2.5-30B-A3B recommended)

### B. Add System Prompt

Click **System Prompt** and add:

```
You are Elaria, an AI assistant with tool execution capabilities.

When asked to read files, analyze code, or access the filesystem, use the read_file tool.

CRITICAL: When you need to use a tool, you MUST call it. Do not make up file contents.

Available tools:
- read_file(path): Read file from disk
- list_files(directory, pattern): List files matching pattern
- search_files(query, pattern): Search for text in files
```

### C. Test Tool Call

In chat, type:

```
Read the file D:\clientforge-crm\README.md
```

**Expected behavior**:
1. Model generates a tool call
2. LM Studio shows **confirmation dialog**
3. You approve the tool call
4. Tool executes
5. Results return to model
6. Model summarizes the file

---

## 🐛 Step 4: If MCP Server Doesn't Exist

If the filesystem-mcp-server.js doesn't exist yet, create it:

**File**: `D:\clientforge-crm\agents\mcp\servers\filesystem-mcp-server.js`

```javascript
#!/usr/bin/env node

/**
 * Elaria Filesystem MCP Server for LM Studio
 * Provides file operations with proper MCP protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import { glob } from 'glob';
import path from 'path';

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || 'D:\\clientforge-crm';

// Create MCP server
const server = new Server(
  {
    name: 'elaria-filesystem',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_file',
        description: 'Read contents of a file from disk',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Absolute or relative file path',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'list_files',
        description: 'List files in a directory matching a pattern',
        inputSchema: {
          type: 'object',
          properties: {
            directory: {
              type: 'string',
              description: 'Directory path (default: workspace root)',
            },
            pattern: {
              type: 'string',
              description: 'Glob pattern (e.g., **/*.ts)',
            },
          },
        },
      },
      {
        name: 'search_files',
        description: 'Search for text across files',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Text to search for',
            },
            pattern: {
              type: 'string',
              description: 'File pattern to search (default: **/*.{ts,js})',
            },
          },
          required: ['query'],
        },
      },
    ],
  };
});

/**
 * Execute tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'read_file') {
      const filePath = path.isAbsolute(args.path)
        ? args.path
        : path.join(WORKSPACE_ROOT, args.path);

      const content = await fs.readFile(filePath, 'utf-8');

      return {
        content: [
          {
            type: 'text',
            text: content.slice(0, 50000), // Limit to 50KB
          },
        ],
      };
    }

    if (name === 'list_files') {
      const directory = args.directory || WORKSPACE_ROOT;
      const pattern = args.pattern || '**/*';

      const files = await glob(pattern, {
        cwd: directory,
        nodir: true,
        ignore: ['node_modules/**', '.git/**', 'dist/**'],
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                files: files.slice(0, 100),
                count: files.length,
                directory,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    if (name === 'search_files') {
      const query = args.query;
      const pattern = args.pattern || '**/*.{ts,js,tsx,jsx}';

      const files = await glob(pattern, {
        cwd: WORKSPACE_ROOT,
        nodir: true,
        ignore: ['node_modules/**', '.git/**', 'dist/**'],
      });

      const matches = [];
      for (const file of files.slice(0, 50)) {
        const fullPath = path.join(WORKSPACE_ROOT, file);
        const content = await fs.readFile(fullPath, 'utf-8');

        if (content.includes(query)) {
          const lines = content.split('\n');
          const matchingLines = lines
            .map((line, index) => ({ line, number: index + 1 }))
            .filter(({ line }) => line.includes(query))
            .slice(0, 5);

          matches.push({
            file,
            matches: matchingLines,
          });
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                query,
                matches,
                filesSearched: files.length,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // Unknown tool
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `Unknown tool: ${name}`,
          }),
        },
      ],
      isError: true,
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
          }),
        },
      ],
      isError: true,
    };
  }
});

/**
 * Start MCP server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr (stdout is for MCP protocol)
  console.error('[Elaria Filesystem] MCP Server started');
  console.error(`[Workspace] ${WORKSPACE_ROOT}`);
}

main().catch((error) => {
  console.error('[Elaria Filesystem] Fatal error:', error);
  process.exit(1);
});
```

---

## 🚀 Step 5: Test the Complete Setup

### Test 1: Check MCP Server is Recognized

1. **Restart LM Studio**
2. **Go to**: Settings → Developer → MCP Servers
3. **Verify**: `elaria-filesystem` shows as **Connected**

### Test 2: Simple File Read

In chat:
```
Read the package.json file
```

Model should call `read_file` tool.

### Test 3: List Files

In chat:
```
List all TypeScript files in the backend
```

Model should call `list_files` tool with pattern `backend/**/*.ts`.

### Test 4: Search

In chat:
```
Search for the word "database" in TypeScript files
```

Model should call `search_files` tool.

---

## 🐛 Troubleshooting

### Issue 1: MCP Server Not Connecting

**Symptom**: Server shows as "Disconnected" in LM Studio

**Solutions**:
1. Check `node --version` works in cmd
2. Verify file path in mcp.json is correct
3. Check server file exists: `D:\clientforge-crm\agents\mcp\servers\filesystem-mcp-server.js`
4. Restart LM Studio completely (close all windows)
5. Check LM Studio logs (Help → Show Logs)

### Issue 2: Model Doesn't Call Tools

**Symptom**: Model responds with "I don't have access to files"

**Solutions**:
1. **Add system prompt** with tool descriptions
2. **Use a tool-capable model** (Qwen2.5, Llama-3.1, not base models)
3. **Be explicit**: "Use the read_file tool to read..."
4. **Lower temperature** to 0.1-0.3

### Issue 3: Tool Call Times Out

**Symptom**: "Request timed out" error

**Solutions**:
1. Increase `timeout` in mcp.json (default 30000 = 30s)
2. For slow operations, use `"timeout": 60000` (60s)
3. Reduce file sizes being read/searched

### Issue 4: Tool Confirmation Dialog Doesn't Appear

**Symptom**: Tool executes without confirmation

**Solutions**:
1. This is actually OK - LM Studio may auto-approve after first approval
2. Check Settings → Security → MCP Tool Approval
3. Re-enable confirmations if needed

---

## 📊 Comparison: CLI vs LM Studio MCP

| Feature | CLI Control Plane | LM Studio MCP |
|---------|-------------------|---------------|
| **Setup** | `npm install`, `node index.js` | Configure mcp.json, restart LM Studio |
| **Interface** | Terminal prompts | LM Studio chat |
| **Tool Visibility** | Full logs every step | Confirmation dialogs |
| **Debugging** | Easy (see all calls) | Medium (check logs) |
| **User Experience** | CLI-based | Chat-based (better UX) |
| **Reliability** | ✅ Proven (7/8 tests) | ⚠️ Requires correct setup |
| **Multi-tool** | Built-in loop | Requires model support |

---

## 🎯 Recommended Approach

### Use BOTH:

1. **LM Studio MCP** - For interactive chat-based work
   - Great for quick questions
   - Better user experience
   - Natural conversation flow

2. **CLI Control Plane** - For complex automation
   - Scripting and automation
   - Debugging tool execution
   - When you need logs

---

## 📚 Additional Resources

**LM Studio Official Docs**:
- MCP Setup: https://lmstudio.ai/docs/app/plugins/mcp
- Tool Use Guide: https://lmstudio.ai/blog/lmstudio-v0.3.17

**Model Context Protocol**:
- Specification: https://modelcontextprotocol.io
- SDK: https://github.com/modelcontextprotocol/typescript-sdk

**Troubleshooting**:
- Bug Tracker: https://github.com/lmstudio-ai/lmstudio-bug-tracker/issues
- Known Issues: #727 (timeout), #755 (session expiration)

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ MCP server shows "Connected" in LM Studio
2. ✅ Model calls tools when asked
3. ✅ Confirmation dialog appears (first time)
4. ✅ Tool results appear in chat
5. ✅ Model uses results to answer your question

---

**Status**: Ready to configure
**Next Step**: Follow Step 1 to create mcp.json
**Estimated Setup Time**: 5-10 minutes

Built with ❤️ for ClientForge CRM
**Version**: 1.0.0
**Last Updated**: 2025-11-08
