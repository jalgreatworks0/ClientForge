# RFC 7807 Problem Details - Upgrade Guide

**Status**: ✅ Implemented
**Date**: 2025-11-11
**Version**: v1.0

## Overview

ClientForge CRM now supports RFC 7807 Problem Details for API error responses, providing standardized, machine-readable error information with correlation IDs, tenant context, and retry hints.

## What Changed

### Before (Basic Error Response)
```json
{
  "error": {
    "id": "DB-001",
    "name": "PostgresUnavailable",
    "userMessageKey": "errors.db.connection_failed"
  }
}
```

### After (RFC 7807 Problem Details)
```json
{
  "type": "https://clientforge.com/errors/DB-001",
  "title": "PostgresUnavailable",
  "status": 503,
  "detail": "Database connection refused",
  "instance": "/api/v1/contacts",
  "errorId": "DB-001",
  "correlationId": "req_7h3f8a2d-9c4e-4b7a-8f3d-1a2b3c4d5e6f",
  "tenantId": "org_123",
  "runbook": "docs/errors/runbooks/DB-001.md",
  "retryable": true,
  "retryStrategy": "safe"
}
```

## New Components

### 1. Request ID Middleware
**File**: `backend/api/rest/v1/middleware/request-id.ts`

Adds unique correlation ID to each request:
```typescript
import { requestIdMiddleware } from "./middleware/request-id";

// In server.ts (early in middleware chain)
app.use(requestIdMiddleware);
```

**Headers Added**:
- `X-Request-Id`: Unique correlation ID for client tracing

### 2. RFC 7807 Problem Details Mapper
**File**: `backend/utils/errors/problem-details.ts`

Converts AppError to RFC 7807 format:
```typescript
import { toProblemDetails } from "./utils/errors/problem-details";

const problemDetails = toProblemDetails(err, req);
```

**Fields**:
- `type`: URL identifying error type (`https://clientforge.com/errors/{ID}`)
- `title`: Human-readable error name
- `status`: HTTP status code
- `detail`: Detailed error message
- `instance`: API endpoint where error occurred
- `errorId`: Registry error ID
- `correlationId`: Request tracking ID
- `tenantId`: Multi-tenant context
- `runbook`: Link to operational runbook (internal errors only)
- `retryable`: Boolean indicating if retry is safe
- `retryStrategy`: Retry policy (`none`, `safe`, `idempotent`)
- `userMessageKey`: Frontend message key (user-facing errors only)

### 3. Enhanced Error Handler
**File**: `backend/api/rest/v1/middleware/error-handler.ts`

Now returns RFC 7807 compliant responses with:
- `Content-Type: application/problem+json` header
- Correlation ID in logs and response
- Tenant context for multi-tenant environments

### 4. Retry Helper
**File**: `backend/utils/errors/retry-helper.ts`

Centralized retry logic based on error registry:

```typescript
import { shouldRetry, retryOperation, isSafeToRetry } from "./utils/errors/retry-helper";

// Check if error supports retry
if (shouldRetry("DB-001")) {
  // Retry with exponential backoff
  const result = await retryOperation(
    async () => await fetchData(),
    "DB-001",
    { maxAttempts: 3, baseDelayMs: 1000 }
  );
}

// Check if safe to retry based on HTTP method
if (isSafeToRetry("DB-001", "GET")) {
  // Retry GET request
}
```

**Features**:
- Exponential backoff with jitter
- Configurable max attempts and delays
- HTTP method-aware retry (GET/HEAD for `safe`, GET/HEAD/PUT/DELETE for `idempotent`)

## Integration Points

### Express Server Setup

```typescript
// server.ts
import { requestIdMiddleware } from "./api/rest/v1/middleware/request-id";
import { errorHandler } from "./api/rest/v1/middleware/error-handler";

// Early in middleware chain (before routes)
app.use(requestIdMiddleware);

// ... your routes ...

// Error handler as last middleware
app.use(errorHandler);
```

### Throwing Errors

```typescript
import { AppError } from "./utils/errors/AppError";
import { getErrorById } from "./utils/errors/registry";

// Throw registered error
throw new AppError(
  getErrorById("DB-001"),
  "PostgreSQL connection refused",
  { host: "localhost", port: 5432 } // causeData (redacted in logs)
);
```

### Client-Side Handling

```typescript
// Frontend API client
try {
  const response = await fetch("/api/v1/contacts");
  if (!response.ok) {
    const problem = await response.json();

    console.log("Error ID:", problem.errorId);
    console.log("Correlation ID:", problem.correlationId);
    console.log("Retryable:", problem.retryable);

    // Display user-friendly message
    if (problem.userMessageKey) {
      const message = ERROR_MESSAGES[problem.userMessageKey];
      toast.error(message);
    }
  }
} catch (error) {
  // Handle network errors
}
```

## Advanced Features

### Correlation ID Tracing

All logs now include correlation IDs for end-to-end request tracing:

```typescript
// Logs in MongoDB
{
  "level": "error",
  "id": "DB-001",
  "correlationId": "req_7h3f8a2d...",
  "tenantId": "org_123",
  "message": "Database connection refused"
}
```

**Benefits**:
- Trace requests across services
- Link logs to specific user actions
- Debug production issues faster
- Join logs/metrics/traces in Grafana

### Retry Strategies

