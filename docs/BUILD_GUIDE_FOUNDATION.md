# 🏗️ ClientForge CRM v3.0 - Foundation Build Guide

**The Universal CRM Development Roadmap**

**Last Updated**: 2025-11-05
**Version**: 3.0.0
**For**: Abstract Creatives LLC
**Status**: 🟢 Production-Ready Architecture

---

## 📋 TABLE OF CONTENTS

### 🎯 CRITICAL SECTIONS
1. [Build Philosophy & Approach](#-build-philosophy--approach)
2. [Phase-by-Phase Roadmap](#-phase-by-phase-roadmap)
3. [Foundation Layer (Phase 1)](#-phase-1-foundation-layer-weeks-1-4)
4. [Core CRM Features (Phase 2)](#-phase-2-core-crm-features-weeks-5-10)
5. [Advanced Features (Phase 3)](#-phase-3-advanced-features-weeks-11-16)
6. [AI Integration (Phase 4)](#-phase-4-ai-integration-weeks-17-22)
7. [Enterprise Scaling (Phase 5)](#-phase-5-enterprise-scaling-weeks-23-28)

### 📚 REFERENCE SECTIONS
- [Technology Stack Details](#-technology-stack-details)
- [Database Architecture](#-database-architecture)
- [API Design Standards](#-api-design-standards)
- [Security Implementation](#-security-implementation)
- [File Organization Rules](#-file-organization-rules)

---

## 🎯 BUILD PHILOSOPHY & APPROACH

### Core Principles

```typescript
interface BuildPhilosophy {
  architecture: "Modular Monolith → Microservices Ready"
  approach: "Foundation First, Features Second, AI Third"
  quality: "Production-grade from day one"
  testing: "TDD with 85%+ coverage"
  security: "Security-first, OWASP Top 10 compliance"
  scalability: "Design for 10x, build for 1x"
  documentation: "Code + Tests + Docs = Complete Feature"
}
```

### Why Modular Monolith First?

**✅ Advantages:**
- **Faster Initial Development**: Single codebase, unified deployment
- **Easier Debugging**: All code in one place during early stages
- **Lower Operational Complexity**: One database, one deployment
- **Flexible Evolution**: Extract microservices when actually needed
- **Cost Effective**: Simpler infrastructure for MVP/early stages

**📈 Migration Path:**
- **Weeks 1-12**: Pure modular monolith
- **Weeks 13-20**: Identify service boundaries
- **Weeks 21-28**: Extract first microservices (if needed)
- **Post-MVP**: Gradual extraction based on scale needs

---

## 📅 PHASE-BY-PHASE ROADMAP

### Overview Timeline

```
┌─────────────────────────────────────────────────────────────────────┐
│  PHASE 1: FOUNDATION (Weeks 1-4)                                   │
│  ✓ Infrastructure, Database, Auth, API Framework                   │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 2: CORE CRM (Weeks 5-10)                                    │
│  ✓ Contacts, Accounts, Deals, Tasks, Activities                    │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 3: ADVANCED FEATURES (Weeks 11-16)                          │
│  ✓ Campaigns, Email, Automation, Reports, Analytics                │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 4: AI INTEGRATION (Weeks 17-22)                             │
│  ✓ Albedo AI, Lead Scoring, Forecasting, NLP                       │
├─────────────────────────────────────────────────────────────────────┤
│  PHASE 5: ENTERPRISE SCALING (Weeks 23-28)                         │
│  ✓ Multi-tenancy, Microservices, Advanced Security                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ PHASE 1: FOUNDATION LAYER (Weeks 1-4)

**Goal**: Build rock-solid infrastructure that everything else depends on

### Week 1: Project Setup & Infrastructure

#### 1.1 Initialize Project Structure (Day 1-2)

**Location**: Project root

```bash
# ✅ Already complete (413 directories created)
# Verify structure
ls -la d:/clientforge-crm/

# Initialize Git repository
cd d:/clientforge-crm
git init
git add .
git commit -m "Initial commit: Project structure (413 dirs)"
```

#### 1.2 Environment Configuration (Day 2-3)

**Files to create**:

```bash
# Location: config/app/
├── app-config.ts                # Application configuration
├── environment.ts               # Environment variables handler
└── features.ts                  # Feature flags

# Location: config/database/
├── postgres-config.ts           # PostgreSQL configuration
├── mongodb-config.ts            # MongoDB configuration
├── redis-config.ts              # Redis configuration
└── connection-pools.ts          # Database connection management

# Location: config/security/
├── security-config.ts           # Security settings
├── cors-config.ts               # CORS configuration
└── rate-limit-config.ts         # Rate limiting rules
```

**Example**: [config/app/app-config.ts](config/app/app-config.ts)

```typescript
// config/app/app-config.ts
export interface AppConfig {
  env: 'development' | 'staging' | 'production'
  port: number
  apiVersion: string
  corsOrigins: string[]
  maxRequestSize: string
  requestTimeout: number
}

export const appConfig: AppConfig = {
  env: (process.env.NODE_ENV as AppConfig['env']) || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiVersion: 'v1',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3001'],
  maxRequestSize: '10mb',
  requestTimeout: 30000, // 30 seconds
}

export default appConfig
```

#### 1.3 Database Setup (Day 3-4)

**Priority Order**:
1. PostgreSQL (primary relational data)
2. Redis (caching & sessions)
3. MongoDB (logs & flexible data)
4. Elasticsearch (search - defer to Phase 3)

**Files to create**:

```bash
# Location: database/schemas/postgresql/
├── 001_core_tables.sql          # Users, roles, permissions
├── 002_crm_tables.sql           # Contacts, accounts, deals
├── 003_activity_tables.sql      # Tasks, events, notes
├── 004_campaign_tables.sql      # Campaigns, templates
└── 005_system_tables.sql        # Audit logs, settings

# Location: database/migrations/core/
├── 20250105_001_create_users_table.ts
├── 20250105_002_create_roles_permissions.ts
└── README.md                    # Migration documentation

# Location: database/models/
├── user.model.ts
├── role.model.ts
└── index.ts
```

**Database Schema Priority** (Week 1):

```sql
-- 001_core_tables.sql
-- Location: database/schemas/postgresql/001_core_tables.sql

-- Users Table (Multi-tenant)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;

-- Tenants Table (Multi-tenancy Core)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  plan_type VARCHAR(50) NOT NULL, -- starter, professional, enterprise
  max_users INTEGER NOT NULL DEFAULT 5,
  max_storage_gb INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE deleted_at IS NULL;

-- Roles & Permissions (RBAC)
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_role_per_tenant UNIQUE (tenant_id, name)
);

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(100) NOT NULL, -- contacts, deals, reports, etc.
  action VARCHAR(50) NOT NULL,    -- create, read, update, delete, export
  description TEXT,
  CONSTRAINT unique_permission UNIQUE (resource, action)
);

CREATE TABLE role_permissions (
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

#### 1.4 Docker Configuration (Day 4-5)

**Files to create**:

```bash
# Location: deployment/docker/development/
├── docker-compose.yml           # All services for local dev
├── Dockerfile.backend          # Backend container
├── Dockerfile.frontend         # Frontend container
└── .dockerignore               # Docker ignore patterns

# Location: deployment/docker/production/
├── docker-compose.prod.yml     # Production services
├── Dockerfile.prod             # Optimized production build
└── nginx.conf                  # Nginx configuration
```

**Example**: [deployment/docker/development/docker-compose.yml](deployment/docker/development/docker-compose.yml)

```yaml
# deployment/docker/development/docker-compose.yml
version: '3.9'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: clientforge-postgres
    environment:
      POSTGRES_DB: clientforge_crm
      POSTGRES_USER: crm_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD:-dev_password_change_in_prod}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schemas:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crm_admin"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: clientforge-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # MongoDB (Logs & Flexible Data)
  mongodb:
    image: mongo:6
    container_name: clientforge-mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD:-dev_password_change_in_prod}
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: ../../../
      dockerfile: deployment/docker/development/Dockerfile.backend
    container_name: clientforge-backend
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://crm_admin:${DB_PASSWORD:-dev_password_change_in_prod}@postgres:5432/clientforge_crm
      REDIS_URL: redis://redis:6379
      MONGODB_URL: mongodb://admin:${MONGO_PASSWORD:-dev_password_change_in_prod}@mongodb:27017/clientforge_logs?authSource=admin
    ports:
      - "3000:3000"
    volumes:
      - ../../../backend:/app/backend
      - /app/node_modules
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      mongodb:
        condition: service_healthy
    command: npm run dev

  # Frontend Web App
  frontend:
    build:
      context: ../../../
      dockerfile: deployment/docker/development/Dockerfile.frontend
    container_name: clientforge-frontend
    environment:
      NODE_ENV: development
      REACT_APP_API_URL: http://localhost:3000/api/v1
      REACT_APP_WS_URL: ws://localhost:3000
    ports:
      - "3001:3001"
    volumes:
      - ../../../frontend:/app/frontend
      - /app/node_modules
    depends_on:
      - backend
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
  mongo_data:
```

### Week 2: Authentication & Authorization

#### 2.1 Authentication System (Day 6-8)

**Files to create**:

```bash
# Location: backend/core/auth/
├── auth-controller.ts           # Login, register, logout endpoints
├── auth-service.ts              # Business logic
├── auth-repository.ts           # Database operations
├── jwt-service.ts               # JWT token management
├── password-service.ts          # Password hashing/validation
├── session-service.ts           # Session management (Redis)
└── auth-validators.ts           # Input validation

# Location: backend/middleware/
├── authenticate.ts              # JWT verification middleware
├── authorize.ts                 # Permission checking middleware
├── rate-limit.ts               # Rate limiting middleware
└── validate-request.ts         # Input validation middleware

# Location: tests/unit/auth/
├── auth-service.test.ts
├── jwt-service.test.ts
└── password-service.test.ts
```

**Example**: [backend/core/auth/auth-service.ts](backend/core/auth/auth-service.ts)

```typescript
// backend/core/auth/auth-service.ts
import bcrypt from 'bcrypt'
import { AppError } from '../../utils/errors/app-error'
import { UserRepository } from '../users/user-repository'
import { JwtService } from './jwt-service'
import { SessionService } from './session-service'
import { AuditLogger } from '../../utils/logging/audit-logger'

export interface LoginCredentials {
  email: string
  password: string
  tenantId: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    role: string
  }
}

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private jwtService: JwtService,
    private sessionService: SessionService,
    private auditLogger: AuditLogger
  ) {}

  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { email, password, tenantId } = credentials

    // Find user by email and tenant
    const user = await this.userRepository.findByEmailAndTenant(email, tenantId)

    if (!user) {
      await this.auditLogger.logFailedLogin(email, tenantId, 'User not found')
      throw new AppError('Invalid credentials', 401)
    }

    // Check if account is locked
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      await this.auditLogger.logFailedLogin(email, tenantId, 'Account locked')
      throw new AppError('Account is temporarily locked. Please try again later.', 403)
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)

    if (!isPasswordValid) {
      await this.handleFailedLogin(user.id, email, tenantId)
      throw new AppError('Invalid credentials', 401)
    }

    // Check if user is active
    if (!user.isActive || user.deletedAt) {
      await this.auditLogger.logFailedLogin(email, tenantId, 'Account inactive')
      throw new AppError('Account is not active', 403)
    }

    // Reset failed login attempts
    await this.userRepository.resetFailedLoginAttempts(user.id)

    // Generate tokens
    const accessToken = this.jwtService.generateAccessToken({
      userId: user.id,
      tenantId: user.tenantId,
      roleId: user.roleId,
    })

    const refreshToken = this.jwtService.generateRefreshToken({
      userId: user.id,
      tenantId: user.tenantId,
    })

    // Store session in Redis
    await this.sessionService.createSession(user.id, refreshToken, {
      userAgent: 'TODO: Extract from request',
      ipAddress: 'TODO: Extract from request',
    })

    // Update last login timestamp
    await this.userRepository.updateLastLogin(user.id)

    // Audit log
    await this.auditLogger.logSuccessfulLogin(user.id, email, tenantId)

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
    }
  }

  private async handleFailedLogin(userId: string, email: string, tenantId: string): Promise<void> {
    const failedAttempts = await this.userRepository.incrementFailedLoginAttempts(userId)

    // Lock account after 5 failed attempts for 15 minutes
    if (failedAttempts >= 5) {
      const lockUntil = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
      await this.userRepository.lockAccount(userId, lockUntil)
      await this.auditLogger.logAccountLocked(userId, email, tenantId, failedAttempts)
    }

    await this.auditLogger.logFailedLogin(email, tenantId, 'Invalid password', failedAttempts)
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    await this.sessionService.deleteSession(userId, refreshToken)
    await this.auditLogger.logLogout(userId)
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    // Verify refresh token
    const payload = this.jwtService.verifyRefreshToken(refreshToken)

    // Check if session exists in Redis
    const sessionExists = await this.sessionService.sessionExists(payload.userId, refreshToken)

    if (!sessionExists) {
      throw new AppError('Invalid or expired refresh token', 401)
    }

    // Generate new access token
    const accessToken = this.jwtService.generateAccessToken({
      userId: payload.userId,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
    })

    return { accessToken }
  }
}
```

#### 2.2 Authorization System (Day 8-10)

**Files to create**:

```bash
# Location: backend/core/permissions/
├── permission-service.ts        # Check user permissions
├── permission-repository.ts     # Database operations
├── rbac-service.ts             # Role-based access control
└── permission-decorators.ts    # @RequirePermission decorator

# Location: backend/middleware/
└── check-permissions.ts        # Permission middleware factory
```

**Example**: [backend/middleware/check-permissions.ts](backend/middleware/check-permissions.ts)

```typescript
// backend/middleware/check-permissions.ts
import { Request, Response, NextFunction } from 'express'
import { AppError } from '../utils/errors/app-error'
import { PermissionService } from '../core/permissions/permission-service'

export interface AuthRequest extends Request {
  user?: {
    userId: string
    tenantId: string
    roleId: string
  }
}

export const requirePermission = (resource: string, action: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError('Authentication required', 401)
      }

      const permissionService = new PermissionService()
      const hasPermission = await permissionService.checkPermission(
        req.user.roleId,
        resource,
        action
      )

      if (!hasPermission) {
        throw new AppError(
          `Permission denied: ${action} on ${resource}`,
          403
        )
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

// Usage in routes:
// router.post('/contacts', authenticate, requirePermission('contacts', 'create'), createContact)
```

### Week 3: API Framework & Core Infrastructure

#### 3.1 Express Server Setup (Day 11-13)

**Files to create**:

```bash
# Location: backend/api/
├── server.ts                    # Express server initialization
├── app.ts                       # Express app configuration
└── routes.ts                    # Route registration

# Location: backend/api/rest/v1/
├── index.ts                     # API v1 entry point
├── auth-routes.ts              # /api/v1/auth
├── users-routes.ts             # /api/v1/users
├── contacts-routes.ts          # /api/v1/contacts (Phase 2)
└── health-routes.ts            # /api/v1/health

# Location: backend/utils/errors/
├── app-error.ts                # Custom error class
├── error-handler.ts            # Global error handler
└── error-codes.ts              # Standard error codes
```

**Example**: [backend/api/server.ts](backend/api/server.ts)

```typescript
// backend/api/server.ts
import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'
import { createServer } from 'http'
import { configureRoutes } from './routes'
import { errorHandler } from '../utils/errors/error-handler'
import { logger } from '../utils/logging/logger'
import { appConfig } from '../../config/app/app-config'
import { corsConfig } from '../../config/security/cors-config'
import { rateLimitMiddleware } from '../middleware/rate-limit'

export class Server {
  private app: express.Application
  private httpServer: any

  constructor() {
    this.app = express()
    this.httpServer = createServer(this.app)
    this.configureMiddleware()
    this.configureRoutes()
    this.configureErrorHandling()
  }

  private configureMiddleware(): void {
    // Security headers
    this.app.use(helmet())

    // CORS
    this.app.use(cors(corsConfig))

    // Body parsing
    this.app.use(express.json({ limit: appConfig.maxRequestSize }))
    this.app.use(express.urlencoded({ extended: true, limit: appConfig.maxRequestSize }))

    // Compression
    this.app.use(compression())

    // Rate limiting
    this.app.use(rateLimitMiddleware)

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })
      next()
    })
  }

  private configureRoutes(): void {
    configureRoutes(this.app)
  }

  private configureErrorHandling(): void {
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Route not found',
        },
      })
    })

    // Global error handler
    this.app.use(errorHandler)
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(appConfig.port, () => {
        logger.info(`🚀 Server running on port ${appConfig.port}`)
        logger.info(`📝 Environment: ${appConfig.env}`)
        logger.info(`🔗 API Version: ${appConfig.apiVersion}`)
        resolve()
      })
    })
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer.close((err: Error) => {
        if (err) {
          reject(err)
        } else {
          logger.info('Server stopped')
          resolve()
        }
      })
    })
  }
}

// Start server
if (require.main === module) {
  const server = new Server()
  server.start().catch((error) => {
    logger.error('Failed to start server', error)
    process.exit(1)
  })
}
```

#### 3.2 Logging & Monitoring (Day 13-14)

**Files to create**:

```bash
# Location: backend/utils/logging/
├── logger.ts                    # Winston logger setup
├── audit-logger.ts             # Audit trail logging
└── performance-logger.ts       # Performance metrics

# Location: monitoring/logging/
├── log-aggregation.ts          # Log aggregation config
└── log-retention-policy.md     # Log retention rules
```

### Week 4: Testing Infrastructure & DevOps

#### 4.1 Testing Framework (Day 15-17)

**Files to create**:

```bash
# Location: tests/
├── setup.ts                     # Test environment setup
├── teardown.ts                 # Test cleanup
└── jest.config.js              # Jest configuration

# Location: tests/unit/
├── auth/
│   ├── auth-service.test.ts
│   ├── jwt-service.test.ts
│   └── password-service.test.ts
└── utils/
    └── logger.test.ts

# Location: tests/integration/
├── auth/
│   └── auth-flow.test.ts
└── setup-test-db.ts

# Location: tests/e2e/
├── auth/
│   └── login-flow.spec.ts
└── playwright.config.ts
```

**Example**: [tests/unit/auth/auth-service.test.ts](tests/unit/auth/auth-service.test.ts)

```typescript
// tests/unit/auth/auth-service.test.ts
import { AuthService } from '../../../backend/core/auth/auth-service'
import { UserRepository } from '../../../backend/core/users/user-repository'
import { JwtService } from '../../../backend/core/auth/jwt-service'
import { SessionService } from '../../../backend/core/auth/session-service'
import { AuditLogger } from '../../../backend/utils/logging/audit-logger'
import { AppError } from '../../../backend/utils/errors/app-error'

describe('AuthService', () => {
  let authService: AuthService
  let userRepository: jest.Mocked<UserRepository>
  let jwtService: jest.Mocked<JwtService>
  let sessionService: jest.Mocked<SessionService>
  let auditLogger: jest.Mocked<AuditLogger>

  beforeEach(() => {
    userRepository = {
      findByEmailAndTenant: jest.fn(),
      resetFailedLoginAttempts: jest.fn(),
      updateLastLogin: jest.fn(),
      incrementFailedLoginAttempts: jest.fn(),
      lockAccount: jest.fn(),
    } as any

    jwtService = {
      generateAccessToken: jest.fn(),
      generateRefreshToken: jest.fn(),
      verifyRefreshToken: jest.fn(),
    } as any

    sessionService = {
      createSession: jest.fn(),
      deleteSession: jest.fn(),
      sessionExists: jest.fn(),
    } as any

    auditLogger = {
      logSuccessfulLogin: jest.fn(),
      logFailedLogin: jest.fn(),
      logAccountLocked: jest.fn(),
      logLogout: jest.fn(),
    } as any

    authService = new AuthService(
      userRepository,
      jwtService,
      sessionService,
      auditLogger
    )
  })

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$hashedpassword',
        tenantId: 'tenant-123',
        roleId: 'role-123',
        isActive: true,
        firstName: 'John',
        lastName: 'Doe',
        role: { name: 'Admin' },
        lockedUntil: null,
        deletedAt: null,
      }

      userRepository.findByEmailAndTenant.mockResolvedValue(mockUser)
      jwtService.generateAccessToken.mockReturnValue('access-token')
      jwtService.generateRefreshToken.mockReturnValue('refresh-token')

      const result = await authService.login({
        email: 'test@example.com',
        password: 'ValidPassword123!',
        tenantId: 'tenant-123',
      })

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-123',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'Admin',
        },
      })

      expect(userRepository.resetFailedLoginAttempts).toHaveBeenCalledWith('user-123')
      expect(sessionService.createSession).toHaveBeenCalled()
      expect(auditLogger.logSuccessfulLogin).toHaveBeenCalled()
    })

    it('should throw error for invalid credentials', async () => {
      userRepository.findByEmailAndTenant.mockResolvedValue(null)

      await expect(
        authService.login({
          email: 'invalid@example.com',
          password: 'WrongPassword',
          tenantId: 'tenant-123',
        })
      ).rejects.toThrow(AppError)

      expect(auditLogger.logFailedLogin).toHaveBeenCalled()
    })

    it('should lock account after 5 failed login attempts', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        passwordHash: '$2b$12$differenthash',
        tenantId: 'tenant-123',
        isActive: true,
        lockedUntil: null,
      }

      userRepository.findByEmailAndTenant.mockResolvedValue(mockUser)
      userRepository.incrementFailedLoginAttempts.mockResolvedValue(5)

      await expect(
        authService.login({
          email: 'test@example.com',
          password: 'WrongPassword',
          tenantId: 'tenant-123',
        })
      ).rejects.toThrow(AppError)

      expect(userRepository.lockAccount).toHaveBeenCalled()
      expect(auditLogger.logAccountLocked).toHaveBeenCalled()
    })
  })
})
```

#### 4.2 CI/CD Pipeline (Day 18-19)

**Files to create**:

```bash
# Location: .github/workflows/
├── ci.yml                       # Continuous Integration
├── deploy-dev.yml              # Deploy to dev environment
├── deploy-staging.yml          # Deploy to staging
└── deploy-production.yml       # Deploy to production
```

#### 4.3 Documentation & Phase 1 Review (Day 20)

**Tasks**:
1. Update [docs/00_MAP.md](docs/00_MAP.md) with Phase 1 completions
2. Create session log in [logs/session-logs/](logs/session-logs/)
3. Update [CHANGELOG.md](CHANGELOG.md) with Phase 1 features
4. Review code quality (run lint, tests, security scan)
5. Conduct team review of foundation

---

## 🏢 PHASE 2: CORE CRM FEATURES (Weeks 5-10)

**Goal**: Build essential CRM functionality - the heart of the system

### Week 5: Contacts Module

#### 5.1 Database Schema (Day 21-22)

**Files to create**:

```bash
# Location: database/schemas/postgresql/
└── 002_crm_tables.sql           # Contacts, companies, custom fields

# Location: database/migrations/core/
└── 20250105_010_create_contacts.ts
```

**Schema**:

```sql
-- Contacts Table
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  account_id UUID,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  mobile VARCHAR(50),
  title VARCHAR(100),
  department VARCHAR(100),
  lead_source VARCHAR(100),
  lead_status VARCHAR(50), -- new, contacted, qualified, unqualified
  lifecycle_stage VARCHAR(50), -- lead, mql, sql, opportunity, customer
  lead_score INTEGER DEFAULT 0,
  tags TEXT[],
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_postal_code VARCHAR(20),
  address_country VARCHAR(100),
  social_linkedin VARCHAR(255),
  social_twitter VARCHAR(255),
  social_facebook VARCHAR(255),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  last_contacted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT fk_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_lead_status ON contacts(lead_status);
CREATE INDEX idx_contacts_lifecycle_stage ON contacts(lifecycle_stage);
CREATE INDEX idx_contacts_lead_score ON contacts(lead_score DESC);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);

-- Accounts/Companies Table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  industry VARCHAR(100),
  company_size VARCHAR(50), -- 1-10, 11-50, 51-200, 201-500, 500+
  annual_revenue DECIMAL(15, 2),
  phone VARCHAR(50),
  email VARCHAR(255),
  address_street VARCHAR(255),
  address_city VARCHAR(100),
  address_state VARCHAR(100),
  address_postal_code VARCHAR(20),
  address_country VARCHAR(100),
  description TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX idx_accounts_owner_id ON accounts(owner_id);
CREATE INDEX idx_accounts_name ON accounts(name);

-- Custom Fields (Flexible metadata)
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- contacts, accounts, deals
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL, -- text, number, date, boolean, select, multi-select
  field_options JSONB, -- For select/multi-select types
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_field_per_entity UNIQUE (tenant_id, entity_type, field_name)
);

CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  custom_field_id UUID NOT NULL,
  value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_field FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE,
  CONSTRAINT unique_field_value UNIQUE (entity_type, entity_id, custom_field_id)
);

CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
```

#### 5.2 Backend Implementation (Day 23-25)

**Files to create**:

```bash
# Location: backend/core/contacts/
├── contact-controller.ts        # HTTP endpoints
├── contact-service.ts          # Business logic
├── contact-repository.ts       # Database operations
├── contact-validators.ts       # Input validation schemas
└── contact-types.ts            # TypeScript interfaces

# Location: backend/api/rest/v1/
└── contacts-routes.ts          # Route definitions
```

**API Endpoints**:

```typescript
// GET    /api/v1/contacts                 - List contacts (paginated)
// POST   /api/v1/contacts                 - Create contact
// GET    /api/v1/contacts/:id             - Get single contact
// PUT    /api/v1/contacts/:id             - Update contact
// DELETE /api/v1/contacts/:id             - Delete contact (soft)
// GET    /api/v1/contacts/:id/activities  - Get contact activities
// POST   /api/v1/contacts/:id/notes       - Add note to contact
// GET    /api/v1/contacts/search          - Search contacts
// POST   /api/v1/contacts/bulk            - Bulk create
// PUT    /api/v1/contacts/bulk            - Bulk update
// DELETE /api/v1/contacts/bulk            - Bulk delete
```

### Week 6: Deals/Opportunities Module

#### 6.1 Database Schema (Day 26-27)

```sql
-- Deals/Opportunities Table
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  account_id UUID,
  contact_id UUID,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  stage VARCHAR(50) NOT NULL, -- prospecting, qualification, proposal, negotiation, closed_won, closed_lost
  probability INTEGER DEFAULT 0, -- 0-100
  expected_close_date DATE,
  actual_close_date DATE,
  lead_source VARCHAR(100),
  next_step TEXT,
  description TEXT,
  tags TEXT[],
  is_closed BOOLEAN DEFAULT false,
  is_won BOOLEAN,
  lost_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT fk_account FOREIGN KEY (account_id) REFERENCES accounts(id),
  CONSTRAINT fk_contact FOREIGN KEY (contact_id) REFERENCES contacts(id)
);

CREATE INDEX idx_deals_tenant_id ON deals(tenant_id);
CREATE INDEX idx_deals_owner_id ON deals(owner_id);
CREATE INDEX idx_deals_stage ON deals(stage);
CREATE INDEX idx_deals_close_date ON deals(expected_close_date);
CREATE INDEX idx_deals_amount ON deals(amount DESC);

-- Deal Stages (Customizable pipeline)
CREATE TABLE deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pipeline_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL,
  probability INTEGER DEFAULT 0,
  is_closed_stage BOOLEAN DEFAULT false,
  is_won_stage BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
);

CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);
```

### Week 7-8: Tasks & Activities Module

**Continue pattern from Contacts & Deals...**

---

## 🚀 PHASE 3: ADVANCED FEATURES (Weeks 11-16)

**Goal**: Add campaign management, automation, and reporting

### Week 11-12: Email Campaign Management

#### 11.1 Email Templates & Builder (Day 46-48)

**Database Schema**:

```sql
-- Email Templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  plain_text_content TEXT,
  thumbnail_url VARCHAR(500),
  category VARCHAR(100), -- newsletter, promotional, transactional
  variables JSONB, -- Dynamic variables like {{first_name}}
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Email Campaigns
CREATE TABLE email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  template_id UUID,
  status VARCHAR(50) DEFAULT 'draft', -- draft, scheduled, sending, sent, paused, cancelled
  send_type VARCHAR(50), -- immediate, scheduled, triggered
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  from_name VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  reply_to_email VARCHAR(255),
  total_recipients INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_bounced INTEGER DEFAULT 0,
  total_unsubscribed INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_template FOREIGN KEY (template_id) REFERENCES email_templates(id)
);

-- Campaign Recipients
CREATE TABLE campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL,
  contact_id UUID NOT NULL,
  status VARCHAR(50), -- pending, sent, delivered, opened, clicked, bounced, unsubscribed
  sent_at TIMESTAMP,
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP,
  bounced_at TIMESTAMP,
  bounce_reason TEXT,
  unsubscribed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_campaign FOREIGN KEY (campaign_id) REFERENCES email_campaigns(id) ON DELETE CASCADE,
  CONSTRAINT fk_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
```

**Files to Create**:

```bash
# Location: backend/core/campaigns/
├── campaign-controller.ts
├── campaign-service.ts
├── campaign-repository.ts
├── email-template-service.ts
├── email-sender-service.ts      # Integration with SendGrid/AWS SES
└── campaign-analytics-service.ts
```

#### 11.2 A/B Testing (Day 48-50)

**Features**:
- Split test subject lines
- Split test email content
- Automatic winner selection
- Statistical significance calculation

### Week 13-14: Workflow Automation

#### 13.1 Workflow Builder (Day 51-54)

**Database Schema**:

```sql
-- Workflows
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_type VARCHAR(100) NOT NULL, -- contact_created, deal_stage_changed, form_submitted, etc.
  trigger_config JSONB,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Workflow Actions
CREATE TABLE workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  action_type VARCHAR(100) NOT NULL, -- send_email, create_task, update_field, wait, condition
  action_config JSONB NOT NULL,
  position INTEGER NOT NULL,
  parent_action_id UUID, -- For branching/conditional logic
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
  CONSTRAINT fk_parent_action FOREIGN KEY (parent_action_id) REFERENCES workflow_actions(id)
);

-- Workflow Executions
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- contact, deal, etc.
  entity_id UUID NOT NULL,
  status VARCHAR(50) DEFAULT 'running', -- running, completed, failed, cancelled
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,
  CONSTRAINT fk_workflow FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE
);
```

**Features**:
- Visual workflow builder (drag-and-drop)
- Trigger events (contact created, deal stage changed, etc.)
- Actions (send email, create task, update field, wait)
- Conditional branching
- Delay/wait actions

### Week 15-16: Custom Reports & Analytics

#### 15.1 Report Builder (Day 56-59)

**Database Schema**:

```sql
-- Custom Reports
CREATE TABLE custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(100) NOT NULL, -- table, chart, pivot
  entity_type VARCHAR(100) NOT NULL, -- contacts, deals, activities
  filters JSONB,
  columns JSONB,
  grouping JSONB,
  sorting JSONB,
  chart_config JSONB,
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Dashboards
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  layout JSONB, -- Grid layout configuration
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Dashboard Widgets
CREATE TABLE dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL,
  report_id UUID,
  widget_type VARCHAR(100) NOT NULL, -- chart, metric, table, list
  title VARCHAR(255),
  config JSONB,
  position_x INTEGER NOT NULL,
  position_y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_dashboard FOREIGN KEY (dashboard_id) REFERENCES dashboards(id) ON DELETE CASCADE,
  CONSTRAINT fk_report FOREIGN KEY (report_id) REFERENCES custom_reports(id)
);
```

**Features**:
- Drag-and-drop report builder
- Multiple chart types (line, bar, pie, funnel)
- Custom filters and grouping
- Scheduled report emails
- Export to PDF/Excel
- Real-time dashboard updates

---

## 🤖 PHASE 4: AI INTEGRATION (Weeks 17-22)

**Goal**: Integrate Albedo AI companion and ML features

### Week 17-18: Lead Scoring ML Model

#### 17.1 ML Model Development (Day 61-64)

**Database Schema**:

```sql
-- ML Models
CREATE TABLE ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  model_type VARCHAR(100) NOT NULL, -- lead_scoring, forecast, churn_prediction
  version VARCHAR(50) NOT NULL,
  algorithm VARCHAR(100), -- random_forest, gradient_boosting, neural_network
  training_data_start_date TIMESTAMP,
  training_data_end_date TIMESTAMP,
  accuracy_score DECIMAL(5, 4),
  precision_score DECIMAL(5, 4),
  recall_score DECIMAL(5, 4),
  f1_score DECIMAL(5, 4),
  is_active BOOLEAN DEFAULT false,
  model_file_path VARCHAR(500),
  feature_importance JSONB,
  hyperparameters JSONB,
  trained_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Lead Scores
CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  model_id UUID NOT NULL,
  score INTEGER NOT NULL, -- 0-100
  confidence DECIMAL(5, 4),
  factors JSONB, -- Which factors contributed to the score
  predicted_conversion_probability DECIMAL(5, 4),
  predicted_revenue DECIMAL(15, 2),
  scored_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES ml_models(id)
);

CREATE INDEX idx_lead_scores_contact ON lead_scores(contact_id);
CREATE INDEX idx_lead_scores_score ON lead_scores(score DESC);
```

**Files to Create**:

```bash
# Location: ai/ml-models/lead-scoring/
├── train-lead-scoring-model.py  # Model training script
├── predict-lead-score.py        # Prediction service
├── evaluate-model.py            # Model evaluation
├── feature-engineering.py       # Feature extraction
└── model-registry.py            # Model versioning

# Location: backend/core/ai/
├── lead-scoring-service.ts      # Score calculation API
├── model-service.ts             # ML model management
└── feature-service.ts           # Feature extraction
```

**Features**:
- Automated lead scoring (0-100)
- Feature importance analysis
- Real-time score updates
- Model retraining pipeline
- A/B testing for models

#### 17.2 Feature Engineering (Day 64-66)

**Key Features**:
- Engagement score (email opens, clicks, website visits)
- Demographic fit (industry, company size, title)
- Behavioral patterns (time since last interaction)
- Pipeline velocity (days in each stage)
- Historical conversion data

### Week 19-20: Sales Forecasting

#### 19.1 Forecast Engine (Day 67-70)

**Database Schema**:

```sql
-- Sales Forecasts
CREATE TABLE sales_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  user_id UUID, -- NULL for company-wide forecast
  team_id UUID,
  forecast_period VARCHAR(50), -- month, quarter, year
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  forecasted_revenue DECIMAL(15, 2) NOT NULL,
  confidence_interval_low DECIMAL(15, 2),
  confidence_interval_high DECIMAL(15, 2),
  actual_revenue DECIMAL(15, 2),
  accuracy_percentage DECIMAL(5, 2),
  model_id UUID,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_model FOREIGN KEY (model_id) REFERENCES ml_models(id)
);

-- Forecast Breakdown
CREATE TABLE forecast_breakdown (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_id UUID NOT NULL,
  deal_id UUID,
  expected_close_date DATE,
  forecasted_amount DECIMAL(15, 2),
  confidence_percentage DECIMAL(5, 2),
  CONSTRAINT fk_forecast FOREIGN KEY (forecast_id) REFERENCES sales_forecasts(id) ON DELETE CASCADE,
  CONSTRAINT fk_deal FOREIGN KEY (deal_id) REFERENCES deals(id)
);
```

**Features**:
- Revenue forecasting by user/team/company
- Time-series analysis (ARIMA, Prophet)
- Seasonality detection
- Confidence intervals
- Forecast vs actual tracking

### Week 21-22: Albedo AI Companion (NLP)

#### 21.1 Natural Language Interface (Day 71-75)

**Database Schema**:

```sql
-- AI Conversations
CREATE TABLE ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  title VARCHAR(255),
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id),
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- AI Messages
CREATE TABLE ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  role VARCHAR(50) NOT NULL, -- user, assistant, system
  content TEXT NOT NULL,
  intent VARCHAR(100), -- search_contacts, create_deal, generate_report
  entities JSONB, -- Extracted entities (names, dates, amounts)
  action_taken JSONB, -- What action was performed
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_conversation FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id);
```

**Files to Create**:

```bash
# Location: ai/nlp/
├── intent-classifier.py         # Classify user intent
├── entity-extractor.py          # Extract entities (NER)
├── query-generator.py           # Generate SQL from NL
├── response-generator.py        # Generate natural responses
└── conversation-manager.py      # Manage conversation context

# Location: backend/core/ai/
├── albedo-service.ts           # Main AI service
├── nlp-service.ts              # NLP integration
└── conversation-service.ts     # Conversation management
```

**Features**:
- Natural language queries ("Show me top deals closing this month")
- Entity recognition (contact names, dates, amounts)
- Intent classification (search, create, update, analyze)
- Context-aware conversations
- Action execution (create contacts, update deals)
- Smart suggestions and insights

#### 21.2 AI-Powered Insights (Day 75-77)

**Features**:
- Anomaly detection (unusual deal patterns)
- Churn risk prediction
- Next best action recommendations
- Email sentiment analysis
- Automated data enrichment
- Smart field suggestions

---

## 🌐 PHASE 5: ENTERPRISE SCALING (Weeks 23-28)

**Goal**: Scale to microservices and enterprise features

### Week 23-24: Microservices Extraction

#### 23.1 Service Identification (Day 78-80)

**Services to Extract**:

1. **Auth Service** (High Priority)
   - User authentication
   - Session management
   - Permission checking
   - **Why**: Shared across all services, security-critical

2. **Email Service** (High Priority)
   - Campaign sending
   - Transactional emails
   - Email tracking
   - **Why**: Resource-intensive, can be scaled independently

3. **AI/ML Service** (Medium Priority)
   - Lead scoring
   - Forecasting
   - NLP processing
   - **Why**: Compute-intensive, different tech stack (Python)

4. **Analytics Service** (Medium Priority)
   - Report generation
   - Data aggregation
   - Real-time dashboards
   - **Why**: Heavy read operations, caching benefits

5. **File Storage Service** (Low Priority)
   - Document uploads
   - File processing
   - CDN integration
   - **Why**: Can be deferred, S3 handles most of this

**Migration Strategy**:

```typescript
// Phase 1: Strangler Pattern
// Keep monolith, route specific requests to new service

// Phase 2: Dual Write
// Write to both monolith and new service for data consistency

// Phase 3: Read from New Service
// Switch reads to new service, validate consistency

// Phase 4: Deprecate Monolith Code
// Remove old code from monolith
```

#### 23.2 API Gateway Setup (Day 80-82)

**Files to Create**:

```bash
# Location: services/api-gateway/
├── gateway.ts                   # API Gateway entry point
├── rate-limiter.ts              # Rate limiting
├── load-balancer.ts             # Service load balancing
├── circuit-breaker.ts           # Fault tolerance
└── service-registry.ts          # Service discovery

# Location: deployment/kubernetes/
├── api-gateway-deployment.yaml
├── auth-service-deployment.yaml
├── email-service-deployment.yaml
└── ingress.yaml
```

**Technology Stack**:
- API Gateway: Kong or AWS API Gateway
- Service Mesh: Istio (for advanced deployments)
- Load Balancer: Nginx or AWS ALB
- Service Discovery: Consul or Kubernetes DNS

### Week 25-26: Advanced Security & Compliance

#### 25.1 Enterprise SSO (Day 83-86)

**Features**:
- SAML 2.0 integration
- OAuth 2.0 / OpenID Connect
- Active Directory integration
- Okta/Auth0 integration
- Multi-factor authentication (MFA)
- Biometric authentication

**Database Schema**:

```sql
-- SSO Providers
CREATE TABLE sso_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  provider_type VARCHAR(50) NOT NULL, -- saml, oauth, oidc
  provider_name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- MFA Settings
CREATE TABLE mfa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  mfa_type VARCHAR(50) NOT NULL, -- totp, sms, email, biometric
  secret_key VARCHAR(255),
  backup_codes TEXT[],
  is_enabled BOOLEAN DEFAULT false,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 25.2 Compliance & Data Governance (Day 86-88)

**Features**:
- GDPR compliance (data export, right to be forgotten)
- SOC 2 compliance
- HIPAA compliance (if healthcare)
- Data retention policies
- Audit trail encryption
- Data anonymization

**Files to Create**:

```bash
# Location: backend/core/compliance/
├── gdpr-service.ts              # GDPR operations
├── data-export-service.ts       # Data portability
├── data-deletion-service.ts     # Right to be forgotten
├── retention-policy-service.ts  # Automated data cleanup
└── audit-encryption-service.ts  # Encrypted audit logs
```

### Week 27-28: Performance Optimization & Monitoring

#### 27.1 Performance Optimization (Day 89-92)

**Optimization Strategies**:

1. **Database Optimization**
   - Query optimization (EXPLAIN ANALYZE)
   - Index optimization
   - Connection pooling tuning
   - Read replicas for reporting
   - Partitioning large tables

2. **Caching Strategy**
   - Redis caching (hot data)
   - CDN caching (static assets)
   - API response caching
   - Database query caching
   - Browser caching headers

3. **Frontend Optimization**
   - Code splitting
   - Lazy loading
   - Image optimization (WebP, lazy load)
   - Bundle size reduction
   - Service worker caching

4. **API Optimization**
   - GraphQL for flexible queries
   - Pagination (cursor-based)
   - Field filtering
   - Rate limiting per tenant
   - Compression (gzip/brotli)

**Performance Budgets**:

```typescript
interface PerformanceBudgets {
  api: {
    p50: '<100ms',
    p95: '<200ms',
    p99: '<500ms'
  },
  pageLoad: {
    fcp: '<1.5s',   // First Contentful Paint
    lcp: '<2.5s',   // Largest Contentful Paint
    tti: '<3.5s',   // Time to Interactive
    cls: '<0.1'     // Cumulative Layout Shift
  },
  database: {
    queryTime: '<50ms',
    connectionTime: '<10ms'
  }
}
```

#### 27.2 Monitoring & Observability (Day 92-94)

**Monitoring Stack**:

```bash
# Location: monitoring/
├── prometheus/
│   ├── prometheus.yml           # Metrics collection
│   └── alert-rules.yml          # Alert definitions
├── grafana/
│   ├── dashboards/
│   │   ├── api-metrics.json
│   │   ├── database-metrics.json
│   │   └── business-metrics.json
│   └── datasources.yml
├── elasticsearch/
│   └── log-aggregation.yml      # Centralized logging
└── jaeger/
    └── distributed-tracing.yml  # Request tracing
```

**Metrics to Track**:

1. **System Metrics**
   - CPU usage
   - Memory usage
   - Disk I/O
   - Network throughput

2. **Application Metrics**
   - Request rate
   - Error rate
   - Response time (p50, p95, p99)
   - Active connections

3. **Business Metrics**
   - New signups
   - Active users (DAU/MAU)
   - Revenue metrics
   - Feature usage

4. **Database Metrics**
   - Query performance
   - Connection pool utilization
   - Cache hit rate
   - Slow query log

**Files to Create**:

```bash
# Location: backend/utils/monitoring/
├── metrics-collector.ts         # Prometheus metrics
├── logger.ts                    # Structured logging
├── tracer.ts                    # Distributed tracing
└── health-checker.ts            # Service health

# Location: monitoring/alerting/
├── alert-manager.yml            # Alert routing
├── pagerduty-integration.yml    # On-call alerts
└── slack-notifications.yml      # Team notifications
```

**Alerts to Configure**:

```yaml
# Critical Alerts (Page immediately)
- High error rate (>1%)
- API response time >500ms (p95)
- Database connection failures
- Disk usage >90%
- Service down

# Warning Alerts (Notify, don't page)
- Error rate >0.5%
- API response time >300ms (p95)
- Memory usage >80%
- Disk usage >75%
- Slow queries detected
```

---

## 📚 TECHNOLOGY STACK DETAILS

### Frontend Stack

**Core Framework**:
- **React 18.2+** - UI framework with concurrent features
- **TypeScript 5.3+** - Type safety and better DX
- **Vite 5.0+** - Fast build tool (replaces CRA)

**State Management**:
- **Redux Toolkit** - Global state (auth, user, settings)
- **React Query (TanStack Query)** - Server state, caching, sync
- **Zustand** - Lightweight local state (UI state)

**UI Components**:
- **shadcn/ui** - Accessible, customizable components
- **Tailwind CSS 3.4+** - Utility-first styling
- **Radix UI** - Headless, accessible primitives
- **Framer Motion** - Smooth animations

**Forms & Validation**:
- **React Hook Form** - Performant form management
- **Zod** - Schema validation (shared with backend)

**Data Visualization**:
- **Recharts** - Charts and graphs
- **D3.js** - Advanced custom visualizations
- **React Flow** - Workflow builder diagrams

**Development Tools**:
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Vitest** - Unit testing (faster than Jest)
- **Playwright** - E2E testing

### Backend Stack

**Runtime & Framework**:
- **Node.js 18 LTS** - JavaScript runtime
- **TypeScript 5.3+** - Type-safe backend code
- **Express 4.18+** - Web framework

**Database & Storage**:
- **PostgreSQL 15+** - Primary relational database
- **MongoDB 6+** - Logs, events, flexible data
- **Redis 7+** - Caching, sessions, pub/sub
- **Elasticsearch 8+** - Full-text search (Phase 3)
- **AWS S3 / MinIO** - File storage

**Authentication & Security**:
- **jsonwebtoken** - JWT tokens
- **bcrypt** - Password hashing (cost 12)
- **helmet** - Security headers
- **cors** - CORS handling
- **express-rate-limit** - Rate limiting

**Validation & Data**:
- **Zod** - Schema validation (shared with frontend)
- **Joi** - Alternative validation
- **date-fns** - Date manipulation

**ORM & Query Builders**:
- **Prisma** - Type-safe ORM for PostgreSQL
- **Mongoose** - MongoDB ODM
- **node-postgres (pg)** - Direct PostgreSQL client

**Background Jobs**:
- **Bull** - Redis-based job queue
- **node-cron** - Scheduled tasks

**Testing**:
- **Jest** - Unit & integration testing
- **Supertest** - API testing
- **Playwright** - E2E testing

**Logging & Monitoring**:
- **Winston** - Structured logging
- **Pino** - Fast JSON logging
- **Prometheus** - Metrics collection
- **Grafana** - Metrics visualization

### AI/ML Stack

**AI Services**:
- **Anthropic Claude SDK** - Claude AI integration
  - Haiku 4.5 (fast, cheap queries)
  - Sonnet 4.5 (balanced performance)
  - Opus 4.1 (complex analysis)
- **OpenAI SDK** - GPT-4 fallback
- **Hugging Face Transformers** - Open-source models

**Machine Learning**:
- **Python 3.11+** - ML language
- **TensorFlow.js** - Browser ML models
- **scikit-learn** - Traditional ML algorithms
- **pandas** - Data manipulation
- **NumPy** - Numerical computing

**NLP Libraries**:
- **spaCy** - NLP pipelines
- **NLTK** - Natural language toolkit
- **sentence-transformers** - Semantic embeddings

**ML Operations**:
- **MLflow** - Model tracking & registry
- **Weights & Biases** - Experiment tracking
- **DVC** - Data version control

### DevOps & Infrastructure

**Containerization**:
- **Docker 24+** - Containerization
- **Docker Compose** - Local development
- **Kubernetes 1.28+** - Container orchestration

**CI/CD**:
- **GitHub Actions** - CI/CD pipeline
- **GitLab CI** - Alternative CI/CD
- **Jenkins** - Enterprise CI/CD

**Cloud Platforms** (Choose one):
- **AWS** - EC2, RDS, S3, Lambda, ECS
- **GCP** - Compute Engine, Cloud SQL, Cloud Storage
- **Azure** - VMs, Azure Database, Blob Storage

**Infrastructure as Code**:
- **Terraform** - Infrastructure provisioning
- **Pulumi** - Alternative IaC (TypeScript-based)
- **AWS CDK** - AWS-specific IaC

**Monitoring & Logging**:
- **Prometheus** - Metrics collection
- **Grafana** - Dashboards & alerts
- **Elasticsearch** - Log aggregation
- **Kibana** - Log visualization
- **Jaeger** - Distributed tracing
- **Sentry** - Error tracking

**Communication**:
- **Socket.IO** - Real-time WebSocket
- **RabbitMQ / Redis Pub/Sub** - Message queue

### Development Tools

**Version Control**:
- **Git** - Version control
- **GitHub / GitLab** - Code hosting

**API Development**:
- **Postman** - API testing
- **Insomnia** - Alternative API client
- **Swagger / OpenAPI** - API documentation

**Database Tools**:
- **DBeaver** - Universal database GUI
- **pgAdmin** - PostgreSQL admin
- **MongoDB Compass** - MongoDB GUI
- **Redis Commander** - Redis GUI

**Package Management**:
- **npm / pnpm / yarn** - Node package managers
- **pip** - Python package manager

### Third-Party Integrations

**Email Services**:
- **SendGrid** - Transactional & marketing emails
- **AWS SES** - Cost-effective alternative
- **Postmark** - Transactional emails only

**Authentication Providers**:
- **Auth0** - Enterprise SSO
- **Okta** - Enterprise identity
- **Active Directory** - On-premise auth

**Payment Processing**:
- **Stripe** - Primary payment processor
- **PayPal** - Alternative processor

**Communication**:
- **Twilio** - SMS & voice
- **Slack API** - Team notifications
- **Microsoft Teams API** - Enterprise notifications

**Analytics**:
- **Segment** - Customer data platform
- **Mixpanel** - Product analytics
- **Google Analytics** - Web analytics

---

## 🗄️ DATABASE ARCHITECTURE

### Database Strategy

**Multi-Database Approach** (Polyglot Persistence):

1. **PostgreSQL** - Primary relational database
   - Transactional data (ACID compliance)
   - Core CRM entities (contacts, deals, users)
   - Complex queries with JOINs
   - Data integrity through foreign keys

2. **MongoDB** - Document store
   - Logs (audit logs, application logs)
   - Events (workflow executions, email events)
   - Unstructured data (custom field values)
   - Flexible schema for evolving features

3. **Redis** - In-memory cache
   - Session storage (fast authentication)
   - API response caching
   - Rate limiting counters
   - Real-time features (pub/sub)
   - Job queues (Bull)

4. **Elasticsearch** - Search engine (Phase 3+)
   - Full-text search across all entities
   - Faceted search and filtering
   - Log aggregation and analysis
   - Real-time analytics

### PostgreSQL Schema Design

**Multi-Tenancy Pattern**:

```sql
-- Every table has tenant_id for data isolation
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,  -- ← Multi-tenancy
  -- ... other fields
  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id)
    REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes include tenant_id for query performance
CREATE INDEX idx_contacts_tenant_email
  ON contacts(tenant_id, email);
```

**Soft Deletes Pattern**:

```sql
-- Use deleted_at instead of hard deletes
CREATE TABLE contacts (
  -- ... fields
  deleted_at TIMESTAMP,

  -- Indexes exclude deleted records
  WHERE deleted_at IS NULL
);

-- Queries filter out deleted records
SELECT * FROM contacts
WHERE tenant_id = $1
  AND deleted_at IS NULL;
```

**Audit Trail Pattern**:

```sql
-- Track all changes with audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  user_id UUID,
  entity_type VARCHAR(50),     -- contacts, deals, etc.
  entity_id UUID,
  action VARCHAR(50),           -- create, update, delete
  old_values JSONB,             -- Before state
  new_values JSONB,             -- After state
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Triggered automatically on INSERT/UPDATE/DELETE
CREATE TRIGGER audit_contact_changes
  AFTER INSERT OR UPDATE OR DELETE ON contacts
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
```

**Optimistic Locking Pattern**:

```sql
-- Prevent concurrent update conflicts
CREATE TABLE deals (
  id UUID PRIMARY KEY,
  -- ... fields
  version INTEGER DEFAULT 1,  -- Version counter
  updated_at TIMESTAMP
);

-- Update with version check
UPDATE deals
SET
  amount = $1,
  version = version + 1,
  updated_at = NOW()
WHERE id = $2
  AND version = $3;  -- ← Fails if version changed

-- If no rows updated, throw conflict error
```

**Indexing Strategy**:

```sql
-- 1. Foreign keys (always indexed)
CREATE INDEX idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX idx_contacts_account_id ON contacts(account_id);

-- 2. Frequently queried columns
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_status ON contacts(lead_status);

-- 3. Composite indexes for multi-column queries
CREATE INDEX idx_contacts_tenant_status
  ON contacts(tenant_id, lead_status, created_at DESC);

-- 4. Partial indexes for filtered queries
CREATE INDEX idx_active_contacts
  ON contacts(tenant_id, created_at DESC)
  WHERE deleted_at IS NULL AND is_active = true;

-- 5. GIN indexes for array/JSONB columns
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_custom_fields ON contacts USING GIN(custom_fields);
```

**Partitioning Strategy** (for large tables):

```sql
-- Partition audit_logs by month for better performance
CREATE TABLE audit_logs (
  -- ... fields
  created_at TIMESTAMP NOT NULL
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE audit_logs_2025_02 PARTITION OF audit_logs
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Automatically create new partitions via cron job
```

### Database Relationships

**One-to-Many**:
```sql
-- One account has many contacts
accounts (1) ←→ (N) contacts

CREATE TABLE contacts (
  account_id UUID,
  CONSTRAINT fk_account FOREIGN KEY (account_id)
    REFERENCES accounts(id) ON DELETE SET NULL
);
```

**Many-to-Many**:
```sql
-- Contacts can have many tags, tags can have many contacts
contacts (N) ←→ (N) tags

-- Junction table
CREATE TABLE contact_tags (
  contact_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  PRIMARY KEY (contact_id, tag_id),
  CONSTRAINT fk_contact FOREIGN KEY (contact_id)
    REFERENCES contacts(id) ON DELETE CASCADE,
  CONSTRAINT fk_tag FOREIGN KEY (tag_id)
    REFERENCES tags(id) ON DELETE CASCADE
);
```

**Polymorphic Associations**:
```sql
-- Notes can belong to contacts, deals, or accounts
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,  -- contacts, deals, accounts
  entity_id UUID NOT NULL,
  content TEXT,
  created_at TIMESTAMP
);

-- Composite index for polymorphic queries
CREATE INDEX idx_notes_entity
  ON notes(entity_type, entity_id, created_at DESC);
```

### Connection Pooling

```typescript
// PostgreSQL connection pool configuration
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,

  // Connection pool settings
  max: 20,                    // Maximum connections
  min: 5,                     // Minimum idle connections
  idleTimeoutMillis: 30000,   // Close idle connections after 30s
  connectionTimeoutMillis: 2000, // Fail fast if can't connect

  // Health checks
  allowExitOnIdle: false,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  process.exit(0);
});
```

### Query Optimization

**Use EXPLAIN ANALYZE**:
```sql
-- Identify slow queries
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM contacts
WHERE tenant_id = '123'
  AND lead_status = 'qualified'
ORDER BY created_at DESC
LIMIT 20;

-- Look for:
-- - Sequential scans (bad, add index)
-- - High cost estimates
-- - Long execution times
```

**N+1 Query Prevention**:
```typescript
// ❌ BAD: N+1 queries
const contacts = await db.query('SELECT * FROM contacts');
for (const contact of contacts) {
  const account = await db.query(
    'SELECT * FROM accounts WHERE id = $1',
    [contact.account_id]
  );
}

// ✅ GOOD: Single query with JOIN
const contacts = await db.query(`
  SELECT
    c.*,
    a.name as account_name,
    a.industry as account_industry
  FROM contacts c
  LEFT JOIN accounts a ON c.account_id = a.id
  WHERE c.tenant_id = $1
`, [tenantId]);
```

**Batch Operations**:
```typescript
// ❌ BAD: Multiple INSERTs
for (const contact of contacts) {
  await db.query('INSERT INTO contacts (...) VALUES (...)', [contact]);
}

// ✅ GOOD: Bulk INSERT
await db.query(`
  INSERT INTO contacts (tenant_id, email, first_name, last_name)
  SELECT * FROM UNNEST($1::uuid[], $2::text[], $3::text[], $4::text[])
`, [tenantIds, emails, firstNames, lastNames]);
```

---

## 🔗 API DESIGN STANDARDS

### RESTful API Principles

**Resource-Based URLs**:
```
✅ GOOD - Nouns, not verbs
GET    /api/v1/contacts
POST   /api/v1/contacts
GET    /api/v1/contacts/:id
PUT    /api/v1/contacts/:id
DELETE /api/v1/contacts/:id

❌ BAD - Verbs in URLs
POST /api/v1/getContacts
POST /api/v1/createContact
POST /api/v1/deleteContact
```

**HTTP Methods & Status Codes**:
```typescript
// GET - Read resource(s)
GET /api/v1/contacts
→ 200 OK (with data)
→ 404 Not Found (if resource doesn't exist)

// POST - Create resource
POST /api/v1/contacts
→ 201 Created (with Location header)
→ 400 Bad Request (validation errors)
→ 409 Conflict (duplicate email)

// PUT - Update entire resource
PUT /api/v1/contacts/:id
→ 200 OK (with updated data)
→ 404 Not Found (if resource doesn't exist)

// PATCH - Partial update
PATCH /api/v1/contacts/:id
→ 200 OK (with updated data)
→ 404 Not Found

// DELETE - Remove resource
DELETE /api/v1/contacts/:id
→ 204 No Content (successful deletion)
→ 404 Not Found
```

### API Response Format

**Standard Success Response**:
```typescript
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "john@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "createdAt": "2025-01-05T10:30:00Z"
  },
  "meta": {
    "timestamp": "2025-01-05T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

**Standard Error Response**:
```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": [
      {
        "field": "email",
        "message": "Email must be a valid email address",
        "value": "invalid-email"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-01-05T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

**Paginated Response**:
```typescript
{
  "success": true,
  "data": [...contacts...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": true
  },
  "meta": {
    "timestamp": "2025-01-05T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Pagination

**Offset-Based Pagination** (simple, but slower for large datasets):
```typescript
GET /api/v1/contacts?page=2&limit=20

// Implementation
const page = parseInt(req.query.page) || 1
const limit = parseInt(req.query.limit) || 20
const offset = (page - 1) * limit

const contacts = await db.query(`
  SELECT * FROM contacts
  WHERE tenant_id = $1
  ORDER BY created_at DESC
  LIMIT $2 OFFSET $3
`, [tenantId, limit, offset])
```

**Cursor-Based Pagination** (faster, better for large datasets):
```typescript
GET /api/v1/contacts?cursor=eyJpZCI6MTIzfQ&limit=20

// Implementation
const cursor = req.query.cursor
  ? JSON.parse(Buffer.from(req.query.cursor, 'base64').toString())
  : null

const contacts = await db.query(`
  SELECT * FROM contacts
  WHERE tenant_id = $1
    ${cursor ? 'AND created_at < $3' : ''}
  ORDER BY created_at DESC
  LIMIT $2
`, cursor ? [tenantId, limit, cursor.createdAt] : [tenantId, limit])

// Next cursor
const nextCursor = contacts.length > 0
  ? Buffer.from(JSON.stringify({
      id: contacts[contacts.length - 1].id,
      createdAt: contacts[contacts.length - 1].createdAt
    })).toString('base64')
  : null
```

### Filtering & Sorting

**Query Parameters**:
```typescript
// Filtering
GET /api/v1/contacts?status=active&leadScore[gte]=50

// Sorting
GET /api/v1/contacts?sort=-createdAt,firstName
// - prefix means DESC, no prefix means ASC

// Field Selection
GET /api/v1/contacts?fields=id,email,firstName,lastName

// Search
GET /api/v1/contacts?search=john

// Multiple filters with OR
GET /api/v1/contacts?status=active,qualified
```

**Implementation**:
```typescript
interface QueryFilters {
  status?: string | string[]
  leadScore?: { gte?: number; lte?: number }
  search?: string
  sort?: string
  fields?: string
}

function buildQuery(filters: QueryFilters) {
  const conditions = ['tenant_id = $1']
  const params: any[] = [tenantId]
  let paramIndex = 2

  // Status filter
  if (filters.status) {
    const statuses = Array.isArray(filters.status)
      ? filters.status
      : [filters.status]
    conditions.push(`status = ANY($${paramIndex})`)
    params.push(statuses)
    paramIndex++
  }

  // Lead score range
  if (filters.leadScore?.gte) {
    conditions.push(`lead_score >= $${paramIndex}`)
    params.push(filters.leadScore.gte)
    paramIndex++
  }

  // Search
  if (filters.search) {
    conditions.push(`(
      first_name ILIKE $${paramIndex} OR
      last_name ILIKE $${paramIndex} OR
      email ILIKE $${paramIndex}
    )`)
    params.push(`%${filters.search}%`)
    paramIndex++
  }

  return { conditions, params }
}
```

### Versioning

**URL Versioning** (recommended):
```
/api/v1/contacts  ← Version in URL path
/api/v2/contacts
```

**Header Versioning** (alternative):
```
GET /api/contacts
Accept: application/vnd.clientforge.v1+json
```

**Breaking Changes**:
- New major version required for:
  - Removing fields
  - Changing field types
  - Changing response structure
  - Changing authentication
- Maintain old version for 6-12 months

### Rate Limiting

**Per-Tenant Limits**:
```typescript
// Rate limit by tenant and plan
const limits = {
  starter: 100,      // requests per minute
  professional: 500,
  business: 2000,
  enterprise: 10000
}

// Rate limit headers
HTTP/1.1 200 OK
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 487
X-RateLimit-Reset: 1609459200

// Rate limit exceeded
HTTP/1.1 429 Too Many Requests
Retry-After: 60
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Limit: 500 requests per minute"
  }
}
```

### Authentication & Authorization

**JWT in Authorization Header**:
```
GET /api/v1/contacts
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Permission-Based Access**:
```typescript
// Middleware checks permissions
router.get('/contacts',
  authenticate,
  requirePermission('contacts', 'read'),
  contactController.list
)

// User permissions stored in JWT payload
{
  "userId": "123",
  "tenantId": "456",
  "roleId": "789",
  "permissions": ["contacts:read", "contacts:create", "deals:read"]
}
```

### Bulk Operations

**Bulk Create**:
```typescript
POST /api/v1/contacts/bulk
{
  "contacts": [
    { "email": "john@example.com", "firstName": "John" },
    { "email": "jane@example.com", "firstName": "Jane" }
  ]
}

// Response with results per item
{
  "success": true,
  "data": {
    "created": 2,
    "failed": 0,
    "results": [
      { "index": 0, "success": true, "id": "123" },
      { "index": 1, "success": true, "id": "124" }
    ]
  }
}
```

**Bulk Update**:
```typescript
PATCH /api/v1/contacts/bulk
{
  "ids": ["123", "124", "125"],
  "updates": {
    "status": "qualified",
    "tags": ["hot-lead"]
  }
}
```

**Bulk Delete**:
```typescript
DELETE /api/v1/contacts/bulk
{
  "ids": ["123", "124", "125"]
}
```

### Async Operations

**Long-Running Tasks**:
```typescript
// 1. Client initiates task
POST /api/v1/contacts/import
{
  "file": "base64-encoded-csv"
}

// 2. Server returns job ID
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "status": "pending",
    "statusUrl": "/api/v1/jobs/job_abc123"
  }
}

// 3. Client polls for status
GET /api/v1/jobs/job_abc123
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "status": "processing", // pending, processing, completed, failed
    "progress": 45, // percentage
    "result": null
  }
}

// 4. Job completes
GET /api/v1/jobs/job_abc123
{
  "success": true,
  "data": {
    "jobId": "job_abc123",
    "status": "completed",
    "progress": 100,
    "result": {
      "imported": 150,
      "failed": 5,
      "errors": [...]
    }
  }
}
```

### API Documentation

**OpenAPI/Swagger Spec**:
```yaml
openapi: 3.0.0
info:
  title: ClientForge CRM API
  version: 1.0.0
  description: Enterprise CRM API

servers:
  - url: https://api.clientforge.com/v1
    description: Production
  - url: https://staging-api.clientforge.com/v1
    description: Staging

paths:
  /contacts:
    get:
      summary: List contacts
      tags: [Contacts]
      security:
        - bearerAuth: []
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ContactList'
```

---

## 🔒 SECURITY IMPLEMENTATION

### OWASP Top 10 Protection

**1. Injection Prevention (SQL, NoSQL, Command)**:
```typescript
// ❌ BAD - SQL Injection vulnerability
const query = `SELECT * FROM users WHERE email = '${email}'`
await db.query(query)

// ✅ GOOD - Parameterized queries
const query = 'SELECT * FROM users WHERE email = $1'
await db.query(query, [email])

// ✅ GOOD - ORM with parameter binding
const user = await prisma.user.findUnique({
  where: { email }
})
```

**2. Broken Authentication**:
```typescript
// Password requirements
const PASSWORD_POLICY = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  maxAge: 90, // days
}

// Account lockout after failed attempts
if (failedAttempts >= 5) {
  await lockAccount(userId, 15 * 60 * 1000) // 15 minutes
}

// JWT token expiration
const accessToken = jwt.sign(payload, secret, {
  expiresIn: '15m' // Short-lived access tokens
})

const refreshToken = jwt.sign(payload, refreshSecret, {
  expiresIn: '7d' // Longer refresh tokens
})
```

**3. Sensitive Data Exposure**:
```typescript
// Encrypt sensitive fields at rest
import crypto from 'crypto'

function encrypt(text: string): string {
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(process.env.ENCRYPTION_KEY, 'hex'),
    iv
  )
  return cipher.update(text, 'utf8', 'hex') + cipher.final('hex')
}

// Never log sensitive data
logger.info('User logged in', {
  userId: user.id,
  email: user.email.replace(/(.{3}).*@/, '$1***@'), // Mask email
  // ❌ password: user.password  // NEVER log passwords
})

// Remove sensitive fields from API responses
function sanitizeUser(user: User) {
  const { password, passwordHash, secretKey, ...safe } = user
  return safe
}
```

**4. XML External Entities (XXE)**:
```typescript
// Disable external entity processing
import { parseString } from 'xml2js'

parseString(xml, {
  strict: true,
  explicitArray: false,
  ignoreAttrs: true,
  // Disable external entities
  parserOptions: {
    xmlResolveExternalEntities: false
  }
}, callback)
```

**5. Broken Access Control**:
```typescript
// Always check tenant ownership
async function getContact(contactId: string, userId: string, tenantId: string) {
  const contact = await db.query(`
    SELECT * FROM contacts
    WHERE id = $1
      AND tenant_id = $2  -- ← Prevents cross-tenant access
      AND deleted_at IS NULL
  `, [contactId, tenantId])

  if (!contact) {
    throw new AppError('Contact not found', 404)
  }

  // Check user permissions
  if (!await hasPermission(userId, 'contacts', 'read')) {
    throw new AppError('Insufficient permissions', 403)
  }

  return contact
}
```

**6. Security Misconfiguration**:
```typescript
// Helmet.js for security headers
import helmet from 'helmet'

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  xssFilter: true,
}))

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
  maxAge: 86400,
}))

