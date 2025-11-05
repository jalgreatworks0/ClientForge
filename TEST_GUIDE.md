# ClientForge CRM - Test Guide

**Comprehensive Testing Strategy & Test Cases**

Version: 2.0
Last Updated: January 2025
Testing Framework: Jest, Supertest, Artillery
Coverage Target: 95%+

---

## Table of Contents

1. [Testing Philosophy](#testing-philosophy)
2. [Test Environment Setup](#test-environment-setup)
3. [Testing Pyramid](#testing-pyramid)
4. [Module Test Suites](#module-test-suites)
5. [Integration Testing](#integration-testing)
6. [API Testing](#api-testing)
7. [Performance Testing](#performance-testing)
8. [Security Testing](#security-testing)
9. [AI Service Testing](#ai-service-testing)
10. [End-to-End Testing](#end-to-end-testing)
11. [Test Data Management](#test-data-management)
12. [CI/CD Integration](#cicd-integration)

---

## Testing Philosophy

### Core Principles

1. **Test-Driven Mindset**: Tests are documentation and specification
2. **Fast Feedback**: Unit tests run in < 5 seconds, integration tests < 30 seconds
3. **Isolation**: Each test is independent and can run in any order
4. **Realistic Data**: Use production-like test data
5. **Coverage Goals**: 95%+ for business logic, 80%+ overall
6. **Automation First**: All tests must be automatable in CI/CD

### Test Levels

```
       /\
      /  \     10% - E2E Tests (Critical user journeys)
     /----\
    /      \   20% - Integration Tests (API endpoints, DB)
   /--------\
  /          \ 70% - Unit Tests (Business logic, validation)
 /____________\
```

---

## Test Environment Setup

### Prerequisites

```bash
# Install dependencies
npm install --save-dev jest @types/jest ts-jest supertest @types/supertest
npm install --save-dev artillery artillery-plugin-expect
npm install --save-dev faker @faker-js/faker
```

### Environment Configuration

Create `.env.test`:

```env
NODE_ENV=test
DATABASE_URL=postgresql://test_user:test_pass@localhost:5432/clientforge_test
REDIS_URL=redis://localhost:6379/1
JWT_SECRET=test_jwt_secret_key_minimum_32_chars
ANTHROPIC_API_KEY=test_key_or_mock
```

### Test Database Setup

```sql
-- Create test database
CREATE DATABASE clientforge_test;

-- Run all schema migrations
\i database/schemas/postgresql/001_core_tables.sql
\i database/schemas/postgresql/002_contacts_accounts_tables.sql
\i database/schemas/postgresql/003_deals_pipeline_tables.sql
\i database/schemas/postgresql/004_tasks_tables.sql
\i database/schemas/postgresql/005_notes_tags_fields_tables.sql
\i database/schemas/postgresql/006_subscriptions_ai_tables.sql
```

### Jest Configuration

**jest.config.js**:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'backend/**/*.ts',
    '!backend/**/*.d.ts',
    '!backend/**/*.test.ts',
    '!backend/**/*.spec.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 85,
      statements: 85,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 30000,
}
```

---

## Testing Pyramid

### Unit Tests (70%)

**Purpose**: Test individual functions, validators, business logic in isolation

**Location**: `tests/unit/`

**Naming**: `<module-name>.<function-name>.test.ts`

**Example Structure**:

```typescript
describe('ContactService', () => {
  describe('createContact', () => {
    it('should create contact with valid data', async () => {})
    it('should reject invalid email format', async () => {})
    it('should enforce unique email per tenant', async () => {})
    it('should assign lead score on creation', async () => {})
  })
})
```

### Integration Tests (20%)

**Purpose**: Test interactions between modules, API endpoints, database operations

**Location**: `tests/integration/`

**Naming**: `<module-name>-integration.test.ts`

### E2E Tests (10%)

**Purpose**: Test complete user workflows across the entire application

**Location**: `tests/e2e/`

**Naming**: `<workflow-name>-e2e.test.ts`

---

## Module Test Suites

### Week 5-6: Contacts & Accounts

#### Contact Service Tests

**File**: `tests/unit/contacts/contact-service.test.ts`

```typescript
describe('ContactService', () => {
  let contactService: ContactService
  let mockRepository: jest.Mocked<ContactRepository>

  beforeEach(() => {
    mockRepository = createMockRepository()
    contactService = new ContactService(mockRepository)
  })

  describe('createContact', () => {
    it('should create contact with minimal required fields', async () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
      }
      const result = await contactService.createContact('tenant-1', input)
      expect(result.email).toBe('john@example.com')
      expect(result.leadScore).toBeDefined()
    })

    it('should reject duplicate email within same tenant', async () => {
      mockRepository.findByEmail.mockResolvedValue({ id: 'existing' })
      await expect(
        contactService.createContact('tenant-1', {
          email: 'existing@example.com',
        })
      ).rejects.toThrow('Email already exists')
    })

    it('should allow same email in different tenants', async () => {
      // Test multi-tenancy isolation
    })

    it('should validate phone number format', async () => {
      const input = { phone: 'invalid' }
      await expect(
        contactService.createContact('tenant-1', input)
      ).rejects.toThrow(ValidationError)
    })

    it('should auto-calculate lead score', async () => {
      const result = await contactService.createContact('tenant-1', {
        email: 'test@bigcorp.com',
        company: 'BigCorp',
      })
      expect(result.leadScore).toBeGreaterThan(0)
    })
  })

  describe('mergeContacts', () => {
    it('should merge duplicate contacts and combine data', async () => {})
    it('should preserve most recent data on conflict', async () => {})
    it('should reassign all related records to winner', async () => {})
    it('should prevent merging across tenants', async () => {})
  })

  describe('enrichContact', () => {
    it('should fetch and add company data', async () => {})
    it('should update social profiles', async () => {})
    it('should recalculate lead score after enrichment', async () => {})
  })
})
```

#### Contact API Tests

**File**: `tests/integration/contacts/contact-api.test.ts`

```typescript
describe('Contact API Endpoints', () => {
  let app: Express
  let authToken: string
  let tenantId: string

  beforeAll(async () => {
    app = createTestApp()
    const auth = await createTestUser()
    authToken = auth.token
    tenantId = auth.tenantId
  })

  afterEach(async () => {
    await cleanupTestData(tenantId)
  })

  describe('POST /api/v1/contacts', () => {
    it('should create contact and return 201', async () => {
      const response = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
        })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data.id).toBeDefined()
    })

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ email: 'invalid-email' })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error).toBeDefined()
    })

    it('should return 401 without auth token', async () => {
      await request(app)
        .post('/api/v1/contacts')
        .send({ email: 'test@example.com' })
        .expect(401)
    })

    it('should enforce RBAC permissions', async () => {
      const readOnlyToken = await createReadOnlyUser()
      await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ email: 'test@example.com' })
        .expect(403)
    })
  })

  describe('GET /api/v1/contacts', () => {
    beforeEach(async () => {
      await seedContacts(tenantId, 50) // Create 50 test contacts
    })

    it('should list contacts with pagination', async () => {
      const response = await request(app)
        .get('/api/v1/contacts?page=1&limit=20')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data).toHaveLength(20)
      expect(response.body.pagination.total).toBe(50)
    })

    it('should filter by lead status', async () => {
      const response = await request(app)
        .get('/api/v1/contacts?status=hot')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      response.body.data.forEach((contact) => {
        expect(contact.leadStatus).toBe('hot')
      })
    })

    it('should search by name or email', async () => {
      const response = await request(app)
        .get('/api/v1/contacts?search=john')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.length).toBeGreaterThan(0)
    })

    it('should only return contacts from same tenant', async () => {
      const otherTenantId = await createOtherTenant()
      await seedContacts(otherTenantId, 10)

      const response = await request(app)
        .get('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data).toHaveLength(50) // Only our tenant's contacts
    })
  })

  describe('PUT /api/v1/contacts/:id', () => {
    it('should update contact fields', async () => {})
    it('should track update history', async () => {})
    it('should prevent updating other tenant contacts', async () => {})
  })

  describe('DELETE /api/v1/contacts/:id', () => {
    it('should soft delete contact', async () => {})
    it('should preserve related data', async () => {})
  })
})
```

#### Account Service Tests

**File**: `tests/unit/accounts/account-service.test.ts`

```typescript
describe('AccountService', () => {
  describe('createAccount', () => {
    it('should create account with valid data', async () => {})
    it('should enforce unique account name per tenant', async () => {})
    it('should validate industry values', async () => {})
    it('should validate employee count ranges', async () => {})
    it('should auto-generate account number', async () => {})
  })

  describe('addContactToAccount', () => {
    it('should link contact to account', async () => {})
    it('should prevent cross-tenant linking', async () => {})
    it('should allow multiple contacts per account', async () => {})
  })

  describe('getAccountHierarchy', () => {
    it('should return parent-child relationships', async () => {})
    it('should prevent circular references', async () => {})
  })
})
```

### Week 6-7: Deals & Pipeline

#### Deal Service Tests

**File**: `tests/unit/deals/deal-service.test.ts`

```typescript
describe('DealService', () => {
  describe('createDeal', () => {
    it('should create deal with required fields', async () => {})
    it('should default to first pipeline stage', async () => {})
    it('should calculate close date from stage SLA', async () => {})
    it('should require associated account or contact', async () => {})
  })

  describe('moveDealToStage', () => {
    it('should update deal stage', async () => {})
    it('should record stage change in history', async () => {})
    it('should update probability based on stage', async () => {})
    it('should prevent moving to non-sequential stages', async () => {})
    it('should mark as won when moving to closed-won', async () => {})
    it('should mark as lost when moving to closed-lost', async () => {})
  })

  describe('calculateWinProbability', () => {
    it('should return higher probability for engaged deals', async () => {})
    it('should consider deal age and velocity', async () => {})
    it('should factor in contact engagement', async () => {})
  })

  describe('getPipelineMetrics', () => {
    it('should calculate total pipeline value', async () => {})
    it('should calculate weighted pipeline value', async () => {})
    it('should return deals by stage', async () => {})
    it('should calculate average deal size', async () => {})
    it('should calculate win rate', async () => {})
  })
})
```

#### Pipeline API Tests

**File**: `tests/integration/deals/pipeline-api.test.ts`

```typescript
describe('Pipeline API Endpoints', () => {
  describe('GET /api/v1/deals/pipeline', () => {
    it('should return deals grouped by stage', async () => {
      const response = await request(app)
        .get('/api/v1/deals/pipeline')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)

      expect(response.body.data.stages).toBeDefined()
      expect(response.body.data.totalValue).toBeGreaterThan(0)
    })

    it('should filter pipeline by owner', async () => {})
    it('should filter pipeline by date range', async () => {})
  })

  describe('POST /api/v1/deals/:id/stage', () => {
    it('should move deal through pipeline', async () => {})
    it('should validate stage transitions', async () => {})
    it('should create activity on stage change', async () => {})
  })
})
```

### Week 7-8: Tasks & Activities

#### Task Service Tests

**File**: `tests/unit/tasks/task-service.test.ts`

```typescript
describe('TaskService', () => {
  describe('createTask', () => {
    it('should create task with valid data', async () => {})
    it('should validate due date is in future', async () => {})
    it('should validate start date before due date', async () => {})
    it('should default to pending status', async () => {})
    it('should allow polymorphic entity linking', async () => {})
  })

  describe('updateTask', () => {
    it('should update task fields', async () => {})
    it('should auto-set completedAt when status changes to completed', async () => {})
    it('should prevent completion date in future', async () => {})
  })

  describe('bulkOperations', () => {
    it('should bulk assign tasks', async () => {})
    it('should bulk update status', async () => {})
    it('should bulk delete tasks', async () => {})
  })

  describe('getOverdueTasks', () => {
    it('should return tasks past due date', async () => {})
    it('should exclude completed tasks', async () => {})
    it('should order by priority', async () => {})
  })
})
```

#### Activity Tracking Tests

**File**: `tests/unit/activities/activity-service.test.ts`

```typescript
describe('ActivityService', () => {
  describe('logActivity', () => {
    it('should log email activity with metadata', async () => {})
    it('should log call activity with duration', async () => {})
    it('should log meeting with participants', async () => {})
    it('should link activity to entity', async () => {})
  })

  describe('getActivityTimeline', () => {
    it('should return chronological activity feed', async () => {})
    it('should include all activity types', async () => {})
    it('should filter by date range', async () => {})
  })
})
```

### Week 9-10: Notes, Tags, Comments & Custom Fields

#### Notes Service Tests

**File**: `tests/unit/metadata/note-service.test.ts`

```typescript
describe('NoteService', () => {
  describe('createNote', () => {
    it('should create note with content', async () => {})
    it('should enforce max content length (50k chars)', async () => {})
    it('should allow attaching to any entity type', async () => {})
    it('should support pinning notes', async () => {})
  })

  describe('searchNotes', () => {
    it('should perform full-text search', async () => {})
    it('should search in title and content', async () => {})
    it('should rank by relevance', async () => {})
  })

  describe('bulkOperations', () => {
    it('should bulk delete notes', async () => {})
    it('should bulk pin/unpin notes', async () => {})
    it('should limit bulk operations to 100 items', async () => {})
  })
})
```

#### Tags Service Tests

**File**: `tests/unit/metadata/tag-service.test.ts`

```typescript
describe('TagService', () => {
  describe('createTag', () => {
    it('should create tag with name', async () => {})
    it('should auto-generate slug from name', async () => {})
    it('should validate hex color format', async () => {})
    it('should enforce unique name per tenant', async () => {})
  })

  describe('assignTag', () => {
    it('should assign tag to entity', async () => {})
    it('should increment tag usage count', async () => {})
    it('should prevent duplicate assignments', async () => {})
  })

  describe('unassignTag', () => {
    it('should remove tag from entity', async () => {})
    it('should decrement tag usage count', async () => {})
  })
})
```

#### Comments Service Tests

**File**: `tests/unit/metadata/comment-service.test.ts`

```typescript
describe('CommentService', () => {
  describe('createComment', () => {
    it('should create top-level comment', async () => {})
    it('should create reply to comment', async () => {})
    it('should prevent deeply nested comments (max 2 levels)', async () => {})
    it('should validate parent exists', async () => {})
  })

  describe('updateComment', () => {
    it('should update comment content', async () => {})
    it('should set isEdited flag', async () => {})
    it('should only allow author to edit', async () => {})
  })

  describe('deleteComment', () => {
    it('should soft delete comment', async () => {})
    it('should only allow author to delete', async () => {})
  })
})
```

#### Custom Fields Tests

**File**: `tests/unit/metadata/custom-field-service.test.ts`

```typescript
describe('CustomFieldService', () => {
  describe('createCustomField', () => {
    it('should create text field', async () => {})
    it('should create select field with options', async () => {})
    it('should validate field name format', async () => {})
    it('should enforce unique field name per entity type', async () => {})
    it('should require options for select fields', async () => {})
  })

  describe('setCustomFieldValue', () => {
    it('should validate value based on field type', async () => {})
    it('should validate required fields', async () => {})
    it('should apply validation rules (min/max/pattern)', async () => {})
    it('should validate select options', async () => {})
  })

  describe('Field Type Validation', () => {
    it('should validate number fields', async () => {})
    it('should validate date fields', async () => {})
    it('should validate email fields', async () => {})
    it('should validate URL fields', async () => {})
    it('should validate phone fields', async () => {})
  })
})
```

### Week 11: Centralized AI Service

#### AI Service Tests

**File**: `tests/unit/ai/ai-service.test.ts`

```typescript
describe('AIService', () => {
  let aiService: AIService
  let mockAnthropicClient: jest.Mocked<Anthropic>

  beforeEach(() => {
    mockAnthropicClient = createMockAnthropicClient()
    aiService = new AIService(mockAnthropicClient)
  })

  describe('execute', () => {
    it('should execute AI request successfully', async () => {
      const request: AIRequest = {
        featureType: AIFeatureType.LEAD_SCORING,
        complexity: QueryComplexity.MEDIUM,
        prompt: 'Score this lead',
        context: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          entityData: { /* lead data */ },
        },
      }

      mockAnthropicClient.messages.create.mockResolvedValue({
        content: [{ type: 'text', text: 'Lead Score: 85/100' }],
        usage: { input_tokens: 100, output_tokens: 50 },
      })

      const response = await aiService.execute(request)

      expect(response.result).toContain('85')
      expect(response.tokensUsed.input).toBe(100)
      expect(response.costUSD).toBeGreaterThan(0)
    })

    it('should use prompt caching for cacheable features', async () => {})
    it('should include CRM context in prompt', async () => {})
    it('should extract structured data from response', async () => {})
    it('should handle API errors gracefully', async () => {})
  })

  describe('Model Selection', () => {
    it('should use Haiku for Professional plan', async () => {})
    it('should use Sonnet for Business plan', async () => {})
    it('should use Opus for complex Enterprise queries', async () => {})
  })

  describe('Cost Calculation', () => {
    it('should calculate cost for Haiku model', async () => {})
    it('should calculate cost for Sonnet model', async () => {})
    it('should include cache token costs', async () => {})
  })

  describe('Caching', () => {
    it('should cache responses in Redis', async () => {})
    it('should return cached response on subsequent requests', async () => {})
    it('should respect cache TTL per feature', async () => {})
  })
})
```

#### AI Quota Middleware Tests

**File**: `tests/unit/ai/ai-quota-middleware.test.ts`

```typescript
describe('AI Quota Middleware', () => {
  describe('checkAIQuota', () => {
    it('should allow request when quota available', async () => {})
    it('should block request when quota exceeded', async () => {})
    it('should block Starter plan from AI features', async () => {})
    it('should allow unlimited for Enterprise plan', async () => {})
    it('should return upgrade URL when blocked', async () => {})
  })

  describe('checkAIFeature', () => {
    it('should allow feature available in plan', async () => {})
    it('should block feature not in plan', async () => {})
    it('should return required plans in error', async () => {})
  })

  describe('checkAIRateLimit', () => {
    it('should allow requests under rate limit', async () => {})
    it('should block requests over per-minute limit', async () => {})
    it('should block requests over per-hour limit', async () => {})
    it('should enforce different limits per plan', async () => {})
  })
})
```

#### AI Usage Repository Tests

**File**: `tests/unit/ai/ai-usage-repository.test.ts`

```typescript
describe('AIUsageRepository', () => {
  describe('recordUsage', () => {
    it('should record AI usage with all metrics', async () => {})
    it('should calculate total tokens', async () => {})
  })

  describe('getUsageStats', () => {
    it('should return usage statistics for period', async () => {})
    it('should group by feature type', async () => {})
    it('should group by model', async () => {})
    it('should calculate cache hit rate', async () => {})
  })

  describe('Quota Management', () => {
    it('should increment quota usage', async () => {})
    it('should check available quota', async () => {})
    it('should reset monthly quota', async () => {})
  })
})
```

---

## Integration Testing

### Database Integration Tests

**File**: `tests/integration/database/multi-tenancy.test.ts`

```typescript
describe('Multi-Tenancy Isolation', () => {
  it('should isolate data between tenants', async () => {
    const tenant1 = await createTenant('Tenant 1')
    const tenant2 = await createTenant('Tenant 2')

    // Create contacts for each tenant
    await createContact(tenant1.id, { email: 'user@tenant1.com' })
    await createContact(tenant2.id, { email: 'user@tenant2.com' })

    // Verify isolation
    const tenant1Contacts = await contactRepository.list(tenant1.id)
    const tenant2Contacts = await contactRepository.list(tenant2.id)

    expect(tenant1Contacts).toHaveLength(1)
    expect(tenant2Contacts).toHaveLength(1)
    expect(tenant1Contacts[0].email).toBe('user@tenant1.com')
  })

  it('should prevent cross-tenant data access', async () => {})
  it('should maintain referential integrity within tenant', async () => {})
})
```

### Authentication & Authorization Tests

**File**: `tests/integration/auth/authentication.test.ts`

```typescript
describe('Authentication Flow', () => {
  describe('POST /api/v1/auth/register', () => {
    it('should register new user and create tenant', async () => {})
    it('should hash password securely', async () => {})
    it('should return JWT token', async () => {})
    it('should prevent duplicate email registration', async () => {})
  })

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {})
    it('should reject invalid password', async () => {})
    it('should reject non-existent user', async () => {})
    it('should include user permissions in token', async () => {})
  })

  describe('JWT Token Validation', () => {
    it('should accept valid token', async () => {})
    it('should reject expired token', async () => {})
    it('should reject tampered token', async () => {})
    it('should reject token from wrong tenant', async () => {})
  })
})
```

**File**: `tests/integration/auth/rbac.test.ts`

```typescript
describe('Role-Based Access Control', () => {
  it('should allow admin full access', async () => {})
  it('should restrict user to assigned permissions', async () => {})
  it('should prevent unauthorized access to resources', async () => {})
  it('should enforce resource-level permissions', async () => {})
})
```

---

## API Testing

### API Contract Tests

**File**: `tests/api/openapi-validation.test.ts`

```typescript
describe('OpenAPI Spec Compliance', () => {
  it('should match OpenAPI schema for all endpoints', async () => {
    // Validate request/response against OpenAPI spec
  })

  it('should return correct HTTP status codes', async () => {})
  it('should include required headers', async () => {})
  it('should follow consistent error format', async () => {})
})
```

### Error Handling Tests

**File**: `tests/api/error-handling.test.ts`

```typescript
describe('Error Handling', () => {
  it('should return 400 for validation errors', async () => {})
  it('should return 401 for authentication errors', async () => {})
  it('should return 403 for authorization errors', async () => {})
  it('should return 404 for not found errors', async () => {})
  it('should return 409 for conflict errors', async () => {})
  it('should return 429 for rate limit errors', async () => {})
  it('should return 500 for server errors', async () => {})

  it('should include error code and message', async () => {})
  it('should not leak sensitive information', async () => {})
})
```

---

## Performance Testing

### Load Testing with Artillery

**File**: `tests/performance/load-tests.yml`

```yaml
config:
  target: "http://localhost:3000"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Sustained load"
    - duration: 60
      arrivalRate: 100
      name: "Peak load"
  variables:
    authToken:
      - "Bearer eyJhbGc..."

