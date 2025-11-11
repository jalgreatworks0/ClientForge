-- =============================================================================
-- Import/Export System
-- Manages bulk data import and export operations
-- =============================================================================

-- Import Jobs Table
CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('contact', 'deal', 'company', 'lead')),
    file_name VARCHAR(255) NOT NULL,
    file_format VARCHAR(20) NOT NULL CHECK (file_format IN ('csv', 'xlsx', 'json')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_records INTEGER DEFAULT 0,
    processed_records INTEGER DEFAULT 0,
    successful_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]'::jsonb,
    mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Export Jobs Table
CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('contact', 'deal', 'company', 'lead')),
    file_format VARCHAR(20) NOT NULL CHECK (file_format IN ('csv', 'xlsx', 'json')),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_records INTEGER DEFAULT 0,
    filters JSONB DEFAULT '{}'::jsonb,
    fields JSONB DEFAULT '[]'::jsonb,
    download_url TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_import_jobs_tenant ON import_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_entity_type ON import_jobs(entity_type);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON import_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_export_jobs_tenant ON export_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_entity_type ON export_jobs(entity_type);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created ON export_jobs(created_at DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_import_export_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER import_jobs_updated_at
    BEFORE UPDATE ON import_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_import_export_updated_at();

CREATE TRIGGER export_jobs_updated_at
    BEFORE UPDATE ON export_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_import_export_updated_at();

-- =============================================================================
-- AUDIT LOGGING
-- =============================================================================

-- Log import job changes
CREATE OR REPLACE FUNCTION log_import_job_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        metadata,
        ip_address
    ) VALUES (
        NEW.tenant_id,
        NEW.created_by,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'import_job_created'
            WHEN NEW.status = 'completed' THEN 'import_job_completed'
            WHEN NEW.status = 'failed' THEN 'import_job_failed'
            ELSE 'import_job_updated'
        END,
        'import_job',
        NEW.id,
        jsonb_build_object(
            'entity_type', NEW.entity_type,
            'file_format', NEW.file_format,
            'status', NEW.status,
            'total_records', NEW.total_records,
            'successful_records', NEW.successful_records,
            'failed_records', NEW.failed_records
        ),
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER import_job_audit
    AFTER INSERT OR UPDATE ON import_jobs
    FOR EACH ROW
    EXECUTE FUNCTION log_import_job_change();

-- Log export job changes
CREATE OR REPLACE FUNCTION log_export_job_change()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        tenant_id,
        user_id,
        action,
        resource_type,
        resource_id,
        metadata,
        ip_address
    ) VALUES (
        NEW.tenant_id,
        NEW.created_by,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'export_job_created'
            WHEN NEW.status = 'completed' THEN 'export_job_completed'
            WHEN NEW.status = 'failed' THEN 'export_job_failed'
            ELSE 'export_job_updated'
        END,
        'export_job',
        NEW.id,
        jsonb_build_object(
            'entity_type', NEW.entity_type,
            'file_format', NEW.file_format,
            'status', NEW.status,
            'total_records', NEW.total_records
        ),
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER export_job_audit
    AFTER INSERT OR UPDATE ON export_jobs
    FOR EACH ROW
    EXECUTE FUNCTION log_export_job_change();

-- =============================================================================
-- RETENTION POLICY
-- =============================================================================

-- Function to clean up old import/export jobs
CREATE OR REPLACE FUNCTION cleanup_old_import_export_jobs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete completed/failed import jobs older than 30 days
    DELETE FROM import_jobs
    WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Delete completed/failed export jobs older than 30 days
    DELETE FROM export_jobs
    WHERE status IN ('completed', 'failed')
    AND created_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for active import jobs
CREATE OR REPLACE VIEW active_import_jobs AS
SELECT
    ij.*,
    u.email as creator_email,
    u.first_name || ' ' || u.last_name as creator_name,
    t.name as tenant_name,
    ROUND((ij.processed_records::numeric / NULLIF(ij.total_records, 0)) * 100, 2) as progress_percentage
FROM import_jobs ij
JOIN users u ON ij.created_by = u.id
JOIN tenants t ON ij.tenant_id = t.id
WHERE ij.status IN ('pending', 'processing')
ORDER BY ij.created_at DESC;

-- View for active export jobs
CREATE OR REPLACE VIEW active_export_jobs AS
SELECT
    ej.*,
    u.email as creator_email,
    u.first_name || ' ' || u.last_name as creator_name,
    t.name as tenant_name
FROM export_jobs ej
JOIN users u ON ej.created_by = u.id
JOIN tenants t ON ej.tenant_id = t.id
WHERE ej.status IN ('pending', 'processing')
ORDER BY ej.created_at DESC;

-- View for import/export statistics
CREATE OR REPLACE VIEW import_export_stats AS
SELECT
    tenant_id,
    entity_type,
    'import' as operation_type,
    COUNT(*) as total_jobs,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
    SUM(successful_records) as total_successful_records,
    SUM(failed_records) as total_failed_records
FROM import_jobs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY tenant_id, entity_type

UNION ALL

SELECT
    tenant_id,
    entity_type,
    'export' as operation_type,
    COUNT(*) as total_jobs,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_jobs,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_jobs,
    SUM(total_records) as total_successful_records,
    0 as total_failed_records
FROM export_jobs
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY tenant_id, entity_type;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE import_jobs IS 'Tracks bulk data import operations from CSV, Excel, or JSON files';
COMMENT ON TABLE export_jobs IS 'Tracks bulk data export operations to CSV, Excel, or JSON files';
COMMENT ON COLUMN import_jobs.mapping IS 'JSON mapping of source fields to target database fields';
COMMENT ON COLUMN import_jobs.errors IS 'Array of errors encountered during import with row numbers';
COMMENT ON COLUMN export_jobs.filters IS 'JSON filters applied to the export query';
COMMENT ON COLUMN export_jobs.fields IS 'Array of field names to include in the export';

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON import_jobs TO clientforge_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON export_jobs TO clientforge_app;
GRANT SELECT ON active_import_jobs TO clientforge_app;
GRANT SELECT ON active_export_jobs TO clientforge_app;
GRANT SELECT ON import_export_stats TO clientforge_app;
GRANT EXECUTE ON FUNCTION cleanup_old_import_export_jobs() TO clientforge_app;
