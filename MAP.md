# ClientForge CRM Repository Map

**Generated:** 2025-11-11
**Total Repository Size:** ~1,940 MB
**Total Files:** 147,337

---

## Repository Overview

**Project:** ClientForge CRM - A comprehensive Customer Relationship Management system with AI integration, email capabilities, and advanced analytics.

**Total Disk Usage:** ~1,940 MB
**Total Directories:** 20 top-level
**Total Files:** 147,337
**Primary Languages:** TypeScript, JavaScript

---

## Complete Directory Summary Table

| Directory | Size (MB) | Files | Subdirs | Modified | Category |
|-----------|-----------|-------|---------|----------|----------|
| .git | 7.66 | 1,592 | 1 | 2025-11-10 23:00 | Version Control |
| .github | 0.03 | 6 | 1 | 2025-11-06 19:56 | CI/CD Config |
| .husky | 0.00 | 3 | 0 | 2025-11-05 16:06 | Dev Tools |
| agents | 185.46 | 20,407 | 12 | 2025-11-10 09:16 | Core Source |
| backend | 2.23 | 364 | 13 | 2025-11-10 23:50 | Core Source |
| config | 0.09 | 51 | 8 | 2025-11-10 23:52 | Configuration |
| coverage | 15.31 | 544 | 12 | 2025-11-10 17:50 | Test Reports |
| database | 0.23 | 30 | 2 | 2025-11-10 23:52 | Data & Schema |
| deployment | 0.02 | 11 | 2 | 2025-11-10 23:52 | Infrastructure |
| docs | 1.83 | 181 | 22 | 2025-11-11 00:05 | Documentation |
| frontend | 404.35 | 50,077 | 7 | 2025-11-10 23:50 | Core Source |
| infrastructure | 0.01 | 4 | 1 | 2025-11-10 20:06 | Infrastructure |
| integrations | 0.00 | 45 | 7 | 2025-11-05 10:51 | Integration |
| logs | 4.23 | 37 | 2 | 2025-11-10 17:06 | Logs |
| node_modules | 1,316.39 | 74,860 | 864 | 2025-11-10 21:32 | Dependencies |
| packages | 0.00 | 15 | 1 | 2025-11-05 10:51 | Monorepo |
| scripts | 0.47 | 99 | 22 | 2025-11-10 23:52 | Dev Tools |
| storage | 0.00 | 4 | 4 | 2025-11-10 22:39 | Storage |
| tests | 0.29 | 81 | 11 | 2025-11-10 23:52 | Testing |
| tools | 1.53 | 78 | 2 | 2025-11-10 09:16 | Dev Tools |

**Total: 1,940.25 MB | 147,337 files | 20 directories**

---

## Directory Categories by Type

### Core Source Code (592.04 MB, 50,748 items)

