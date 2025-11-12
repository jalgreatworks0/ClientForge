/**
 * Storage Service
 * Handles file storage with MinIO (development) and Cloudflare R2 (production)
 * Provides signed URLs for secure file access
 */

import crypto from 'crypto';
import { Readable } from 'stream';

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { logger } from '../../utils/logging/logger';
import { getPool } from '../../database/postgresql/pool';

interface StorageConfig {
  type: 'minio' | 'r2';
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  accountId?: string;
}

interface FileMetadata {
  tenantId: string;
  userId: string;
  originalName: string;
  mimeType: string;
  size: number;
  entityType?: string;
  entityId?: string;
}

interface UploadResult {
  fileId: string;
  key: string;
  url?: string;
}

interface FileRecord {
  id: string;
  key: string;
  original_name: string;
  mime_type: string;
  size: number;
  tenantId: string;
  uploaded_by: string;
  entity_type?: string;
  entity_id?: string;
  created_at: Date;
}

class StorageService {
  private client: S3Client;
  private bucket: string;
  private config: StorageConfig;
  private pool = getPool();

  constructor() {
    this.config = this.getConfig();
    this.client = this.initializeClient();
    this.bucket = this.config.bucket;
  }

  /**
   * Get storage configuration based on environment
   */
  private getConfig(): StorageConfig {
    const nodeEnv = process.env.NODE_ENV || 'development';

    if (nodeEnv === 'production' && process.env.R2_ACCESS_KEY) {
      // Cloudflare R2 configuration for production
      return {
        type: 'r2',
        endpoint: `https://${process.env.CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        region: 'auto',
        bucket: process.env.R2_BUCKET || 'clientforge-prod',
        accessKeyId: process.env.R2_ACCESS_KEY!,
        secretAccessKey: process.env.R2_SECRET_KEY!,
        accountId: process.env.CF_ACCOUNT_ID
      };
    } else {
      // MinIO configuration for development
      const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
      const port = process.env.MINIO_PORT || '9000';
      const useSSL = process.env.MINIO_USE_SSL === 'true';

      return {
        type: 'minio',
        endpoint: `${useSSL ? 'https' : 'http'}://${endpoint}:${port}`,
        region: 'us-east-1',
        bucket: process.env.MINIO_BUCKET || 'clientforge-dev',
        accessKeyId: process.env.MINIO_ACCESS_KEY || 'minioadmin',
        secretAccessKey: process.env.MINIO_SECRET_KEY || 'minioadmin'
      };
    }
  }

  /**
   * Initialize S3-compatible client
   */
  private initializeClient(): S3Client {
    const config: any = {
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey
      },
      forcePathStyle: true // Required for MinIO and R2
    };

    if (this.config.endpoint) {
      config.endpoint = this.config.endpoint;
    }

    logger.info(`Initializing ${this.config.type} storage client`, {
      type: this.config.type,
      bucket: this.config.bucket,
      endpoint: this.config.endpoint
    });

