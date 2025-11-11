# ClientForge CRM - Backend

Enterprise-grade Node.js/TypeScript backend API with modular plugin architecture.

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Module System](#module-system)
- [API Structure](#api-structure)
- [Database](#database)
- [Development Guide](#development-guide)
- [Testing](#testing)
- [Deployment](#deployment)

---

## 🏗️ Architecture Overview

### Technology Stack

- **Runtime**: Node.js 18+ with TypeScript 5.3
- **Framework**: Express.js 4.18
- **Databases**:
  - PostgreSQL 15+ (primary data store)
  - MongoDB 6+ (flexible schema data)
  - Redis 7+ (caching & sessions)
  - Elasticsearch 8.11+ (search)
- **Queue**: BullMQ with Redis
- **Real-time**: Socket.IO for WebSocket connections
- **AI/ML**: Anthropic Claude SDK, OpenAI SDK, TensorFlow.js

### Design Principles

1. **Modular Architecture**: Plugin-based module system using `ModuleRegistry`
2. **Type Safety**: Full TypeScript with strict mode
3. **Async/Await**: Modern async patterns throughout
4. **Error Handling**: Centralized error handling middleware
5. **Security First**: Helmet, CORS, rate limiting, input validation
6. **Multi-tenancy**: Tenant isolation at database and API levels

---

## 📁 Directory Structure

```
backend/
├── api/                    # API Layer
│   ├── rest/              # REST API endpoints
│   │   └── v1/           # API version 1
│   │       ├── controllers/  # Request handlers
│   │       ├── middleware/   # Route middleware
│   │       └── routes/       # Route definitions
│   ├── graphql/           # GraphQL API (future)
│   └── server.ts          # Express server setup
│
├── config/                # Configuration (moved to /config root)
│
├── core/                  # Core Business Logic
│   ├── auth/             # Authentication & authorization
│   ├── billing/          # Billing & subscriptions
│   ├── email/            # Email service
│   ├── modules/          # Core module implementations
│   └── sso-mfa/          # SSO & MFA integrations
│
├── modules/              # Feature Modules
│   ├── core.module.ts    # Core CRM module (contacts, deals, etc.)
│   ├── tier2-modules.ts  # Legacy tier 2 modules
│   ├── billing/          # Billing module
│   ├── compliance/       # GDPR compliance module
│   └── [feature]/        # Additional feature modules
│
├── services/             # Shared Services
│   ├── ai/              # AI/ML services
│   ├── analytics/       # Analytics engine
│   ├── cache/           # Cache service
│   ├── queue/           # Job queue service
│   └── websocket/       # WebSocket service
│
├── utils/               # Utility Functions
│   ├── database/       # Database utilities
│   ├── logging/        # Winston logger
│   ├── security/       # Security utilities
│   └── validation/     # Input validation
│
├── workers/            # Background Workers
│   └── [worker]/      # Job processors
│
├── index.ts            # Application entry point
├── tsconfig.json       # TypeScript configuration
└── README.md           # This file
```

---

## 🔌 Module System

### ModuleRegistry Architecture

The backend uses a **plugin-based module system** for extensibility and maintainability.

#### IModule Interface

All modules implement the `IModule` interface:

```typescript
interface IModule {
  name: string;
  version: string;
  dependencies?: string[];

  // Lifecycle hooks
  init(context: ModuleContext): Promise<void>;
  registerRoutes(app: Express, context: ModuleContext): void;
  registerJobs?(context: ModuleContext): Promise<void>;
  shutdown?(): Promise<void>;
}
```

#### Module Lifecycle

1. **Registration**: Modules registered with `ModuleRegistry`
2. **Dependency Resolution**: Automatic dependency order calculation
3. **Initialization**: `init()` called in dependency order
4. **Route Registration**: `registerRoutes()` called for each module
5. **Job Registration**: `registerJobs()` called if defined
6. **Shutdown**: `shutdown()` called on graceful shutdown

#### Creating a New Module

```typescript
// modules/my-feature/my-feature.module.ts
import { IModule, ModuleContext } from '../types';

export class MyFeatureModule implements IModule {
  name = 'my-feature';
  version = '1.0.0';
  dependencies = ['core']; // Depends on core module

  async init(context: ModuleContext): Promise<void> {
    // Initialize database connections, services, etc.
    context.logger.info(`[${this.name}] Initializing...`);
  }

  registerRoutes(app: Express, context: ModuleContext): void {
    // Register Express routes
    app.get('/api/v1/my-feature', myFeatureController.list);
    app.post('/api/v1/my-feature', myFeatureController.create);
  }

  async registerJobs(context: ModuleContext): Promise<void> {
    // Register background jobs
    context.queue.add('my-feature-job', { ... });
  }

  async shutdown(): Promise<void> {
    // Cleanup resources
  }
}
```

#### Registering the Module

```typescript
// index.ts or module registration file
import { ModuleRegistry } from './core/modules/ModuleRegistry';
import { MyFeatureModule } from './modules/my-feature/my-feature.module';

const registry = new ModuleRegistry();
registry.register(new MyFeatureModule());
```

### Built-in Modules

| Module | Description | Dependencies |
|--------|-------------|--------------|
| **core** | Core CRM functionality (contacts, deals, tasks, notes) | - |
| **billing** | Subscription billing, invoicing, payments | core |
| **compliance** | GDPR compliance, data privacy | core |

---

## 🌐 API Structure

### REST API (v1)

Base URL: `http://localhost:3000/api/v1`

#### Core Endpoints

**Authentication**:
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with credentials
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user
- `POST /auth/refresh` - Refresh access token

**Contacts**:
- `GET /contacts` - List contacts (paginated)
- `GET /contacts/:id` - Get contact by ID
- `POST /contacts` - Create contact
- `PUT /contacts/:id` - Update contact
- `DELETE /contacts/:id` - Delete contact

**Deals**:
- `GET /deals` - List deals (paginated)
- `GET /deals/:id` - Get deal by ID
- `POST /deals` - Create deal
- `PUT /deals/:id` - Update deal
- `DELETE /deals/:id` - Delete deal

**Tasks**:
- `GET /tasks` - List tasks (paginated)
- `GET /tasks/:id` - Get task by ID
- `POST /tasks` - Create task
- `PUT /tasks/:id` - Update task
- `DELETE /tasks/:id` - Delete task

**Health & Monitoring**:
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### Authentication

The API uses **JWT Bearer tokens** for authentication:

```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "email": "user@example.com" }
}

# Authenticated Request
curl -X GET http://localhost:3000/api/v1/contacts \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Rate Limiting

- **Anonymous**: 100 requests per 15 minutes
- **Authenticated**: 1000 requests per 15 minutes
- **Burst**: 20 requests per second

### Pagination

List endpoints support pagination:

```bash
GET /api/v1/contacts?page=1&limit=20&sort=createdAt&order=desc
```

---

## 🗄️ Database

### PostgreSQL (Primary)

**Connection**: Configured via `config/database/postgres-config.ts`

**Key Tables**:
- `users` - User accounts
- `tenants` - Multi-tenant organizations
- `contacts` - CRM contacts
- `deals` - Sales deals/opportunities
- `tasks` - Task management
- `notes` - Notes and comments
- `custom_fields` - Dynamic custom fields
- `files` - File metadata
- `audit_logs` - Audit trail

**Migrations**: Located in `database/migrations/`

```bash
# Run migrations
npm run db:migrate

# Rollback migration
npm run db:rollback

# Seed data
npm run db:seed
```

### MongoDB (Flexible Schema)

**Connection**: Configured via `config/database/mongodb-config.ts`

**Collections**:
- `ai_embeddings` - Vector embeddings for search
- `analytics_events` - Event tracking
- `session_logs` - Session history

### Redis (Cache & Sessions)

**Connection**: Configured via `config/database/redis-config.ts`

**Usage**:
- Session storage
- Rate limiting
- Cache layer
- BullMQ job queue

### Elasticsearch (Search)

**Connection**: Configured via environment variables

**Indexes**:
- `contacts` - Full-text contact search
- `deals` - Deal search
- `tasks` - Task search

---

## 💻 Development Guide

### Setup

1. **Install Dependencies**:
```bash
npm install
```

2. **Configure Environment**:
```bash
# Copy environment template
cp .env.sample .env.local

# Edit .env.local with your configuration
nano .env.local
```

3. **Start Databases** (Docker):
```bash
npm run docker:dev
```

4. **Run Migrations**:
```bash
npm run db:migrate
```

5. **Seed Admin User**:
```bash
npm run seed:admin
```

6. **Start Development Server**:
```bash
npm run dev:backend
```

Server runs on `http://localhost:3000`

### Environment Variables

Required variables in `.env.local`:

```bash
# Application
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/clientforge
MONGODB_URI=mongodb://localhost:27017/clientforge
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Email (optional for dev)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your-user
SMTP_PASS=your-password
```

### Hot Reload

Development server uses `ts-node-dev` for automatic restart on file changes:

```bash
npm run dev:backend
# Server watches for changes and restarts automatically
```

### Debugging

#### VS Code Debug Configuration

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Backend",
  "runtimeArgs": ["-r", "ts-node/register"],
  "args": ["${workspaceFolder}/backend/index.ts"],
  "env": {
    "NODE_ENV": "development"
  }
}
```

#### Logging

Logs are written to:
- Console (colorized)
- `logs/combined.log` (all logs)
- `logs/error.log` (errors only)

```typescript
import { logger } from './utils/logging/logger';

logger.info('Info message');
logger.error('Error message', { error: err });
logger.debug('Debug details', { data });
```

---

## 🧪 Testing

### Test Structure

```
tests/
├── unit/              # Unit tests
│   ├── services/
│   └── utils/
├── integration/       # Integration tests
│   ├── api/
│   └── database/
└── performance/       # Load tests
    └── k6-load-test.js
```

### Running Tests

```bash
# All tests
npm test

# With coverage
npm run test:backend

# Watch mode
npm run test:watch

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# Performance tests
npm run test:performance
```

### Writing Tests

```typescript
// tests/unit/services/contact-service.spec.ts
import { ContactService } from '../../../backend/services/contact-service';

describe('ContactService', () => {
  let contactService: ContactService;

  beforeEach(() => {
    contactService = new ContactService();
  });

  it('should create a contact', async () => {
    const contact = await contactService.create({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    });

    expect(contact).toBeDefined();
    expect(contact.email).toBe('john@example.com');
  });
});
```

### Test Coverage

Target: 80% code coverage

```bash
npm run test:backend
# Coverage report in coverage/lcov-report/index.html
```

---

## 🚀 Deployment

### Build

```bash
# Compile TypeScript
npm run build:backend

# Output in dist/backend/
```

### Production Start

```bash
# Start compiled application
npm run start:backend
```

### Docker

```bash
# Build production image
npm run docker:build

# Run container
docker run -p 3000:3000 clientforge:latest
```

### Environment-Specific Configs

- **Development**: `.env.local`
- **Staging**: `.env.staging`
- **Production**: `.env.production`

### Health Checks

```bash
# Health endpoint
curl http://localhost:3000/api/v1/health

# Metrics endpoint
curl http://localhost:3000/api/v1/metrics
```

---

## 📚 Additional Resources

- [Main README](../README.md) - Project overview
- [API Documentation](../docs/api/) - Detailed API docs
- [Database Schema](../database/schemas/) - Database structure
- [Deployment Guide](../docs/deployment/) - Deployment instructions
- [Security Guide](../docs/security/) - Security best practices

---

## 🤝 Contributing

1. Follow TypeScript best practices
2. Write tests for new features
3. Update documentation
4. Follow module system patterns
5. Use ESLint and Prettier

```bash
# Lint code
npm run lint:backend

# Fix lint issues
npm run lint:fix

# Format code
npm run format
```

---

## 📝 License

Copyright © 2025 ClientForge CRM. All rights reserved.
