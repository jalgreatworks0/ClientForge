/**
 * Export Service
 * Handles bulk data export to CSV, Excel, JSON
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import { Pool } from 'pg';
import * as XLSX from 'xlsx';

import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';


export interface ExportJob {
  id: string;
  tenantId: string;
  entityType: 'contact' | 'deal' | 'company' | 'lead';
  fileFormat: 'csv' | 'xlsx' | 'json';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  filters?: Record<string, any>;
  fields?: string[];
  downloadUrl?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ExportService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createExportJob(params: {
    tenantId: string;
    entityType: string;
    fileFormat: string;
    filters?: Record<string, any>;
    fields?: string[];
    createdBy: string;
  }): Promise<ExportJob> {
    const result = await this.pool.query(
      `INSERT INTO export_jobs (tenantId, entity_type, file_format, filters, fields, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [
        params.tenantId,
        params.entityType,
        params.fileFormat,
        JSON.stringify(params.filters || {}),
        JSON.stringify(params.fields || []),
        params.createdBy
      ]
    );
    return this.mapRowToExportJob(result.rows[0]);
  }

  async processExport(jobId: string): Promise<string> {
    const job = await this.getExportJob(jobId);
    if (!job) throw new Error('Export job not found');

    await this.updateJobStatus(jobId, 'processing');

    try {
      // Fetch records
      const records = await this.fetchRecords(job.tenantId, job.entityType, job.filters, job.fields);

      await this.pool.query('UPDATE export_jobs SET total_records = $1 WHERE id = $2', [records.length, jobId]);

      // Generate export file
      const exportDir = path.join(process.cwd(), 'storage', 'exports', job.tenantId);
      await fs.mkdir(exportDir, { recursive: true });

      const timestamp = Date.now();
      const fileName = `${job.entityType}-export-${timestamp}.${job.fileFormat}`;
      const filePath = path.join(exportDir, fileName);

      if (job.fileFormat === 'csv') {
        await this.generateCSV(records, filePath);
      } else if (job.fileFormat === 'xlsx') {
        await this.generateExcel(records, filePath);
      } else if (job.fileFormat === 'json') {
        await this.generateJSON(records, filePath);
      }

      const downloadUrl = `/exports/${job.tenantId}/${fileName}`;

      await this.pool.query(
        `UPDATE export_jobs SET status = 'completed', download_url = $1 WHERE id = $2`,
        [downloadUrl, jobId]
      );

      logger.info('[Export] Export completed', { jobId, recordCount: records.length });

      return downloadUrl;
    } catch (error: any) {
      await this.pool.query(`UPDATE export_jobs SET status = 'failed' WHERE id = $1`, [jobId]);
      logger.error('[Export] Export failed', { jobId, error: error.message });
      throw error;
    }
  }

  private async fetchRecords(
    tenantId: string,
    entityType: string,
    filters?: Record<string, any>,
    fields?: string[]
  ): Promise<any[]> {
    const table = entityType + 's';
    const fieldsList = fields && fields.length > 0 ? fields.join(', ') : '*';

    let query = `SELECT ${fieldsList} FROM ${table} WHERE tenantId = $1`;
    const params: any[] = [tenantId];

    // Apply filters
    if (filters) {
      let paramIndex = 2;
      for (const [key, value] of Object.entries(filters)) {
        query += ` AND ${key} = $${paramIndex}`;
        params.push(value);
        paramIndex++;
      }
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  private async generateCSV(records: any[], filePath: string): Promise<void> {
    if (records.length === 0) {
      await fs.writeFile(filePath, '');
      return;
    }

    const headers = Object.keys(records[0]);
    const csvRows = [headers.join(',')];

    for (const record of records) {
      const values = headers.map(header => {
        const value = record[header];
        if (value === null || value === undefined) return '';
        const strValue = String(value);
        return strValue.includes(',') ? `"${strValue.replace(/"/g, '""')}"` : strValue;
      });
      csvRows.push(values.join(','));
    }

    await fs.writeFile(filePath, csvRows.join('\n'));
  }

  private async generateExcel(records: any[], filePath: string): Promise<void> {
    const worksheet = XLSX.utils.json_to_sheet(records);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    XLSX.writeFile(workbook, filePath);
  }

  private async generateJSON(records: any[], filePath: string): Promise<void> {
    await fs.writeFile(filePath, JSON.stringify(records, null, 2));
  }

  private async updateJobStatus(jobId: string, status: string): Promise<void> {
    await this.pool.query('UPDATE export_jobs SET status = $1 WHERE id = $2', [status, jobId]);
  }

  async getExportJob(jobId: string): Promise<ExportJob | null> {
    const result = await this.pool.query('SELECT * FROM export_jobs WHERE id = $1', [jobId]);
    return result.rows.length > 0 ? this.mapRowToExportJob(result.rows[0]) : null;
  }

  async getExportJobs(tenantId: string): Promise<ExportJob[]> {
    const result = await this.pool.query(
      'SELECT * FROM export_jobs WHERE tenantId = $1 ORDER BY created_at DESC LIMIT 50',
      [tenantId]
    );
    return result.rows.map(row => this.mapRowToExportJob(row));
  }

  private mapRowToExportJob(row: any): ExportJob {
    return {
      id: row.id,
      tenantId: row.tenantId,
      entityType: row.entity_type,
      fileFormat: row.file_format,
      status: row.status,
      totalRecords: row.total_records || 0,
      filters: this.parseJSONField(row.filters),
      fields: this.parseJSONField(row.fields),
      downloadUrl: row.download_url,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private parseJSONField(value: any): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  }
}
