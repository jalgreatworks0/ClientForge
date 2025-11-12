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
- **Monitoring**: Custom health checks + logging
- **CI/CD**: GitHub Actions

---

## Build System

**Compiler**: TypeScript 5.x  
**Target**: ES2022  
**Module System**: CommonJS (backend), ESM (frontend)  
**Type Safety**: Strict mode migration in progress (Phase 1/6 complete)

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

### Health Checks

```
GET /health          - Basic health check
GET /health/detailed - Component health status
```

### Logging

- **Level**: Info (production), Debug (development)
- **Format**: JSON structured logs
- **Storage**: Render.com log aggregation
- **Retention**: 7 days

### Metrics

- Request count per endpoint
- Response time percentiles (p50, p95, p99)
- Error rates
- Active user sessions

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

---

## Known Limitations & Future Work

### Current Limitations

1. **SQLite**: Not optimal for >10k users (PostgreSQL migration planned)
2. **Single Instance**: No horizontal scaling yet
3. **Type Safety**: 309 TypeScript errors during strict mode migration
4. **Real-time**: No WebSocket support (planned)

### Roadmap

- **Q4 2025**: Complete TypeScript strict mode migration
- **Q1 2026**: PostgreSQL migration
- **Q2 2026**: Horizontal scaling support
- **Q3 2026**: Real-time features (WebSockets)
- **Q4 2026**: AI/ML feature expansion

---

## Architecture Decision Records

For detailed architectural decisions:

- [ADR-0001: Multi-Tenant Authentication Strategy](/docs/architecture/decisions/ADR-0001-auth-multi-tenant.md)
- [ADR-0002: TypeScript Strict Mode Migration](/docs/architecture/decisions/ADR-0002-typescript-strict-mode.md)

---

## References

- [Development Guide](/docs/DEVELOPMENT.md)
- [Migration Guide](/docs/MIGRATION_GUIDE.md)
- [Security Documentation](/docs/SECURITY.md)
- [API Documentation](/docs/api/)
- [Module System](/docs/MODULE_SYSTEM.md)

---

## Contact & Support

- **Engineering Team**: Slack #clientforge-dev
- **Documentation Issues**: GitHub Issues
- **Architecture Questions**: Technical lead via Slack
