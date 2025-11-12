# ClientForge CRM v3.0 - Verification & Runtime Health Procedures

**Report Date**: 2025-11-11  
**Purpose**: Commands and procedures to verify current system state  
**Audience**: DevOps, QA, Engineering leads

---

## PART 1: REPOSITORY DISCOVERY & STRUCTURE

### 1.1 Project Structure (4-Level Tree)

```bash
# View complete directory structure
tree -L 4 -I 'node_modules|dist|coverage' .

# Count directories/files
find . -type d -not -path '*/\.*' -not -path '*/node_modules/*' | wc -l
# Expected: 413+ directories

# List main workspaces
cat package.json | grep -A 10 '"workspaces"'
```

**Expected Output**:
```
"workspaces": [
  "packages/*",
  "frontend/apps/*",
  "backend",
  "ai/js-modules/*"
]
```

### 1.2 Key Configuration Files

```bash
# Verify configuration files exist
ls -la | grep -E "package.json|tsconfig.json|docker-compose.yml|Makefile"

# Check backend configuration
ls backend/config/

# Check frontend configuration
ls frontend/config/ 2>/dev/null || echo "Frontend config (optional)"
```

**Verify Files**:
- ✅ `package.json`: Yes
- ✅ `tsconfig.json`: Yes
- ✅ `docker-compose.yml`: Yes
- ✅ `backend/config/`: Yes
- ✅ `jest.config.js`: Yes
- ✅ `playwright.config.ts`: Yes

---

## PART 2: RUNTIME HEALTH CHECKS

### 2.1 Service Status (Docker)

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View service logs
docker-compose logs -f [service_name]
```

**Expected Services**:
| Service | Port | Status | Command |
|---------|------|--------|---------|
| postgres | 5432 | ✅ | `docker-compose logs postgres` |
| mongodb | 27017 | ✅ | `docker-compose logs mongodb` |
| redis | 6379 | ✅ | `docker-compose logs redis` |
| elasticsearch | 9200 | ✅ | `docker-compose logs elasticsearch` |
| rabbitmq | 5672/15672 | ✅ | `docker-compose logs rabbitmq` |
| prometheus | 9090 | ✅ | `docker-compose logs prometheus` |
| grafana | 3005 | ✅ | `docker-compose logs grafana` |

### 2.2 Database Health Checks

```bash
# PostgreSQL Connection Test
psql postgresql://crm:password@localhost:5432/clientforge -c "SELECT version();"

# Expected: PostgreSQL 15.x with pgvector

# MongoDB Connection Test
mongosh "mongodb://crm:password@localhost:27017/admin?authSource=admin" --eval "db.adminCommand({ping:1})"

# Expected: { "ok" : 1 }

# Redis Connection Test
redis-cli -h localhost ping

# Expected: PONG

# Elasticsearch Health
curl -s http://localhost:9200/_cluster/health | jq .

# Expected: "status": "green" or "yellow"
```

### 2.3 Backend Services Health

```bash
# Start backend dev server
npm run dev:backend

# Check health endpoint
curl http://localhost:3000/api/v1/health

# Expected Response:
{
  "status": "healthy",
  "timestamp": "2025-11-11T...",
  "uptime": 123.45,
  "modules": {
    "core": true,
    "auth": true,
    "contacts": true,
    "deals": true
  }
}

# Check modules
curl http://localhost:3000/api/v1/modules

# Check event bus stats
curl http://localhost:3000/api/v1/events/stats
```

### 2.4 Frontend Development Server

```bash
# Start frontend
npm run dev:frontend

# Expected: http://localhost:3001 loads without errors

# Check for build errors
npm run build

# Expected: No TypeScript errors, build succeeds
```

---

## PART 3: PRODUCTION READINESS VERIFIERS

### 3.1 Critical Path Items (Must Verify Before Go-Live)

#### Security Verification (P0 - CRITICAL)

```bash
# 1. Verify Row-Level Security (RLS) Policies
psql postgresql://crm:password@localhost:5432/clientforge << 'EOF'
-- Check if RLS is enabled
SELECT * FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;

