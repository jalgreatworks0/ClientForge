# ADR-0007: Docker-Safe Database Connections

**Status**: Accepted  
**Date**: 2025-11-12  
**Deciders**: Engineering Team, OverLord  
**Technical Story**: Docker-Safe Database Connections - Commit `6abec4a`

---

## Context

ClientForge-CRM runs in both local development and Docker containerized environments. Database connection configurations were using `localhost` as fallback values, which caused connection failures when running in Docker containers where databases are accessed via Docker service names (e.g., `redis`, `mongodb`, `postgres`).

### The Problem

**Before**: Hard-coded `localhost` fallbacks
```typescript
// ❌ Breaks in Docker
const redis = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',  // Fails in Docker
  port: 6379
});

const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/clientforge';
```

**Issues**:
1. **Docker Connection Failures**: Containers couldn't connect to database services
2. **Environment-Specific Logic**: Code had to detect runtime environment (Docker vs local)
3. **Inconsistent Behavior**: Same code worked locally but failed in containers
4. **Silent Failures**: Logger attempted MongoDB connection even when not configured
5. **Worker Issues**: BullMQ workers tried connecting to `localhost` Redis instead of Docker service

### Requirements

- Database connections must work in both local and Docker environments
- No hard-coded `localhost` fallbacks in production code
- Environment variables must be the single source of truth
- Graceful degradation for optional services (e.g., MongoDB logging)
- Clear error messages when required configuration is missing

---

## Decision

We will **eliminate all `localhost` fallback values** and rely exclusively on environment variables with Docker-aware defaults set in `docker-compose.yml`.

### Architecture Changes

```
OLD APPROACH (❌):
Code → Detect Runtime → if Docker { use service name } else { use localhost }

NEW APPROACH (✅):
docker-compose.yml → Set ENV vars with service names → Code reads ENV vars → Connect
```

### Key Principles

1. **Environment Variables as Single Source of Truth**: All connection strings come from environment variables
2. **Docker-First Configuration**: `docker-compose.yml` sets Docker service names as defaults
3. **Explicit Configuration Required**: Production environments must set all required URLs
4. **Optional Services Conditional**: Services like MongoDB logging only activate when explicitly configured
5. **Fail Fast**: Missing required configuration causes immediate errors, not silent failures

---

## Implementation Details

### 1. Redis Configuration

**File**: `config/database/redis-config.ts`

**Before**:
```typescript
import { RUNTIME_ENV } from '../runtime-env';

const redisUrl = RUNTIME_ENV.isDocker 
  ? process.env.REDIS_URL || 'redis://redis:6379'
  : process.env.REDIS_URL || 'redis://localhost:6379';
```

**After**:
```typescript
// No runtime detection - just use env var
const redisUrl = process.env.REDIS_URL;

export function getRedisClient(): Redis {
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }
  return new IORedis(redisUrl);
}
```

**docker-compose.yml**:
```yaml
backend:
  environment:
    - REDIS_URL=redis://redis:6379  # Docker service name
```

### 2. MongoDB Configuration

**File**: `config/database/mongodb-config.ts`

**Before**:
```typescript
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/clientforge';
```

**After**:
```typescript
// Docker-aware fallback
const mongoUrl = process.env.MONGODB_URI 
  || process.env.MONGODB_URL 
  || 'mongodb://mongodb:27017/clientforge';  // Docker service name default

export async function getMongoClient(): Promise<MongoClient> {
  if (!mongoUrl) {
    throw new Error('MONGODB_URI or MONGODB_URL required');
  }
  
  const client = new MongoClient(mongoUrl);
  await client.connect();
  return client;
}

export function getMongoDatabase(): Db {
  const client = getMongoClient();
  
  // Extract database name from connection string
  const dbName = new URL(mongoUrl).pathname.substring(1) || 'clientforge';
  return client.db(dbName);
}
```

**docker-compose.yml**:
```yaml
backend:
  environment:
    - MONGODB_URI=mongodb://mongodb:27017/clientforge  # Docker service name
  depends_on:
    - mongodb
```

### 3. Logger MongoDB Transport (Conditional)

**File**: `backend/utils/logging/logger.ts`

**Before**:
```typescript
// Always tried to connect to MongoDB
transports: [
  new MongoDB({
    db: process.env.MONGODB_URI || 'mongodb://localhost:27017/clientforge',
    collection: 'logs'
  })
]
```

**After**:
```typescript
const transports: winston.transport[] = [
  new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  new winston.transports.File({ filename: 'logs/combined.log' })
];

// Only add MongoDB if explicitly configured
if (process.env.MONGODB_URI || process.env.MONGODB_URL) {
  transports.push(
    new MongoDB({
      db: process.env.MONGODB_URI || process.env.MONGODB_URL,
      collection: 'logs',
      options: { useUnifiedTopology: true }
    })
  );
}

const logger = winston.createLogger({ transports });
```

**Benefit**: No connection attempts when MongoDB isn't available or needed.

### 4. BullMQ Workers (IORedis Connections)

**Files**: 
- `backend/workers/billing/invoice-generator.worker.ts`
- `backend/workers/billing/payment-retry.worker.ts`

