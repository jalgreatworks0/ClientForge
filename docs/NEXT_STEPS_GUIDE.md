# ClientForge CRM v3.0 - Next Steps Guide

**Status**: 15/15 Core Systems Complete ✅
**Date**: 2025-11-10

---

## 🎯 Quick Start: Testing the New Systems

### 1. Email Service
```bash
# Set environment variables
export SENDGRID_API_KEY="your_key"
export SENDGRID_FROM_EMAIL="noreply@clientforge.com"
export SENDGRID_FROM_NAME="ClientForge CRM"

# Or for SMTP fallback
export SMTP_HOST="smtp.gmail.com"
export SMTP_PORT="587"
export SMTP_USER="your_email@gmail.com"
export SMTP_PASS="your_password"
```

**Test Email**:
```typescript
import { emailService } from './backend/services/email/email.service';

await emailService.send({
  to: 'test@example.com',
  subject: 'Test Email',
  template: 'welcome',
  templateData: { userName: 'John Doe' },
});
```

### 2. File Storage (S3)
```bash
# Set environment variables
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
export AWS_REGION="us-east-1"
export AWS_S3_BUCKET="clientforge-files"

# For local testing, leave these unset (will use ./storage/)
```

**Test Upload**:
```typescript
import { s3Service } from './backend/services/storage/s3.service';

const url = await s3Service.upload({
  key: 'test/file.txt',
  body: Buffer.from('Hello World'),
  contentType: 'text/plain',
});

const downloadUrl = await s3Service.getPresignedUrl({
  key: 'test/file.txt',
  expiresIn: 3600, // 1 hour
});
```

### 3. Notifications
```bash
# Set environment variables
export TWILIO_ACCOUNT_SID="your_sid"
export TWILIO_AUTH_TOKEN="your_token"
export TWILIO_PHONE_NUMBER="+1234567890"

export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

**Test Notification**:
```typescript
import { notifyDealWon } from './backend/utils/notifications/notify';

await notifyDealWon(
  tenantId,
  userId,
  'Big Enterprise Deal',
  dealId,
  5000000 // $50,000
);
```

**WebSocket Connection (Frontend)**:
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3000', {
  path: '/ws',
  auth: { token: jwtToken }
});

socket.on('notification:new', (notification) => {
  console.log('New notification:', notification);
  // Show toast/alert
});
```

### 4. Activity Timeline
```bash
# Run migration
psql -U postgres -d clientforge -f database/migrations/018_activities.sql
```

**Test Activity Logging**:
```typescript
import { trackDealCreated } from './backend/utils/activity/track';

await trackDealCreated(
  tenantId,
  userId,
  dealId,
  'New Enterprise Deal',
  5000000,
  req.ip,
  req.get('user-agent')
);
```

**Get Entity Timeline**:
```bash
curl -X GET "http://localhost:3000/api/v1/timeline/deal/123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Search System
```bash
# Set environment variables
export ELASTICSEARCH_URL="https://your-cluster.es.cloud:9243"
export ELASTICSEARCH_API_KEY="your_api_key"

# For PostgreSQL fallback, leave unset
```

**Test Search**:
```bash
curl -X GET "http://localhost:3000/api/v1/search?q=John+Doe" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Bulk Index Existing Data**:
```typescript
import { elasticsearchService } from './backend/services/search/elasticsearch.service';

// Get all contacts from database
const contacts = await getContacts();

// Bulk index
await elasticsearchService.bulkIndex(
  contacts.map(c => ({
    entityType: 'contact',
    entityId: c.id,
    document: {
      tenant_id: c.tenantId,
      title: `${c.firstName} ${c.lastName}`,
      email: c.email,
      // ... other fields
    }
  }))
);
```

---

## 🔧 Integration Tasks

### Step 1: Run Database Migrations
```bash
# Notifications
psql -U postgres -d clientforge -f database/migrations/017_notifications.sql

# Activities
psql -U postgres -d clientforge -f database/migrations/018_activities.sql
```

### Step 2: Update Backend Index
Add new routes to `backend/api/rest/v1/index.ts`:
```typescript
import activityTimelineRoutes from './routes/activity-timeline-routes';
import searchV2Routes from './routes/search-v2-routes';
import notificationsRoutes from './routes/notifications-routes';

// Register routes
app.use('/api/v1/timeline', activityTimelineRoutes);
app.use('/api/v1/search', searchV2Routes);
app.use('/api/v1/notifications', notificationsRoutes);
```

