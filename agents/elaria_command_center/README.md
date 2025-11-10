# Elaria Command Center - LM Studio Integration

**Location**: `D:\ClientForge\03_BOTS\elaria_command_center\`
**Purpose**: Authoritative orchestration and engineering brain for ClientForge CRM
**Model**: Qwen 2.5 30B-A3B (running in LM Studio)
**API**: OpenAI-compatible Responses API (`http://localhost:1234/v1/responses`)

---

## Quick Start

### 1. Prerequisites

- **LM Studio** installed and running on port 1234
- **Qwen 2.5 30B** model loaded (Q4 quantization recommended for 24GB VRAM)
- **Node.js/NPX** installed for MCP servers
- **ClientForge** directory structure at `D:\ClientForge\`

### 2. Activation

```powershell
# Navigate to Elaria directory
cd D:\ClientForge\03_BOTS\elaria_command_center

# Run activation script
.\activate_elaria.ps1
```

**Options:**
```powershell
# Skip API tests
.\activate_elaria.ps1 -SkipTests

# Start orchestrator service
.\activate_elaria.ps1 -StartOrchestrator

# Both
.\activate_elaria.ps1 -SkipTests -StartOrchestrator
```

### 3. Enable MCP in LM Studio

1. Open LM Studio
2. Go to **Developer** → **Settings**
3. Enable **"Remote MCP"**
4. Restart LM Studio

### 4. Load System Prompt

In LM Studio chat:
1. Click **System Prompt** (top of chat)
2. Paste contents of `system_prompt.md` (to be created)
3. Save

### 5. Test Installation

```powershell
# Test basic Responses API
.\test_lmstudio_responses.ps1

# Test MCP tool integration
.\test_lmstudio_mcp.ps1

# Run interactive examples
.\elaria_powershell_examples.ps1
```

---

## Directory Structure

```
D:\ClientForge\03_BOTS\elaria_command_center\
├── README.md                          # This file
├── system_prompt.md                   # Comprehensive Elaria prompt (to be created)
├── activate_elaria.ps1               # Main activation script
├── test_lmstudio_responses.ps1       # Test Responses API
├── test_lmstudio_mcp.ps1             # Test MCP tools
├── elaria_powershell_examples.ps1    # Interactive PowerShell examples
├── elaria_curl_examples.sh           # cURL reference examples
└── lmstudio_config_example.json      # MCP configuration reference
```

---

## API Usage

### Basic Request (PowerShell)

```powershell
$body = @{
    model = "qwen2.5-30b-a3b"
    input = "CRM-INIT"
    reasoning = @{ effort = "medium" }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
    -Uri "http://localhost:1234/v1/responses" `
    -Body $body `
    -ContentType "application/json"
```

### Basic Request (cURL)

```bash
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "CRM-INIT",
    "reasoning": { "effort": "medium" }
  }'
```

### With MCP Tools (PowerShell)

```powershell
$body = @{
    model = "qwen2.5-30b-a3b"
    input = "Read D:\ClientForge\README.md and summarize"
    tools = @(
        @{
            type = "mcp"
            server_label = "filesystem"
            server_url = "npx -y @modelcontextprotocol/server-filesystem D:\ClientForge"
            allowed_tools = @("read_file", "list_directory")
        }
    )
    reasoning = @{ effort = "high" }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
    -Uri "http://localhost:1234/v1/responses" `
    -Body $body `
    -ContentType "application/json"
```

### Stateful Follow-up

```powershell
# First request
$response1 = Invoke-RestMethod -Method Post `
    -Uri "http://localhost:1234/v1/responses" `
    -Body '{"model":"qwen2.5-30b-a3b","input":"List critical files"}' `
    -ContentType "application/json"

# Follow-up using previous response ID
$body = @{
    model = "qwen2.5-30b-a3b"
    input = "Read the first file"
    previous_response_id = $response1.id
} | ConvertTo-Json

$response2 = Invoke-RestMethod -Method Post `
    -Uri "http://localhost:1234/v1/responses" `
    -Body $body `
    -ContentType "application/json"
```

### Streaming

```bash
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -N \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "Analyze codebase structure",
    "stream": true,
    "reasoning": { "effort": "high" }
  }'
