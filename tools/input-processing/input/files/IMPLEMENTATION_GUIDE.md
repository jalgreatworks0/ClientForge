# ClientForge CRM - Feature Scaffolding Package
## Complete Implementation Guide for Claude Code

**Created**: November 6, 2025  
**Version**: 1.0  
**Purpose**: Provide complete scaffolds for all missing revenue features

---

## 📦 Package Contents

This scaffolding package includes:

### ✅ **Database Migrations** (Complete)
- `002_revenue_features.sql` - All database schemas for:
  - Subscription billing (7 tables)
  - Advanced reporting (5 tables)
  - Email campaigns (6 tables)
  - Quote management (4 tables)
  - Workflow automation (4 tables)

### ✅ **Backend Services** (Complete Scaffolds)
- `subscription-billing-service.ts` - Stripe integration, payments, invoices
- `reporting-service.ts` - Report builder, dashboards, exports
- `email-campaign-service.ts` - SendGrid integration, A/B testing, tracking

### 🚧 **Remaining Work for Claude Code**

---

## 🎯 Implementation Priority Order

### **Phase 1: Subscription Billing (25-30 hours)**
**Status**: 70% scaffolded - Database schema + service layer complete

**What's Done:**
- ✅ Database schema (7 tables)
- ✅ Service layer with Stripe integration methods
- ✅ Type definitions
- ✅ Webhook handlers

**What Claude Code Needs to Complete:**

1. **Repository Layer** (3-4 hours)
```typescript
// backend/core/subscriptions/subscription-repository.ts

export class SubscriptionRepository {
  async create(tenantId: string, data: CreateSubscriptionInput): Promise<Subscription> {
    // TODO: INSERT INTO subscriptions ...
  }

  async findById(id: string, tenantId: string): Promise<Subscription | null> {
    // TODO: SELECT * FROM subscriptions WHERE id = $1 AND tenant_id = $2
  }

  async updateStripeData(id: string, stripeData: any): Promise<void> {
    // TODO: UPDATE subscriptions SET ...
  }

  // ... 8 more methods (findByAccount, cancel, list, etc.)
}
```

2. **API Controllers** (4-5 hours)
```typescript
// backend/api/controllers/subscriptions/subscriptions-controller.ts

export class SubscriptionsController {
  // POST /api/v1/subscriptions - Create subscription
  async create(req: Request, res: Response) {
    const { tenantId, user } = req
    const subscription = await subscriptionBillingService.createSubscription(
      tenantId,
      user.id,
      req.body
    )
    res.status(201).json({ data: subscription })
  }

  // GET /api/v1/subscriptions/:id - Get subscription
  // PUT /api/v1/subscriptions/:id - Update subscription
  // DELETE /api/v1/subscriptions/:id - Cancel subscription
  // GET /api/v1/accounts/:accountId/subscriptions - List by account
  // POST /api/v1/webhooks/stripe - Stripe webhook handler
  // ... 10 more endpoints
}
```

3. **API Routes** (1-2 hours)
```typescript
// backend/api/routes/subscriptions.ts

router.post('/subscriptions', authenticate, createSubscriptionValidator, controller.create)
router.get('/subscriptions/:id', authenticate, controller.getById)
router.put('/subscriptions/:id', authenticate, updateSubscriptionValidator, controller.update)
router.delete('/subscriptions/:id', authenticate, controller.cancel)
router.post('/webhooks/stripe', controller.stripeWebhook)
// ... 8 more routes
```

4. **Frontend Components** (8-10 hours)
```typescript
// frontend/components/Subscriptions/SubscriptionList.tsx
// frontend/components/Subscriptions/SubscriptionDetail.tsx
// frontend/components/Subscriptions/PlanSelector.tsx
// frontend/components/Subscriptions/PaymentMethodForm.tsx
// frontend/components/Subscriptions/InvoiceList.tsx
// frontend/components/Subscriptions/BillingPortal.tsx
```

5. **Tests** (6-8 hours)
```typescript
// tests/unit/subscription-billing-service.test.ts
// tests/integration/subscriptions-api.test.ts
// tests/e2e/subscription-flow.spec.ts
```

6. **Stripe Setup & Configuration** (2-3 hours)
- Create Stripe products and prices
- Configure webhooks
- Test in sandbox environment
- Environment variables setup

**Total Remaining**: ~25-30 hours

---

### **Phase 2: Advanced Reporting (20-25 hours)**
**Status**: 60% scaffolded - Database schema + service layer complete

**What's Done:**
- ✅ Database schema (5 tables)
- ✅ Service layer with report builder
- ✅ Type definitions
- ✅ Export methods (CSV, Excel, PDF)

**What Claude Code Needs to Complete:**