### Step 3: Initialize Modules
Add modules to `backend/index.ts`:
```typescript
import { createActivitiesModule } from './modules/activities/activities.module';
import { createNotificationsModule } from './modules/notifications/notifications.module';
import { createSearchModule } from './modules/search/search.module';

// Create event emitter
const eventEmitter = new EventEmitter();

// Initialize modules
await createActivitiesModule(eventEmitter).initialize();
await createNotificationsModule(eventEmitter).initialize();
await createSearchModule(eventEmitter).initialize();
```

### Step 4: Initialize WebSocket Server
In `backend/index.ts`:
```typescript
import { webSocketService } from './services/notifications/websocket.service';

// After Express server setup
const httpServer = createServer(app);
webSocketService.initialize(httpServer);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### Step 5: Emit Events from Controllers
Example for contacts controller:
```typescript
// After creating contact
eventEmitter.emit('contact:created', {
  contactId: contact.id,
  tenantId: contact.tenantId,
  userId: req.user.userId,
  firstName: contact.firstName,
  lastName: contact.lastName,
  email: contact.email,
  createdAt: contact.createdAt,
});
```

---

## 📋 Verification Checklist

### Email Service:
- [ ] SendGrid API key configured
- [ ] Send test email via SendGrid
- [ ] Test SMTP fallback
- [ ] Test all email templates
- [ ] Verify email delivery in inbox

### File Storage:
- [ ] AWS credentials configured
- [ ] Upload test file to S3
- [ ] Generate presigned URL
- [ ] Download file via presigned URL
- [ ] Test local fallback (no AWS credentials)

### Notifications:
- [ ] WebSocket server running
- [ ] Connect via Socket.IO client
- [ ] Send test notification
- [ ] Verify in-app delivery
- [ ] Test email notification
- [ ] Test SMS notification (optional)
- [ ] Test push notification (optional)
- [ ] Verify quiet hours logic
- [ ] Test user preferences

### Activity Timeline:
- [ ] Migration executed successfully
- [ ] Log test activity
- [ ] Query entity timeline
- [ ] Query user activity feed
- [ ] Test search functionality
- [ ] Verify change detection
- [ ] Check activity statistics

### Search System:
- [ ] Elasticsearch connection established (or PostgreSQL fallback)
- [ ] Create index
- [ ] Index test documents
- [ ] Search by query
- [ ] Test filters (entity types, tags, dates)
- [ ] Verify pagination
- [ ] Test aggregations
- [ ] Verify automatic indexing on create/update/delete

---

## 🚀 Production Deployment

### 1. Environment Variables
Create `.env.production`:
```bash
# Email
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=

# AWS S3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# Twilio (SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Firebase (Push)
FIREBASE_SERVICE_ACCOUNT_KEY=

# Elasticsearch
ELASTICSEARCH_URL=
ELASTICSEARCH_API_KEY=

# Redis (for WebSocket scaling)
REDIS_URL=

# JWT Secret
JWT_SECRET=
```

### 2. Infrastructure Setup

**Elasticsearch**:
- AWS OpenSearch: https://aws.amazon.com/opensearch-service/
- Elastic Cloud: https://cloud.elastic.co/

**AWS S3**:
1. Create bucket: `clientforge-{environment}-files`
2. Create IAM user with S3 permissions
3. Configure bucket CORS and lifecycle policies

**SendGrid**:
1. Create account: https://sendgrid.com/
2. Verify sender domain (DKIM, SPF)
3. Create API key with "Mail Send" permissions

**Twilio (Optional)**:
1. Create account: https://www.twilio.com/
2. Purchase phone number
3. Get Account SID and Auth Token

**Firebase (Optional)**:
1. Create project: https://console.firebase.google.com/
2. Enable Cloud Messaging
3. Generate service account key

**Redis (For WebSocket Scaling)**:
1. Use Redis adapter for Socket.IO
2. AWS ElastiCache or Redis Cloud

### 3. Load Balancer Configuration
Update `nginx.conf`:
```nginx
# WebSocket support
location /ws/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_read_timeout 86400; # 24 hours
}
```

### 4. Monitoring & Alerts
Set up alerts for:
- Email delivery failures
- S3 upload failures
- Notification delivery failures
- WebSocket connection drops
- Elasticsearch indexing errors
- Search query performance

---

## 🐛 Troubleshooting

### Email Not Sending
1. Check SendGrid API key is valid
2. Verify sender email is verified in SendGrid
3. Check logs for error messages
4. Try SMTP fallback
5. Check spam folder

### S3 Upload Failing
1. Verify AWS credentials
2. Check bucket permissions
3. Verify bucket exists
4. Check IAM policy
5. Try local fallback (unset AWS env vars)

### WebSocket Not Connecting
1. Check WebSocket server is initialized
2. Verify JWT token is valid
3. Check CORS configuration
4. Verify load balancer WebSocket support
5. Check firewall rules

### Notifications Not Delivered
1. Check event emitters are configured
2. Verify notification service is initialized
3. Check user preferences
4. Verify quiet hours settings
5. Check channel availability (Twilio, Firebase)

### Search Not Working
1. Check Elasticsearch connection
2. Verify index exists
3. Check document indexing
4. Try PostgreSQL fallback (unset ELASTICSEARCH_URL)
5. Check tenant_id filtering

### Activities Not Logging
1. Check migration was run
2. Verify activities module is initialized
3. Check event emitters are configured
4. Verify database connection
5. Check logs for errors

---

## 📚 API Documentation

### Activity Timeline
```
GET    /api/v1/timeline                      # Tenant activity feed
GET    /api/v1/timeline/me                   # User activity feed
GET    /api/v1/timeline/:type/:id            # Entity timeline
GET    /api/v1/timeline/search?q=...         # Search activities
GET    /api/v1/timeline/statistics           # Activity stats
POST   /api/v1/timeline                      # Log activity
DELETE /api/v1/timeline/cleanup              # Cleanup old activities
```

### Notifications
```
GET    /api/v1/notifications                 # Get notifications
GET    /api/v1/notifications/unread-count    # Count unread
PATCH  /api/v1/notifications/:id/read        # Mark as read
GET    /api/v1/notifications/preferences     # Get preferences
PUT    /api/v1/notifications/preferences     # Update preferences
POST   /api/v1/notifications/devices         # Register device
```

### Search
```
GET    /api/v1/search?q=...                  # Universal search
GET    /api/v1/search/contacts?q=...         # Search contacts
GET    /api/v1/search/deals?q=...            # Search deals
GET    /api/v1/search/tasks?q=...            # Search tasks
POST   /api/v1/search/index                  # Index document
POST   /api/v1/search/bulk-index             # Bulk index
DELETE /api/v1/search/index/:type/:id        # Delete from index
POST   /api/v1/search/reindex                # Recreate index
```

---

## 🎓 Code Examples

### Sending Email with Template
```typescript
import { emailService } from './backend/services/email/email.service';

