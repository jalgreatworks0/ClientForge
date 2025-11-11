# Fix Later Checklist - Pre-Production Items

**Last Updated**: 2025-11-10
**Priority Levels**: 🔴 Critical | 🟡 High | 🟢 Medium | 🔵 Low

---

## 🔴 CRITICAL - Must Fix Before Production

### 1. Security Vulnerabilities
**Location**: Root package.json
**Issue**: 15 npm vulnerabilities (7 moderate, 6 high, 2 critical)
```bash
# Run this command:
cd d:/clientforge-crm
npm audit fix --force

# If issues persist:
npm audit
# Review each vulnerability and update dependencies manually
```

**Affected Packages**:
- puppeteer < 24.15.0 (deprecated, critical)
- request@2.88.2 (deprecated, used by taxjar)
- request-promise-native@1.0.9 (deprecated)
- har-validator@5.1.5 (no longer supported)
- uuid@3.4.0 (insecure random in old versions)

**Action Required**:
```bash
npm install puppeteer@latest  # Update to 24.15.0+
npm install uuid@latest       # Update to v7+
# Consider replacing taxjar if request dependency can't be resolved
```

---

### 2. Missing Environment Variables
**Location**: `.env` (needs to be created)
**Issue**: Production secrets not configured

**Required Variables**:
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/clientforge_prod
REDIS_URL=redis://localhost:6379

# Stripe (Billing)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# TaxJar (Sales Tax)
TAXJAR_API_KEY=xxxxx

# Sentry (APM)
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
SENTRY_ENVIRONMENT=production

# OpenTelemetry (Tracing)
OTLP_ENDPOINT=http://localhost:4318

# Email Service (Not yet implemented)
SENDGRID_API_KEY=xxxxx
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=xxxxx

# AWS S3 (File Storage - Not yet implemented)
AWS_ACCESS_KEY_ID=xxxxx
AWS_SECRET_ACCESS_KEY=xxxxx
AWS_REGION=us-east-1
AWS_S3_BUCKET=clientforge-uploads

# Application
NODE_ENV=production
PORT=3000
JWT_SECRET=xxxxx  # Generate with: openssl rand -base64 32
SESSION_SECRET=xxxxx  # Generate with: openssl rand -base64 32

# Frontend URL
FRONTEND_URL=https://app.clientforge.com
```

**Action Required**:
1. Create `.env.production` file
2. Generate secure secrets
3. Obtain API keys from third-party services
4. Configure in deployment environment (Docker, Kubernetes, etc.)

---

### 3. Database Migrations Not Run
**Location**: `database/migrations/`
**Issue**: Migrations created but not executed

**Migrations to Run** (in order):
1. `012_billing.sql` - Billing system tables
2. `013_api_keys.sql` - API key management
3. `014_gdpr_compliance.sql` - GDPR tables
4. `015_custom_fields.sql` - Custom fields system
5. `016_import_export.sql` - Import/export jobs

**Action Required**:
```bash
# Option 1: Use migration tool (if available)
npm run migrate

# Option 2: Run manually
psql -U postgres -d clientforge_prod -f database/migrations/012_billing.sql
psql -U postgres -d clientforge_prod -f database/migrations/013_api_keys.sql
psql -U postgres -d clientforge_prod -f database/migrations/014_gdpr_compliance.sql
psql -U postgres -d clientforge_prod -f database/migrations/015_custom_fields.sql
psql -U postgres -d clientforge_prod -f database/migrations/016_import_export.sql

# Option 3: Modules run migrations automatically on first startup
# Just ensure DATABASE_URL is configured
```

---

### 4. SSL/TLS Certificates Not Configured
**Location**: `infrastructure/nginx/ssl/`
**Issue**: Nginx expects SSL certs that don't exist

**Expected Files**:
- `/etc/nginx/ssl/fullchain.pem`
- `/etc/nginx/ssl/privkey.pem`
- `/etc/nginx/ssl/chain.pem`

**Action Required**:
```bash
# Option 1: Let's Encrypt (Recommended)
certbot certonly --webroot \
  -w /var/www/certbot \
  -d app.clientforge.com \
  --email admin@clientforge.com

# Option 2: Manual certificate
# Copy your SSL certificates to /etc/nginx/ssl/

# Option 3: Development only - Generate self-signed
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/privkey.pem \
  -out /etc/nginx/ssl/fullchain.pem
