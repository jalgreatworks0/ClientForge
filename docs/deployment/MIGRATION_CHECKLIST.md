# 🚨 MODULAR PLUGIN ARCHITECTURE MIGRATION CHECKLIST

**Date**: 2025-11-10
**Status**: IN PROGRESS
**Risk Level**: HIGH - Will break existing system temporarily

---

## 📋 BREAKING CHANGES EXPECTED

### 1. Server Won't Start (Expected)
**Why**: Backend/index.ts and backend/api/server.ts completely rewritten
**Files Affected**:
- `backend/index.ts` - Complete rewrite to use ModuleRegistry
- `backend/api/server.ts` - Complete rewrite to delegate routes to modules
- `backend/api/routes.ts` - Will be REMOVED (replaced by module-based routing)

**Fix Order**:
1. Update `backend/index.ts` first
2. Update `backend/api/server.ts` second
3. Ensure PostgreSQL pool exports correctly
4. Test health check endpoint first: `curl http://localhost:3000/api/v1/health`

---

### 2. Routes Will Return 404 (Expected)
**Why**: All routes moved from centralized `routes.ts` to individual module files
**Affected Endpoints**:
- `/api/v1/contacts/*` - Moved to `backend/modules/contacts/routes.ts`
- `/api/v1/deals/*` - Moved to `backend/modules/deals/routes.ts`
- `/api/v1/email/*` - Moved to `backend/modules/email/routes.ts`
- `/api/v1/analytics/*` - Moved to `backend/modules/analytics/routes.ts`

**Fix Order**:
1. Create base module structure for each existing module
2. Move route handlers to module-specific files
3. Register each module in `backend/index.ts`
4. Test each endpoint individually

---

### 3. Database Pool Import Errors (Expected)
**Why**: Modules need `db` export from pool
**File**: `backend/database/postgresql/pool.ts`
**Error**: `Cannot read properties of undefined (reading 'query')`

**Fix**: Ensure this export exists:
```typescript
export const db = getPool();
```

**Already Fixed**: ✅ (from previous session)

---

### 4. Queue Registry Not Found (Expected)
**Why**: Module context needs queueRegistry reference
**File**: `config/queue/bullmq.config.ts`

**Fix**: Export singleton:
```typescript
export const queueRegistry = new QueueRegistry();
```

**Status**: Need to add export

---

### 5. Elasticsearch Client Not Exported (Expected)
**File**: `config/database/elasticsearch-config.ts`

**Fix**: Ensure esClient is exported:
```typescript
export const esClient = new Client({ ... });
```

**Status**: Need to verify export exists

---

## 🔧 FILES TO CREATE (New Module Structure)

### Core Modules (Must Create):
1. ✅ `backend/core/modules/ModuleContract.ts` - DONE
2. ✅ `backend/core/modules/ModuleRegistry.ts` - DONE
3. ✅ `backend/core/modules/EventBus.ts` - DONE
4. ✅ `backend/core/modules/FeatureFlags.ts` - DONE

### Module Implementations (Must Create):
5. ⏳ `backend/modules/contacts/module.ts` - Contact module implementation
6. ⏳ `backend/modules/contacts/routes.ts` - Contact routes
7. ⏳ `backend/modules/deals/module.ts` - Deals module implementation
8. ⏳ `backend/modules/deals/routes.ts` - Deals routes
9. ⏳ `backend/modules/email/module.ts` - Email module implementation
10. ⏳ `backend/modules/email/routes.ts` - Email routes
11. ⏳ `backend/modules/analytics/module.ts` - Analytics module
12. ⏳ `backend/modules/analytics/routes.ts` - Analytics routes
13. ⏳ `backend/modules/auth/module.ts` - Auth module
14. ⏳ `backend/modules/auth/routes.ts` - Auth routes

---

## 📝 FILES TO MODIFY (Existing Files)

### Critical Updates:
1. ⏳ `backend/index.ts` - Complete rewrite to use ModuleRegistry
2. ⏳ `backend/api/server.ts` - Complete rewrite to delegate to modules
3. ⏳ `config/queue/bullmq.config.ts` - Export queueRegistry singleton
4. ⏳ `config/database/elasticsearch-config.ts` - Verify esClient export
5. ⏳ `config/database/postgres-config.ts` - Verify db pool export

### Files to DELETE:
- ⏳ `backend/api/routes.ts` - No longer needed (routes in modules)

---

## 🧪 TESTING SEQUENCE (After Migration)

### Step 1: Start Server
```bash
npm run dev:backend
```
**Expected**: Server starts without errors
**If Fails**: Check logs for missing imports

### Step 2: Health Check
```bash
curl http://localhost:3000/api/v1/health
```
**Expected**: JSON response with module health status
**If 404**: Server.ts not registering health route
**If 500**: Module initialization failed