| Strategy | When to Use | HTTP Methods | Example |
|----------|-------------|--------------|---------|
| `none` | No retry | - | User input validation errors |
| `safe` | Transient failures, no side effects | GET, HEAD | Database connection timeout |
| `idempotent` | Repeatable operations | GET, HEAD, PUT, DELETE | Update operation with unique ID |

### Error Response Caching

RFC 7807 responses include cache headers based on error type:

```typescript
// Transient errors (503, 504): No cache
// Client errors (400, 401): Cache for 5 minutes
// Server errors (500): No cache
```

## Testing RFC 7807 Compliance

### Contract Tests

```typescript
// tests/errors/rfc7807.contract.test.ts
describe("RFC 7807 Compliance", () => {
  it("returns valid Problem Details format", async () => {
    const response = await request(app).get("/api/v1/invalid-endpoint");

    expect(response.status).toBe(404);
    expect(response.headers["content-type"]).toContain("application/problem+json");
    expect(response.body).toHaveProperty("type");
    expect(response.body).toHaveProperty("title");
    expect(response.body).toHaveProperty("status");
    expect(response.body).toHaveProperty("detail");
    expect(response.body).toHaveProperty("instance");
    expect(response.body).toHaveProperty("errorId");
    expect(response.body).toHaveProperty("correlationId");
  });
});
```

### Manual Testing

```bash
# Test with curl
curl -v http://localhost:3000/api/v1/contacts \
  -H "Content-Type: application/json"

# Check response headers
# X-Request-Id: req_...
# Content-Type: application/problem+json

# Check response body
{
  "type": "https://clientforge.com/errors/AUTH-001",
  "title": "InvalidCredentials",
  "status": 401,
  "detail": "Authentication required",
  "instance": "/api/v1/contacts",
  "errorId": "AUTH-001",
  "correlationId": "req_7h3f8a2d...",
  "userMessageKey": "errors.auth.invalid_credentials"
}
```

## Migration Guide

### Updating API Clients

**Old Code**:
```typescript
if (response.error) {
  console.log("Error:", response.error.id);
}
```

**New Code**:
```typescript
if (!response.ok) {
  const problem = await response.json();
  console.log("Error ID:", problem.errorId);
  console.log("Correlation ID:", problem.correlationId);
  console.log("Type URL:", problem.type);
}
```

### Updating Documentation

Update API documentation to reflect RFC 7807 responses:

```markdown
## Error Responses

All error responses follow RFC 7807 Problem Details format.

**Headers**:
- `Content-Type: application/problem+json`
- `X-Request-Id: {correlationId}`

**Body**:
- `type` (string): URL identifying the error type
- `title` (string): Human-readable error name
- `status` (number): HTTP status code
- `detail` (string): Detailed error message
- `instance` (string): API endpoint where error occurred
- `errorId` (string): Registry error ID
- `correlationId` (string): Request tracking ID
- `tenantId` (string, optional): Tenant context
```

## Monitoring & Alerting

### Correlation ID in Logs

All logs now include correlation IDs. Query logs by correlation ID:

```javascript
// MongoDB query
db.app_logs.find({
  "meta.correlationId": "req_7h3f8a2d-9c4e-4b7a-8f3d-1a2b3c4d5e6f"
}).sort({ timestamp: 1 });
```

### Grafana Dashboards

Update Grafana queries to use correlation IDs:

```promql
# Error rate by error ID
sum(rate(http_requests_total{status=~"5.."}[5m])) by (error_id)

# Errors by tenant
sum(rate(http_requests_total{status=~"5.."}[5m])) by (tenant_id)
```

### PagerDuty Integration

Alerts now include correlation IDs:

```json
{
  "event_action": "trigger",
  "dedup_key": "DB-001-req_7h3f8a2d",
  "payload": {
    "summary": "PostgresUnavailable (DB-001)",
    "severity": "critical",
    "custom_details": {
      "error_id": "DB-001",
      "correlation_id": "req_7h3f8a2d...",
      "tenant_id": "org_123",
      "runbook": "https://docs.clientforge.com/errors/runbooks/DB-001.md"
    }
  }
}
```

## Future Enhancements

### 1. OpenTelemetry Integration
Add trace/span IDs to error responses:
```typescript
span?.recordException(err);
span?.setAttribute("cf.error_id", appErr.id);
```

### 2. Error Fingerprinting
Deduplicate similar errors using fingerprints:
```typescript
const fingerprint = hash(err.stack + err.code + req.path);
```

### 3. i18n Support
Multi-language error messages:
```typescript
const locale = req.headers["accept-language"];
const message = getLocalizedMessage(err.userMessageKey, locale);
```

### 4. Circuit Breaker Integration
Auto-trigger circuit breakers based on error patterns:
```typescript
if (errorCount("DB-001") > threshold) {
  circuitBreaker.open("database");
}
```

## References

- [RFC 7807 Specification](https://datatracker.ietf.org/doc/html/rfc7807)
- [Error Registry](../../config/errors/error-registry.yaml)
- [Error Handler Middleware](../../backend/api/rest/v1/middleware/error-handler.ts)
- [Problem Details Mapper](../../backend/utils/errors/problem-details.ts)
- [Retry Helper](../../backend/utils/errors/retry-helper.ts)

---

**Last Updated**: 2025-11-11
**Version**: 1.0
**Status**: Production Ready
**Owner**: Backend Team