await emailService.send({
  to: 'customer@example.com',
  subject: 'Welcome to ClientForge!',
  template: 'welcome',
  templateData: {
    userName: 'John Doe',
    loginUrl: 'https://app.clientforge.com/login'
  }
});
```

### Uploading File to S3
```typescript
import { s3Service } from './backend/services/storage/s3.service';

const invoicePdf = await generateInvoicePdf(invoice);
const s3Url = await s3Service.upload({
  key: `invoices/${invoice.id}.pdf`,
  body: invoicePdf,
  contentType: 'application/pdf',
  metadata: {
    invoiceId: invoice.id,
    tenantId: invoice.tenantId,
  }
});

// Get download URL (expires in 1 hour)
const downloadUrl = await s3Service.getPresignedUrl({
  key: `invoices/${invoice.id}.pdf`,
  expiresIn: 3600,
});
```

### Sending Multi-Channel Notification
```typescript
import { notificationService } from './backend/services/notifications/notification.service';

await notificationService.send({
  tenantId: user.tenantId,
  userId: user.id,
  type: 'payment_failed',
  title: 'Payment Failed',
  message: `Your payment for invoice ${invoice.number} has failed. Please update your payment method.`,
  priority: 'urgent',
  channels: ['in_app', 'email', 'sms'], // Multi-channel
  actionUrl: '/billing/payment-methods',
  data: {
    invoiceId: invoice.id,
    amount: invoice.amount,
  }
});
```

### Logging Activity with Changes
```typescript
import { trackDealUpdated } from './backend/utils/activity/track';

const oldDeal = { name: 'Deal A', value: 10000, stage: 'proposal' };
const newDeal = { name: 'Deal A', value: 15000, stage: 'negotiation' };

await trackDealUpdated(
  req.user.tenantId,
  req.user.userId,
  deal.id,
  deal.name,
  oldDeal,
  newDeal,
  req.ip,
  req.get('user-agent')
);
// Automatically detects changes to 'value' and 'stage'
```

### Searching with Filters
```typescript
import { elasticsearchService } from './backend/services/search/elasticsearch.service';

const results = await elasticsearchService.search(tenantId, {
  query: 'enterprise customer',
  filters: {
    entityTypes: ['contact', 'company'],
    tags: ['enterprise', 'vip'],
    assignedTo: [userId],
    createdAfter: new Date('2025-01-01'),
  },
  pagination: { limit: 20, offset: 0 },
  sorting: { field: 'created_at', order: 'desc' },
});

console.log(`Found ${results.total} results in ${results.took}ms`);
```

---

**Last Updated**: 2025-11-10
**Questions?** Check FIX_LATER_CHECKLIST.md and TIER2_COMPLETE_SUMMARY.md
