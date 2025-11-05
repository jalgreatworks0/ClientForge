/**
 * Deals/Opportunities Database Schema
 * Tables for managing sales pipeline and deals
 */

-- Pipelines Table (Customizable sales pipelines)
CREATE TABLE pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_pipelines_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT unique_default_pipeline UNIQUE (tenant_id, is_default) WHERE is_default = true
);

CREATE INDEX idx_pipelines_tenant_id ON pipelines(tenant_id);
CREATE INDEX idx_pipelines_is_default ON pipelines(is_default);

-- Deal Stages (Customizable pipeline stages)
CREATE TABLE deal_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  pipeline_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL,
  probability INTEGER DEFAULT 0, -- 0-100
  is_closed_stage BOOLEAN DEFAULT false,
  is_won_stage BOOLEAN DEFAULT false,
  color VARCHAR(7), -- Hex color for UI
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_deal_stages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_deal_stages_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE,
  CONSTRAINT unique_stage_order UNIQUE (pipeline_id, display_order)
);

CREATE INDEX idx_deal_stages_tenant_id ON deal_stages(tenant_id);
CREATE INDEX idx_deal_stages_pipeline_id ON deal_stages(pipeline_id);
CREATE INDEX idx_deal_stages_display_order ON deal_stages(display_order);

-- Deals/Opportunities Table
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  account_id UUID,
  contact_id UUID,
  pipeline_id UUID NOT NULL,
  stage_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(15, 2),
  currency VARCHAR(3) DEFAULT 'USD',
  probability INTEGER DEFAULT 0, -- 0-100
  expected_close_date DATE,
  actual_close_date DATE,
  lead_source VARCHAR(100),
  next_step TEXT,
  description TEXT,
  tags TEXT[],
  is_closed BOOLEAN DEFAULT false,
  is_won BOOLEAN,
  lost_reason VARCHAR(255),
  competitors TEXT[],
  decision_makers TEXT[],
  key_contacts TEXT[],
  weighted_amount DECIMAL(15, 2), -- amount * probability
  days_in_stage INTEGER DEFAULT 0,
  last_stage_change_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  CONSTRAINT fk_deals_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_deals_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT fk_deals_account FOREIGN KEY (account_id) REFERENCES accounts(id),
  CONSTRAINT fk_deals_contact FOREIGN KEY (contact_id) REFERENCES contacts(id),
  CONSTRAINT fk_deals_pipeline FOREIGN KEY (pipeline_id) REFERENCES pipelines(id),
  CONSTRAINT fk_deals_stage FOREIGN KEY (stage_id) REFERENCES deal_stages(id)
);

CREATE INDEX idx_deals_tenant_id ON deals(tenant_id);
CREATE INDEX idx_deals_owner_id ON deals(owner_id);
CREATE INDEX idx_deals_account_id ON deals(account_id);
CREATE INDEX idx_deals_contact_id ON deals(contact_id);
CREATE INDEX idx_deals_pipeline_id ON deals(pipeline_id);
CREATE INDEX idx_deals_stage_id ON deals(stage_id);
CREATE INDEX idx_deals_close_date ON deals(expected_close_date);
CREATE INDEX idx_deals_amount ON deals(amount DESC);
CREATE INDEX idx_deals_weighted_amount ON deals(weighted_amount DESC);
CREATE INDEX idx_deals_is_closed ON deals(is_closed);
CREATE INDEX idx_deals_tags ON deals USING GIN(tags);

-- Full-text search index for deals
CREATE INDEX idx_deals_search ON deals USING GIN(
  to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, ''))
);

-- Deal Stage History (Track stage changes)
CREATE TABLE deal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  deal_id UUID NOT NULL,
  from_stage_id UUID,
  to_stage_id UUID NOT NULL,
  changed_by UUID NOT NULL,
  duration_days INTEGER, -- Days in previous stage
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deal_history_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_deal_history_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE,
  CONSTRAINT fk_deal_history_from_stage FOREIGN KEY (from_stage_id) REFERENCES deal_stages(id),
  CONSTRAINT fk_deal_history_to_stage FOREIGN KEY (to_stage_id) REFERENCES deal_stages(id),
  CONSTRAINT fk_deal_history_changed_by FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE INDEX idx_deal_history_tenant_id ON deal_stage_history(tenant_id);
CREATE INDEX idx_deal_history_deal_id ON deal_stage_history(deal_id);
CREATE INDEX idx_deal_history_created_at ON deal_stage_history(created_at DESC);

-- Deal Products (Products/Services associated with deal)
CREATE TABLE deal_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  deal_id UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  discount DECIMAL(5, 2) DEFAULT 0, -- Percentage
  total_price DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_deal_products_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  CONSTRAINT fk_deal_products_deal FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE
);

CREATE INDEX idx_deal_products_tenant_id ON deal_products(tenant_id);
CREATE INDEX idx_deal_products_deal_id ON deal_products(deal_id);

-- Trigger to update weighted_amount when amount or probability changes
CREATE OR REPLACE FUNCTION update_deal_weighted_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.weighted_amount := COALESCE(NEW.amount, 0) * (COALESCE(NEW.probability, 0) / 100.0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deal_weighted_amount
BEFORE INSERT OR UPDATE OF amount, probability ON deals
FOR EACH ROW
EXECUTE FUNCTION update_deal_weighted_amount();

-- Trigger to track stage changes
CREATE OR REPLACE FUNCTION track_deal_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.stage_id IS DISTINCT FROM NEW.stage_id) THEN
    INSERT INTO deal_stage_history (
      tenant_id,
      deal_id,
      from_stage_id,
      to_stage_id,
      changed_by,
      duration_days
    ) VALUES (
      NEW.tenant_id,
      NEW.id,
      OLD.stage_id,
      NEW.stage_id,
      NEW.owner_id, -- Assuming owner makes the change; update based on your auth system
      COALESCE(EXTRACT(DAY FROM (CURRENT_TIMESTAMP - OLD.last_stage_change_at))::INTEGER, 0)
    );

    NEW.last_stage_change_at := CURRENT_TIMESTAMP;
    NEW.days_in_stage := 0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_track_deal_stage_change
BEFORE UPDATE OF stage_id ON deals
FOR EACH ROW
EXECUTE FUNCTION track_deal_stage_change();

-- Comments
COMMENT ON TABLE pipelines IS 'Customizable sales pipelines for organizing deals';
COMMENT ON TABLE deal_stages IS 'Stages within a pipeline with probability and order';
COMMENT ON TABLE deals IS 'Sales opportunities with amount, stage, and forecast data';
COMMENT ON TABLE deal_stage_history IS 'Historical record of stage changes for deals';
COMMENT ON TABLE deal_products IS 'Products/services associated with deals';
