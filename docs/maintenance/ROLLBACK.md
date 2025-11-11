# 🔄 ClientForge CRM - Reorganization Rollback Guide

**Date**: 2025-11-11
**Checkpoint**: `reorg_checkpoint` (commit `87ff161`)
**Archive**: `archive/reorg_20251111/`

---

## Quick Rollback (Full Revert)

If the reorganization causes critical issues, execute:

```bash
cd d:/clientforge-crm

# Full rollback to checkpoint
git reset --hard reorg_checkpoint

# Verify clean state
git status

# Should show: "HEAD detached at reorg_checkpoint"
# Or: "On branch feature/agents-control-plane, nothing to commit"

# Restart services
npm run dev:backend
```

**What This Does**:
- Reverts **all changes** back to commit `87ff161`
- Discards **all uncommitted changes**
- Restores original file structure

**Data Loss**: Any changes made AFTER the checkpoint will be lost

---

## Selective Rollback (By Change Set)

Roll back specific changes while keeping others.

### Rollback Change Set 2.1: Checkpoint & Archive

**Not Applicable** - This created the checkpoint itself

---

### Rollback Change Set 2.2: Vite Proxy + Axios

**Status**: No changes made (already correct)

**If issues with frontend routing**:
```bash
# Check current config
cat frontend/vite.config.ts | grep -A5 "proxy"
cat frontend/src/lib/api.ts | grep "baseURL"

# If incorrect, restore from checkpoint
git checkout reorg_checkpoint -- frontend/vite.config.ts
git checkout reorg_checkpoint -- frontend/src/lib/api.ts
```

---

### Rollback Change Set 2.3: Elasticsearch Tenant Isolation

**Status**: Middleware already existed (no changes)

**If search queries fail**:
```bash
# Verify middleware exists
ls -lh backend/middleware/elasticsearch-tenant-isolation.ts

# Check search routes
git diff reorg_checkpoint -- backend/api/rest/v1/routes/search-routes.ts

# If changes detected, revert
git checkout reorg_checkpoint -- backend/api/rest/v1/routes/search-routes.ts
```

---

### Rollback Change Set 2.4: Login Error Codes

**Status**: Already returns 401 (no changes)

**If login errors return 500 instead of 401**:
```bash
# Check auth service
git diff reorg_checkpoint -- backend/core/auth/auth-service.ts
git diff reorg_checkpoint -- backend/api/rest/v1/controllers/auth-controller.ts

# Revert if changed
git checkout reorg_checkpoint -- backend/core/auth/auth-service.ts
git checkout reorg_checkpoint -- backend/api/rest/v1/controllers/auth-controller.ts
```

---

### Rollback Change Set 2.5: Post-Reorg Verifier Script

**File Created**: `scripts/verify/post-reorg-verify.ps1`

**To Remove**:
```bash
# Delete verifier script
rm scripts/verify/post-reorg-verify.ps1

# Or move to archive
mv scripts/verify/post-reorg-verify.ps1 archive/reorg_20251111/
```

**Risk**: Low (script is read-only verification tool)

---

### Rollback Change Set 2.6: Documentation (REORG_REPORT, MIGRATION_MAP, ROLLBACK)

**Files Created**:
- `docs/maintenance/REORG_REPORT.md`
- `docs/maintenance/MIGRATION_MAP.md`
- `docs/maintenance/ROLLBACK.md` (this file)

**To Remove**:
```bash
# Delete documentation
rm docs/maintenance/REORG_REPORT.md
rm docs/maintenance/MIGRATION_MAP.md
rm docs/maintenance/ROLLBACK.md

# Or move to archive
mv docs/maintenance/REORG_REPORT.md archive/reorg_20251111/
mv docs/maintenance/MIGRATION_MAP.md archive/reorg_20251111/
mv docs/maintenance/ROLLBACK.md archive/reorg_20251111/
```

**Risk**: None (documentation only)

---

## Rollback Pre-Checkpoint Changes

The checkpoint commit `87ff161` contains 303 file changes from previous cleanup. To revert these:

### Option 1: Full Revert to Before Cleanup

```bash
# Find parent commit of checkpoint
git log --oneline -n 5

# Revert to commit before 87ff161
git reset --hard <commit-before-87ff161>
```

