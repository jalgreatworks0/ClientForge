/**
 * Embeddings Service
 * Handles vector embeddings generation for semantic search
 *
 * Infrastructure Status: READY FOR IMPLEMENTATION
 *
 * Features:
 * - OpenAI embeddings generation
 * - PostgreSQL pgvector storage
 * - Batch processing support
 * - Similarity search
 *
 * Next Steps:
 * 1. Set up OpenAI API key in .env
 * 2. Enable pgvector extension in PostgreSQL
 * 3. Create embeddings table with vector column
 * 4. Implement backfill script for existing data
 * 5. Add ANN index (IVFFlat or HNSW)
 */

import { Pool } from 'pg'
import { OpenAI } from 'openai'

import { logger } from '../../utils/logging/logger'

export interface EmbeddingDocument {
  id: string
  content: string
  metadata?: Record<string, any>
}

export interface EmbeddingResult {
  id: string
  embedding: number[]
  model: string
  tokens: number
}

export interface SimilaritySearchResult {
  id: string
  content: string
  similarity: number
  metadata?: Record<string, any>
}

export class EmbeddingsService {
  private openai: OpenAI
  private pool: Pool
  private model: string = 'text-embedding-3-small' // 1536 dimensions
  private batchSize: number = 100

  constructor(pool: Pool, apiKey: string) {
    this.pool = pool
    this.openai = new OpenAI({ apiKey })
  }

  /**
   * Generate embeddings for a single document
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: this.model,
        input: text,
        encoding_format: 'float',
      })

      return response.data[0].embedding
    } catch (error) {
      logger.error('Failed to generate embedding', { error, textLength: text.length })
      throw error
    }
  }

  /**
   * Generate embeddings for multiple documents in batch
   */
  async generateBatchEmbeddings(documents: EmbeddingDocument[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = []

    // Process in batches to avoid rate limits
    for (let i = 0; i < documents.length; i += this.batchSize) {
      const batch = documents.slice(i, i + this.batchSize)
      const texts = batch.map((doc) => doc.content)

      try {
        const response = await this.openai.embeddings.create({
          model: this.model,
          input: texts,
          encoding_format: 'float',
        })

        for (let j = 0; j < batch.length; j++) {
          results.push({
            id: batch[j].id,
            embedding: response.data[j].embedding,
            model: this.model,
            tokens: response.usage.total_tokens / texts.length, // Approximate
          })
        }

        logger.info('Generated batch embeddings', {
          batchSize: batch.length,
          totalTokens: response.usage.total_tokens,
        })
      } catch (error) {
        logger.error('Failed to generate batch embeddings', { error, batchSize: batch.length })
        throw error
      }

      // Rate limiting - wait between batches
      if (i + this.batchSize < documents.length) {
        await this.sleep(100) // 100ms delay
      }
    }

    return results
  }

  /**
   * Store embedding in PostgreSQL with pgvector
   */
  async storeEmbedding(
    tenantId: string,
    entityType: string,
    entityId: string,
    content: string,
    embedding: number[],
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await this.pool.query(
        `
        INSERT INTO embeddings (
          tenantId,
          entity_type,
          entity_id,
          content,
          embedding,
          metadata,
          model,
          created_at
        ) VALUES ($1, $2, $3, $4, $5::vector, $6, $7, NOW())
        ON CONFLICT (tenantId, entity_type, entity_id)
        DO UPDATE SET
          content = EXCLUDED.content,
          embedding = EXCLUDED.embedding,
          metadata = EXCLUDED.metadata,
          model = EXCLUDED.model,
          updated_at = NOW()
        `,
        [tenantId, entityType, entityId, content, JSON.stringify(embedding), metadata, this.model]
      )

      logger.debug('Stored embedding', { tenantId, entityType, entityId })
    } catch (error) {
      logger.error('Failed to store embedding', { error, tenantId, entityType, entityId })
      throw error
    }
  }

  /**
   * Semantic similarity search using cosine similarity
   */
  async similaritySearch(
    tenantId: string,
    queryEmbedding: number[],
    options: {
      entityType?: string
      limit?: number
      threshold?: number
    } = {}
  ): Promise<SimilaritySearchResult[]> {
    const { entityType, limit = 10, threshold = 0.7 } = options

    try {
      const entityFilter = entityType ? 'AND entity_type = $3' : ''
      const params = [tenantId, JSON.stringify(queryEmbedding), limit]
      if (entityType) {
        params.splice(2, 0, entityType)
      }

      const result = await this.pool.query(
        `
        SELECT
          entity_id as id,
          content,
          1 - (embedding <=> $2::vector) as similarity,
          metadata
        FROM embeddings
        WHERE tenantId = $1
          ${entityFilter}
          AND 1 - (embedding <=> $2::vector) >= ${threshold}
        ORDER BY embedding <=> $2::vector
        LIMIT ${entityType ? '$4' : '$3'}
        `,
        params
      )

      return result.rows.map((row) => ({
        id: row.id,
        content: row.content,
        similarity: parseFloat(row.similarity),
        metadata: row.metadata,
      }))
    } catch (error) {
      logger.error('Failed to perform similarity search', { error, tenantId })
      throw error
    }
  }

  /**
   * Semantic search - generate embedding and search in one call
   */
  async semanticSearch(
    tenantId: string,
    query: string,
    options: {
      entityType?: string
      limit?: number
      threshold?: number
    } = {}
  ): Promise<SimilaritySearchResult[]> {
    const queryEmbedding = await this.generateEmbedding(query)
    return this.similaritySearch(tenantId, queryEmbedding, options)
  }

  /**
   * Delete embedding
   */
  async deleteEmbedding(tenantId: string, entityType: string, entityId: string): Promise<void> {
    try {
      await this.pool.query(
        'DELETE FROM embeddings WHERE tenantId = $1 AND entity_type = $2 AND entity_id = $3',
        [tenantId, entityType, entityId]
      )

      logger.debug('Deleted embedding', { tenantId, entityType, entityId })
    } catch (error) {
      logger.error('Failed to delete embedding', { error, tenantId, entityType, entityId })
      throw error
    }
  }

  /**
   * Get embedding statistics for a tenant
   */
  async getStats(tenantId: string): Promise<{
    total: number
    byType: Record<string, number>
  }> {
    try {
      const totalResult = await this.pool.query(
        'SELECT COUNT(*) as count FROM embeddings WHERE tenantId = $1',
        [tenantId]
      )

      const byTypeResult = await this.pool.query(
        `SELECT entity_type, COUNT(*) as count
         FROM embeddings
         WHERE tenantId = $1
         GROUP BY entity_type`,
        [tenantId]
      )

      const byType: Record<string, number> = {}
      byTypeResult.rows.forEach((row) => {
        byType[row.entity_type] = parseInt(row.count, 10)
      })

      return {
        total: parseInt(totalResult.rows[0].count, 10),
        byType,
      }
    } catch (error) {
      logger.error('Failed to get embedding stats', { error, tenantId })
      throw error
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export default EmbeddingsService
