# ClientForge CRM - Master Integration Setup Guide

**Complete Integration Setup for Elaria AI System**

**Date**: 2025-11-08
**Status**: Ready to Execute
**Estimated Time**: 30-45 minutes

---

## 🎯 What You're Setting Up

This guide will set up **5 major integration systems** for ClientForge CRM:

1. **MCP Servers** - Model Context Protocol servers (13 servers)
2. **LangChain** - Agent chains and workflows
3. **LlamaIndex** - RAG over entire codebase
4. **LM Studio Plugins** - Official plugins (RAG, code sandbox, etc.)
5. **Elaria Control Plane** - CLI tool (already working!)

**Benefits**:
- Use Elaria in LM Studio chat with full tool access
- Advanced AI agent capabilities
- Semantic code search
- Automated workflows
- Multi-agent orchestration

---

## ✅ Prerequisites

**Required**:
- [x] Windows 10/11
- [x] Node.js 18+ (`node --version`)
- [x] Python 3.9+ (`python --version`)
- [x] LM Studio 0.3.17+ (with a model loaded)
- [x] npm and pip available in PATH

**Optional but Recommended**:
- PostgreSQL running (for database features)
- MongoDB running (for logging features)
- Git installed (for git tools)

---

## 📦 Installation Order

We'll install in this order to handle dependencies properly:

```
1. MCP Servers       (15 min) - Foundation
2. LangChain         (10 min) - Agent framework
3. LlamaIndex        (15 min) - RAG system
4. LM Studio Plugins (5 min)  - UI integration
5. Test Everything   (10 min) - Verification
```

---

## 🚀 Step 1: MCP Servers Setup

### 1.1 Install Dependencies

Open PowerShell as Administrator:

```powershell
# Navigate to MCP servers directory
cd D:\clientforge-crm\agents\mcp\servers

# Initialize package.json (if doesn't exist)
npm init -y

# Install MCP SDK and dependencies
npm install @modelcontextprotocol/sdk glob simple-git chokidar fast-glob

# Verify installation
npm list --depth=0
```

**Expected Output**:
```
servers@1.0.0
├── @modelcontextprotocol/sdk@1.0.4
├── chokidar@3.5.3
├── fast-glob@3.3.2
├── glob@10.3.10
└── simple-git@3.25.0
```

### 1.2 Test MCP Server

```powershell
# Test filesystem server starts without errors
node filesystem-mcp-server.js
# Press Ctrl+C to stop (no output is normal)
```

### 1.3 Configure LM Studio

**File Location**: Settings → Developer → Edit mcp.json

**Paste this** (minimal config to test):

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

