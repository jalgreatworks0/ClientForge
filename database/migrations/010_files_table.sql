/**
 * Files Table Migration
 * Creates table for tracking uploaded files with storage service
 * Created: 2025-11-10
 * Phase: File Storage Implementation
 */

-- ============================================
-- Files Table for Storage Service
-- ============================================

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(500) UNIQUE NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size BIGINT NOT NULL,

  -- Tenant isolation
  tenant_id UUID NOT NULL,

  -- Ownership tracking
  uploaded_by UUID,

  -- Entity association (optional)
  entity_type VARCHAR(50),
  entity_id UUID,

  -- Security scanning
  virus_scanned BOOLEAN DEFAULT false,
  virus_scan_result JSONB,
  virus_scan_timestamp TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT valid_size CHECK (size > 0 AND size <= 5368709120)  -- 5GB max
);

-- ============================================
-- Indexes
-- ============================================

-- Primary access patterns
CREATE INDEX idx_files_tenant
  ON files(tenant_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_files_entity
  ON files(entity_type, entity_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_files_uploaded_by
  ON files(uploaded_by)
  WHERE deleted_at IS NULL;

-- Search and sorting
CREATE INDEX idx_files_created
  ON files(created_at DESC);

CREATE INDEX idx_files_original_name
  ON files(tenant_id, original_name)
  WHERE deleted_at IS NULL;

-- Virus scanning tracking
CREATE INDEX idx_files_pending_scan
  ON files(created_at)
  WHERE virus_scanned = false AND deleted_at IS NULL;

CREATE INDEX idx_files_scan_failed
  ON files(virus_scan_timestamp DESC)
  WHERE virus_scanned = true
    AND virus_scan_result->>'status' = 'infected'
    AND deleted_at IS NULL;

-- ============================================
-- Triggers
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Functions
-- ============================================

-- Get storage stats by tenant
CREATE OR REPLACE FUNCTION get_tenant_storage_stats(p_tenant_id UUID)
RETURNS TABLE(
  total_files BIGINT,
  total_size BIGINT,
  files_by_type JSONB,
  largest_files JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_files,
    SUM(size)::BIGINT as total_size,
    jsonb_object_agg(
      COALESCE(entity_type, 'general'),
      count
    ) as files_by_type,
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'name', original_name,
        'size', size,
        'created_at', created_at
      )
      ORDER BY size DESC
      LIMIT 10
    ) as largest_files
  FROM (
    SELECT
      entity_type,
      COUNT(*) as count
    FROM files
    WHERE tenant_id = p_tenant_id AND deleted_at IS NULL
    GROUP BY entity_type
  ) type_counts
  CROSS JOIN LATERAL (
    SELECT id, original_name, size, created_at
    FROM files
    WHERE tenant_id = p_tenant_id AND deleted_at IS NULL
    ORDER BY size DESC
    LIMIT 10
  ) largest;
END;
$$ LANGUAGE plpgsql;

-- Clean up deleted files older than 30 days
CREATE OR REPLACE FUNCTION cleanup_deleted_files()
RETURNS TABLE(
  files_cleaned BIGINT,
  space_freed BIGINT
) AS $$
DECLARE
  v_count BIGINT;
  v_space BIGINT;
BEGIN
  SELECT
    COUNT(*),
    SUM(size)
  INTO v_count, v_space
  FROM files
  WHERE deleted_at < NOW() - INTERVAL '30 days';

  DELETE FROM files
  WHERE deleted_at < NOW() - INTERVAL '30 days';

  RETURN QUERY SELECT v_count, v_space;
END;
$$ LANGUAGE plpgsql;

-- Get files pending virus scan
CREATE OR REPLACE FUNCTION get_pending_virus_scans(p_limit INT DEFAULT 100)
RETURNS TABLE(
  id UUID,
  key VARCHAR,
  tenant_id UUID,
  size BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    f.id,
    f.key,
    f.tenant_id,
    f.size,
    f.created_at
  FROM files f
  WHERE f.virus_scanned = false
    AND f.deleted_at IS NULL
    AND f.created_at > NOW() - INTERVAL '7 days'  -- Only scan recent files
  ORDER BY f.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Mark file as scanned
CREATE OR REPLACE FUNCTION mark_file_scanned(
  p_file_id UUID,
  p_scan_result JSONB
)
RETURNS VOID AS $$
BEGIN
  UPDATE files
  SET
    virus_scanned = true,
    virus_scan_result = p_scan_result,
    virus_scan_timestamp = NOW(),
    updated_at = NOW()
  WHERE id = p_file_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Views
-- ============================================

-- Storage statistics by tenant
CREATE OR REPLACE VIEW storage_stats_by_tenant AS
SELECT
  tenant_id,
  COUNT(*) as file_count,
  SUM(size) as total_size,
  AVG(size) as avg_file_size,
  MAX(size) as max_file_size,
  COUNT(*) FILTER (WHERE virus_scanned = false) as pending_scans,
  COUNT(*) FILTER (
    WHERE virus_scanned = true
    AND virus_scan_result->>'status' = 'infected'
  ) as infected_files
FROM files
WHERE deleted_at IS NULL
GROUP BY tenant_id;

-- Recent file uploads
CREATE OR REPLACE VIEW recent_uploads AS
SELECT
  f.id,
  f.original_name,
  f.size,
  f.mime_type,
  f.tenant_id,
  f.uploaded_by,
  f.entity_type,
  f.entity_id,
  f.created_at
FROM files f
WHERE f.deleted_at IS NULL
  AND f.created_at > NOW() - INTERVAL '24 hours'
ORDER BY f.created_at DESC;

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Enable RLS on files table
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only see their own files
CREATE POLICY tenant_isolation_policy ON files
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- Policy: Service role can see all files
CREATE POLICY service_role_policy ON files
  FOR ALL
  TO service_role
  USING (true);

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE files IS 'Tracks all uploaded files with metadata and storage keys';
COMMENT ON COLUMN files.key IS 'S3/MinIO storage key in format: tenant_id/entity_type/file_id.ext';
COMMENT ON COLUMN files.virus_scanned IS 'Whether file has been scanned by antivirus';
COMMENT ON COLUMN files.virus_scan_result IS 'JSON result from virus scanner';
COMMENT ON COLUMN files.metadata IS 'Additional metadata as JSON';
COMMENT ON COLUMN files.deleted_at IS 'Soft delete timestamp, NULL means active';

-- ============================================
-- Sample Data for Testing (Optional)
-- ============================================

-- Uncomment to insert sample data for testing
-- INSERT INTO files (tenant_id, uploaded_by, original_name, key, mime_type, size, entity_type, entity_id)
-- VALUES
--   ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002',
--    'sample-document.pdf', '00000000-0000-0000-0000-000000000001/contacts/12345.pdf',
--    'application/pdf', 102400, 'contact', '00000000-0000-0000-0000-000000000003');

SELECT 'Files table migration complete!' as status;
