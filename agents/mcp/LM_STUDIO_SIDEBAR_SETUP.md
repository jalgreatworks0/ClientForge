# LM Studio Sidebar Setup Guide

**Status**: ✅ **ALL 13 MCP SERVERS INSTALLED**
**Configuration File**: `C:\Users\ScrollForge\AppData\Roaming\LM Studio\mcp-config.json`

---

## 📋 Installed MCP Servers (13 Total)

### External Gateway
1. **MCP_DOCKER** - Docker MCP Gateway

### ClientForge Servers (12)
2. **clientforge-filesystem** - File operations with auto-staging
3. **clientforge-database** - PostgreSQL, MongoDB, Elasticsearch, Redis
4. **clientforge-codebase** - TypeScript code analysis
5. **clientforge-testing** - Jest test runner
6. **clientforge-git** - Git operations
7. **clientforge-documentation** - Doc generation
8. **clientforge-build** - CI gate (type/lint/test/build)
9. **clientforge-rag** - Semantic search
10. **clientforge-orchestrator** - Multi-agent coordination
11. **clientforge-security** - Security scanning
12. **clientforge-logger** - MongoDB logging
13. **clientforge-context-pack** - 120KB budget context loading

---

## 🚀 How to Enable in LM Studio

### Step 1: Restart LM Studio
Close and reopen LM Studio to load the new configuration.

### Step 2: Open Developer Settings
1. Click **Settings** (gear icon)
2. Go to **Developer** tab
3. Scroll to **Model Context Protocol** section

### Step 3: Enable Servers
You should see all 13 servers listed. Toggle them **ON**:

```
☑️ MCP_DOCKER
☑️ clientforge-filesystem
☑️ clientforge-database
☑️ clientforge-codebase
☑️ clientforge-testing
☑️ clientforge-git
☑️ clientforge-documentation
☑️ clientforge-build
☑️ clientforge-rag
☑️ clientforge-orchestrator
☑️ clientforge-security
☑️ clientforge-logger
☑️ clientforge-context-pack
```

### Step 4: Verify Connection
After enabling, you should see:
- **Green indicators** next to each server name
- **Status: Connected** when hovering over them

---

## 🔍 Troubleshooting

### Server Not Appearing?
**Solution**: Check the config file exists:
```powershell
cat "C:\Users\ScrollForge\AppData\Roaming\LM Studio\mcp-config.json"
```

### Server Showing as Offline?
**Solution**: Verify Node.js is installed:
```powershell
node --version
# Should show: v22.21.0 or higher
```

### Server Failing to Start?
**Solution**: Test the server manually:
```powershell
# Example: Test filesystem server
echo '{"id":"test-1","method":"read_file","params":{"relativePath":"README.md"}}' | node D:\clientforge-crm\agents\mcp\servers\filesystem-server.js
```

### Dependencies Missing?
**Solution**: Reinstall npm packages:
```powershell
cd D:\clientforge-crm\agents\mcp\servers
npm install
```

---

## 📱 Using MCP Servers with Elaria

### Test Connection
Once all servers are enabled, start a chat with Elaria:

```
You: CRM-INIT
```

Expected response:
```
Elaria: ✓ All 13 MCP servers connected
✓ README.md loaded (PRIORITY 1)
✓ CHANGELOG.md loaded
✓ Context packs available (7 packs)

Workspace: D:/clientforge-crm
Budget: 120KB available
Status: READY FOR OPERATION

ELARIA-BOOTSTRAP-COMPLETE
```

### Example Commands

**Read a file**:
```
Read backend/services/contact-service.ts
```

**Check database health**:
```
Check database health status
```

**Find code references**:
```
Find all references to ContactService
```

**Run tests**:
```
Run tests with coverage
```

**Git status**:
```
Show git status
```

**Security scan**:
```
Scan workspace for security issues
```

**Load context pack**:
```
Load the crm_pack context
```

---

## 🔧 Server Configuration Details

### Environment Variables

Each server uses these environment variables (already configured):

**clientforge-filesystem**:
- `WORKSPACE_ROOT`: D:\clientforge-crm
- `STAGING_ROOT`: D:\clientforge-crm\_staging

**clientforge-database**:
- `POSTGRES_URL`: postgres://localhost:5432/clientforge
- `MONGODB_URL`: mongodb://localhost:27017/clientforge?authSource=admin
- `ELASTICSEARCH_URL`: http://localhost:9200
- `REDIS_URL`: redis://localhost:6379

