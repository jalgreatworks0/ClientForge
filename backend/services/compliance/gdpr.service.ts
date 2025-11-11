/**
 * GDPR Compliance Service
 * Handles data subject rights: access, rectification, erasure, portability, restriction
 * Implements consent management and audit logging
 */

import { Pool } from 'pg';
import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MongoClient } from 'mongodb';

export interface DataSubjectRequest {
  id: string;
  tenantId: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  subjectEmail: string;
  subjectIdentifier: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedBy: string;
  requestDate: Date;
  completedDate?: Date;
  dataExportUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConsentRecord {
  id: string;
  tenantId: string;
  userId: string;
  consentType: string;
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

export class GDPRService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Right to Access: Export all data for a subject
   */
  async requestDataAccess(
    tenantId: string,
    subjectEmail: string,
    requestedBy: string
  ): Promise<DataSubjectRequest> {
    try {
      // Create request record
      const result = await this.pool.query(
        `INSERT INTO data_subject_requests (
          tenant_id, request_type, subject_email, subject_identifier,
          status, requested_by, request_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, tenant_id, request_type, subject_email, subject_identifier,
                  status, requested_by, request_date, created_at, updated_at`,
        [tenantId, 'access', subjectEmail, subjectEmail, 'pending', requestedBy]
      );

      const request = this.mapRowToRequest(result.rows[0]);

      logger.info('[GDPR] Data access request created', {
        tenantId,
        requestId: request.id,
        subjectEmail,
      });

      // Queue background job to export data
      await this.queueDataExport(request.id);

      return request;
    } catch (error: any) {
      logger.error('[GDPR] Failed to create data access request', {
        tenantId,
        subjectEmail,
        error: error.message,
      });
      throw new Error('Failed to create data access request');
    }
  }

  /**
   * Right to Erasure: Delete all data for a subject
   */
  async requestDataErasure(
    tenantId: string,
    subjectEmail: string,
    requestedBy: string
  ): Promise<DataSubjectRequest> {
    try {
      // Create request record
      const result = await this.pool.query(
        `INSERT INTO data_subject_requests (
          tenant_id, request_type, subject_email, subject_identifier,
          status, requested_by, request_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, tenant_id, request_type, subject_email, subject_identifier,
                  status, requested_by, request_date, created_at, updated_at`,
        [tenantId, 'erasure', subjectEmail, subjectEmail, 'pending', requestedBy]
      );

      const request = this.mapRowToRequest(result.rows[0]);

      logger.info('[GDPR] Data erasure request created', {
        tenantId,
        requestId: request.id,
        subjectEmail,
      });

      // Queue background job to anonymize/delete data
      await this.queueDataErasure(request.id);

      return request;
    } catch (error: any) {
      logger.error('[GDPR] Failed to create data erasure request', {
        tenantId,
        subjectEmail,
        error: error.message,
      });
      throw new Error('Failed to create data erasure request');
    }
  }

  /**
   * Right to Data Portability: Export data in machine-readable format
   */
  async requestDataPortability(
    tenantId: string,
    subjectEmail: string,
    requestedBy: string
  ): Promise<DataSubjectRequest> {
    try {
      const result = await this.pool.query(
        `INSERT INTO data_subject_requests (
          tenant_id, request_type, subject_email, subject_identifier,
          status, requested_by, request_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, tenant_id, request_type, subject_email, subject_identifier,
                  status, requested_by, request_date, created_at, updated_at`,
        [tenantId, 'portability', subjectEmail, subjectEmail, 'pending', requestedBy]
      );

      const request = this.mapRowToRequest(result.rows[0]);

      logger.info('[GDPR] Data portability request created', {
        tenantId,
        requestId: request.id,
        subjectEmail,
      });

      // Queue background job to export portable data (JSON format)
      await this.queueDataExport(request.id, 'json');

      return request;
    } catch (error: any) {
      logger.error('[GDPR] Failed to create data portability request', {
        tenantId,
        subjectEmail,
        error: error.message,
      });
      throw new Error('Failed to create data portability request');
    }
  }

  /**
   * Execute data export
   */
  async executeDataExport(requestId: string, format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      // Get request details
      const requestResult = await this.pool.query(
        'SELECT * FROM data_subject_requests WHERE id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Request not found');
      }

      const request = requestResult.rows[0];

      // Update status to processing
      await this.pool.query(
        'UPDATE data_subject_requests SET status = $1 WHERE id = $2',
        ['processing', requestId]
      );

      // Collect all user data from PostgreSQL
      const userData: any = {
        user: null,
        contacts: [],
        deals: [],
        activities: [],
        emails: [],
        notes: [],
      };

      // Get user data
      const userResult = await this.pool.query(
        'SELECT * FROM users WHERE email = $1 AND tenant_id = $2',
        [request.subject_email, request.tenant_id]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        userData.user = this.sanitizeUserData(user);

        // Get associated data
        userData.contacts = await this.getUserContacts(user.id);
        userData.deals = await this.getUserDeals(user.id);
        userData.activities = await this.getUserActivities(user.id);
        userData.emails = await this.getUserEmails(user.id);
        userData.notes = await this.getUserNotes(user.id);
      }

      // Create export file
      const exportDir = path.join(process.cwd(), 'storage', 'gdpr-exports', request.tenant_id);
      await fs.mkdir(exportDir, { recursive: true });

      const filename = `data-export-${requestId}-${Date.now()}.${format}`;
      const filepath = path.join(exportDir, filename);

      if (format === 'json') {
        await fs.writeFile(filepath, JSON.stringify(userData, null, 2));
      } else {
        // Convert to CSV (simplified)
        const csv = this.convertToCSV(userData);
        await fs.writeFile(filepath, csv);
      }

      const downloadUrl = `/gdpr-exports/${request.tenant_id}/${filename}`;

      // Update request as completed
      await this.pool.query(
        `UPDATE data_subject_requests
         SET status = $1, completed_date = NOW(), data_export_url = $2
         WHERE id = $3`,
        ['completed', downloadUrl, requestId]
      );

      logger.info('[GDPR] Data export completed', {
        requestId,
        filepath,
        downloadUrl,
      });
      
      // Send email notification
      const { emailService } = await import('../email/email.service');
      await emailService.sendGDPRExportReady(request.subject_email, downloadUrl, 7);

      return downloadUrl;
    } catch (error: any) {
      logger.error('[GDPR] Failed to execute data export', {
        requestId,
        error: error.message,
      });

      // Mark request as failed
      await this.pool.query(
        `UPDATE data_subject_requests
         SET status = $1, notes = $2
         WHERE id = $3`,
        ['rejected', error.message, requestId]
      );

      throw error;
    }
  }

  /**
   * Execute data erasure (anonymization)
   */
  async executeDataErasure(requestId: string): Promise<void> {
    try {
      const requestResult = await this.pool.query(
        'SELECT * FROM data_subject_requests WHERE id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Request not found');
      }

      const request = requestResult.rows[0];

      // Update status to processing
      await this.pool.query(
        'UPDATE data_subject_requests SET status = $1 WHERE id = $2',
        ['processing', requestId]
      );

      // Get user
      const userResult = await this.pool.query(
        'SELECT id FROM users WHERE email = $1 AND tenant_id = $2',
        [request.subject_email, request.tenant_id]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const userId = userResult.rows[0].id;

      // Anonymize user data (don't delete - preserve referential integrity)
      await this.pool.query('BEGIN');

      try {
        // Anonymize user
        await this.pool.query(
          `UPDATE users
           SET email = CONCAT('deleted-', id, '@anonymized.local'),
               first_name = 'Deleted',
               last_name = 'User',
               phone = NULL,
               avatar_url = NULL,
               bio = NULL,
               status = 'deleted',
               updated_at = NOW()
           WHERE id = $1`,
          [userId]
        );

        // Delete sensitive associated data
        await this.pool.query('DELETE FROM sessions WHERE user_id = $1', [userId]);
        await this.pool.query('DELETE FROM api_keys WHERE created_by = $1', [userId]);
        await this.pool.query('DELETE FROM mfa_secrets WHERE user_id = $1', [userId]);
        await this.pool.query('DELETE FROM sso_connections WHERE user_id = $1', [userId]);

        await this.pool.query('COMMIT');

        // Update request as completed
        await this.pool.query(
          `UPDATE data_subject_requests
           SET status = $1, completed_date = NOW()
           WHERE id = $2`,
          ['completed', requestId]
        );

        logger.info('[GDPR] Data erasure completed', {
          requestId,
          userId,
        });
      } catch (error) {
        await this.pool.query('ROLLBACK');
        throw error;
      }
    } catch (error: any) {
      logger.error('[GDPR] Failed to execute data erasure', {
        requestId,
        error: error.message,
      });

      await this.pool.query(
        `UPDATE data_subject_requests
         SET status = $1, notes = $2
         WHERE id = $3`,
        ['rejected', error.message, requestId]
      );

      throw error;
    }
  }

  /**
   * Record consent
   */
  async recordConsent(
    tenantId: string,
    userId: string,
    consentType: string,
    granted: boolean,
    metadata?: { ipAddress?: string; userAgent?: string }
  ): Promise<ConsentRecord> {
    try {
      const result = await this.pool.query(
        `INSERT INTO consent_records (
          tenant_id, user_id, consent_type, granted,
          granted_at, revoked_at, ip_address, user_agent, version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          tenantId,
          userId,
          consentType,
          granted,
          granted ? new Date() : null,
          granted ? null : new Date(),
          metadata?.ipAddress || null,
          metadata?.userAgent || null,
          '1.0',
        ]
      );

      logger.info('[GDPR] Consent recorded', {
        tenantId,
        userId,
        consentType,
        granted,
      });

      return this.mapRowToConsent(result.rows[0]);
    } catch (error: any) {
      logger.error('[GDPR] Failed to record consent', {
        tenantId,
        userId,
        consentType,
        error: error.message,
      });
      throw new Error('Failed to record consent');
    }
  }

  /**
   * Check if user has granted consent
   */
  async hasConsent(tenantId: string, userId: string, consentType: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT granted FROM consent_records
         WHERE tenant_id = $1 AND user_id = $2 AND consent_type = $3
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId, userId, consentType]
      );

      return result.rows.length > 0 && result.rows[0].granted;
    } catch (error: any) {
      logger.error('[GDPR] Failed to check consent', {
        tenantId,
        userId,
        consentType,
        error: error.message,
      });
      return false;
    }
  }

  // Helper methods
  private async queueDataExport(requestId: string, format: 'json' | 'csv' = 'json'): Promise<void> {
    // TODO: Queue background job with BullMQ
    logger.info('[GDPR] Queued data export job', { requestId, format });
  }

  private async queueDataErasure(requestId: string): Promise<void> {
    // TODO: Queue background job with BullMQ
    logger.info('[GDPR] Queued data erasure job', { requestId });
  }

  private sanitizeUserData(user: any): any {
    // Remove sensitive fields
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }

  private async getUserContacts(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM contacts WHERE created_by = $1 OR updated_by = $1',
      [userId]
    );
    return result.rows;
  }

  private async getUserDeals(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM deals WHERE created_by = $1 OR owner_id = $1',
      [userId]
    );
    return result.rows;
  }

  private async getUserActivities(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM activities WHERE user_id = $1',
      [userId]
    );
    return result.rows;
  }

  private async getUserEmails(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM emails WHERE sender_id = $1 OR recipient_id = $1',
      [userId]
    );
    return result.rows;
  }

  private async getUserNotes(userId: string): Promise<any[]> {
    const result = await this.pool.query(
      'SELECT * FROM notes WHERE created_by = $1',
      [userId]
    );
    return result.rows;
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    return JSON.stringify(data);
  }

  private mapRowToRequest(row: any): DataSubjectRequest {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      requestType: row.request_type,
      subjectEmail: row.subject_email,
      subjectIdentifier: row.subject_identifier,
      status: row.status,
      requestedBy: row.requested_by,
      requestDate: row.request_date,
      completedDate: row.completed_date,
      dataExportUrl: row.data_export_url,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToConsent(row: any): ConsentRecord {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      consentType: row.consent_type,
      granted: row.granted,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