// Disable unnecessary headers
app.disable('x-powered-by')
```

**7. Cross-Site Scripting (XSS)**:
```typescript
// Sanitize user input
import DOMPurify from 'isomorphic-dompurify'

function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  })
}

// Content-Type headers
res.setHeader('Content-Type', 'application/json; charset=utf-8')
res.setHeader('X-Content-Type-Options', 'nosniff')

// Escape output in React (automatic with JSX)
<div>{userInput}</div> // React automatically escapes

// For dangerouslySetInnerHTML, sanitize first
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userInput)
}} />
```

**8. Insecure Deserialization**:
```typescript
// Validate JSON input
import { z } from 'zod'

const ContactSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().optional(),
})

// Validate before processing
try {
  const validated = ContactSchema.parse(req.body)
  // Safe to use validated data
} catch (error) {
  throw new ValidationError('Invalid contact data', error)
}
```

**9. Using Components with Known Vulnerabilities**:
```bash
# Regular security audits
npm audit
npm audit fix

# Automated dependency updates (Dependabot, Renovate)
# Check for outdated packages
npm outdated

# Use npm ci in production (locks versions)
npm ci
```

**10. Insufficient Logging & Monitoring**:
```typescript
// Comprehensive audit logging
await auditLogger.log({
  userId: req.user.id,
  tenantId: req.user.tenantId,
  action: 'contact.delete',
  entityType: 'contact',
  entityId: contactId,
  ipAddress: req.ip,
  userAgent: req.get('user-agent'),
  status: 'success',
  details: { reason: 'user_requested' }
})

