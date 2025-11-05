/**
 * CRM Core Tables Schema
 * Contacts, Accounts, Custom Fields
 * Week 5: Contacts Module
 */

-- ============================================
-- Accounts/Companies Table
-- ============================================
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
  CONSTRAINT fk_accounts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_accounts_owner FOREIGN KEY (owner_id) REFERENCES users(id)
);

CREATE INDEX idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX idx_accounts_owner_id ON accounts(owner_id);
CREATE INDEX idx_accounts_name ON accounts(name);
CREATE INDEX idx_accounts_industry ON accounts(industry) WHERE industry IS NOT NULL;
CREATE INDEX idx_accounts_tags ON accounts USING GIN(tags);
CREATE INDEX idx_accounts_active ON accounts(is_active) WHERE deleted_at IS NULL;

-- ============================================
-- Contacts Table
-- ============================================
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
  lead_status VARCHAR(50) DEFAULT 'new', -- new, contacted, qualified, unqualified
  lifecycle_stage VARCHAR(50) DEFAULT 'lead', -- lead, mql, sql, opportunity, customer
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
  CONSTRAINT fk_contacts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_contacts_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT fk_contacts_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
  CONSTRAINT check_email_or_phone CHECK (email IS NOT NULL OR phone IS NOT NULL OR mobile IS NOT NULL)
);

CREATE INDEX idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX idx_contacts_owner_id ON contacts(owner_id);
CREATE INDEX idx_contacts_account_id ON contacts(account_id) WHERE account_id IS NOT NULL;
CREATE INDEX idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_contacts_lead_status ON contacts(lead_status);
CREATE INDEX idx_contacts_lifecycle_stage ON contacts(lifecycle_stage);
CREATE INDEX idx_contacts_lead_score ON contacts(lead_score DESC);
CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX idx_contacts_active ON contacts(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_name ON contacts(first_name, last_name);

-- Full-text search index for contacts
CREATE INDEX idx_contacts_search ON contacts USING GIN(
  to_tsvector('english',
    COALESCE(first_name, '') || ' ' ||
    COALESCE(last_name, '') || ' ' ||
    COALESCE(email, '') || ' ' ||
    COALESCE(title, '') || ' ' ||
    COALESCE(department, '')
  )
);

-- ============================================
-- Custom Fields System
-- ============================================
CREATE TABLE custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- contacts, accounts, deals, tasks
  field_name VARCHAR(100) NOT NULL,
  field_label VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL, -- text, number, date, boolean, select, multi-select, url, email, phone
  field_options JSONB, -- For select/multi-select types: {"options": ["option1", "option2"]}
  default_value TEXT,
  is_required BOOLEAN DEFAULT false,
  is_searchable BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  validation_rules JSONB, -- {"min": 0, "max": 100, "pattern": "regex"}
  help_text TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_fields_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_field_per_entity UNIQUE (tenant_id, entity_type, field_name),
  CONSTRAINT check_field_type CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multi-select', 'url', 'email', 'phone'))
);

CREATE INDEX idx_custom_fields_tenant ON custom_fields(tenant_id);
CREATE INDEX idx_custom_fields_entity_type ON custom_fields(tenant_id, entity_type);

CREATE TABLE custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  custom_field_id UUID NOT NULL,
  value TEXT,
  value_numeric DECIMAL(15, 4), -- For number types
  value_boolean BOOLEAN, -- For boolean types
  value_date TIMESTAMP, -- For date types
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_field_values_field FOREIGN KEY (custom_field_id) REFERENCES custom_fields(id) ON DELETE CASCADE,
  CONSTRAINT unique_field_value UNIQUE (entity_type, entity_id, custom_field_id)
);

CREATE INDEX idx_custom_field_values_entity ON custom_field_values(entity_type, entity_id);
CREATE INDEX idx_custom_field_values_field ON custom_field_values(custom_field_id);
CREATE INDEX idx_custom_field_values_numeric ON custom_field_values(value_numeric) WHERE value_numeric IS NOT NULL;
CREATE INDEX idx_custom_field_values_date ON custom_field_values(value_date) WHERE value_date IS NOT NULL;

-- ============================================
-- Contact-Account Relationships (Many-to-Many)
-- ============================================
CREATE TABLE contact_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL,
  account_id UUID NOT NULL,
  role VARCHAR(100), -- Primary Contact, Decision Maker, Influencer, etc.
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_contact_accounts_contact FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
  CONSTRAINT fk_contact_accounts_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT unique_contact_account UNIQUE (contact_id, account_id)
);

CREATE INDEX idx_contact_accounts_contact ON contact_accounts(contact_id);
CREATE INDEX idx_contact_accounts_account ON contact_accounts(account_id);

-- ============================================
-- Comments
-- ============================================
COMMENT ON TABLE accounts IS 'Companies/Organizations in the CRM';
COMMENT ON TABLE contacts IS 'Individual people/contacts in the CRM';
COMMENT ON TABLE custom_fields IS 'Flexible custom field definitions for any entity';
COMMENT ON TABLE custom_field_values IS 'Actual values of custom fields for entities';
COMMENT ON TABLE contact_accounts IS 'Many-to-many relationship between contacts and accounts';

COMMENT ON COLUMN contacts.lead_status IS 'Current status in the lead pipeline';
COMMENT ON COLUMN contacts.lifecycle_stage IS 'Overall customer lifecycle position';
COMMENT ON COLUMN contacts.lead_score IS 'AI-calculated lead quality score (0-100)';
COMMENT ON COLUMN custom_fields.field_options IS 'JSON options for select/multi-select fields';
COMMENT ON COLUMN custom_fields.validation_rules IS 'JSON validation rules (min, max, pattern, etc.)';