1. **Query Builder Implementation** (5-6 hours)
```typescript
// backend/core/reports/query-builder.ts

export class ReportQueryBuilder {
  buildQuery(report: Report): string {
    // Convert report filters/columns/aggregations to SQL
    // Support for: contacts, deals, accounts, tasks, activities
    // Complex WHERE clauses with AND/OR logic
    // JOINs for related tables
    // GROUP BY for aggregations
    // ORDER BY for sorting
  }

  executeQuery(query: string): Promise<any[]> {
    // Execute against PostgreSQL
  }
}
```

2. **Repository + Controllers + Routes** (6-8 hours)
- Similar structure to subscriptions
- 15+ endpoints for reports and dashboards

3. **Frontend Report Builder** (10-12 hours)
```typescript
// frontend/components/Reports/ReportBuilder.tsx
// - Drag-and-drop field selector
// - Filter builder (AND/OR logic)
// - Aggregation builder
// - Chart type selector
// - Preview with real-time data

// frontend/components/Reports/Dashboard.tsx
// - Grid layout with drag-and-drop widgets
// - Real-time data refresh
// - Widget configuration

// frontend/components/Reports/ReportViewer.tsx
// - Table view with sorting/filtering
// - Chart visualization (recharts)
// - Export buttons (CSV, Excel, PDF)
```

4. **Export Implementations** (3-4 hours)
- CSV generation (papaparse)
- Excel generation (exceljs)
- PDF generation (pdfkit or puppeteer)

5. **Tests** (5-6 hours)

**Total Remaining**: ~20-25 hours

---

### **Phase 3: Email Campaigns (30-35 hours)**
**Status**: 70% scaffolded - Database schema + service layer complete

**What's Done:**
- ✅ Database schema (6 tables)
- ✅ Service layer with SendGrid integration
- ✅ Type definitions
- ✅ A/B testing logic
- ✅ Webhook handlers

**What Claude Code Needs to Complete:**

1. **Repository + Controllers + Routes** (8-10 hours)
- Campaign CRUD operations
- Template management
- Recipient segmentation
- Statistics aggregation

2. **Email Editor Component** (12-15 hours)
```typescript
// frontend/components/EmailCampaigns/EmailEditor.tsx
// - WYSIWYG editor (TipTap or similar)
// - Template variable insertion
// - Image upload
// - Preview mode (desktop/mobile)
// - Spam score checker

// frontend/components/EmailCampaigns/RecipientSelector.tsx
// - Segment builder with filters
// - Contact count preview
// - Manual recipient addition

// frontend/components/EmailCampaigns/CampaignAnalytics.tsx
// - Open rate chart
// - Click rate chart
// - Geographic distribution
// - Device breakdown
```

3. **SendGrid Setup** (2-3 hours)
- Configure sender authentication
- Setup webhooks
- Test email delivery

4. **Background Job Processing** (3-4 hours)
```typescript
// backend/workers/email-campaign-worker.ts
// - Process scheduled campaigns
// - Send emails in batches
// - Handle retries
// - Update statistics
```

5. **Tests** (5-6 hours)

**Total Remaining**: ~30-35 hours

---

### **Phase 4: Quote Management (20-25 hours)**

**What Needs to be Built:**

1. **Complete Service Layer** (5-6 hours)
```typescript
// backend/core/quotes/quote-service.ts

export class QuoteService {
  async createQuote(tenantId: string, data: CreateQuoteInput): Promise<Quote> {
    // Generate quote number
    // Calculate totals (subtotal, tax, discount, total)
    // Create quote items
    // Insert into database
  }

  async generatePdf(quoteId: string): Promise<string> {
    // Load quote data
    // Apply template
    // Generate PDF using pdfkit
    // Upload to S3
    // Return URL
  }

  async sendQuote(quoteId: string, recipientEmail: string): Promise<void> {
    // Generate PDF
    // Send email with PDF attachment
    // Update quote status to 'sent'
  }

  async acceptQuote(quoteId: string, signature?: string): Promise<void> {
    // Update status to 'accepted'
    // Create deal if configured
    // Send confirmation email
  }

  // ... 10 more methods
}
```

2. **Repository + Controllers + Routes** (6-8 hours)

3. **Frontend Components** (10-12 hours)
```typescript
// frontend/components/Quotes/QuoteBuilder.tsx
// - Line item editor (add/remove/reorder)
// - Pricing calculator with live totals
// - Template selector
// - Client information form

// frontend/components/Quotes/QuotePdfViewer.tsx
// - PDF preview
// - E-signature integration (DocuSign/HelloSign)
// - Send via email modal

// frontend/components/Quotes/QuoteApproval.tsx
// - Approval workflow UI
// - Comment system
// - Status tracking
```