// Security event monitoring
if (failedLoginAttempts >= 3) {
  await securityMonitor.alert({
    severity: 'medium',
    type: 'multiple_failed_logins',
    userId: userId,
    ipAddress: req.ip,
  })
}

// Anomaly detection
if (isAnomalousActivity(user, activity)) {
  await securityMonitor.alert({
    severity: 'high',
    type: 'anomalous_activity',
    userId: user.id,
    activity: activity,
  })
}
```

### Authentication Security

**Password Hashing**:
```typescript
import bcrypt from 'bcrypt'

// Hash password with high cost factor
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12 // 2^12 iterations
  return await bcrypt.hash(password, saltRounds)
}

// Verify password
async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}
```

**JWT Token Security**:
```typescript
// Use strong secrets (32+ bytes)
const JWT_SECRET = process.env.JWT_SECRET // 256-bit minimum

// Sign with algorithm specification
const token = jwt.sign(payload, JWT_SECRET, {
  algorithm: 'HS256', // Specify algorithm
  expiresIn: '15m',
  issuer: 'clientforge-api',
  audience: 'clientforge-web',
})

// Verify with strict checks
try {
  const decoded = jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'], // Whitelist algorithms
    issuer: 'clientforge-api',
    audience: 'clientforge-web',
  })
} catch (error) {
  throw new AppError('Invalid token', 401)
}
```

**Session Management**:
```typescript
// Store sessions in Redis with expiration
await redis.setex(
  `session:${userId}:${tokenId}`,
  15 * 60, // 15 minutes
  JSON.stringify(sessionData)
)

