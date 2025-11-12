# ClientForge-CRM System Architecture

**Version**: 2.0  
**Last Updated**: 2025-11-12  
**Status**: Production

---

## Overview

ClientForge-CRM is a modern, multi-tenant Customer Relationship Management system built with a microservices-oriented architecture. The system supports 340+ API endpoints with enterprise-grade security, scalability, and maintainability.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend Layer                        │
│  React 18 + TypeScript + Tailwind CSS + shadcn/ui          │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS/REST
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Gateway Layer                       │
│  Express.js + Rate Limiting + Auth Middleware               │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Business   │ │   Business   │ │   Business   │
│   Services   │ │   Services   │ │   Services   │
│              │ │              │ │              │
│ • Contacts   │ │ • Billing    │ │ • Analytics  │
│ • Accounts   │ │ • Invoicing  │ │ • Reports    │
│ • Deals      │ │ • Payments   │ │ • AI/ML      │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │
       └────────────────┼────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                       │
│  SQLite + Sequelize ORM + Query Optimization                │
└─────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x + shadcn/ui components
- **State Management**: React Context + Hooks
- **Build Tool**: Vite
- **Routing**: React Router v6

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **ORM**: Sequelize 6.x
- **Authentication**: JWT + Passport.js
- **Validation**: Joi / Zod

### Database
- **Primary**: SQLite (development & production)
- **Future**: PostgreSQL (planned for scale)
- **Migrations**: Sequelize CLI
- **Backup**: Automated daily snapshots

### Infrastructure
- **Hosting**: Render.com (backend + frontend)
- **CDN**: Cloudflare
- **Monitoring**: Prometheus + Loki + Grafana stack
- **CI/CD**: GitHub Actions

---

## Build System

**Compiler**: TypeScript 5.x  
**Target**: ES2022  
**Module System**: CommonJS (backend), ESM (frontend)  
**Type Safety**: Strict mode migration in progress (Phase 2/6 complete - 172 errors remaining)

### Configuration

- **Backend**: `backend/tsconfig.json`
  - Extends base configuration
  - Path aliases for clean imports (`@/services/*`, `@/utils/*`)
  - Strict flags: `noImplicitAny`, `noImplicitThis`, `strictBindCallApply`, `alwaysStrict`
  - **Note**: `noEmitOnError: false` allows builds despite type errors during migration

- **Frontend**: `frontend/tsconfig.json`
  - React-specific settings
  - JSX transformation
  - Vite-optimized configuration

### Build Commands

```bash
# Backend build
npm run build:backend    # Outputs to dist/backend/

# Frontend build
npm run build:frontend   # Outputs to dist/frontend/

# Full build
npm run build           # Builds both backend + frontend

# Type checking (no output)
npm run type-check      # Validates TypeScript without emitting files
```

---

## Module System

### Backend Path Aliases

```json
{
  "@/services/*": ["backend/services/*"],
  "@/utils/*": ["backend/utils/*"],
  "@/models/*": ["backend/models/*"],
  "@/middleware/*": ["backend/middleware/*"],
  "@/types/*": ["backend/types/*"]
}
```

### Frontend Path Aliases

```json
{
  "@/components/*": ["frontend/src/components/*"],
  "@/pages/*": ["frontend/src/pages/*"],
  "@/hooks/*": ["frontend/src/hooks/*"],
  "@/utils/*": ["frontend/src/utils/*"]
}
```

**Reference**: See `/docs/MODULE_SYSTEM.md` for complete module documentation.

---

## Security Architecture

### Multi-Tenant Isolation

```typescript
// Tenant Guard Middleware
app.use('/api/*', tenantGuard);

// Enforces:
// 1. Valid tenant ID in JWT token
// 2. Row-level security on database queries
// 3. Tenant-scoped API access
```

### Authentication Flow

```
User Login
    ↓
JWT Token Generated (with tenantId, userId, roleId)
    ↓
Token Stored in httpOnly Cookie
    ↓
Every Request → Verify JWT → Extract tenantId
    ↓
Database Query Scoped to tenantId
```

### Authorization Levels

1. **Tenant Admin**: Full access within tenant
2. **Manager**: Team-level access
3. **User**: Individual access
4. **Guest**: Read-only access

**Reference**: See `/docs/SECURITY.md` for complete security documentation.

---

## API Architecture

### REST API Structure

```
/api/v1/
  /auth          - Authentication endpoints
  /users         - User management
  /contacts      - Contact CRUD
  /accounts      - Account management
  /deals         - Sales pipeline
  /invoices      - Billing
  /reports       - Analytics
  /webhooks      - External integrations
```

### Endpoint Statistics

- **Total Endpoints**: 340+
- **Public Endpoints**: 4 (login, register, health, status)
- **Protected Endpoints**: 336+ (require authentication)
- **Admin-Only Endpoints**: 45+ (require admin role)

### API Versioning