4. **PDF Generation** (4-5 hours)
- Template system
- Branded PDF generation
- Line item formatting

5. **Tests** (3-4 hours)

**Total Remaining**: ~20-25 hours

---

### **Phase 5: Workflow Automation (35-40 hours)**

**What Needs to be Built:**

1. **Workflow Engine** (15-18 hours)
```typescript
// backend/core/workflows/workflow-engine.ts

export class WorkflowEngine {
  async executeWorkflow(workflowId: string, entityId: string, triggerData: any): Promise<void> {
    // 1. Load workflow definition
    // 2. Evaluate trigger conditions
    // 3. Execute actions in order
    // 4. Handle conditional logic (if/else)
    // 5. Wait/delay actions
    // 6. Error handling and retries
    // 7. Log execution history
  }

  async evaluateTrigger(trigger: WorkflowTrigger, event: any): Promise<boolean> {
    // Check if trigger conditions are met
  }

  async executeAction(action: WorkflowAction, context: any): Promise<any> {
    switch (action.actionType) {
      case 'update_record': return this.updateRecord(action.config, context)
      case 'create_record': return this.createRecord(action.config, context)
      case 'send_email': return this.sendEmail(action.config, context)
      case 'send_notification': return this.sendNotification(action.config, context)
      case 'http_request': return this.httpRequest(action.config, context)
      case 'wait': return this.wait(action.config)
      case 'conditional': return this.conditional(action.config, context)
    }
  }

  // ... action implementations
}
```

2. **Trigger System** (5-6 hours)
```typescript
// backend/core/workflows/workflow-triggers.ts

// Hook into entity events
// - on contactCreated, contactUpdated, fieldChanged
// - on dealCreated, dealStageChanged
// - on taskCompleted
// - on timeSchedule (cron jobs)
// - on webhookReceived
```

3. **Repository + Controllers + Routes** (6-8 hours)

4. **Frontend Workflow Builder** (15-18 hours)
```typescript
// frontend/components/Workflows/WorkflowBuilder.tsx
// - Visual node editor (React Flow)
// - Drag-and-drop trigger/action nodes
// - Connection lines between nodes
// - Configuration panels for each node
// - Conditional branching (if/else)
// - Test workflow with sample data

// frontend/components/Workflows/TriggerConfig.tsx
// - Trigger type selector
// - Trigger condition builder
// - Field change monitoring

// frontend/components/Workflows/ActionConfig.tsx
// - Action type selector
// - Action-specific forms
// - Variable picker (from trigger data)

// frontend/components/Workflows/WorkflowHistory.tsx
// - Execution timeline
// - Success/failure status
// - Detailed logs for debugging
```

5. **Background Processing** (4-5 hours)
```typescript
// backend/workers/workflow-worker.ts
// - Process workflow executions from queue
// - Handle async actions
// - Retry failed actions
```

6. **Tests** (5-6 hours)

**Total Remaining**: ~35-40 hours

---

## 🛠️ Implementation Patterns

### **Standard File Structure**

```
backend/
├── core/
│   └── [feature]/
│       ├── [feature]-service.ts       # Business logic
│       ├── [feature]-repository.ts    # Database access
│       ├── [feature]-types.ts         # TypeScript types
│       └── [feature]-validator.ts     # Input validation (zod)
├── api/
│   ├── controllers/
│   │   └── [feature]/
│   │       └── [feature]-controller.ts
│   └── routes/
│       └── [feature].ts               # Express routes
└── workers/
    └── [feature]-worker.ts            # Background jobs

frontend/
└── components/
    └── [Feature]/
        ├── [Feature]List.tsx
        ├── [Feature]Detail.tsx
        ├── [Feature]Form.tsx
        └── [Feature]Stats.tsx

tests/
├── unit/
│   └── [feature]-service.test.ts
├── integration/
│   └── [feature]-api.test.ts
└── e2e/
    └── [feature]-flow.spec.ts
```

### **Standard API Response Format**

```typescript
// Success
{
  data: { /* result */ },
  meta?: { pagination, etc }
}

// Error
{
  error: {
    code: "VALIDATION_ERROR",
    message: "User-friendly message",
    details: { /* validation errors */ }
  }
}
```

### **Standard Database Patterns**

