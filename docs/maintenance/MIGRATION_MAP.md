# 🗺️ ClientForge CRM - Migration Map

**Date**: 2025-11-11
**Purpose**: Old → New path mapping for reorganization
**Checkpoint**: `reorg_checkpoint` (commit `87ff161`)

---

## Overview

This document maps all file and directory movements during the repository reorganization. Use this to update imports, documentation links, and CI/CD paths.

---

## Directory Movements

### Database Migrations

```
OLD: backend/database/migrations/
NEW: database/migrations/

Moved Files:
- backend/database/migrations/001_initial_schema.sql
  → database/migrations/001_initial_schema.sql

- backend/database/migrations/002_performance_optimization.sql
  → database/migrations/002_performance_optimization.sql
```

**Import Updates Required**:
```typescript
// OLD
import { runMigrations } from '../backend/database/migrations'

// NEW
import { runMigrations } from '../database/migrations'
```

---

### Documentation Reorganization

#### AI-Related Documentation

```
OLD: docs/guides/AI_SESSION_QUICK_REFERENCE.md
NEW: docs/ai/AI_SESSION_QUICK_REFERENCE.md

OLD: docs/guides/ALBEDO_AI_CHAT_INSTALLATION_GUIDE.md
NEW: docs/ai/ALBEDO_AI_CHAT_INSTALLATION_GUIDE.md

OLD: docs/guides/HOW_TO_USE_AI_DOCUMENTATION_SYSTEM.md
NEW: docs/ai/HOW_TO_USE_AI_DOCUMENTATION_SYSTEM.md

OLD: docs/guides/ULTIMATE_AI_SYSTEM.md
NEW: docs/ai/ULTIMATE_AI_SYSTEM.md
```

#### Status & Implementation Docs

```
OLD: docs/guides/COMPLETE_ENHANCEMENT_SUMMARY.md
NEW: docs/status/COMPLETE_ENHANCEMENT_SUMMARY.md

OLD: docs/guides/FINAL_SUMMARY.md
NEW: docs/status/FINAL_SUMMARY.md

OLD: docs/guides/IMPLEMENTATION_STATUS.md
NEW: docs/status/IMPLEMENTATION_STATUS.md

OLD: docs/guides/INSTALLATION_COMPLETE.md
NEW: docs/status/INSTALLATION_COMPLETE.md

OLD: docs/guides/SETUP_COMPLETE.md
NEW: docs/status/SETUP_COMPLETE.md

OLD: docs/guides/SYSTEM_VERIFICATION.md
NEW: docs/status/SYSTEM_VERIFICATION.md
```

#### Getting Started Guides

```
OLD: docs/guides/QUICKSTART.md
NEW: docs/guides/getting-started/QUICKSTART.md

OLD: docs/guides/QUICKSTART_DOCKER.md
NEW: docs/guides/getting-started/QUICKSTART_DOCKER.md

OLD: docs/guides/QUICK_START_BAT.md
NEW: docs/guides/getting-started/archive/QUICK_START_BAT.md
```

#### Archived Documentation

```
OLD: docs/phase2.3/
NEW: archive/2025-11-11/docs/phase2.3/

Archived:
- DAY_7_PROGRESS_REPORT.md
- HANDOFF_TO_SONNET.md
- LIEUTENANT_BLUEPRINTS_COMPLETE.md
- README.md

OLD: docs/security-audit-2025-11-09/
NEW: archive/2025-11-11/docs/security-audit-2025-11-09/

Archived:
- ACTUAL_PROJECT_FIXES_NEEDED.md
- CLIENTFORGE_CRM_BUILD_PLAN.md
- CLIENTFORGE_FIX_SUMMARY.md
- CLIENTFORGE_INSTALLATION_COMPLETE.md
- CLIENTFORGE_QUICK_START.txt
- COMPLETE_AUDIT_ACTION_PLAN.md
- D_DRIVE_SECURITY_FIXES_APPLIED.md
- INIT_CLIENTFORGE_CRM.ps1
- README.md
- START_HERE.txt
```