- **Current**: v1 (stable)
- **Future**: v2 (planned with breaking changes)
- **Strategy**: URL-based versioning (`/api/v1/`, `/api/v2/`)

**Reference**: See `/docs/api/ENDPOINTS.md` for complete API documentation.

---

## Database Architecture

### Schema Design

```
tenants (multi-tenancy root)
    ↓
users (tenant-scoped)
    ↓
contacts, accounts, deals (all tenant-scoped)
    ↓
invoices, payments (tenant + user scoped)
```

### Tenant Isolation Strategy

Every table includes:
```sql
tenantId VARCHAR(255) NOT NULL,
INDEX idx_tenant (tenantId)
```

All queries automatically scoped:
```typescript
where: { tenantId: req.user.tenantId }
```

### Performance Optimizations

- **Indexes**: Tenant-scoped composite indexes
- **Caching**: Redis for session + frequent queries
- **Query Optimization**: N+1 prevention with `include` strategies
- **Connection Pooling**: Max 20 connections per instance

---

## Search & Indexing Architecture

### Elasticsearch Integration

ClientForge-CRM uses **Elasticsearch** for full-text search across contacts, accounts, deals, and other entities, providing:
- Full-text search with relevance scoring
- Fuzzy matching for typos and partial matches
- Multi-field search and aggregations
- Real-time search index updates

### Asynchronous Sync Worker

**Architecture**: BullMQ job queue + dedicated worker pool

```
API Request (Create/Update/Delete)
    ↓
Database Transaction ✅
    ↓
Queue Job → data-sync (BullMQ)
    ↓
API Response 200 OK (immediate)

--- Background Processing ---

Worker Pool (10 concurrent)
    ↓
Elasticsearch Sync Worker
    ↓
    ├─ INDEX → Create/replace document
    ├─ UPDATE → Partial update
    └─ DELETE → Remove document
```

### Sync Worker Specifications

**Queue**: `data-sync` (BullMQ)  
**Worker File**: `backend/workers/elasticsearch-sync.worker.ts`  
**Concurrency**: 10 jobs processed simultaneously  
**Retry Policy**: 3 attempts with exponential backoff (2s, 4s, 8s)

**Supported Operations**:
```typescript
interface SyncJobData {
  index: string;   // ES index (e.g., 'contacts', 'accounts')
  id: string;      // Document ID
  action: 'index' | 'update' | 'delete';
  body?: any;      // Document data
}
```

### Error Handling Strategy

**Philosophy**: **Never fail database operations due to search issues**

- ✅ Elasticsearch errors are logged but **not thrown**
- ✅ API requests complete successfully even if ES is down
- ✅ Failed sync jobs are retried automatically (3 attempts)
- ⚠️ Search index may become stale during ES outages
- 🔧 Bulk re-sync script available to rebuild index

**Logging**:
```
[ES] INDEX contacts/contact-123     # Success
[ES] UPDATE accounts/account-456    # Success
[ES] Error index contacts/789: Connection timeout  # Failure (logged, not thrown)
```

### Performance Characteristics

| Metric | Value |
|--------|-------|
| Queue throughput | 100 jobs/second |
| Job processing time (avg) | 50-100ms |
| Concurrent workers | 10 |
| Queue memory overhead | ~1KB per job |

### Tenant Isolation

Currently all tenants share Elasticsearch indexes with `tenantId` field filtering.

**Future**: Tenant-specific indexes (`{tenantId}_contacts`) for:
- Better isolation
- Easier data deletion
- Independent scaling

**Reference**: See [ADR-0005: Elasticsearch Sync Worker](/docs/architecture/decisions/ADR-0005-elasticsearch-sync-worker.md) for complete design rationale.

---

## Deployment Architecture

### Production Environment

```
Render.com Platform
    ↓
┌────────────────────────────────────────┐
│  Load Balancer (Cloudflare)           │
└────────────┬───────────────────────────┘
             │
    ┌────────┴────────┐
    ▼                 ▼
┌─────────┐      ┌─────────┐
│ Backend │      │Frontend │
│ Service │      │ Service │
│ (Node)  │      │ (Static)│
└────┬────┘      └─────────┘
     │
     ▼
┌─────────┐
│ SQLite  │
│Database │
└─────────┘
```

### Scaling Strategy

**Current (Phase 1)**:
- Single backend instance
- SQLite database
- Vertical scaling

**Future (Phase 2)**:
- Horizontal backend scaling
- PostgreSQL migration
- Redis cache layer
- CDN for static assets

---

## Monitoring & Observability

### Monitoring Stack

ClientForge-CRM uses a **Prometheus + Loki + Grafana** observability stack for comprehensive monitoring.

