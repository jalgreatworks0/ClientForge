# Database Structure

This directory contains all database schemas, migrations, and initialization scripts for ClientForge CRM.

## Directory Structure

```
/database/
  /migrations/          # Production database migrations (source of truth)
  /schemas/             # Legacy initial setup files (Docker only)
    /postgresql/        # PostgreSQL schema files for docker-entrypoint-initdb.d
    /sqlite/           # SQLite schemas (experimental/testing)
```

## Migration Files

Migrations are numbered sequentially and should be run in order:

### Base Schema (001-002)
- **001_initial_schema.sql** - Core tables (users, roles, permissions, tenants)
- **002_performance_optimization.sql** - Indexes, triggers, materialized views

### Schema Files (003-007) - Included in 001
These numbers were reserved for the schema files that are now part of migration 001:
- 003: CRM core tables (contacts, accounts)
- 004: Deals & pipelines
- 005: Tasks & activities
- 006: Notes, tags, custom fields
- 007: Subscriptions & AI integration

### Feature Migrations (008+)
- **008_ai_features_tables.sql** - AI usage tracking and chat history
- **009_monitoring_schema.sql** - Performance monitoring and observability
- **010_files_table.sql** - File storage metadata and virus scanning
- **011_pgvector_embeddings.sql** - Vector embeddings for semantic search

## Running Migrations

### Development (Docker)
The `/schemas/postgresql/` files are automatically loaded by PostgreSQL's `docker-entrypoint-initdb.d` on first container creation.

```bash
docker-compose up postgres
```

### Production
Use the migration runner script:

```bash
npm run db:migrate
```

Or manually with psql:

```bash
psql -U your_user -d clientforge_crm -f database/migrations/001_initial_schema.sql
psql -U your_user -d clientforge_crm -f database/migrations/002_performance_optimization.sql
# ... continue with remaining migrations in order
```

## Creating New Migrations

1. Create a new file: `database/migrations/012_description.sql`
2. Follow the existing format with:
   - Header comment describing the migration
   - Idempotent operations (IF NOT EXISTS, IF EXISTS)
   - Status message at the end

Example:

```sql
/**
 * Feature Name Migration
 * Description of what this migration does
 * Created: YYYY-MM-DD
 */

-- Your SQL here

CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- columns...
);

SELECT 'My migration complete!' as status;
```

## Database Connection Code

The runtime database connection code is located in `/backend/database/postgresql/`:
- `pool.ts` - PostgreSQL connection pool configuration
- `query-tracker.ts` - Query performance tracking

## Important Notes

### Idempotency
All migrations should be idempotent (safe to run multiple times):
- Use `IF NOT EXISTS` for CREATE statements
- Use `IF EXISTS` for DROP statements
- Use `CREATE OR REPLACE` for functions/views

### Tenant Isolation
All tenant-scoped tables must:
- Include a `tenant_id UUID NOT NULL` column
- Have an index on `tenant_id`
- Enable Row Level Security (RLS)
- Have a tenant isolation policy

### Performance
- Create indexes AFTER bulk data loads
- Use `ANALYZE` after large data changes
- Monitor slow queries using the monitoring schema (migration 009)

## Schema Evolution Strategy

1. **Initial Setup** (Docker only): `/schemas/postgresql/` files
2. **Incremental Changes**: Add new migration files in `/migrations/`
3. **Production**: Run migrations in sequence order
4. **Rollback**: Create reverse migration if needed

## Deprecation Notice

The `/schemas/` directory is primarily for Docker's initial setup. New schema changes should always be added as migrations in `/migrations/`.

In the future, we may replace the schema-based Docker init with a migration runner to ensure consistency between development and production environments.