-- Expected: All tables should show true

-- Verify RLS policies exist
SELECT * FROM pg_policies LIMIT 10;

-- Expected: 15+ policies (one per table)
EOF

# 2. Verify Database Encryption at Rest
psql postgresql://crm:password@localhost:5432/clientforge -c "\d pg_settings" | grep encryption

# 3. Verify Webhook Signature Verification
# Check source code for HMAC validation
grep -r "crypto.timingSafeEqual\|HMAC" backend/api/rest/v1/routes/webhook-routes.ts

# Expected: Signature verification code present
```

#### Infrastructure Verification (P0 - CRITICAL)

```bash
# 1. Verify Load Balancer Configuration
nginx -t

# Expected: configuration file test is successful

# 2. Verify Multiple App Instances
docker-compose ps | grep app

# Expected: 2+ app instances running

# 3. Verify Session Replication
redis-cli KEYS "*session*" | head -5

# 4. Verify Health Check Endpoint
for i in {1..5}; do curl -s http://localhost:3000/api/v1/health | jq .status; done

# Expected: All return "healthy"
```

#### CI/CD Verification (P0 - CRITICAL)

```bash
# 1. Verify GitHub Actions Workflows
ls -la .github/workflows/

# Expected: At least 3 workflow files
# - test.yml (runs tests)
# - build.yml (builds Docker image)
# - deploy.yml (deploys to staging/prod)

# 2. Verify Test Suite Runs
npm run test

# Expected: All tests pass (or show coverage report)

# 3. Verify Build Success
npm run build

# Expected: Build completes without errors
```

### 3.2 Database State Verification

```bash
# 1. Verify Schema Migrations Applied
psql postgresql://crm:password@localhost:5432/clientforge << 'EOF'
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;
EOF

# 2. Verify Table Count
psql postgresql://crm:password@localhost:5432/clientforge << 'EOF'
SELECT COUNT(*) as table_count FROM information_schema.tables 
WHERE table_schema = 'public';
EOF

# Expected: 15+ tables

# 3. Verify Indexes Created
psql postgresql://crm:password@localhost:5432/clientforge << 'EOF'
SELECT COUNT(*) as index_count FROM pg_indexes WHERE schemaname = 'public';
EOF

# Expected: 30+ indexes

# 4. Verify Data Types (pgvector)
psql postgresql://crm:password@localhost:5432/clientforge << 'EOF'
SELECT data_type FROM information_schema.columns 
WHERE column_name LIKE '%vector%' OR data_type = 'vector';
EOF

# Expected: vector type present (for embeddings)
```

### 3.3 API Functionality Verification

```bash
# Test Authentication Flow
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"master@clientforge.io","password":"Admin123"}')

TOKEN=$(echo $RESPONSE | jq -r '.data.token')

echo "Token: $TOKEN"

# Expected: Valid JWT token

# Test Protected Endpoint
curl -s -X GET http://localhost:3000/api/v1/contacts \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length'

# Expected: Array of contacts returned

# Test Multi-Tenant Isolation
curl -s -X GET http://localhost:3000/api/v1/contacts?tenant_id=wrong-id \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Expected: Error or empty array (not cross-tenant data)
```

### 3.4 Search Functionality Verification

```bash
# Test Elasticsearch Connection
curl -s http://localhost:9200/_cluster/health | jq '.status'

# Expected: "green" or "yellow"

# Test Search Indexes
curl -s http://localhost:9200/_cat/indices | grep -E "contacts|deals|accounts"

# Expected: At least 3 indices

# Test Search Query
curl -s -X GET "http://localhost:9200/contacts/_search?q=test" | jq '.hits.total'

# Expected: Numeric result (>0 if data exists)
```

### 3.5 Queue System Verification

```bash
# Check BullMQ Health
npm run queue:health

# Expected Output:
# ✅ Email sync queue: 0 jobs pending
# ✅ Elasticsearch indexing queue: 0 jobs pending
# ✅ Notification queue: 0 jobs pending
# ✅ All workers operational

# Check DLQ for Failed Jobs
redis-cli ZRANGE "bull:email-sync:failed" 0 -1

