# LM Studio Code Generation Task: Billing Engine with Stripe

## Context
You are helping build the ClientForge CRM v3.0 billing system. This is **Tier 1, System #2** - a critical production blocker that enables revenue generation.

## Project Information
- **Language:** TypeScript (strict mode)
- **Framework:** Express.js
- **Database:** PostgreSQL with connection pooling
- **Queue:** BullMQ for async jobs
- **Architecture:** Multi-tenant, event-driven
- **Existing Patterns:** See backend/services/auth/ for reference

## Task: Implement Complete Billing Engine

### 1. Stripe Service (`backend/services/billing/stripe.service.ts`)

**Requirements:**
- Initialize Stripe client with API key
- Customer management (create, update, retrieve)
- Payment method management (attach, detach, set default)
- Webhook signature verification
- Idempotency key handling
- Error handling with proper logging
- Multi-currency support

**Reference Existing Pattern:**
```typescript
// Follow this pattern from sso-provider.service.ts
import { getPool } from '../../../database/postgresql/pool';
import { logger } from '../../../utils/logging/logger';

export class StripeService {
  private pool = getPool();
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2023-10-16',
      typescript: true,
    });
  }

  // Your implementation here
}
```

**Key Methods to Implement:**
```typescript
async createCustomer(tenantId: string, email: string, metadata?: object): Promise<Stripe.Customer>
async getCustomer(stripeCustomerId: string): Promise<Stripe.Customer>
async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>
async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>
async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent>
verifyWebhookSignature(payload: string, signature: string): Stripe.Event
async handleWebhookEvent(event: Stripe.Event): Promise<void>
```

### 2. Subscription Service (`backend/services/billing/subscription.service.ts`)

**Requirements:**
- Create subscriptions with trial periods
- Handle plan upgrades/downgrades with proration
- Cancel subscriptions (immediate and at period end)
- Reactivate canceled subscriptions
- Apply coupons and discounts
- Seat-based and usage-based pricing
- Subscription status management

**Key Methods:**
```typescript
async createSubscription(params: CreateSubscriptionParams): Promise<Subscription>
async updateSubscription(subscriptionId: string, params: UpdateSubscriptionParams): Promise<Subscription>
async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean): Promise<Subscription>
async reactivateSubscription(subscriptionId: string): Promise<Subscription>
async changePlan(subscriptionId: string, newPlanId: string, prorationBehavior: string): Promise<Subscription>
async addSeats(subscriptionId: string, quantity: number): Promise<Subscription>
async applyCoupon(subscriptionId: string, couponId: string): Promise<Subscription>
async getSubscriptionStatus(tenantId: string): Promise<SubscriptionStatus>
```

### 3. Invoice Service (`backend/services/billing/invoice.service.ts`)

**Requirements:**
- Generate invoices (manual and automatic)
- Add custom line items
- Calculate taxes (TaxJar integration)
- Generate PDF invoices (Puppeteer)
- Send invoice emails
- Track payment status
- Handle failed payments

**Key Methods:**
```typescript
async createInvoice(tenantId: string, items: InvoiceItem[]): Promise<Invoice>
async finalizeInvoice(invoiceId: string): Promise<Invoice>
async generateInvoicePDF(invoiceId: string): Promise<string>
async sendInvoiceEmail(invoiceId: string): Promise<void>
async calculateTax(amount: number, country: string, state?: string): Promise<TaxCalculation>
async getInvoices(tenantId: string, options?: QueryOptions): Promise<Invoice[]>
async getUpcomingInvoice(subscriptionId: string): Promise<Stripe.Invoice>
async voidInvoice(invoiceId: string): Promise<Invoice>
```

### 4. Usage Metering Service (`backend/services/billing/usage-metering.service.ts`)

**Requirements:**
- Track usage metrics (API calls, storage, etc.)
- Report usage to Stripe
- Calculate overage charges
- Aggregate usage data
- Reset usage counters on billing cycle

