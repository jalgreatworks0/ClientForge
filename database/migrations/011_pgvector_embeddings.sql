/**
 * pgvector Embeddings Migration
 * Adds vector search capabilities with versioning support
 * Created: 2025-11-10
 * Phase: AI & Vector Search Implementation
 */

-- ============================================
-- Install pgvector Extension
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- Embeddings Table with Versioning
-- ============================================

CREATE TABLE IF NOT EXISTS embeddings (
  id BIGSERIAL PRIMARY KEY,

  -- Entity reference
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  tenant_id UUID NOT NULL,

  -- Vector data
  embedding vector(1536),  -- Default to OpenAI ada-002/text-embedding-3-small size

  -- Model versioning
  embedding_model VARCHAR(100) DEFAULT 'text-embedding-3-small',
  embedding_version VARCHAR(20) DEFAULT '1.0',
  embedding_dimensions INT DEFAULT 1536,

  -- Source text tracking
  text_hash VARCHAR(64),  -- MD5 hash to detect if source text changed
  source_text TEXT,       -- Optional: store source for reprocessing

  -- Status tracking
  status VARCHAR(20) DEFAULT 'pending',  -- pending, processing, completed, failed
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one embedding per entity/model combination
  UNIQUE(entity_type, entity_id, embedding_model)
);

-- ============================================
-- Indexes (Create AFTER backfilling data)
-- ============================================

-- Regular indexes for lookups
CREATE INDEX idx_embeddings_entity
  ON embeddings(entity_type, entity_id);

CREATE INDEX idx_embeddings_tenant
  ON embeddings(tenant_id)
  WHERE embedding IS NOT NULL;

CREATE INDEX idx_embeddings_status
  ON embeddings(status, created_at)
  WHERE status != 'completed';

CREATE INDEX idx_embeddings_text_hash
  ON embeddings(entity_type, entity_id, text_hash);

-- IMPORTANT: Vector indexes should be created AFTER you have sufficient data (1000+ rows)
-- Run the create_vector_index() function after backfilling

-- ============================================
-- Functions
-- ============================================

/**
 * Create vector index with optimal settings
 * ONLY call this after you have 1000+ embeddings
 */
CREATE OR REPLACE FUNCTION create_vector_index()
RETURNS TABLE(
  status TEXT,
  row_count BIGINT,
  lists_value INT,
  index_created BOOLEAN
) AS $$
DECLARE
  v_row_count BIGINT;
  v_lists INT;
  v_index_exists BOOLEAN;
BEGIN
  -- Count existing embeddings
  SELECT COUNT(*) INTO v_row_count
  FROM embeddings
  WHERE embedding IS NOT NULL;

  -- Check if index already exists
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'embeddings'
      AND indexname = 'embeddings_vector_cosine_idx'
  ) INTO v_index_exists;

  IF v_index_exists THEN
    RETURN QUERY
    SELECT
      'Index already exists'::TEXT,
      v_row_count,
      NULL::INT,
      true;
    RETURN;
  END IF;

  IF v_row_count < 1000 THEN
    RETURN QUERY
    SELECT
      'Not enough data for index (need 1000+)'::TEXT,
      v_row_count,
      NULL::INT,
      false;
    RETURN;
  END IF;

  -- Calculate optimal lists value (sqrt of rows, between 100 and 1000)
  v_lists := GREATEST(100, LEAST(SQRT(v_row_count)::INT, 1000));

  -- Create ivfflat index with cosine distance
  EXECUTE format('
    CREATE INDEX embeddings_vector_cosine_idx
    ON embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = %s)
    WHERE embedding IS NOT NULL
  ', v_lists);

  -- Run ANALYZE to update statistics
  ANALYZE embeddings;

  RETURN QUERY
  SELECT
    'Vector index created successfully'::TEXT,
    v_row_count,
    v_lists,
    true;
END;
$$ LANGUAGE plpgsql;

/**
 * Backfill embeddings for contacts in batches
 * This creates placeholder records for async processing
 */
CREATE OR REPLACE FUNCTION backfill_contact_embeddings(
  p_batch_size INT DEFAULT 100,
  p_model_name VARCHAR DEFAULT 'text-embedding-3-small'
)
RETURNS TABLE(
  created_count INT,
  skipped_count INT
) AS $$
DECLARE
  v_created INT := 0;
  v_skipped INT := 0;
  v_rec RECORD;
