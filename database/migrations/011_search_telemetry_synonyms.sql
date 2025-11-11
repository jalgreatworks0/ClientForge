/**
 * Search Telemetry and Synonyms Tables
 * Tracks search queries and manages synonym groups
 */

-- Search Telemetry Table
CREATE TABLE IF NOT EXISTS search_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  query_lowercase TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'all', -- 'contacts', 'accounts', 'deals', 'all'
  result_count INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER NOT NULL,
  clicked BOOLEAN DEFAULT FALSE,
  clicked_id UUID,
  clicked_index INTEGER,
  clicked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for search telemetry
CREATE INDEX idx_search_telemetry_tenant ON search_telemetry(tenant_id);
CREATE INDEX idx_search_telemetry_user ON search_telemetry(user_id);
CREATE INDEX idx_search_telemetry_query_lower ON search_telemetry(query_lowercase);
CREATE INDEX idx_search_telemetry_created ON search_telemetry(created_at DESC);
CREATE INDEX idx_search_telemetry_zero_results ON search_telemetry(tenant_id, result_count) WHERE result_count = 0;

-- Search Synonyms Table
CREATE TABLE IF NOT EXISTS search_synonyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  synonyms TEXT[] NOT NULL, -- Array of synonyms, e.g., ['phone', 'mobile', 'cell']
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for synonyms
CREATE INDEX idx_search_synonyms_tenant ON search_synonyms(tenant_id);

-- Add comments
COMMENT ON TABLE search_telemetry IS 'Tracks all search queries and user interactions for analytics';
COMMENT ON TABLE search_synonyms IS 'Manages synonym groups for improving search recall';

COMMENT ON COLUMN search_telemetry.query_lowercase IS 'Lowercase version of query for aggregation';
COMMENT ON COLUMN search_telemetry.result_count IS 'Number of results returned';
COMMENT ON COLUMN search_telemetry.response_time_ms IS 'Search response time in milliseconds';
COMMENT ON COLUMN search_telemetry.clicked IS 'Whether user clicked on a result';
COMMENT ON COLUMN search_telemetry.clicked_id IS 'ID of the clicked result entity';
COMMENT ON COLUMN search_telemetry.clicked_index IS 'Position of clicked result (0-indexed)';

COMMENT ON COLUMN search_synonyms.synonyms IS 'Array of synonym terms that should be treated as equivalent';
