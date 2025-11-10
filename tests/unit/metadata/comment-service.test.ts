/**
 * Comment Service Unit Tests
 * Comprehensive tests for comments functionality with nested comments
 */

import { CommentService } from '../../../backend/core/metadata/metadata-service'
import { metadataRepository } from '../../../backend/core/metadata/metadata-repository'
import { ValidationError, NotFoundError } from '../../../backend/utils/errors'

// Mock the repository
jest.mock('../../../backend/core/metadata/metadata-repository')

describe('CommentService', () => {
  let commentService: CommentService
  const tenantId = 'tenant-123'
  const userId = 'user-123'

  beforeEach(() => {
    commentService = new CommentService()
    jest.clearAllMocks()
  })

  describe('createComment', () => {
    it('should successfully create top-level comment', async () => {
      const input = {
        entityType: 'deal',
        entityId: 'deal-123',
        content: 'Test comment',
      }

      const mockComment = {
        id: 'comment-123',
        tenantId,
        createdBy: userId,
        ...input,
        parentId: null,
        createdAt: new Date(),
      }

      ;(metadataRepository.createComment as jest.Mock).mockResolvedValue(mockComment)

      const result = await commentService.createComment(tenantId, userId, input)

      expect(result).toEqual(mockComment)
      expect(metadataRepository.createComment).toHaveBeenCalledWith(
        tenantId,
        userId,
        input
      )
    })

    it('should successfully create reply to top-level comment', async () => {
      const parentComment = {
        id: 'comment-123',
        tenantId,
        entityType: 'deal',
        entityId: 'deal-123',
        content: 'Parent comment',
        parentId: null,
      }

      const input = {
        entityType: 'deal',
        entityId: 'deal-123',
        content: 'Reply comment',
        parentId: 'comment-123',
      }

      const mockComment = {
        id: 'comment-456',
        tenantId,
        createdBy: userId,
        ...input,
        createdAt: new Date(),
      }

      ;(metadataRepository.findCommentById as jest.Mock).mockResolvedValue(parentComment)
      ;(metadataRepository.createComment as jest.Mock).mockResolvedValue(mockComment)

      const result = await commentService.createComment(tenantId, userId, input)

      expect(result).toEqual(mockComment)
      expect(metadataRepository.findCommentById).toHaveBeenCalledWith(
        'comment-123',
        tenantId
      )
    })

    it('should throw ValidationError for content exceeding 10,000 characters', async () => {
      const input = {
        entityType: 'deal',
        entityId: 'deal-123',
        content: 'a'.repeat(10001),
      }

      await expect(
        commentService.createComment(tenantId, userId, input)
      ).rejects.toThrow(ValidationError)
      await expect(
        commentService.createComment(tenantId, userId, input)
      ).rejects.toThrow('Comment content exceeds maximum length of 10,000 characters')
    })

    it('should throw NotFoundError if parent comment does not exist', async () => {
      const input = {
        entityType: 'deal',
        entityId: 'deal-123',
        content: 'Reply comment',
        parentId: 'non-existent-comment',
      }

      ;(metadataRepository.findCommentById as jest.Mock).mockResolvedValue(null)

      await expect(
        commentService.createComment(tenantId, userId, input)
      ).rejects.toThrow(NotFoundError)
      await expect(
        commentService.createComment(tenantId, userId, input)
      ).rejects.toThrow('Parent comment not found')
    })

    it('should throw ValidationError when replying to a nested comment (max 2 levels)', async () => {
      const parentComment = {
        id: 'comment-123',
        tenantId,
        entityType: 'deal',
        entityId: 'deal-123',
        content: 'Nested comment',
        parentId: 'comment-parent', // This is already a reply
      }

      const input = {
        entityType: 'deal',
        entityId: 'deal-123',
        content: 'Third level reply',
        parentId: 'comment-123',
      }

      ;(metadataRepository.findCommentById as jest.Mock).mockResolvedValue(parentComment)

      await expect(
        commentService.createComment(tenantId, userId, input)
      ).rejects.toThrow(ValidationError)
      await expect(
        commentService.createComment(tenantId, userId, input)
      ).rejects.toThrow('Cannot reply to a nested comment. Maximum nesting level is 2.')
    })

    it('should throw ValidationError if parent comment is on different entity', async () => {
      const parentComment = {
        id: 'comment-123',
        tenantId,
        entityType: 'contact',
        entityId: 'contact-123',
        content: 'Parent comment',
        parentId: null,
      }

      const input = {
        entityType: 'deal',
        entityId: 'deal-123',
        content: 'Reply comment',
        parentId: 'comment-123',
      }

      ;(metadataRepository.findCommentById as jest.Mock).mockResolvedValue(parentComment)

      await expect(
        commentService.createComment(tenantId, userId, input)
      ).rejects.toThrow(ValidationError)
      await expect(
        commentService.createComment(tenantId, userId, input)
      ).rejects.toThrow('Parent comment must be on the same entity')
    })
  })

  describe('getCommentById', () => {
    it('should return comment when found', async () => {
      const mockComment = {
        id: 'comment-123',
        tenantId,
        content: 'Test comment',
        createdAt: new Date(),
      }

      ;(metadataRepository.findCommentById as jest.Mock).mockResolvedValue(mockComment)

      const result = await commentService.getCommentById('comment-123', tenantId)

      expect(result).toEqual(mockComment)
    })

    it('should throw NotFoundError when comment not found', async () => {
      ;(metadataRepository.findCommentById as jest.Mock).mockResolvedValue(null)

      await expect(
        commentService.getCommentById('comment-123', tenantId)
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('listComments', () => {
    it('should return paginated comments list', async () => {
      const mockResult = {
        comments: [
          { id: 'comment-1', content: 'Comment 1' },
          { id: 'comment-2', content: 'Comment 2' },
        ],
        items: [
          { id: 'comment-1', content: 'Comment 1' },
          { id: 'comment-2', content: 'Comment 2' },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      }

      ;(metadataRepository.listComments as jest.Mock).mockResolvedValue(mockResult)

      const options = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      }

      const result = await commentService.listComments(tenantId, options)

      expect(result).toEqual(mockResult)
    })
  })

  describe('updateComment', () => {
    it('should successfully update own comment', async () => {
      const existingComment = {
        id: 'comment-123',
        tenantId,
        createdBy: userId,
        content: 'Old content',
      }

      const updateData = {
        content: 'New content',
      }

      const updatedComment = {
        ...existingComment,
        ...updateData,
        updatedAt: new Date(),
      }

      ;(metadataRepository.findCommentById as jest.Mock).mockResolvedValue(existingComment)
      ;(metadataRepository.updateComment as jest.Mock).mockResolvedValue(updatedComment)

      const result = await commentService.updateComment(
        'comment-123',
        tenantId,
        userId,
        updateData
      )

      expect(result).toEqual(updatedComment)
    })

    it('should throw ValidationError when trying to edit someone else\'s comment', async () => {
      const existingComment = {
        id: 'comment-123',
        tenantId,
        createdBy: 'other-user',
        content: 'Old content',
      }

      ;(metadataRepository.findCommentById as jest.Mock).mockResolvedValue(existingComment)

      await expect(
        commentService.updateComment('comment-123', tenantId, userId, {
          content: 'New content',
        })
      ).rejects.toThrow(ValidationError)
      await expect(
        commentService.updateComment('comment-123', tenantId, userId, {
          content: 'New content',
        })
      ).rejects.toThrow('You can only edit your own comments')
    })

    it('should throw ValidationError for content exceeding 10,000 characters', async () => {
      const existingComment = {
        id: 'comment-123',
        tenantId,
        createdBy: userId,
        content: 'Old content',
      }

      ;(metadataRepository.findCommentById as jest.Mock).mockResolvedValue(existingComment)

      await expect(
        commentService.updateComment('comment-123', tenantId, userId, {
          content: 'a'.repeat(10001),
        })
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('deleteComment', () => {
    it('should successfully delete own comment', async () => {
      const existingComment = {
        id: 'comment-123',
        tenantId,
        createdBy: userId,
        content: 'Comment to delete',
      }

      ;(metadataRepository.findCommentById as jest.Mock).mockResolvedValue(existingComment)
      ;(metadataRepository.deleteComment as jest.Mock).mockResolvedValue(undefined)

      await commentService.deleteComment('comment-123', tenantId, userId)

      expect(metadataRepository.deleteComment).toHaveBeenCalledWith(
        'comment-123',
        tenantId
      )
    })

    it('should throw ValidationError when trying to delete someone else\'s comment', async () => {
      const existingComment = {
        id: 'comment-123',
        tenantId,
        createdBy: 'other-user',
        content: 'Someone else\'s comment',
      }

      ;(metadataRepository.findCommentById as jest.Mock).mockResolvedValue(existingComment)

      await expect(
        commentService.deleteComment('comment-123', tenantId, userId)
      ).rejects.toThrow(ValidationError)
      await expect(
        commentService.deleteComment('comment-123', tenantId, userId)
      ).rejects.toThrow('You can only delete your own comments')
    })
  })

  describe('getEntityComments', () => {
    it('should get all comments including replies for entity', async () => {
      const mockResult = {
        comments: [
          { id: 'comment-1', entityType: 'deal', entityId: 'deal-123', parentId: null },
          { id: 'comment-2', entityType: 'deal', entityId: 'deal-123', parentId: 'comment-1' },
        ],
        items: [
          { id: 'comment-1', entityType: 'deal', entityId: 'deal-123', parentId: null },
          { id: 'comment-2', entityType: 'deal', entityId: 'deal-123', parentId: 'comment-1' },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      }

      ;(metadataRepository.listComments as jest.Mock).mockResolvedValue(mockResult)

      const result = await commentService.getEntityComments(
        tenantId,
        'deal',
        'deal-123',
        1,
        20,
        true
      )

      expect(result).toEqual(mockResult)
      expect(metadataRepository.listComments).toHaveBeenCalledWith(tenantId, {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters: {
          entityType: 'deal',
          entityId: 'deal-123',
          parentId: undefined,
        },
      })
    })

    it('should get only top-level comments when includeReplies is false', async () => {
      const mockResult = {
        comments: [{ id: 'comment-1', entityType: 'deal', entityId: 'deal-123', parentId: null }],
        items: [{ id: 'comment-1', entityType: 'deal', entityId: 'deal-123', parentId: null }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }

      ;(metadataRepository.listComments as jest.Mock).mockResolvedValue(mockResult)

      const result = await commentService.getEntityComments(
        tenantId,
        'deal',
        'deal-123',
        1,
        20,
        false
      )

      expect(result).toEqual(mockResult)
      expect(metadataRepository.listComments).toHaveBeenCalledWith(tenantId, {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters: {
          entityType: 'deal',
          entityId: 'deal-123',
          parentId: null,
        },
      })
    })
  })

  describe('getCommentStatistics', () => {
    it('should return comment statistics', async () => {
      ;(metadataRepository.listComments as jest.Mock)
        .mockResolvedValueOnce({ total: 10 }) // All comments
        .mockResolvedValueOnce({ total: 7 }) // Top-level comments

      const result = await commentService.getCommentStatistics(tenantId)

      expect(result).toEqual({
        total: 10,
        topLevel: 7,
        replies: 3,
      })
    })

    it('should return statistics for specific entity', async () => {
      ;(metadataRepository.listComments as jest.Mock)
        .mockResolvedValueOnce({ total: 5 })
        .mockResolvedValueOnce({ total: 3 })

      const result = await commentService.getCommentStatistics(
        tenantId,
        'deal',
        'deal-123'
      )

      expect(result).toEqual({
        total: 5,
        topLevel: 3,
        replies: 2,
      })
    })
  })
})
