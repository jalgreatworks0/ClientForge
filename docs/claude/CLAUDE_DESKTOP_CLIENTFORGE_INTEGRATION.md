# Claude Desktop - ClientForge CRM Integration

**Date**: 2025-11-05
**Enhancement**: ClientForge MCP Server v1.0
**Built By**: Claude Code (Sonnet 4.5)

---

## What's New

Claude Desktop now has **deep ClientForge CRM knowledge** through a specialized MCP server!

### New Capabilities:

#### Resources (Contextual Information):
1. **`clientforge://project/info`** - Complete project metadata, tech stack, test status
2. **`clientforge://protocols/all`** - **CRITICAL**: All project protocols, rules, conventions from CLAUDE.md and README.md
3. **`clientforge://protocols/quick-reference`** - Fast reference for critical rules and patterns
4. **`clientforge://structure/tree`** - Full directory structure
5. **`clientforge://docs/architecture`** - BUILD_GUIDE_FOUNDATION.md content
6. **`clientforge://tests/status`** - Current test metrics and priorities
7. **`clientforge://database/schema`** - Complete database schema overview

#### Tools (Actions):
1. **`get_module_info`** - Get details about specific modules (auth, contacts, deals, etc.)
2. **`get_test_file`** - Locate test files and get information
3. **`search_codebase`** - Search for patterns, functions, or keywords
4. **`get_api_endpoints`** - List API endpoints by module
5. **`get_session_context`** - Get current development session context
6. **`get_file_dependencies`** - Get imports/dependencies for a file

---

## How to Enable

### Step 1: Restart Claude Desktop

**Option A: Close and Reopen**
1. Close Claude Desktop completely (File → Exit or Alt+F4)
2. Reopen Claude Desktop from Start Menu
3. The new MCP server will load automatically

**Option B: Task Manager Restart** (if needed)
```powershell
# Kill Claude Desktop process
taskkill /F /IM "Claude.exe"

# Restart from Start Menu
```

---

## Testing the New Capabilities

Once restarted, ask Claude Desktop to test her new knowledge:

### Test 1: Protocol Knowledge (MOST IMPORTANT)
```
Hey Claude Desktop! What are the critical rules I must follow when working on ClientForge CRM?
```

**Expected Response**: She should use the `clientforge://protocols/quick-reference` resource and summarize:
- Session Start: Read CLAUDE.md first (90 sec), include verification code
- File Organization: Only README.md/CLAUDE.md in root, 3-4 level depth
- Anti-Duplication: Search 2-3 min before creating ANY file (UPDATE > CREATE)
- Testing: 85%+ coverage required
- Type Safety: Zero 'any' types
- Session End: 10 min for docs (CHANGELOG + session log)

### Test 2: Project Information
```
Hey Claude Desktop! What's the current test status of ClientForge CRM?
```

**Expected Response**: She should use the `clientforge://tests/status` resource and report:
- Total tests: 160
- Passing: 79 (49%)
- Failing: 81 (51%)
- Target: 85%+

### Test 3: Module Information
```
Tell me about the authentication module in ClientForge
```

**Expected Response**: She should use the `get_module_info` tool and describe:
- Location: `backend/core/auth/`
- Services: AuthService, JWTService, PasswordService, SessionService
- Test status: JWTService 100% passing, AuthService in progress

### Test 4: Codebase Search
```
Search the codebase for "UnauthorizedError"
```

**Expected Response**: She should use the `search_codebase` tool and find:
- `backend/utils/errors/app-error.ts` - Error class definition
- Multiple service files using it
- Test files asserting it

### Test 5: Write Test Fix
```
Can you write a fixed version of the AuthService test file to:
d:\clientforge-crm\tests\unit\auth\auth-service-FIXED.test.ts

Use module mocking instead of constructor injection, matching the pattern from JWTService tests.
```

**Expected Response**: She should:
1. Use `get_test_file` to understand current AuthService tests
2. Use `get_module_info` to understand AuthService implementation
3. Use `write_file` to create the fixed version
4. Provide a summary of changes made

---

## What Claude Desktop Now Knows

### Project Protocols & Guidelines:
- **Session Start**: Must read CLAUDE.md (90 sec), README.md, check session logs
- **File Organization**: Only README.md/CLAUDE.md in root, 3-4 level folder depth
- **Anti-Duplication**: Search 2-3 min before creating ANY file (UPDATE > CREATE)
- **Dependencies**: Check imports before modifying files
- **Security**: Parameterized queries, zod validation, bcrypt (cost=12)
- **Testing**: 85%+ coverage, zero 'any' types, explicit return types
- **Session End**: 10 min for CHANGELOG + session log + decisions
- **Verification Codes**: README-v3.0-SESSION-INIT-COMPLETE, ANTI-DUP-CHECK-COMPLETE, etc.

