# Complete LM Studio Integration Setup Guide

**Date**: 2025-11-08
**Status**: Ready to Execute

---

## 🚨 ISSUE: LM Studio mcp.json JSON Parsing Error

**Error**: `Bad escaped character in JSON at position 105`

**Root Cause**: LM Studio's JSON parser is likely:
1. Not accepting Windows backslash paths (even escaped)
2. Requiring the servers to be **already running** or dependencies installed
3. Having a bug with the specific JSON structure

**Solution Strategy**: Fix dependencies FIRST, then try minimal JSON config.

---

## ✅ Step 1: Install MCP Server Dependencies

**Why**: Your MCP servers require `@modelcontextprotocol/sdk` which isn't installed yet.

Open PowerShell as Administrator and run:

```powershell
# Navigate to MCP servers directory
cd D:\clientforge-crm\agents\mcp\servers

# Initialize package.json
npm init -y

# Install required dependencies
npm install @modelcontextprotocol/sdk glob simple-git chokidar fast-glob

# Verify installation
npm list --depth=0
```

**Expected Output**:
```
servers@1.0.0 D:\clientforge-crm\agents\mcp\servers
├── @modelcontextprotocol/sdk@1.0.4
├── chokidar@3.5.3
├── fast-glob@3.3.2
├── glob@10.3.10
└── simple-git@3.25.0
```

---

## ✅ Step 2: Test MCP Server Manually

Before adding to LM Studio, verify the filesystem server works:

```powershell
# Test the filesystem MCP server
node D:\clientforge-crm\agents\mcp\servers\filesystem-mcp-server.js
```

**Expected**: Server starts and waits for stdin (it won't print anything, that's normal)

Press `Ctrl+C` to stop it.

---

## ✅ Step 3: Configure LM Studio mcp.json (Minimal Version)

**File**: Created at `D:\clientforge-crm\agents\mcp\LM_STUDIO_MCP_CONFIG_MINIMAL.json`

**Copy this into LM Studio** (Settings → Developer → Edit mcp.json):

```json
{
  "mcpServers": {
    "clientforge-filesystem": {
      "command": "node",
      "args": [
        "D:/clientforge-crm/agents/mcp/servers/filesystem-mcp-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:/clientforge-crm"
      }
    }
  }
}
```

**Key Points**:
- Forward slashes (/) instead of backslashes (\)
- No `timeout` property
- Array format for `args`
- Only ONE server to test

---

## ✅ Step 4: Alternative - Use Environment Variables

If forward slashes still fail, try this:

```json
{
  "mcpServers": {
    "clientforge-filesystem": {
      "command": "node",
      "args": [
        "%USERPROFILE%/../../../clientforge-crm/agents/mcp/servers/filesystem-mcp-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "%USERPROFILE%/../../../clientforge-crm"
      }
    }
  }
}
```

---

## ✅ Step 5: Verify MCP Server Connection

After saving mcp.json:

1. **Close LM Studio completely**
2. **Restart LM Studio**
3. **Go to**: Settings → Developer → MCP Servers
4. **Check status**: Should show `clientforge-filesystem` as **Connected** ✅

---

## ✅ Step 6: Test in LM Studio Chat

**Load a tool-capable model**: Qwen2.5-30B-A3B, Llama-3.1-70B, or Mistral

**System Prompt**:
```
You are Elaria, an AI assistant with MCP tool capabilities.

Available tools:
- read_file(path): Read file contents
- list_files(directory, pattern): List files matching pattern
- search_files(query, pattern): Search for text in files

When asked to read files or analyze code, USE THE TOOLS.
```

**Test Command**:
```
Read the README.md file from D:/clientforge-crm
```

**Expected**:
1. Model calls `read_file` tool
2. Confirmation dialog appears (first time)
3. You click "Allow"
4. Tool executes
5. Model summarizes the README

---

## 🔧 Troubleshooting

### Issue: "Bad escaped character in JSON"

**Try these in order**:

