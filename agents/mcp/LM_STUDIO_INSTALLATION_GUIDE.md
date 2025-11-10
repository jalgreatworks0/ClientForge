# ClientForge MCP Servers - LM Studio Installation Guide

**Purpose**: Install 12 custom MCP servers in LM Studio to give Elaria full control over ClientForge CRM

**Time Required**: 15-20 minutes

**Prerequisites**:
- LM Studio installed
- Node.js 18+ installed
- ClientForge CRM workspace at `D:\clientforge-crm`

---

## 📋 Quick Installation (Copy-Paste Method)

### Step 1: Install Node.js Dependencies

```powershell
# Navigate to MCP servers directory
cd D:\clientforge-crm\agents\mcp\servers

# Install required packages
npm install glob
npm install pg        # PostgreSQL client
npm install mongodb   # MongoDB client
npm install @elastic/elasticsearch  # Elasticsearch client
npm install redis     # Redis client
npm install chroma-js # Vector embeddings
npm install mime-types
```

### Step 2: Configure LM Studio MCP Settings

1. **Open LM Studio**
2. **Go to**: Settings → Developer → Model Context Protocol
3. **Click**: "Edit Config" or "Open MCP Settings File"
4. **Replace entire contents** with the configuration below:

```json
{
  "mcpServers": {
    "clientforge-filesystem": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\filesystem-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:\\clientforge-crm",
        "STAGING_ROOT": "D:\\clientforge-crm\\_staging"
      }
    },

    "clientforge-database": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\database-server.js"
      ],
      "env": {
        "POSTGRES_URL": "postgres://localhost:5432/clientforge",
        "MONGODB_URL": "mongodb://localhost:27017/clientforge?authSource=admin",
        "ELASTICSEARCH_URL": "http://localhost:9200",
        "REDIS_URL": "redis://localhost:6379"
      }
    },

    "clientforge-codebase": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\codebase-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:\\clientforge-crm"
      }
    },

    "clientforge-testing": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\testing-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:\\clientforge-crm",
        "TEST_RUNNER": "jest"
      }
    },

    "clientforge-git": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\git-server.js"
      ],
      "env": {
        "GIT_REPO": "D:\\clientforge-crm"
      }
    },

    "clientforge-documentation": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\documentation-server.js"
      ],
      "env": {
        "DOCS_ROOT": "D:\\clientforge-crm\\docs"
      }
    },

    "clientforge-build": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\build-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:\\clientforge-crm",
        "SCRIPTS_ROOT": "D:\\clientforge-crm\\scripts"
      }
    },

    "clientforge-rag": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\rag-server.js"
      ],
      "env": {
        "RAG_ENDPOINT": "http://127.0.0.1:8920",
        "INDEX_PATH": "D:\\clientforge-crm\\agents\\rag-index"
      }
    },

    "clientforge-orchestrator": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\router.js"
      ],
      "env": {
        "ORCHESTRATOR_PORT": "8979"
      }
    },

    "clientforge-security": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\security-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:\\clientforge-crm"
      }
    },

    "clientforge-logger": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\logger-server.js"
      ],
      "env": {
        "MONGODB_URL": "mongodb://localhost:27017/clientforge?authSource=admin"
      }
    },

    "clientforge-context-pack": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\context-pack-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:\\clientforge-crm",
        "PACKS_FILE": "D:\\clientforge-crm\\docs\\claude\\11_CONTEXT_PACKS.md",
        "BUDGET_LIMIT_KB": "120"
      }
    }
  }
}
```

### Step 3: Load Elaria Model in LM Studio

1. **Download Model**: Qwen2.5-30B-A3B (Q4_K_M quantization)
   - Search in LM Studio: "qwen2.5 30b"
   - Download: `Qwen/Qwen2.5-30B-A3B-Q4_K_M.gguf`
   - Size: ~17GB (fits in 24GB VRAM with room for context)

2. **Load Model**:
   - Click "Load Model"
   - Select Qwen2.5-30B
   - Wait for model to load (~30 seconds)

3. **Configure Model Parameters**:
   ```
   Temperature: 0.1 (deterministic)
   Top P: 0.9
   Repeat Penalty: 1.1
   Context Length: 32768 tokens
   GPU Layers: Auto (or max available)
   ```

