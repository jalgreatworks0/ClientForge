/**
 * Import/Export API Routes
 */

import path from 'path';

import { Router, Request, Response } from 'express';
import multer from 'multer';

import { ImportService } from '../../../../services/import-export/import.service';
import { ExportService } from '../../../../services/import-export/export.service';
import { authenticate } from '../../../../middleware/authenticate';
import { logger } from '../../../../utils/logging/logger';

const router = Router();
const importService = new ImportService();
const exportService = new ExportService();

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), 'storage', 'uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Import routes
router.post('/import', authenticate, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { entityType, mapping } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ success: false, error: 'No file uploaded' });

    const fileFormat = path.extname(file.originalname).slice(1);
    const job = await importService.createImportJob({
      tenantId: req.user!.tenantId,
      entityType,
      fileName: file.originalname,
      fileFormat,
      mapping: JSON.parse(mapping),
      createdBy: req.user!.id,
    });

    // Process asynchronously
    importService.processImport(job.id, file.path).catch(err => {
      logger.error('[Import API] Import processing failed', { error: err.message });
    });

    res.status(201).json({ success: true, data: job });
  } catch (error: any) {
    logger.error('[Import API] Failed to create import job', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/import', authenticate, async (req: Request, res: Response) => {
  try {
    const jobs = await importService.getImportJobs(req.user!.tenantId);
    res.json({ success: true, data: jobs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get import jobs' });
  }
});

router.get('/import/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const job = await importService.getImportJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Import job not found' });
    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get import job' });
  }
});

// Export routes
router.post('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const { entityType, fileFormat, filters, fields } = req.body;
    const job = await exportService.createExportJob({
      tenantId: req.user!.tenantId,
      entityType,
      fileFormat,
      filters,
      fields,
      createdBy: req.user!.id,
    });

    // Process asynchronously
    exportService.processExport(job.id).catch(err => {
      logger.error('[Export API] Export processing failed', { error: err.message });
    });

    res.status(201).json({ success: true, data: job });
  } catch (error: any) {
    logger.error('[Export API] Failed to create export job', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/export', authenticate, async (req: Request, res: Response) => {
  try {
    const jobs = await exportService.getExportJobs(req.user!.tenantId);
    res.json({ success: true, data: jobs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get export jobs' });
  }
});

router.get('/export/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const job = await exportService.getExportJob(req.params.id);
    if (!job) return res.status(404).json({ success: false, error: 'Export job not found' });
    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, error: 'Failed to get export job' });
  }
});

export default router;