```

---

### 5. Missing Background Job Workers
**Location**: `backend/modules/billing/workers/`
**Issue**: BullMQ workers created but not started

**Workers to Start**:
1. Invoice Generation Worker
2. Payment Retry Worker
3. Subscription Renewal Worker
4. Failed Payment Processor
5. Import Job Worker
6. Export Job Worker

**Action Required**:
```bash
# Workers start automatically when modules initialize
# But ensure Redis is running:
docker run -d -p 6379:6379 redis:alpine

# Verify workers are running:
# Check logs for: "[BillingModule] Background workers started"
```

---

## 🟡 HIGH PRIORITY - Fix Soon

### 6. Email Service Not Implemented
**Location**: Not yet created
**Issue**: System references email but no email service exists

**Required For**:
- Password reset emails
- Invoice delivery
- Payment failure notifications
- GDPR request notifications
- Welcome emails

**Action Required**:
```typescript
// Create: backend/services/email/email.service.ts
// Integrate: SendGrid, AWS SES, or SMTP

// Example implementation needed:
class EmailService {
  async sendInvoice(email: string, invoicePdf: Buffer): Promise<void> {}
  async sendPasswordReset(email: string, token: string): Promise<void> {}
  async sendPaymentFailed(email: string, invoice: Invoice): Promise<void> {}
  async sendGDPRExportReady(email: string, downloadUrl: string): Promise<void> {}
}
```

**Files to Update**:
- `backend/modules/billing/services/invoice.service.ts:67` - Remove TODO, add email sending
- `backend/modules/billing/workers/retry-worker.ts` - Add email notifications
- `backend/services/compliance/gdpr.service.ts` - Add email on export complete

---

### 7. File Storage Not Configured
**Location**: Currently using local filesystem
**Issue**: Files stored in `storage/` - won't work in distributed systems

**Current Storage Locations**:
- `storage/invoices/` - PDF invoices
- `storage/gdpr-exports/` - GDPR data exports
- `storage/uploads/` - Import file uploads
- `storage/exports/` - Export files

**Action Required**:
```bash
# Option 1: AWS S3 (Recommended for production)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Create: backend/services/storage/s3.service.ts
# Update all file operations to use S3

# Option 2: Azure Blob Storage
npm install @azure/storage-blob

# Option 3: Google Cloud Storage
npm install @google-cloud/storage
```

**Files to Update**:
- `backend/modules/billing/services/invoice.service.ts`
- `backend/services/compliance/gdpr.service.ts`
- `backend/services/import-export/import.service.ts`
- `backend/services/import-export/export.service.ts`

---

### 8. API Rate Limiting Not Tested
**Location**: `infrastructure/nginx/nginx.conf`
**Issue**: Rate limits configured but not load tested

**Current Limits**:
- API: 100 req/s per IP
- Auth: 10 req/min per IP
- Webhooks: 50 req/s

**Action Required**:
```bash
# Load test with k6
k6 run tests/performance/api-load-test.js

# Adjust limits in nginx.conf based on results:
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=100r/s;

# Monitor in production and adjust
```

---

### 9. Custom Fields Validation Missing
**Location**: `backend/services/custom-fields/custom-field.service.ts`
**Issue**: Basic validation exists, but advanced validation missing

**Missing Validations**:
- Phone number format validation
- URL protocol validation (http/https)
- Email domain validation
- Currency format validation
- Min/max values for numbers
- String length limits for text fields
- Date range validation

**Action Required**:
```typescript
// Enhance validateFieldValue() in custom-field.service.ts
// Add regex patterns for phone numbers
// Add min/max value support in field metadata
// Add string length validation
```

---

### 10. Import Job Error Handling Incomplete
**Location**: `backend/services/import-export/import.service.ts`
**Issue**: Errors logged but not surfaced to user properly

**Problems**:
- No validation before import starts
- No preview/dry-run mode
- No rollback on failure
- Error messages not user-friendly

**Action Required**:
```typescript
// Add to ImportService:
async validateImport(jobId: string): Promise<ValidationResult> {
  // Validate all records without importing
  // Return detailed errors
}

async previewImport(jobId: string): Promise<ImportPreview> {
  // Show first 10 records that would be imported
}

// Add transaction support:
await this.pool.query('BEGIN');
try {
  // Import records
  await this.pool.query('COMMIT');
} catch (error) {
  await this.pool.query('ROLLBACK');
  throw error;
}
```

---

## 🟢 MEDIUM PRIORITY - Fix When Possible

### 11. Stripe Webhook Signature Verification
**Location**: `backend/modules/billing/routes/webhook-routes.ts`
**Issue**: Webhook verification implemented but needs testing

**Action Required**:
```bash
# Test with Stripe CLI
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger invoice.payment_failed

