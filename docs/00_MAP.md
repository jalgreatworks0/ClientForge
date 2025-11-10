# 🗺️ ClientForge CRM v3.0 - Project Map

**Last Updated**: 2025-11-09  
**Total Directories**: 421  
**Project Status**: Production-Ready (85-90% complete)

---

## 📋 Quick Navigation

| Section | Description | Location |
|---------|-------------|----------|
| **Core Documentation** | Architecture, API, Security | [docs/](#core-documentation) |
| **Backend Services** | API, Auth, CRM modules | [backend/](#backend-structure) |
| **Frontend Apps** | React dashboard, Next.js | [frontend/](#frontend-structure) |
| **AI/ML Systems** | Albedo AI, ML models | [ai/](#aiml-systems) |
| **Agent System** | MCP multi-agent setup | [agents/](#agent-system) |
| **Database** | Migrations, schemas | [backend/database/](#database) |
| **Tests** | Unit, integration, E2E | [tests/](#testing) |
| **Deployment** | Docker, Render configs | [deployment/](#deployment) |

---

## 📁 Root Directory - CLEAN (README.md + directories only)

All documentation files have been moved to `docs/` subdirectories.
All scripts have been moved to `scripts/` directory.

```
ClientForge-CRM/
├── README.md                     # Main documentation (3,828 lines)
├── CHANGELOG.md                  # Version history
├── package.json
├── tsconfig.json
├── docker-compose.yml
├── render.yaml
│
├── 📁 docs/                      # ALL DOCUMENTATION
├── 📁 backend/                   # Express.js API
├── 📁 frontend/                  # React + Vite
├── 📁 ai/                        # AI/ML systems
├── 📁 agents/                    # MCP agents
├── 📁 tests/                     # Test suites
├── 📁 deployment/                # Docker, CI/CD
├── 📁 scripts/                   # Automation
├── 📁 config/                    # Shared configs
└── 📁 logs/                      # Application logs
```

---

## 📚 Core Documentation (`docs/`)

### Essential Files
- **00_MAP.md** ← You are here
- **01_ARCHITECTURE.md** - Polyglot database design
- **02_AI-SYSTEMS.md** - Albedo AI architecture
- **03_API.md** - REST/GraphQL endpoints
- **04_DEPLOYMENT.md** - Render deployment guide
- **05_SECURITY.md** - OWASP compliance
- **06_DEVELOPMENT.md** - Local setup
- **07_CHANGELOG.md** - Version history
- **08_TROUBLESHOOTING.md** - Common issues

### Protocols (`docs/protocols/`)
14 development standards defining how we build:
- Security, Testing, Performance, API Design, etc.

---

## 🔧 Backend (`backend/`)

### Directory Structure
```
backend/
├── api/rest/v1/              # REST API endpoints
│   ├── controllers/          # Request handlers
│   ├── routes/               # 15+ route files
│   └── middleware/           # Request validation
│
├── core/                     # Business logic (8 modules)
│   ├── accounts/
│   ├── analytics/            # 2,500+ lines, 8 endpoints
│   ├── auth/                 # JWT, sessions, RBAC
│   ├── contacts/
│   ├── deals/
│   ├── tasks/
│   ├── metadata/
│   └── email/
│
├── database/
│   ├── postgresql/           # Connection pool
│   └── migrations/           # Schema versions
│
├── middleware/               # Express middleware
│   ├── authenticate.ts
│   ├── rate-limiter.ts
│   ├── csrf-protection.ts
│   └── security/
│
├── services/
│   ├── ai/                   # AI integrations
│   └── search/               # Elasticsearch
│
└── utils/
    ├── errors/               # Error handling
    ├── logging/              # Winston logger
    └── sanitization/         # Input sanitization
```

### Key Files
- `backend/index.ts` - Server entry point
- `backend/api/server.ts` - Express app setup
- `backend/database/migrations/001_initial_schema.sql` - 17 core tables

---

## 🎨 Frontend (`frontend/src/`)

```
frontend/src/
├── components/layout/        # Layout components
├── pages/                    # 8 route pages
│   └── Dashboard.tsx         # Main dashboard (851 lines)
├── hooks/useAnalytics.ts     # React Query hooks
├── services/                 # API clients
├── store/authStore.ts        # State management
└── types/                    # TypeScript types
```

---

## 🤖 AI/ML (`ai/`)

```
ai/
├── albedo/                   # AI assistant
│   ├── core/engine/          # Inference runtime
│   ├── actions/
│   └── models/
│
├── ml/
│   ├── lead-scoring/         # Lead qualification
│   ├── forecasting/          # Revenue/churn prediction
│   ├── recommendation/       # Next-best-action
│   └── anomaly-detection/    # Fraud detection
│
├── agents/                   # AI agents (sales, support, analyst)
├── embeddings/               # Vector search, RAG
└── voice/                    # Speech-to-text, TTS
```

---

## 🤝 Agents (`agents/mcp/`)

7-agent MCP system for development automation:
```
agents/mcp/servers/
├── orchestrator-mcp-server.js     # Task coordination
├── ai-router-mcp-server.js        # AI routing
├── codebase-mcp-server.js         # Code analysis
├── documentation-mcp-server.js    # Doc generation
├── testing-mcp-server.js          # Test generation
├── security-mcp-server.js         # Security scanning
└── git-mcp-server.js              # Git operations
```

---

## 🧪 Tests (`tests/`)

```
tests/
├── unit/                     # 228 passing tests
│   ├── auth/
│   ├── analytics/
│   ├── security/             # 60+ security test cases
│   └── [other modules]
│
├── integration/              # API integration tests
└── e2e/                      # End-to-end tests
```

**Coverage**: 32.24% (Target: 85%+)

---

## 🔐 Security Features

- ✅ JWT + session-based auth
- ✅ bcrypt password hashing (cost=12)
- ✅ Rate limiting (auth: 5/15min, API: 100/min)
- ✅ CSRF protection (24h token expiry)
- ✅ Input sanitization (9 utilities)
- ✅ OWASP Top 10 compliance
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Account lockout after 5 failed attempts

**Security Score**: 100%

---

## 📊 Database Schema

### PostgreSQL (17 core tables)
- Multi-tenant (`tenant_id` on all tables)
- UUID primary keys
- Soft deletes (`deleted_at`)
- 30+ composite indexes
- Standard columns: `created_at`, `updated_at`, `created_by`, `updated_by`

### MongoDB
- Structured logging with TTL indexes

### Redis
- Sessions, cache, rate limiting

### Elasticsearch
- Full-text search (13-25x faster than PostgreSQL)
- Indexes: contacts, accounts, deals

---

## 🚀 Deployment

### Render Configuration
- `render.yaml` - Deployment config
- PostgreSQL, MongoDB, Redis, Elasticsearch
- Environment variables managed via Render dashboard

### Docker
- `docker-compose.yml` - 4-database polyglot setup
- Development containers in `deployment/docker/development/`
- Production containers in `deployment/docker/production/`

---

## 🛠️ Quick Reference

### Add New Feature
1. Service: `backend/core/[module]/[name]-service.ts`
2. Repository: `backend/core/[module]/[name]-repository.ts`
3. Controller: `backend/core/[module]/[name]-controller.ts`
4. Routes: `backend/api/rest/v1/routes/[name]-routes.ts`
5. Tests: `tests/unit/[module]/[name]-service.test.ts`

### Find Things
| What | Where |
|------|-------|
| API Endpoint | `backend/api/rest/v1/routes/` |
| Business Logic | `backend/core/[module]/` |
| Database Query | `backend/core/[module]/*-repository.ts` |
| Middleware | `backend/middleware/` |
| Tests | `tests/unit/[module]/` |
| Frontend Page | `frontend/src/pages/` |
| AI Service | `backend/services/ai/` |

---

## 📈 Project Status

| Metric | Value | Target |
|--------|-------|--------|
| Test Coverage | 32.24% | 85%+ |
| Security Score | 100% | 100% |
| Documentation | 3,828 lines | Complete |
| API Endpoints | 50+ | - |
| Production Ready | 85-90% | 100% |

---

## 📞 More Information

- **Architecture**: [docs/01_ARCHITECTURE.md](01_ARCHITECTURE.md)
- **API Reference**: [docs/03_API.md](03_API.md)
- **Deployment**: [docs/04_DEPLOYMENT.md](04_DEPLOYMENT.md)
- **Security**: [docs/05_SECURITY.md](05_SECURITY.md)
- **Troubleshooting**: [docs/08_TROUBLESHOOTING.md](08_TROUBLESHOOTING.md)

---

**Maintained By**: Development Team  
**Last Updated**: 2025-11-09
