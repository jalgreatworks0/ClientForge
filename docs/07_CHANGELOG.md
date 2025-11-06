# ClientForge CRM - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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
