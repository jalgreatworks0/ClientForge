-- =============================================================================
-- Migration: 013_api_keys.sql
-- Description: API Key Management System
-- Dependencies: Requires users and tenants tables
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- TABLE: api_keys
-- Description: Stores API keys for programmatic access
-- =============================================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(8) NOT NULL,
  key_hash VARCHAR(64) NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  rate_limit INTEGER NOT NULL DEFAULT 1000,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_api_keys_tenant_id ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE UNIQUE INDEX idx_api_keys_prefix_hash ON api_keys(key_prefix, key_hash);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active) WHERE is_active = true;
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE api_keys IS 'API keys for programmatic access to the platform';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of the API key (for quick lookup)';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the full API key';
COMMENT ON COLUMN api_keys.scopes IS 'Array of permission scopes (e.g., contacts:read, deals:write)';
COMMENT ON COLUMN api_keys.rate_limit IS 'Maximum requests per minute';

-- =============================================================================
-- TRIGGER: Update timestamp
-- =============================================================================

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- FUNCTION: Cleanup expired API keys
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_api_keys()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM api_keys
    WHERE expires_at IS NOT NULL
      AND expires_at < NOW()
      AND is_active = false
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_api_keys() IS 'Cleanup expired and revoked API keys (run periodically)';

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration 013_api_keys.sql completed successfully';
  RAISE NOTICE 'Created table: api_keys';
  RAISE NOTICE 'Created cleanup function: cleanup_expired_api_keys()';
END $$;