```sql
-- Every table must have:
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

-- Add created_by/updated_by for audit trail
created_by UUID REFERENCES users(id)
updated_by UUID REFERENCES users(id)

-- Add updated_at trigger
CREATE TRIGGER update_[table]_updated_at BEFORE UPDATE ON [table]
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## 📋 Claude Code Implementation Checklist

For each feature, follow this checklist:

### **Database Layer**
- [ ] Run migration (`psql -U postgres -d clientforge < 002_revenue_features.sql`)
- [ ] Verify all tables created
- [ ] Test constraints and indexes

### **Backend Layer**
- [ ] Create repository (database queries)
- [ ] Complete TODOs in service layer
- [ ] Create controller (HTTP handlers)
- [ ] Create routes (Express routing)
- [ ] Add input validation (zod schemas)
- [ ] Add authorization checks (RBAC)
- [ ] Add logging (Winston)
- [ ] Add error handling

### **Frontend Layer**
- [ ] Create component structure
- [ ] Add React Query hooks for API calls
- [ ] Add form validation (react-hook-form + zod)
- [ ] Add loading states
- [ ] Add error states
- [ ] Add success notifications
- [ ] Style with Tailwind CSS
- [ ] Make responsive (mobile-friendly)

### **Testing Layer**
- [ ] Write unit tests (85%+ coverage)
- [ ] Write integration tests (API endpoints)
- [ ] Write E2E tests (critical user flows)
- [ ] Test error scenarios
- [ ] Test edge cases
- [ ] Test security vulnerabilities

### **Documentation**
- [ ] Update API documentation
- [ ] Create user guide
- [ ] Add code comments (complex logic only)
- [ ] Update session log
- [ ] Update CHANGELOG

---

## 🚀 Quick Start for Claude Code

### **1. Set Up Database**
```bash
# Run migration
psql -U postgres -d clientforge < 002_revenue_features.sql

# Verify
psql -U postgres -d clientforge -c "\dt" | grep subscription
```

### **2. Install Dependencies**
```bash
cd backend
npm install stripe @sendgrid/mail exceljs pdfkit papaparse
```

### **3. Configure Environment**
```bash
# Add to .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SENDGRID_API_KEY=SG...
```

### **4. Start with Subscriptions**
```typescript
// 1. Create repository
// backend/core/subscriptions/subscription-repository.ts

// 2. Complete TODOs in service
// backend/core/subscriptions/subscription-billing-service.ts

// 3. Create controller
// backend/api/controllers/subscriptions/subscriptions-controller.ts

// 4. Add routes
// backend/api/routes/subscriptions.ts

// 5. Create frontend components
// frontend/components/Subscriptions/...

// 6. Write tests
// tests/...
```

---

## 📊 Estimated Completion Timeline

| Feature | Complexity | Estimated Hours | Priority |
|---------|-----------|----------------|----------|
| Subscription Billing | HIGH | 25-30 | 1 |
| Advanced Reporting | HIGH | 20-25 | 2 |
| Email Campaigns | HIGH | 30-35 | 3 |
| Quote Management | MEDIUM | 20-25 | 4 |
| Workflow Automation | VERY HIGH | 35-40 | 5 |
| **TOTAL** | | **130-155** | |

With focused work:
- **Week 1-2**: Subscription Billing (complete)
- **Week 3**: Advanced Reporting (complete)
- **Week 4-5**: Email Campaigns (complete)
- **Week 6**: Quote Management (complete)
- **Week 7-8**: Workflow Automation (complete)

---

## 🎯 Success Criteria

Each feature is considered complete when:

✅ Database migrations run successfully  
✅ Repository layer has 100% test coverage  
✅ Service layer has 85%+ test coverage  
✅ API endpoints have integration tests  
✅ Frontend components render correctly  
✅ E2E tests pass for critical flows  
✅ Code passes linting and type checking  
✅ Documentation is updated  
✅ Security review completed (OWASP Top 10)  
✅ Performance meets targets (<200ms API, <2s page load)

---

## 📚 Additional Resources

**Stripe Integration**
- [Stripe Node.js SDK](https://github.com/stripe/stripe-node)
- [Stripe Webhook Guide](https://stripe.com/docs/webhooks)
- [Subscription Lifecycle](https://stripe.com/docs/billing/subscriptions/overview)

**SendGrid Integration**
- [SendGrid Node.js SDK](https://github.com/sendgrid/sendgrid-nodejs)
- [Email API Reference](https://docs.sendgrid.com/api-reference/mail-send/mail-send)
- [Webhook Events](https://docs.sendgrid.com/for-developers/tracking-events/event)

**Report Building**
- [SQL Query Building](https://github.com/knex/knex)
- [CSV Export](https://github.com/mholt/PapaParse)
- [Excel Export](https://github.com/exceljs/exceljs)
- [PDF Generation](https://github.com/foliojs/pdfkit)

**Workflow Automation**
- [React Flow](https://reactflow.dev/) - Visual workflow builder
- [Node-RED](https://nodered.org/) - Flow-based programming inspiration

---

**Ready to build! This scaffolding provides 60-70% of the implementation.** 🚀

Claude Code can now complete the remaining 30-40% by following the patterns and filling in the TODOs.
