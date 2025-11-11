-- SSO Providers Table
CREATE TABLE IF NOT EXISTS sso_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES organizations(id),
  provider_type VARCHAR(50), -- google, microsoft, saml
  client_id TEXT,
  client_secret TEXT,
  metadata_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User MFA Configuration Table
CREATE TABLE IF NOT EXISTS user_mfa (
  user_id UUID REFERENCES users(id),
  mfa_type VARCHAR(20), -- totp, sms, email
  secret TEXT,
  backup_codes TEXT[],
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, mfa_type)
);

-- User SSO Tokens Table  
CREATE TABLE IF NOT EXISTS user_sso_tokens (
  user_id UUID REFERENCES users(id),
  provider_type VARCHAR(50), -- google, microsoft
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, provider_type)
);

-- User MFA Backup Codes Table
CREATE TABLE IF NOT EXISTS user_mfa_backup_codes (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  codes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sso_providers_tenant ON sso_providers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_mfa_user ON user_mfa(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sso_tokens_user ON user_sso_tokens(user_id);