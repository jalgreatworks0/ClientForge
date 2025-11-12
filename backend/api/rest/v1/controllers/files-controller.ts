/**
 * Files Controller
 * Handles file upload, download, and signed URL generation
 * All file access goes through signed URLs for security
 */

import { Request, Response } from 'express'
import multer from 'multer'

import { storageService } from '../../../../services/storage/storage.service'
import { logger } from '../../../../utils/logging/logger'

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB max
  },
  fileFilter: (req, file, cb) => {
    // Block executable files
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi']
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'))

    if (dangerousExtensions.includes(ext)) {
      cb(new Error('Executable files are not allowed'))
      return
    }

    cb(null, true)
  }
})

/**
 * Upload a file
 * POST /api/v1/files/upload
 */
export const uploadFile = [
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file
      const { entityType, entityId } = req.body
      const tenantId = req.user!.tenantId
      const userId = req.user!.id

      if (!file) {
        res.status(400).json({
          success: false,
          message: 'No file provided'
        })
        return
      }

      // Upload file to storage
      const result = await storageService.uploadFile(file.buffer, {
        tenantId,
        userId,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        entityType,
        entityId
      })

      logger.info('File uploaded via API', {
        fileId: result.fileId,
        fileName: file.originalname,
        size: file.size,
        tenantId
      })

      res.status(201).json({
        success: true,
        data: {
          fileId: result.fileId,
          key: result.key,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype
        }
      })
    } catch (error: any) {
      logger.error('File upload failed', {
        error: error.message,
        user: req.user?.id
      })

      res.status(500).json({
        success: false,
        message: error.message || 'File upload failed'
      })
    }
  }
]

/**
 * Get signed URL for file download
 * GET /api/v1/files/:fileId/url
 *
 * Returns a temporary signed URL that expires in 1 hour
 * Enforces tenant isolation - users can only access their tenant's files
 */
export const getFileSignedUrl = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params
    const { expiresIn = 3600 } = req.query // Default 1 hour
    const tenantId = req.user!.tenantId

    // Validate expiresIn
    const expiresInNum = parseInt(expiresIn as string, 10)
    if (isNaN(expiresInNum) || expiresInNum < 1 || expiresInNum > 86400) {
      res.status(400).json({
        success: false,
        message: 'expiresIn must be between 1 and 86400 seconds (24 hours)'
      })
      return
    }

    // Generate signed URL (enforces tenant isolation)
    const signedUrl = await storageService.getSignedUrl(fileId, tenantId, expiresInNum)

    logger.info('Signed URL generated', {
      fileId,
      tenantId,
      expiresIn: expiresInNum,
      userId: req.user?.id
    })

    res.status(200).json({
      success: true,
      data: {
        fileId,
        url: signedUrl,
        expiresIn: expiresInNum,
        expiresAt: new Date(Date.now() + expiresInNum * 1000).toISOString()
      }
    })
  } catch (error: any) {
    logger.error('Failed to generate signed URL', {
      error: error.message,
      fileId: req.params.fileId,
      user: req.user?.id
    })

    const statusCode = error.message.includes('not found') ? 404
      : error.message.includes('Access denied') ? 403
      : 500

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to generate signed URL'
    })
  }
}

/**
 * Get file metadata
 * GET /api/v1/files/:fileId
 */
export const getFileMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params
    const tenantId = req.user!.tenantId

    const metadata = await storageService.getFileMetadata(fileId, tenantId)

    res.status(200).json({
      success: true,
      data: metadata
    })
  } catch (error: any) {
    logger.error('Failed to get file metadata', {
      error: error.message,
      fileId: req.params.fileId,
      user: req.user?.id
    })

    const statusCode = error.message.includes('not found') ? 404 : 500

    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to get file metadata'
    })
  }
}

/**
 * Delete a file
 * DELETE /api/v1/files/:fileId
 */
export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.params
    const tenantId = req.user!.tenantId

    await storageService.deleteFile(fileId, tenantId)

    logger.info('File deleted via API', {
      fileId,
      tenantId,
      userId: req.user?.id
    })

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    })
  } catch (error: any) {
    logger.error('File deletion failed', {
      error: error.message,
      fileId: req.params.fileId,
      user: req.user?.id
    })

    const statusCode = error.message.includes('not found') ? 404
      : error.message.includes('Access denied') ? 403
      : 500

    res.status(statusCode).json({
      success: false,
      message: error.message || 'File deletion failed'
    })
  }
}

/**
 * List files for an entity
 * GET /api/v1/files/entity/:entityType/:entityId
 */
export const listEntityFiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { entityType, entityId } = req.params
    const tenantId = req.user!.tenantId

    const files = await storageService.listEntityFiles(tenantId, entityType, entityId)

    res.status(200).json({
      success: true,
      data: files,
      count: files.length
    })
  } catch (error: any) {
    logger.error('Failed to list entity files', {
      error: error.message,
      entityType: req.params.entityType,
      entityId: req.params.entityId,
      user: req.user?.id
    })

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to list entity files'
    })
  }
}

/**
 * Get storage statistics for current tenant
 * GET /api/v1/files/stats
 */
export const getStorageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const stats = await storageService.getTenantStorageStats(tenantId)

    res.status(200).json({
      success: true,
      data: stats
    })
  } catch (error: any) {
    logger.error('Failed to get storage stats', {
      error: error.message,
      user: req.user?.id
    })

    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get storage statistics'
    })
  }
}

/**
 * Bulk generate signed URLs
 * POST /api/v1/files/bulk-urls
 * Body: { fileIds: string[], expiresIn?: number }
 */
export const bulkGenerateSignedUrls = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileIds, expiresIn = 3600 } = req.body
    const tenantId = req.user!.tenantId

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'fileIds must be a non-empty array'
      })
      return
    }

    if (fileIds.length > 100) {
      res.status(400).json({
        success: false,
        message: 'Maximum 100 files can be processed at once'
      })
      return
    }

    // Generate signed URLs in parallel
    const results = await Promise.allSettled(
      fileIds.map(fileId =>
        storageService.getSignedUrl(fileId, tenantId, expiresIn)
          .then(url => ({ fileId, url, success: true }))
          .catch(error => ({ fileId, error: error.message, success: false }))
      )
    )

    const urls: Array<{ fileId: string; url?: string; error?: string; success: boolean }> = results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return { fileId: '', error: result.reason.message, success: false }
      }
    })

    const successCount = urls.filter(u => u.success).length
    const failureCount = urls.filter(u => !u.success).length

    logger.info('Bulk signed URLs generated', {
      total: fileIds.length,
      success: successCount,
      failure: failureCount,
      tenantId,
      userId: req.user?.id
    })

    res.status(200).json({
      success: true,
      data: urls,
      summary: {
        total: fileIds.length,
        success: successCount,
        failure: failureCount
      }
    })
  } catch (error: any) {
    logger.error('Bulk URL generation failed', {
      error: error.message,
      user: req.user?.id
    })

    res.status(500).json({
      success: false,
      message: error.message || 'Bulk URL generation failed'
    })
  }
}
