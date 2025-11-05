-- ============================================================================
-- ClientForge CRM v3.0 - Core Database Schema
-- File: 001_core_tables.sql
-- Purpose: Foundation tables (tenants, users, roles, permissions)
-- Phase: 1 - Foundation Layer
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- TENANTS TABLE (Multi-tenancy Core)
-- ============================================================================

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) UNIQUE NOT NULL,
  plan_type VARCHAR(50) NOT NULL DEFAULT 'starter', -- starter, professional, enterprise
  max_users INTEGER NOT NULL DEFAULT 5,
  max_storage_gb INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  is_trial BOOLEAN DEFAULT true,
  trial_ends_at TIMESTAMP,
  subscription_starts_at TIMESTAMP,
  subscription_ends_at TIMESTAMP,
  billing_email VARCHAR(255),
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT chk_plan_type CHECK (plan_type IN ('starter', 'professional', 'enterprise', 'custom'))
);

-- Indexes for tenants
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_active ON tenants(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_tenants_plan_type ON tenants(plan_type) WHERE deleted_at IS NULL;

-- Comment on table
COMMENT ON TABLE tenants IS 'Multi-tenant organization accounts';

-- ============================================================================
-- ROLES TABLE (RBAC - Role-Based Access Control)
-- ============================================================================

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT false,
  level INTEGER NOT NULL DEFAULT 0, -- 0=lowest, 100=highest (admin)
  permissions JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_role_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_role_per_tenant UNIQUE (tenant_id, name)
);

-- Indexes for roles
CREATE INDEX idx_roles_tenant_id ON roles(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_roles_is_system ON roles(is_system_role) WHERE deleted_at IS NULL;

COMMENT ON TABLE roles IS 'User roles for RBAC (Role-Based Access Control)';

-- ============================================================================
-- PERMISSIONS TABLE (RBAC - Granular Permissions)
-- ============================================================================

CREATE TABLE permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource VARCHAR(100) NOT NULL, -- contacts, deals, reports, settings, etc.
  action VARCHAR(50) NOT NULL,    -- create, read, update, delete, export, import
  description TEXT,
  category VARCHAR(50),            -- crm, admin, analytics, etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_permission UNIQUE (resource, action)
);

-- Indexes for permissions
CREATE INDEX idx_permissions_resource ON permissions(resource);
CREATE INDEX idx_permissions_category ON permissions(category);

COMMENT ON TABLE permissions IS 'Granular permissions for RBAC system';

-- ============================================================================
-- ROLE_PERMISSIONS TABLE (Many-to-Many Relationship)
-- ============================================================================

CREATE TABLE role_permissions (
  role_id UUID NOT NULL,
  permission_id UUID NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  granted_by UUID, -- User who granted this permission
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- Indexes for role_permissions
CREATE INDEX idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission_id ON role_permissions(permission_id);

COMMENT ON TABLE role_permissions IS 'Junction table linking roles to permissions';

-- ============================================================================
-- USERS TABLE (Core User Accounts)
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  role_id UUID NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  avatar_url VARCHAR(500),
  timezone VARCHAR(50) DEFAULT 'UTC',
  language VARCHAR(10) DEFAULT 'en',
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP,
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  password_changed_at TIMESTAMP,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_user_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id),
  CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email),
  CONSTRAINT chk_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Indexes for users
CREATE INDEX idx_users_tenant_id ON users(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role_id ON users(role_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_is_active ON users(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_last_login ON users(last_login_at DESC) WHERE deleted_at IS NULL;

COMMENT ON TABLE users IS 'User accounts with authentication and profile information';

-- ============================================================================
-- USER_SESSIONS TABLE (Active User Sessions - for Redis backup)
-- ============================================================================

CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  refresh_token_hash VARCHAR(255) NOT NULL,
  access_token_jti VARCHAR(100), -- JWT ID for access token
  user_agent TEXT,
  ip_address VARCHAR(45),
  device_type VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP NOT NULL,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for user_sessions
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id) WHERE is_active = true;
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token_hash) WHERE is_active = true;
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at) WHERE is_active = true;
CREATE INDEX idx_sessions_last_activity ON user_sessions(last_activity_at) WHERE is_active = true;

COMMENT ON TABLE user_sessions IS 'Active user sessions for authentication tracking';

-- ============================================================================
-- AUDIT_LOGS TABLE (Security & Compliance)
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  user_id UUID,
  action VARCHAR(100) NOT NULL, -- login, logout, create_user, update_contact, etc.
  resource_type VARCHAR(100),   -- user, contact, deal, etc.
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status VARCHAR(20) DEFAULT 'success', -- success, failure, blocked
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_audit_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_audit_status CHECK (status IN ('success', 'failure', 'blocked'))
);

-- Indexes for audit_logs
CREATE INDEX idx_audit_tenant_id ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_user_id ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_status ON audit_logs(status) WHERE status != 'success';
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for security and compliance';

-- ============================================================================
-- PASSWORD_RESET_TOKENS TABLE
-- ============================================================================

CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for password_reset_tokens
CREATE INDEX idx_reset_token_hash ON password_reset_tokens(token_hash) WHERE used_at IS NULL;
CREATE INDEX idx_reset_user_id ON password_reset_tokens(user_id) WHERE used_at IS NULL;
CREATE INDEX idx_reset_expires ON password_reset_tokens(expires_at) WHERE used_at IS NULL;

COMMENT ON TABLE password_reset_tokens IS 'Secure password reset tokens with expiration';

-- ============================================================================
-- EMAIL_VERIFICATION_TOKENS TABLE
-- ============================================================================

CREATE TABLE email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_verify_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for email_verification_tokens
CREATE INDEX idx_verify_token_hash ON email_verification_tokens(token_hash) WHERE verified_at IS NULL;
CREATE INDEX idx_verify_user_id ON email_verification_tokens(user_id) WHERE verified_at IS NULL;
CREATE INDEX idx_verify_expires ON email_verification_tokens(expires_at) WHERE verified_at IS NULL;

COMMENT ON TABLE email_verification_tokens IS 'Email verification tokens for new user registration';

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION (Auto-update updated_at timestamp)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at column
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DEFAULT PERMISSIONS (RBAC)
-- ============================================================================

INSERT INTO permissions (resource, action, description, category) VALUES
  -- User Management
  ('users', 'create', 'Create new users', 'admin'),
  ('users', 'read', 'View user information', 'admin'),
  ('users', 'update', 'Update user information', 'admin'),
  ('users', 'delete', 'Delete users', 'admin'),
  ('users', 'manage_roles', 'Manage user roles and permissions', 'admin'),

  -- Role Management
  ('roles', 'create', 'Create new roles', 'admin'),
  ('roles', 'read', 'View roles', 'admin'),
  ('roles', 'update', 'Update roles', 'admin'),
  ('roles', 'delete', 'Delete roles', 'admin'),

  -- Tenant Settings
  ('settings', 'read', 'View tenant settings', 'admin'),
  ('settings', 'update', 'Update tenant settings', 'admin'),

  -- Audit Logs
  ('audit_logs', 'read', 'View audit logs', 'admin'),
  ('audit_logs', 'export', 'Export audit logs', 'admin');

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Core database schema created successfully';
  RAISE NOTICE '📊 Tables created: tenants, roles, permissions, role_permissions, users, user_sessions, audit_logs';
  RAISE NOTICE '🔐 Security features: RBAC, audit logging, session management';
  RAISE NOTICE '🎯 Ready for Phase 1 authentication implementation';
END $$;