# Expected: Empty (no failed jobs)

# Test Queue Processing
npm run queue:inject-failure

# Expected: Failure injected, DLQ contains 1 job

# Check Prometheus Metrics
curl -s http://localhost:9090/api/v1/query?query=bullmq_queue_size | jq '.'
```

### 3.6 Monitoring & Observability Verification

```bash
# Prometheus Status
curl -s http://localhost:9090/-/healthy

# Expected: HTTP 200 OK

# Grafana Dashboards
curl -s http://localhost:3005/api/dashboards/home | jq '.title'

# Expected: Dashboard title returned

# Check Logs in MongoDB
mongosh "mongodb://crm:password@localhost:27017/clientforge?authSource=admin" << 'EOF'
db.app_logs.countDocuments()
db.app_logs.findOne()
EOF

# Expected: Logs present in collection
```

---

## PART 4: SECURITY & COMPLIANCE VERIFICATION

### 4.1 OWASP Top 10 Verification

```bash
# 1. A1: Broken Access Control
# Verify RBAC is enforced
grep -r "hasRole\|authorize\|checkPermission" backend/middleware/

# Expected: Authorization middleware present

# 2. A3: Injection Prevention
# Check for parameterized queries
grep -r "db.query.*\$[0-9]\|db.query.*\?" backend/services/ | head -5

# Expected: Parameterized query examples

# 3. A7: Authentication
# Verify password hashing
grep -r "bcrypt\|hash" backend/services/auth/

# Expected: bcrypt usage found

# 4. A10: SSRF Prevention
# Check for internal URL validation
grep -r "isValidUrl\|whitelist" backend/services/

# Expected: URL validation logic present
```

### 4.2 Secrets Management Verification

```bash
# 1. Verify no secrets in code
grep -r "password=\|API_KEY=\|secret=" backend/ --include="*.ts" --exclude-dir=node_modules

# Expected: Only in .env and config files (not source code)

# 2. Verify .env file exists
ls -la .env .env.example

# Expected: Both files present

# 3. Verify secrets encrypted
grep -r "crypto.encrypt\|AES" backend/services/auth/

# Expected: Encryption used for sensitive data
```

### 4.3 Audit Logging Verification

```bash
# Check MongoDB logs collection
mongosh "mongodb://crm:password@localhost:27017/clientforge?authSource=admin" << 'EOF'
db.app_logs.find({}, { timestamp: 1, level: 1 }).sort({ timestamp: -1 }).limit(10)
db.app_logs.countDocuments({ level: "error" })
db.app_logs.countDocuments({ level: "warn" })
EOF

# Expected: Logs present with timestamps

# Check TTL indexes
mongosh "mongodb://crm:password@localhost:27017/clientforge?authSource=admin" << 'EOF'
db.app_logs.getIndexes()
EOF

# Expected: TTL index present (expireAfterSeconds: 604800 for 7-day retention)
```

---

## PART 5: PERFORMANCE VERIFICATION

### 5.1 Database Performance

```bash
# 1. Enable Query Logging
psql postgresql://crm:password@localhost:5432/clientforge << 'EOF'
ALTER SYSTEM SET log_min_duration_statement = 100;
SELECT pg_reload_conf();
EOF

# 2. Find Slow Queries
psql postgresql://crm:password@localhost:5432/clientforge << 'EOF'
SELECT * FROM pg_stat_statements 
WHERE mean_exec_time > 100 
ORDER BY mean_exec_time DESC 
LIMIT 10;
EOF

# 3. Check Query Plans
EXPLAIN ANALYZE SELECT * FROM contacts LIMIT 100;

# Expected: <100ms execution time

# 4. Check Missing Indexes
psql postgresql://crm:password@localhost:5432/clientforge << 'EOF'
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public' AND correlation < 0.1
ORDER BY n_distinct DESC;
EOF
```

### 5.2 API Performance Testing

```bash
# 1. Load Test (Simple)
ab -n 1000 -c 100 http://localhost:3000/api/v1/contacts

# Expected: <200ms average response time

# 2. Load Test (Advanced)
npm run test:performance

