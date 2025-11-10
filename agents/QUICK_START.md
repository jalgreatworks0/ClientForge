# ClientForge CRM - Quick Start Guide

**Get Elaria Running in 5 Minutes** ⚡

---

## ✅ MCP Servers - CONFIGURED!

The PowerShell script already configured LM Studio with the filesystem MCP server.

**What to do NOW**:

1. **Close LM Studio** (all windows)
2. **Restart LM Studio**
3. **Check connection**: Settings → Developer → MCP Servers
4. **Look for**: `clientforge-filesystem` showing as **Connected** ✅

---

## 🧪 Test MCP in LM Studio

### Step 1: Load a Model

Load one of these tool-capable models:
- Qwen2.5-30B-A3B (recommended)
- Llama-3.1-70B
- Mistral-7B

### Step 2: Add System Prompt

Click **System Prompt** and paste:

```
You are Elaria, an AI assistant with MCP tool capabilities for ClientForge CRM.

Available tools:
- read_file(path): Read file contents
- list_files(directory, pattern): List files matching pattern
- search_files(query, pattern): Search for text in files
- workspace_tree(): Show directory structure

When asked to read files or analyze code, USE THE TOOLS. Do not make up file contents.
```

### Step 3: Test Command

Type in chat:

```
Read the README.md file from D:/clientforge-crm
```

**Expected**:
1. Model calls `read_file` tool
2. Confirmation dialog appears
3. Click "Allow"
4. File contents returned
5. Model summarizes the README

---

## 🚀 Use Elaria CLI (Already Works!)

While testing MCP, you can use the CLI version:

```powershell
cd D:\clientforge-crm\agents\elaria-control-plane

# Interactive mode
node index.js

# Single command
node index.js "List all TypeScript services in the backend"
```

---

## 📦 Add All 13 MCP Servers

Once the first server works, add all servers:

```powershell
powershell -ExecutionPolicy Bypass -File "D:\clientforge-crm\agents\mcp\configure-all-servers.ps1"
```

Then restart LM Studio.

**All 13 servers**:
1. filesystem - File operations
2. git - Git operations
3. codebase - Code analysis
4. testing - Run tests
5. build - Build & CI/CD
6. documentation - Generate docs
7. rag - Semantic search
8. security - Security audits
9. orchestrator - Multi-agent coordination
10. context-pack - Context management
11. ai-router - Agent routing
12. env-manager - Environment management
13. api-tester - API testing

---

## 🔗 Install LangChain (Optional)

```powershell
cd D:\clientforge-crm\agents\langchain-integration
npm install
# Create .env file (see README.md)
npm test
```

**Benefits**: Code review chains, database queries, doc generation

---

## 🧠 Install LlamaIndex (Optional)

```powershell
cd D:\clientforge-crm\agents\llamaindex-integration
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
# Create .env file (see README.md)
```

**Benefits**: Semantic code search, RAG over 64,000+ files

---

## 🎯 Example Commands

### In LM Studio Chat (once MCP works)

```
"Read the authentication service and explain how it works"
"What are the recent git commits?"
"Find all database queries in the contact service"
"List all API endpoints in the backend"
"Run a security audit on the payment processing code"
```

### In Elaria CLI (works now)

```powershell
node index.js "Find all TODO comments in TypeScript files"
node index.js "Generate a commit message for my changes"
node index.js "Analyze the entire backend structure"
node index.js "Search for all uses of the User model"
```

---

## 📚 Full Documentation

- **Complete Setup**: [MASTER_INTEGRATION_SETUP.md](MASTER_INTEGRATION_SETUP.md)
- **Summary**: [INTEGRATION_SUMMARY.md](INTEGRATION_SUMMARY.md)
- **MCP Guide**: [mcp/COMPLETE_SETUP_GUIDE.md](mcp/COMPLETE_SETUP_GUIDE.md)
- **LangChain**: [langchain-integration/README.md](langchain-integration/README.md)
- **LlamaIndex**: [llamaindex-integration/README.md](llamaindex-integration/README.md)

---

## 🐛 Troubleshooting

### MCP Server Shows "Disconnected"

```powershell
# Check if node works
node --version

# Test server manually
cd D:\clientforge-crm\agents\mcp\servers
node filesystem-mcp-server.js
# Ctrl+C to stop (no output is normal)

# Check LM Studio logs
# LM Studio: Help → Show Logs
```

### Model Doesn't Call Tools

1. Make sure you added the system prompt above
2. Use a tool-capable model (Qwen2.5, Llama-3.1, Mistral)
3. Be explicit: "Use the read_file tool to read..."
4. Lower temperature to 0.2

### JSON Parsing Error in LM Studio

**Don't edit manually!** Use the PowerShell scripts:

```powershell
# Single server
powershell -ExecutionPolicy Bypass -File "D:\clientforge-crm\agents\mcp\configure-lmstudio.ps1"

# All 13 servers
powershell -ExecutionPolicy Bypass -File "D:\clientforge-crm\agents\mcp\configure-all-servers.ps1"
```

---

## ✅ Success Checklist

- [x] MCP config written to LM Studio (done via PowerShell script!)
- [ ] LM Studio restarted
- [ ] Filesystem server shows "Connected"
- [ ] Model can call tools in chat
- [ ] Elaria CLI tested

---

**Ready to use Elaria with full autonomy!** 🎉

Built with ❤️ for ClientForge CRM
**Last Updated**: 2025-11-08