// Invalidate all sessions on password change
await redis.del(`session:${userId}:*`)

// Implement token rotation
async function rotateRefreshToken(oldToken: string) {
  const decoded = jwt.verify(oldToken, REFRESH_SECRET)

  // Blacklist old token
  await redis.setex(
    `blacklist:${oldToken}`,
    7 * 24 * 60 * 60, // 7 days
    '1'
  )

  // Issue new token
  return jwt.sign({ userId: decoded.userId }, REFRESH_SECRET, {
    expiresIn: '7d'
  })
}
```

### Input Validation

**Schema Validation with Zod**:
```typescript
import { z } from 'zod'

const CreateContactSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255),

  firstName: z.string()
    .min(1, 'First name required')
    .max(100)
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters'),

  lastName: z.string()
    .min(1, 'Last name required')
    .max(100)
    .regex(/^[a-zA-Z\s'-]+$/, 'Invalid characters'),

  phone: z.string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number')
    .optional(),

  leadScore: z.number()
    .int()
    .min(0)
    .max(100)
    .optional(),

  tags: z.array(z.string().max(50))
    .max(20)
    .optional(),
})

// Validation middleware
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body)
      next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors,
          },
        })
      }
      next(error)
    }
  }
}

// Usage
router.post('/contacts',
  authenticate,
  validateRequest(CreateContactSchema),
  contactController.create
)
```

### Rate Limiting

**Multi-Tier Rate Limiting**:
```typescript
import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'

