# Set Up LM Studio MCP in 2 Minutes ⚡

**You have 24 MCP servers ready!** Let's connect them to LM Studio right now.

---

## ✅ Step 1: Open LM Studio Configuration

1. **Open LM Studio** (if not already running)
2. **Click**: Settings (gear icon) → Developer
3. **Click**: **"Edit mcp.json"**

---

## 📋 Step 2: Copy This Configuration

**File Location (for reference)**: `D:\clientforge-crm\agents\mcp\LM_STUDIO_MCP_CONFIG.json`

**Copy and paste this into LM Studio's mcp.json editor**:

```json
{
  "mcpServers": {
    "clientforge-filesystem": {
      "command": "node",
      "args": ["D:\\clientforge-crm\\agents\\mcp\\servers\\filesystem-mcp-server.js"],
      "env": {
        "WORKSPACE_ROOT": "D:\\clientforge-crm"
      },
      "timeout": 30000
    },
    "clientforge-git": {
      "command": "node",
      "args": ["D:\\clientforge-crm\\agents\\mcp\\servers\\git-mcp-server.js"],
      "env": {
        "WORKSPACE_ROOT": "D:\\clientforge-crm"
      },
      "timeout": 15000
    },
    "clientforge-codebase": {
      "command": "node",
      "args": ["D:\\clientforge-crm\\agents\\mcp\\servers\\codebase-mcp-server.js"],
      "env": {
        "WORKSPACE_ROOT": "D:\\clientforge-crm"
      },
      "timeout": 45000
    }
  }
}
```

---

## 💾 Step 3: Save and Restart

1. **Save** the mcp.json file (Ctrl+S in LM Studio)
2. **Close LM Studio** completely (all windows)
3. **Restart LM Studio**
4. **Wait 10 seconds** for servers to initialize

---

## 🧪 Step 4: Verify MCP Servers Are Connected

### Method 1: Check in LM Studio UI

1. Go to: **Settings → Developer → MCP Servers**
2. You should see:
   - ✅ `clientforge-filesystem` - **Connected**
   - ✅ `clientforge-git` - **Connected**
   - ✅ `clientforge-codebase` - **Connected**

### Method 2: Check in Chat

Start a new chat and type:
```
What tools do you have available?
```

The model should mention file operations, git, and codebase analysis tools.

---

## 🚀 Step 5: Test It!

### Test 1: Read a File

**In LM Studio chat, type**:
```
Read the README.md file from the ClientForge project
```

**What should happen**:
1. Model calls `read_file` tool
2. LM Studio shows **confirmation dialog** (first time)
3. You click **Allow**
4. Tool reads the file
5. Model summarizes the README

### Test 2: Check Git Status

**Type**:
```
What's the current git status of the ClientForge project?
```

**Expected**: Model calls `git_status` tool and shows you current branch, modified files, etc.

### Test 3: Analyze Code

**Type**:
```
Find the definition of the User interface in the codebase
```

**Expected**: Model uses `find_definition` from codebase server

---

## 🎯 What Tools Are Available

### `clientforge-filesystem` (File Operations)
- `read_file` - Read any file
- `write_file` - Write to files
- `list_directory` - List directory contents
- `search_files` - Search for text in files
- `workspace_tree` - Show project structure

### `clientforge-git` (Git Operations)
- `git_status` - Current repository status
- `git_diff` - Show changes
- `git_log` - Commit history
- `git_branch` - Branch information
- `generate_commit_message` - AI-generated commit messages

### `clientforge-codebase` (Code Analysis)
- `find_definition` - Find where something is defined
- `find_references` - Find all usages
- `dependency_graph` - Show dependencies
- `type_hierarchy` - TypeScript type relationships
- `breaking_change_analysis` - Detect breaking changes

---

## 🐛 Troubleshooting

### Issue: MCP Servers Show "Disconnected"

**Solution**:
1. Make sure `node` is in your PATH: Open cmd and run `node --version`
2. Check file paths are correct (they should be if you copied exactly)
3. Try restarting LM Studio again
4. Check LM Studio logs: Help → Show Logs

### Issue: Model Doesn't Call Tools

**Solution**:
1. **Add a system prompt**:
```
You are Elaria, an AI assistant with access to file operations, git, and codebase analysis tools.

When asked to read files, check git status, or analyze code, USE THE TOOLS.

Available tools:
- read_file: Read file contents
- git_status: Check git repository
- find_definition: Find code definitions

IMPORTANT: Actually call the tools instead of saying "I don't have access".
```

2. **Use a tool-capable model**: Qwen2.5-30B-A3B, Llama-3.1-70B, Mistral (NOT base models)

3. **Be explicit**: "Use the read_file tool to read..."

### Issue: Confirmation Dialog Doesn't Appear

**This is normal!** After the first approval, LM Studio may auto-approve subsequent tool calls.

---

## 📦 Want More MCP Servers?

You have **21 more servers** ready! Add them to mcp.json:

```json
{
  "mcpServers": {
    // ... existing 3 servers ...

    "clientforge-testing": {
      "command": "node",
      "args": ["D:\\clientforge-crm\\agents\\mcp\\servers\\testing-mcp-server.js"],
      "timeout": 60000
    },
    "clientforge-build": {
      "command": "node",
      "args": ["D:\\clientforge-crm\\agents\\mcp\\servers\\build-mcp-server.js"],
      "timeout": 120000
    },
    "clientforge-documentation": {
      "command": "node",
      "args": ["D:\\clientforge-crm\\agents\\mcp\\servers\\documentation-mcp-server.js"],
      "timeout": 30000
    }
  }
}
```

**Available servers**:
- `testing-mcp-server.js` - Run tests, check coverage
- `build-mcp-server.js` - Build, lint, typecheck
- `documentation-mcp-server.js` - Generate docs
- `rag-mcp-server.js` - Semantic search
- `security-mcp-server.js` - Security audits
- `orchestrator-mcp-server.js` - Multi-agent coordination
- And 15 more!

---

## ✅ Success Checklist

After setup, verify:

- [ ] LM Studio shows 3 MCP servers as "Connected"
- [ ] Model can read files when asked
- [ ] Model can check git status
- [ ] Model can find code definitions
- [ ] Tools execute and return results

---

## 🎉 You're Done!

Now you can chat with Elaria in LM Studio and she'll use tools automatically!

**Try this**:
```
Elaria, analyze the ClientForge backend directory structure and tell me what the main services are
```

She'll use:
1. `list_directory` to see backend structure
2. `read_file` to examine key files
3. `find_definition` to locate service classes
4. Synthesize everything into a comprehensive answer

---

**Need help?** See: [LM_STUDIO_MCP_SETUP.md](../elaria-control-plane/LM_STUDIO_MCP_SETUP.md)

**Version**: 1.0.0
**Last Updated**: 2025-11-08
