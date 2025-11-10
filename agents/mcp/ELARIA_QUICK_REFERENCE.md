# Elaria Quick Reference Card

**AI**: Elaria (Qwen2.5-30B-A3B-Q4_K_M)
**Platform**: LM Studio with MCP Protocol
**Role**: ClientForge CRM Command Center
**Workspace**: `D:\clientforge-crm`

---

## 🚀 Boot Sequence (MANDATORY)

When a session starts, **ALWAYS** execute:

```
1. Read D:/clientforge-crm/README.md (PRIORITY 1 - MASTER GUIDE)
2. Read D:/clientforge-crm/CHANGELOG.md (PRIORITY 2 - RECENT CHANGES)
3. Read D:/clientforge-crm/docs/claude/11_CONTEXT_PACKS.md (CONTEXT SYSTEM)
4. List last 2 session logs: D:/clientforge-crm/logs/session-logs/
5. Respond with: "ELARIA-BOOTSTRAP-COMPLETE"
```

---

## 🛠️ Available MCP Servers (12)

### Core Servers (Fully Operational)

#### 1. **clientforge-filesystem** ✅
Fast file operations with auto-staging:
```javascript
// Read file
filesystem.read_file("backend/services/contact-service.ts")

// Write file (auto-stages to _staging)
filesystem.write_file("frontend/src/components/NewFeature.tsx", content, { autoStage: true })

// Smart navigation
filesystem.smart_navigate("contact")  // Returns all contact-related paths

// Workspace tree
filesystem.workspace_tree(2)  // Depth 2
```

#### 2. **clientforge-database** ✅
Multi-database operations with security:
```javascript
// PostgreSQL (MUST include tenant_id)
database.query_postgresql(
  "SELECT * FROM contacts WHERE tenant_id = $1 AND status = $2",
  [1, "active"]
)

// MongoDB
database.query_mongodb("logs", "find", { level: "error" }, { limit: 10 })

// Elasticsearch
database.search_elasticsearch("contacts_index", {
  match: { company_name: "Acme Corp" }
})

// Redis cache
database.cache_redis("get", "session:user:123")

// Health check
database.database_health()
```

#### 3. **clientforge-codebase** ✅
TypeScript code intelligence:
```javascript
// Find where ContactService is defined
codebase.find_definition("ContactService")

// Find all usages
codebase.find_references("ContactService")

// Impact analysis
codebase.breaking_change_analysis("backend/services/contact-service.ts")

// Dependency graph
codebase.dependency_graph("backend/routes/contacts.ts")
```

### Stub Servers (Return placeholders)

- **clientforge-testing** 🟡 - Jest test execution
- **clientforge-git** 🟡 - Git operations
- **clientforge-documentation** 🟡 - Doc generation
- **clientforge-build** 🟡 - CI gate execution
- **clientforge-rag** 🟡 - Semantic search
- **clientforge-orchestrator** 🟡 - Multi-agent coordination
- **clientforge-security** 🟡 - Security scanning
- **clientforge-logger** 🟡 - Structured logging
- **clientforge-context-pack** 🟡 - Smart context loading

---

## 📦 Context Packs (120KB Budget)

Available packs from `11_CONTEXT_PACKS.md`:

| Pack Name         | Size  | Purpose                          |
|-------------------|-------|----------------------------------|
| `auth_pack`       | ~30KB | Authentication & authorization   |
| `crm_pack`        | ~40KB | Core CRM features (contacts, deals) |
| `ai_pack`         | ~25KB | AI/ML features, MCP agents       |
| `ui_pack`         | ~15KB | Frontend components              |
| `security_pack`   | ~30KB | Security, OWASP, encryption      |
| `performance_pack`| ~25KB | Optimization, caching            |
| `search_pack`     | ~20KB | Search, Elasticsearch, filters   |

**Usage**: Read the pack file before working on related features.

---

## 🎯 Standard Workflow

### Stage → Validate → Promote

```
1. STAGE:
   filesystem.write_file("path/to/file.ts", code, { autoStage: true })
   → Writes to D:/clientforge-crm/_staging/path/to/file.ts

2. VALIDATE:
   build.run_ci_gate()  [STUB - use manual for now]
   → Run tests, type checks, linting

3. PROMOTE:
   filesystem.promote_staged_files()
   → Move from _staging to production

4. COMMIT:
   git.commit("feat: add new feature\n\nElaria-Generated")  [STUB]
```

---

## 🔐 Security Rules (CRITICAL)

### SQL Security
```javascript
// ✅ CORRECT - Parameterized query with tenant_id
database.query_postgresql(
  "SELECT * FROM contacts WHERE tenant_id = $1 AND id = $2",
  [tenantId, contactId]
)

// ❌ WRONG - No tenant_id
database.query_postgresql("SELECT * FROM contacts WHERE id = $1", [contactId])
// → Server will REJECT this

// ❌ WRONG - String interpolation
database.query_postgresql(`SELECT * FROM contacts WHERE id = ${contactId}`)
// → Server will REJECT this
```

### File Operations
```javascript
// ✅ CORRECT - Auto-staging
filesystem.write_file("src/new-feature.ts", code, { autoStage: true })
// → Goes to _staging first

// ⚠️ CAUTION - Direct write (skip staging)
filesystem.write_file("src/new-feature.ts", code, { autoStage: false })
// → Directly modifies production
```