**WARNING**: This undoes **ALL cleanup work** including:
- Database migration movements
- Documentation reorganization
- Module system creation
- SSO/MFA implementation
- Environment config standardization

### Option 2: Selective Revert of Specific Files

Restore individual files/directories from before checkpoint:

```bash
# Restore specific file
git show <commit-before-87ff161>:path/to/file > path/to/file

# Restore directory
git checkout <commit-before-87ff161> -- path/to/directory/
```

**Examples**:
```bash
# Restore old database migrations location
git checkout <commit-before-87ff161> -- backend/database/migrations/

# Restore old docs structure
git checkout <commit-before-87ff161> -- docs/guides/

# Restore old scripts
git checkout <commit-before-87ff161> -- scripts/
```

---

## Restore from Archive

If files were accidentally deleted, restore from archive:

```bash
# List archive contents
ls -la archive/reorg_20251111/

# Restore specific file
cp archive/reorg_20251111/docs/phase2.3/README.md docs/phase2.3/

# Restore directory
cp -r archive/reorg_20251111/docs/security-audit-2025-11-09/ docs/

# Restore all archived docs
cp -r archive/reorg_20251111/docs/* docs/
```

---

## Database Rollback

### If Database Migrations Moved Incorrectly

```bash
# Restore migrations to old location
mkdir -p backend/database/migrations
cp -r database/migrations/* backend/database/migrations/

# Update migration runner paths
# Edit backend/scripts/initialize-databases.ts
# Change: database/migrations → backend/database/migrations
```

### If Migration Ran and Failed

```bash
# Connect to PostgreSQL
psql -h localhost -p 5432 -U crm -d clientforge

# Check migration status
SELECT * FROM migrations ORDER BY id DESC LIMIT 5;

# Rollback specific migration
-- Run the "down" migration script manually

# Or use migration tool
npm run migrate:rollback
```

---

## Service Restart After Rollback

### Full Service Restart

```bash
# Stop all background processes
# Windows: Ctrl+C in each terminal

# Or kill specific processes
taskkill /F /IM node.exe
taskkill /F /IM npm.cmd

# Restart databases (Docker)
docker-compose restart postgres mongodb redis elasticsearch

# Restart backend
npm run dev:backend

# Restart frontend
npm --prefix frontend run dev
```

### Clear Caches After Rollback

```bash
# Clear Redis cache
redis-cli FLUSHALL

# Clear Elasticsearch indexes (CAUTION: Deletes data)
# curl -X DELETE "http://localhost:9200/_all"

# Clear node_modules and rebuild
rm -rf node_modules
npm install

# Clear TypeScript build cache
rm -rf backend/dist
rm -rf frontend/dist
npm run build
```

---

## Verification After Rollback

### 1. Check Git Status

```bash
git status
# Should show clean working tree or expected changes

git log --oneline -n 10
# Verify commit history matches expectations
```

### 2. Verify File Structure

```bash
# Check critical directories exist
ls -la backend/
ls -la frontend/
ls -la database/
ls -la docs/

# Check configuration files
ls -la .env*
ls -la package.json
ls -la tsconfig.json
```

### 3. Test Backend

```bash
# Start backend
npm run dev:backend

# Test health endpoint
curl http://localhost:3000/api/v1/health

# Expected: {"success":true,"data":{"status":"healthy"}}
```

### 4. Test Frontend

```bash
# Start frontend
npm --prefix frontend run dev

# Open browser
# Expected: http://localhost:3001 loads without errors
```

### 5. Run Verifier (If Available)

```bash
# If verifier script exists
powershell -File scripts/verify/post-reorg-verify.ps1

# Or manual checks
netstat -ano | findstr ":3000"  # Backend
netstat -ano | findstr ":3001"  # Frontend
netstat -ano | findstr ":5432"  # PostgreSQL
```

---

## Emergency Recovery

### If Rollback Fails

```bash
# Check git reflog (shows all state changes)
git reflog

# Find checkpoint in reflog
# Looks like: 87ff161 HEAD@{0}: commit: chore(reorg): checkpoint before safe reroute

# Force reset to that reflog entry
git reset --hard HEAD@{N}
# Where N is the number from reflog
```