# Expected: All metrics pass

# 3. Check Response Times
curl -s -w "@curl-format.txt" -o /dev/null http://localhost:3000/api/v1/contacts

# Create curl-format.txt:
echo '
    time_namelookup:  %{time_namelookup}\n
    time_connect:     %{time_connect}\n
    time_appconnect:  %{time_appconnect}\n
    time_pretransfer: %{time_pretransfer}\n
    time_redirect:    %{time_redirect}\n
    time_starttransfer: %{time_starttransfer}\n
    ────────────────────────\n
    time_total:       %{time_total}\n
' > curl-format.txt

# Expected: time_total < 200ms
```

### 5.3 Cache Efficiency

```bash
# 1. Check Redis Memory Usage
redis-cli INFO memory

# Expected: used_memory_human: <1GB for dev

# 2. Check Cache Hit Rate
redis-cli --stat

# Expected: hits > misses (>50% hit rate)

# 3. Session Count
redis-cli DBSIZE

# Expected: Growing sessions (not exploding)
```

---

## PART 6: TEST COVERAGE & QUALITY

### 6.1 Test Execution

```bash
# Run Full Test Suite
npm run test

# Expected: All tests pass

# Run Unit Tests Only
npm run test:unit

# Expected: Unit tests pass

# Run Integration Tests
npm run test:integration

# Expected: Integration tests pass

# View Coverage Report
npm run test -- --coverage

# Expected: Coverage summary displayed

# Coverage Thresholds
npm run test -- --coverage --coverageThreshold='{"global":{"branches":85,"functions":85,"lines":85,"statements":85}}'

# Expected: Coverage >= 85% on all metrics
```

### 6.2 Code Quality Checks

```bash
# TypeScript Type Checking
npm run typecheck

# Expected: 0 type errors

# Linting
npm run lint

# Expected: 0 lint errors

# Format Check
npm run format -- --check

# Expected: Code formatted correctly

# Security Audit
npm audit

# Expected: 0 critical vulnerabilities
```

### 6.3 Documentation Verification

```bash
# Check JSDoc Coverage
grep -r "@param\|@returns" backend/services/ | wc -l

# Expected: >100 documented functions

