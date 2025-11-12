# Database â€” Context Pack

## PostgreSQL (Primary Data)
**Connection:** \DATABASE_URL=postgresql://crm:password@localhost:5432/clientforge\

### Key Tables
- \users\ â€” User accounts
- \clients\ â€” Customer organizations
- \projects\ â€” Projects within clients
- \	asks\ â€” Task tracking
- \contacts\ â€” Contact info

### Migrations
- Location: \database/migrations/\
- Tool: Knex.js
- Command: \
pm run migrate:latest\

## MongoDB (Logs & Events)
**Connection:** \MONGODB_URI=mongodb://crm:password@localhost:27017/clientforge\

### Collections
- \udit_logs\ â€” User actions (90-day TTL)
- \error_logs\ â€” Application errors (30-day TTL)
- \event_logs\ â€” System events (30-day TTL)
- \ctivity_logs\ â€” Activity stream (30-day TTL)

## Redis (Cache & Sessions)
**Connection:** \REDIS_URL=redis://localhost:6379\

### Usage
- Session storage (24h TTL)
- API response caching (5-60min TTL)
- Rate limiting counters

### Key Patterns
- \session:[userId]\ â€” User sessions
- \cache:api:[endpoint]:[params]\ â€” API caches