// Global rate limit
const globalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max requests per window
  message: 'Too many requests from this IP',
})

// Per-tenant rate limit
const tenantLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:tenant:',
  }),
  windowMs: 60 * 1000, // 1 minute
  max: async (req) => {
    const plan = req.user?.subscription?.planType
    const limits = {
      starter: 100,
      professional: 500,
      business: 2000,
      enterprise: 10000,
    }
    return limits[plan] || 100
  },
  keyGenerator: (req) => req.user?.tenantId || req.ip,
})

// Sensitive endpoint rate limit (login, password reset)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true, // Don't count successful logins
})

// Apply limiters
app.use('/api', globalLimiter)
app.use('/api', authenticate, tenantLimiter)
app.use('/api/v1/auth/login', authLimiter)
```

### Data Encryption

**Encryption at Rest**:
```typescript
import crypto from 'crypto'

class EncryptionService {
  private algorithm = 'aes-256-gcm'
  private key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex')

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv)

    let encrypted = cipher.update(text, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // Return: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
  }

  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':')

    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv)

    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  }
}

// Encrypt sensitive fields before storing
const encrypted = encryptionService.encrypt(user.ssn)
await db.query('UPDATE users SET ssn_encrypted = $1 WHERE id = $2', [encrypted, userId])
```

**Encryption in Transit (HTTPS)**:
```typescript
// Force HTTPS in production
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`)
  }
  next()
})

// HSTS header
app.use(helmet.hsts({
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true,
}))
```

