/**
 * Comments Routes
 * RESTful API routes for comments management
 */

import { Router } from 'express'
import { commentController } from '../../../../core/metadata/metadata-controller'
import { authenticate } from '../../../../middleware/auth'
import { checkPermission } from '../../../../middleware/rbac'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * @route   GET /api/v1/comments/entity
 * @desc    Get comments for a specific entity
 * @access  Private (comments:read)
 */
router.get(
  '/entity',
  checkPermission('comments:read'),
  commentController.getEntityComments.bind(commentController)
)

/**
 * @route   GET /api/v1/comments/statistics
 * @desc    Get comment statistics
 * @access  Private (comments:read)
 */
router.get(
  '/statistics',
  checkPermission('comments:read'),
  commentController.getCommentStatistics.bind(commentController)
)

/**
 * @route   GET /api/v1/comments
 * @desc    List comments with pagination and filtering
 * @access  Private (comments:read)
 */
router.get(
  '/',
  checkPermission('comments:read'),
  commentController.listComments.bind(commentController)
)

/**
 * @route   POST /api/v1/comments
 * @desc    Create a new comment
 * @access  Private (comments:create)
 */
router.post(
  '/',
  checkPermission('comments:create'),
  commentController.createComment.bind(commentController)
)

/**
 * @route   GET /api/v1/comments/:id
 * @desc    Get comment by ID
 * @access  Private (comments:read)
 */
router.get(
  '/:id',
  checkPermission('comments:read'),
  commentController.getCommentById.bind(commentController)
)

/**
 * @route   PUT /api/v1/comments/:id
 * @desc    Update a comment
 * @access  Private (comments:update)
 */
router.put(
  '/:id',
  checkPermission('comments:update'),
  commentController.updateComment.bind(commentController)
)

/**
 * @route   DELETE /api/v1/comments/:id
 * @desc    Delete a comment
 * @access  Private (comments:delete)
 */
router.delete(
  '/:id',
  checkPermission('comments:delete'),
  commentController.deleteComment.bind(commentController)
)

export default router
