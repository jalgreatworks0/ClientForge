/**
 * S3 Storage Service
 * Handles file uploads, downloads, and management via AWS S3
 * Provides presigned URLs for secure file access
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Readable } from 'stream';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { logger } from '../../utils/logging/logger';

export interface UploadOptions {
  bucket?: string;
  key: string;
  body: Buffer | Readable | string;
  contentType?: string;
  metadata?: Record<string, string>;
  acl?: 'private' | 'public-read';
}

export interface DownloadOptions {
  bucket?: string;
  key: string;
}

export interface PresignedUrlOptions {
  bucket?: string;
  key: string;
  expiresIn?: number; // seconds
  operation?: 'getObject' | 'putObject';
}

export class S3Service {
  private s3Client: S3Client;
  private defaultBucket: string;
  private enabled: boolean;

  constructor() {
    // Check if AWS credentials are configured
    this.enabled = !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET
    );

    if (this.enabled) {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });

      this.defaultBucket = process.env.AWS_S3_BUCKET!;
      logger.info('[S3] AWS S3 configured', {
        bucket: this.defaultBucket,
        region: process.env.AWS_REGION || 'us-east-1',
      });
    } else {
      logger.warn('[S3] AWS S3 not configured - falling back to local storage');
      this.defaultBucket = '';
    }
  }

  /**
   * Upload a file to S3
   */
  async upload(options: UploadOptions): Promise<string> {
    const bucket = options.bucket || this.defaultBucket;

    if (!this.enabled) {
      // Fallback to local storage
      return this.uploadLocal(options);
    }

    try {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
        Metadata: options.metadata,
        ACL: options.acl || 'private',
      });

      await this.s3Client.send(command);

      const url = `s3://${bucket}/${options.key}`;

      logger.info('[S3] File uploaded', {
        key: options.key,
        bucket,
        contentType: options.contentType,
      });

      return url;
    } catch (error: any) {
      logger.error('[S3] Upload failed', {
        key: options.key,
        error: error.message,
      });
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Download a file from S3
   */
  async download(options: DownloadOptions): Promise<Buffer> {
    const bucket = options.bucket || this.defaultBucket;

    if (!this.enabled) {
      return this.downloadLocal(options);
    }

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: options.key,
      });

      const response = await this.s3Client.send(command);

      // Convert stream to buffer
      const stream = response.Body as Readable;
      const chunks: Buffer[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);

      logger.info('[S3] File downloaded', {
        key: options.key,
        size: buffer.length,
      });

      return buffer;
    } catch (error: any) {
      logger.error('[S3] Download failed', {
        key: options.key,
        error: error.message,
      });
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }

  /**
   * Delete a file from S3
   */
  async delete(key: string, bucket?: string): Promise<void> {
    const targetBucket = bucket || this.defaultBucket;

    if (!this.enabled) {
      return this.deleteLocal(key);
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      await this.s3Client.send(command);

      logger.info('[S3] File deleted', { key });
    } catch (error: any) {
      logger.error('[S3] Delete failed', {
        key,
        error: error.message,
      });
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Check if a file exists in S3
   */
  async exists(key: string, bucket?: string): Promise<boolean> {
    const targetBucket = bucket || this.defaultBucket;

    if (!this.enabled) {
      return this.existsLocal(key);
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Generate a presigned URL for secure file access
   */
  async getPresignedUrl(options: PresignedUrlOptions): Promise<string> {
    const bucket = options.bucket || this.defaultBucket;

    if (!this.enabled) {
      // Return local file path
      return `/storage/${options.key}`;
    }

    try {
      const command =
        options.operation === 'putObject'
          ? new PutObjectCommand({ Bucket: bucket, Key: options.key })
          : new GetObjectCommand({ Bucket: bucket, Key: options.key });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: options.expiresIn || 3600, // 1 hour default
      });

      logger.info('[S3] Presigned URL generated', {
        key: options.key,
        operation: options.operation || 'getObject',
        expiresIn: options.expiresIn || 3600,
      });

      return url;
    } catch (error: any) {
      logger.error('[S3] Failed to generate presigned URL', {
        key: options.key,
        error: error.message,
      });
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * List files in a folder
   */
  async list(prefix: string, bucket?: string): Promise<string[]> {
    const targetBucket = bucket || this.defaultBucket;

    if (!this.enabled) {
      return this.listLocal(prefix);
    }

    try {
      const command = new ListObjectsV2Command({
        Bucket: targetBucket,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);

      const keys = response.Contents?.map((obj) => obj.Key!) || [];

      logger.info('[S3] Listed files', {
        prefix,
        count: keys.length,
      });

      return keys;
    } catch (error: any) {
      logger.error('[S3] List failed', {
        prefix,
        error: error.message,
      });
      throw new Error(`Failed to list files: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   */
  async getMetadata(key: string, bucket?: string): Promise<Record<string, string>> {
    const targetBucket = bucket || this.defaultBucket;

    if (!this.enabled) {
      return {};
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: targetBucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      return response.Metadata || {};
    } catch (error: any) {
      logger.error('[S3] Failed to get metadata', {
        key,
        error: error.message,
      });
      throw new Error(`Failed to get metadata: ${error.message}`);
    }
  }

  // Fallback methods for local storage
  private async uploadLocal(options: UploadOptions): Promise<string> {
    const localPath = path.join(process.cwd(), 'storage', options.key);
    const dir = path.dirname(localPath);

    await fs.mkdir(dir, { recursive: true });

    if (Buffer.isBuffer(options.body)) {
      await fs.writeFile(localPath, options.body);
    } else if (typeof options.body === 'string') {
      await fs.writeFile(localPath, options.body);
    } else {
      // Handle stream
      const chunks: Buffer[] = [];
      for await (const chunk of options.body as Readable) {
        chunks.push(chunk);
      }
      await fs.writeFile(localPath, Buffer.concat(chunks));
    }

    logger.info('[S3] File uploaded locally', { path: localPath });
    return localPath;
  }

  private async downloadLocal(options: DownloadOptions): Promise<Buffer> {
    const localPath = path.join(process.cwd(), 'storage', options.key);
    const buffer = await fs.readFile(localPath);
    logger.info('[S3] File downloaded locally', { path: localPath });
    return buffer;
  }

  private async deleteLocal(key: string): Promise<void> {
    const localPath = path.join(process.cwd(), 'storage', key);
    await fs.unlink(localPath);
    logger.info('[S3] File deleted locally', { path: localPath });
  }

  private async existsLocal(key: string): Promise<boolean> {
    const localPath = path.join(process.cwd(), 'storage', key);
    try {
      await fs.access(localPath);
      return true;
    } catch {
      return false;
    }
  }

  private async listLocal(prefix: string): Promise<string[]> {
    const localPath = path.join(process.cwd(), 'storage', prefix);
    try {
      const files = await fs.readdir(localPath, { recursive: true });
      return files.map((file) => path.join(prefix, String(file)));
    } catch {
      return [];
    }
  }
}

// Export singleton instance
export const s3Service = new S3Service();