### Project Context:
- **Name**: ClientForge CRM v3.0
- **Purpose**: Enterprise CRM with AI-powered features (Albedo AI)
- **Root Path**: `D:\clientforge-crm\`

### Tech Stack:
- **Frontend**: React 18, TypeScript 5.3, Vite 5, Tailwind CSS
- **Backend**: Node.js 18, Express 4.18, TypeScript 5.3
- **Databases**: PostgreSQL 15+, MongoDB 6+, Redis 7+, Elasticsearch 8+
- **Testing**: Jest 29.7, ts-jest 29.1.2
- **AI**: Anthropic Claude SDK (Haiku 4.5, Sonnet 4.5, Opus 4.1)

### Current Session Status:
- **Test Status**: 79/160 passing (49%), target 85%+
- **In Progress**: AuthService test fixes (mocking refactor)
- **Completed**: JWTService tests (14/14 passing - 100%)
- **Next**: PasswordService, TaskService, ContactService, DealService

### Directory Structure:
She knows the complete file organization:
```
d:\clientforge-crm\
├── backend/
│   ├── core/ (auth, users, contacts, deals, tasks, accounts)
│   ├── services/ (ai, email, analytics)
│   └── utils/ (errors, logging, validation)
├── tests/
│   ├── unit/ (auth, core modules)
│   ├── integration/
│   └── e2e/
├── database/
│   └── schemas/ (PostgreSQL, MongoDB)
├── docs/
│   └── guides/ (BUILD_GUIDE_FOUNDATION.md)
└── logs/
    └── session-logs/ (daily progress)
```

---

## Collaboration Workflow

### Recommended Workflow with Claude Desktop:

1. **Claude Desktop** (Analysis & Generation):
   - Analyze test patterns using `get_test_file` and `search_codebase`
   - Generate fixed test files using `write_file`
   - Create batch fix scripts
   - Write documentation

2. **You** (Review & Approval):
   - Review generated fixes
   - Approve changes
   - Move files to correct locations if needed

3. **Claude Code (me)** (Execution & Verification):
   - Run tests using Jest
   - Verify fixes work
   - Update metrics
   - Report results

4. **Iterate**:
   - Repeat until all tests pass!

---

## Configuration Details

**MCP Server Added**:
```json
{
  "mcpServers": {
    "clientforge-crm": {
      "command": "python",
      "args": [
        "C:\\ScrollForge\\08_SYSTEM_NEXUS\\Gateway\\clientforge_mcp.py"
      ]
    }
  }
}
```

**Server File**: `C:\ScrollForge\08_SYSTEM_NEXUS\Gateway\clientforge_mcp.py`

**Logging**: All MCP operations logged to:
`C:\ScrollForge\08_SYSTEM_NEXUS\Gateway\logs\clientforge_mcp.log`

---

## Combined Capabilities

Claude Desktop now has:

### Read/Write Operations (filesystem-access):
- ✅ Read files
- ✅ Write files
- ✅ Create directories
- ✅ Delete files
- ✅ Move/rename files
- ✅ Copy files
- ✅ List directories
- ✅ Search files

### ClientForge Knowledge (clientforge-crm):
- ✅ Project information
- ✅ Directory structure
- ✅ Test status
- ✅ Database schema
- ✅ Module details
- ✅ Codebase search
- ✅ Session context
- ✅ Dependency mapping

### Git Operations (git-operations):
- ✅ Status, commit, push, pull
- ✅ Branch management
- ✅ Diff viewing

### Database Operations (database-operations):
- ✅ Query execution
- ✅ Schema inspection
- ✅ Migration support

### Development Tools (devtools):
- ✅ Code analysis
- ✅ Linting
- ✅ Formatting

### VSCode Integration (vscode-integration):
- ✅ File navigation
- ✅ Symbol search
- ✅ Reference finding

---

## Next Steps

1. **Restart Claude Desktop** (see Step 1 above)
2. **Test new capabilities** (see Testing section above)
3. **Ask her to help fix remaining 81 test failures!**

### Suggested First Task for Claude Desktop:

```
Hey Claude Desktop!

I need your help fixing the remaining 81 test failures in ClientForge CRM.

Current status:
- ✅ JWTService: 14/14 passing (100%)
- ⚠️ AuthService: ~5/30 passing (~17%) - needs mocking refactor
- ❌ PasswordService: ~8/36 passing (~22%)
- ❌ TaskService: 17/26 passing (65%)
- ❌ ContactService: ~12/20 passing (~60%)
- ❌ DealService: ~8/20 passing (~40%)

Can you:
1. Analyze the AuthService test failures
2. Generate a fixed version using module mocking (like JWTService)
3. Write it to: d:\clientforge-crm\tests\unit\auth\auth-service-FIXED.test.ts
4. Document the changes you made

Let's get these tests passing!
```

---

## Security & Safety

The ClientForge MCP server:
- **Read-only codebase access** (uses existing filesystem MCP for writes)
- **No destructive operations** (can't delete or modify source)
- **Logging enabled** (all operations tracked)
- **Scoped to D:\clientforge-crm\** (can't access other projects)
- **Error handling** (safe failures, no crashes)

---

**Ready to Collaborate!**

Claude Desktop is now a **ClientForge CRM expert** with full read/write capabilities. Let's fix those remaining 81 tests together!

---

**Built by Claude Code (Sonnet 4.5)**
**For Abstract Creatives LLC - ClientForge CRM v3.0**
**MCP Enhancement: ClientForge Knowledge Integration v1.0**