---

### Scripts Reorganization

#### Archived Scripts

```
OLD: scripts/add-*.js
NEW: scripts/archive/add-*.js

Moved:
- add-email-permissions.js
- add-foreign-key-indexes.js
- add-fulltext-search-indexes.js
- add-missing-contact-columns.js
- add-missing-indexes.js

OLD: scripts/check-*.js
NEW: scripts/archive/check-*.js

Moved:
- check-contacts-schema.js
- check-deals-schema.js
- check-email-permissions.js
- check-indexes.js
- check-roles.js
- check-user-schema.js

OLD: scripts/setup-*.js
NEW: scripts/archive/setup-*.js

Moved:
- setup-deals-schema.js

OLD: scripts/grant-*.js
NEW: scripts/archive/grant-*.js

Moved:
- grant-super-admin-permissions.js

OLD: scripts/clear-*.js
NEW: scripts/archive/clear-*.js

Moved:
- clear-rate-limit.js

OLD: scripts/fix-*.ts
NEW: scripts/archive/fix-*.ts

Moved:
- fix-console-log.ts
```

---

### Environment Configuration

```
OLD: .env
NEW: .env.local (original restored as .env)

OLD: .env.example
NEW: .env.sample

NEW FILES CREATED:
- .env.staging (template)
- .env.production (template)

DELETED:
- backend/.env.lmstudio
```

**Usage**:
```bash
# Development
cp .env.sample .env.local

# Staging
cp .env.sample .env.staging
# Edit .env.staging with staging credentials

# Production
cp .env.sample .env.production
# Edit .env.production with production credentials
```

---

## Module System Structure

### New Backend Module Organization

```
NEW: backend/core/modules/
├── EventBus.ts (new)
├── FeatureFlags.ts (new)
├── ModuleContract.ts (new)
└── ModuleRegistry.ts (new)

NEW: backend/modules/
├── activities/activities.module.ts
├── auth/module.ts
├── billing/billing.module.ts
├── compliance/gdpr.module.ts
├── core/module.ts
├── custom-fields/custom-fields.module.ts
├── import-export/import-export.module.ts
├── notifications/notifications.module.ts
├── search/search.module.ts
└── tier2-modules.ts
```

**Import Pattern**:
```typescript
// Register a module
import { moduleRegistry } from './core/modules/ModuleRegistry'
import { billingModule } from './modules/billing/billing.module'

moduleRegistry.register(billingModule)
```

---

## Middleware Additions

### Elasticsearch Tenant Isolation

```
NEW: backend/middleware/elasticsearch-tenant-isolation.ts (324 lines)
NEW: backend/middleware/search/tenant-filter.middleware.ts
```

**Usage in Routes**:
```typescript
import { enforceElasticsearchTenantIsolation } from '../../../../middleware/elasticsearch-tenant-isolation'

router.get('/search', authenticate, enforceElasticsearchTenantIsolation, searchHandler)
```

### Advanced Rate Limiting

```
NEW: backend/middleware/advanced-rate-limit.ts
```

### API Key Authentication

```
NEW: backend/middleware/api-key-auth.ts
```

---

## Service Reorganization

### Auth Services

```
NEW: backend/services/auth/
├── sso/
│   ├── google-oauth.provider.ts
│   ├── microsoft-oauth.provider.ts
│   ├── saml.provider.ts
│   └── sso-provider.service.ts
└── mfa/
    ├── totp.service.ts
    └── backup-codes.service.ts
```

### Billing Services

```
NEW: backend/services/billing/
├── dunning.service.ts
├── invoice.service.ts
├── payment-methods.service.ts
├── stripe.service.ts
├── subscription.service.ts
├── tax-calculation.service.ts
└── usage-metering.service.ts
```

### Search Services

```
NEW: backend/services/search/
├── elasticsearch.service.ts
├── search-synonyms.service.ts
└── search-telemetry.service.ts
```

### Email Services