### If Reflog Doesn't Help

```bash
# Check if tag still exists
git tag -l | grep reorg

# Force reset to tag
git reset --hard reorg_checkpoint

# If tag is missing, find commit by message
git log --all --grep="checkpoint before safe reroute"

# Reset to found commit
git reset --hard <commit-hash>
```

### If All Else Fails

```bash
# Clone fresh copy from remote
cd ..
git clone <repository-url> clientforge-crm-recovery

# Or fetch from remote and force reset
git fetch origin
git reset --hard origin/main  # Or origin/feature/agents-control-plane
```

---

## Rollback Checklist

### Before Rollback

- [ ] Stop all running services (backend, frontend)
- [ ] Backup current state if needed: `git stash`
- [ ] Note current commit: `git log -n 1`
- [ ] Verify checkpoint tag exists: `git tag -l | grep reorg`

### During Rollback

- [ ] Execute rollback command (full or selective)
- [ ] Verify git status is clean
- [ ] Check file structure matches expectations
- [ ] Clear caches if needed (Redis, TypeScript, node_modules)

### After Rollback

- [ ] Restart database services (Docker)
- [ ] Start backend: `npm run dev:backend`
- [ ] Test health endpoint: `curl http://localhost:3000/api/v1/health`
- [ ] Start frontend: `npm --prefix frontend run dev`
- [ ] Access frontend: `http://localhost:3001`
- [ ] Run smoke tests if available
- [ ] Document what was rolled back and why

---

## Support Commands

### Check Current State

```bash
# Current branch and commit
git log --oneline --decorate -n 5

# Files changed since checkpoint
git diff reorg_checkpoint --stat

# Specific file diff
git diff reorg_checkpoint -- path/to/file

# Show checkpoint details
git show reorg_checkpoint
```

### Compare States

```bash
# Compare current to checkpoint
git diff reorg_checkpoint

# Compare checkpoint to parent
git diff reorg_checkpoint^ reorg_checkpoint

# Show files in commit
git show --name-status reorg_checkpoint
```

### List Tagged States

```bash
# All tags
git tag -l

# Tags with commit info
git tag -l --format='%(refname:short) %(objectname:short)'

# Checkpoints only
git tag -l | grep checkpoint
```

---

## Contact & Escalation

### If Rollback Doesn't Resolve Issue

1. **Check Logs**: Review error logs in `logs/` directory
2. **Check Services**: Ensure all Docker containers are running
3. **Check Dependencies**: Run `npm install` to restore packages
4. **Document Error**: Note exact error message and steps to reproduce
5. **Create Issue**: File issue in GitHub with `rollback-failure` label

### Rollback Doesn't Work

If `git reset --hard reorg_checkpoint` fails:

1. Check git integrity: `git fsck`
2. Verify repository: `git status`
3. Try soft reset: `git reset --soft reorg_checkpoint`
4. Check reflog: `git reflog`
5. Contact DevOps team with git reflog output

---

## Summary

### Quick Reference

| Rollback Scope | Command | Risk |
|----------------|---------|------|
| **Full Revert** | `git reset --hard reorg_checkpoint` | High (loses all changes) |
| **Single File** | `git checkout reorg_checkpoint -- file` | Low |
| **Directory** | `git checkout reorg_checkpoint -- dir/` | Medium |
| **From Archive** | `cp archive/reorg_20251111/... dest/` | None |
| **Soft Reset** | `git reset --soft reorg_checkpoint` | Low (keeps changes) |

### Files Created in This Reorganization

- `scripts/verify/post-reorg-verify.ps1` → Verifier script
- `docs/maintenance/REORG_REPORT.md` → Comprehensive report
- `docs/maintenance/MIGRATION_MAP.md` → Path mappings
- `docs/maintenance/ROLLBACK.md` → This file

**All can be safely deleted with no impact on core functionality.**

---

**Document Created**: 2025-11-11
**Git Checkpoint**: `reorg_checkpoint` (87ff161)
**Related Docs**: [REORG_REPORT.md](./REORG_REPORT.md), [MIGRATION_MAP.md](./MIGRATION_MAP.md)