**Before**:
```typescript
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',  // ❌ Breaks in Docker
  port: parseInt(process.env.REDIS_PORT || '6379')
});
```

**After**:
```typescript
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'redis',  // ✅ Docker service name
  port: parseInt(process.env.REDIS_PORT || '6379')
});
```

**Alternative (Better)**:
```typescript
// Use REDIS_URL instead of host/port
const connection = new IORedis(process.env.REDIS_URL || 'redis://redis:6379');
```

### 5. Docker Compose Configuration

**File**: `docker-compose.yml`

**Added Environment Variables**:
```yaml
services:
  backend:
    environment:
      # Database connections use Docker service names
      - REDIS_URL=redis://redis:6379
      - MONGODB_URI=mongodb://mongodb:27017/clientforge
      - DATABASE_URL=postgresql://postgres:5432/clientforge  # Future
    depends_on:
      - redis
      - mongodb
      - postgres  # Future

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"  # Expose to host for debugging

  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"  # Expose to host for debugging
```

---

## Consequences

### Positive

- **Works in All Environments**: Same configuration works locally, in Docker, and in production
- **Explicit Configuration**: Required services must be explicitly configured (fail fast)
- **No Runtime Detection**: Simpler code without environment detection logic
- **Optional Services**: MongoDB logging gracefully disabled when not configured
- **Debugging Friendly**: Services exposed to host for local database clients
- **Production Ready**: Clear separation between required and optional services

### Neutral

- **Environment Variable Dependency**: Requires proper `.env` or `docker-compose.yml` configuration
- **Docker Service Names**: Developers must understand Docker networking concepts
- **Migration Required**: Existing deployments need environment variable updates

### Negative (Mitigated)

- **Breaking Change**: Old `localhost` fallbacks no longer work
  - **Mitigation**: `docker-compose.yml` provides correct defaults
  - **Mitigation**: `.env.example` documents required variables
- **More Environment Variables**: More variables to configure
  - **Mitigation**: Docker Compose sets sensible defaults
  - **Mitigation**: Environment validator catches missing variables

---

## Environment Configuration

### Docker Environment (docker-compose.yml)

```yaml
backend:
  environment:
    # Required - Database connections
    - REDIS_URL=redis://redis:6379
    - DATABASE_URL=sqlite:./data/dev.db
    
    # Optional - MongoDB logging
    - MONGODB_URI=mongodb://mongodb:27017/clientforge
    
    # Optional - Elasticsearch search
    - ELASTICSEARCH_URL=http://elasticsearch:9200
```

### Local Development (.env)

```bash
# Required
REDIS_URL=redis://localhost:6379
DATABASE_URL=sqlite:./data/dev.db

# Optional (MongoDB logging)
MONGODB_URI=mongodb://localhost:27017/clientforge

# Optional (Elasticsearch search)
ELASTICSEARCH_URL=http://localhost:9200
```

### Production (Render.com / AWS / etc.)

```bash
# Required
REDIS_URL=redis://:password@prod-redis.example.com:6379
DATABASE_URL=postgresql://user:pass@prod-db.example.com:5432/clientforge

# Optional
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/clientforge
ELASTICSEARCH_URL=https://prod-es.example.com:9200
```

---

## Verification Results

### ✅ Connection Success Messages

**Before Fix**:
```
❌ Error: connect ECONNREFUSED 127.0.0.1:6379
❌ MongoDB connection failed: ECONNREFUSED localhost:27017
```

**After Fix**:
```
✅ AI Service: Redis cache connected
✅ MongoDB connected
ℹ️  MongoDB logging transport not configured (MONGODB_URI not set)
```

### ✅ Remaining Localhost References (Acceptable)

Only one legitimate localhost reference remains:

```typescript
// MinIO S3-compatible storage exposed to host
const minioEndpoint = process.env.MINIO_ENDPOINT || 'http://localhost:9000';
```

**Why this is OK**: MinIO is intentionally exposed to the host machine for file uploads from browsers and external tools.

### ✅ Docker Service Names in Use

All internal service connections now use Docker service names:
- Redis: `redis://redis:6379`
- MongoDB: `mongodb://mongodb:27017/clientforge`
- PostgreSQL (future): `postgresql://postgres:5432/clientforge`
- Elasticsearch: `http://elasticsearch:9200`

---

## Testing & Validation

### Docker Environment Test

```bash
# Start all services
docker compose up -d

# Check backend logs for connection success
docker compose logs backend | grep -E "(Redis|MongoDB) connected"

# Expected output:
# ✅ AI Service: Redis cache connected
# ✅ MongoDB connected

# Verify no localhost errors
docker compose logs backend | grep "ECONNREFUSED"
# Should return nothing
```

### Local Development Test

```bash
# Ensure Redis and MongoDB running locally
redis-cli ping  # Should return PONG
mongosh --eval "db.version()"  # Should return version

# Start backend
npm run dev:backend

# Check logs for connections
# Should see Redis and MongoDB connected messages
```

### Connection Failure Test (Missing Config)

```bash
# Remove REDIS_URL from environment
unset REDIS_URL

# Try to start backend
npm run dev:backend

# Expected error:
# ❌ Error: REDIS_URL environment variable is required
# Server exits with code 1
```