```
NEW: backend/services/email/
├── email.service.ts
└── templates/
    ├── gdpr-export-ready.html
    ├── invoice.html
    ├── password-reset.html
    ├── payment-failed.html
    └── welcome.html
```

---

## Configuration Changes

### Monitoring Config

```
NEW: config/grafana/
├── dashboards/
│   ├── dashboards.yml
│   └── queue-dashboard.json
└── datasources/
    └── datasources.yml

NEW: config/prometheus/
├── prometheus.yml
└── alerts/
    └── queue-alerts.yml

NEW: config/loki/
└── loki.yaml

NEW: config/promtail/
└── promtail.yaml
```

### Queue Config

```
NEW: config/queue/
└── bullmq.config.ts
```

---

## Infrastructure

### Nginx Configuration

```
NEW: infrastructure/nginx/
├── nginx.conf
└── conf.d/
    └── clientforge.conf
```

**Reference in Deployment**:
```yaml
# docker-compose.yml
nginx:
  volumes:
    - ./infrastructure/nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./infrastructure/nginx/conf.d:/etc/nginx/conf.d:ro
```

---

## Frontend Changes

### Auth Components

```
NEW: frontend/components/Auth/
├── SSO/
│   └── SSOLoginButton.tsx
└── MFA/
    ├── MFASetup.tsx
    └── TOTPVerification.tsx

NEW: frontend/apps/crm-web/src/components/Auth/
├── SSO/
│   └── SSOLoginButton.tsx
└── MFA/
    ├── MFASetup.tsx
    └── TOTPVerification.tsx
```

---

## API Routes

### New Routes

```
NEW: backend/api/rest/v1/routes/
├── activity-timeline-routes.ts
├── api-keys-routes.ts
├── billing-routes.ts
├── email-tracking-routes.ts (moved from backend/api/routes/)
├── files-routes.ts
├── gdpr-routes.ts
├── import-export-routes.ts
├── notifications-routes.ts
├── search-v2-routes.ts
├── sso-routes.ts
├── subscription-routes.ts
└── webhook-routes.ts
```

**Old Location**:
```
backend/api/routes/email-tracking-routes.ts
```

**New Location**:
```
backend/api/rest/v1/routes/email-tracking-routes.ts
```

---

## Workers

### Queue Workers

```
NEW: backend/workers/
├── queue-workers.ts (main worker)
└── billing/
    ├── invoice-generator.worker.ts
    └── payment-retry.worker.ts
```

---

## Test Files

### New Test Structure

```
NEW: tests/unit/services/auth/
├── sso-provider.service.test.ts
└── totp.service.test.ts

NEW: tests/e2e/
├── auth.spec.ts
└── global-setup.ts

NEW: tests/performance/
├── k6-baseline.js
└── k6-load-test.js

NEW: tests/security/
└── rls-tests.spec.ts
```

---

## Deleted Files

### Build Artifacts

```
DELETED:
- backend/test-ai-import.js
- config/app/app-config.d.ts.map
- config/app/app-config.js.map
- config/database/*.map (12 files)
- config/security/*.map (6 files)
- agents/.tsbuildinfo
```

### Duplicate/Backup Files

```
DELETED:
- frontend/src/pages/Dashboard.tsx.backup
- frontend/src/pages/Deals.tsx.backup
- frontend/src/pages/DealsOld.tsx.backup
- agents/adapters/planner_claude_sdk_old.ts.bak
- lerna.json (not using Lerna)
```

### Root Documentation (Moved to Docs)

```
DELETED FROM ROOT:
- CHANGELOG.md (moved to docs/ or will be regenerated)
- QUICK_START.md (consolidated into docs/guides/getting-started/)
- SESSION_LOG_2025-11-10.md (moved to logs/session-logs/)
```

### Obsolete Scripts

```
DELETED:
- tests/jest.config.js (using TypeScript config)
- frontend/clear_albedo_position.html (test file)
- frontend/ChatGPT Image Nov 3, 2025, 02_15_35 PM.png (test image)
```

