# 🛠️ ClientForge CRM - Tools & Systems Reference

**Complete guide to all tools, applications, and systems used in ClientForge CRM development**

**Last Updated**: 2025-11-06

---

## 📑 Table of Contents

- [Development Tools](#development-tools)
- [Database Systems](#database-systems)
- [Infrastructure & DevOps](#infrastructure--devops)
- [AI & Machine Learning](#ai--machine-learning)
- [Testing & Quality](#testing--quality)
- [System Architecture Map](#system-architecture-map)
- [Tool Integration Flows](#tool-integration-flows)
- [Quick Reference](#quick-reference)

---

## Development Tools

### 1. **Visual Studio Code**
**Purpose**: Primary code editor and IDE

**What It Does**:
- Source code editing with IntelliSense
- Integrated terminal for commands
- Git integration for version control
- Extension support (ESLint, Prettier, TypeScript)
- Debugging with breakpoints

**How We Use It**:
- Write backend TypeScript code
- Build frontend React components
- Edit configuration files
- Run npm scripts via terminal
- Debug application issues

**Location**: Installed system-wide
**Documentation**: https://code.visualstudio.com/docs

---

### 2. **Node.js v22.21.0**
**Purpose**: JavaScript runtime environment

**What It Does**:
- Executes JavaScript code outside the browser
- Runs backend Express server
- Manages npm packages
- Provides build tools (TypeScript compiler, bundlers)

**How We Use It**:
- Backend API server runtime
- Development servers (Vite for frontend)
- Package management via npm
- Script execution (migrations, tests)

**Key Commands**:
```bash
node --version                # Check Node.js version
npm install                   # Install dependencies
npm run dev:backend          # Start backend server
npm test                      # Run test suite
```

**Location**: `C:\Program Files\nodejs\`

---

### 3. **Git**
**Purpose**: Version control system

**What It Does**:
- Tracks code changes over time
- Enables collaboration between developers
- Branch management for features
- Merge conflict resolution
- Code history and rollback capability

**How We Use It**:
- Commit code changes locally
- Push to GitHub remote repository
- Create feature branches
- Merge completed features to main
- Track project history

**Key Commands**:
```bash
git status                    # Check working tree status
git add .                     # Stage all changes
git commit -m "message"      # Commit with message
git push origin main         # Push to remote
git pull                      # Pull latest changes
```

**Repository**: https://github.com/jalgreatworks0/ClientForge.git

---

### 4. **GitKraken**
**Purpose**: Visual Git client (GUI alternative to command-line Git)

**What It Does**:
- Visual branch graph and history
- Drag-and-drop merge operations
- Built-in merge conflict resolver
- GitHub/GitLab integration
- Commit timeline visualization

**How We Use It**:
- Visual branch management
- Review commit history
- Resolve merge conflicts visually
- Create pull requests
- Manage remote repositories

**Launch**:
```powershell
.\open-gitkraken.ps1
```

**Configuration**: Token stored in `.env` (GITKRAKEN_TOKEN)
**Location**: `C:\Program Files\GitKraken\GitKraken.exe`

---

### 5. **Postman**
**Purpose**: API testing and development tool

**What It Does**:
- Send HTTP requests (GET, POST, PUT, DELETE)
- Test API endpoints with various payloads
- Save and organize request collections
- Auto-save authentication tokens
- Generate code snippets for API calls

**How We Use It**:
- Test backend API endpoints
- Debug authentication flow
- Create sample data (contacts, deals)
- Validate API responses
- Document API behavior

**Collection**: `postman_collection.json` (40+ pre-configured requests)

**Import Collection**:
1. Open Postman
2. File → Import
3. Select `d:\clientforge-crm\postman_collection.json`
4. Collection appears in sidebar

**Key Endpoints**:
- Health: `GET http://localhost:3000/api/v1/health`
- Login: `POST http://localhost:3000/api/v1/auth/login`
- Contacts: `GET http://localhost:3000/api/v1/contacts`

**Location**: `C:\Users\ScrollForge\AppData\Local\Postman`

---

## Database Systems

### 6. **PostgreSQL 15**
**Purpose**: Primary relational database

**What It Does**:
- Stores structured CRM data (contacts, accounts, deals)
- ACID-compliant transactions
- Complex queries with joins
- Full-text search capabilities
- Multi-tenant data isolation

**How We Use It**:
- Store all CRM entities
- User authentication data
- Relationships between entities
- Transaction history
- Audit logs

**Tables** (17 total):
- Core: `tenants`, `users`, `roles`, `user_roles`, `sessions`
- CRM: `contacts`, `accounts`, `deals`, `tasks`, `activities`
- Metadata: `tags`, `entity_tags`, `notes`, `comments`, `notifications`, `custom_fields`, `audit_logs`

**Connection Details**:
```
Host: localhost
Port: 5432
Database: clientforge
User: crm
Password: password
```

**Access Methods**:
- GUI: DBeaver
- CLI: `docker compose exec postgres psql -U crm -d clientforge`
- Application: Node.js `pg` library

---

### 7. **DBeaver Community**
**Purpose**: PostgreSQL database management GUI

**What It Does**:
- Visual database browser (tables, columns, indexes)
- SQL query editor with autocomplete
- Data viewing in spreadsheet format
- Export data to Excel/CSV
- ER diagram generation

**How We Use It**:
- Browse database tables and schemas
- Run SQL queries for debugging
- Inspect data directly
- Verify migrations ran correctly
- Export data for analysis

**Connect to ClientForge**:
1. Open DBeaver
2. New Connection → PostgreSQL
3. Host: `localhost`, Port: `5432`
4. Database: `clientforge`, User: `crm`, Password: `password`
5. Test Connection → Finish

**Location**: `C:\Program Files\DBeaver`
**Launch**: Start Menu → DBeaver

---

### 8. **Redis 7**
**Purpose**: In-memory cache and session store

**What It Does**:
- Fast key-value storage (sub-millisecond access)
- Session management
- Caching frequently accessed data
- Real-time counters and statistics
- Pub/sub messaging

**How We Use It**:
- Store user sessions (JWT tokens)
- Cache API responses
- Store temporary data
- Rate limiting counters
- Real-time notifications

**Connection Details**:
```
Host: localhost
Port: 6379
Password: (none)
```

**Access Methods**:
- GUI: Redis Commander (web interface)
- CLI: `docker compose exec redis redis-cli`
- Application: Node.js `ioredis` library

---

### 9. **Redis Commander**
**Purpose**: Web-based Redis management interface

**What It Does**:
- View all Redis keys
- Inspect key values and types
- Set/delete keys manually
- Monitor Redis performance
- Execute Redis commands

**How We Use It**:
- Debug session issues
- Clear cache manually
- Monitor key expiration
- Test Redis commands
- View stored data structure

**Launch**:
```bash
redis-commander
```
**Access**: http://localhost:8081

---

### 10. **MongoDB 6**
**Purpose**: NoSQL database for logs and unstructured data

**What It Does**:
- Document-based storage (JSON-like)
- Flexible schema (no predefined structure)
- High write throughput
- Time-series data storage
- Full-text search

**How We Use It**:
- Application logs
- Event tracking
- User activity streams
- Email content storage
- Unstructured metadata

**Connection Details**:
```
Host: localhost
Port: 27017
Database: clientforge_logs
User: crm
Password: password
Connection String: mongodb://crm:password@localhost:27017
```

**Access Methods**:
- GUI: MongoDB Compass
- CLI: `docker compose exec mongodb mongosh`
- Application: Node.js `mongodb` library

---

### 11. **MongoDB Compass**
**Purpose**: MongoDB database management GUI

**What It Does**:
- Visual collection browser
- Document viewer and editor
- Query builder (drag-and-drop)
- Index management
- Performance analytics

**How We Use It**:
- Browse log collections
- Query event data
- Analyze document structure
- Monitor MongoDB performance
- Create/manage indexes

**Connect to ClientForge**:
1. Open MongoDB Compass
2. New Connection
3. URI: `mongodb://crm:password@localhost:27017`
4. Connect

**Location**: Installed via Chocolatey
**Launch**: Start Menu → MongoDB Compass

---

## Infrastructure & DevOps

### 12. **Docker Desktop 4.50**
**Purpose**: Container platform for running databases and services

**What It Does**:
- Runs isolated application containers
- Manages container lifecycle
- Provides consistent environments
- Network isolation between containers
- Volume management for persistent data

**How We Use It**:
- Run PostgreSQL, Redis, MongoDB containers
- Isolate development environment
- Match production infrastructure
- Easy cleanup and reset
- No local installation conflicts

**Key Containers**:
- `clientforge-crm-postgres-1` (PostgreSQL 15 Alpine)
- `clientforge-crm-redis-1` (Redis 7 Alpine)
- `clientforge-crm-mongodb-1` (MongoDB 6)

**Management**:
- GUI: Docker Desktop Dashboard
- CLI: `docker compose` commands

**Configuration**: `docker-compose.yml`

---

### 13. **Docker Compose**
**Purpose**: Multi-container orchestration tool

**What It Does**:
- Defines multi-container applications in YAML
- Starts/stops all services with one command
- Manages networks between containers
- Handles volume persistence
- Environment variable injection

**How We Use It**:
- Start all databases: `docker compose up -d postgres redis mongodb`
- View status: `docker compose ps`
- View logs: `docker compose logs -f`
- Stop all: `docker compose down`
- Reset: `docker compose down -v` (deletes data)

**Configuration File**: `d:\clientforge-crm\docker-compose.yml`

---

### 14. **PowerShell Scripts**
**Purpose**: Automation scripts for common development tasks

**What They Do**:
- Automate repetitive tasks
- Reduce manual errors
- Document processes as code
- Provide one-command operations

**Our Scripts**:

**`start-dev.ps1`** (80 lines):
- Checks if Docker is running
- Starts all database containers
- Waits for services to initialize
- Verifies health of each service
- Displays connection information

**`run-migrations.ps1`**:
- Finds all SQL migration files
- Runs them in order
- Verifies tables were created
- Shows migration results

**`reset-dev-env.ps1`** (51 lines):
- Confirmation prompt (data loss warning)
- Stops all containers
- Deletes all volumes
- Restarts fresh containers
- Re-runs migrations

**`open-gitkraken.ps1`** (14 lines):
- Checks GitKraken installation
- Opens repository in GitKraken
- Fallback instructions if not found

**Usage**:
```powershell
.\start-dev.ps1              # Start environment
.\run-migrations.ps1         # Run database migrations
.\reset-dev-env.ps1          # Nuclear reset (deletes data!)
.\open-gitkraken.ps1         # Launch GitKraken
```

---

### 15. **Render.com**
**Purpose**: Cloud hosting platform for production deployment

**What It Does**:
- Hosts backend API in production
- Automatic deployments from GitHub
- Free PostgreSQL database hosting
- HTTPS/SSL certificates included
- Environment variable management

**How We Use It**:
- Production backend hosting
- Staging environment
- Automatic CI/CD pipeline
- Database backups
- Monitoring and logs

**URLs**:
- Production: https://clientforge-crm.onrender.com
- Repository: https://github.com/jalgreatworks0/ClientForge.git

**Configuration**: Build command, start command, environment variables

---

## AI & Machine Learning

### 16. **Anthropic Claude SDK**
**Purpose**: AI assistant integration (Albedo)

**What It Does**:
- Natural language understanding
- Conversational AI interface
- Code generation and analysis
- Data insights and recommendations
- Smart CRM suggestions

**How We Use It**:
- Albedo AI assistant in CRM
- Natural language queries ("Show my top 5 deals")
- Lead scoring predictions
- Next action suggestions
- Email composition assistance

**Configuration**: `ANTHROPIC_API_KEY` in `.env`
**Documentation**: https://docs.anthropic.com

---

### 17. **OpenAI API**
**Purpose**: Alternative AI provider (GPT-4 integration)

**What It Does**:
- Natural language processing
- Text generation and completion
- Embeddings for semantic search
- Function calling for structured data

**How We Use It**:
- Fallback AI provider
- Embeddings for search
- Multi-provider AI strategy
- Cost optimization (cheapest provider per task)

**Configuration**: `OPENAI_API_KEY` in `.env`

---

### 18. **Multi-Provider AI Service**
**Purpose**: Intelligent AI routing layer

**What It Does**:
- Routes requests to best AI provider
- Fallback on provider failure
- Cost optimization
- Rate limit management
- Response caching

**How We Use It**:
- Automatic provider selection
- Resilient AI features
- Cost-effective AI operations

**Implementation**: `backend/core/ai/multi-provider-ai-service.ts`

---

## Testing & Quality

### 19. **Jest**
**Purpose**: JavaScript testing framework

**What It Does**:
- Unit testing
- Integration testing
- Test coverage reports
- Mocking and stubbing
- Snapshot testing

**How We Use It**:
- Test backend services
- Test React components
- Test API endpoints
- Verify business logic
- Regression testing

**Run Tests**:
```bash
npm test                      # Run all tests
npm test -- --coverage       # With coverage report
npm test -- --watch          # Watch mode
```

**Target**: 85%+ code coverage

---

### 20. **Supertest**
**Purpose**: HTTP testing library

**What It Does**:
- Test Express API endpoints
- Simulate HTTP requests
- Assert response status and body
- Test authentication flows

**How We Use It**:
- Integration tests for API
- Test endpoint security
- Validate response schemas

---

### 21. **React Testing Library**
**Purpose**: React component testing

**What It Does**:
- Test React components in isolation
- Simulate user interactions
- Assert rendered output
- Test accessibility

**How We Use It**:
- Test UI components
- Test user workflows
- Verify component behavior

---

### 22. **Playwright**
**Purpose**: End-to-end testing framework

**What It Does**:
- Test complete user workflows
- Browser automation
- Multi-browser testing (Chrome, Firefox, Safari)
- Screenshot and video recording

**How We Use It**:
- E2E test critical user journeys
- Test authentication flow end-to-end
- Verify UI/backend integration

**Run E2E Tests**:
```bash
npm run test:e2e
```

---

### 23. **ESLint**
**Purpose**: JavaScript/TypeScript linter

**What It Does**:
- Enforces code style rules
- Detects potential bugs
- Ensures TypeScript best practices
- Auto-fixes simple issues

**Configuration**: `.eslintrc.json`

**Run Linter**:
```bash
npm run lint                  # Check for issues
npm run lint:fix             # Auto-fix issues
```

---

### 24. **Prettier**
**Purpose**: Code formatter

**What It Does**:
- Consistent code formatting
- Auto-formats on save (VS Code)
- Enforces style guide
- Works with ESLint

**Configuration**: `.prettierrc`

---

### 25. **TypeScript 5.3**
**Purpose**: Type-safe JavaScript superset

**What It Does**:
- Static type checking
- Compile-time error detection
- IntelliSense in VS Code
- Refactoring support
- Interface definitions

**How We Use It**:
- All backend code in TypeScript
- All frontend code in TypeScript
- Type-safe API contracts
- Zero `any` types policy

**Type Check**:
```bash
npm run type-check
```

---

## System Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENTFORGE CRM v3.0                             │
│                    Complete System Architecture                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  DEVELOPMENT LAYER                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [VS Code] ──────────┐                                                  │
│  - Code editing      │                                                  │
│  - Debugging         │                                                  │
│  - Terminal          │                                                  │
│                      │                                                  │
│  [Git/GitKraken] ────┼──> Version Control                              │
│  - Commits           │                                                  │
│  - Branches          │                                                  │
│  - GitHub sync       │                                                  │
│                      │                                                  │
│  [Node.js v22.21.0] ─┘                                                  │
│  - Runtime                                                              │
│  - npm packages                                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Port 3001)                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [React 18 + Vite]                                                      │
│  ├─ UI Components (shadcn/ui, Tailwind CSS)                            │
│  ├─ State Management (Redux Toolkit, React Query)                      │
│  ├─ Routing (React Router)                                             │
│  └─ API Client (Axios)                                                 │
│                                                                          │
│  http://localhost:3001                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                          HTTP/REST API Calls
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  BACKEND (Port 3000)                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Express + TypeScript]                                                 │
│  ├─ API Routes (/api/v1/*)                                             │
│  ├─ Controllers (business logic)                                        │
│  ├─ Services (domain logic)                                            │
│  ├─ Repositories (data access)                                         │
│  └─ Middleware (auth, validation, logging)                             │
│                                                                          │
│  http://localhost:3000                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                      │              │              │
        ┌─────────────┘              │              └─────────────┐
        │                            │                            │
        ▼                            ▼                            ▼
┌──────────────────┐    ┌───────────────────────┐    ┌──────────────────┐
│  POSTGRESQL 15   │    │      REDIS 7          │    │   MONGODB 6      │
│  (Port 5432)     │    │    (Port 6379)        │    │  (Port 27017)    │
├──────────────────┤    ├───────────────────────┤    ├──────────────────┤
│                  │    │                       │    │                  │
│ 🗄️ Primary DB    │    │ ⚡ Cache & Sessions  │    │ 📝 Logs & Events │
│                  │    │                       │    │                  │
│ • tenants        │    │ • User sessions       │    │ • App logs       │
│ • users          │    │ • API cache           │    │ • Audit events   │
│ • contacts       │    │ • Rate limits         │    │ • Email content  │
│ • accounts       │    │ • Temp data           │    │ • Activity       │
│ • deals          │    │ • Pub/sub             │    │   streams        │
│ • tasks          │    │                       │    │ • Unstructured   │
│ • activities     │    │                       │    │   metadata       │
│ • tags           │    │                       │    │                  │
│ • notes          │    │                       │    │                  │
│ • notifications  │    │                       │    │                  │
│ • audit_logs     │    │                       │    │                  │
│ • custom_fields  │    │                       │    │                  │
│                  │    │                       │    │                  │
│ 👁️ View: DBeaver │    │ 👁️ View: Redis       │    │ 👁️ View: Compass │
│                  │    │    Commander          │    │                  │
│ 🐳 Docker        │    │ 🐳 Docker             │    │ 🐳 Docker        │
│    Container     │    │    Container          │    │    Container     │
│                  │    │                       │    │                  │
└──────────────────┘    └───────────────────────┘    └──────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  AI SERVICES                                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Multi-Provider AI Service]                                            │
│  ├─ Anthropic Claude SDK (Primary)                                     │
│  └─ OpenAI GPT-4 (Fallback)                                            │
│                                                                          │
│  Features:                                                              │
│  • Natural language queries                                             │
│  • Lead scoring predictions                                             │
│  • Next action suggestions                                              │
│  • Email composition                                                    │
│  • Smart routing (cost optimization)                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  TESTING & QUALITY LAYER                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Jest] ─────────────> Unit Tests (60% of test suite)                  │
│  [Supertest] ────────> Integration Tests (30% of test suite)           │
│  [Playwright] ───────> E2E Tests (10% of test suite)                   │
│  [ESLint] ───────────> Code Quality                                    │
│  [Prettier] ─────────> Code Formatting                                 │
│  [TypeScript] ───────> Type Safety                                     │
│                                                                          │
│  Target: 85%+ Coverage                                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  API TESTING LAYER                                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Postman] ──────────> 40+ Pre-configured API Requests                 │
│  ├─ Health Check                                                        │
│  ├─ Authentication (Login/Logout)                                       │
│  ├─ Contacts (CRUD)                                                     │
│  ├─ Accounts (CRUD)                                                     │
│  ├─ Deals (CRUD)                                                        │
│  ├─ Tasks (CRUD)                                                        │
│  ├─ AI Chat (Albedo)                                                    │
│  └─ Tags & Metadata                                                     │
│                                                                          │
│  Collection: postman_collection.json                                    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  INFRASTRUCTURE AUTOMATION                                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [Docker Desktop] ────> Container Platform                              │
│  [Docker Compose] ────> Multi-container Orchestration                   │
│                                                                          │
│  [PowerShell Scripts]                                                   │
│  ├─ start-dev.ps1 ─────> Start all services                            │
│  ├─ run-migrations.ps1 ─> Run database migrations                      │
│  ├─ reset-dev-env.ps1 ──> Nuclear reset (deletes data)                │
│  └─ open-gitkraken.ps1 ─> Launch GitKraken                             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  PRODUCTION DEPLOYMENT                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  [GitHub] ────────────> Source Repository                               │
│  [Render.com] ────────> Production Hosting                              │
│                                                                          │
│  Production URL: https://clientforge-crm.onrender.com                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Tool Integration Flows

### 1. **Development Workflow**

```
Developer
    │
    ├──> Opens VS Code
    │       │
    │       ├──> Edits backend/frontend code
    │       ├──> Runs npm scripts in terminal
    │       └──> Uses Git extension for commits
    │
    ├──> Runs start-dev.ps1
    │       │
    │       └──> Docker Compose starts:
    │               ├──> PostgreSQL container (port 5432)
    │               ├──> Redis container (port 6379)
    │               └──> MongoDB container (port 27017)
    │
    ├──> Starts Backend (npm run dev:backend)
    │       │
    │       └──> Express server on port 3000
    │               ├──> Connects to PostgreSQL
    │               ├──> Connects to Redis
    │               ├──> Connects to MongoDB
    │               └──> Initializes AI services
    │
    ├──> Starts Frontend (npm run dev)
    │       │
    │       └──> Vite server on port 3001
    │               └──> Makes API calls to port 3000
    │
    └──> Opens Browser
            │
            └──> http://localhost:3001
                    └──> User interacts with CRM
```

### 2. **Database Workflow**

```
Developer
    │
    ├──> Writes SQL migration
    │       │
    │       └──> backend/database/migrations/###_name.sql
    │
    ├──> Runs run-migrations.ps1
    │       │
    │       └──> Docker Compose exec
    │               └──> PostgreSQL applies migration
    │                       ├──> Creates/modifies tables
    │                       ├──> Adds indexes
    │                       └──> Seeds data
    │
    ├──> Opens DBeaver
    │       │
    │       └──> Connects to localhost:5432
    │               ├──> Browse tables
    │               ├──> Run queries
    │               └──> Verify schema
    │
    └──> Backend connects
            │
            └──> Node.js pg library
                    └──> Connection pool (min: 2, max: 10)
```

### 3. **API Testing Workflow**

```
Developer
    │
    ├──> Opens Postman
    │       │
    │       ├──> Imports postman_collection.json
    │       │
    │       ├──> Sends: POST /api/v1/auth/login
    │       │       │
    │       │       └──> Response includes accessToken
    │       │               └──> Auto-saved to collection variable
    │       │
    │       └──> Sends: GET /api/v1/contacts
    │               │
    │               └──> Uses saved token in Authorization header
    │                       └──> Returns contact list
    │
    └──> Backend processes request
            │
            ├──> Middleware validates JWT token
            ├──> Controller handles business logic
            ├──> Service applies domain rules
            ├──> Repository queries PostgreSQL
            └──> Response sent back to Postman
```

### 4. **Version Control Workflow**

```
Developer
    │
    ├──> Makes code changes in VS Code
    │       │
    │       └──> File watcher shows changes
    │
    ├──> Option A: Command-line Git
    │       │
    │       ├──> git status
    │       ├──> git add .
    │       ├──> git commit -m "message"
    │       └──> git push origin main
    │
    └──> Option B: GitKraken (Visual)
            │
            ├──> Runs: .\open-gitkraken.ps1
            │       │
            │       └──> GitKraken opens with repo loaded
            │
            ├──> Stage changes (drag-and-drop)
            ├──> Write commit message
            ├──> Commit to branch
            └──> Push to GitHub
                    │
                    └──> GitHub receives changes
                            │
                            └──> Render.com detects push
                                    └──> Auto-deploys to production
```

### 5. **Testing Workflow**

```
Developer
    │
    ├──> Writes feature code
    │
    ├──> Writes tests
    │       │
    │       ├──> Unit tests (Jest)
    │       │       └──> tests/unit/**/*.test.ts
    │       │
    │       ├──> Integration tests (Supertest)
    │       │       └──> tests/integration/**/*.test.ts
    │       │
    │       └──> E2E tests (Playwright)
    │               └──> tests/e2e/**/*.spec.ts
    │
    ├──> Runs: npm test
    │       │
    │       └──> Jest runs all tests
    │               ├──> Coverage report generated
    │               └──> Target: 85%+ coverage
    │
    ├──> Runs: npm run lint
    │       │
    │       └──> ESLint checks code quality
    │               └──> Prettier formats code
    │
    └──> Runs: npm run type-check
            │
            └──> TypeScript validates types
                    └──> No 'any' types allowed
```

### 6. **AI Integration Workflow**

```
User in CRM
    │
    └──> Asks Albedo: "Show me my top 5 deals"
            │
            └──> Frontend sends: POST /api/v1/ai/chat
                    │
                    └──> Backend Multi-Provider AI Service
                            │
                            ├──> Checks: Claude API available?
                            │       ├──> YES: Routes to Claude SDK
                            │       └──> NO: Falls back to OpenAI
                            │
                            ├──> Enriches prompt with user context
                            │       └──> Queries PostgreSQL for user data
                            │
                            ├──> Sends to AI provider
                            │       └──> Receives natural language response
                            │
                            ├──> Caches response in Redis
                            │       └──> For faster repeat queries
                            │
                            └──> Returns formatted response
                                    │
                                    └──> Frontend displays to user
```

---

## Quick Reference

### Local Development URLs

| Service | URL | Purpose |
|---------|-----|---------|
| Frontend | http://localhost:3001 | React application |
| Backend API | http://localhost:3000 | Express server |
| Health Check | http://localhost:3000/api/v1/health | Server status |
| PostgreSQL | localhost:5432 | Primary database |
| Redis | localhost:6379 | Cache/sessions |
| MongoDB | localhost:27017 | Logs/events |
| Redis Commander | http://localhost:8081 | Redis GUI (after running `redis-commander`) |

---

### Essential Commands

```bash
# Start Environment
.\start-dev.ps1                       # Start all database containers

# Backend
cd d:\clientforge-crm
npm run dev:backend                   # Start backend server (port 3000)

# Frontend
cd d:\clientforge-crm\frontend
npm run dev                           # Start frontend server (port 3001)

# Database
.\run-migrations.ps1                  # Run database migrations
docker compose exec postgres psql -U crm -d clientforge  # Access PostgreSQL CLI

# Testing
npm test                              # Run all tests
npm test -- --coverage               # With coverage report
npm run lint                          # Check code quality
npm run type-check                    # TypeScript validation

# Docker Management
docker compose ps                     # Check container status
docker compose logs -f                # View all logs
docker compose logs -f postgres      # View specific service logs
docker compose restart                # Restart all containers
docker compose down                   # Stop all containers
.\reset-dev-env.ps1                   # Nuclear reset (deletes data!)

# Version Control
git status                            # Check changes
git add .                             # Stage all changes
git commit -m "message"              # Commit with message
git push origin main                  # Push to GitHub
.\open-gitkraken.ps1                  # Launch GitKraken GUI

# Tools
redis-commander                       # Start Redis web GUI (port 8081)
```

---

### Database Credentials

**PostgreSQL**:
```
Host: localhost
Port: 5432
Database: clientforge
User: crm
Password: password
```

**MongoDB**:
```
Host: localhost
Port: 27017
Database: clientforge_logs
User: crm
Password: password
Connection String: mongodb://crm:password@localhost:27017
```

**Redis**:
```
Host: localhost
Port: 6379
Password: (none)
```

**Default Admin User**:
```
Email: admin@clientforge.com
Password: admin123
Tenant ID: 00000000-0000-0000-0000-000000000001
```

---

### Tool Locations

| Tool | Location |
|------|----------|
| VS Code | System-wide installation |
| Node.js | `C:\Program Files\nodejs\` |
| GitKraken | `C:\Program Files\GitKraken\GitKraken.exe` |
| DBeaver | `C:\Program Files\DBeaver` |
| Postman | `C:\Users\ScrollForge\AppData\Local\Postman` |
| Docker Desktop | System tray / Start Menu |

---

### Documentation

| Document | Location | Purpose |
|----------|----------|---------|
| Quick Start | `QUICKSTART.md` | 5-minute setup guide |
| Docker Guide | `DOCKER_SETUP_GUIDE.md` | Complete Docker reference |
| README | `README.md` | Project overview & protocols |
| API Collection | `postman_collection.json` | 40+ API requests |
| Build Guide | `docs/BUILD_GUIDE_FOUNDATION.md` | Development roadmap |
| Changelog | `docs/07_CHANGELOG.md` | Version history |

---

## Summary

**Total Tools**: 25

**Categories**:
- Development Tools: 5 (VS Code, Node.js, Git, GitKraken, Postman)
- Database Systems: 6 (PostgreSQL, DBeaver, Redis, Redis Commander, MongoDB, Compass)
- Infrastructure: 4 (Docker Desktop, Docker Compose, PowerShell Scripts, Render)
- AI Services: 3 (Claude SDK, OpenAI, Multi-Provider Service)
- Testing & Quality: 7 (Jest, Supertest, React Testing Library, Playwright, ESLint, Prettier, TypeScript)

**All Tools Work Together** through Docker containers, API calls, and automation scripts to provide a complete, production-grade CRM development environment.

---

**Last Updated**: 2025-11-06
**Built with ❤️ for ClientForge CRM v3.0**
**Abstract Creatives LLC**
