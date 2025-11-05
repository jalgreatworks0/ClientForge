-- =====================================================
-- Notes, Tags, Comments & Custom Fields Schema
-- Week 9-10: Flexible metadata and annotation system
-- =====================================================

-- =====================================================
-- NOTES TABLE
-- Polymorphic notes system - attach notes to any entity
-- =====================================================
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Note Content
  title VARCHAR(255),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,

  -- Polymorphic relationship (can attach to any entity)
  entity_type VARCHAR(50) NOT NULL, -- contact, account, deal, task, etc.
  entity_id UUID NOT NULL,

  -- Ownership
  created_by UUID NOT NULL, -- References users.id
  updated_by UUID,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Indexes
  CONSTRAINT notes_entity_type_check CHECK (length(entity_type) > 0)
);

-- Indexes for notes
CREATE INDEX idx_notes_tenant_id ON notes(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_entity ON notes(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_created_by ON notes(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_notes_is_pinned ON notes(is_pinned) WHERE deleted_at IS NULL AND is_pinned = true;

-- Full-text search index for notes
CREATE INDEX idx_notes_search ON notes USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
) WHERE deleted_at IS NULL;

-- =====================================================
-- COMMENTS TABLE
-- Threaded comments system with parent-child relationships
-- =====================================================
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Comment Content
  content TEXT NOT NULL,

  -- Polymorphic relationship (can attach to any entity)
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,

  -- Threading support
  parent_id UUID, -- References comments.id for nested comments

  -- Ownership
  created_by UUID NOT NULL, -- References users.id
  updated_by UUID,

  -- Metadata
  is_edited BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT comments_entity_type_check CHECK (length(entity_type) > 0),
  CONSTRAINT fk_comments_parent FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

-- Indexes for comments
CREATE INDEX idx_comments_tenant_id ON comments(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent_id ON comments(parent_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_created_by ON comments(created_by) WHERE deleted_at IS NULL;

-- Full-text search index for comments
CREATE INDEX idx_comments_search ON comments USING GIN(
  to_tsvector('english', COALESCE(content, ''))
) WHERE deleted_at IS NULL;

-- =====================================================
-- TAGS TABLE
-- Centralized tags with categories and colors
-- =====================================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Tag Details
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL, -- URL-friendly version of name
  description TEXT,
  color VARCHAR(50) DEFAULT '#3B82F6', -- Hex color code
  category VARCHAR(50), -- e.g., 'status', 'priority', 'custom'

  -- Usage tracking
  usage_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT tags_name_check CHECK (length(trim(name)) > 0),
  CONSTRAINT tags_slug_check CHECK (length(trim(slug)) > 0),
  CONSTRAINT tags_unique_name UNIQUE (tenant_id, name, deleted_at),
  CONSTRAINT tags_unique_slug UNIQUE (tenant_id, slug, deleted_at)
);

-- Indexes for tags
CREATE INDEX idx_tags_tenant_id ON tags(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_tags_category ON tags(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_tags_usage_count ON tags(usage_count DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_tags_name ON tags(name) WHERE deleted_at IS NULL;

-- =====================================================
-- ENTITY_TAGS TABLE
-- Polymorphic many-to-many relationship between entities and tags
-- =====================================================
CREATE TABLE entity_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Entity reference (polymorphic)
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,

  -- Tag reference
  tag_id UUID NOT NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT entity_tags_entity_type_check CHECK (length(entity_type) > 0),
  CONSTRAINT entity_tags_unique UNIQUE (tenant_id, entity_type, entity_id, tag_id),
  CONSTRAINT fk_entity_tags_tag FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Indexes for entity_tags
CREATE INDEX idx_entity_tags_tenant_id ON entity_tags(tenant_id);
CREATE INDEX idx_entity_tags_entity ON entity_tags(entity_type, entity_id);
CREATE INDEX idx_entity_tags_tag_id ON entity_tags(tag_id);

-- =====================================================
-- CUSTOM_FIELDS TABLE
-- Dynamic field definitions per entity type
-- =====================================================
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Field Definition
  entity_type VARCHAR(50) NOT NULL, -- contact, account, deal, etc.
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(255) NOT NULL,
  field_type VARCHAR(50) NOT NULL, -- text, number, date, boolean, select, multiselect, url, email, phone

  -- Field Configuration
  field_options JSONB, -- For select/multiselect: ["Option 1", "Option 2"]
  default_value TEXT,
  is_required BOOLEAN DEFAULT false,
  is_searchable BOOLEAN DEFAULT false,
  is_visible BOOLEAN DEFAULT true,

  -- Validation Rules
  validation_rules JSONB, -- {"min": 0, "max": 100, "pattern": "^\\d{3}-\\d{3}-\\d{4}$"}

  -- Display Configuration
  display_order INTEGER DEFAULT 0,
  help_text TEXT,
  placeholder_text VARCHAR(255),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT custom_fields_entity_type_check CHECK (length(entity_type) > 0),
  CONSTRAINT custom_fields_field_name_check CHECK (length(trim(field_name)) > 0),
  CONSTRAINT custom_fields_field_type_check CHECK (field_type IN (
    'text', 'textarea', 'number', 'date', 'datetime', 'boolean',
    'select', 'multiselect', 'url', 'email', 'phone', 'currency'
  )),
  CONSTRAINT custom_fields_unique UNIQUE (tenant_id, entity_type, field_name, deleted_at)
);

-- Indexes for custom_fields
CREATE INDEX idx_custom_fields_tenant_id ON custom_fields(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_custom_fields_entity_type ON custom_fields(entity_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_custom_fields_display_order ON custom_fields(display_order) WHERE deleted_at IS NULL;

-- =====================================================
-- CUSTOM_FIELD_VALUES TABLE
-- Actual values for custom fields per entity
-- =====================================================
CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Entity reference (polymorphic)
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,

  -- Field reference
  field_id UUID NOT NULL,

  -- Value (stored as text, parsed based on field_type)
  value TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT custom_field_values_entity_type_check CHECK (length(entity_type) > 0),
  CONSTRAINT custom_field_values_unique UNIQUE (tenant_id, entity_type, entity_id, field_id),
  CONSTRAINT fk_custom_field_values_field FOREIGN KEY (field_id) REFERENCES custom_fields(id) ON DELETE CASCADE
);

-- Indexes for custom_field_values
CREATE INDEX idx_custom_field_values_tenant_id ON custom_field_values(tenant_id);
CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX idx_custom_field_values_field_id ON custom_field_values(field_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update updated_at timestamp for notes
CREATE OR REPLACE FUNCTION update_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notes_updated_at
BEFORE UPDATE ON notes
FOR EACH ROW
EXECUTE FUNCTION update_notes_updated_at();

-- Update updated_at timestamp for comments
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  NEW.is_edited := true;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comments_updated_at
BEFORE UPDATE OF content ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comments_updated_at();

-- Update updated_at timestamp for tags
CREATE OR REPLACE FUNCTION update_tags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tags_updated_at
BEFORE UPDATE ON tags
FOR EACH ROW
EXECUTE FUNCTION update_tags_updated_at();

-- Increment tag usage count when tag is assigned
CREATE OR REPLACE FUNCTION increment_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tags
  SET usage_count = usage_count + 1
  WHERE id = NEW.tag_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_tag_usage
AFTER INSERT ON entity_tags
FOR EACH ROW
EXECUTE FUNCTION increment_tag_usage();

-- Decrement tag usage count when tag is unassigned
CREATE OR REPLACE FUNCTION decrement_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tags
  SET usage_count = GREATEST(usage_count - 1, 0)
  WHERE id = OLD.tag_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decrement_tag_usage
AFTER DELETE ON entity_tags
FOR EACH ROW
EXECUTE FUNCTION decrement_tag_usage();

-- Update updated_at timestamp for custom_fields
CREATE OR REPLACE FUNCTION update_custom_fields_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_fields_updated_at
BEFORE UPDATE ON custom_fields
FOR EACH ROW
EXECUTE FUNCTION update_custom_fields_updated_at();

-- Update updated_at timestamp for custom_field_values
CREATE OR REPLACE FUNCTION update_custom_field_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_custom_field_values_updated_at
BEFORE UPDATE ON custom_field_values
FOR EACH ROW
EXECUTE FUNCTION update_custom_field_values_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE notes IS 'Polymorphic notes system - attach notes to any entity type';
COMMENT ON TABLE comments IS 'Threaded comments system with parent-child relationships';
COMMENT ON TABLE tags IS 'Centralized tags with categories and colors';
COMMENT ON TABLE entity_tags IS 'Polymorphic many-to-many relationship between entities and tags';
COMMENT ON TABLE custom_fields IS 'Dynamic field definitions per entity type';
COMMENT ON TABLE custom_field_values IS 'Actual values for custom fields per entity';

COMMENT ON COLUMN notes.entity_type IS 'Type of entity this note is attached to (contact, account, deal, etc.)';
COMMENT ON COLUMN notes.entity_id IS 'ID of the entity this note is attached to';
COMMENT ON COLUMN comments.parent_id IS 'Parent comment ID for nested/threaded comments';
COMMENT ON COLUMN tags.slug IS 'URL-friendly version of tag name';
COMMENT ON COLUMN tags.usage_count IS 'Number of entities currently using this tag';
COMMENT ON COLUMN custom_fields.field_options IS 'JSON array of options for select/multiselect fields';
COMMENT ON COLUMN custom_fields.validation_rules IS 'JSON object containing validation rules (min, max, pattern, etc.)';
COMMENT ON COLUMN custom_field_values.value IS 'Value stored as text, parsed based on field_type';