**clientforge-codebase**:
- `WORKSPACE_ROOT`: D:\clientforge-crm

**clientforge-testing**:
- `WORKSPACE_ROOT`: D:\clientforge-crm
- `TEST_RUNNER`: jest

**clientforge-git**:
- `GIT_REPO`: D:\clientforge-crm

**clientforge-documentation**:
- `DOCS_ROOT`: D:\clientforge-crm\docs

**clientforge-build**:
- `WORKSPACE_ROOT`: D:\clientforge-crm
- `SCRIPTS_ROOT`: D:\clientforge-crm\scripts

**clientforge-rag**:
- `RAG_ENDPOINT`: http://127.0.0.1:8920
- `INDEX_PATH`: D:\clientforge-crm\agents\rag-index

**clientforge-orchestrator**:
- `ORCHESTRATOR_PORT`: 8979

**clientforge-security**:
- `WORKSPACE_ROOT`: D:\clientforge-crm

**clientforge-logger**:
- `MONGODB_URL`: mongodb://localhost:27017/clientforge?authSource=admin

**clientforge-context-pack**:
- `WORKSPACE_ROOT`: D:\clientforge-crm
- `PACKS_FILE`: D:\clientforge-crm\docs\claude\11_CONTEXT_PACKS.md
- `BUDGET_LIMIT_KB`: 120

---

## 📊 Server Status Indicators

In LM Studio sidebar, you'll see these status indicators:

| Indicator | Meaning |
|-----------|---------|
| 🟢 Green | Server connected and ready |
| 🟡 Yellow | Server starting up |
| 🔴 Red | Server failed to start |
| ⚪ Gray | Server disabled |

---

## 🎯 Quick Actions in Sidebar

Once enabled, you can:

1. **Toggle servers on/off** - Click the switch next to each server name
2. **View logs** - Click server name to see startup logs
3. **Test connection** - Hover to see connection status
4. **Restart server** - Toggle off then on to restart

---

## 💡 Tips for Best Performance

1. **Keep frequently-used servers enabled**:
   - clientforge-filesystem (always needed)
   - clientforge-codebase (for code intelligence)
   - clientforge-context-pack (for smart loading)

2. **Enable on-demand**:
   - clientforge-testing (when running tests)
   - clientforge-build (when building)
   - clientforge-git (when committing)

3. **Database servers require running services**:
   - Start PostgreSQL before enabling clientforge-database
   - Start MongoDB before enabling clientforge-logger
   - clientforge-database will show errors if DBs aren't running

4. **Memory usage**:
   - Each server uses ~10-50MB
   - All 13 servers: ~300-500MB total
   - With Qwen2.5-30B: ~17-20GB VRAM

---

## 🔄 Updating Configuration

If you need to modify the configuration:

1. **Edit the config file**:
   ```powershell
   notepad "C:\Users\ScrollForge\AppData\Roaming\LM Studio\mcp-config.json"
   ```

2. **Restart LM Studio** for changes to take effect

3. **Re-enable servers** in Developer settings

---

## ✅ Verification Checklist

Before using Elaria, verify:

- [ ] LM Studio is running
- [ ] All 13 servers appear in Developer → MCP settings
- [ ] Servers are toggled **ON** (green)
- [ ] Node.js v22.21.0+ is installed
- [ ] npm dependencies installed (`D:\clientforge-crm\agents\mcp\servers\node_modules` exists)
- [ ] Qwen2.5-30B model downloaded
- [ ] Elaria system prompt is set
- [ ] Test with `CRM-INIT` command succeeds

---

## 📚 Additional Resources

- **Full Server Details**: [FINAL_INSTALLATION_REPORT.md](D:\clientforge-crm\agents\mcp\FINAL_INSTALLATION_REPORT.md)
- **Daily Usage Guide**: [ELARIA_QUICK_REFERENCE.md](D:\clientforge-crm\agents\mcp\ELARIA_QUICK_REFERENCE.md)
- **System Prompt**: [ELARIA_COMMAND_CENTER.md](D:\clientforge-crm\docs\ai\ELARIA_COMMAND_CENTER.md)
- **Technical Specs**: [MCP_INSTALLATION_STATUS.md](D:\clientforge-crm\agents\mcp\MCP_INSTALLATION_STATUS.md)

---

**Configuration Path**: `C:\Users\ScrollForge\AppData\Roaming\LM Studio\mcp-config.json`
**Installation Date**: 2025-11-07
**Verification Code**: `MCP-SIDEBAR-INTEGRATION-COMPLETE` ✅