### Security Checklist

**Pre-Production Checklist**:
```
✅ Authentication & Authorization
  - JWT tokens with short expiration
  - Refresh token rotation
  - Password hashing (bcrypt, cost 12+)
  - Account lockout after failed attempts
  - MFA available for sensitive operations

✅ Input Validation
  - Schema validation on all inputs
  - SQL injection prevention (parameterized queries)
  - XSS prevention (sanitize HTML)
  - CSRF tokens for state-changing operations

✅ Data Protection
  - Encryption at rest (sensitive fields)
  - Encryption in transit (HTTPS/TLS 1.3)
  - Secure cookie flags (httpOnly, secure, sameSite)
  - Data masking in logs

✅ API Security
  - Rate limiting (global + per-tenant)
  - CORS whitelist
  - Security headers (Helmet.js)
  - API versioning
  - Request size limits

✅ Infrastructure
  - Environment variables for secrets
  - No secrets in version control
  - Regular dependency updates (npm audit)
  - Database connection pooling
  - Graceful error handling (no stack traces to client)

✅ Monitoring & Logging
  - Audit logs for sensitive operations
  - Security event monitoring
  - Error tracking (Sentry)
  - Uptime monitoring
  - Log retention policies

✅ Compliance
  - GDPR data export/deletion
  - SOC 2 audit trail
  - Data retention policies
  - Privacy policy & terms of service
```