### Step 4: Set Elaria System Prompt

1. **Go to**: Chat Settings → System Prompt
2. **Copy-paste** this prompt:

```
You are Elaria, the ClientForge CRM Command-Center AI. You are a Qwen2.5-30B model running locally via LM Studio with MCP (Model Context Protocol) capabilities.

CORE DIRECTIVES (NON-NEGOTIABLE):
1. ALWAYS execute auto-boot at session start: Read D:/clientforge-crm/README.md FIRST (highest priority), then CHANGELOG.md, then docs/claude/11_CONTEXT_PACKS.md, then last 2 session logs via clientforge-filesystem.read_file
2. NEVER write files directly to production directories - use clientforge-filesystem.write_file with autoStage=true
3. ALWAYS run clientforge-build.run_ci_gate before promoting staged files
4. NEVER commit secrets, API keys, tokens, or credentials
5. ALWAYS enforce multi-tenant isolation with tenant_id in all database queries via clientforge-database.query_postgresql
6. ALWAYS use parameterized SQL queries ($1, $2) - NEVER string interpolation
7. ALWAYS use clientforge-logger.log_info/log_error/log_warn - NEVER console.log
8. ALWAYS enforce 85%+ test coverage (95%+ for auth/payment) via clientforge-testing.run_coverage
9. ALWAYS use TypeScript strict mode with explicit return types - zero 'any' types
10. ALWAYS document session end via clientforge-documentation.update_changelog + session log

AVAILABLE MCP SERVERS (12 total):
- clientforge-filesystem: read_file, write_file, list_directory, search_files, workspace_tree, recent_files, staged_files, smart_navigate
- clientforge-database: query_postgresql, query_mongodb, search_elasticsearch, cache_redis, verify_schema, check_tenant_isolation, database_health
- clientforge-codebase: find_definition, find_references, dependency_graph, breaking_change_analysis, import_chain
- clientforge-testing: run_tests, run_coverage, generate_tests, identify_untested, test_impact_analysis
- clientforge-git: git_status, git_diff, git_log, git_commit, generate_commit_message, branch_diff
- clientforge-documentation: search_docs, generate_jsdoc, update_changelog, update_api_docs, find_outdated_docs
- clientforge-build: run_build, run_lint, run_typecheck, run_ci_gate, deploy, rollback
- clientforge-rag: query (semantic search), reindex, add_document, get_similar, get_context
- clientforge-orchestrator: list_bots, submit_task, get_task, agent_status, route_task
- clientforge-security: owasp_audit, dependency_audit, secret_scan, sql_injection_check, xss_check, tenant_isolation_verify
- clientforge-logger: log_info, log_error, log_warn, query_logs, log_stats, error_analysis
- clientforge-context-pack: list_packs, load_pack, unload_pack, switch_pack, budget_status, suggest_pack

OPERATIONAL WORKFLOW (8-PHASE EXECUTION):
Phase 1: Parse Intent → Generate ParsedIntent with objective, scope, complexity (1-10), risks
Phase 2: Load Context → Use clientforge-context-pack.load_pack (crm_pack default) - respect 120KB budget
Phase 3: Plan → Generate ExecutionPlan with TaskSpec, files to create/modify, test strategy, rollback plan
Phase 4: Stage → Use clientforge-filesystem.write_file with autoStage=true for ALL files
Phase 5: Validate → Use clientforge-build.run_ci_gate - MUST PASS before promotion
Phase 6: Promote → Run D:/clientforge-crm/scripts/promote-staging.ps1 via clientforge-build
Phase 7: Document → Use clientforge-documentation.update_changelog + create session log via clientforge-filesystem.write_file
Phase 8: Deploy → Use clientforge-build.deploy (optional, only if user requests)

CLIENTFORGE CRM CONVENTIONS (STRICTLY ENFORCED):
- File depth: 3-4 levels minimum (e.g., backend/core/contacts/contacts-service.ts)
- Database: snake_case tables/columns, tenant_id on ALL tables, parameterized queries only
- API: /api/v1/<resource>, RESTful verbs, consistent response envelope
- Logging: Use clientforge-logger.log_* methods, no emoji, mask sensitive data
- Security: OWASP Top 10 via clientforge-security.owasp_audit, JWT auth, rate limiting
- Tests: 5 types (happy path, edge cases, errors, security, logging) - 85%+ coverage via clientforge-testing

COMMAND VOCABULARY:
- CRM-INIT: Auto-boot + clientforge-rag.reindex + clientforge-database.database_health
- CRM-FEATURE <name>: Scaffold + stage via clientforge-filesystem + clientforge-testing.generate_tests + promote
- CRM-MODULE <name>: Full stack (DB + backend + frontend + tests) via multi-phase workflow
- TEST: clientforge-testing.run_coverage + identify files below 85%
- AUDIT: clientforge-security.owasp_audit + clientforge-database.check_tenant_isolation
- DEPLOY: clientforge-build.run_ci_gate + clientforge-build.deploy
- DOCS: clientforge-documentation.update_changelog + clientforge-documentation.update_api_docs

RESPONSE FORMAT:
- Terse, minimal, deterministic - no conversational filler
- Always include verification codes (README-v3.0-SESSION-INIT-COMPLETE, SESSION-END-v3.0-COMPLETE)
- Structured reports with clear status, metrics, next steps
- Use MCP server responses directly in reports

WORKSPACE: D:\clientforge-crm\ (via clientforge-filesystem)
DATABASES: PostgreSQL (5432), MongoDB (27017), Elasticsearch (9200), Redis (6379) (via clientforge-database)
ORCHESTRATOR: http://127.0.0.1:8979 (via clientforge-orchestrator)

You are an engineering brain optimized for reliability. Ship code that works. Use MCP servers for ALL operations. Never skip tests. Never skip documentation. Be precise, explicit, and deterministic.
```

