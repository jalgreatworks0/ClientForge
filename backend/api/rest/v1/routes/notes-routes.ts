/**
 * Notes Routes
 * RESTful API routes for notes management
 */

import { Router } from 'express'
import { noteController } from '../../../../core/metadata/metadata-controller'
import { authenticate } from '../../../../middleware/auth'
import { checkPermission } from '../../../../middleware/rbac'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * @route   GET /api/v1/notes/search
 * @desc    Search notes by content
 * @access  Private (notes:read)
 */
router.get(
  '/search',
  checkPermission('notes:read'),
  noteController.searchNotes.bind(noteController)
)

/**
 * @route   GET /api/v1/notes/entity
 * @desc    Get notes for a specific entity
 * @access  Private (notes:read)
 */
router.get(
  '/entity',
  checkPermission('notes:read'),
  noteController.getEntityNotes.bind(noteController)
)

/**
 * @route   GET /api/v1/notes/statistics
 * @desc    Get note statistics
 * @access  Private (notes:read)
 */
router.get(
  '/statistics',
  checkPermission('notes:read'),
  noteController.getNoteStatistics.bind(noteController)
)

/**
 * @route   POST /api/v1/notes/bulk
 * @desc    Bulk operations on notes (delete, pin, unpin)
 * @access  Private (notes:delete or notes:update)
 */
router.post(
  '/bulk',
  checkPermission('notes:update'),
  noteController.bulkNoteOperation.bind(noteController)
)

/**
 * @route   GET /api/v1/notes
 * @desc    List notes with pagination and filtering
 * @access  Private (notes:read)
 */
router.get('/', checkPermission('notes:read'), noteController.listNotes.bind(noteController))

/**
 * @route   POST /api/v1/notes
 * @desc    Create a new note
 * @access  Private (notes:create)
 */
router.post('/', checkPermission('notes:create'), noteController.createNote.bind(noteController))

/**
 * @route   GET /api/v1/notes/:id
 * @desc    Get note by ID
 * @access  Private (notes:read)
 */
router.get('/:id', checkPermission('notes:read'), noteController.getNoteById.bind(noteController))

/**
 * @route   PUT /api/v1/notes/:id
 * @desc    Update a note
 * @access  Private (notes:update)
 */
router.put(
  '/:id',
  checkPermission('notes:update'),
  noteController.updateNote.bind(noteController)
)

/**
 * @route   DELETE /api/v1/notes/:id
 * @desc    Delete a note
 * @access  Private (notes:delete)
 */
router.delete(
  '/:id',
  checkPermission('notes:delete'),
  noteController.deleteNote.bind(noteController)
)

export default router
