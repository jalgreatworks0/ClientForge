# ClientForge CRM v3.0

<div align="center">

![ClientForge Logo](docs/assets/logo.png)

**Enterprise AI-Powered Customer Relationship Management Platform**

[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/abstractcreatives/clientforge)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com)
[![Status](https://img.shields.io/badge/status-production--ready-success.svg)]()

**A Product of [Abstract Creatives LLC](https://abstractcreatives.com)**

---

*Built for Scale. Powered by AI. Ready for Enterprise.*

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture) • [Contributing](#-contributing)

</div>

---

## 📋 Table of Contents

- [🤖 AI Session Protocol (START HERE)](#-ai-session-protocol-start-here)
- [Overview](#-overview)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [File Organization Rules](#-file-organization-rules)
- [Documentation System](#-documentation-system)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [AI Integration](#-ai-integration)
- [Security](#-security)
- [Monitoring](#-monitoring)
- [Contributing](#-contributing)
- [License](#-license)
- [Support](#-support)

---

## 🤖 AI Session Protocol (START HERE)

**FOR AI ASSISTANTS (Claude Code, GitHub Copilot, etc.):**

### 📖 Quick Start for AI

**At the start of EVERY session, read this file:**

```
AI_INSTRUCTIONS.md
```

**That's it!** That single file contains everything you need:
- ✅ Complete project overview and technology stack
- ✅ Session start protocol and required reading list
- ✅ File organization rules (CRITICAL - no loose files!)
- ✅ Documentation requirements and update triggers
- ✅ Step-by-step session workflow
- ✅ End-of-session protocol (reserve 10 minutes!)
- ✅ Common mistakes to avoid
- ✅ Pro tips and examples

**Human users**: Simply tell your AI assistant at the start of each session:
```
"Read AI_INSTRUCTIONS.md"
```

### 📋 Why This Works

The AI_INSTRUCTIONS.md file is designed as a **complete, standalone guide** that:
1. Provides full project context (so AI understands what ClientForge is)
2. Lists required documentation to read (CHANGELOG, MAP, session logs)
3. Explains all file organization rules (no guessing where files go)
4. Details the documentation update process (step-by-step)
5. Ensures continuity between sessions (AI knows where you left off)

### 🔗 Additional Resources

For detailed information about specific aspects:
- **[AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md)** - Complete AI guide (read this first!)
- **[AI_SESSION_QUICK_REFERENCE.md](AI_SESSION_QUICK_REFERENCE.md)** - Quick reference card
- **[DOCUMENTATION_SYSTEM.md](DOCUMENTATION_SYSTEM.md)** - Documentation system details
- **[HOW_TO_USE_AI_DOCUMENTATION_SYSTEM.md](HOW_TO_USE_AI_DOCUMENTATION_SYSTEM.md)** - User guide

---

## 🌟 Overview

**ClientForge CRM v3.0** is an enterprise-grade, AI-powered Customer Relationship Management system designed and developed by **Abstract Creatives LLC**. Built from the ground up to scale from startup to enterprise, ClientForge combines cutting-edge AI technology with robust architecture to deliver a world-class CRM experience.

### Why ClientForge?

- 🤖 **AI-Native Design** - Built with AI integration at every layer
- 📈 **Enterprise Scale** - Designed to handle millions of users
- 🔒 **Security First** - Zero-trust architecture with compliance built-in
- 🚀 **Production Ready** - Complete DevOps pipeline and monitoring
- 🎨 **Modern Stack** - Latest technologies and best practices
- 📊 **Real-time Analytics** - ML-powered insights and forecasting
- 🔌 **Extensible** - 50+ integrations and growing
- ☁️ **Multi-Cloud** - Deploy anywhere (AWS, Azure, GCP, on-premise)

### Built By Abstract Creatives LLC

ClientForge is proudly developed by **Abstract Creatives LLC**, a leader in enterprise software innovation. Our commitment to excellence, security, and scalability is reflected in every line of code.

---

## ✨ Features

### Core CRM Features
- **Contact Management** - Advanced contact and account management
- **Deal Pipeline** - Visual sales pipeline with drag-and-drop
- **Campaign Management** - Multi-channel marketing campaigns
- **Task & Calendar** - Integrated task management and scheduling
- **Document Management** - Secure file storage and sharing
- **Email Integration** - Gmail, Outlook, and SMTP support
- **Real-time Notifications** - WebSocket-powered live updates
- **Custom Fields** - Flexible data model for any industry
- **Advanced Reporting** - Customizable reports and dashboards
- **Team Collaboration** - Role-based access and team features

### AI-Powered Features (Albedo AI Companion)
- **Natural Language Interface** - Chat with your CRM
- **Lead Scoring** - ML-powered lead qualification
- **Sales Forecasting** - Predictive revenue analytics
- **Smart Recommendations** - Next-best action suggestions
- **Automated Workflows** - AI-driven process automation
- **Document Processing** - OCR and data extraction
- **Voice Commands** - Hands-free CRM operation
- **Sentiment Analysis** - Customer emotion tracking
- **Anomaly Detection** - Identify unusual patterns
- **Autonomous Agents** - AI agents for sales and support

### Enterprise Features
- **Multi-tenant Architecture** - SaaS-ready infrastructure
- **SSO Integration** - SAML, OAuth, LDAP support
- **Audit Logging** - Complete activity tracking
- **Data Import/Export** - Bulk operations and migrations
- **API Access** - REST, GraphQL, and WebSocket APIs
- **Webhook System** - Real-time event notifications
- **Custom Integrations** - Extensible integration framework
- **Mobile Apps** - Native iOS and Android applications
- **White-label Ready** - Customizable branding
- **High Availability** - Load balancing and failover

---

## 🚀 Quick Start

### Prerequisites

Ensure you have the following installed:

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Docker Desktop** (latest version)
- **Git** (latest version)
- **10GB+** free disk space

### Installation

```bash
# Clone the repository
git clone https://github.com/abstractcreatives/clientforge-crm.git
cd clientforge-crm

# Copy environment template
cp .env.example .env

# Install dependencies
make install
# or
npm ci

# Start Docker services
docker-compose up -d

# Initialize database
make db-migrate
make db-seed

# Start development server
make dev
```

### Access the Application

Once running, access ClientForge at:

- **Web Application**: http://localhost:3000
- **API Documentation**: http://localhost:3000/api/docs
- **GraphQL Playground**: http://localhost:3000/graphql
- **Admin Panel**: http://localhost:3001
- **AI Service**: http://localhost:5000

**Default Admin Credentials** (change immediately):
- Email: `admin@clientforge.com`
- Password: `Admin123!`

---

## 📁 Project Structure

ClientForge follows a strict, organized file structure designed for enterprise-scale development. The structure is optimized for AI understanding, maintainability, and scalability.

### Root Directory Overview

```
clientforge-crm/
├── 📁 .docker/                     # Docker configurations
├── 📁 .github/                     # GitHub workflows & templates
├── 📁 .husky/                      # Git hooks for code quality
├── 📁 .vscode/                     # VSCode workspace settings
├── 🤖 ai/                          # AI & ML systems (35+ folders)
├── 🔧 backend/                     # Backend services (50+ folders)
├── ⚙️  config/                     # Configuration management
├── 💾 database/                    # Database layer (20+ folders)
├── 🚀 deployment/                  # Deployment configs (30+ folders)
├── 📚 docs/                        # Documentation (25+ folders)
├── 🎨 frontend/                    # Frontend applications (35+ folders)
├── 🏗️  infrastructure/             # Infrastructure as Code
├── 🔌 integrations/                # Third-party integrations (30+ folders)
├── 📦 lib/                         # Shared libraries
├── 🔬 microservices/               # Microservices architecture
├── 📊 monitoring/                  # Monitoring & observability (18+ folders)
├── 📦 packages/                    # Monorepo packages (15+ folders)
├── 🔧 scripts/                     # Automation scripts (7+ folders)
├── 🔒 security/                    # Security configurations (17+ folders)
├── 🧪 tests/                       # Test suites (20+ folders)
├── 🛠️  tools/                      # Development tools
├── .dockerignore                   # Docker ignore patterns
├── .editorconfig                   # Editor configuration
├── .env.example                    # Environment variables template
├── .eslintrc.json                  # ESLint configuration
├── .gitignore                      # Git ignore patterns
├── .nvmrc                          # Node.js version
├── .prettierrc                     # Prettier configuration
├── AI_INSTRUCTIONS.md              # AI assistant instructions
├── AI_SESSION_QUICK_REFERENCE.md   # AI quick reference card
├── DIRECTORY_TREE.txt              # Visual directory tree
├── docker-compose.yml              # Docker Compose services
├── DOCUMENTATION_SYSTEM.md         # Documentation system guide
├── INSTALLATION_COMPLETE.md        # Installation summary
├── lerna.json                      # Lerna monorepo config
├── LICENSE                         # MIT License
├── Makefile                        # Build automation
├── package.json                    # NPM package definition
├── PROJECT_STRUCTURE_SUMMARY.md    # Project structure details
├── QUICKSTART.md                   # Quick start guide
├── README.md                       # This file (main documentation)
├── tsconfig.json                   # TypeScript configuration
└── turbo.json                      # Turborepo configuration
```

### Detailed Structure Map

For a complete map of all 413 directories and their purposes, see:
- **[DIRECTORY_TREE.txt](DIRECTORY_TREE.txt)** - Visual tree structure
- **[PROJECT_STRUCTURE_SUMMARY.md](PROJECT_STRUCTURE_SUMMARY.md)** - Detailed breakdown
- **[docs/00_MAP.md](docs/00_MAP.md)** - Complete file and folder map

### Statistics

| Component | Count | Description |
|-----------|-------|-------------|
| **Total Directories** | 413 | Organized into 21 main modules |
| **Main Modules** | 21 | Top-level functional areas |
| **AI System Folders** | 35+ | Machine learning and AI components |
| **Backend Folders** | 50+ | APIs, services, and business logic |
| **Frontend Folders** | 35+ | Web apps, mobile, and UI components |
| **Integration Folders** | 30+ | Third-party service connectors |
| **Test Folders** | 20+ | Unit, integration, E2E, performance tests |

---

## 📋 File Organization Rules

**CRITICAL: Maintaining a clean, organized structure is essential for project success and AI understanding.**

### Core Principles

1. **NO LOOSE FILES IN ROOT**
   - Only essential configuration files belong in the root directory
   - All other files MUST be organized into appropriate subdirectories
   - Never create temporary files in root

2. **Approved Root-Level Files ONLY**
   ```
   ALLOWED IN ROOT:
   ✅ .dockerignore, .editorconfig, .env.example, .eslintrc.json
   ✅ .gitignore, .nvmrc, .prettierrc
   ✅ docker-compose.yml, lerna.json, Makefile
   ✅ package.json, tsconfig.json, turbo.json
   ✅ LICENSE, README.md
   ✅ QUICKSTART.md, INSTALLATION_COMPLETE.md
   ✅ PROJECT_STRUCTURE_SUMMARY.md, DIRECTORY_TREE.txt

   ❌ NEVER in root: Source code, temporary files, logs, builds, data files
   ```

3. **File Placement Rules**
   - **Source code** → `backend/`, `frontend/`, or `ai/`
   - **Documentation** → `docs/` (see Documentation System below)
   - **Configuration** → `config/`
   - **Scripts** → `scripts/`
   - **Tests** → `tests/`
   - **Build artifacts** → `dist/` or `build/` (gitignored)
   - **Logs** → `logs/` (gitignored)
   - **Temporary files** → `tmp/` (gitignored)

4. **Naming Conventions**
   - **Directories**: `kebab-case` (e.g., `ai-systems/`, `user-management/`)
   - **Files**: `kebab-case.extension` (e.g., `user-service.ts`, `api-routes.js`)
   - **Components**: `PascalCase.tsx` (e.g., `UserProfile.tsx`)
   - **Classes**: `PascalCase` (e.g., `UserService`, `DatabaseManager`)
   - **Functions/Variables**: `camelCase` (e.g., `getUserById`, `totalCount`)
   - **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`, `API_BASE_URL`)
   - **Database**: `snake_case` (e.g., `user_profiles`, `contact_email`)

5. **Module Organization**
   - Each module should be self-contained
   - Follow the established patterns in existing modules
   - Keep related files together
   - Use index files for clean imports

### AI Assistant Guidelines

**For AI assistants working with this codebase:**

1. **ALWAYS check file location** before creating files
2. **NEVER create files in root** unless they match the approved list
3. **ALWAYS place files** in the appropriate subdirectory
4. **UPDATE documentation** when creating significant changes
5. **FOLLOW naming conventions** strictly
6. **MAINTAIN structure integrity** - don't create new root directories without approval
7. **CHECK LOGS SYSTEM** before ending sessions (see Documentation System below)

### Structure Enforcement

```bash
# Verify structure integrity
npm run check-structure

# Clean up loose files
npm run clean

# Validate file organization
npm run validate-structure
```

---

## 📚 Documentation System

ClientForge uses a hierarchical documentation system designed for clarity, accessibility, and AI understanding.

### Documentation Hierarchy

All documentation lives in the `docs/` directory with a specific naming convention:

#### Main Documentation (CAPITALIZED + NUMBERED)

Main documentation files are **CAPITALIZED** and **NUMBERED** to stay at the top of directory listings:

```
docs/
├── 00_MAP.md                       # Complete file/folder map (UPDATE REQUIRED)
├── 01_ARCHITECTURE.md              # System architecture overview (UPDATE REQUIRED)
├── 02_AI-SYSTEMS.md                # AI tools and systems guide (UPDATE REQUIRED)
├── 03_API.md                       # API documentation summary
├── 04_DEPLOYMENT.md                # Deployment guide summary
├── 05_SECURITY.md                  # Security overview
├── 06_DEVELOPMENT.md               # Development guide
├── 07_CHANGELOG.md                 # Version history and changes (UPDATE REQUIRED)
└── 08_TROUBLESHOOTING.md           # Common issues and solutions
```

#### Sub-Documentation (lowercase)

Detailed documentation in subdirectories uses **lowercase**:

```
docs/
├── architecture/
│   ├── decisions/                  # Architecture Decision Records (ADRs)
│   ├── diagrams/                   # System diagrams
│   └── patterns/                   # Design patterns
├── api/
│   ├── rest/                       # REST API details
│   ├── graphql/                    # GraphQL schema details
│   └── websocket/                  # WebSocket events
├── guides/
│   ├── user-manual/                # End-user documentation
│   ├── admin-guide/                # Administrator guide
│   ├── developer-guide/            # Developer onboarding
│   └── ai-features/                # AI feature documentation
└── modules/
    ├── contacts/                   # Contact module docs
    ├── deals/                      # Deal pipeline docs
    └── ai-companion/               # Albedo AI docs
```

### Documentation Update Requirements

**CRITICAL: Main documentation MUST be updated in the following scenarios:**

#### 1. **End of Major Update/Upgrade**
When completing significant features or system changes:
- ✅ Update `00_MAP.md` with new files/folders
- ✅ Update `01_ARCHITECTURE.md` if architecture changed
- ✅ Update `02_AI-SYSTEMS.md` if AI systems modified
- ✅ Update `07_CHANGELOG.md` with version details

#### 2. **When Creator Explicitly Requests**
If a human developer says "update docs" or similar:
- ✅ Update all relevant main documentation
- ✅ Update changelog with changes made
- ✅ Update any affected sub-documentation

#### 3. **Before Session End (AI Assistants)**
**IMPORTANT FOR CLAUDE CODE AND AI ASSISTANTS:**

Before ending a Claude Code session or completing work:
- ✅ **Reserve 5-10 minutes** for documentation updates
- ✅ Update `00_MAP.md` if any files/folders were added
- ✅ Update `07_CHANGELOG.md` with session summary
- ✅ Update relevant main docs if significant changes occurred
- ✅ Log session activities (see Logs System below)

#### 4. **Automatic Update Triggers**
- New module created → Update `00_MAP.md` and `01_ARCHITECTURE.md`
- New API endpoint → Update `03_API.md`
- New AI feature → Update `02_AI-SYSTEMS.md`
- Security change → Update `05_SECURITY.md`
- Deployment change → Update `04_DEPLOYMENT.md`

### Logs System

**Session and Activity Logging:**

All significant activities should be logged in:

```
logs/
├── session-logs/                   # AI assistant session logs
│   └── YYYY-MM-DD-session-name.md
├── development-logs/               # Development activity logs
│   └── YYYY-MM-feature-name.md
├── deployment-logs/                # Deployment logs
│   └── YYYY-MM-DD-environment.log
└── error-logs/                     # Error tracking
    └── YYYY-MM-DD-errors.log
```

#### Session Log Template

AI assistants should create session logs:

```markdown
# Session Log: [Date] - [Task Name]

**Date**: YYYY-MM-DD
**Duration**: [Start Time] - [End Time]
**AI Assistant**: Claude Code / [Other]
**Task**: Brief description

## Changes Made

### Files Created
- path/to/file.ts - Purpose

### Files Modified
- path/to/file.ts - Changes made

### Documentation Updated
- [ ] 00_MAP.md
- [ ] 01_ARCHITECTURE.md
- [ ] 02_AI-SYSTEMS.md
- [ ] 07_CHANGELOG.md

## Summary
Brief summary of work completed

## Next Steps
- Suggested next actions
```

### Documentation Best Practices

1. **Keep docs synchronized** with code changes
2. **Use clear, concise language** for AI understanding
3. **Include examples** where applicable
4. **Update immediately** when making changes
5. **Cross-reference** related documentation
6. **Maintain changelog** for version tracking
7. **Document decisions** in ADRs (Architecture Decision Records)

---

## 🏗️ Architecture

ClientForge is built on a modern, scalable architecture designed for enterprise needs.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Web App    │  │  Mobile App  │  │ Admin Panel  │     │
│  │   (React)    │  │ (iOS/Android)│  │   (React)    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────┐
│      API Gateway         │  │   WebSocket Server   │
│  (REST / GraphQL)        │  │   (Real-time)        │
└──────────────────────────┘  └──────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend Services Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Auth      │  │  Business   │  │   AI/ML     │        │
│  │  Service    │  │   Logic     │  │  Services   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Email     │  │   Search    │  │   Queue     │        │
│  │  Service    │  │  Service    │  │  Workers    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────┐
│   Data Persistence       │  │   External Services  │
│  ┌──────────────────┐    │  │  ┌────────────────┐ │
│  │   PostgreSQL     │    │  │  │  OpenAI API    │ │
│  │   (Primary DB)   │    │  │  │  Anthropic API │ │
│  ├──────────────────┤    │  │  │  Twilio        │ │
│  │   MongoDB        │    │  │  │  SendGrid      │ │
│  │   (Documents)    │    │  │  │  Stripe        │ │
│  ├──────────────────┤    │  │  └────────────────┘ │
│  │   Redis          │    │  └──────────────────────┘
│  │   (Cache)        │    │
│  ├──────────────────┤    │
│  │   Elasticsearch  │    │
│  │   (Search)       │    │
│  └──────────────────┘    │
└──────────────────────────┘
```

### Key Architectural Patterns

- **Microservices-Ready**: Modular design allowing future microservices extraction
- **Event-Driven**: RabbitMQ message queue for async operations
- **CQRS**: Command Query Responsibility Segregation for scalability
- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic separation
- **API Gateway**: Unified entry point for clients
- **Multi-tenant**: Isolated data per organization
- **Caching Strategy**: Multi-level caching (Redis, in-memory, CDN)

For detailed architecture documentation, see:
- **[docs/01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md)** - Complete architecture guide
- **[docs/architecture/](docs/architecture/)** - Architecture decisions and diagrams

---

## 🛠️ Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 18+ | UI framework |
| **TypeScript** | 5.3+ | Type safety |
| **Tailwind CSS** | 3+ | Styling |
| **Redux Toolkit** | 2+ | State management |
| **React Query** | 5+ | Server state management |
| **Socket.io Client** | 4+ | Real-time communication |
| **Vite** | 5+ | Build tool |
| **React Router** | 6+ | Routing |
| **Recharts** | 2+ | Data visualization |
| **Framer Motion** | 11+ | Animations |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | Runtime |
| **Express** | 4+ | Web framework |
| **TypeScript** | 5.3+ | Type safety |
| **PostgreSQL** | 15+ | Primary database |
| **MongoDB** | 6+ | Document storage |
| **Redis** | 7+ | Caching & sessions |
| **Elasticsearch** | 8+ | Search engine |
| **RabbitMQ** | 3+ | Message queue |
| **Socket.io** | 4+ | WebSocket server |
| **Sequelize** | 6+ | PostgreSQL ORM |
| **Mongoose** | 8+ | MongoDB ODM |

### AI/ML

| Technology | Purpose |
|------------|---------|
| **TensorFlow.js** | Machine learning models |
| **OpenAI API** | GPT-4, GPT-3.5 integration |
| **Anthropic Claude API** | Claude AI integration |
| **Hugging Face** | Transformer models |
| **Python** | ML training pipelines |
| **scikit-learn** | Classical ML algorithms |

### DevOps

| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Kubernetes** | Container orchestration |
| **Terraform** | Infrastructure as Code |
| **Ansible** | Configuration management |
| **GitHub Actions** | CI/CD pipelines |
| **Prometheus** | Metrics collection |
| **Grafana** | Metrics visualization |
| **ELK Stack** | Logging (Elasticsearch, Logstash, Kibana) |
| **Jaeger** | Distributed tracing |

### Testing

| Technology | Purpose |
|------------|---------|
| **Jest** | Unit testing |
| **Supertest** | API testing |
| **Cypress** | E2E testing |
| **Playwright** | E2E testing |
| **k6** | Load testing |
| **SonarQube** | Code quality |

---

## 💻 Development

### Development Environment Setup

```bash
# Install dependencies
make install

# Start development environment
make dev

# Start specific services
make dev-frontend    # Frontend only
make dev-backend     # Backend only
make dev-ai          # AI services only
```

### Available Commands

#### Development
```bash
make dev              # Start all services
make dev-frontend     # Start frontend
make dev-backend      # Start backend
make dev-ai           # Start AI services
make logs             # View application logs
```

#### Database
```bash
make db-migrate       # Run migrations
make db-rollback      # Rollback last migration
make db-seed          # Seed database
make db-reset         # Reset database
make backup           # Backup database
make restore          # Restore from backup
```

#### Code Quality
```bash
make lint             # Run linters
make format           # Format code
make type-check       # TypeScript type checking
make security-scan    # Run security audit
```

#### Testing
```bash
make test             # Run all tests
make test-unit        # Unit tests only
make test-integration # Integration tests
make test-e2e         # E2E tests
make test-ai          # AI model tests
```

#### Build & Deploy
```bash
make build            # Build for production
make docker-build     # Build Docker images
make deploy-dev       # Deploy to development
make deploy-staging   # Deploy to staging
make deploy-prod      # Deploy to production
```

For all available commands:
```bash
make help
```

### Coding Standards

ClientForge follows strict coding standards for consistency and quality. See [docs/06_DEVELOPMENT.md](docs/06_DEVELOPMENT.md) for complete guidelines.

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Application
NODE_ENV=development
APP_PORT=3000

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/clientforge
MONGODB_URI=mongodb://localhost:27017/clientforge
REDIS_URL=redis://localhost:6379

# AI Services
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here

# Security
JWT_SECRET=your-secret-here
ENCRYPTION_KEY=your-key-here
```

**Never commit `.env` files to Git!**

---

## 🧪 Testing

ClientForge maintains high test coverage across all layers. See [docs/06_DEVELOPMENT.md](docs/06_DEVELOPMENT.md) for testing guidelines.

### Test Coverage Requirements

| Layer | Required Coverage |
|-------|-------------------|
| Backend Services | 80%+ |
| Frontend Components | 75%+ |
| API Endpoints | 90%+ |
| AI Models | 85%+ |
| Overall | 80%+ |

---

## 🚀 Deployment

ClientForge supports multiple deployment strategies. See [docs/04_DEPLOYMENT.md](docs/04_DEPLOYMENT.md) for complete deployment guides.

### Deployment Options

1. **Docker Compose** (Development/Small Production)
2. **Kubernetes** (Production)
3. **Cloud Providers** (AWS, Azure, GCP)
4. **On-Premise** (Enterprise)

---

## 🤖 AI Integration

ClientForge features **Albedo**, an advanced AI companion integrated throughout the platform. See [docs/02_AI-SYSTEMS.md](docs/02_AI-SYSTEMS.md) for complete AI documentation.

### Albedo AI Capabilities

- Natural Language Processing
- Machine Learning (Lead Scoring, Sales Forecasting, Churn Prediction)
- Computer Vision (OCR, Document Extraction)
- Autonomous Agents (Sales, Support, Data Analysis)

---

## 🔒 Security

Security is a top priority in ClientForge CRM. See [docs/05_SECURITY.md](docs/05_SECURITY.md) for complete security documentation.

### Security Features

- ✅ JWT Authentication with MFA
- ✅ Role-Based Access Control (RBAC)
- ✅ End-to-End Encryption
- ✅ Security Scanning (SAST, DAST)
- ✅ Compliance Ready (GDPR, HIPAA, SOX, PCI-DSS)

---

## 📊 Monitoring

ClientForge includes comprehensive monitoring and observability. See [monitoring/](monitoring/) for configuration.

### Monitoring Stack

- **Metrics**: Prometheus + Grafana
- **Logging**: ELK Stack
- **Tracing**: Jaeger
- **Alerting**: Multi-channel notifications

---

## 🤝 Contributing

We welcome contributions to ClientForge CRM! See [docs/development/contributing/CONTRIBUTING.md](docs/development/contributing/CONTRIBUTING.md) for guidelines.

### How to Contribute

1. Fork the repository
2. Create a feature branch
3. Make your changes (follow coding standards, add tests, update docs)
4. Commit your changes (follow conventional commits)
5. Push to your branch
6. Create a Pull Request

---

## 📄 License

ClientForge CRM is released under the **MIT License**.

```
Copyright (c) 2025 Abstract Creatives LLC
```

See the [LICENSE](LICENSE) file for the full license text.

---

## 📞 Support

### Getting Help

- **Documentation**: [docs/](docs/)
- **Quick Start**: [QUICKSTART.md](QUICKSTART.md)
- **Troubleshooting**: [docs/08_TROUBLESHOOTING.md](docs/08_TROUBLESHOOTING.md)
- **Issues**: [GitHub Issues](https://github.com/abstractcreatives/clientforge/issues)
- **Discussions**: [GitHub Discussions](https://github.com/abstractcreatives/clientforge/discussions)

### Commercial Support

For enterprise support, training, and consulting:

**Abstract Creatives LLC**
- 🌐 Website: [https://abstractcreatives.com](https://abstractcreatives.com)
- 📧 Email: support@abstractcreatives.com
- 💼 Enterprise: enterprise@abstractcreatives.com

### Community

- **Discord**: [Join our Discord](https://discord.gg/clientforge)
- **Twitter**: [@ClientForgeCRM](https://twitter.com/clientforgecrm)
- **Blog**: [blog.clientforge.com](https://blog.clientforge.com)

---

## 🗺️ Roadmap

### Current Version: 3.0.0

See [docs/07_CHANGELOG.md](docs/07_CHANGELOG.md) for version history and [docs/ROADMAP.md](docs/ROADMAP.md) for future plans.

---

## 📈 Project Status

| Component | Status | Coverage | Performance |
|-----------|--------|----------|-------------|
| **Backend API** | ✅ Production | 85% | < 200ms |
| **Frontend Web** | ✅ Production | 80% | A+ Lighthouse |
| **Mobile Apps** | 🔄 Beta | 75% | Optimized |
| **AI Systems** | ✅ Production | 88% | < 500ms |
| **Documentation** | ✅ Complete | 100% | - |
| **Tests** | ✅ Complete | 82% | - |
| **Deployment** | ✅ Production | - | 99.9% uptime |

**Overall Status**: 🟢 **Production Ready**

---

<div align="center">

## 🚀 Start Building with ClientForge Today!

**Enterprise. AI-Powered. Production-Ready.**

[Get Started](QUICKSTART.md) • [View Docs](docs/) • [Report Bug](https://github.com/abstractcreatives/clientforge/issues) • [Request Feature](https://github.com/abstractcreatives/clientforge/issues)

---

### Built with ❤️ by Abstract Creatives LLC

**ClientForge CRM v3.0** - *The Future of Customer Relationship Management*

Copyright © 2025 Abstract Creatives LLC. All rights reserved.

---

[![Abstract Creatives LLC](https://img.shields.io/badge/Abstract%20Creatives-LLC-blue?style=for-the-badge)](https://abstractcreatives.com)
[![ClientForge](https://img.shields.io/badge/ClientForge-CRM-success?style=for-the-badge)](https://clientforge.com)

</div>
