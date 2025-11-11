/**
 * Custom Fields API Routes
 * Manages dynamic custom fields for entities
 */

import { Router, Request, Response } from 'express';
import { CustomFieldService } from '../../../../services/custom-fields/custom-field.service';
import { authenticate } from '../../../../middleware/authenticate';
import { validateRequest } from '../../../../middleware/validate-request';
import { logger } from '../../../../utils/logging/logger';
import { z } from 'zod';

const router = Router();
const customFieldService = new CustomFieldService();

// Validation schemas
const createCustomFieldSchema = z.object({
  entityType: z.enum(['contact', 'deal', 'company', 'lead', 'ticket', 'project']),
  fieldName: z.string().regex(/^[a-z0-9_]+$/, 'Field name must be lowercase alphanumeric with underscores'),
  fieldLabel: z.string().min(1).max(200),
  fieldType: z.enum(['text', 'number', 'date', 'datetime', 'select', 'multi-select', 'checkbox', 'url', 'email', 'phone', 'textarea', 'currency']),
  fieldOptions: z.array(z.string()).optional(),
  defaultValue: z.any().optional(),
  required: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

const updateCustomFieldSchema = z.object({
  fieldLabel: z.string().min(1).max(200).optional(),
  fieldOptions: z.array(z.string()).optional(),
  defaultValue: z.any().optional(),
  required: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

// Routes
router.post('/', authenticate, validateRequest({ body: createCustomFieldSchema }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const createdBy = req.user!.id;
    const field = await customFieldService.createCustomField({ tenantId, createdBy, ...req.body });
    logger.info('[CustomFields API] Custom field created', { tenantId, fieldId: field.id });
    res.status(201).json({ success: true, data: field });
  } catch (error: any) {
    logger.error('[CustomFields API] Failed to create custom field', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/:entityType', authenticate, async (req: Request, res: Response) => {
  try {
    const { entityType } = req.params;
    const tenantId = req.user!.tenantId;
    const fields = await customFieldService.getCustomFields(tenantId, entityType);
    res.json({ success: true, data: fields });
  } catch (error: any) {
    logger.error('[CustomFields API] Failed to get custom fields', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get custom fields' });
  }
});

router.get('/:entityType/:fieldId', authenticate, async (req: Request, res: Response) => {
  try {
    const { fieldId } = req.params;
    const tenantId = req.user!.tenantId;
    const field = await customFieldService.getCustomField(tenantId, fieldId);
    if (!field) {
      return res.status(404).json({ success: false, error: 'Custom field not found' });
    }
    res.json({ success: true, data: field });
  } catch (error: any) {
    logger.error('[CustomFields API] Failed to get custom field', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get custom field' });
  }
});

router.patch('/:entityType/:fieldId', authenticate, validateRequest({ body: updateCustomFieldSchema }), async (req: Request, res: Response) => {
  try {
    const { fieldId } = req.params;
    const tenantId = req.user!.tenantId;
    const field = await customFieldService.updateCustomField(tenantId, fieldId, req.body);
    logger.info('[CustomFields API] Custom field updated', { tenantId, fieldId });
    res.json({ success: true, data: field });
  } catch (error: any) {
    logger.error('[CustomFields API] Failed to update custom field', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.delete('/:entityType/:fieldId', authenticate, async (req: Request, res: Response) => {
  try {
    const { fieldId } = req.params;
    const tenantId = req.user!.tenantId;
    await customFieldService.deleteCustomField(tenantId, fieldId);
    logger.info('[CustomFields API] Custom field deleted', { tenantId, fieldId });
    res.json({ success: true, message: 'Custom field deleted successfully' });
  } catch (error: any) {
    logger.error('[CustomFields API] Failed to delete custom field', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/:entityType/:entityId/values', authenticate, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId } = req.params;
    const tenantId = req.user!.tenantId;
    const values = await customFieldService.getCustomFieldValues(tenantId, entityType, entityId);
    res.json({ success: true, data: values });
  } catch (error: any) {
    logger.error('[CustomFields API] Failed to get custom field values', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to get custom field values' });
  }
});

router.put('/:entityType/:entityId/values/:fieldId', authenticate, async (req: Request, res: Response) => {
  try {
    const { entityType, entityId, fieldId } = req.params;
    const { value } = req.body;
    const tenantId = req.user!.tenantId;
    const fieldValue = await customFieldService.setCustomFieldValue({ tenantId, fieldId, entityId, entityType, value });
    logger.info('[CustomFields API] Custom field value set', { tenantId, fieldId, entityId });
    res.json({ success: true, data: fieldValue });
  } catch (error: any) {
    logger.error('[CustomFields API] Failed to set custom field value', { error: error.message });
    res.status(400).json({ success: false, error: error.message });
  }
});

export default router;
