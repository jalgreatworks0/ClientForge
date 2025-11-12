# ClientForge-CRM Migration Guide

**Version**: 2.0 → 3.0  
**Last Updated**: 2025-11-12

---

## Overview

This guide covers migration paths for ClientForge-CRM across major version updates, including breaking changes, deprecations, and required actions.

---

## TypeScript Strict Mode Migration (v2.x → v3.0)

**Status**: In Progress (Phase 1 Complete)  
**Impact**: Development environment only (no runtime changes)  
**Timeline**: Incremental over 5 phases

### What Changed

ClientForge-CRM is migrating to TypeScript strict mode for improved type safety. As of Phase 1:

- ✅ Four strict flags enabled: `noImplicitAny`, `noImplicitThis`, `strictBindCallApply`, `alwaysStrict`
- ⚠️ 309 type errors now visible (previously hidden)
- ✅ Build still works (`noEmitOnError: false` keeps builds green)
- ✅ No runtime impact

### For Developers

#### Immediate Actions Required

**None** - Your existing code continues to work. Type errors are warnings only.

#### Optional: Fix Type Errors in Your Code

If you want to proactively fix type errors in files you're working on:

1. **Check for errors**:
   ```bash
   npm run type-check
   ```

2. **View progress tracker**:
   ```bash
   cat scripts/dev-tools/strict-progress.md
   ```

3. **Common fixes**:

   **Problem**: `Parameter 'req' implicitly has an 'any' type`
   ```typescript
   // Before:
   router.get('/users', (req, res) => { ... });
   
   // After:
   import { Request, Response } from 'express';
   router.get('/users', (req: Request, res: Response) => { ... });
   ```

   **Problem**: `Property 'userId' does not exist on type 'Request'`
   ```typescript
   // Before:
   const userId = req.user.userId;
   
   // After (Phase 2 will standardize this):
   const userId = req.user?.id || req.user?.userId;
   ```

#### CI/CD Impact

- ✅ CI builds continue to pass
- ✅ Tests continue to run
- ⚠️ Type-check warnings appear in logs (non-blocking)

### Roadmap

| Phase | Target | Status |
|-------|--------|--------|
| Phase 1: Enable safe flags | Baseline established | ✅ Complete |
| Phase 2: Fix AuthRequest | -57% errors | 🔜 Next |
| Phase 3: Add explicit types | -20% errors | 📋 Planned |
| Phase 4: Module resolution | -8% errors | 📋 Planned |
| Phase 5: Property access | -15% errors | 📋 Planned |
| Phase 6: Full strict mode | Zero errors | 🎯 Goal |

**See**: `/docs/architecture/decisions/ADR-0002-typescript-strict-mode.md` for complete technical details.

---

## Future Migrations

### Database Schema Updates (Planned)

Coming in future releases:
- Multi-tenant partition strategy
- Enhanced audit logging tables
- Performance optimization indexes

### API Versioning (v2 → v3)

Breaking API changes will be documented here when v3 API is released.

---

## Rollback Procedures

### TypeScript Strict Mode Rollback

If strict mode causes blocking issues:

```bash
# Checkout pre-strict commit
git checkout <commit-before-strict>

# Or disable flags in backend/tsconfig.json
{
  "noImplicitAny": false,
  "noImplicitThis": false,
  "strictBindCallApply": false,
  "alwaysStrict": false
}
```

---

## Support

For migration questions or issues:
- **Documentation**: `/docs/architecture/decisions/`
- **Progress Tracker**: `scripts/dev-tools/strict-progress.md`
- **Team Contact**: Engineering team via Slack #clientforge-dev
