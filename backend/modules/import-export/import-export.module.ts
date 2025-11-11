/**
 * Import/Export Module
 */

import { IModule, ModuleContext } from '../../core/module-registry';
import { Express } from 'express';
import importExportRoutes from '../../api/rest/v1/routes/import-export-routes';
import { logger } from '../../utils/logging/logger';
import { ImportService } from '../../services/import-export/import.service';
import { ExportService } from '../../services/import-export/export.service';
import * as fs from 'fs/promises';
import * as path from 'path';

export class ImportExportModule implements IModule {
  name = 'import-export';
  version = '1.0.0';
  dependencies: string[] = [];

  private importService: ImportService;
  private exportService: ExportService;

  constructor() {
    this.importService = new ImportService();
    this.exportService = new ExportService();
  }

  async initialize(context: ModuleContext): Promise<void> {
    logger.info('[ImportExport Module] Initializing...');
    await this.createDirectories();
    await this.runMigrations(context);
    logger.info('[ImportExport Module] Initialized');
  }

  registerRoutes(app: Express, context: ModuleContext): void {
    app.use('/api/v1', importExportRoutes);
    logger.info('[ImportExport Module] Routes registered');
  }

  registerEventHandlers(context: ModuleContext): void {
    logger.info('[ImportExport Module] Event handlers registered');
  }

  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      await this.importService['pool'].query('SELECT 1');
      return { healthy: true, details: { database: 'connected' } };
    } catch (error: any) {
      return { healthy: false, details: { error: error.message } };
    }
  }

  async shutdown(): Promise<void> {
    logger.info('[ImportExport Module] Shutdown');
  }

  private async createDirectories(): Promise<void> {
    const dirs = [
      path.join(process.cwd(), 'storage', 'uploads'),
      path.join(process.cwd(), 'storage', 'exports'),
    ];
    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async runMigrations(context: ModuleContext): Promise<void> {
    try {
      const migrationPath = path.join(process.cwd(), 'database', 'migrations', '016_import_export.sql');
      const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
      await this.importService['pool'].query(migrationSQL);
      logger.info('[ImportExport Module] Migrations completed');
    } catch (error: any) {
      // If migration file doesn't exist or migration fails, log warning and continue
      // The tables may already exist from a previous migration
      logger.warn('[ImportExport Module] Migration skipped', {
        error: error.message,
        reason: 'Tables may already exist or migration file missing'
      });
    }
  }
}

export const importExportModule = new ImportExportModule();