---

## 📁 FILE ORGANIZATION RULES

**CRITICAL**: Follow these rules 100% of the time

### Root Directory Rules

```bash
✅ ALLOWED in root:
- README.md
- LICENSE
- CHANGELOG.md
- CLAUDE.md
- .gitignore, .dockerignore, .editorconfig
- package.json, tsconfig.json, turbo.json, lerna.json
- docker-compose.yml, Dockerfile, Makefile
- .env.example (NEVER .env)

❌ FORBIDDEN in root:
- Any other .md files (use docs/)
- Source code files (use backend/, frontend/, ai/)
- Scripts (use scripts/)
- Tests (use tests/)
- Temporary files
```

### Deep Folder Structure (3-4 Levels Minimum)

```bash
❌ WRONG (shallow):
backend/services/user-service.ts
frontend/components/UserProfile.tsx

✅ RIGHT (deep):
backend/core/users/user-service.ts
backend/core/users/user-repository.ts
backend/core/users/user-validators.ts
frontend/apps/crm-web/src/components/Users/Profile/UserProfile.tsx
```

### File Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Directories | kebab-case | `user-management/` |
| Backend Files | kebab-case.ts | `user-service.ts` |
| React Components | PascalCase.tsx | `UserProfile.tsx` |
| Test Files | name.test.ts | `user-service.test.ts` |
| Config Files | kebab-case.json | `database-config.json` |