BEGIN
  FOR v_rec IN
    SELECT
      c.id,
      c.tenant_id,
      c.first_name || ' ' || COALESCE(c.last_name, '') || ' ' ||
      COALESCE(c.email, '') || ' ' || COALESCE(c.company, '') || ' ' ||
      COALESCE(c.title, '') AS text_content,
      MD5(
        c.first_name || ' ' || COALESCE(c.last_name, '') || ' ' ||
        COALESCE(c.email, '') || ' ' || COALESCE(c.company, '') || ' ' ||
        COALESCE(c.title, '')
      ) AS text_hash
    FROM contacts c
    LEFT JOIN embeddings e
      ON e.entity_id = c.id
      AND e.entity_type = 'contact'
      AND e.embedding_model = p_model_name
    WHERE e.id IS NULL
      AND c.deleted_at IS NULL
    LIMIT p_batch_size
  LOOP
    BEGIN
      INSERT INTO embeddings (
        entity_type,
        entity_id,
        tenant_id,
        embedding_model,
        text_hash,
        source_text,
        status
      ) VALUES (
        'contact',
        v_rec.id,
        v_rec.tenant_id,
        p_model_name,
        v_rec.text_hash,
        LEFT(v_rec.text_content, 8192),  -- Limit to max tokens
        'pending'
      );
      v_created := v_created + 1;

      -- Rate limit: pause every 10 records
      IF v_created % 10 = 0 THEN
        PERFORM pg_sleep(0.1);
      END IF;

    EXCEPTION
      WHEN unique_violation THEN
        v_skipped := v_skipped + 1;
    END;
  END LOOP;

  RETURN QUERY
  SELECT v_created, v_skipped;
END;
$$ LANGUAGE plpgsql;

/**
 * Find similar entities using cosine similarity
 * REQUIRES: Vector index must be created first
 */
CREATE OR REPLACE FUNCTION find_similar_entities(
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_limit INT DEFAULT 10,
  p_tenant_id UUID DEFAULT NULL
)
RETURNS TABLE(
  entity_id UUID,
  entity_type VARCHAR,
  similarity FLOAT,
  tenant_id UUID
) AS $$
DECLARE
  v_embedding vector(1536);
BEGIN
  -- Get the reference embedding
  SELECT embedding INTO v_embedding
  FROM embeddings
  WHERE embeddings.entity_id = p_entity_id
    AND embeddings.entity_type = p_entity_type
    AND embeddings.embedding IS NOT NULL
  LIMIT 1;

  IF v_embedding IS NULL THEN
    RAISE EXCEPTION 'No embedding found for entity % %', p_entity_type, p_entity_id;
  END IF;

  -- Find similar embeddings using cosine similarity
  RETURN QUERY
  SELECT
    e.entity_id,
    e.entity_type,
    1 - (e.embedding <=> v_embedding) AS similarity,
    e.tenant_id
  FROM embeddings e
  WHERE e.entity_type = p_entity_type
    AND e.entity_id != p_entity_id
    AND e.embedding IS NOT NULL
    AND (p_tenant_id IS NULL OR e.tenant_id = p_tenant_id)
  ORDER BY e.embedding <=> v_embedding
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

/**
 * Search by vector with tenant isolation
 */
