# 🗄️ Database Migrations Protocol

**P2 RECOMMENDED**: Safe schema evolution

---

## Core Principle

**Never modify schema directly in production.** Always use migrations.

---

## Migration File Structure

```
backend/database/migrations/
├── 001_initial_schema.sql
├── 002_add_contact_tags.sql
├── 003_add_deal_pipeline.sql
└── 004_add_email_integration.sql
```

### Naming Convention
```
{number}_{description}.sql

001 - Initial schema
002 - Feature addition
003 - Index optimization
```

---

## Safe Migration Patterns

### Adding Column (Safe)
```sql
-- ✅ Add optional column
ALTER TABLE contacts
ADD COLUMN middle_name VARCHAR(100);

-- ✅ Add column with default
ALTER TABLE contacts
ADD COLUMN status VARCHAR(20) DEFAULT 'active' NOT NULL;
```

### Adding Index (Safe)
```sql
-- ✅ Add index concurrently (PostgreSQL)
CREATE INDEX CONCURRENTLY idx_contacts_email ON contacts(email);
```

### Adding Table (Safe)
```sql
-- ✅ New table
CREATE TABLE contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  tag_name VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Unsafe Patterns (Requires Downtime)

### Dropping Column (Breaking)
```sql
-- ❌ BREAKING: Drops data
ALTER TABLE contacts DROP COLUMN old_field;

-- ✅ Safe approach:
-- 1. Deploy code that doesn't use old_field
-- 2. Wait 1 week
-- 3. Run migration to drop column
```

### Renaming Column (Breaking)
```sql
-- ❌ BREAKING: Existing queries fail
ALTER TABLE contacts RENAME COLUMN name TO full_name;

-- ✅ Safe approach:
-- 1. Add new column
-- 2. Backfill data: UPDATE contacts SET full_name = name
-- 3. Deploy code using full_name
-- 4. Drop old column after 1 week
```

---

## Migration Checklist

- [ ] Migration is reversible (has DOWN script)
- [ ] Tested on copy of production data
- [ ] No table locks on large tables
- [ ] Indexes created CONCURRENTLY (PostgreSQL)
- [ ] Default values for NOT NULL columns
- [ ] Backup taken before running

---

## Running Migrations

```bash
# Development
npm run migrate:dev

# Production
npm run migrate:prod

# Rollback
npm run migrate:rollback
```