**backend/** (2.23 MB, 364 items, 13 subdirs)
- Express.js REST API and business logic
- Services: authentication, billing, email, contacts, deals, analytics, AI
- Compiled dist: 0.61 MB

**frontend/** (404.35 MB, 50,077 items, 7 subdirs)
- React SPA with TypeScript
- Pages: Accounts, Contacts, Deals, Emails, Tasks, Analytics, Dashboard
- Dependencies: 401.96 MB node_modules

**agents/** (185.46 MB, 20,407 items, 12 subdirs)
- AI orchestration systems
- Elaria Command Center: 74.66 MB
- MCP Server: 92 MB
- Integrations: LangChain, LlamaIndex, Ollama

### Configuration & Infrastructure (0.14 MB)

**config/** (0.09 MB, 51 items, 8 subdirs)
- database, security, monitoring, queue configurations

**deployment/** (0.02 MB, 11 items)
- Docker and monitoring setup

**.github/** (0.03 MB, 6 items)
- CI/CD workflows

**infrastructure/** (0.01 MB, 4 items)
- Nginx and cloud infrastructure

### Data & Documentation (2.06 MB)

**database/** (0.23 MB, 30 items)
- 17 migrations, 10 schemas

**docs/** (1.83 MB, 181 items, 22 subdirs)
- Comprehensive documentation

### Development & Testing (15.87 MB)

**tests/** (0.29 MB, 81 items)
- Unit, integration, e2e, performance, security tests

**coverage/** (15.31 MB, 544 items)
- Test coverage reports

**scripts/** (0.47 MB, 99 items, 22 subdirs)
- Database, deployment, development utilities

**tools/** (1.53 MB, 78 items)
- Input processing, UI extensions

### Dependencies (1,316.39 MB)

**node_modules/** (1,316.39 MB, 74,860 items)
- 400+ npm packages for React, Node.js, testing, utilities

### Version Control & Logs (11.89 MB)

**.git/** (7.66 MB, 1,592 items)
- Repository history and objects

**logs/** (4.23 MB, 37 items)
- Application logs and archives

### Integration & Storage (0.00 MB)

**integrations/** (0.00 MB, 45 items, 7 subdirs)
- AI services, payment, analytics, webhooks

**packages/** (0.00 MB, 15 items)
- Monorepo internal packages

**storage/** (0.00 MB, 4 items)
- Local file storage directories

---

## Backend Subdirectory Breakdown

| Subdirectory | Size | Items | Purpose |
|--------------|------|-------|---------|
| core | 0.5 MB | 60 | Business logic: accounts, contacts, deals, email, auth, analytics, tasks |
| services | 0.55 MB | 78 | Services: AI, billing, email, search, storage, notifications, monitoring |
| dist | 0.61 MB | 97 | Compiled JavaScript for production |
| api | 0.28 MB | 43 | REST API endpoints (v1) |
| middleware | 0.1 MB | 19 | Auth, security, rate limiting middleware |
| modules | 0.06 MB | 19 | Feature modules: auth, billing, notifications, compliance |
| utils | 0.05 MB | 16 | Utilities: logging, caching, errors, sanitization |
| config | 0.01 MB | 2 | Configuration: secrets, MFA |
| database | 0.01 MB | 5 | Database utilities: pool, migrations |
| workers | 0.02 MB | 4 | Background job workers |
| queues | 0.01 MB | 1 | Queue definitions |
| scripts | 0.01 MB | 3 | DB initialization |
| migrations | 0.01 MB | 1 | Migration tracking |

---

## Frontend Subdirectory Breakdown

| Subdirectory | Size | Items | Purpose |
|--------------|------|-------|---------|
| node_modules | 401.96 MB | 49,936 | npm dependencies (400+ packages) |
| src | 0.4 MB | 59 | React source: pages, components, services, hooks, store |
| packages | 0.08 MB | 43 | UI components, design system, shared logic |
| public | 1.55 MB | 1 | Static assets and images |
| components | 0.01 MB | 6 | Component modules |
| micro-frontends | 0 MB | 4 | Micro-frontend definitions |

---

## File Type Distribution

| Type | Count | Percentage | Purpose |
|------|-------|-----------|---------|
| .js | 62,200 | 42.2% | Compiled JavaScript and dependencies |
| .ts | 31,757 | 21.6% | TypeScript source code |
| .map | 15,388 | 10.4% | Source maps for debugging |
| .json | 4,511 | 3.1% | Configuration and package metadata |
| .md | 4,111 | 2.8% | Documentation files |
| .mjs | 2,935 | 2.0% | ES modules |
| [NO EXT] | 2,609 | 1.8% | Scripts and executables |
| .cjs | 2,449 | 1.7% | CommonJS modules |
| .cts | 1,870 | 1.3% | TypeScript CommonJS |
| .mts | 1,029 | 0.7% | TypeScript ES modules |
| .html | 492 | 0.3% | HTML templates |
| .yml | 369 | 0.3% | YAML configuration |
| .css | 225 | 0.2% | Stylesheets |
| .proto | 221 | 0.2% | Protocol buffers |
| .lua | 218 | 0.1% | Scripting language |
| .tsx | 217 | 0.1% | React TypeScript components |
| .ps1 | 210 | 0.1% | PowerShell scripts |
| Other | 2,726 | 1.9% | Various other files |

**Total: 147,337 files**

---

## Size Breakdown by Category

- node_modules: 1,316.39 MB (67.8%)
- Agents: 185.46 MB (9.6%)
- Frontend: 404.35 MB (20.8%, including node_modules)
- Backend: 2.23 MB (0.1%)
- Documentation: 1.83 MB (0.1%)
- Coverage: 15.31 MB (0.8%)
- Logs: 4.23 MB (0.2%)
- Git: 7.66 MB (0.4%)
- Other: 3.08 MB (0.2%)

---

## Technology Stack

### Frontend: React 18+, TypeScript, Vite, Tailwind CSS
### Backend: Express.js, PostgreSQL, TypeScript
### AI: MCP Protocol, LangChain, Claude API, OpenAI
### DevOps: Docker, GitHub Actions, Prometheus, Grafana, Loki

---

**Generated:** 2025-11-11 00:15 UTC
**Status:** Active Development
**Last Activity:** 2025-11-10 23:50 UTC
