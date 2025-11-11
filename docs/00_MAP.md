# 🗺️ ClientForge CRM v3.0 - Complete Repository Map

**Last Updated**: 2025-11-11
**Repository Size**: 1,940.25 MB
**Total Files**: 147,337
**Total Directories**: 421
**Project Status**: Production-Ready (85-90% complete)

---

## 📋 Quick Navigation

| Section | Description | Jump To |
|---------|-------------|---------|
| **📊 Overview** | Repository statistics & categorization | [Overview](#-repository-overview) |
| **🗂️ Directory Tree** | 4-level deep file structure | [Directory Tree](#-complete-directory-tree) |
| **📁 Core Source** | Backend, Frontend, Agents | [Core Source](#-core-source-code) |
| **📚 Documentation** | All docs organized by category | [Documentation](#-documentation-structure) |
| **🔧 Configuration** | All config files explained | [Configuration](#-configuration-infrastructure) |
| **🗄️ Database** | Schemas, migrations, queries | [Database](#-database-structure) |
| **🧪 Testing** | Test suites & coverage | [Testing](#-testing-infrastructure) |
| **🚀 Deployment** | Docker, CI/CD, infrastructure | [Deployment](#-deployment-infrastructure) |
| **🤖 AI Systems** | Agents, MCP, integrations | [AI Systems](#-ai--agent-systems) |
| **📈 Statistics** | Size analysis & metrics | [Statistics](#-repository-statistics) |

---

## 📊 Repository Overview

### Size Breakdown by Category

| Category | Size (MB) | Percentage | Description |
|----------|-----------|------------|-------------|
| 🟢 **Core Source** | 592.04 | 30.5% | Backend, Frontend, Agents |
| 🔵 **Dependencies** | 1,316.39 | 67.8% | node_modules (400+ packages) |
| 🟡 **Build/Cache** | 417.88 | 21.5% | Compiled code, coverage, logs |
| 🟣 **Documentation** | 1.83 | 0.1% | Docs (181 .md files) |
| 🟠 **Configuration** | 0.15 | 0.01% | App, database, security configs |
| ⚫ **Version Control** | 7.66 | 0.4% | .git repository |
| **TOTAL** | **1,940.25** | **100%** | **147,337 files** |

### Directory Categories

#### 🟢 Core Source Code (592.04 MB)
- `backend/` - Express.js API, business logic
- `frontend/` - React SPA with TypeScript
- `agents/` - AI orchestration, MCP servers

#### 🔵 Transpiled/Build (402.57 MB)
- `backend/dist/` - Compiled JavaScript
- `frontend/node_modules/` - Frontend dependencies
- Build artifacts and transpiled code

#### 🟡 Temporary/Cache (1,335.93 MB)
- `node_modules/` - npm packages (74,860 files)
- `logs/` - Application runtime logs
- `coverage/` - Test coverage reports

#### 🟣 Documentation & Assets (3.38 MB)
- `docs/` - Project documentation (22 subdirectories)
- `frontend/public/` - Static assets
- README files throughout codebase

#### 🟠 Configuration & Infrastructure (0.15 MB)
- `config/` - App, database, security configs
- `deployment/` - Docker configurations
- `.github/` - CI/CD workflows
- `infrastructure/` - Nginx configs

#### ⚫ Backups/Archives (3.34 MB)
- `logs/archive/` - Archived application logs
- `scripts/archive/` - Old migration scripts

---

## 🗂️ Complete Directory Tree

### Root Directory (Clean Structure)

```
D:\clientforge-crm\
│
├── 📄 README.md                          # Main documentation (3,828 lines)
├── 📄 CHANGELOG.md                       # Version history
├── 📄 package.json                       # Root package config
├── 📄 tsconfig.json                      # TypeScript config
├── 📄 docker-compose.yml                 # Multi-database development stack
├── 📄 render.yaml                        # Render.com deployment config
├── 📄 jest.config.js                     # Test configuration
├── 📄 turbo.json                         # Monorepo build orchestration
├── 📄 .env                              # Environment variables (IGNORED)
├── 📄 .gitignore                        # Git exclusions
│
├── 📁 docs/                              # 🟣 1.83 MB | 181 files
├── 📁 backend/                           # 🟢 2.23 MB | 364 files
├── 📁 frontend/                          # 🟢 404.35 MB | 50,077 files
├── 📁 agents/                            # 🟢 185.46 MB | 20,407 files
├── 📁 ai/                                # 🟢 Part of agents ecosystem
├── 📁 database/                          # 🟠 0.23 MB | 30 files
├── 📁 config/                            # 🟠 0.09 MB | 51 files
├── 📁 tests/                             # 🟡 0.29 MB | 81 files
├── 📁 scripts/                           # 🟠 0.47 MB | 99 files
├── 📁 deployment/                        # 🟠 0.02 MB | 11 files
├── 📁 infrastructure/                    # 🟠 0.01 MB | 4 files
├── 📁 integrations/                      # 🟠 45 items
├── 📁 packages/                          # 🟠 15 items (monorepo)
├── 📁 tools/                             # 🟠 1.53 MB | 78 files
├── 📁 storage/                           # 🟡 Empty dirs for runtime data
├── 📁 logs/                              # 🟡 4.23 MB | 37 files
├── 📁 coverage/                          # 🟡 15.31 MB | 544 files
├── 📁 node_modules/                      # 🔵 1,316.39 MB | 74,860 files
├── 📁 .git/                              # ⚫ 7.66 MB | 1,592 files
├── 📁 .github/                           # 🟠 0.03 MB | 6 files
└── 📁 .husky/                            # 🟠 3 files (Git hooks)
```

---

## 🟢 Core Source Code

### Backend (`backend/` - 2.23 MB, 364 files)

**4-Level Directory Tree:**

```
backend/
│
├── 📄 index.ts                           # Server entry point (module registration)
│
├── 📁 api/                               # REST API layer
│   ├── 📄 server.ts                      # Express app setup (285 lines)
│   └── 📁 rest/
│       └── 📁 v1/
│           ├── 📁 controllers/           # Request handlers (15+ controllers)
│           ├── 📁 routes/                # Route definitions (15+ route files)
│           └── 📁 middleware/            # Request validation
│
├── 📁 core/                              # Business logic modules (8 core modules)
│   ├── 📁 modules/                       # Module registry system
│   │   ├── 📄 ModuleRegistry.ts          # Plugin system core
│   │   ├── 📄 ModuleContract.ts          # IModule interface
│   │   ├── 📄 EventBus.ts                # Inter-module events
│   │   └── 📄 FeatureFlags.ts            # Feature toggles
│   │
│   ├── 📁 accounts/                      # Account management
│   │   ├── 📄 accounts-service.ts
│   │   ├── 📄 accounts-repository.ts
│   │   └── 📄 accounts-controller.ts
│   │
│   ├── 📁 analytics/                     # Analytics module (2,500+ lines)
│   │   ├── 📄 analytics-service.ts       # 8 analytics endpoints
│   │   ├── 📄 analytics-repository.ts
│   │   └── 📄 analytics-controller.ts
│   │
│   ├── 📁 auth/                          # Authentication & Authorization
│   │   ├── 📄 auth-service.ts            # JWT + session auth
│   │   ├── 📄 auth-repository.ts
│   │   ├── 📄 auth-controller.ts
│   │   ├── 📄 password-service.ts        # bcrypt (cost=12)
│   │   └── 📄 session-service.ts         # Redis sessions
│   │
│   ├── 📁 contacts/                      # Contact management
│   ├── 📁 deals/                         # Deal/pipeline management
│   ├── 📁 tasks/                         # Task management
│   ├── 📁 metadata/                      # Custom fields
│   └── 📁 email/                         # Email integration
│
├── 📁 modules/                           # Tier 2 modules (legacy)
│   ├── 📄 tier2-modules.ts               # Email, notifications, activities
│   └── 📁 core/
│       └── 📄 module.ts                  # Core module definition
│
├── 📁 services/                          # Shared services
│   ├── 📁 ai/                            # AI service integrations
│   │   ├── 📄 ai-router.service.ts       # Claude/OpenAI routing
│   │   └── 📄 embeddings.service.ts      # Vector embeddings
│   │
│   ├── 📁 billing/                       # Stripe integration
│   │   ├── 📄 billing.service.ts
│   │   └── 📄 subscription.service.ts
│   │
│   ├── 📁 email/                         # Email sending
│   │   └── 📄 email.service.ts           # SendGrid/SMTP
│   │
│   ├── 📁 search/                        # Elasticsearch
│   │   └── 📄 search.service.ts          # Full-text search
│   │
│   ├── 📁 websocket/                     # Real-time updates
│   │   └── 📄 websocket.service.ts       # Socket.io
│   │
│   ├── 📁 queue/                         # Job queues
│   │   └── 📄 queue.service.ts           # BullMQ integration
│   │
│   └── 📁 monitoring/                    # Observability
│       ├── 📄 metrics.service.ts         # Prometheus metrics
│       └── 📄 health.service.ts          # Health checks
│
├── 📁 middleware/                        # Express middleware
│   ├── 📄 authenticate.ts                # JWT verification
│   ├── 📄 authorize.ts                   # RBAC checks
│   ├── 📄 rate-limiter.ts                # Rate limiting (100/min)
│   ├── 📄 csrf-protection.ts             # CSRF tokens (24h expiry)
│   ├── 📄 performance-monitoring.ts      # Request timing
│   ├── 📄 request-logger.ts              # HTTP logging
│   └── 📁 security/                      # Security middleware
│       ├── 📄 helmet-config.ts
│       └── 📄 sanitization.ts
│
├── 📁 database/                          # Database connections
│   ├── 📁 postgresql/
│   │   ├── 📄 pool.ts                    # Connection pool (2-10 conns)
│   │   └── 📄 client.ts                  # Query helper
│   │
│   └── 📁 migrations/                    # Schema versions
│       └── 📄 001_initial_schema.sql     # 17 core tables
│
├── 📁 utils/                             # Utility functions
│   ├── 📁 errors/
│   │   ├── 📄 error-handler.ts           # Global error handler
│   │   └── 📄 AppError.ts                # Custom error class
│   │
│   ├── 📁 logging/
│   │   └── 📄 logger.ts                  # Winston logger
│   │
│   ├── 📁 sanitization/
│   │   ├── 📄 input-sanitizer.ts         # XSS prevention
│   │   └── 📄 sql-sanitizer.ts           # SQL injection prevention
│   │
│   └── 📁 validation/
│       └── 📄 validators.ts              # Input validation
│
├── 📁 workers/                           # Background workers
│   ├── 📄 email-worker.ts                # Email queue processor
│   └── 📄 analytics-worker.ts            # Analytics aggregation
│
└── 📁 dist/                              # 🔵 Compiled JavaScript (0.61 MB)
    └── (Build output - DO NOT EDIT)
```

**Backend Key Statistics:**
- **Size**: 2.23 MB (source only, excludes node_modules)
- **Files**: 364 TypeScript/JavaScript files
- **Modules**: 8 core modules + Tier 2 (email, notifications, activities)
- **API Endpoints**: 50+ REST endpoints
- **Middleware**: 10+ Express middleware functions
- **Services**: 8 shared services (AI, billing, email, search, websocket, queue, monitoring, health)

---

### Frontend (`frontend/` - 404.35 MB, 50,077 files)

**4-Level Directory Tree:**

```
frontend/
│
├── 📄 package.json                       # Frontend dependencies
├── 📄 tsconfig.json                      # TypeScript config
├── 📄 vite.config.ts                     # Vite build config
├── 📄 tailwind.config.js                 # Tailwind CSS config
├── 📄 postcss.config.js                  # PostCSS config
├── 📄 index.html                         # SPA entry point
│
├── 📁 src/                               # Source code
│   │
│   ├── 📄 main.tsx                       # React entry point
│   ├── 📄 App.tsx                        # Root component
│   ├── 📄 Router.tsx                     # React Router config
│   │
│   ├── 📁 pages/                         # Route pages (8 pages)
│   │   ├── 📄 Dashboard.tsx              # Main dashboard (851 lines)
│   │   ├── 📄 Contacts.tsx               # Contact list
│   │   ├── 📄 Accounts.tsx               # Account list
│   │   ├── 📄 Deals.tsx                  # Deal pipeline
│   │   ├── 📄 Tasks.tsx                  # Task management
│   │   ├── 📄 Analytics.tsx              # Analytics dashboard
│   │   ├── 📄 Settings.tsx               # User settings
│   │   └── 📄 Login.tsx                  # Authentication
│   │
│   ├── 📁 components/                    # Reusable components
│   │   ├── 📁 layout/
│   │   │   ├── 📄 Header.tsx
│   │   │   ├── 📄 Sidebar.tsx
│   │   │   ├── 📄 Footer.tsx
│   │   │   └── 📄 Layout.tsx
│   │   │
│   │   ├── 📁 common/
│   │   │   ├── 📄 Button.tsx
│   │   │   ├── 📄 Input.tsx
│   │   │   ├── 📄 Modal.tsx
│   │   │   ├── 📄 Table.tsx
│   │   │   └── 📄 Card.tsx
│   │   │
│   │   ├── 📁 charts/
│   │   │   ├── 📄 LineChart.tsx
│   │   │   ├── 📄 BarChart.tsx
│   │   │   └── 📄 PieChart.tsx
│   │   │
│   │   └── 📁 forms/
│   │       ├── 📄 ContactForm.tsx
│   │       ├── 📄 AccountForm.tsx
│   │       └── 📄 DealForm.tsx
│   │
│   ├── 📁 hooks/                         # Custom React hooks
│   │   ├── 📄 useAnalytics.ts            # Analytics data fetching
│   │   ├── 📄 useAuth.ts                 # Authentication state
│   │   ├── 📄 useWebSocket.ts            # Real-time updates
│   │   └── 📄 useDebounce.ts             # Debouncing utility
│   │
│   ├── 📁 services/                      # API clients
│   │   ├── 📄 api.ts                     # Axios instance
│   │   ├── 📄 auth.service.ts            # Auth API calls
│   │   ├── 📄 contacts.service.ts        # Contacts API
│   │   ├── 📄 analytics.service.ts       # Analytics API
│   │   └── 📄 websocket.service.ts       # Socket.io client
│   │
│   ├── 📁 store/                         # State management
│   │   ├── 📄 authStore.ts               # Zustand auth store
│   │   ├── 📄 uiStore.ts                 # UI state
│   │   └── 📄 notificationStore.ts       # Notifications
│   │
│   ├── 📁 types/                         # TypeScript types
│   │   ├── 📄 api.types.ts               # API response types
│   │   ├── 📄 user.types.ts              # User types
│   │   ├── 📄 contact.types.ts           # Contact types
│   │   └── 📄 analytics.types.ts         # Analytics types
│   │
│   ├── 📁 utils/                         # Utility functions
│   │   ├── 📄 formatters.ts              # Date/number formatting
│   │   ├── 📄 validators.ts              # Form validation
│   │   └── 📄 constants.ts               # App constants
│   │
│   └── 📁 styles/                        # Global styles
│       ├── 📄 index.css                  # Tailwind imports
│       └── 📄 custom.css                 # Custom CSS
│
├── 📁 public/                            # Static assets (1.55 MB)
│   ├── 📄 favicon.ico
│   ├── 📁 images/
│   └── 📁 fonts/
│
├── 📁 packages/                          # Shared packages
│   └── 📁 ui/                            # Shared UI components
│
├── 📁 micro-frontends/                   # Micro-frontend modules
│
└── 📁 node_modules/                      # 🔵 Dependencies (401.96 MB)
    └── (400+ npm packages)
```

**Frontend Key Statistics:**
- **Size**: 404.35 MB (includes node_modules)
- **Source Code**: ~2.39 MB (excludes node_modules)
- **Files**: 50,077 total (177 source files)
- **Pages**: 8 route pages
- **Components**: 30+ reusable components
- **Technology**: React 18.2.0, TypeScript, Vite 4.5.0, Tailwind CSS

---

### Agents (`agents/` - 185.46 MB, 20,407 files)

**4-Level Directory Tree:**

```
agents/
│
├── 📁 mcp/                               # Model Context Protocol (92 MB)
│   ├── 📄 package.json
│   │
│   ├── 📁 servers/                       # MCP server implementations
│   │   ├── 📄 orchestrator-mcp-server.js # Task coordination
│   │   ├── 📄 ai-router-mcp-server.js    # AI routing (Claude/OpenAI)
│   │   ├── 📄 codebase-mcp-server.js     # Code analysis
│   │   ├── 📄 documentation-mcp-server.js # Doc generation
│   │   ├── 📄 testing-mcp-server.js      # Test generation
│   │   ├── 📄 security-mcp-server.js     # Security scanning
│   │   └── 📄 git-mcp-server.js          # Git operations
│   │
│   ├── 📁 tools/                         # MCP tool definitions
│   │   ├── 📄 code-analysis.js
│   │   ├── 📄 doc-generation.js
│   │   └── 📄 security-scan.js
│   │
│   └── 📁 node_modules/                  # MCP dependencies (88 MB)
│
├── 📁 elaria_command_center/             # AI Command Center (74.66 MB)
│   ├── 📄 package.json
│   ├── 📄 .env                           # Config (IGNORED)
│   │
│   ├── 📁 src/
│   │   ├── 📄 index.ts                   # Entry point
│   │   ├── 📁 agents/                    # Agent implementations
│   │   │   ├── 📄 sales-agent.ts
│   │   │   ├── 📄 support-agent.ts
│   │   │   └── 📄 analyst-agent.ts
│   │   │
│   │   ├── 📁 orchestration/             # Multi-agent orchestration
│   │   └── 📁 tools/                     # Agent tools
│   │
│   └── 📁 node_modules/                  # Dependencies (72 MB)
│
├── 📁 elaria-control-plane/              # Control plane (18.36 MB)
│   ├── 📄 package.json
│   ├── 📁 src/
│   │   ├── 📄 server.ts                  # Control plane API
│   │   ├── 📁 monitoring/                # Agent monitoring
│   │   └── 📁 deployment/                # Agent deployment
│   │
│   └── 📁 node_modules/                  # Dependencies (16 MB)
│
├── 📁 langchain-integration/             # LangChain integration
│   ├── 📄 package.json
│   ├── 📁 chains/                        # LangChain chains
│   ├── 📁 agents/                        # LangChain agents
│   └── 📁 tools/                         # LangChain tools
│
├── 📁 llamaindex-integration/            # LlamaIndex integration
│   ├── 📄 package.json
│   ├── 📁 indexes/                       # Vector indexes
│   └── 📁 query-engines/                 # Query engines
│
├── 📁 ollama-knowledge/                  # Ollama local models
│   ├── 📄 README.md
│   └── 📁 models/                        # Model configs
│
├── 📁 adapters/                          # External integrations
│   ├── 📄 claude-adapter.ts              # Anthropic Claude
│   ├── 📄 openai-adapter.ts              # OpenAI
│   └── 📄 ollama-adapter.ts              # Ollama
│
├── 📁 contracts/                         # Agent contracts/interfaces
│
├── 📁 orchestration/                     # Multi-agent orchestration
│   ├── 📄 task-router.ts
│   └── 📄 agent-coordinator.ts
│
└── 📁 scripts/                           # Agent management scripts
    ├── 📄 start-agents.sh
    └── 📄 deploy-agents.sh
```

**Agents Key Statistics:**
- **Size**: 185.46 MB
- **Files**: 20,407 files
- **MCP Servers**: 7 servers (orchestrator, ai-router, codebase, documentation, testing, security, git)
- **AI Agents**: 3 agents (sales, support, analyst)
- **Integrations**: LangChain, LlamaIndex, Ollama
- **Adapters**: Claude, OpenAI, Ollama

---

## 🟣 Documentation Structure

### Docs (`docs/` - 1.83 MB, 181 files, 22 subdirectories)

**Complete 4-Level Directory Tree:**

```
docs/
│
├── 📄 00_MAP.md                          # ← You are here
├── 📄 01_ARCHITECTURE.md                 # Polyglot database architecture
├── 📄 02_AI-SYSTEMS.md                   # Albedo AI architecture
├── 📄 03_API.md                          # REST/GraphQL API reference
├── 📄 04_DEPLOYMENT.md                   # Deployment guide
├── 📄 05_SECURITY.md                     # Security & OWASP compliance
├── 📄 06_DEVELOPMENT.md                  # Local development setup
├── 📄 07_CHANGELOG.md                    # Version history
├── 📄 08_TROUBLESHOOTING.md              # Common issues & solutions
├── 📄 NEXT-STEPS.md                      # Future roadmap
│
├── 📁 guides/                            # User guides (22 files)
│   ├── 📄 QUICK-START.md                 # Quick start guide
│   ├── 📄 installation.md
│   ├── 📄 configuration.md
│   └── ... (19 more guides)
│
├── 📁 protocols/                         # Development standards (14 files)
│   ├── 📄 01_security-protocol.md
│   ├── 📄 02_testing-protocol.md
│   ├── 📄 03_performance-protocol.md
│   ├── 📄 04_api-design-protocol.md
│   └── ... (10 more protocols)
│
├── 📁 api/                               # API documentation
│   ├── 📁 rest/                          # REST API docs
│   │   ├── 📄 authentication.md
│   │   ├── 📄 contacts.md
│   │   ├── 📄 accounts.md
│   │   └── ... (endpoint docs)
│   │
│   ├── 📁 graphql/                       # GraphQL schema docs
│   └── 📁 websocket/                     # WebSocket event docs
│
├── 📁 architecture/                      # Architecture docs
│   ├── 📄 overview.md                    # System overview
│   ├── 📄 database-design.md             # Database architecture
│   ├── 📄 module-system.md               # Plugin architecture
│   └── 📄 microservices.md               # Service architecture
│
├── 📁 deployment/                        # Deployment guides
│   ├── 📄 MIGRATION_CHECKLIST.md         # Migration checklist
│   ├── 📄 RENDER_DEPLOY.md               # Render.com deployment
│   ├── 📄 docker.md                      # Docker deployment
│   ├── 📄 kubernetes.md                  # Kubernetes deployment
│   └── 📄 monitoring.md                  # Observability setup
│
├── 📁 security/                          # Security documentation
│   ├── 📄 authentication.md              # Auth implementation
│   ├── 📄 authorization.md               # RBAC system
│   ├── 📄 owasp-compliance.md            # OWASP checklist
│   └── 📄 penetration-testing.md         # Security testing
│
├── 📁 audits/                            # Security audits
│   ├── 📄 BULLETPROOF_AUDIT_REPORT.md    # Comprehensive audit (24 KB)
│   └── 📄 security-audit-2025-11-09.md
│
├── 📁 reports/                           # Status reports
│   ├── 📄 EXECUTION_SUMMARY.md           # Execution summary (9.3 KB)
│   ├── 📄 REPAIR_SUMMARY.md              # Repair summary (11 KB)
│   ├── 📄 SESSION_STATUS.md              # Session status (5.3 KB)
│   └── 📄 CLEANUP_REPORT_2025-11-11.md   # Repository cleanup report
│
├── 📁 implementation/                    # Feature implementation docs
│   ├── 📄 SSO_MFA_IMPLEMENTATION_STATUS.md # SSO/MFA status (13 KB)
│   └── 📄 module-registry-migration.md
│
├── 📁 ai/                                # AI system documentation
│   ├── 📄 albedo-overview.md             # Albedo AI overview
│   ├── 📄 ml-models.md                   # ML model documentation
│   ├── 📄 agents.md                      # Agent architecture
│   └── 📄 mcp-protocol.md                # MCP implementation
│
├── 📁 database/                          # Database documentation
│   ├── 📄 schema.md                      # Schema documentation
│   ├── 📄 migrations.md                  # Migration guide
│   ├── 📄 indexes.md                     # Index optimization
│   └── 📄 queries.md                     # Query patterns
│
├── 📁 testing/                           # Testing documentation
│   ├── 📄 unit-testing.md                # Unit test guide
│   ├── 📄 integration-testing.md         # Integration test guide
│   ├── 📄 e2e-testing.md                 # E2E test guide
│   └── 📄 performance-testing.md         # Performance test guide
│
├── 📁 frontend/                          # Frontend documentation
│   ├── 📄 component-library.md           # Component docs
│   ├── 📄 state-management.md            # State management
│   └── 📄 styling.md                     # Styling guide
│
├── 📁 backend/                           # Backend documentation
│   ├── 📄 module-system.md               # Module registry
│   ├── 📄 middleware.md                  # Middleware docs
│   └── 📄 services.md                    # Service layer
│
├── 📁 integrations/                      # Integration guides
│   ├── 📄 stripe.md                      # Stripe billing
│   ├── 📄 sendgrid.md                    # Email service
│   ├── 📄 oauth.md                       # OAuth providers
│   └── 📄 webhooks.md                    # Webhook setup
│
├── 📁 runbooks/                          # Operational runbooks
│   ├── 📄 incident-response.md
│   ├── 📄 backup-restore.md
│   └── 📄 scaling.md
│
├── 📁 diagrams/                          # Architecture diagrams
│   ├── 📄 system-overview.png
│   ├── 📄 database-erd.png
│   └── 📄 deployment-diagram.png
│
├── 📁 examples/                          # Code examples
│   ├── 📄 creating-module.md
│   ├── 📄 adding-endpoint.md
│   └── 📄 writing-tests.md
│
├── 📁 changelog/                         # Version changelogs
│   ├── 📄 v3.0.0.md
│   ├── 📄 v2.5.0.md
│   └── ... (version history)
│
├── 📁 migration/                         # Migration guides
│   ├── 📄 v2-to-v3.md
│   └── 📄 legacy-to-module-registry.md
│
├── 📁 work-logs/                         # Development logs
│   └── 📄 session-2025-11-10.md
│
└── 📁 archive/                           # Archived documentation
    └── 📄 old-architecture.md
```

**Documentation Statistics:**
- **Total Files**: 181 markdown files
- **Total Size**: 1.83 MB
- **Categories**: 22 subdirectories
- **Core Docs**: 10 numbered guides (00-08)
- **Protocols**: 14 development standards
- **API Docs**: REST, GraphQL, WebSocket
- **Guides**: 22 user guides

---

## 🟠 Configuration & Infrastructure

### Config (`config/` - 0.09 MB, 51 files)

**4-Level Directory Tree:**

```
config/
│
├── 📁 app/                               # Application configuration
│   ├── 📄 app-config.ts                  # Main app config
│   ├── 📄 env-config.ts                  # Environment variables
│   └── 📄 constants.ts                   # App constants
│
├── 📁 database/                          # Database configuration
│   ├── 📄 postgresql-config.ts           # PostgreSQL connection
│   ├── 📄 mongodb-config.ts              # MongoDB connection
│   ├── 📄 redis-config.ts                # Redis connection
│   └── 📄 elasticsearch-config.ts        # Elasticsearch connection
│
├── 📁 security/                          # Security configuration
│   ├── 📄 cors-config.ts                 # CORS settings
│   ├── 📄 helmet-config.ts               # Helmet security headers
│   ├── 📄 rate-limit-config.ts           # Rate limiting rules
│   └── 📄 csrf-config.ts                 # CSRF protection
│
├── 📁 services/                          # Service configuration
│   ├── 📄 email-config.ts                # Email service (SendGrid)
│   ├── 📄 storage-config.ts              # File storage (MinIO/S3)
│   └── 📄 ai-config.ts                   # AI service config
│
├── 📁 monitoring/                        # Observability configuration
│   ├── 📄 prometheus-config.ts           # Prometheus metrics
│   ├── 📄 grafana-config.ts              # Grafana dashboards
│   └── 📄 loki-config.ts                 # Loki logging
│
├── 📁 queue/                             # Queue configuration
│   ├── 📄 bullmq-config.ts               # BullMQ queue settings
│   └── 📄 workers-config.ts              # Worker configuration
│
├── 📁 ai/                                # AI configuration
│   ├── 📄 claude-config.ts               # Claude API
│   └── 📄 openai-config.ts               # OpenAI API
│
└── 📁 features/                          # Feature flags
    └── 📄 feature-flags.ts               # Feature toggle config
```

### Deployment (`deployment/` - 0.02 MB, 11 files)

**4-Level Directory Tree:**

```
deployment/
│
├── 📁 docker/                            # Docker configurations
│   ├── 📄 Dockerfile.backend             # Backend container
│   ├── 📄 Dockerfile.frontend            # Frontend container
│   ├── 📄 docker-compose.yml             # Multi-container stack
│   │
│   ├── 📁 development/                   # Dev environment
│   │   └── 📄 docker-compose.dev.yml
│   │
│   └── 📁 production/                    # Production environment
│       └── 📄 docker-compose.prod.yml
│
├── 📁 kubernetes/                        # Kubernetes manifests
│   ├── 📄 deployment.yaml
│   ├── 📄 service.yaml
│   └── 📄 ingress.yaml
│
└── 📁 ci-cd/                             # CI/CD configurations
    └── 📁 github-actions/
        └── 📄 deploy.yml
```

### Infrastructure (`infrastructure/` - 0.01 MB, 4 files)

```
infrastructure/
│
└── 📁 nginx/                             # Nginx configuration
    ├── 📄 nginx.conf                     # Main config
    ├── 📄 ssl.conf                       # SSL/TLS config
    └── 📄 proxy.conf                     # Reverse proxy config
```

---

## 🗄️ Database Structure

### Database (`database/` - 0.23 MB, 30 files)

**4-Level Directory Tree:**

```
database/
│
├── 📁 migrations/                        # Schema migrations (17 files)
│   ├── 📄 001_initial_schema.sql         # 17 core tables
│   ├── 📄 002_add_indexes.sql            # Performance indexes
│   ├── 📄 003_add_sso_mfa.sql            # SSO/MFA tables
│   ├── 📄 004_add_billing.sql            # Billing tables
│   └── ... (13 more migrations)
│
├── 📁 schemas/                           # Database schemas
│   │
│   ├── 📁 postgresql/                    # PostgreSQL schemas (10 files)
│   │   ├── 📄 core-schema.sql            # Core CRM tables
│   │   ├── 📄 auth-schema.sql            # Authentication tables
│   │   ├── 📄 billing-schema.sql         # Subscription tables
│   │   ├── 📄 sso-mfa-schema.sql         # SSO/MFA tables
│   │   └── ... (6 more schemas)
│   │
│   ├── 📁 mongodb/                       # MongoDB schemas
│   │   └── 📄 logs-collection.js         # Structured logging
│   │
│   └── 📁 redis/                         # Redis key patterns
│       └── 📄 cache-keys.md              # Cache key documentation
│
├── 📁 seeds/                             # Seed data
│   ├── 📄 demo-data.sql                  # Demo accounts/contacts
│   └── 📄 test-data.sql                  # Test data
│
├── 📁 queries/                           # Common queries
│   ├── 📄 analytics-queries.sql          # Analytics queries
│   └── 📄 reports.sql                    # Report queries
│
└── 📁 indexes/                           # Index documentation
    └── 📄 index-strategy.md              # Index optimization guide
```

**Database Key Information:**

**PostgreSQL Tables (17 core tables):**
- users, tenants, roles, permissions, role_permissions
- contacts, accounts, deals, tasks, notes
- custom_fields, field_values
- email_templates, email_logs
- sessions, audit_logs
- subscriptions, invoices

**Schema Features:**
- Multi-tenant (`tenant_id` on all tables)
- UUID primary keys
- Soft deletes (`deleted_at`)
- 30+ composite indexes
- Standard columns: `created_at`, `updated_at`, `created_by`, `updated_by`

---

## 🧪 Testing Infrastructure

### Tests (`tests/` - 0.29 MB, 81 files)

**4-Level Directory Tree:**

```
tests/
│
├── 📄 jest.config.js                     # Jest configuration
├── 📄 setup.ts                           # Test setup
│
├── 📁 unit/                              # Unit tests (228 passing)
│   ├── 📁 auth/                          # Authentication tests
│   │   ├── 📄 auth-service.test.ts
│   │   ├── 📄 password-service.test.ts
│   │   └── 📄 session-service.test.ts
│   │
│   ├── 📁 analytics/                     # Analytics tests
│   │   ├── 📄 analytics-service.test.ts
│   │   └── 📄 analytics-repository.test.ts
│   │
│   ├── 📁 security/                      # Security tests (60+ cases)
│   │   ├── 📄 input-sanitization.test.ts
│   │   ├── 📄 sql-injection.test.ts
│   │   ├── 📄 xss-prevention.test.ts
│   │   └── 📄 csrf-protection.test.ts
│   │
│   ├── 📁 contacts/                      # Contact tests
│   ├── 📁 accounts/                      # Account tests
│   ├── 📁 deals/                         # Deal tests
│   └── ... (other modules)
│
├── 📁 integration/                       # Integration tests
│   ├── 📁 api/                           # API integration tests
│   │   ├── 📄 auth-endpoints.test.ts
│   │   ├── 📄 contacts-endpoints.test.ts
│   │   └── ... (endpoint tests)
│   │
│   └── 📁 database/                      # Database integration tests
│       └── 📄 postgresql.test.ts
│
├── 📁 e2e/                               # End-to-end tests
│   ├── 📄 playwright.config.ts           # Playwright config
│   ├── 📁 scenarios/
│   │   ├── 📄 user-registration.test.ts
│   │   ├── 📄 contact-management.test.ts
│   │   └── 📄 deal-pipeline.test.ts
│   │
│   └── 📁 fixtures/                      # Test fixtures
│       └── 📄 test-data.ts
│
├── 📁 performance/                       # Performance tests
│   ├── 📄 api-load-test.ts
│   └── 📄 database-benchmarks.ts
│
├── 📁 security/                          # Security tests
│   ├── 📄 penetration-tests.ts
│   └── 📄 owasp-tests.ts
│
├── 📁 mocks/                             # Test mocks
│   ├── 📄 database-mock.ts
│   └── 📄 api-mock.ts
│
└── 📁 fixtures/                          # Test fixtures
    ├── 📄 users.json
    ├── 📄 contacts.json
    └── 📄 accounts.json
```

**Testing Statistics:**
- **Unit Tests**: 228 passing
- **Coverage**: 32.24% (Target: 85%+)
- **Test Files**: 81 files
- **Test Framework**: Jest 29.7.0
- **E2E Framework**: Playwright
- **Security Tests**: 60+ security test cases

---

## 🟡 Temporary & Cache

### Coverage (`coverage/` - 15.31 MB, 544 files)

```
coverage/
│
├── 📁 lcov-report/                       # HTML coverage reports
│   ├── 📄 index.html                     # Coverage dashboard
│   └── ... (543 HTML files)
│
└── 📄 lcov.info                          # LCOV data file
```

### Logs (`logs/` - 4.23 MB, 37 files)

```
logs/
│
├── 📄 app.log                            # Current application log
├── 📄 error.log                          # Error log
├── 📄 access.log                         # HTTP access log
│
├── 📁 session-logs/                      # Development session logs
│   ├── 📄 session-2025-11-10.log
│   └── ... (30+ session logs)
│
└── 📁 archive/                           # ⚫ Archived logs (3.28 MB)
    └── ... (logs older than 30 days)
```

---

## 🚀 Deployment & Infrastructure

### Docker Compose

**File**: `docker-compose.yml`

**Services (4 databases + backend + frontend):**
- PostgreSQL 15+
- MongoDB 6+
- Redis 7+
- Elasticsearch 8.11.0
- Backend API (Node.js)
- Frontend (React SPA)

### Render Deployment

**File**: `render.yaml`

**Services:**
- Web Service (Backend API)
- Static Site (Frontend)
- PostgreSQL database
- Redis cache

---

## 🔵 Dependencies

### Node Modules (`node_modules/` - 1,316.39 MB, 74,860 files)

**Major Dependencies (400+ packages):**

**Backend:**
- express@4.18.2
- typescript@5.3.0
- pg@8.11.3 (PostgreSQL)
- mongodb@6.3.0
- redis@4.6.12
- bullmq@5.63.0 (Job queues)
- winston@3.11.0 (Logging)
- helmet@7.1.0 (Security)
- cors@2.8.5
- jsonwebtoken@9.0.2
- bcrypt@5.1.1

**Frontend:**
- react@18.2.0
- react-dom@18.2.0
- vite@4.5.0
- typescript@5.3.0
- tailwindcss@3.4.0
- react-router-dom@6.20.0
- axios@1.6.2
- zustand@4.4.7 (State management)
- react-query@5.13.0

**AI/Agents:**
- @anthropic-ai/sdk@0.20.0
- openai@4.24.0
- langchain@0.1.0
- llamaindex@0.1.0

**Testing:**
- jest@29.7.0
- @playwright/test@1.40.0
- supertest@6.3.3

---

## 📈 Repository Statistics

### Size Distribution

| Category | Size (MB) | Files | Percentage |
|----------|-----------|-------|------------|
| node_modules | 1,316.39 | 74,860 | 67.8% |
| frontend | 404.35 | 50,077 | 20.8% |
| agents | 185.46 | 20,407 | 9.6% |
| coverage | 15.31 | 544 | 0.8% |
| .git | 7.66 | 1,592 | 0.4% |
| logs | 4.23 | 37 | 0.2% |
| backend | 2.23 | 364 | 0.1% |
| docs | 1.83 | 181 | 0.1% |
| tools | 1.53 | 78 | 0.1% |
| scripts | 0.47 | 99 | 0.02% |
| tests | 0.29 | 81 | 0.01% |
| database | 0.23 | 30 | 0.01% |
| config | 0.09 | 51 | 0.005% |
| deployment | 0.02 | 11 | 0.001% |
| **TOTAL** | **1,940.25** | **147,337** | **100%** |

### File Type Distribution

| Extension | Count | Percentage | Category |
|-----------|-------|-----------|----------|
| .js | 62,200 | 42.2% | JavaScript source |
| .ts | 31,757 | 21.6% | TypeScript source |
| .map | 15,388 | 10.4% | Source maps |
| .json | 4,511 | 3.1% | Configuration |
| .md | 4,111 | 2.8% | Documentation |
| .mjs/.cjs | 8,282 | 5.6% | ES modules |
| Other | 20,088 | 13.6% | Various |
| **TOTAL** | **147,337** | **100%** | |

### Last Modified Dates

| Directory | Last Modified | Status |
|-----------|---------------|--------|
| docs | 2025-11-11 00:05 | Latest |
| frontend | 2025-11-10 23:50 | Current |
| backend | 2025-11-10 23:50 | Current |
| config | 2025-11-10 23:52 | Current |
| database | 2025-11-10 23:52 | Current |
| coverage | 2025-11-10 17:50 | Recent |
| logs | 2025-11-10 17:06 | Recent |
| node_modules | 2025-11-10 21:32 | Recent install |

---

## 🔍 Quick Reference

### Finding Things

| What You Need | Where It Is | File Pattern |
|---------------|-------------|--------------|
| API Endpoint | `backend/api/rest/v1/routes/` | `*-routes.ts` |
| Business Logic | `backend/core/[module]/` | `*-service.ts` |
| Database Query | `backend/core/[module]/` | `*-repository.ts` |
| Controller | `backend/core/[module]/` | `*-controller.ts` |
| Middleware | `backend/middleware/` | `*.ts` |
| React Page | `frontend/src/pages/` | `*.tsx` |
| React Component | `frontend/src/components/` | `*.tsx` |
| API Type | `frontend/src/types/` | `*.types.ts` |
| Database Schema | `database/schemas/postgresql/` | `*.sql` |
| Migration | `database/migrations/` | `*.sql` |
| Unit Test | `tests/unit/[module]/` | `*.test.ts` |
| E2E Test | `tests/e2e/scenarios/` | `*.test.ts` |
| Configuration | `config/[category]/` | `*-config.ts` |
| Documentation | `docs/[category]/` | `*.md` |

### Adding New Features

**1. Backend Feature:**
```
1. Service: backend/core/[module]/[name]-service.ts
2. Repository: backend/core/[module]/[name]-repository.ts
3. Controller: backend/core/[module]/[name]-controller.ts
4. Routes: backend/api/rest/v1/routes/[name]-routes.ts
5. Tests: tests/unit/[module]/[name]-service.test.ts
```

**2. Frontend Feature:**
```
1. Page: frontend/src/pages/[Name].tsx
2. Components: frontend/src/components/[feature]/
3. Service: frontend/src/services/[name].service.ts
4. Types: frontend/src/types/[name].types.ts
5. Tests: tests/e2e/scenarios/[name].test.ts
```

**3. Database Change:**
```
1. Migration: database/migrations/[###]_[description].sql
2. Schema: database/schemas/postgresql/[name]-schema.sql
3. Update docs: docs/database/schema.md
```

---

## 🎯 Project Health Metrics

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Test Coverage | 32.24% | 85%+ | 🟡 Needs Work |
| Security Score | 100% | 100% | 🟢 Excellent |
| Documentation | 1.83 MB | Complete | 🟢 Excellent |
| API Endpoints | 50+ | - | 🟢 Good |
| Unit Tests | 228 passing | - | 🟢 Good |
| Production Ready | 85-90% | 100% | 🟡 Almost There |

---

## 🔐 Security Features

- ✅ JWT + session-based authentication
- ✅ bcrypt password hashing (cost=12)
- ✅ Rate limiting (auth: 5/15min, API: 100/min)
- ✅ CSRF protection (24h token expiry)
- ✅ Input sanitization (9 utilities)
- ✅ OWASP Top 10 compliance
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Account lockout after 5 failed attempts
- ✅ Helmet security headers
- ✅ CORS configuration

**Security Score**: 100%

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js v22.21.0
- **Framework**: Express.js 4.18.2
- **Language**: TypeScript 5.3.0
- **Databases**: PostgreSQL 15+, MongoDB 6+, Redis 7+, Elasticsearch 8.11.0
- **Queue**: BullMQ 5.63.0
- **Auth**: JWT + bcrypt
- **Testing**: Jest 29.7.0

### Frontend
- **Library**: React 18.2.0
- **Language**: TypeScript 5.3.0
- **Build Tool**: Vite 4.5.0
- **Styling**: Tailwind CSS 3.4.0
- **Router**: React Router 6.20.0
- **State**: Zustand 4.4.7
- **Data Fetching**: React Query 5.13.0
- **Testing**: Playwright

### AI/Agents
- **MCP**: Model Context Protocol
- **Frameworks**: LangChain, LlamaIndex
- **APIs**: Claude (Anthropic), OpenAI, Ollama
- **Orchestration**: Custom multi-agent system

### DevOps
- **Containers**: Docker Compose
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus, Grafana, Loki
- **Deployment**: Render.com

---

## 📞 More Information

### Essential Documentation
- **Architecture**: [docs/01_ARCHITECTURE.md](01_ARCHITECTURE.md)
- **AI Systems**: [docs/02_AI-SYSTEMS.md](02_AI-SYSTEMS.md)
- **API Reference**: [docs/03_API.md](03_API.md)
- **Deployment**: [docs/04_DEPLOYMENT.md](04_DEPLOYMENT.md)
- **Security**: [docs/05_SECURITY.md](05_SECURITY.md)
- **Development**: [docs/06_DEVELOPMENT.md](06_DEVELOPMENT.md)
- **Troubleshooting**: [docs/08_TROUBLESHOOTING.md](08_TROUBLESHOOTING.md)

### Quick Start
- **Installation**: [docs/guides/installation.md](guides/installation.md)
- **Quick Start**: [docs/guides/QUICK-START.md](guides/QUICK-START.md)
- **Configuration**: [docs/guides/configuration.md](guides/configuration.md)

### Development Standards
- **All Protocols**: [docs/protocols/](protocols/)
- **Security Protocol**: [docs/protocols/01_security-protocol.md](protocols/01_security-protocol.md)
- **Testing Protocol**: [docs/protocols/02_testing-protocol.md](protocols/02_testing-protocol.md)
- **API Design Protocol**: [docs/protocols/04_api-design-protocol.md](protocols/04_api-design-protocol.md)

---

## 📊 Summary

**ClientForge CRM** is a production-ready, enterprise-grade CRM system with:

- ✅ **Modular Architecture**: Plugin-based module registry system
- ✅ **Polyglot Database**: PostgreSQL, MongoDB, Redis, Elasticsearch
- ✅ **AI-Powered**: Multi-agent AI system with MCP protocol
- ✅ **Secure**: 100% OWASP compliance, comprehensive security features
- ✅ **Tested**: 228 passing unit tests, 60+ security tests
- ✅ **Documented**: 181 markdown files, 1.83 MB of documentation
- ✅ **Scalable**: Microservices-ready, queue-based processing
- ✅ **Modern Stack**: React 18, TypeScript, Vite, Express.js

**Current Status**: 85-90% production-ready

---

**Maintained By**: Development Team
**Last Updated**: 2025-11-11
**Map Version**: 3.0 (Comprehensive Edition)

---

_This map was generated from a comprehensive repository scan and includes:_
- _Complete directory tree up to 4 levels deep_
- _Directory categorization (Core Source, Build, Cache, Docs, Config, Archives)_
- _Size analysis for all major directories_
- _File counts and last-modified dates_
- _Quick navigation to all documentation_
- _Technology stack details_
- _Project health metrics_