---

## Import Path Updates Required

### Backend Imports

```typescript
// Database migrations
// OLD
import from '../backend/database/migrations'
// NEW
import from '../database/migrations'

// Email tracking routes
// OLD
import from '../api/routes/email-tracking-routes'
// NEW
import from '../api/rest/v1/routes/email-tracking-routes'

// Config maps (removed)
// OLD
import from '../../config/database/postgres-config.js.map'
// NEW
// Delete these imports - source maps not needed in runtime
```

### Frontend Imports

```typescript
// No changes to frontend imports required
// All paths remain relative to frontend/src/
```

---

## CI/CD Path Updates

### GitHub Actions

Update workflow paths if referencing:
```yaml
# OLD
- backend/database/migrations/

# NEW
- database/migrations/
```

### Docker Compose

Update volume mounts:
```yaml
# OLD
volumes:
  - ./backend/database/migrations:/app/migrations

# NEW
volumes:
  - ./database/migrations:/app/migrations
```

---

## Documentation Link Updates

### README.md Links

Check and update links to moved documentation:
```markdown
<!-- OLD -->
[Implementation Status](docs/guides/IMPLEMENTATION_STATUS.md)
[Quick Start](docs/guides/QUICKSTART.md)

<!-- NEW -->
[Implementation Status](docs/status/IMPLEMENTATION_STATUS.md)
[Quick Start](docs/guides/getting-started/QUICKSTART.md)
```

### Internal Documentation Cross-References

Update links in all markdown files:
```bash
# Find broken links
grep -r "docs/guides/IMPLEMENTATION_STATUS" docs/
# Should now point to docs/status/IMPLEMENTATION_STATUS.md

grep -r "backend/database/migrations" docs/
# Should now point to database/migrations
```

---

## Verification Commands

### Check Import Paths

```bash
# Find imports from old backend/database/migrations
grep -r "from.*backend/database/migrations" backend/ --include="*.ts"

# Find imports from old backend/api/routes (non-REST)
grep -r "from.*backend/api/routes" backend/ --include="*.ts"
```

### Check Documentation Links

```bash
# Find broken doc links
find docs/ -name "*.md" -exec grep -l "docs/guides/IMPLEMENTATION_STATUS" {} \;

# Should return empty or files that need updating
```

### Check Config References

```bash
# Find references to deleted .map files
grep -r "\.js\.map\|\.d\.ts\.map" backend/ config/ --include="*.ts" --include="*.json"
```

---

## Summary

### Total Movements
- **Database Migrations**: 2 files → `database/migrations/`
- **Documentation**: 26 files reorganized
- **Scripts**: 14 files → `scripts/archive/`
- **Archived Documentation**: 19 files → `archive/2025-11-11/docs/`
- **Configuration**: 4 env files standardized
- **New Files Created**: 107 files (modules, services, routes)
- **Deleted Files**: 58 files (build artifacts, backups, obsolete)

### Key Paths to Remember

| Type | Old Path | New Path |
|------|----------|----------|
| DB Migrations | `backend/database/migrations/` | `database/migrations/` |
| AI Docs | `docs/guides/AI_*.md` | `docs/ai/` |
| Status Docs | `docs/guides/*_STATUS.md` | `docs/status/` |
| Quick Start | `docs/guides/QUICKSTART.md` | `docs/guides/getting-started/` |
| Email Routes | `backend/api/routes/email-tracking` | `backend/api/rest/v1/routes/` |
| Config Maps | `config/**/*.map` | *Deleted* |
| Old Scripts | `scripts/add-*.js` | `scripts/archive/` |
| Phase Docs | `docs/phase2.3/` | `archive/2025-11-11/docs/` |

---

**Document Updated**: 2025-11-11
**Git Checkpoint**: `reorg_checkpoint` (87ff161)
**Related Docs**: [REORG_REPORT.md](./REORG_REPORT.md), [ROLLBACK.md](./ROLLBACK.md)