---

## ✅ PHASE 1 COMPLETION CHECKLIST

```
Foundation Layer (Week 1-4):

Week 1: Project Setup
✅ Project structure verified (413 directories)
✅ Git repository initialized
✅ Environment configuration complete
✅ PostgreSQL schema created (users, tenants, roles, permissions)
✅ Redis configured
✅ MongoDB configured
✅ Docker Compose setup complete
✅ Docker containers running

Week 2: Authentication & Authorization
✅ JWT service implemented
✅ Password hashing (bcrypt) implemented
✅ Login/logout endpoints working
✅ Session management (Redis) working
✅ Permission checking middleware complete
✅ Rate limiting implemented
✅ Account locking after failed attempts working
✅ Audit logging implemented

Week 3: API Framework
✅ Express server running
✅ CORS configured
✅ Helmet security headers active
✅ Error handling middleware complete
✅ Request validation working
✅ API versioning (/api/v1) implemented
✅ Health check endpoint working
✅ Logging (Winston) configured

Week 4: Testing & DevOps
✅ Jest configured
✅ Unit tests written (80%+ coverage)
✅ Integration tests written
✅ E2E tests (Playwright) setup
✅ CI/CD pipeline (GitHub Actions) working
✅ Code quality checks passing
✅ Security scan passing (npm audit)
✅ Documentation updated

🎉 Phase 1 Complete - Ready for Phase 2
```

---

## 🎯 BUILD ORDER SUMMARY

```typescript
interface BuildOrder {
  phase1: {
    order: 1,
    name: "Foundation Layer",
    weeks: [1, 2, 3, 4],
    deliverables: [
      "Infrastructure (Docker, databases)",
      "Authentication & Authorization (JWT, RBAC)",
      "API Framework (Express, routes, middleware)",
      "Testing Infrastructure (Jest, Playwright, CI/CD)"
    ],
    blockers: "Nothing - start here",
    nextPhase: "Core CRM Features"
  },

  phase2: {
    order: 2,
    name: "Core CRM Features",
    weeks: [5, 6, 7, 8, 9, 10],
    deliverables: [
      "Contacts Module",
      "Accounts Module",
      "Deals/Opportunities Module",
      "Tasks & Activities Module",
      "Notes & Comments Module"
    ],
    blockers: "Requires Phase 1 (auth, database, API)",
    nextPhase: "Advanced Features"
  },

  phase3: {
    order: 3,
    name: "Advanced Features",
    weeks: [11, 12, 13, 14, 15, 16],
    deliverables: [
      "Email Campaign Management",
      "Workflow Automation",
      "Custom Reports Builder",
      "Analytics Dashboard",
      "Document Management"
    ],
    blockers: "Requires Phase 2 (core CRM data)",
    nextPhase: "AI Integration"
  },

  phase4: {
    order: 4,
    name: "AI Integration",
    weeks: [17, 18, 19, 20, 21, 22],
    deliverables: [
      "Albedo AI Companion (NLP interface)",
      "Lead Scoring ML Model",
      "Sales Forecasting",
      "Sentiment Analysis",
      "AI-Powered Recommendations"
    ],
    blockers: "Requires Phase 3 (data for training)",
    nextPhase: "Enterprise Scaling"
  },

  phase5: {
    order: 5,
    name: "Enterprise Scaling",
    weeks: [23, 24, 25, 26, 27, 28],
    deliverables: [
      "Microservices Extraction",
      "Advanced Multi-tenancy",
      "Performance Optimization",
      "Advanced Security (SSO, SAML)",
      "Enterprise Integrations"
    ],
    blockers: "Requires Phase 4 (complete system)",
    nextPhase: "Production Launch"
  }
}
```

---

## 📖 RELATED DOCUMENTATION

- [README.md](../README.md) - Project overview & protocols
- [docs/ai/QUICK_START_AI.md](ai/QUICK_START_AI.md) - AI assistant quick start
- [docs/protocols/00_QUICK_REFERENCE.md](protocols/00_QUICK_REFERENCE.md) - Protocol cheat sheet
- [docs/01_ARCHITECTURE.md](01_ARCHITECTURE.md) - System architecture
- [docs/02_AI-SYSTEMS.md](02_AI-SYSTEMS.md) - AI/ML documentation
- [docs/03_API.md](03_API.md) - API documentation
- [CHANGELOG.md](../CHANGELOG.md) - Version history

---

**Built with ❤️ by Abstract Creatives LLC**
**For**: ClientForge CRM v3.0
**Purpose**: Universal CRM Development - The Right Way
**Last Updated**: 2025-11-05

🚀 **Follow this guide sequentially for best results** 🚀