1. **Remove all whitespace/newlines** - make JSON one line
2. **Use only forward slashes** (`/`)
3. **Use absolute paths without drive letters**: `/clientforge-crm/agents/...`
4. **Check LM Studio version**: Must be 0.3.17+
5. **Check LM Studio logs**: Help → Show Logs

### Issue: MCP Server Shows "Disconnected"

**Solutions**:
1. Verify `node --version` works in cmd (should be v18+)
2. Check dependencies are installed (`npm list` in servers directory)
3. Test server manually: `node filesystem-mcp-server.js`
4. Check server logs in LM Studio (Help → Show Logs)

### Issue: Model Doesn't Call Tools

**Solutions**:
1. Add explicit system prompt with tool descriptions
2. Use a tool-capable model (NOT base models)
3. Be explicit: "Use the read_file tool to..."
4. Lower temperature to 0.1-0.3

---

## 📦 Step 7: Add More MCP Servers (After First One Works)

Once `clientforge-filesystem` works, add others:

**Available Servers** (13 total):
- ✅ `filesystem-mcp-server.js` - File operations
- ✅ `git-mcp-server.js` - Git operations
- ✅ `codebase-mcp-server.js` - Code analysis
- ✅ `testing-mcp-server.js` - Test execution
- ✅ `build-mcp-server.js` - Build & CI/CD
- ✅ `documentation-mcp-server.js` - Docs generation
- ✅ `rag-mcp-server.js` - Semantic search
- ✅ `security-mcp-server.js` - Security audits
- ✅ `context-pack-mcp-server.js` - Context management
- ✅ `orchestrator-mcp-server.js` - Multi-agent coordination
- ✅ `ai-router-mcp-server.js` - Agent routing
- ✅ `env-manager-mcp-server.js` - Environment management
- ✅ `api-tester-mcp-server.js` - API testing

**Add them one at a time** to mcp.json, testing each before adding the next.

---

## 🚀 Next Steps: Additional Integrations

### A. Install LM Studio Official Plugins

**Access**: LM Studio → Discover menu

**Install These**:
1. **rag-v1** - Native RAG plugin
2. **js-code-sandbox** - Safe JavaScript execution
3. **openai-compat-endpoint** - Multi-provider support
4. **wikipedia** - Wikipedia search

### B. Set Up LangChain Integration

**Purpose**: Advanced agent chains and workflows

**Location**: `D:\clientforge-crm\agents\langchain-integration\`

**Features**:
- Document loaders for 4 databases
- Memory management
- Multi-tool chains
- LM Studio API integration

### C. Set Up LlamaIndex Integration

**Purpose**: Advanced RAG over entire codebase

**Location**: `D:\clientforge-crm\agents\llamaindex-integration\`

**Features**:
- Vector indexing of code
- SQL query engine
- Multi-modal retrieval
- LM Studio embedding API

---

## ✅ Success Checklist

- [ ] npm dependencies installed in `D:\clientforge-crm\agents\mcp\servers\`
- [ ] Filesystem MCP server tested manually (runs without errors)
- [ ] LM Studio mcp.json saved without JSON parsing error
- [ ] LM Studio shows `clientforge-filesystem` as **Connected**
- [ ] Model successfully calls `read_file` tool in chat
- [ ] Additional MCP servers added and connected
- [ ] LM Studio official plugins installed
- [ ] LangChain integration set up
- [ ] LlamaIndex integration set up

---

## 🎯 Current Status

**Working**:
- ✅ Elaria Control Plane (CLI) - 7/8 tests passing
- ✅ 13 MCP server files created
- ✅ Configuration files ready

**Blocked**:
- ❌ LM Studio mcp.json JSON parsing error
- ⏳ Need to install npm dependencies first

**Next Action**:
1. **Run**: `npm install` in `D:\clientforge-crm\agents\mcp\servers\`
2. **Test**: `node filesystem-mcp-server.js`
3. **Configure**: Paste minimal JSON into LM Studio
4. **Verify**: Check connection status

---

Built with ❤️ for ClientForge CRM
**Version**: 2.0.0
**Last Updated**: 2025-11-08