# Verify logs show: "[Stripe] Webhook signature verified"
```

---

### 12. BullMQ Job Retention
**Location**: All worker files
**Issue**: Jobs may accumulate in Redis

**Action Required**:
```typescript
// Add to all queue configurations:
const queue = new Queue('invoice-generation', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,  // Keep last 100 completed
    removeOnFail: 500,      // Keep last 500 failed for debugging
  },
});

// Add cleanup job:
async function cleanOldJobs() {
  await queue.clean(7 * 24 * 60 * 60 * 1000, 'completed'); // 7 days
  await queue.clean(30 * 24 * 60 * 60 * 1000, 'failed');   // 30 days
}
```

---

### 13. Database Connection Pool Tuning
**Location**: `backend/database/postgresql/pool.ts`
**Issue**: Default pool settings may not be optimal

**Current Settings** (likely):
```typescript
const pool = new Pool({
  max: 20,  // Needs tuning based on load
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Action Required**:
```typescript
// Monitor connection usage in production
// Adjust based on metrics:
const pool = new Pool({
  max: 50,  // Increase for high-traffic
  min: 10,  // Minimum idle connections
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 5000,
});
```

---

### 14. GDPR Export Format Improvements
**Location**: `backend/services/compliance/gdpr.service.ts:507`
**Issue**: CSV conversion is simplified - just JSON.stringify

**Current Implementation**:
```typescript
private convertToCSV(data: any): string {
  // Simplified CSV conversion
  return JSON.stringify(data);
}
```

**Action Required**:
```typescript
// Proper CSV conversion:
import { stringify } from 'csv-stringify/sync';

private convertToCSV(data: any): string {
  // Flatten nested objects
  const flatData = this.flattenData(data);
  return stringify(flatData, { header: true });
}

private flattenData(obj: any, prefix = ''): any {
  // Recursively flatten nested objects
}
```

---

### 15. Custom Fields Migration Strategy
**Location**: `database/migrations/015_custom_fields.sql`
**Issue**: No migration path for changing field types

**Problem**:
- User creates field as "text"
- Later wants to change to "number"
- Existing string values can't be converted

**Action Required**:
```sql
-- Add field type migration support:
CREATE OR REPLACE FUNCTION migrate_custom_field_type(
  p_field_id UUID,
  p_new_type VARCHAR,
  p_conversion_function VARCHAR  -- 'cast', 'parse', 'default'
) RETURNS VOID AS $$
-- Implementation needed
$$ LANGUAGE plpgsql;
```

---

### 16. API Key Rotation Not Automated
**Location**: `backend/services/api-keys/api-key.service.ts`
**Issue**: Key rotation is manual

**Action Required**:
```typescript
// Add scheduled rotation:
async scheduleKeyRotation(keyId: string, daysUntilExpiry: number): Promise<void> {
  // Create job to rotate key automatically
  // Send notification to user before rotation
}

// Add warning when key expires soon:
async getKeysExpiringSoon(tenantId: string, days: number = 30): Promise<ApiKey[]> {
  // Return keys expiring in next N days
}
```

---

### 17. Import/Export File Size Limits
**Location**: Multiple locations
**Issue**: 50MB limit may be too low for large datasets

**Current Limit**:
```typescript
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }  // 50MB
});
```

**Action Required**:
```typescript
// Support chunked uploads for large files
// Or increase limit with streaming:
const upload = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: 'clientforge-uploads',
    acl: 'private',
  }),
  limits: { fileSize: 500 * 1024 * 1024 }  // 500MB
});
```

---

### 18. Nginx Upstream Health Checks
**Location**: `infrastructure/nginx/conf.d/upstream.conf`
**Issue**: Health check endpoint not implemented

**Current Config**:
```nginx
server backend-1:3000 max_fails=3 fail_timeout=30s;
```

**Action Required**:
```typescript
// Add health check endpoint:
// backend/api/rest/v1/routes/health-routes.ts
app.get('/api/v1/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: await checkDatabase(),
    redis: await checkRedis(),
    modules: await moduleRegistry.healthCheck(),
  };
  res.json(health);
});
```

---

## 🔵 LOW PRIORITY - Nice to Have

### 19. OpenTelemetry Metrics Dashboard
**Location**: Not configured
**Issue**: Metrics collected but no visualization

**Action Required**:
- Set up Grafana dashboard
- Import OpenTelemetry dashboards
- Create custom dashboards for business metrics

---

### 20. Playwright Test Coverage
**Location**: `tests/e2e/`
**Issue**: Only auth tests implemented

**Missing Tests**:
- Billing flow tests
- Custom fields CRUD tests
- Import/export tests
- GDPR request tests

**Action Required**:
```typescript
// Create additional test files:
// tests/e2e/billing.spec.ts
// tests/e2e/custom-fields.spec.ts
// tests/e2e/import-export.spec.ts
```

---

### 21. API Documentation
**Location**: Not created
**Issue**: No Swagger/OpenAPI documentation

**Action Required**:
```bash
npm install swagger-ui-express swagger-jsdoc

# Create: backend/docs/swagger.ts
# Generate OpenAPI spec from routes
# Serve at /api/docs
```

---

### 22. Logging Improvements
**Location**: Multiple files using `logger.info()`
**Issue**: Logs not structured consistently

**Action Required**:
```typescript
// Standardize log format:
logger.info('[Module:Action] Message', {
  tenantId,
  userId,
  resourceId,
  metadata: {},
  duration: 123,  // ms
  timestamp: new Date().toISOString(),
});

// Add correlation IDs for request tracing
// Add log sampling for high-volume endpoints
```

---

### 23. Webhook Retry Configuration
**Location**: `backend/services/webhooks/` (System #1)
**Issue**: Retry logic hardcoded

**Action Required**:
```typescript
// Make retry configuration tenant-specific:
interface WebhookRetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// Allow tenants to configure per webhook
```

---

### 24. Custom Fields Search/Filtering
**Location**: `backend/services/custom-fields/`
**Issue**: Can't search/filter by custom field values

**Action Required**:
```typescript
// Add search capability:
async searchByCustomField(
  tenantId: string,
  entityType: string,
  fieldName: string,
  value: any
): Promise<string[]> {
  // Return entity IDs matching the search
}
```

---

### 25. Import Duplicate Detection
**Location**: `backend/services/import-export/import.service.ts`
**Issue**: No duplicate detection during import

**Action Required**:
```typescript
// Add duplicate detection:
async detectDuplicates(
  entityType: string,
  records: any[],
  matchFields: string[]  // e.g., ['email'] for contacts
): Promise<DuplicateReport> {
  // Check for existing records
  // Return duplicate matches
}
```

---

## 📋 Incomplete TODOs in Code

### TODO Comments to Address:

1. **`backend/modules/billing/services/invoice.service.ts:67`**
   ```typescript
   // TODO: Send invoice via email
   ```

2. **`backend/services/compliance/gdpr.service.ts:452`**
   ```typescript
   // TODO: Queue background job with BullMQ
   ```

3. **`backend/services/compliance/gdpr.service.ts:456`**
   ```typescript
   // TODO: Queue background job with BullMQ
   ```

4. **All module health checks**
   - Currently check database only
   - Should check external services (Stripe, TaxJar, S3, etc.)

---

## 🧪 Testing Checklist

### Unit Tests Needed:
- [ ] Billing service tests
- [ ] Custom fields validation tests
- [ ] Import service tests
- [ ] Export service tests
- [ ] GDPR service tests
- [ ] API key service tests

### Integration Tests Needed:
- [ ] Stripe webhook integration test
- [ ] Database migration tests
- [ ] Redis connection tests
- [ ] File upload/download tests

### E2E Tests Needed:
- [ ] Complete billing flow (signup → subscribe → invoice)
- [ ] Custom field creation and usage
- [ ] Import CSV with errors
- [ ] Export data and download
- [ ] GDPR data access request flow

---

## 🔧 Infrastructure Tasks

### Docker Compose Missing Services:
```yaml
# Add to docker-compose.yml:
services:
  # Already have: postgres, redis, mongodb

  # Need to add:
  elasticsearch:
    image: elasticsearch:8.11.0

  nginx:
    image: nginx:alpine
    volumes:
      - ./infrastructure/nginx:/etc/nginx

  certbot:
    image: certbot/certbot
    volumes:
      - ./infrastructure/nginx/ssl:/etc/letsencrypt
```

### Kubernetes Manifests Needed:
- [ ] Deployment manifests
- [ ] Service manifests
- [ ] ConfigMap for environment variables
- [ ] Secret manifests
- [ ] Ingress configuration
- [ ] HorizontalPodAutoscaler

---

## 📊 Monitoring & Observability

### Metrics to Track:
- [ ] API response times (p50, p95, p99)
- [ ] Error rates by endpoint
- [ ] Database query performance
- [ ] Redis connection pool usage
- [ ] Background job success/failure rates
- [ ] Stripe payment success rate
- [ ] Import/export job completion time
- [ ] File storage usage

### Alerts to Configure:
- [ ] High error rate (>1%)
- [ ] Slow API responses (p95 > 1s)
- [ ] Failed payments spike
- [ ] Database connection pool exhausted
- [ ] Redis memory usage > 80%
- [ ] SSL certificate expiring soon
- [ ] Disk space usage > 80%

---

## 🔐 Security Hardening

### Additional Security Measures:
- [ ] Implement CSRF protection
- [ ] Add request ID tracking
- [ ] Enable CORS with whitelist
- [ ] Add API versioning
- [ ] Implement request signing for sensitive operations
- [ ] Add IP whitelist for admin endpoints
- [ ] Enable audit logging for all data modifications
- [ ] Add encryption at rest for sensitive data
- [ ] Implement field-level encryption for PII

---

## 📝 Documentation Needed

### Technical Documentation:
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Architecture diagram
- [ ] Database schema documentation
- [ ] Deployment guide
- [ ] Runbook for common issues
- [ ] Backup and restore procedures

### User Documentation:
- [ ] Custom fields user guide
- [ ] Import/export user guide
- [ ] Billing and subscription guide
- [ ] GDPR request guide
- [ ] API key management guide

---

## 🚀 Performance Optimizations

### Database:
- [ ] Add database indexes based on query patterns
- [ ] Implement read replicas for reporting
- [ ] Add database query caching
- [ ] Optimize N+1 queries
- [ ] Implement pagination for all list endpoints

### Application:
- [ ] Implement response caching (Redis)
- [ ] Add CDN for static assets
- [ ] Implement lazy loading for large datasets
- [ ] Add connection pooling for external services
- [ ] Optimize image handling (compression, WebP)

### Infrastructure:
- [ ] Implement auto-scaling
- [ ] Add CDN (CloudFront, Cloudflare)
- [ ] Enable HTTP/2
- [ ] Optimize Docker image size
- [ ] Implement multi-region deployment

---

## ✅ Pre-Production Deployment Checklist

**Critical Path** (Do these first):
1. ✅ Install all dependencies (`npm install` - DONE)
2. ⚠️ Fix security vulnerabilities (`npm audit fix`)
3. ⚠️ Configure environment variables
4. ⚠️ Run database migrations
5. ⚠️ Configure SSL certificates
6. ⚠️ Test Stripe integration
7. ⚠️ Set up monitoring/alerting
8. ⚠️ Run load tests
9. ⚠️ Configure backups
10. ⚠️ Deploy to staging and test

**High Priority** (Do these soon):
11. ⚠️ Implement email service
12. ⚠️ Configure file storage (S3)
13. ⚠️ Complete E2E test coverage
14. ⚠️ Set up CI/CD pipeline
15. ⚠️ Create API documentation

**Medium Priority** (Can wait):
16. ⚠️ Implement file chunking for large uploads
17. ⚠️ Add custom fields search
18. ⚠️ Improve error messages
19. ⚠️ Add duplicate detection for imports
20. ⚠️ Create Grafana dashboards

---

## 📞 Support Contacts Needed

### Third-Party Service Setup:
- [ ] Stripe account (Production keys)
- [ ] TaxJar account
- [ ] SendGrid or AWS SES account
- [ ] Sentry account
- [ ] AWS account (S3, CloudFront)
- [ ] Domain registrar (SSL setup)

### Internal Setup:
- [ ] Production database provisioning
- [ ] Redis cluster setup
- [ ] Elasticsearch cluster setup
- [ ] MongoDB replica set setup
- [ ] Load balancer configuration
- [ ] DNS configuration

---

## 🎯 Success Metrics

**Before going to production, ensure**:
- ✅ 0 critical security vulnerabilities
- ✅ All database migrations run successfully
- ✅ 100% uptime in staging for 7 days
- ✅ Load test passes (1000 concurrent users)
- ✅ All E2E tests pass
- ✅ SSL certificates valid and auto-renewing
- ✅ Monitoring and alerting configured
- ✅ Backup and restore tested
- ✅ Incident response plan documented
- ✅ On-call rotation established

---

**Last Updated**: 2025-11-10
**Next Review**: Before production deployment
**Owner**: Development Team