scenarios:
  - name: "Contact CRUD Operations"
    flow:
      - post:
          url: "/api/v1/contacts"
          headers:
            Authorization: "{{ authToken }}"
          json:
            firstName: "{{ $randomString() }}"
            lastName: "{{ $randomString() }}"
            email: "{{ $randomString() }}@test.com"
          expect:
            - statusCode: 201

      - get:
          url: "/api/v1/contacts"
          headers:
            Authorization: "{{ authToken }}"
          expect:
            - statusCode: 200
            - contentType: json

  - name: "Deal Pipeline Operations"
    flow:
      - get:
          url: "/api/v1/deals/pipeline"
          expect:
            - statusCode: 200
            - hasProperty: "data.stages"
```

### Performance Benchmarks

**File**: `tests/performance/benchmarks.test.ts`

```typescript
describe('Performance Benchmarks', () => {
  it('should list 1000 contacts in < 100ms', async () => {
    await seedContacts(1000)
    const start = Date.now()
    await contactRepository.list('tenant-1', { limit: 1000 })
    const duration = Date.now() - start
    expect(duration).toBeLessThan(100)
  })

  it('should calculate pipeline metrics in < 200ms', async () => {})
  it('should perform full-text search in < 50ms', async () => {})
  it('should handle 100 concurrent API requests', async () => {})
})
```

### Database Query Performance

**File**: `tests/performance/query-performance.test.ts`

```typescript
describe('Database Query Performance', () => {
  it('should use indexes for common queries', async () => {
    const explain = await pool.query(
      'EXPLAIN ANALYZE SELECT * FROM contacts WHERE tenant_id = $1',
      ['tenant-1']
    )
    expect(explain.rows[0]['QUERY PLAN']).toContain('Index Scan')
  })

  it('should efficiently query deals with joins', async () => {})
  it('should paginate large result sets efficiently', async () => {})
})
```

---

## Security Testing

### SQL Injection Tests

**File**: `tests/security/sql-injection.test.ts`

```typescript
describe('SQL Injection Prevention', () => {
  it('should sanitize search queries', async () => {
    const maliciousInput = "'; DROP TABLE contacts; --"
    const response = await request(app)
      .get(`/api/v1/contacts?search=${maliciousInput}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200)

    // Should return safely, no SQL execution
  })

  it('should use parameterized queries', async () => {})
})
```

### XSS Prevention Tests

**File**: `tests/security/xss-prevention.test.ts`

```typescript
describe('XSS Prevention', () => {
  it('should sanitize HTML in inputs', async () => {
    const xssPayload = '<script>alert("xss")</script>'
    const response = await request(app)
      .post('/api/v1/notes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content: xssPayload })
      .expect(201)

    // Content should be escaped
    expect(response.body.data.content).not.toContain('<script>')
  })
})
```

### Authentication Security Tests

**File**: `tests/security/auth-security.test.ts`

```typescript
describe('Authentication Security', () => {
  it('should rate limit login attempts', async () => {
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
    }

    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'wrong' })
      .expect(429)
  })

  it('should prevent timing attacks on password comparison', async () => {})
  it('should enforce password complexity', async () => {})
})
```

---

## AI Service Testing

### AI Feature Tests

**File**: `tests/integration/ai/ai-features.test.ts`

```typescript
describe('AI Features Integration', () => {
  describe('Lead Scoring', () => {
    it('should score lead based on CRM data', async () => {
      const response = await request(app)
        .post('/api/v1/ai/lead-score')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          leadId: 'lead-123',
        })
        .expect(200)

      expect(response.body.data.score).toBeGreaterThanOrEqual(0)
      expect(response.body.data.score).toBeLessThanOrEqual(100)
      expect(response.body.data.factors).toBeDefined()
    })
  })

  describe('Win Probability', () => {
    it('should calculate deal win probability', async () => {})
  })

  describe('Albedo Chat', () => {
    it('should respond to natural language queries', async () => {})
    it('should maintain conversation context', async () => {})
  })
})
```

### AI Quota Enforcement Tests

**File**: `tests/integration/ai/quota-enforcement.test.ts`

```typescript
describe('AI Quota Enforcement', () => {
  it('should block Professional plan after 100 queries', async () => {
    // Consume 100 queries
    for (let i = 0; i < 100; i++) {
      await makeAIRequest()
    }

    // 101st request should fail
    const response = await makeAIRequest()
    expect(response.status).toBe(429)
    expect(response.body.error.code).toBe('QUOTA_EXCEEDED')
  })

  it('should reset quota at billing period end', async () => {})
  it('should allow unlimited for Enterprise', async () => {})
})
```

---

## End-to-End Testing

### Critical User Journeys

**File**: `tests/e2e/lead-to-deal-journey.test.ts`

```typescript
describe('E2E: Lead to Deal Conversion Journey', () => {
  it('should complete full sales cycle', async () => {
    // 1. Create lead
    const contact = await createContact({
      email: 'prospect@bigcorp.com',
      company: 'BigCorp',
    })

    // 2. Score lead
    const score = await scoreContact(contact.id)
    expect(score.leadScore).toBeGreaterThan(70)

    // 3. Create deal
    const deal = await createDeal({
      contactId: contact.id,
      value: 50000,
    })

    // 4. Move through pipeline
    await moveDealToStage(deal.id, 'qualification')
    await moveDealToStage(deal.id, 'proposal')
    await moveDealToStage(deal.id, 'negotiation')

    // 5. Win deal
    await moveDealToStage(deal.id, 'closed-won')
    const updatedDeal = await getDeal(deal.id)
    expect(updatedDeal.status).toBe('won')
    expect(updatedDeal.closedAt).toBeDefined()
  })
})
```

**File**: `tests/e2e/ai-assisted-workflow.test.ts`

```typescript
describe('E2E: AI-Assisted Sales Workflow', () => {
  it('should use AI throughout sales process', async () => {
    // 1. Create contact and get AI lead score
    const contact = await createContact({ email: 'test@test.com' })
    const leadScore = await aiLeadScore(contact.id)

    // 2. AI suggests next best action
    const nextAction = await aiNextBestAction(contact.id)
    expect(nextAction.actions).toHaveLength(3)

    // 3. Create deal and get AI win probability
    const deal = await createDeal({ contactId: contact.id })
    const winProb = await aiWinProbability(deal.id)
    expect(winProb.probability).toBeDefined()

    // 4. AI generates follow-up email
    const email = await aiGenerateEmail({
      dealId: deal.id,
      type: 'follow_up',
    })
    expect(email.subject).toBeDefined()
    expect(email.body).toBeDefined()
  })
})
```

---

## Test Data Management

### Test Data Factories

**File**: `tests/helpers/factories.ts`

```typescript
export const contactFactory = {
  build: (overrides = {}) => ({
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email(),
    phone: faker.phone.number(),
    company: faker.company.name(),
    ...overrides,
  }),

  create: async (tenantId: string, overrides = {}) => {
    const data = contactFactory.build(overrides)
    return await contactRepository.create(tenantId, data)
  },

  createMany: async (count: number, tenantId: string) => {
    const contacts = []
    for (let i = 0; i < count; i++) {
      contacts.push(await contactFactory.create(tenantId))
    }
    return contacts
  },
}

export const dealFactory = { /* similar structure */ }
export const taskFactory = { /* similar structure */ }
```

### Database Seeding

**File**: `tests/helpers/seeders.ts`

```typescript
export async function seedDatabase(tenantId: string) {
  // Create complete test dataset
  const contacts = await contactFactory.createMany(50, tenantId)
  const accounts = await accountFactory.createMany(20, tenantId)
  const deals = await dealFactory.createMany(30, tenantId)
  const tasks = await taskFactory.createMany(100, tenantId)

  return { contacts, accounts, deals, tasks }
}

export async function cleanDatabase(tenantId: string) {
  // Clean all test data for tenant
  await pool.query('DELETE FROM tasks WHERE tenant_id = $1', [tenantId])
  await pool.query('DELETE FROM deals WHERE tenant_id = $1', [tenantId])
  await pool.query('DELETE FROM contacts WHERE tenant_id = $1', [tenantId])
  await pool.query('DELETE FROM accounts WHERE tenant_id = $1', [tenantId])
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/test.yml`

```yaml
name: Test Suite

on:
  push:
    branches: [master, develop]
  pull_request:
    branches: [master, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: clientforge_test
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup test database
        run: |
          npm run db:migrate:test

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration

      - name: Run API tests
        run: npm run test:api

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Check coverage threshold
        run: npm run test:coverage:check
```

### NPM Scripts

**Add to package.json**:

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:api": "jest tests/api",
    "test:e2e": "jest tests/e2e",
    "test:performance": "artillery run tests/performance/load-tests.yml",
    "test:coverage": "jest --coverage",
    "test:coverage:check": "jest --coverage --coverageThreshold='{\"global\":{\"branches\":80,\"functions\":80,\"lines\":85,\"statements\":85}}'",
    "test:watch": "jest --watch",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

---

## Test Execution Order

### Recommended Test Sequence

1. **Unit Tests** (5-10 seconds)
   - Run first for fast feedback
   - Test business logic in isolation

2. **Integration Tests** (20-30 seconds)
   - Test database interactions
   - Test API endpoints

3. **API Contract Tests** (10-15 seconds)
   - Validate OpenAPI compliance

4. **E2E Tests** (60-120 seconds)
   - Test critical user journeys
   - Run before deployment

5. **Performance Tests** (300+ seconds)
   - Run periodically, not in every PR
   - Run in staging environment

---

## Coverage Goals

### Module Coverage Targets

| Module | Unit Tests | Integration | E2E | Total |
|--------|-----------|-------------|-----|-------|
| Contacts | 95% | 90% | 80% | 92% |
| Accounts | 95% | 90% | 80% | 92% |
| Deals | 95% | 90% | 85% | 93% |
| Tasks | 90% | 85% | 75% | 88% |
| Activities | 90% | 85% | 75% | 88% |
| Notes/Tags | 85% | 80% | 70% | 82% |
| AI Service | 95% | 90% | 80% | 92% |
| **Overall** | **93%** | **88%** | **78%** | **90%** |

---

## Continuous Improvement

### Test Metrics to Track

1. **Coverage**: Maintain 90%+ overall coverage
2. **Execution Time**: Unit tests < 10s, Integration < 60s
3. **Flakiness**: < 1% flaky test rate
4. **Test-to-Code Ratio**: Aim for 1:1 or higher

### Review Checklist

- [ ] All tests pass locally
- [ ] Coverage meets threshold (95% for new code)
- [ ] No skipped or commented tests
- [ ] Test names are descriptive
- [ ] Tests are independent and idempotent
- [ ] Performance benchmarks pass
- [ ] Security tests pass
- [ ] E2E critical paths covered

---

**This test guide will be executed after BUILD_GUIDE completion to ensure production-ready quality.**
