-- =============================================================================
-- GDPR Compliance Tables
-- Manages data subject requests and consent records
-- =============================================================================

-- Data Subject Requests Table
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'restriction')),
    subject_email VARCHAR(255) NOT NULL,
    subject_identifier VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
    requested_by UUID NOT NULL REFERENCES users(id),
    request_date TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_date TIMESTAMP,
    data_export_url TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Consent Records Table
CREATE TABLE IF NOT EXISTS consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(100) NOT NULL,
    granted BOOLEAN NOT NULL,
    granted_at TIMESTAMP,
    revoked_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    version VARCHAR(20) NOT NULL DEFAULT '1.0',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_data_subject_requests_tenant ON data_subject_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_email ON data_subject_requests(subject_email);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status ON data_subject_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_type ON data_subject_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_date ON data_subject_requests(request_date DESC);

CREATE INDEX IF NOT EXISTS idx_consent_records_tenant ON consent_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_user ON consent_records(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_records_type ON consent_records(consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_granted ON consent_records(granted);
CREATE INDEX IF NOT EXISTS idx_consent_records_created ON consent_records(created_at DESC);

-- Composite index for checking latest consent status
CREATE INDEX IF NOT EXISTS idx_consent_records_lookup ON consent_records(tenant_id, user_id, consent_type, created_at DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_gdpr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_subject_requests_updated_at
    BEFORE UPDATE ON data_subject_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_gdpr_updated_at();

CREATE TRIGGER consent_records_updated_at
    BEFORE UPDATE ON consent_records
    FOR EACH ROW
    EXECUTE FUNCTION update_gdpr_updated_at();

-- =============================================================================
-- AUDIT LOGGING
-- =============================================================================

-- Log all data subject requests to audit trail
CREATE OR REPLACE FUNCTION log_data_subject_request()
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
        NEW.requested_by,
        CASE
            WHEN TG_OP = 'INSERT' THEN 'gdpr_request_created'
            WHEN TG_OP = 'UPDATE' AND NEW.status != OLD.status THEN 'gdpr_request_status_changed'
            ELSE 'gdpr_request_updated'
        END,
        'data_subject_request',
        NEW.id,
        jsonb_build_object(
            'request_type', NEW.request_type,
            'status', NEW.status,
            'subject_email', NEW.subject_email
        ),
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER data_subject_request_audit
    AFTER INSERT OR UPDATE ON data_subject_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_data_subject_request();

-- Log consent changes
CREATE OR REPLACE FUNCTION log_consent_change()
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
        NEW.user_id,
        CASE
            WHEN NEW.granted THEN 'consent_granted'
            ELSE 'consent_revoked'
        END,
        'consent_record',
        NEW.id,
        jsonb_build_object(
            'consent_type', NEW.consent_type,
            'granted', NEW.granted,
            'version', NEW.version
        ),
        NEW.ip_address
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER consent_record_audit
    AFTER INSERT ON consent_records
    FOR EACH ROW
    EXECUTE FUNCTION log_consent_change();

-- =============================================================================
-- RETENTION POLICY
-- =============================================================================

-- Function to clean up completed requests older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_gdpr_requests()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM data_subject_requests
    WHERE status = 'completed'
    AND completed_date < NOW() - INTERVAL '90 days';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for active data subject requests
CREATE OR REPLACE VIEW active_data_subject_requests AS
SELECT
    dsr.*,
    u.email as requester_email,
    u.first_name || ' ' || u.last_name as requester_name,
    t.name as tenant_name
FROM data_subject_requests dsr
JOIN users u ON dsr.requested_by = u.id
JOIN tenants t ON dsr.tenant_id = t.id
WHERE dsr.status IN ('pending', 'processing')
ORDER BY dsr.request_date ASC;

-- View for consent summary by user
CREATE OR REPLACE VIEW user_consent_summary AS
SELECT
    tenant_id,
    user_id,
    consent_type,
    granted,
    granted_at,
    revoked_at,
    version,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY tenant_id, user_id, consent_type ORDER BY created_at DESC) as rn
FROM consent_records;

-- Latest consent status per user per type
CREATE OR REPLACE VIEW latest_user_consents AS
SELECT
    tenant_id,
    user_id,
    consent_type,
    granted,
    granted_at,
    revoked_at,
    version,
    created_at
FROM user_consent_summary
WHERE rn = 1;

-- =============================================================================
-- SAMPLE DATA (Development/Testing Only)
-- =============================================================================

-- Insert sample consent types documentation
COMMENT ON TABLE consent_records IS 'Stores user consent records for GDPR compliance. Common consent types: marketing_emails, analytics, third_party_sharing, data_processing';
COMMENT ON TABLE data_subject_requests IS 'Manages GDPR data subject access requests (DSARs) including access, erasure, portability, rectification, and restriction requests';

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON data_subject_requests TO clientforge_app;
GRANT SELECT, INSERT ON consent_records TO clientforge_app;
GRANT SELECT ON active_data_subject_requests TO clientforge_app;
GRANT SELECT ON latest_user_consents TO clientforge_app;
GRANT EXECUTE ON FUNCTION cleanup_old_gdpr_requests() TO clientforge_app;