### Step 5: Verify MCP Server Connection

1. **Start a new chat** in LM Studio
2. **Type**: "CRM-INIT"
3. **Elaria should**:
   - Call `clientforge-filesystem.read_file` for README.md
   - Call `clientforge-filesystem.read_file` for CHANGELOG.md
   - Call `clientforge-context-pack.list_packs`
   - Call `clientforge-database.database_health`
   - Report initialization status with verification code

**Expected Output**:
```
✅ ClientForge CRM Initialized

Context Loaded:
- README.md (via clientforge-filesystem.read_file)
- CHANGELOG.md (via clientforge-filesystem.read_file)
- Available Packs: auth_pack, crm_pack, ai_pack, ui_pack, security_pack, performance_pack, search_pack

MCP Servers Online: 12/12
- clientforge-filesystem ✅
- clientforge-database ✅
- clientforge-codebase ✅
- clientforge-testing ✅
- clientforge-git ✅
- clientforge-documentation ✅
- clientforge-build ✅
- clientforge-rag ✅
- clientforge-orchestrator ✅
- clientforge-security ✅
- clientforge-logger ✅
- clientforge-context-pack ✅

Databases:
- PostgreSQL: ✅ CONNECTED (via clientforge-database.database_health)
- MongoDB: ✅ CONNECTED
- Elasticsearch: ✅ CONNECTED
- Redis: ✅ CONNECTED

Verification: README-v3.0-SESSION-INIT-COMPLETE
Ready for tasks.
```

---

## 🧪 Test Each MCP Server

Run these tests to verify all servers work:

### 1. Filesystem Server
```
User: "Use clientforge-filesystem to list the backend/core directory"
Elaria: [Calls clientforge-filesystem.list_directory with path="backend/core"]
```

### 2. Database Server
```
User: "Use clientforge-database to check PostgreSQL health"
Elaria: [Calls clientforge-database.database_health]
```

### 3. Codebase Server
```
User: "Use clientforge-codebase to find all references to ContactsService"
Elaria: [Calls clientforge-codebase.find_references with symbol="ContactsService"]
```

### 4. Testing Server
```
User: "Use clientforge-testing to run coverage report"
Elaria: [Calls clientforge-testing.run_coverage]
```

### 5. Git Server
```
User: "Use clientforge-git to show git status"
Elaria: [Calls clientforge-git.git_status]
```

### 6. Documentation Server
```
User: "Use clientforge-documentation to search for 'multi-tenant'"
Elaria: [Calls clientforge-documentation.search_docs with query="multi-tenant"]
```

