# Fix Analytics 500 Errors - Quick Guide

**Issue:** Analytics endpoints returning 500 Internal Server Error

**Root Cause:** MongoDB and Elasticsearch are not running

---

## ✅ Immediate Fix - Make Services Optional

The backend is trying to connect to MongoDB and Elasticsearch but failing. The good news is **PostgreSQL is working**, so we just need to make MongoDB/Elasticsearch optional for analytics.

---

## Option 1: Start MongoDB and Elasticsearch (Full Fix)

### Start MongoDB:
```bash
# Windows - if MongoDB is installed
net start MongoDB

# Or using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Start Elasticsearch:
```bash
# Using Docker (recommended)
docker run -d -p 9200:9200 -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  --name elasticsearch \
  elasticsearch:8.11.0
```

### Verify:
```bash
# Check MongoDB
curl http://localhost:27017
# Should return: "It looks like you are trying to access MongoDB over HTTP on the native driver port."

# Check Elasticsearch
curl http://localhost:9200
# Should return JSON with cluster info
```

---

## Option 2: Disable MongoDB/Elasticsearch (Quick Fix)

If you don't need MongoDB and Elasticsearch right now, you can disable them:

### Update `.env`:
```bash
# Add these lines
DISABLE_MONGODB=true
DISABLE_ELASTICSEARCH=true
```

### Update `backend/index.ts`:
```typescript
async function startServer(): Promise<void> {
  try {
    logger.info('Starting ClientForge CRM server...')

    // Initialize MongoDB collections with indexes and TTL
    if (!process.env.DISABLE_MONGODB) {
      try {
        await initializeMongoCollections()
        logger.info('[OK] MongoDB collections initialized')
      } catch (error) {
        logger.warn('[WARNING] MongoDB initialization failed (non-critical):', error)
      }
    } else {
      logger.info('[SKIP] MongoDB disabled via DISABLE_MONGODB env var')
    }

    // Initialize Elasticsearch indexes
    if (!process.env.DISABLE_ELASTICSEARCH) {
      try {
        await initializeSearchIndexes()
        logger.info('[OK] Elasticsearch indexes initialized')
      } catch (error) {
        logger.warn('[WARNING] Elasticsearch initialization failed (non-critical):', error)
      }
    } else {
      logger.info('[SKIP] Elasticsearch disabled via DISABLE_ELASTICSEARCH env var')
    }

    const server = new Server()
    await server.start()

    logger.info('Server initialization complete')
  } catch (error) {
    logger.error('Failed to start server', { error })
    process.exit(1)
  }
}
```

---

## Option 3: Analytics Uses PostgreSQL Only (Recommended for Now)

The analytics endpoints should work with just PostgreSQL. Let me check if they're properly configured:

### Check Analytics Service:
Analytics should be using PostgreSQL, not MongoDB/Elasticsearch. If the analytics endpoints are still failing, it's likely a different issue.

### Test Analytics Endpoints:
```bash
# First, ensure backend is running
npm run dev:backend

# Then test endpoints (in another terminal)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/v1/analytics/dashboard
```

### Common Issues:
1. **Missing JWT Token** - Need to be logged in
2. **Missing Database Tables** - Run migrations
3. **Query Errors** - Check backend logs for SQL errors

---

## 🔍 Debugging Steps

### 1. Check Backend Logs:
The backend should now be running. Watch the console for any errors when you access analytics endpoints.

### 2. Run Database Migrations:
```bash
npm run db:migrate
```

This ensures all analytics tables exist.

### 3. Check PostgreSQL Connection:
```bash
# Test PostgreSQL connection
psql postgresql://crm:password@localhost:5432/clientforge

# List tables
\dt

# Check for analytics tables
\dt *analytics*
\dt *activities*
\dt *deals*
\dt *tasks*
```

### 4. Test Individual Analytics Queries:
```sql
-- Test activities query
SELECT COUNT(*) FROM activities WHERE tenant_id = 'your-tenant-id';

-- Test deals query
SELECT COUNT(*) FROM deals WHERE tenant_id = 'your-tenant-id';

-- Test tasks query
SELECT COUNT(*) FROM tasks WHERE tenant_id = 'your-tenant-id';
```

---

## 📊 Summary

**Your Current Status:**
- ✅ PostgreSQL: **WORKING**
- ❌ MongoDB: **NOT RUNNING** (non-critical for analytics)
- ❌ Elasticsearch: **NOT RUNNING** (non-critical for analytics)
- ✅ Backend Server: **RUNNING** on port 3000

**Recommended Action:**
1. **Ignore MongoDB/Elasticsearch warnings** - they're not critical
2. **Test analytics endpoints** with proper authentication
3. **Check backend logs** for actual analytics errors
4. **Run migrations** if needed

**The analytics endpoints should work with just PostgreSQL!**

---

## 🎯 Quick Test

```bash
# 1. Backend should already be running (you showed it's started)
# Check: http://localhost:3000/api/v1/health

# 2. Login to get JWT token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}'

# 3. Copy the token from response

# 4. Test analytics with token
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  http://localhost:3000/api/v1/analytics/dashboard
```

If this still returns 500, check the backend console for the actual error message - it will show the SQL error or whatever is failing.

---

**Next:** Once backend is running properly, we'll continue with Phase 2 (TypeScript Strict Mode).