# Verify README Files
ls docs/*/README.md docs/README.md

# Expected: Main documentation present

# Check for TODOs
grep -r "TODO\|FIXME" backend/ --include="*.ts" | wc -l

# Expected: <20 TODOs (not excessive tech debt)
```

---

## PART 7: DEPLOYMENT VERIFICATION CHECKLIST

### Pre-Deployment Checklist (50+ items)

```bash
# Automated Pre-Deploy Verification
cat > ./scripts/pre-deploy-check.sh << 'EOF'
#!/bin/bash
set -e

echo "🔍 Running Pre-Deployment Checks..."

# 1. Git Status
echo "✓ Checking git status..."
[ -z "$(git status --porcelain)" ] || (echo "❌ Uncommitted changes" && exit 1)

# 2. Tests
echo "✓ Running tests..."
npm run test > /dev/null 2>&1 || (echo "❌ Tests failed" && exit 1)

# 3. Build
echo "✓ Building..."
npm run build > /dev/null 2>&1 || (echo "❌ Build failed" && exit 1)

# 4. Type Check
echo "✓ Type checking..."
npm run typecheck > /dev/null 2>&1 || (echo "❌ TypeScript errors" && exit 1)

# 5. Lint
echo "✓ Linting..."
npm run lint > /dev/null 2>&1 || (echo "❌ Lint errors" && exit 1)

# 6. Security Audit
echo "✓ Security audit..."
npm audit --audit-level=critical > /dev/null 2>&1 || (echo "❌ Security vulnerabilities" && exit 1)

# 7. Database Migrations
echo "✓ Database migrations..."
npm run db:migrate > /dev/null 2>&1 || (echo "❌ Migration failed" && exit 1)

# 8. API Health
echo "✓ API health check..."
curl -s http://localhost:3000/api/v1/health | jq .status | grep -q healthy || (echo "❌ API unhealthy" && exit 1)

# 9. Docker Build
echo "✓ Building Docker image..."
docker build . > /dev/null 2>&1 || (echo "❌ Docker build failed" && exit 1)

echo "✅ All pre-deployment checks passed!"
EOF

chmod +x ./scripts/pre-deploy-check.sh
./scripts/pre-deploy-check.sh
```

### Production Readiness Scorecard

```bash
# Generate Readiness Report
cat > ./scripts/readiness-report.sh << 'EOF'
#!/bin/bash

echo "📊 PRODUCTION READINESS SCORECARD"
echo "=================================="

scores=()

# Security (P0)
echo -n "🔒 Security Checks: "
if npm audit --audit-level=critical > /dev/null 2>&1; then
  echo "✅ 100%"
  scores+=(100)
else
  echo "❌ 0%"
  scores+=(0)
fi

# Performance (P0)
echo -n "⚡ Performance Tests: "
if npm run test:performance > /dev/null 2>&1; then
  echo "✅ 100%"
  scores+=(100)
else
  echo "⚠️  50% (setup needed)"
  scores+=(50)
fi

# Test Coverage (P0)
echo -n "🧪 Test Coverage: "
coverage=$(npm run test -- --coverage --silent 2>&1 | grep "Statements" | awk '{print $NF}' | cut -d'%' -f1)
echo "$coverage%"
scores+=("$coverage")

# CI/CD (P0)
echo -n "🔄 CI/CD Pipeline: "
if [ -d ".github/workflows" ] && [ "$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l)" -gt 0 ]; then
  echo "✅ 100%"
  scores+=(100)
else
  echo "❌ 0%"
  scores+=(0)
fi

# Monitoring (P0)
echo -n "📊 Monitoring Setup: "
if curl -s http://localhost:9090/-/healthy > /dev/null 2>&1; then
  echo "✅ 100%"
  scores+=(100)
else
  echo "❌ 0%"
  scores+=(0)
fi

# Calculate Average
total=0
for score in "${scores[@]}"; do
  total=$((total + score))
done
average=$((total / ${#scores[@]}))

echo "=================================="
echo "📈 Overall Readiness: $average%"
echo "=================================="

if [ "$average" -ge 80 ]; then
  echo "✅ PRODUCTION READY"
elif [ "$average" -ge 60 ]; then
  echo "⚠️  STAGING READY (needs work)"
else
  echo "❌ NOT READY (critical gaps)"
fi
EOF

chmod +x ./scripts/readiness-report.sh
./scripts/readiness-report.sh
```

---

## PART 8: MANUAL VERIFICATION PROCEDURES

### Production Deployment Dry-Run

```bash
# 1. Create Staging Clone
docker-compose -f docker-compose.staging.yml up -d

# 2. Run Full Test Suite on Staging
npm run test

# 3. Load Test Staging
ab -n 5000 -c 500 http://localhost:3001/api/v1/health

# 4. Verify Data Integrity
psql postgresql://crm:password@localhost:5432/clientforge -c "SELECT COUNT(*) FROM contacts;"

# 5. Verify Search Works
curl -s http://localhost:3000/api/v1/search?q=test | jq '.data | length'

# 6. Simulate Failover
docker stop clientforge_app_1
# Verify traffic routes to app_2

# 7. Verify Rollback
git checkout v3.0.0
docker-compose restart
```

---

## NEXT VERIFICATION STEPS

**Current Assessment Date**: 2025-11-11

### Immediate Verification (This Week)

```bash
# Run these commands to validate current state
docker-compose ps  # Verify all services running
npm run test  # Verify tests passing
npm run typecheck  # Verify no TypeScript errors
npm audit  # Verify no critical vulnerabilities
```

### Weekly Verification (Going Forward)

```bash
# Create scheduled weekly checks
0 1 * * 0 /home/user/clientforge-crm/scripts/readiness-report.sh >> /var/log/clientforge-readiness.log
```

---

**Verification Checklist Owner**: DevOps Lead  
**Last Verified**: 2025-11-11  
**Next Verification**: 2025-11-18  
**Verification Status**: ✅ SETUP COMPLETE
