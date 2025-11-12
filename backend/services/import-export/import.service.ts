/**
 * Import Service
 * Handles bulk data import from CSV, Excel, JSON
 */

import * as fs from 'fs/promises';
import { createReadStream } from 'fs';

import { Pool } from 'pg';
import csv from 'csv-parser';
import * as XLSX from 'xlsx';

import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';



export interface ImportJob {
  id: string;
  tenantId: string;
  entityType: 'contact' | 'deal' | 'company' | 'lead';
  fileName: string;
  fileFormat: 'csv' | 'xlsx' | 'json';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: any[];
  mapping: Record<string, string>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ImportService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  async createImportJob(params: {
    tenantId: string;
    entityType: string;
    fileName: string;
    fileFormat: string;
    mapping: Record<string, string>;
    createdBy: string;
  }): Promise<ImportJob> {
    const result = await this.pool.query(
      `INSERT INTO import_jobs (tenantId, entity_type, file_name, file_format, mapping, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING *`,
      [params.tenantId, params.entityType, params.fileName, params.fileFormat, JSON.stringify(params.mapping), params.createdBy]
    );
    return this.mapRowToImportJob(result.rows[0]);
  }

  async processImport(jobId: string, filePath: string): Promise<void> {
    const job = await this.getImportJob(jobId);
    if (!job) throw new Error('Import job not found');

    await this.updateJobStatus(jobId, 'processing');

    try {
      let records: any[] = [];

      if (job.fileFormat === 'csv') {
        records = await this.parseCSV(filePath);
      } else if (job.fileFormat === 'xlsx') {
        records = await this.parseExcel(filePath);
      } else if (job.fileFormat === 'json') {
        records = await this.parseJSON(filePath);
      }

      await this.pool.query('UPDATE import_jobs SET total_records = $1 WHERE id = $2', [records.length, jobId]);

      const errors: any[] = [];
      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < records.length; i++) {
        try {
          const mappedRecord = this.applyMapping(records[i], job.mapping);
          await this.importRecord(job.entityType, job.tenantId, mappedRecord, job.createdBy);
          successCount++;
        } catch (error: any) {
          failCount++;
          errors.push({ row: i + 1, error: error.message, record: records[i] });
        }

        if (i % 100 === 0) {
          await this.pool.query(
            'UPDATE import_jobs SET processed_records = $1, successful_records = $2, failed_records = $3 WHERE id = $4',
            [i + 1, successCount, failCount, jobId]
          );
        }
      }

      await this.pool.query(
        `UPDATE import_jobs
         SET status = 'completed', processed_records = $1, successful_records = $2, failed_records = $3, errors = $4
         WHERE id = $5`,
        [records.length, successCount, failCount, JSON.stringify(errors), jobId]
      );

      logger.info('[Import] Import completed', { jobId, successCount, failCount });
    } catch (error: any) {
      await this.pool.query(
        `UPDATE import_jobs SET status = 'failed', errors = $1 WHERE id = $2`,
        [JSON.stringify([{ error: error.message }]), jobId]
      );
      logger.error('[Import] Import failed', { jobId, error: error.message });
      throw error;
    }
  }

  private async parseCSV(filePath: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const records: any[] = [];
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => records.push(row))
        .on('end', () => resolve(records))
        .on('error', reject);
    });
  }

  private async parseExcel(filePath: string): Promise<any[]> {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(sheet);
  }

  private async parseJSON(filePath: string): Promise<any[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  }

  private applyMapping(record: any, mapping: Record<string, string>): any {
    const mapped: any = {};
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      if (record[sourceField] !== undefined) {
        mapped[targetField] = record[sourceField];
      }
    }
    return mapped;
  }

  private async importRecord(entityType: string, tenantId: string, record: any, createdBy: string): Promise<void> {
    const table = entityType + 's';
    const fields = Object.keys(record);
    const values = Object.values(record);
    const placeholders = fields.map((_, i) => '$' + (i + 3)).join(', ');
    const fieldsList = fields.join(', ');

    const query = `INSERT INTO ${table} (tenantId, created_by, ${fieldsList}) VALUES ($1, $2, ${placeholders})`;
    await this.pool.query(query, [tenantId, createdBy, ...values]);
  }

  private async updateJobStatus(jobId: string, status: string): Promise<void> {
    await this.pool.query('UPDATE import_jobs SET status = $1 WHERE id = $2', [status, jobId]);
  }

  async getImportJob(jobId: string): Promise<ImportJob | null> {
    const result = await this.pool.query('SELECT * FROM import_jobs WHERE id = $1', [jobId]);
    return result.rows.length > 0 ? this.mapRowToImportJob(result.rows[0]) : null;
  }

  async getImportJobs(tenantId: string): Promise<ImportJob[]> {
    const result = await this.pool.query(
      'SELECT * FROM import_jobs WHERE tenantId = $1 ORDER BY created_at DESC LIMIT 50',
      [tenantId]
    );
    return result.rows.map(row => this.mapRowToImportJob(row));
  }

  private mapRowToImportJob(row: any): ImportJob {
    return {
      id: row.id,
      tenantId: row.tenantId,
      entityType: row.entity_type,
      fileName: row.file_name,
      fileFormat: row.file_format,
      status: row.status,
      totalRecords: row.total_records || 0,
      processedRecords: row.processed_records || 0,
      successfulRecords: row.successful_records || 0,
      failedRecords: row.failed_records || 0,
      errors: this.parseJSONField(row.errors),
      mapping: this.parseJSONField(row.mapping),
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
    return value || [];
  }
}