**Key Methods:**
```typescript
async recordUsage(tenantId: string, metric: string, quantity: number): Promise<void>
async getUsage(tenantId: string, metric: string, period?: DateRange): Promise<UsageData>
async reportToStripe(tenantId: string): Promise<void>
async calculateOverage(tenantId: string, planLimits: PlanLimits): Promise<OverageData>
async resetUsageCounters(tenantId: string): Promise<void>
```

### 5. Payment Methods Service (`backend/services/billing/payment-methods.service.ts`)

**Requirements:**
- List payment methods
- Add new payment methods
- Remove payment methods
- Set default payment method
- Verify payment methods (3D Secure/SCA)

**Key Methods:**
```typescript
async getPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]>
async addPaymentMethod(customerId: string, paymentMethodId: string): Promise<Stripe.PaymentMethod>
async removePaymentMethod(paymentMethodId: string): Promise<void>
async setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void>
async verifyPaymentMethod(paymentMethodId: string): Promise<VerificationResult>
```

### 6. Dunning Service (`backend/services/billing/dunning.service.ts`)

**Requirements:**
- Retry failed payments (smart retry with backoff)
- Send payment failure notifications
- Suspend accounts after max retries
- Reactivate after successful payment
- Track retry attempts

**Key Methods:**
```typescript
async handleFailedPayment(invoiceId: string): Promise<void>
async retryPayment(invoiceId: string, attempt: number): Promise<PaymentResult>
async sendPaymentFailureEmail(tenantId: string, invoiceId: string): Promise<void>
async suspendAccount(tenantId: string, reason: string): Promise<void>
async reactivateAccount(tenantId: string): Promise<void>
async getRetrySchedule(attempt: number): Date
```

## Database Schema

Create migration file: `database/migrations/012_billing_system.sql`

```sql
-- Subscription Plans
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_product_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_price_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  tier VARCHAR(50) NOT NULL, -- basic, professional, enterprise
  price_monthly DECIMAL(10,2),
  price_annual DECIMAL(10,2),
  features JSONB NOT NULL DEFAULT '[]',
  limits JSONB NOT NULL DEFAULT '{}', -- {users: 5, api_calls_per_month: 10000, storage_gb: 10}
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  plan_id UUID REFERENCES subscription_plans(id),
  status VARCHAR(50) NOT NULL, -- active, canceled, past_due, unpaid, trialing
  quantity INTEGER DEFAULT 1, -- For seat-based pricing
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tenant_subscription UNIQUE(tenant_id)
);

CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- Invoices
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  stripe_invoice_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  number VARCHAR(100),
  amount_due DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  amount_remaining DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(50) NOT NULL, -- draft, open, paid, void, uncollectible
  due_date DATE,
  paid_at TIMESTAMPTZ,
  pdf_url TEXT,
  hosted_invoice_url TEXT,
  billing_reason VARCHAR(50), -- subscription_create, subscription_cycle, manual
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_stripe_id ON invoices(stripe_invoice_id);
CREATE INDEX idx_invoices_due_date ON invoices(due_date) WHERE status = 'open';

-- Usage Records
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL, -- api_calls, storage_gb, emails_sent
  quantity BIGINT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  reported_to_stripe BOOLEAN DEFAULT false,
  stripe_usage_record_id VARCHAR(255),
  billing_period_start TIMESTAMPTZ NOT NULL,
  billing_period_end TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_usage_tenant_metric ON usage_records(tenant_id, metric_name, timestamp DESC);
CREATE INDEX idx_usage_unreported ON usage_records(reported_to_stripe, timestamp) WHERE reported_to_stripe = false;

-- Payment Methods
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_payment_method_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- card, bank_account, sepa_debit
  card_brand VARCHAR(50), -- visa, mastercard, amex
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_tenant ON payment_methods(tenant_id);
CREATE INDEX idx_payment_methods_customer ON payment_methods(stripe_customer_id);

-- Billing Customers (Stripe Customer mapping)
CREATE TABLE billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  currency VARCHAR(3) DEFAULT 'USD',
  balance INTEGER DEFAULT 0, -- In cents
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_tenant_customer UNIQUE(tenant_id)
);

CREATE INDEX idx_billing_customers_tenant ON billing_customers(tenant_id);
CREATE INDEX idx_billing_customers_stripe_id ON billing_customers(stripe_customer_id);

-- Payment Retry Log (Dunning)
CREATE TABLE payment_retry_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status VARCHAR(50) NOT NULL, -- success, failed, pending
  error_code VARCHAR(100),
  error_message TEXT,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_retry_invoice ON payment_retry_log(invoice_id, attempt_number DESC);
CREATE INDEX idx_payment_retry_schedule ON payment_retry_log(next_retry_at) WHERE status = 'pending';
```

