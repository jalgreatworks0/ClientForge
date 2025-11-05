/**
 * Custom Fields Routes
 * RESTful API routes for custom fields management
 */

import { Router } from 'express'
import { customFieldController } from '../../../../core/metadata/metadata-controller'
import { authenticate } from '../../../../middleware/auth'
import { checkPermission } from '../../../../middleware/rbac'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * @route   POST /api/v1/custom-fields/values
 * @desc    Set a custom field value for an entity
 * @access  Private (custom_fields:update)
 */
router.post(
  '/values',
  checkPermission('custom_fields:update'),
  customFieldController.setCustomFieldValue.bind(customFieldController)
)

/**
 * @route   GET /api/v1/custom-fields/values
 * @desc    Get custom field values for an entity
 * @access  Private (custom_fields:read)
 */
router.get(
  '/values',
  checkPermission('custom_fields:read'),
  customFieldController.getCustomFieldValues.bind(customFieldController)
)

/**
 * @route   GET /api/v1/custom-fields/fields-with-values
 * @desc    Get custom fields with values for an entity
 * @access  Private (custom_fields:read)
 */
router.get(
  '/fields-with-values',
  checkPermission('custom_fields:read'),
  customFieldController.getCustomFieldsWithValues.bind(customFieldController)
)

/**
 * @route   GET /api/v1/custom-fields
 * @desc    List custom fields with pagination and filtering
 * @access  Private (custom_fields:read)
 */
router.get(
  '/',
  checkPermission('custom_fields:read'),
  customFieldController.listCustomFields.bind(customFieldController)
)

/**
 * @route   POST /api/v1/custom-fields
 * @desc    Create a new custom field definition
 * @access  Private (custom_fields:create)
 */
router.post(
  '/',
  checkPermission('custom_fields:create'),
  customFieldController.createCustomField.bind(customFieldController)
)

/**
 * @route   GET /api/v1/custom-fields/:id
 * @desc    Get custom field by ID
 * @access  Private (custom_fields:read)
 */
router.get(
  '/:id',
  checkPermission('custom_fields:read'),
  customFieldController.getCustomFieldById.bind(customFieldController)
)

/**
 * @route   PUT /api/v1/custom-fields/:id
 * @desc    Update a custom field definition
 * @access  Private (custom_fields:update)
 */
router.put(
  '/:id',
  checkPermission('custom_fields:update'),
  customFieldController.updateCustomField.bind(customFieldController)
)

/**
 * @route   DELETE /api/v1/custom-fields/:id
 * @desc    Delete a custom field definition
 * @access  Private (custom_fields:delete)
 */
router.delete(
  '/:id',
  checkPermission('custom_fields:delete'),
  customFieldController.deleteCustomField.bind(customFieldController)
)

export default router