    return new S3Client(config);
  }

  /**
   * Upload a file to storage
   */
  async uploadFile(
    fileBuffer: Buffer | Readable,
    metadata: FileMetadata
  ): Promise<UploadResult> {
    try {
      // Generate secure file ID and key
      const fileId = crypto.randomUUID();
      const ext = this.getFileExtension(metadata.originalName);
      const key = this.generateKey(metadata.tenantId, metadata.entityType, fileId, ext);

      // Validate file size (5GB max)
      if (metadata.size > 5 * 1024 * 1024 * 1024) {
        throw new Error('File size exceeds maximum limit of 5GB');
      }

      // Store metadata in database first
      const dbResult = await this.pool.query(`
        INSERT INTO files (
          id, key, original_name, mime_type, size,
          tenantId, uploaded_by, entity_type, entity_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        fileId,
        key,
        metadata.originalName,
        metadata.mimeType,
        metadata.size,
        metadata.tenantId,
        metadata.userId,
        metadata.entityType,
        metadata.entityId
      ]);

      // Upload to storage
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: metadata.mimeType,
        Metadata: {
          'tenant-id': metadata.tenantId,
          'uploaded-by': metadata.userId,
          'original-name': metadata.originalName
        }
      });

      await this.client.send(command);

      logger.info('File uploaded successfully', {
        fileId,
        key,
        size: metadata.size,
        tenantId: metadata.tenantId
      });

      return {
        fileId,
        key
      };
    } catch (error: any) {
      logger.error('File upload failed', {
        error: error.message,
        tenantId: metadata.tenantId,
        fileName: metadata.originalName
      });
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Get a signed URL for file access
   */
  async getSignedUrl(
    fileId: string,
    tenantId: string,
    expiresIn: number = 3600
  ): Promise<string> {
    try {
      // Verify file exists and belongs to tenant
      const result = await this.pool.query(`
        SELECT key, tenantId, deleted_at
        FROM files
        WHERE id = $1 AND deleted_at IS NULL
      `, [fileId]);

      if (result.rows.length === 0) {
        throw new Error('File not found');
      }

      const file = result.rows[0];

      // Verify tenant access
      if (file.tenantId !== tenantId) {
        throw new Error('Access denied: File belongs to different tenant');
      }

      const key = file.key;

      // Generate signed URL
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      const url = await getSignedUrl(this.client, command, {
        expiresIn
      });

      logger.info('Signed URL generated', {
        fileId,
        tenantId,
        expiresIn
      });

      return url;
    } catch (error: any) {
      logger.error('Failed to generate signed URL', {
        error: error.message,
        fileId,
        tenantId
      });
      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string, tenantId: string): Promise<void> {
    try {
      // Get file info and verify ownership
      const result = await this.pool.query(`
        SELECT key, tenantId
        FROM files
        WHERE id = $1 AND deleted_at IS NULL
      `, [fileId]);

      if (result.rows.length === 0) {
        throw new Error('File not found');
      }

      const file = result.rows[0];

      // Verify tenant access
      if (file.tenantId !== tenantId) {
        throw new Error('Access denied: File belongs to different tenant');
      }

      const key = file.key;

      // Soft delete in database
      await this.pool.query(`
        UPDATE files
        SET deleted_at = NOW()
        WHERE id = $1
      `, [fileId]);

      // Delete from storage
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.client.send(command);

      logger.info('File deleted successfully', {
        fileId,
        key,
        tenantId
      });
    } catch (error: any) {
      logger.error('File deletion failed', {
        error: error.message,
        fileId,
        tenantId
      });
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(fileId: string, tenantId: string): Promise<FileRecord> {
    try {
      const result = await this.pool.query(`
        SELECT *
        FROM files
        WHERE id = $1 AND tenantId = $2 AND deleted_at IS NULL
      `, [fileId, tenantId]);

      if (result.rows.length === 0) {
        throw new Error('File not found');
      }

      return result.rows[0] as FileRecord;
    } catch (error: any) {
      logger.error('Failed to get file metadata', {
        error: error.message,
        fileId,
        tenantId
      });
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Check if file exists in storage
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * List files for an entity
   */
  async listEntityFiles(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<FileRecord[]> {
    try {
      const result = await this.pool.query(`
        SELECT *
        FROM files
        WHERE tenantId = $1
          AND entity_type = $2
          AND entity_id = $3
          AND deleted_at IS NULL
        ORDER BY created_at DESC
      `, [tenantId, entityType, entityId]);

      return result.rows as FileRecord[];
    } catch (error: any) {
      logger.error('Failed to list entity files', {
        error: error.message,
        tenantId,
        entityType,
        entityId
      });
      throw new Error(`Failed to list entity files: ${error.message}`);
    }
  }

  /**
   * Get storage statistics for a tenant
   */
  async getTenantStorageStats(tenantId: string): Promise<{
    totalFiles: number;
    totalSize: number;
    filesByType: Record<string, number>;
  }> {
    try {
      const result = await this.pool.query(`
        SELECT
          COUNT(*) as total_files,
          SUM(size) as total_size,
          jsonb_object_agg(
            COALESCE(entity_type, 'general'),
            file_count
          ) as files_by_type
        FROM (
          SELECT
            entity_type,
            COUNT(*) as file_count
          FROM files
          WHERE tenantId = $1 AND deleted_at IS NULL
          GROUP BY entity_type
        ) counts,
        files
        WHERE files.tenantId = $1 AND files.deleted_at IS NULL
        GROUP BY files.tenantId
      `, [tenantId]);

      const row = result.rows[0] || { total_files: 0, total_size: 0, files_by_type: {} };

      return {
        totalFiles: parseInt(row.total_files) || 0,
        totalSize: parseInt(row.total_size) || 0,
        filesByType: row.files_by_type || {}
      };
    } catch (error: any) {
      logger.error('Failed to get tenant storage stats', {
        error: error.message,
        tenantId
      });
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }

  /**
   * Generate storage key for file
   */
  private generateKey(
    tenantId: string,
    entityType: string | undefined,
    fileId: string,
    extension: string
  ): string {
    const type = entityType || 'general';
    return `${tenantId}/${type}/${fileId}.${extension}`;
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop()! : 'bin';
  }
}

// Export singleton instance
export const storageService = new StorageService();
export default storageService;