```

---

## Command Verbs

Elaria understands these specialized commands:

| Command | Description | Example |
|---------|-------------|---------|
| `CRM-INIT` | Initialize Elaria with full context | `CRM-INIT` |
| `CRM-FEATURE <name>` | Scaffold new feature | `CRM-FEATURE email-tracking` |
| `CRM-MODULE <name>` | Create full-stack module | `CRM-MODULE analytics` |
| `TEST` | Run test suite & report coverage | `TEST` |
| `AUDIT` | Security & performance audit | `AUDIT` |
| `DEPLOY [branch]` | Deploy to production | `DEPLOY main` |
| `DOCS` | Update documentation | `DOCS` |
| `SPEC <goal>` | Generate TaskSpec + plan | `SPEC user-activity-tracking` |

---

## MCP Servers Configuration

### Filesystem Server

```json
{
  "type": "mcp",
  "server_label": "filesystem",
  "server_url": "npx -y @modelcontextprotocol/server-filesystem D:\\ClientForge",
  "allowed_tools": ["read_file", "write_file", "list_directory", "search_files"]
}
```

### Process Server

```json
{
  "type": "mcp",
  "server_label": "process",
  "server_url": "npx -y @modelcontextprotocol/server-process",
  "allowed_tools": ["execute_command"]
}
```

### HTTP Server

```json
{
  "type": "mcp",
  "server_label": "http",
  "server_url": "npx -y @modelcontextprotocol/server-http",
  "allowed_tools": ["get", "post", "put", "delete"]
}
```

---

## Reasoning Effort Levels

| Level | Use Case | Token Cost | Response Time |
|-------|----------|------------|---------------|
| `low` | Simple queries, status checks | Low | Fast |
| `medium` | Standard operations, analysis | Medium | Moderate |
| `high` | Complex planning, architecture | High | Slower |

---

## ClientForge-Specific Conventions

### File System

- **Root**: `D:\ClientForge\`
- **Code**: `D:\ClientForge\02_CODE\`
- **Staging**: `D:\ClientForge\_staging\` (all edits go here first)
- **Backups**: `D:\ClientForge\06_BACKUPS\`
- **Context**: `D:\ClientForge\05_SHARED_AI\context_pack\`

### Priority Context Files (Read on Init)

1. `D:\ClientForge\README.md` ← **FIRST PRIORITY**
2. `D:\ClientForge\05_SHARED_AI\context_pack\project_overview.md`
3. `D:\ClientForge\05_SHARED_AI\context_pack\roles_rules.md`
4. `D:\ClientForge\05_SHARED_AI\context_pack\current_tasks.md`
5. `D:\ClientForge\docs\07_CHANGELOG.md`
6. `D:\ClientForge\docs\00_MAP.md`

### Execution Protocol

Every Elaria operation follows this sequence:

1. **Understand** → Parse intent, read context
2. **Plan** → Draft TaskSpec, list affected files
3. **Stage** → Write to `_staging\` (never directly to `02_CODE\`)
4. **Validate** → Run `gate_ci.ps1` (lint, typecheck, tests)
5. **Promote** → Move from staging to production
6. **Document** → Update CHANGELOG, MAP, session logs
7. **Report** → Structured summary with artifacts

### Safety Guards

- ✅ **Always** stage changes before promotion
- ✅ **Always** run tests before promotion
- ✅ **Always** create backup snapshot
- ❌ **Never** write secrets to repo
- ❌ **Never** skip tests
- ❌ **Never** mutate code without plan

---

## Troubleshooting

### LM Studio Not Responding

```powershell
# Check if LM Studio is running
Invoke-RestMethod -Uri "http://localhost:1234/v1/models"

# Expected: List of loaded models
# If error: Start LM Studio and load Qwen model
```

### MCP Tools Not Working

1. Enable Remote MCP in LM Studio settings
2. Verify Node.js is installed: `node --version`
3. Test MCP server manually:
   ```bash
   npx -y @modelcontextprotocol/server-filesystem D:\ClientForge
   ```

### Orchestrator Not Running

```powershell
# Start orchestrator manually
cd D:\ClientForge\orchestrator
python main.py

# Or use activation script
.\activate_elaria.ps1 -StartOrchestrator
```

### Response Timeouts

- Reduce `reasoning.effort` from `high` to `medium` or `low`
- Simplify complex multi-tool requests
- Check LM Studio GPU usage (should be utilizing GPU)

---

## Performance Tips

1. **Use appropriate reasoning effort**
   - Low: Status checks, simple queries
   - Medium: Most operations
   - High: Complex architecture decisions

2. **Leverage stateful follow-ups**
   - Use `previous_response_id` to maintain context
   - Reduces token usage vs re-sending context

3. **Batch independent operations**
   - Send multiple file reads in one request
   - Use multiple MCP servers simultaneously

4. **Stream for long responses**
   - Set `stream: true` for real-time output
   - Better UX for complex analysis

---

## Integration with Other Bots

Elaria can orchestrate other bots via the orchestrator service:

```powershell
# Submit task to specialized bot
$body = @{
    model = "qwen2.5-30b-a3b"
    input = "Submit RAG indexing task to bot: ingest all docs from D:\ClientForge\docs"
    tools = @(
        @{
            type = "mcp"
            server_label = "http"
            server_url = "npx -y @modelcontextprotocol/server-http"
            allowed_tools = @("post")
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
    -Uri "http://localhost:1234/v1/responses" `
    -Body $body `
    -ContentType "application/json"
```

---

## Next Steps

1. ✅ Run `activate_elaria.ps1`
2. ✅ Test with `test_lmstudio_responses.ps1`
3. ✅ Enable MCP in LM Studio
4. ✅ Test MCP with `test_lmstudio_mcp.ps1`
5. ✅ Load system prompt (to be created)
6. ✅ Send first command: `CRM-INIT`
7. ✅ Explore with `elaria_powershell_examples.ps1`

---

## Support & Documentation

- **LM Studio Docs**: https://lmstudio.ai/docs
- **OpenAI Responses API**: https://platform.openai.com/docs/api-reference/responses
- **MCP Documentation**: https://modelcontextprotocol.io
- **ClientForge Docs**: `D:\ClientForge\docs\`

---

**Version**: 1.0.0
**Last Updated**: 2025-01-XX
**Maintained By**: ClientForge Development Team
