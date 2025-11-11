-- =============================================================================
-- Custom Fields System
-- Allows dynamic field creation for any entity type
-- =============================================================================

-- Custom Field Definitions Table
CREATE TABLE IF NOT EXISTS custom_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('contact', 'deal', 'company', 'lead', 'ticket', 'project')),
    field_name VARCHAR(100) NOT NULL,
    field_label VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'datetime', 'select', 'multi-select', 'checkbox', 'url', 'email', 'phone', 'textarea', 'currency')),
    field_options JSONB DEFAULT '[]'::jsonb,
    default_value JSONB,
    required BOOLEAN DEFAULT FALSE,
    "order" INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    CONSTRAINT unique_field_name_per_entity UNIQUE (tenant_id, entity_type, field_name, deleted_at)
);

-- Add deleted_at column if it doesn't exist (for tables created by initial schema)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name='custom_fields' AND column_name='deleted_at') THEN
        ALTER TABLE custom_fields ADD COLUMN deleted_at TIMESTAMP;
    END IF;
END $$;

-- Custom Field Values Table
CREATE TABLE IF NOT EXISTS custom_field_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    field_id UUID NOT NULL REFERENCES custom_fields(id) ON DELETE CASCADE,
    entity_id UUID NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_field_value_per_entity UNIQUE (tenant_id, field_id, entity_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Custom Fields indexes
CREATE INDEX IF NOT EXISTS idx_custom_fields_tenant ON custom_fields(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_entity_type ON custom_fields(entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_fields_tenant_entity ON custom_fields(tenant_id, entity_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_custom_fields_order ON custom_fields("order");
CREATE INDEX IF NOT EXISTS idx_custom_fields_deleted ON custom_fields(deleted_at) WHERE deleted_at IS NOT NULL;

-- Custom Field Values indexes
CREATE INDEX IF NOT EXISTS idx_custom_field_values_tenant ON custom_field_values(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_field ON custom_field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity ON custom_field_values(entity_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_entity_type ON custom_field_values(entity_type);
CREATE INDEX IF NOT EXISTS idx_custom_field_values_lookup ON custom_field_values(tenant_id, entity_type, entity_id);

-- GIN index for JSONB value searches
CREATE INDEX IF NOT EXISTS idx_custom_field_values_value_gin ON custom_field_values USING GIN (value);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_custom_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_fields_updated_at
    BEFORE UPDATE ON custom_fields
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_fields_updated_at();

CREATE TRIGGER custom_field_values_updated_at
    BEFORE UPDATE ON custom_field_values
    FOR EACH ROW
    EXECUTE FUNCTION update_custom_fields_updated_at();

-- =============================================================================
-- AUDIT LOGGING
-- =============================================================================

-- Log custom field changes
CREATE OR REPLACE FUNCTION log_custom_field_change()
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
            WHEN TG_OP = 'INSERT' THEN 'custom_field_created'
            WHEN TG_OP = 'UPDATE' AND NEW.deleted_at IS NOT NULL THEN 'custom_field_deleted'
            ELSE 'custom_field_updated'
        END,
        'custom_field',
        NEW.id,
        jsonb_build_object(
            'entity_type', NEW.entity_type,
            'field_name', NEW.field_name,
            'field_type', NEW.field_type
        ),
        NULL
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_field_audit
    AFTER INSERT OR UPDATE ON custom_fields
    FOR EACH ROW
    EXECUTE FUNCTION log_custom_field_change();

-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to get all custom fields with values for an entity
CREATE OR REPLACE FUNCTION get_entity_with_custom_fields(
    p_tenant_id UUID,
    p_entity_type VARCHAR,
    p_entity_id UUID
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_object_agg(
        cf.field_name,
        COALESCE(cfv.value, cf.default_value)
    )
    INTO result
    FROM custom_fields cf
    LEFT JOIN custom_field_values cfv ON (
        cfv.field_id = cf.id
        AND cfv.entity_id = p_entity_id
        AND cfv.tenant_id = p_tenant_id
    )
    WHERE cf.tenant_id = p_tenant_id
    AND cf.entity_type = p_entity_type
    AND cf.deleted_at IS NULL;

    RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to validate required custom fields
CREATE OR REPLACE FUNCTION validate_required_custom_fields(
    p_tenant_id UUID,
    p_entity_type VARCHAR,
    p_entity_id UUID
)
RETURNS TABLE (
    field_name VARCHAR,
    field_label VARCHAR,
    is_missing BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cf.field_name,
        cf.field_label,
        (cfv.value IS NULL) as is_missing
    FROM custom_fields cf
    LEFT JOIN custom_field_values cfv ON (
        cfv.field_id = cf.id
        AND cfv.entity_id = p_entity_id
        AND cfv.tenant_id = p_tenant_id
    )
    WHERE cf.tenant_id = p_tenant_id
    AND cf.entity_type = p_entity_type
    AND cf.required = TRUE
    AND cf.deleted_at IS NULL
    AND (cfv.value IS NULL OR cfv.value = 'null'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- Function to bulk set custom field values
CREATE OR REPLACE FUNCTION bulk_set_custom_field_values(
    p_tenant_id UUID,
    p_entity_type VARCHAR,
    p_entity_id UUID,
    p_values JSONB
)
RETURNS VOID AS $$
DECLARE
    field_record RECORD;
    field_value JSONB;
BEGIN
    FOR field_record IN
        SELECT cf.id, cf.field_name
        FROM custom_fields cf
        WHERE cf.tenant_id = p_tenant_id
        AND cf.entity_type = p_entity_type
        AND cf.deleted_at IS NULL
    LOOP
        field_value := p_values -> field_record.field_name;

        IF field_value IS NOT NULL THEN
            INSERT INTO custom_field_values (
                tenant_id, field_id, entity_id, entity_type, value
            )
            VALUES (
                p_tenant_id,
                field_record.id,
                p_entity_id,
                p_entity_type,
                field_value
            )
            ON CONFLICT (tenant_id, field_id, entity_id)
            DO UPDATE SET value = field_value, updated_at = NOW();
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VIEWS
-- =============================================================================

-- View for custom fields with usage statistics
CREATE OR REPLACE VIEW custom_fields_with_stats AS
SELECT
    cf.*,
    COUNT(cfv.id) as value_count,
    COUNT(DISTINCT cfv.entity_id) as entity_count
FROM custom_fields cf
LEFT JOIN custom_field_values cfv ON cfv.field_id = cf.id
WHERE cf.deleted_at IS NULL
GROUP BY cf.id;

-- View for entities with custom field values (contact example)
CREATE OR REPLACE VIEW contacts_with_custom_fields AS
SELECT
    c.*,
    get_entity_with_custom_fields(c.tenant_id, 'contact', c.id) as custom_fields
FROM contacts c;

-- View for deals with custom field values
CREATE OR REPLACE VIEW deals_with_custom_fields AS
SELECT
    d.*,
    get_entity_with_custom_fields(d.tenant_id, 'deal', d.id) as custom_fields
FROM deals d;

-- =============================================================================
-- SAMPLE DATA (Development/Testing Only)
-- =============================================================================

-- Example: Add sample custom fields for contacts
COMMENT ON TABLE custom_fields IS 'Stores custom field definitions for dynamic entity attributes';
COMMENT ON TABLE custom_field_values IS 'Stores actual values of custom fields for entities';

-- Example custom field types:
-- text: Single line text input
-- textarea: Multi-line text input
-- number: Numeric input
-- currency: Money amount with currency symbol
-- date: Date picker (YYYY-MM-DD)
-- datetime: Date and time picker
-- select: Dropdown with single selection
-- multi-select: Dropdown with multiple selections
-- checkbox: Boolean yes/no
-- url: URL input with validation
-- email: Email input with validation
-- phone: Phone number input

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON custom_fields TO clientforge_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON custom_field_values TO clientforge_app;
GRANT SELECT ON custom_fields_with_stats TO clientforge_app;
GRANT SELECT ON contacts_with_custom_fields TO clientforge_app;
GRANT SELECT ON deals_with_custom_fields TO clientforge_app;
GRANT EXECUTE ON FUNCTION get_entity_with_custom_fields(UUID, VARCHAR, UUID) TO clientforge_app;
GRANT EXECUTE ON FUNCTION validate_required_custom_fields(UUID, VARCHAR, UUID) TO clientforge_app;
GRANT EXECUTE ON FUNCTION bulk_set_custom_field_values(UUID, VARCHAR, UUID, JSONB) TO clientforge_app;