**Components**:
- **Prometheus** (http://localhost:9090): Time-series metrics database
- **Loki** (http://localhost:3100): Log aggregation system
- **Grafana** (http://localhost:3005): Visualization dashboards (admin/admin)
- **Promtail**: Log shipping agent

**Architecture**:
```
Backend (/metrics) ──scrape──> Prometheus ──query──> Grafana
Backend (logs/*.log) ──ship──> Promtail ──push──> Loki ──query──> Grafana
```

### Metrics Collection

**Backend Metrics Endpoint**: `http://localhost:3000/metrics`

**Key Metrics**:
- `http_requests_total` - Total HTTP requests (counter)
- `http_request_duration_seconds` - Request latency histogram (p50, p95, p99)
- `http_request_errors_total` - Total HTTP errors (counter)
- `nodejs_heap_size_used_bytes` - Node.js memory usage
- `process_cpu_seconds_total` - CPU usage

**Scrape Interval**: 10 seconds (backend), 15 seconds (system metrics)

### Log Aggregation

**Log Sources**:
1. **File-based**: Winston writes to `logs/error.log` and `logs/combined.log`
2. **Docker logs**: Container stdout/stderr via Docker socket

**Log Format**: JSON with structured fields
```json
{
  "timestamp": "2025-11-12T10:30:00Z",
  "level": "info",
  "message": "Request processed",
  "tenantId": "tenant-uuid",
  "userId": "user-uuid",
  "duration": 45
}
```

**Retention**: 7 days

### Dashboards

**Access**: http://localhost:3005 (admin/admin)

**Available Dashboards**:
- **ClientForge Backend - Overview**: HTTP rate, p95 latency, error logs
- Custom dashboards can be created via Grafana UI

**Quick Start**:
```bash
# Start monitoring stack
npm run monitor:start

# Check status
npm run monitor:status

# View logs
npm run monitor:logs
```

### Performance Impact

| Aspect | Impact |
|--------|--------|
| CPU overhead | <5% (monitoring services) |
| Memory usage | ~200MB (all services) |
| Metrics collection | <1ms per request |
| Storage | ~170MB for 7 days logs + 15 days metrics |

**Reference**: See `/docs/MONITORING.md` for complete monitoring documentation and [ADR-0006](/docs/architecture/decisions/ADR-0006-monitoring-observability-stack.md) for design rationale.

---

## Development vs Production

| Aspect | Development | Production |
|--------|-------------|------------|
| Database | SQLite (local) | SQLite (persistent volume) |
| Port | 3000 (backend), 3001 (frontend) | 443 (HTTPS) |
| Logging | Console + File | Structured JSON |
| Hot Reload | Enabled | Disabled |
| Source Maps | Enabled | Disabled |
| Type Errors | Warnings | Warnings (during migration) |
| Monitoring | Optional (npm run monitor:start) | Always enabled |

---

## Known Limitations & Future Work

### Current Limitations

1. **SQLite**: Not optimal for >10k users (PostgreSQL migration planned)
2. **Single Instance**: No horizontal scaling yet
3. **Type Safety**: 172 TypeScript errors remaining (Phase 2/6 complete - 44% reduction)
4. **Real-time**: No WebSocket support (planned)
5. **Alerting**: Prometheus Alertmanager not yet configured

### Roadmap

- **Q4 2025**: Complete TypeScript strict mode migration (Phase 6/6)
- **Q1 2026**: PostgreSQL migration + Alerting (Prometheus Alertmanager)
- **Q2 2026**: Horizontal scaling support + Distributed tracing
- **Q3 2026**: Real-time features (WebSockets)
- **Q4 2026**: AI/ML feature expansion

---

## Architecture Decision Records

For detailed architectural decisions:

- [ADR-0001: Multi-Tenant Authentication Strategy](/docs/architecture/decisions/ADR-0001-auth-multi-tenant.md)
- [ADR-0002: TypeScript Strict Mode Migration](/docs/architecture/decisions/ADR-0002-typescript-strict-mode.md)
- [ADR-0003: AuthRequest Interface Alignment](/docs/architecture/decisions/ADR-0003-authrequest-interface-alignment.md)
- [ADR-0004: Environment Validator & Secrets Manager](/docs/architecture/decisions/ADR-0004-environment-validator-secrets-manager.md)
- [ADR-0005: Elasticsearch Sync Worker](/docs/architecture/decisions/ADR-0005-elasticsearch-sync-worker.md)
- [ADR-0006: Monitoring & Observability Stack](/docs/architecture/decisions/ADR-0006-monitoring-observability-stack.md)

---

## References

- [Development Guide](/docs/DEVELOPMENT.md)
- [Migration Guide](/docs/MIGRATION_GUIDE.md)
- [Security Documentation](/docs/SECURITY.md)
- [Monitoring Guide](/docs/MONITORING.md)
- [API Documentation](/docs/api/)
- [Module System](/docs/MODULE_SYSTEM.md)

---

## Contact & Support

- **Engineering Team**: Slack #clientforge-dev
- **Documentation Issues**: GitHub Issues
- **Architecture Questions**: Technical lead via Slack
- **Security Issues**: security@abstractcreatives.com
