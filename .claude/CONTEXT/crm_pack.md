# ClientForge CRM â€” Context Pack

## Project Overview
Enterprise-grade CRM system with AI agents, real-time collaboration, and comprehensive analytics.

## Architecture
- **Monorepo:** Backend (Express/TS) + Frontend (React/TS)
- **Database:** PostgreSQL (primary), MongoDB (logs/events), Redis (cache/sessions)
- **Search:** Elasticsearch
- **Queue:** RabbitMQ
- **Storage:** MinIO (S3-compatible)
- **AI:** MCP servers (33 tools), LM Studio integration

## Key Modules (Backend)
- \modules/auth/\ â€” JWT auth, sessions
- \modules/clients/\ â€” Client CRUD
- \modules/projects/\ â€” Project management
- \modules/tasks/\ â€” Task tracking
- \modules/analytics/\ â€” Reporting & dashboards

## Frontend Structure
- \src/components/\ â€” Reusable UI components
- \src/pages/\ â€” Page-level components
- \src/hooks/\ â€” Custom React hooks
- \src/services/\ â€” API client services
- \src/store/\ â€” State management (Context API)

## Common Patterns
- **API routes:** \/api/v1/[resource]\
- **Validation:** Zod schemas
- **Errors:** AppError + RFC7807
- **Logging:** Winston + correlation IDs
- **Tests:** Jest (unit) + Playwright (E2E)