**Important**:
- Use forward slashes (`/`) not backslashes (`\`)
- No `timeout` property
- Save and restart LM Studio

### 1.4 Verify Connection

1. Restart LM Studio completely
2. Go to Settings → Developer → MCP Servers
3. Check: `clientforge-filesystem` shows as **Connected** ✅

**If it shows "Disconnected"**:
- Check `node --version` works in cmd
- Verify file path is correct
- Check LM Studio logs (Help → Show Logs)

### 1.5 Add More Servers

Once first server works, add others **one at a time**:

```json
{
  "mcpServers": {
    "clientforge-filesystem": { ... },
    "clientforge-git": {
      "command": "node",
      "args": [
        "D:/clientforge-crm/agents/mcp/servers/git-mcp-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:/clientforge-crm"
      }
    },
    "clientforge-codebase": {
      "command": "node",
      "args": [
        "D:/clientforge-crm/agents/mcp/servers/codebase-mcp-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:/clientforge-crm"
      }
    }
  }
}
```

**Available Servers** (13 total):
- filesystem-mcp-server.js
- git-mcp-server.js
- codebase-mcp-server.js
- testing-mcp-server.js
- build-mcp-server.js
- documentation-mcp-server.js
- rag-mcp-server.js
- security-mcp-server.js
- orchestrator-mcp-server.js
- context-pack-mcp-server.js
- ai-router-mcp-server.js
- env-manager-mcp-server.js
- api-tester-mcp-server.js

---

## 🔗 Step 2: LangChain Integration

### 2.1 Install Dependencies

```powershell
cd D:\clientforge-crm\agents\langchain-integration

# Install npm packages
npm install

# Check installation
npm list --depth=0
```

### 2.2 Configure Environment

Create `.env` file in `D:\clientforge-crm\agents\langchain-integration\`:

```env
# LM Studio API
LM_STUDIO_URL=http://localhost:1234/v1
LM_STUDIO_API_KEY=lm-studio

# ClientForge Databases (optional)
POSTGRES_URI=postgres://localhost:5432/clientforge
MONGODB_URI=mongodb://localhost:27017/clientforge?authSource=admin
ELASTICSEARCH_URL=http://localhost:9200
REDIS_URL=redis://localhost:6379

# Workspace
WORKSPACE_ROOT=D:/clientforge-crm
```

### 2.3 Test LangChain

```powershell
# Run test suite
npm test
```

**Expected**:
```
🔗 LangChain + LM Studio Integration Tests

✓ Test 1: LM Studio Connection - 24 models available
✓ Test 2: LangChain LLM Call
✓ Test 3: Streaming Response
✓ Test 4: Multi-turn Conversation
✓ Test 5: Tool Use Capability

📊 Test Results: 5/5 passed

✅ All tests passed! LangChain integration is ready.
```

---

## 🧠 Step 3: LlamaIndex Integration

### 3.1 Install Python Dependencies

```powershell
cd D:\clientforge-crm\agents\llamaindex-integration

# Create virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
pip list
```

### 3.2 Configure Environment

Create `.env` file in `D:\clientforge-crm\agents\llamaindex-integration\`:

```env
# LM Studio API
LM_STUDIO_URL=http://localhost:1234/v1
LM_STUDIO_API_KEY=lm-studio

# Embedding Model (local, auto-downloads)
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5

# Vector Store
CHROMA_PERSIST_DIR=D:/clientforge-crm/agents/rag-index/chroma

# Workspace
WORKSPACE_ROOT=D:/clientforge-crm

# Index Settings
MAX_FILES=5000
CHUNK_SIZE=512
CHUNK_OVERLAP=50
```

### 3.3 Build Index (Optional - Takes 5-10 min)

```powershell
# Build codebase index (optional but recommended)
python build_index.py
```

**Expected**:
```
Building LlamaIndex for ClientForge CRM...
├── Scanning files: 64,384 files found
├── Filtering to code files: 3,245 files
├── Creating chunks: 45,678 chunks
├── Generating embeddings: [████████████] 100%
├── Storing in ChromaDB: Complete
└── Index built successfully!
```

**Note**: Skip this for now if you want to continue quickly. You can build the index later.

### 3.4 Test LlamaIndex

```powershell
# Run test suite
python test_llamaindex.py
```

---

## 🔌 Step 4: LM Studio Official Plugins

### 4.1 Access Plugin Menu

1. Open LM Studio
2. Click **Discover** in the left sidebar
3. Go to **Plugins** tab

### 4.2 Install These Plugins

**Recommended Plugins**:

1. **rag-v1** ✅
   - Native RAG plugin
   - Click "Install"
   - No configuration needed

2. **js-code-sandbox** ✅
   - Safe JavaScript execution
   - Click "Install"
   - Allows Elaria to run code safely

3. **openai-compat-endpoint** ✅
   - Multi-provider support
   - Click "Install"
   - Configure with your OpenAI/Anthropic keys (optional)

4. **wikipedia** ✅
   - Wikipedia search
   - Click "Install"
   - No configuration needed

### 4.3 Verify Plugins

Go to: Settings → Developer → Plugins

Check all plugins show as **Active** ✅

---

## 🧪 Step 5: Test Everything

### 5.1 Test MCP in LM Studio Chat

1. **Start a new chat** in LM Studio
2. **Load a tool-capable model**: Qwen2.5-30B-A3B or Llama-3.1-70B
3. **Add system prompt**:

```
You are Elaria, an AI assistant with MCP tool capabilities.

Available tools:
- read_file(path): Read file contents
- list_files(directory, pattern): List files
- git_status(): Check git repository
- find_definition(symbol): Find code definitions

When asked to use these capabilities, CALL THE TOOLS.
```

4. **Test command**:

```
Read the README.md file from the ClientForge project
```

**Expected**:
- Model calls `read_file` tool
- Confirmation dialog appears
- You click "Allow"
- File contents returned
- Model summarizes the README

### 5.2 Test Elaria Control Plane (CLI)

```powershell
cd D:\clientforge-crm\agents\elaria-control-plane

# Interactive mode
node index.js

# Or single command
node index.js "List all TypeScript files in the backend"
```

**Expected**: 7/8 tests passing (already verified)

### 5.3 Test LangChain

```powershell
cd D:\clientforge-crm\agents\langchain-integration

npm test
```

**Expected**: 5/5 tests passing

### 5.4 Test LlamaIndex

```powershell
cd D:\clientforge-crm\agents\llamaindex-integration

# Activate venv first
.\venv\Scripts\activate

python test_llamaindex.py
```

---

## 📊 Success Checklist

### MCP Servers
- [ ] npm dependencies installed in `agents/mcp/servers/`
- [ ] Filesystem MCP server tested (runs without errors)
- [ ] LM Studio mcp.json configured
- [ ] At least 1 MCP server shows "Connected" in LM Studio
- [ ] Model can call tools in LM Studio chat

### LangChain
- [ ] npm dependencies installed
- [ ] .env file configured
- [ ] Test suite passes (5/5)

### LlamaIndex
- [ ] Python venv created
- [ ] pip dependencies installed
- [ ] .env file configured
- [ ] (Optional) Index built successfully

### LM Studio Plugins
- [ ] rag-v1 installed
- [ ] js-code-sandbox installed
- [ ] openai-compat-endpoint installed
- [ ] wikipedia installed

### Integration Tests
- [ ] Can read files via MCP in LM Studio
- [ ] Can use git tools in LM Studio
- [ ] Elaria Control Plane works
- [ ] LangChain connects to LM Studio
- [ ] (Optional) LlamaIndex can query codebase

---

## 🎯 What You Can Do Now

### In LM Studio Chat

```
"Read the authentication service code and explain how it works"
"What are the recent git commits?"
"Find all references to the User model"
"Run a security audit on the auth module"
```

### In Elaria Control Plane (CLI)

```powershell
node index.js "Analyze the entire backend directory structure"
node index.js "Find all TODO comments in TypeScript files"
node index.js "Generate a commit message for my changes"
```

### In LangChain

```javascript
// Code review chain
const review = await codeReviewChain.run({
  filePath: 'backend/services/deal-service.ts'
});

// Database query
const result = await dbQueryChain.run({
  query: 'Find deals about to close this month'
});
```

### In LlamaIndex

```python
# Semantic code search
response = engine.query("How does the email campaign system work?")

# SQL schema understanding
response = sql_engine.query("Show me all tables related to contacts")
```

---

## 🐛 Troubleshooting

### Issue: LM Studio mcp.json JSON Parsing Error

**Try these in order**:
1. Use forward slashes (`/`) not backslashes (`\`)
2. Remove `timeout` property
3. Test with only ONE server first
4. Check LM Studio version (must be 0.3.17+)
5. Check logs: Help → Show Logs

### Issue: MCP Server Shows "Disconnected"

1. Verify `node --version` works (v18+)
2. Check dependencies: `npm list` in servers directory
3. Test server manually: `node filesystem-mcp-server.js`
4. Check server file exists at exact path in mcp.json

### Issue: Model Doesn't Call Tools

1. Add explicit system prompt with tool descriptions
2. Use tool-capable model (Qwen2.5, Llama-3.1, Mistral)
3. Be explicit: "Use the read_file tool to..."
4. Lower temperature to 0.1-0.3

### Issue: LangChain Tests Fail

1. Verify LM Studio is running: http://localhost:1234/v1/models
2. Check model is loaded in LM Studio
3. Verify .env file has correct LM_STUDIO_URL
4. Check firewall isn't blocking localhost:1234

### Issue: LlamaIndex Index Build Fails

1. Check Python version (3.9+)
2. Verify venv is activated
3. Install missing dependencies: `pip install -r requirements.txt`
4. Reduce MAX_FILES in .env to 1000 for testing

---

## 📚 Additional Resources

### Documentation
- **MCP Setup**: [SETUP_LMSTUDIO_NOW.md](mcp/SETUP_LMSTUDIO_NOW.md)
- **LangChain**: [langchain-integration/README.md](langchain-integration/README.md)
- **LlamaIndex**: [llamaindex-integration/README.md](llamaindex-integration/README.md)
- **Elaria CLI**: [elaria-control-plane/README.md](elaria-control-plane/README.md)

### External Resources
- LM Studio Docs: https://lmstudio.ai/docs
- MCP Specification: https://modelcontextprotocol.io
- LangChain Docs: https://js.langchain.com
- LlamaIndex Docs: https://docs.llamaindex.ai

---

## 🚀 Next Steps

After setup is complete:

1. **Explore MCP Tools** - Try all 13 MCP servers
2. **Build Custom Chains** - Create LangChain workflows for your tasks
3. **Index Your Code** - Build full LlamaIndex for semantic search
4. **Integrate Everything** - Combine MCP + LangChain + LlamaIndex
5. **Automate Workflows** - Set up triggers and automation

---

## 🎉 You're Done!

You now have a fully integrated AI system with:

- ✅ 13 MCP servers connected to LM Studio
- ✅ LangChain for advanced agent chains
- ✅ LlamaIndex for semantic code search
- ✅ Official LM Studio plugins
- ✅ Elaria Control Plane CLI

**Ready to use Elaria in LM Studio with full autonomy!**

---

Built with ❤️ for ClientForge CRM
**Version**: 3.0.0
**Last Updated**: 2025-11-08