## BullMQ Workers

### Invoice Generator Worker (`backend/workers/billing/invoice-generator.worker.ts`)

```typescript
import { Worker, Job } from 'bullmq';
import { InvoiceService } from '../../services/billing/invoice.service';
import { logger } from '../../utils/logging/logger';

const invoiceService = new InvoiceService();

export const invoiceGeneratorWorker = new Worker(
  'invoice-generation',
  async (job: Job) => {
    const { tenantId, subscriptionId, type } = job.data;

    try {
      logger.info('[Worker] Generating invoice', { tenantId, subscriptionId, type });

      const invoice = await invoiceService.createInvoice(tenantId, subscriptionId, type);
      const pdfUrl = await invoiceService.generateInvoicePDF(invoice.id);
      await invoiceService.sendInvoiceEmail(invoice.id);

      logger.info('[Worker] Invoice generated successfully', { invoiceId: invoice.id });

      return { success: true, invoiceId: invoice.id, pdfUrl };
    } catch (error: any) {
      logger.error('[Worker] Invoice generation failed', { error: error.message, tenantId });
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 5,
  }
);
```

### Payment Retry Worker (`backend/workers/billing/payment-retry.worker.ts`)

```typescript
import { Worker, Job } from 'bullmq';
import { DunningService } from '../../services/billing/dunning.service';
import { logger } from '../../utils/logging/logger';

const dunningService = new DunningService();

export const paymentRetryWorker = new Worker(
  'payment-retry',
  async (job: Job) => {
    const { invoiceId, attempt } = job.data;

    try {
      logger.info('[Worker] Retrying payment', { invoiceId, attempt });

      const result = await dunningService.retryPayment(invoiceId, attempt);

      if (!result.success && attempt < 5) {
        // Schedule next retry
        const nextRetry = dunningService.getRetrySchedule(attempt + 1);
        // Add job back to queue with delay
        await job.queue.add('payment-retry', {
          invoiceId,
          attempt: attempt + 1,
        }, {
          delay: nextRetry.getTime() - Date.now(),
        });
      }

      return result;
    } catch (error: any) {
      logger.error('[Worker] Payment retry failed', { error: error.message, invoiceId });
      throw error;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
    concurrency: 3,
  }
);
```

## API Routes

Create `backend/api/rest/v1/routes/billing-routes.ts`:

```typescript
import { Router } from 'express';
import { authenticateToken } from '../../../../middleware/auth.middleware';
import { rateLimiter } from '../../../../middleware/rate-limit.middleware';
// Import your services

const router = Router();

// All routes require authentication
router.use(authenticateToken);
router.use(rateLimiter({ max: 100, windowMs: 60000 })); // 100 req/min

// Subscription Plans
router.get('/plans', async (req, res) => { /* Get all available plans */ });
router.get('/plans/:id', async (req, res) => { /* Get specific plan */ });

// Subscriptions
router.post('/subscribe', async (req, res) => { /* Create subscription */ });
router.get('/subscription', async (req, res) => { /* Get current subscription */ });
router.put('/subscription', async (req, res) => { /* Update subscription */ });
router.delete('/subscription', async (req, res) => { /* Cancel subscription */ });
router.post('/subscription/reactivate', async (req, res) => { /* Reactivate */ });

// Payment Methods
router.get('/payment-methods', async (req, res) => { /* List payment methods */ });
router.post('/payment-methods', async (req, res) => { /* Add payment method */ });
router.delete('/payment-methods/:id', async (req, res) => { /* Remove payment method */ });
router.post('/payment-methods/:id/default', async (req, res) => { /* Set default */ });

// Invoices
router.get('/invoices', async (req, res) => { /* List invoices */ });
router.get('/invoices/:id', async (req, res) => { /* Get invoice */ });
router.get('/invoices/:id/pdf', async (req, res) => { /* Download PDF */ });

// Usage
router.get('/usage', async (req, res) => { /* Get usage stats */ });
router.post('/usage/report', async (req, res) => { /* Report usage */ });

// Webhooks (no auth - uses Stripe signature verification)
router.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  /* Handle Stripe webhooks */
});

export default router;
```

