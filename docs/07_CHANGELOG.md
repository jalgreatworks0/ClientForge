# ClientForge CRM - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Fixed - 2025-11-06 (Late Evening - Documentation System Reorganization)
- **Complete documentation system reorganization**
  - Moved 12 .md files from root to proper docs/ subdirectories
  - Restored 3-4 level folder structure compliance
  - Deleted 4 duplicate/backup files (CHANGELOG.md, CLAUDE.md.backup, tsconfig.json.backup, nul)
  - Fixed README.md project structure section (removed non-existent /ai directory)
  - Updated all CLAUDE.md references to docs/ai/CLAUDE.md

- **TypeScript configuration and type safety fixes**
  - Fixed tsconfig.json moduleResolution cascading errors
  - Centralized AuthRequest type definition in backend/middleware/auth.ts
  - Fixed 300+ type errors from duplicate AuthRequest definitions
  - Fixed AI service type import issues (enum value vs type imports)
  - Removed non-existent handleAsyncErrors export
  - Fixed frontend favicon path (favicon.svg → logo.png)

- **Render deployment configuration fixes**
  - Fixed render.yaml frontend service type (web → static)
  - Added React Router SPA routes configuration
  - Fixed frontend API URL handling for Render's host format
  - Updated Vite build configuration for production

### Added - 2025-11-06 (Late Evening - Documentation Completion)
- **Created 11 missing protocol files** (2,120+ lines of documentation):
  - docs/protocols/02_SECURITY.md - OWASP Top 10 security protocol (268 lines)
  - docs/protocols/03_TEST_COVERAGE.md - 85%+ test coverage protocol (365 lines)
  - docs/protocols/04_BREAKING_CHANGES.md - API evolution and deprecation (195 lines)
  - docs/protocols/05_API_CONTRACTS.md - REST API design patterns (97 lines)
  - docs/protocols/06_DATABASE_MIGRATIONS.md - Safe schema evolution (112 lines)
  - docs/protocols/08_CONTEXT_PRESERVATION.md - Session continuity (126 lines)
  - docs/protocols/09_PERFORMANCE.md - Performance budgets and optimization (141 lines)
  - docs/protocols/10_CODE_REVIEW.md - 9-point quality checklist (328 lines)
  - docs/protocols/11_REFACTORING.md - Code improvement patterns (152 lines)
  - docs/protocols/12_CONSISTENCY.md - Cross-module consistency (97 lines)
  - docs/protocols/13_TECHNICAL_DEBT.md - Debt prevention (114 lines)
  - docs/protocols/14_QUALITY_SCORING.md - Quality metrics 0-100 (125 lines)

- **New documentation directories**
  - docs/deployment/ - Deployment guides (RENDER_MCP_INSTRUCTIONS.txt, DEPLOY_FRONTEND_NOW.md)
  - All guides properly organized in docs/guides/
  - All AI documentation in docs/ai/

- **Windows development batch files**
  - start-backend.bat - Auto-start backend with dependency checks
  - start-frontend.bat - Auto-start frontend with dependency checks
  - start-all.bat - Launch both in separate windows
  - build-all.bat - Production build for both backend and frontend
  - install-all.bat - Install all npm dependencies

### Fixed - 2025-11-06 (Late Evening - Albedo AI Integration)
- **Critical fix: Albedo AI chat now fully functional**
  - Fixed database parameter placeholder conversion bug in `backend/utils/database.ts`
  - Updated Claude model version from deprecated `20240620` to current `20241022`
  - Fixed SQL query parameter conversion from SQLite style (?) to PostgreSQL style ($1, $2, etc.)
  - Enhanced error logging in AI controller for better debugging
  - Backend server stability improvements for AI service initialization

- **Render deployment configuration optimized**
  - Created backend-specific `tsconfig.json` for proper TypeScript compilation
  - Updated render.yaml build command to use `--legacy-peer-deps` flag
  - Fixed YAML validation errors (boolean values, duplicate keys, schema compliance)
  - Improved build process: `cd backend && npx tsc && npx tsc-alias`
  - Direct start command: `node dist/backend/index.js` (bypassing npm scripts)

