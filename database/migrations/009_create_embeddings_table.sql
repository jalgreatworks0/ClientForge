-- Migration: Create Embeddings Table for Vector Search
-- Description: Sets up pgvector extension and embeddings storage
-- Author: System
-- Date: 2025-01-15

-- Enable pgvector extension (requires PostgreSQL with pgvector installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL, -- 'contact', 'account', 'deal', 'task', etc.
  entity_id UUID NOT NULL,
  content TEXT NOT NULL, -- The text that was embedded
  embedding vector(1536) NOT NULL, -- OpenAI text-embedding-3-small dimensions
  metadata JSONB, -- Additional searchable metadata
  model VARCHAR(100) NOT NULL DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,

  -- Composite unique constraint to prevent duplicates
  CONSTRAINT unique_entity_embedding UNIQUE (tenant_id, entity_type, entity_id)
);

-- Create indexes for efficient queries

-- Index for tenant isolation
CREATE INDEX idx_embeddings_tenant_id ON embeddings(tenant_id);

-- Index for entity type filtering
CREATE INDEX idx_embeddings_entity_type ON embeddings(tenant_id, entity_type);

-- Index for metadata search
CREATE INDEX idx_embeddings_metadata ON embeddings USING GIN (metadata);

-- Vector similarity search indexes (choose one based on data size and requirements)

-- IVFFlat index (good for 10K-1M vectors, faster build time)
CREATE INDEX idx_embeddings_vector_ivfflat ON embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- HNSW index (better for accuracy, higher memory usage, slower build)
-- Uncomment below and comment IVFFlat if preferred
-- CREATE INDEX idx_embeddings_vector_hnsw ON embeddings
-- USING hnsw (embedding vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);

-- Index for timestamp-based queries
CREATE INDEX idx_embeddings_created_at ON embeddings(created_at);

-- Add comments for documentation
COMMENT ON TABLE embeddings IS 'Stores vector embeddings for semantic search across all entities';
COMMENT ON COLUMN embeddings.entity_type IS 'Type of entity: contact, account, deal, task, etc.';
COMMENT ON COLUMN embeddings.entity_id IS 'Foreign key to the actual entity (not enforced for flexibility)';
COMMENT ON COLUMN embeddings.embedding IS 'Vector representation from OpenAI embeddings model';
COMMENT ON COLUMN embeddings.metadata IS 'Additional context stored as JSONB for filtering';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON embeddings TO app_user;

-- Add to RLS (Row-Level Security) for tenant isolation
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access embeddings from their own tenant
CREATE POLICY tenant_isolation_embeddings ON embeddings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::UUID);

-- Policy: Service role can access all (for backfill operations)
CREATE POLICY service_access_embeddings ON embeddings
  FOR ALL
  TO service_role
  USING (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_embeddings_updated_at
  BEFORE UPDATE ON embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_embeddings_updated_at();

-- Sample query examples (for documentation)

-- Similarity search (cosine distance)
-- SELECT
--   entity_id,
--   content,
--   1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
-- FROM embeddings
-- WHERE tenant_id = 'xxx'
--   AND entity_type = 'contact'
-- ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
-- LIMIT 10;

-- Statistics query
-- SELECT
--   entity_type,
--   COUNT(*) as count,
--   AVG(array_length(embedding, 1)) as avg_dimensions
-- FROM embeddings
-- WHERE tenant_id = 'xxx'
-- GROUP BY entity_type;
