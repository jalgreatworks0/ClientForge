# Elaria Command Center - Quick Start Guide

## ✅ Installation Complete!

All files have been created in: `D:\ClientForge\03_BOTS\elaria_command_center\`

---

## 📋 What Was Installed

### Core Scripts
- ✅ `activate_elaria_simple.ps1` - Quick activation check
- ✅ `test_lmstudio_responses.ps1` - Test Responses API
- ✅ `test_lmstudio_mcp.ps1` - Test MCP tools integration
- ✅ `elaria_powershell_examples.ps1` - Interactive examples
- ✅ `elaria_curl_examples.sh` - cURL reference

### Configuration
- ✅ `lmstudio_config_example.json` - MCP server reference
- ✅ `README.md` - Full documentation
- ✅ `QUICKSTART.md` - This file

### Still Needed
- ⏳ `system_prompt.md` - Comprehensive Elaria prompt (create next)

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Verify Installation (DONE ✅)

LM Studio is running and responding correctly!

### Step 2: Enable MCP in LM Studio

1. Open LM Studio
2. Click **Developer** → **Settings**
3. Enable **"Remote MCP"** toggle
4. Click **Save**
5. Restart LM Studio

### Step 3: Test Basic API

```powershell
cd D:\ClientForge\03_BOTS\elaria_command_center
.\test_lmstudio_responses.ps1
```

Expected output: Three successful API responses

### Step 4: Test MCP Tools

```powershell
.\test_lmstudio_mcp.ps1
```

This tests:
- File system access (`D:\ClientForge`)
- HTTP client (orchestrator check)
- Process execution (PowerShell commands)

### Step 5: Try Interactive Examples

```powershell
.\elaria_powershell_examples.ps1
```

This runs 10 examples including:
- CRM-INIT
- File reading
- Feature scaffolding
- Testing
- Deployment
- Interactive mode

---

## 💡 First Commands to Try

### 1. Initialize Elaria

```powershell
$body = @{
    model = "qwen2.5-30b-a3b"
    input = "CRM-INIT"
    reasoning = @{ effort = "medium" }
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
    -Uri "http://localhost:1234/v1/responses" `
    -Body $body `
    -ContentType "application/json"
```

### 2. Read README (once created)

```powershell
$body = @{
    model = "qwen2.5-30b-a3b"
    input = "Read D:\ClientForge\README.md and summarize the key sections"
    tools = @(
        @{
            type = "mcp"
            server_label = "filesystem"
            server_url = "npx -y @modelcontextprotocol/server-filesystem D:\ClientForge"
            allowed_tools = @("read_file")
        }
    )
    reasoning = @{ effort = "high" }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
    -Uri "http://localhost:1234/v1/responses" `
    -Body $body `
    -ContentType "application/json"
```

### 3. List Directory Structure

```powershell
$body = @{
    model = "qwen2.5-30b-a3b"
    input = "List all directories in D:\ClientForge and describe the purpose of each based on naming conventions"
    tools = @(
        @{
            type = "mcp"
            server_label = "filesystem"
            server_url = "npx -y @modelcontextprotocol/server-filesystem D:\ClientForge"
            allowed_tools = @("list_directory")
        }
    )
    reasoning = @{ effort = "medium" }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
    -Uri "http://localhost:1234/v1/responses" `
    -Body $body `
    -ContentType "application/json"
```

---

## 📝 Command Verbs Reference

| Command | Description | Reasoning Effort |
|---------|-------------|------------------|
| `CRM-INIT` | Load all context files, inventory bots, report status | Medium |
| `CRM-FEATURE <name>` | Scaffold new feature with tests | High |
| `CRM-MODULE <name>` | Create full-stack module (DB + API + UI) | High |
| `TEST` | Run test suite with coverage report | Medium |
| `AUDIT` | Security & performance audit (OWASP, deps, perf) | High |
| `DEPLOY [branch]` | Deploy to Render with smoke tests | High |
| `DOCS` | Update CHANGELOG, MAP, session logs | Medium |
| `SPEC <goal>` | Generate TaskSpec with acceptance criteria | High |

---

## 🔧 MCP Tools Available

### Filesystem (Priority: Read D:\ClientForge\README.md first!)

```javascript
{
  type: "mcp",
  server_label: "filesystem",
  server_url: "npx -y @modelcontextprotocol/server-filesystem D:\\ClientForge",
  allowed_tools: ["read_file", "write_file", "list_directory", "search_files"]
}
```

**Critical Files (Priority Order):**
1. `D:\ClientForge\README.md` ← READ FIRST!
2. `D:\ClientForge\05_SHARED_AI\context_pack\project_overview.md`
3. `D:\ClientForge\05_SHARED_AI\context_pack\roles_rules.md`
4. `D:\ClientForge\05_SHARED_AI\context_pack\current_tasks.md`
5. `D:\ClientForge\docs\07_CHANGELOG.md`
6. `D:\ClientForge\docs\00_MAP.md`

### HTTP Client

```javascript
{
  type: "mcp",
  server_label: "http",
  server_url: "npx -y @modelcontextprotocol/server-http",
  allowed_tools: ["get", "post", "put", "delete"]
}
```

**Allowed Hosts:**
- `127.0.0.1`, `localhost`
- `render.com`
- `notion.so`
- `discord.com`

### Process Execution

```javascript
{
  type: "mcp",
  server_label: "process",
  server_url: "npx -y @modelcontextprotocol/server-process",
  allowed_tools: ["execute_command"]
}
```

**Allowed Commands:**
- PowerShell scripts (`.ps1`)
- Shell scripts (`.sh`)
- Python scripts (`.py`)
- `pnpm`, `npm`, `node`, `git`

---

## 🎯 Reasoning Effort Guidelines

| Level | When to Use | Example |
|-------|-------------|---------|
| **low** | Status checks, simple queries | "Is orchestrator running?" |
| **medium** | Standard operations, file reads, analysis | "Read README and summarize" |
| **high** | Complex planning, architecture, multi-step | "SPEC: Implement user activity tracking" |

**Pro tip**: Start with `low`, increase only if response is insufficient

---

## 🔒 Safety Protocols

Elaria follows these safety rules:

### ✅ Always
- Stage changes to `D:\ClientForge\_staging\` first
- Run tests before promoting to production
- Create backup snapshot before major changes
- Document all changes in CHANGELOG/MAP
- Cite file paths in responses

### ❌ Never
- Write secrets, tokens, or API keys to files
- Skip tests or validation
- Mutate code without a plan
- Promote without passing `gate_ci.ps1`

---

## 📊 Execution Protocol

Every Elaria operation follows this sequence:

```
1. UNDERSTAND → Parse intent, read minimal context
2. PLAN       → Draft TaskSpec, list affected files, rollback steps
3. STAGE      → Write to _staging\ (never directly to 02_CODE\)
4. VALIDATE   → Run gate_ci.ps1 (lint, typecheck, tests, build)
5. PROMOTE    → Move staged files to production (promote_staging.ps1)
6. DOCUMENT   → Update session log, CHANGELOG, MAP
7. REPORT     → Structured summary with links to artifacts
```

---

## 🐛 Troubleshooting

### "Model not found"
- Check LM Studio has Qwen 2.5 30B loaded
- Verify model name matches: `qwen2.5-30b-a3b`

### "MCP tools not working"
1. Enable Remote MCP in LM Studio settings
2. Verify Node.js: `node --version`
3. Test MCP server: `npx -y @modelcontextprotocol/server-filesystem D:\ClientForge`

### "Timeout errors"
- Reduce `reasoning.effort` from `high` to `medium`
- Simplify complex queries
- Check LM Studio GPU usage

### "Empty responses"
- Model may need more specific prompt
- Try adding context or examples
- Increase reasoning effort

---

## 📚 Next Steps

1. ✅ **LM Studio running** - DONE!
2. ⏳ **Enable Remote MCP** - Do this next in LM Studio settings
3. ⏳ **Test MCP tools** - Run `test_lmstudio_mcp.ps1`
4. ⏳ **Create system prompt** - Coming next
5. ⏳ **Send CRM-INIT** - Initialize Elaria with full context
6. ⏳ **Explore examples** - Run `elaria_powershell_examples.ps1`

---

## 📖 Documentation

- **Full README**: `README.md` in this directory
- **PowerShell Examples**: `elaria_powershell_examples.ps1`
- **cURL Examples**: `elaria_curl_examples.sh`
- **MCP Config**: `lmstudio_config_example.json`

---

## 🆘 Support

- **LM Studio Docs**: https://lmstudio.ai/docs
- **OpenAI Responses API**: https://platform.openai.com/docs/api-reference/responses
- **MCP Protocol**: https://modelcontextprotocol.io
- **ClientForge Docs**: `D:\ClientForge\docs\`

---

**Status**: ✅ Core installation complete
**Version**: 1.0.0
**Updated**: 2025-01-XX

---

## 🎉 You're All Set!

Elaria is ready to become your ClientForge command center. Start by:

```powershell
# Enable MCP in LM Studio, then:
cd D:\ClientForge\03_BOTS\elaria_command_center
.\test_lmstudio_responses.ps1
.\test_lmstudio_mcp.ps1
.\elaria_powershell_examples.ps1
```

Happy coding! 🚀
