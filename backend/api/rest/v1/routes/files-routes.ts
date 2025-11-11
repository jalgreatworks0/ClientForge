/**
 * Files Routes
 * All file access requires authentication and uses signed URLs
 */

import { Router } from 'express'
import {
  uploadFile,
  getFileSignedUrl,
  getFileMetadata,
  deleteFile,
  listEntityFiles,
  getStorageStats,
  bulkGenerateSignedUrls
} from '../controllers/files-controller'
import { authenticate } from '../../../../middleware/authenticate'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * @route   POST /api/v1/files/upload
 * @desc    Upload a file
 * @access  Private
 * @body    file: File, entityType?: string, entityId?: string
 */
router.post('/upload', uploadFile)

/**
 * @route   GET /api/v1/files/:fileId/url
 * @desc    Get signed URL for file download
 * @access  Private
 * @query   expiresIn?: number (1-86400 seconds, default: 3600)
 */
router.get('/:fileId/url', getFileSignedUrl)

/**
 * @route   GET /api/v1/files/:fileId
 * @desc    Get file metadata
 * @access  Private
 */
router.get('/:fileId', getFileMetadata)

/**
 * @route   DELETE /api/v1/files/:fileId
 * @desc    Delete a file
 * @access  Private
 */
router.delete('/:fileId', deleteFile)

/**
 * @route   GET /api/v1/files/entity/:entityType/:entityId
 * @desc    List files for an entity
 * @access  Private
 */
router.get('/entity/:entityType/:entityId', listEntityFiles)

/**
 * @route   GET /api/v1/files/stats
 * @desc    Get storage statistics for current tenant
 * @access  Private
 */
router.get('/stats', getStorageStats)

/**
 * @route   POST /api/v1/files/bulk-urls
 * @desc    Generate signed URLs for multiple files
 * @access  Private
 * @body    fileIds: string[], expiresIn?: number
 */
router.post('/bulk-urls', bulkGenerateSignedUrls)

export default router