### 7. Build Server
```
User: "Use clientforge-build to run lint check"
Elaria: [Calls clientforge-build.run_lint]
```

### 8. RAG Server
```
User: "Use clientforge-rag to query 'How does authentication work?'"
Elaria: [Calls clientforge-rag.query]
```

### 9. Orchestrator Server
```
User: "Use clientforge-orchestrator to list all bots"
Elaria: [Calls clientforge-orchestrator.list_bots]
```

### 10. Security Server
```
User: "Use clientforge-security to run OWASP audit"
Elaria: [Calls clientforge-security.owasp_audit]
```

### 11. Logger Server
```
User: "Use clientforge-logger to query error logs from last 24 hours"
Elaria: [Calls clientforge-logger.query_logs with timeRange="24h", level="error"]
```

### 12. Context Pack Server
```
User: "Use clientforge-context-pack to load crm_pack"
Elaria: [Calls clientforge-context-pack.load_pack with packName="crm_pack"]
```

---

## 🚨 Troubleshooting

### MCP Server Not Connecting

**Symptom**: LM Studio shows "MCP server failed to start"

**Solutions**:
1. **Check Node.js version**: `node --version` (must be 18+)
2. **Verify file paths**: Ensure all paths use `D:\clientforge-crm\`
3. **Check dependencies**: Run `npm install` in `D:\clientforge-crm\agents\mcp\servers\`
4. **View logs**: LM Studio → Developer Tools → Console (look for MCP errors)

### Model Running Out of Memory

**Symptom**: Model crashes or responses are truncated

**Solutions**:
1. **Reduce context length**: 32768 → 16384 tokens
2. **Use smaller quantization**: Q4_K_M → Q3_K_M
3. **Reduce GPU layers**: Auto → 30 layers
4. **Close other applications** using VRAM

### MCP Server Timeout

**Symptom**: "MCP server timeout" after 30 seconds

**Solutions**:
1. **Check server script**: Run manually to test: `node D:\clientforge-crm\agents\mcp\servers\filesystem-server.js`
2. **Increase timeout**: LM Studio Settings → MCP Timeout → 60 seconds
3. **Check antivirus**: Some antiviruses block Node.js processes

### Database Connection Failed

**Symptom**: `clientforge-database` shows connection errors

**Solutions**:
1. **Verify Docker containers running**: `docker ps` (should show 4 containers)
2. **Check connection strings** in MCP config
3. **Test connections manually**:
   ```powershell
   # PostgreSQL
   psql -h localhost -p 5432 -U postgres -d clientforge

   # MongoDB
   mongosh "mongodb://localhost:27017/clientforge?authSource=admin"

   # Elasticsearch
   curl http://localhost:9200

   # Redis
   redis-cli ping
   ```

---

## 📊 Performance Optimization

### For Maximum Speed (RTX 4090 with 24GB VRAM):

```json
{
  "model_settings": {
    "context_length": 32768,
    "gpu_layers": "auto",
    "batch_size": 512,
    "threads": 8,
    "rope_frequency_base": 10000,
    "rope_frequency_scale": 1.0
  },
  "inference_settings": {
    "temperature": 0.1,
    "top_p": 0.9,
    "top_k": 40,
    "repeat_penalty": 1.1,
    "repeat_last_n": 64
  }
}
```

### For Memory-Constrained Systems (16GB VRAM):

```json
{
  "model_settings": {
    "context_length": 16384,
    "gpu_layers": 30,
    "batch_size": 256,
    "threads": 4
  }
}
```

---

## 🎯 Next Steps

1. **Test all 12 MCP servers** with the verification commands above
2. **Run first real task**: "CRM-FEATURE contact-export"
3. **Monitor performance**: Check GPU usage, response times
4. **Adjust settings** based on your hardware

---

## 📚 Additional Resources

- **MCP Protocol Spec**: https://github.com/anthropics/mcp
- **LM Studio Docs**: https://lmstudio.ai/docs
- **Qwen2.5 Model Card**: https://huggingface.co/Qwen/Qwen2.5-30B-Instruct-GGUF

---

**Verification**: LM-STUDIO-MCP-INSTALLATION-v1.0-COMPLETE

🚀 **Elaria is now fully operational with 12 MCP servers!** 🚀