---

## 📝 Coding Standards (ClientForge)

### TypeScript Rules
- **Zero `any` types** - Use proper TypeScript interfaces
- **85%+ test coverage** - Required for all new code
- **Deep folder structure** - 3-4 levels (e.g., `backend/services/contact/validation/`)
- **Named exports** - Avoid default exports

### Database Sync Pattern
```typescript
// All CRUD operations must sync across 4 databases:
1. PostgreSQL (source of truth)
2. Elasticsearch (search index)
3. MongoDB (logs, analytics)
4. Redis (cache, sessions)

// Example:
await db.contact.create(data);              // PostgreSQL
await es.index('contacts', contact);        // Elasticsearch
await mongo.logs.insertOne(auditLog);       // MongoDB
await redis.del(`contact:${contactId}`);    // Clear cache
```

### Logging
```typescript
import { logger } from '@backend/utils/logging/logger';

logger.info('Contact created', {
  tenant_id: tenant.id,
  contact_id: contact.id,
  user_id: req.user.id,
  action: 'create'
});
```

---

## 🧪 Testing Requirements

### Test Structure
```typescript
describe('ContactService', () => {
  describe('createContact', () => {
    it('should create contact with multi-tenant isolation', async () => {
      const contact = await contactService.create(tenant1, data);

      // Verify can't be accessed by other tenant
      await expect(
        contactService.findById(tenant2, contact.id)
      ).rejects.toThrow('Contact not found');
    });
  });
});
```

### Coverage Target
- **Lines**: 85%+
- **Branches**: 80%+
- **Functions**: 90%+
- **Statements**: 85%+

---

## 🚨 Common Pitfalls

### 1. Forgetting tenant_id
```typescript
// ❌ WRONG
await db.query("SELECT * FROM contacts WHERE id = $1", [id])

// ✅ CORRECT
await db.query(
  "SELECT * FROM contacts WHERE tenant_id = $1 AND id = $2",
  [tenantId, id]
)
```

### 2. Writing Directly to Production
```typescript
// ❌ WRONG
filesystem.write_file("src/new-feature.ts", code, { autoStage: false })

// ✅ CORRECT
filesystem.write_file("src/new-feature.ts", code, { autoStage: true })
// Then validate and promote
```

### 3. Using `any` Type
```typescript
// ❌ WRONG
function processData(data: any): any {
  return data.transform();
}

// ✅ CORRECT
interface DataInput {
  id: number;
  value: string;
}

interface DataOutput {
  transformed: string;
}

function processData(data: DataInput): DataOutput {
  return { transformed: data.value.toUpperCase() };
}
```

### 4. Not Syncing Databases
```typescript
// ❌ WRONG - Only updates PostgreSQL
await db.contact.update(id, data);

// ✅ CORRECT - Syncs all 4 databases
await db.contact.update(id, data);
await es.update('contacts', id, data);
await mongo.logs.insertOne({ action: 'update', id });
await redis.del(`contact:${id}`);
```

---

## 💡 Useful Shortcuts

### Quick File Navigation
```javascript
// Find all contact-related files
filesystem.search_files("**/contact*")

// Find TypeScript services
filesystem.search_files("backend/services/**/*.ts")

// Get recent files
filesystem.recent_files(10)
```

### Code Discovery
```javascript
// Find where a class is defined
codebase.find_definition("ContactService")

// Find all classes that implement an interface
codebase.find_implementations("IContactRepository")

// See type hierarchy
codebase.type_hierarchy("BaseService")
```

### Database Insights
```javascript
// Check which tables have tenant_id
database.check_tenant_isolation()

// Verify table schema
database.verify_schema("contacts")

// Health check all databases
database.database_health()
```

---

## 📊 Performance Tips

### 1. Load Context Efficiently
```javascript
// Load only what you need
filesystem.read_file("docs/claude/11_CONTEXT_PACKS.md")
// Then load specific pack
filesystem.read_file("backend/services/contact-service.ts")
```

### 2. Use Codebase Index
```javascript
// Fast: Uses pre-built index
codebase.find_references("ContactService")

// Slower: Full text search
filesystem.search_files("**/contact*")
```

### 3. Batch Database Operations
```javascript
// Use transactions for multiple operations
// (Not yet implemented in MCP, but use in code)
await db.transaction(async (tx) => {
  await tx.contact.create(data);
  await tx.audit.log(action);
});
```

---

## 🎓 Learn More

- **Master Guide**: `D:/clientforge-crm/README.md`
- **Recent Changes**: `D:/clientforge-crm/CHANGELOG.md`
- **Context System**: `D:/clientforge-crm/docs/claude/11_CONTEXT_PACKS.md`
- **Full System Prompt**: `D:/clientforge-crm/docs/ai/ELARIA_COMMAND_CENTER.md`
- **MCP Status**: `D:/clientforge-crm/agents/mcp/MCP_INSTALLATION_STATUS.md`

---

## ✅ Session Checklist

Before starting any task:

- [ ] Executed boot sequence (read README.md, CHANGELOG.md)
- [ ] Loaded appropriate context pack
- [ ] Verified workspace: `D:\clientforge-crm`
- [ ] Checked recent session logs
- [ ] Confirmed MCP servers connected (12/12)

---

*Elaria Command Center - ClientForge CRM v2.0*
*Last Updated: 2025-11-07*