### Step 3: Module Info
```bash
curl http://localhost:3000/api/v1/modules
```
**Expected**: List of all registered modules
**If Empty**: ModuleRegistry.register() not called

### Step 4: Test Each Module
```bash
# Auth
curl -X POST http://localhost:3000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"master@clientforge.io","password":"Admin123"}'

# Contacts (with auth token)
curl http://localhost:3000/api/v1/contacts -H "Authorization: Bearer YOUR_TOKEN"

# Deals
curl http://localhost:3000/api/v1/deals -H "Authorization: Bearer YOUR_TOKEN"

# Analytics
curl http://localhost:3000/api/v1/analytics/revenue-metrics -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 5: Frontend Test
```bash
# Start frontend
npm run dev:frontend

# Or use start-all.bat
scripts\deployment\start-all.bat
```
**Expected**: Login works, dashboard loads
**If Login Fails**: Auth module routes not registered
**If 404s**: Module routes not properly registered

---

## 🔥 COMMON ERRORS & FIXES

### Error 1: "Cannot find module 'ModuleRegistry'"
**Cause**: TypeScript compilation issue
**Fix**:
```bash
npm run build:backend
# Or restart ts-node-dev
```

### Error 2: "Module 'contacts' requires missing dependency 'database'"
**Cause**: Module dependencies not satisfied
**Fix**: Create a 'database' pseudo-module or remove from dependencies

### Error 3: "Circular dependency detected: contacts → deals → contacts"
**Cause**: Modules depend on each other
**Fix**: Remove circular dependency, use events instead

### Error 4: All routes return 404
**Cause**: Module routes not registered
**Fix**: Check `module.registerRoutes()` is called in Server.ts

### Error 5: "db.query is not a function"
**Cause**: Database pool not properly passed to module context
**Fix**: Check ModuleContext.db is getPool() instance

---

## 📊 ROLLBACK PLAN (If Everything Breaks)

### Option A: Git Revert
```bash
git status
git diff backend/index.ts
git checkout HEAD -- backend/index.ts backend/api/server.ts
npm run dev:backend
```

### Option B: Keep Module Files, Restore Entry Points
1. Keep all new `backend/modules/*` files
2. Restore old `backend/index.ts` from git
3. Restore old `backend/api/server.ts` from git
4. Restore old `backend/api/routes.ts` from git
5. System works again, modules exist but not used

### Option C: Manual Restore
- Copy this file list and manually undo changes
- Takes ~10 minutes

---

## 🎯 SUCCESS CRITERIA

### Minimum Viable Migration:
- [⏳] Server starts without errors
- [⏳] `/api/v1/health` returns 200
- [⏳] `/api/v1/modules` shows all modules
- [⏳] Login works (`POST /api/v1/auth/login`)
- [⏳] Contacts list works (`GET /api/v1/contacts`)
- [⏳] Dashboard loads in frontend

### Full Migration Success:
- [⏳] All 5+ modules registered
- [⏳] All routes working (auth, contacts, deals, email, analytics)
- [⏳] Event bus operational (inter-module communication)
- [⏳] Feature flags working
- [⏳] Queue jobs still processing
- [⏳] WebSocket still connected
- [⏳] Frontend fully functional

---

## 📅 MIGRATION TIMELINE

**Phase 1**: Core Infrastructure (✅ COMPLETE - 30 min)
- Created ModuleContract, ModuleRegistry, EventBus, FeatureFlags

**Phase 2**: Server Rewiring (⏳ IN PROGRESS - 45 min estimated)
- Update backend/index.ts
- Update backend/api/server.ts
- Export required singletons

**Phase 3**: Module Migration (⏳ NEXT - 90 min estimated)
- Create auth module
- Create contacts module
- Create deals module
- Create email module
- Create analytics module

**Phase 4**: Testing & Fixes (⏳ FINAL - 60 min estimated)
- Test all endpoints
- Fix broken routes
- Verify frontend works
- Test start-all.bat

**Total Estimated Time**: 3-4 hours

---

## 🚀 NEXT STEPS (In Order)

1. Export queueRegistry from bullmq.config.ts
2. Verify esClient export from elasticsearch-config.ts
3. Create auth module (smallest, test first)
4. Update backend/index.ts to use ModuleRegistry
5. Update backend/api/server.ts to delegate to modules
6. Test server starts
7. Create remaining modules one by one
8. Test each module as it's added
9. Full integration test
10. Update CHANGELOG and create session log

---

**CURRENT STATUS**: Core infrastructure ready, beginning server rewiring
**RISK**: HIGH - System will be non-functional during migration
**MITIGATION**: This checklist + git revert if needed
**CONFIDENCE**: Medium - Architecture is sound, just need careful execution

---

**Last Updated**: 2025-11-10
**By**: Claude Code (Sonnet 4.5)
