/**
 * Tags Routes
 * RESTful API routes for tags management
 */

import { Router } from 'express'
import { tagController } from '../../../../core/metadata/metadata-controller'
import { authenticate } from '../../../../middleware/auth'
import { checkPermission } from '../../../../middleware/rbac'

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
  checkPermission('tags:assign'),
  tagController.assignTag.bind(tagController)
)

/**
 * @route   DELETE /api/v1/tags/unassign
 * @desc    Unassign a tag from an entity
 * @access  Private (tags:assign)
 */
router.delete(
  '/unassign',
  checkPermission('tags:assign'),
  tagController.unassignTag.bind(tagController)
)

/**
 * @route   GET /api/v1/tags/entity
 * @desc    Get tags for a specific entity
 * @access  Private (tags:read)
 */
router.get('/entity', checkPermission('tags:read'), tagController.getEntityTags.bind(tagController))

/**
 * @route   GET /api/v1/tags/statistics
 * @desc    Get tag statistics
 * @access  Private (tags:read)
 */
router.get(
  '/statistics',
  checkPermission('tags:read'),
  tagController.getTagStatistics.bind(tagController)
)

/**
 * @route   GET /api/v1/tags
 * @desc    List tags with pagination and filtering
 * @access  Private (tags:read)
 */
router.get('/', checkPermission('tags:read'), tagController.listTags.bind(tagController))

/**
 * @route   POST /api/v1/tags
 * @desc    Create a new tag
 * @access  Private (tags:create)
 */
router.post('/', checkPermission('tags:create'), tagController.createTag.bind(tagController))

/**
 * @route   GET /api/v1/tags/:id
 * @desc    Get tag by ID
 * @access  Private (tags:read)
 */
router.get('/:id', checkPermission('tags:read'), tagController.getTagById.bind(tagController))

/**
 * @route   PUT /api/v1/tags/:id
 * @desc    Update a tag
 * @access  Private (tags:update)
 */
router.put('/:id', checkPermission('tags:update'), tagController.updateTag.bind(tagController))

/**
 * @route   DELETE /api/v1/tags/:id
 * @desc    Delete a tag
 * @access  Private (tags:delete)
 */
router.delete('/:id', checkPermission('tags:delete'), tagController.deleteTag.bind(tagController))

export default router