---

## Migration Guide

### For Developers

**Update your `.env` file**:
```bash
# OLD (.env)
REDIS_HOST=localhost
REDIS_PORT=6379

# NEW (.env)
REDIS_URL=redis://localhost:6379
```

**Update Docker Compose overrides** (if using `docker-compose.override.yml`):
```yaml
services:
  backend:
    environment:
      - REDIS_URL=redis://redis:6379
      - MONGODB_URI=mongodb://mongodb:27017/clientforge
```

### For Production Deployments

**Render.com / Heroku / etc.**:
1. Update environment variables in dashboard:
   - `REDIS_URL` → Full Redis connection string
   - `MONGODB_URI` → Full MongoDB connection string (if using MongoDB logging)
   - `DATABASE_URL` → Database connection string

2. Remove old variables:
   - `REDIS_HOST`
   - `REDIS_PORT`
   - `MONGODB_HOST`

3. Restart services

### Rollback Procedure

If issues arise, revert to commit before `6abec4a`:

```bash
git revert 6abec4a
docker compose down
docker compose up -d --build
```

---

## Future Enhancements

### 1. Connection Health Checks

Add startup health checks that validate all required connections:

```typescript
async function validateConnections(): Promise<void> {
  const checks = [
    { name: 'Redis', fn: () => redisClient.ping() },
    { name: 'MongoDB', fn: () => mongoClient.db().admin().ping() },
    { name: 'Database', fn: () => sequelize.authenticate() }
  ];

  for (const check of checks) {
    try {
      await check.fn();
      logger.info(`✅ ${check.name} connection healthy`);
    } catch (error) {
      logger.error(`❌ ${check.name} connection failed:`, error);
      process.exit(1);
    }
  }
}
```

### 2. Connection Pooling Configuration

Expose connection pool settings via environment variables:

```bash
REDIS_MAX_CONNECTIONS=50
MONGODB_POOL_SIZE=20
POSTGRES_POOL_MIN=5
POSTGRES_POOL_MAX=20
```

### 3. Automatic Retry Logic

Add retry logic with exponential backoff for transient connection failures:

```typescript
async function connectWithRetry(
  connectFn: () => Promise<void>,
  maxRetries = 5
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await connectFn();
      return;
    } catch (error) {
      const delay = Math.min(1000 * Math.pow(2, i), 10000);
      logger.warn(`Connection failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max connection retries exceeded');
}
```

---

## Alternatives Considered

### 1. Keep Runtime Environment Detection (Rejected)

**Approach**: Detect if running in Docker and choose connection strings accordingly

```typescript
const redisUrl = RUNTIME_ENV.isDocker 
  ? 'redis://redis:6379' 
  : 'redis://localhost:6379';
```

**Pros**:
- No configuration changes needed
- Works automatically

**Cons**:
- **Complex**: Extra layer of indirection
- **Fragile**: Detection can fail or be wrong
- **Testing**: Hard to test all environment combinations
- **Rejected**: Configuration should be explicit, not magical

### 2. Service Discovery (Rejected)

**Approach**: Use Consul/etcd for dynamic service discovery

**Pros**:
- Automatic service location
- Dynamic reconfiguration

**Cons**:
- **Overkill**: Too complex for current scale
- **Dependencies**: Requires additional infrastructure
- **Learning curve**: Team needs to learn service discovery
- **Rejected**: Environment variables are simpler and sufficient

### 3. Connection String Templates (Rejected)

**Approach**: Use templated connection strings with variable substitution

```bash
REDIS_URL_TEMPLATE=redis://${REDIS_HOST}:${REDIS_PORT}
```

**Pros**:
- Flexible configuration

**Cons**:
- **Complexity**: Need template parsing logic
- **Debugging**: Harder to see final connection string
- **Error-prone**: Easy to make substitution mistakes
- **Rejected**: Full URLs are clearer and standard

---

## References

- **Docker Networking**: [Docker Compose Networking Guide](https://docs.docker.com/compose/networking/)
- **IORedis Connection**: [IORedis Documentation](https://github.com/luin/ioredis)
- **MongoDB Connection Strings**: [MongoDB Connection String Format](https://www.mongodb.com/docs/manual/reference/connection-string/)
- **12-Factor App Config**: [The Twelve-Factor App: Config](https://12factor.net/config)
- **Related ADRs**:
  - [ADR-0004: Environment Validator](/docs/architecture/decisions/ADR-0004-environment-validator-secrets-manager.md)
  - [ADR-0005: Elasticsearch Sync Worker](/docs/architecture/decisions/ADR-0005-elasticsearch-sync-worker.md)

---

## Revision History

| Date | Action | Status |
|------|--------|--------|
| 2025-11-12 | Docker-safe connections implemented | ✅ Accepted |
| 2025-11-12 | Removed localhost fallbacks | ✅ Complete |
| 2025-11-12 | Updated docker-compose.yml | ✅ Tested |
| 2025-11-12 | Conditional MongoDB logging | ✅ Working |
| 2025-11-12 | Production deployment | ✅ Ready |