### Added - 2025-11-06 (Evening Update)
- Render MCP Server integration for infrastructure management
- Complete tools and systems documentation (25 tools mapped)
- Render API key configuration in .env
- Claude Code MCP configuration for Render management
- Natural language Render infrastructure control
- **Enterprise-grade Albedo AI chat interface** - Complete UI overhaul:
  - ChatGPT/Claude-inspired professional design
  - Smooth fade-in animations and transitions
  - Glassmorphism effects with modern gradients
  - Enhanced quick action cards with icons (TrendingUp, Users, Sparkles, Zap)
  - Improved typography and spacing (Syne + Syne Mono fonts)
  - Animated avatar with rotating gradient border
  - Character counter on message input
  - Better error messaging and user feedback
  - Emerald/teal accent colors for AI branding
  - Premium floating button with shimmer effect
  - Larger chat window (480x700px)
  - 2x2 grid layout for quick actions
  - Animated typing indicator with 3 dots
  - "Online" status indicator with pulse animation

### Fixed - 2025-11-06 (Evening Update)
- Render deployment build failures (Husky git hooks issue)
- Build command updated to skip lifecycle scripts
- TypeScript compilation now runs directly via npx
- Production environment variables configured
- Deployment process fixed and redeployed

### Added - 2025-11-06 (Morning Update)
- Complete local development environment setup with Docker containers
- PostgreSQL database (port 5432) with 17 production tables
- Redis cache server (port 6379) for sessions and caching
- MongoDB (port 27017) for logs and unstructured data
- Database migration system with automated schema creation
- Default admin user seeded (admin@clientforge.com / admin123)
- PowerShell automation scripts:
  - `start-dev.ps1` - One-command environment startup
  - `run-migrations.ps1` - Database schema migration runner
  - `reset-dev-env.ps1` - Nuclear reset for fresh start
  - `open-gitkraken.ps1` - GitKraken launcher with repository path
- Development tools installed and configured:
  - DBeaver - PostgreSQL GUI client
  - Postman - API testing tool (with complete collection)
  - MongoDB Compass - MongoDB GUI
  - Redis Commander - Web-based Redis interface (npm global)
  - GitKraken - Git GUI (token configured in .env)
- Frontend development server running on port 3001 (Vite)
- Backend API server running on port 3000 (Express + TypeScript)
- Comprehensive documentation:
  - `QUICKSTART.md` - 5-minute quick start guide
  - `DOCKER_SETUP_GUIDE.md` - Complete Docker reference
  - `postman_collection.json` - 40+ pre-configured API requests
- Multi-tenant architecture with tenant isolation
- UUID-based primary keys across all tables
- Automatic `updated_at` triggers on all core tables
- Complete CRUD operations for contacts, accounts, deals, tasks
- AI endpoints configured (Albedo chat and suggestions)

### Changed - 2025-11-06
- Migrated from SQLite to PostgreSQL for production-grade database
- Updated backend connection configuration for Docker services
- Enhanced .env file with GitKraken authentication token
- Improved database schema with foreign keys and indexes

### Fixed - 2025-11-06
- Backend database connection handling (auto-reconnect to PostgreSQL)
- PowerShell script emoji encoding issues (user-corrected)
- Frontend server startup (must run from frontend/ directory)
- Multi-tenant login flow (requires tenantId parameter)

---

## [3.0.0] - 2025-11-05

### Added
- README optimization system (85% size reduction, single-read compatible)
- Two-tier documentation architecture (operational vs reference)
- Protocol library system in `docs/protocols/`
- AI assistant quick start guide (`docs/ai/QUICK_START_AI.md`)
- Auto-loading CLAUDE.md for instant context (< 100 lines)
- Session log system in `logs/session-logs/`
- MCP memory system research and implementation roadmap
- Token efficiency improvements (83% reduction in context loading)

### Changed
- README.md reduced from 4,977 to 736 lines
- Context loading time reduced from 5 minutes to 90 seconds
- Protocol documentation extracted to separate reference files
- File organization restructured for better maintainability

---

## Project Information

**Project**: ClientForge CRM v3.0
**Organization**: Abstract Creatives LLC
**Stack**: React 18 + Node.js + PostgreSQL + MongoDB + Redis + AI/ML
**Architecture**: Modular monolith with microservices migration path
**Status**: Active development, production-ready infrastructure

---

**Last Updated**: 2025-11-06
