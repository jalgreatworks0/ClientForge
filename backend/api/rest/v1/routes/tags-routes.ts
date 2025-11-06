/**
 * Tags Routes
 * RESTful API routes for tags management
 */

import { Router } from 'express'
import { tagController } from '../../../../core/metadata/metadata-controller'
import { authenticate } from '../../../../middleware/authenticate'
import { requirePermission } from '../../../../middleware/authorize'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * @route   POST /api/v1/tags/assign
 * @desc    Assign a tag to an entity
 * @access  Private (tags:assign)
 */
router.post(
  '/assign',
  requirePermission('tags:assign'),
  tagController.assignTag.bind(tagController)
)

/**
 * @route   DELETE /api/v1/tags/unassign
 * @desc    Unassign a tag from an entity
 * @access  Private (tags:assign)
 */
router.delete(
  '/unassign',
  requirePermission('tags:assign'),
  tagController.unassignTag.bind(tagController)
)

/**
 * @route   GET /api/v1/tags/entity
 * @desc    Get tags for a specific entity
 * @access  Private (tags:read)
 */
router.get('/entity', requirePermission('tags:read'), tagController.getEntityTags.bind(tagController))

/**
 * @route   GET /api/v1/tags/statistics
 * @desc    Get tag statistics
 * @access  Private (tags:read)
 */
router.get(
  '/statistics',
  requirePermission('tags:read'),
  tagController.getTagStatistics.bind(tagController)
)

/**
 * @route   GET /api/v1/tags
 * @desc    List tags with pagination and filtering
 * @access  Private (tags:read)
 */
router.get('/', requirePermission('tags:read'), tagController.listTags.bind(tagController))

/**
 * @route   POST /api/v1/tags
 * @desc    Create a new tag
 * @access  Private (tags:create)
 */
router.post('/', requirePermission('tags:create'), tagController.createTag.bind(tagController))

/**
 * @route   GET /api/v1/tags/:id
 * @desc    Get tag by ID
 * @access  Private (tags:read)
 */
router.get('/:id', requirePermission('tags:read'), tagController.getTagById.bind(tagController))

/**
 * @route   PUT /api/v1/tags/:id
 * @desc    Update a tag
 * @access  Private (tags:update)
 */
router.put('/:id', requirePermission('tags:update'), tagController.updateTag.bind(tagController))

/**
 * @route   DELETE /api/v1/tags/:id
 * @desc    Delete a tag
 * @access  Private (tags:delete)
 */
router.delete('/:id', requirePermission('tags:delete'), tagController.deleteTag.bind(tagController))

export default router
