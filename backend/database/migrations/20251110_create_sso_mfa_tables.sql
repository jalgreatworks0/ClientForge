-- SSO and MFA Tables Migration
-- Created: 2025-11-10
-- Purpose: Enterprise authentication with SSO and Multi-Factor Authentication

-- SSO Providers Configuration Table
CREATE TABLE IF NOT EXISTS sso_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  provider_type VARCHAR(50) NOT NULL, -- 'google', 'microsoft', 'saml', 'okta'
  provider_name VARCHAR(100),
  client_id TEXT,
  client_secret TEXT, -- Will be encrypted at application level
  metadata_url TEXT,
  saml_entity_id TEXT,
  saml_sso_url TEXT,
  saml_certificate TEXT,
  enabled BOOLEAN DEFAULT true,
  auto_provision BOOLEAN DEFAULT true, -- Auto-create users on first login
  default_role VARCHAR(50) DEFAULT 'user',
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- User MFA Configuration Table
CREATE TABLE IF NOT EXISTS user_mfa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  mfa_enabled BOOLEAN DEFAULT false,
  mfa_type VARCHAR(20) DEFAULT 'totp', -- 'totp', 'sms', 'email'
  totp_secret TEXT, -- Encrypted TOTP secret
  backup_codes TEXT[], -- Array of encrypted backup codes
  phone_number VARCHAR(20), -- For SMS MFA
  verified_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  failed_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SSO Sessions Table (for tracking SSO logins)
CREATE TABLE IF NOT EXISTS sso_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES sso_providers(id) ON DELETE CASCADE,
  sso_user_id TEXT, -- User ID from SSO provider
  sso_email TEXT,
  state_token TEXT, -- CSRF protection
  nonce TEXT, -- OIDC nonce
  code_verifier TEXT, -- PKCE code verifier
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  id_token TEXT, -- OIDC ID token
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MFA Verification Attempts Log
CREATE TABLE IF NOT EXISTS mfa_verification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  mfa_type VARCHAR(20),
  success BOOLEAN,
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backup Codes Usage Log
CREATE TABLE IF NOT EXISTS mfa_backup_codes_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT, -- Hash of used backup code
  ip_address INET,
  user_agent TEXT,
  used_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sso_providers_tenant ON sso_providers(tenant_id) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_user_mfa_user ON user_mfa(user_id) WHERE mfa_enabled = true;
CREATE INDEX IF NOT EXISTS idx_sso_sessions_user ON sso_sessions(user_id, expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_mfa_verification_log ON mfa_verification_log(user_id, created_at DESC);

-- Add SSO login method to users table (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'sso_provider_id') THEN
    ALTER TABLE users ADD COLUMN sso_provider_id UUID REFERENCES sso_providers(id);
    ALTER TABLE users ADD COLUMN sso_user_id TEXT;
    ALTER TABLE users ADD COLUMN last_sso_login TIMESTAMPTZ;
    CREATE INDEX idx_users_sso ON users(sso_provider_id, sso_user_id) WHERE sso_provider_id IS NOT NULL;
  END IF;
END $$;

-- Comments for documentation
COMMENT ON TABLE sso_providers IS 'Configuration for SSO providers (Google, Microsoft, SAML, Okta)';
COMMENT ON TABLE user_mfa IS 'Multi-factor authentication settings per user';
COMMENT ON TABLE sso_sessions IS 'Active SSO sessions with tokens';
COMMENT ON TABLE mfa_verification_log IS 'Audit log of MFA verification attempts';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sso_providers TO clientforge_api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON user_mfa TO clientforge_api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON sso_sessions TO clientforge_api_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON mfa_verification_log TO clientforge_api_user;
