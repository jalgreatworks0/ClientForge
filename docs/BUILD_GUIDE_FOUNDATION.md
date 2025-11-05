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

### Email Campaigns
### Marketing Automation
### Custom Reports
### Analytics Dashboard

---

## 🤖 PHASE 4: AI INTEGRATION (Weeks 17-22)

**Goal**: Integrate Albedo AI companion and ML features

### Lead Scoring ML Model
### Sales Forecasting
### Natural Language Processing
### AI-Powered Insights

---

## 🌐 PHASE 5: ENTERPRISE SCALING (Weeks 23-28)

**Goal**: Scale to microservices and enterprise features

### Microservices Extraction
### Advanced Security
### Performance Optimization
### Enterprise Features

---

## 📚 TECHNOLOGY STACK DETAILS

[Detailed stack information...]

---

## 🗄️ DATABASE ARCHITECTURE

[Database design patterns...]

---

## 🔗 API DESIGN STANDARDS

[REST API conventions...]

---

## 🔒 SECURITY IMPLEMENTATION

[Security best practices...]

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