CREATE OR REPLACE FUNCTION search_by_vector(
  p_query_vector vector(1536),
  p_entity_type VARCHAR,
  p_tenant_id UUID,
  p_limit INT DEFAULT 20
)
RETURNS TABLE(
  entity_id UUID,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.entity_id,
    1 - (e.embedding <=> p_query_vector) AS similarity
  FROM embeddings e
  WHERE e.entity_type = p_entity_type
    AND e.tenant_id = p_tenant_id
    AND e.embedding IS NOT NULL
  ORDER BY e.embedding <=> p_query_vector
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

/**
 * Get pending embeddings for processing
 */
CREATE OR REPLACE FUNCTION get_pending_embeddings(p_limit INT DEFAULT 100)
RETURNS TABLE(
  id BIGINT,
  entity_type VARCHAR,
  entity_id UUID,
  tenant_id UUID,
  source_text TEXT,
  embedding_model VARCHAR,
  text_hash VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.entity_type,
    e.entity_id,
    e.tenant_id,
    e.source_text,
    e.embedding_model,
    e.text_hash
  FROM embeddings e
  WHERE e.status = 'pending'
    AND e.embedding IS NULL
  ORDER BY e.created_at ASC
  LIMIT p_limit
  FOR UPDATE SKIP LOCKED;  -- Prevent concurrent processing
END;
$$ LANGUAGE plpgsql;

/**
 * Update embedding after generation
 */
CREATE OR REPLACE FUNCTION update_embedding(
  p_id BIGINT,
  p_embedding vector(1536),
  p_status VARCHAR DEFAULT 'completed',
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE embeddings
  SET
    embedding = p_embedding,
    status = p_status,
    error_message = p_error_message,
    updated_at = NOW()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

/**
 * Check if source text has changed (for reprocessing)
 */
CREATE OR REPLACE FUNCTION check_stale_embeddings()
RETURNS TABLE(
  embedding_id BIGINT,
  entity_type VARCHAR,
  entity_id UUID,
  old_hash VARCHAR,
  new_hash VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.entity_type,
    e.entity_id,
    e.text_hash,
    MD5(
      c.first_name || ' ' || COALESCE(c.last_name, '') || ' ' ||
      COALESCE(c.email, '') || ' ' || COALESCE(c.company, '') || ' ' ||
      COALESCE(c.title, '')
    ) AS new_hash
  FROM embeddings e
  JOIN contacts c ON c.id = e.entity_id
  WHERE e.entity_type = 'contact'
    AND e.text_hash != MD5(
      c.first_name || ' ' || COALESCE(c.last_name, '') || ' ' ||
      COALESCE(c.email, '') || ' ' || COALESCE(c.company, '') || ' ' ||
      COALESCE(c.title, '')
    )
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Triggers
-- ============================================

CREATE TRIGGER update_embeddings_updated_at
  BEFORE UPDATE ON embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Views
-- ============================================

-- Embedding statistics by tenant
CREATE OR REPLACE VIEW embedding_stats_by_tenant AS
SELECT
  tenant_id,
  entity_type,
  COUNT(*) as total_embeddings,
  COUNT(*) FILTER (WHERE embedding IS NOT NULL) as completed,
  COUNT(*) FILTER (WHERE status = 'pending') as pending,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_processing_time_seconds
FROM embeddings
GROUP BY tenant_id, entity_type;

-- Recent embedding activity
CREATE OR REPLACE VIEW recent_embedding_activity AS
SELECT
  id,
  entity_type,
  entity_id,
  tenant_id,
  embedding_model,
  status,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as processing_time_seconds
FROM embeddings
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE embeddings IS 'Stores vector embeddings for semantic search';
COMMENT ON COLUMN embeddings.embedding IS 'Vector embedding (1536 dimensions for OpenAI models)';
COMMENT ON COLUMN embeddings.text_hash IS 'MD5 hash of source text to detect changes';
COMMENT ON COLUMN embeddings.embedding_model IS 'Name of embedding model used';
COMMENT ON COLUMN embeddings.embedding_version IS 'Version of embedding model';
COMMENT ON FUNCTION create_vector_index() IS 'Create ivfflat vector index (call after 1000+ rows)';
COMMENT ON FUNCTION backfill_contact_embeddings(INT, VARCHAR) IS 'Backfill embeddings for contacts in batches';
COMMENT ON FUNCTION find_similar_entities(VARCHAR, UUID, INT, UUID) IS 'Find similar entities using cosine similarity';

-- ============================================
-- Important Notes
-- ============================================

-- ⚠️ DO NOT create vector index until you have at least 1000 embeddings!
-- After backfilling data, run: SELECT * FROM create_vector_index();

-- To backfill contact embeddings: SELECT * FROM backfill_contact_embeddings(100);
-- To check index status: SELECT * FROM pg_indexes WHERE tablename = 'embeddings';

SELECT 'pgvector embeddings migration complete! Remember to create index after backfilling data.' as status;