## Code Quality Requirements

1. **Error Handling:** Wrap all async operations in try-catch
2. **Logging:** Log all operations with context (tenant ID, user ID, amounts)
3. **Validation:** Validate all inputs
4. **Security:**
   - Never log sensitive data (card numbers, secrets)
   - Use Stripe's idempotency keys
   - Verify webhook signatures
   - Encrypt stored payment data
5. **TypeScript:** Full type safety, no `any` types except where necessary
6. **Comments:** Document complex business logic
7. **Testing:** Include test scenarios in comments

## Stripe Webhook Events to Handle

```typescript
// In your webhook handler, handle these events:
const webhookEvents = [
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.created',
  'invoice.finalized',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.payment_action_required',
  'payment_method.attached',
  'payment_method.detached',
  'payment_method.updated',
  'customer.created',
  'customer.updated',
  'customer.deleted',
];
```

## Example Service Method Structure

```typescript
/**
 * Create a new subscription for a tenant
 * @param tenantId - The tenant's unique identifier
 * @param planId - The subscription plan ID
 * @param paymentMethodId - Stripe payment method ID
 * @param options - Additional subscription options
 * @returns Created subscription object
 */
async createSubscription(
  tenantId: string,
  planId: string,
  paymentMethodId: string,
  options: CreateSubscriptionOptions = {}
): Promise<Subscription> {
  try {
    // 1. Validate inputs
    if (!tenantId || !planId || !paymentMethodId) {
      throw new Error('Missing required parameters');
    }

    // 2. Get or create Stripe customer
    let customer = await this.getStripeCustomer(tenantId);
    if (!customer) {
      customer = await this.createStripeCustomer(tenantId);
    }

    // 3. Attach payment method
    await this.stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    // 4. Set as default payment method
    await this.stripe.customers.update(customer.id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // 5. Get plan details
    const plan = await this.getPlan(planId);

    // 6. Create subscription in Stripe
    const stripeSubscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: plan.stripe_price_id }],
      trial_period_days: options.trialDays || 0,
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        tenantId,
        planId,
      },
    });

    // 7. Store subscription in database
    const subscription = await this.pool.query(
      `INSERT INTO subscriptions (
        tenant_id, stripe_subscription_id, stripe_customer_id,
        plan_id, status, current_period_start, current_period_end
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        tenantId,
        stripeSubscription.id,
        customer.id,
        planId,
        stripeSubscription.status,
        new Date(stripeSubscription.current_period_start * 1000),
        new Date(stripeSubscription.current_period_end * 1000),
      ]
    );

    logger.info('[Billing] Subscription created', {
      tenantId,
      subscriptionId: subscription.rows[0].id,
      plan: plan.name,
    });

    return subscription.rows[0];
  } catch (error: any) {
    logger.error('[Billing] Subscription creation failed', {
      tenantId,
      planId,
      error: error.message,
    });
    throw error;
  }
}
```

## Next Steps After Generation

1. Review generated code for security issues
2. Add unit tests for each service
3. Test Stripe webhook integration locally (use Stripe CLI)
4. Create seed data for subscription plans
5. Build frontend components
6. Deploy to staging for testing
7. Conduct security audit

## Questions?

If unclear about any requirement:
1. Check existing auth services for patterns
2. Refer to Stripe documentation: https://stripe.com/docs/api
3. Follow ClientForge coding standards
4. Ask for clarification before proceeding

**Start with `stripe.service.ts` and work your way through each file systematically.**
