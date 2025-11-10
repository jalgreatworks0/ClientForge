/**
 * Tag Service Unit Tests
 * Tests for tag management and entity tagging
 */

import { TagService } from '../../../backend/core/metadata/metadata-service'
import { metadataRepository } from '../../../backend/core/metadata/metadata-repository'
import { ValidationError, NotFoundError } from '../../../backend/utils/errors'

jest.mock('../../../backend/core/metadata/metadata-repository')

describe('TagService', () => {
  let tagService: TagService
  const tenantId = 'tenant-123'

  beforeEach(() => {
    tagService = new TagService()
    jest.clearAllMocks()
  })

  describe('createTag', () => {
    it('should successfully create tag with valid data', async () => {
      const input = {
        name: 'VIP Customer',
        color: '#3B82F6',
        category: 'customer-type',
      }

      const mockTag = {
        id: 'tag-123',
        tenantId,
        ...input,
        slug: 'vip-customer',
        usageCount: 0,
        createdAt: new Date(),
      }

      ;(metadataRepository.findTagByName as jest.Mock).mockResolvedValue(null)
      ;(metadataRepository.createTag as jest.Mock).mockResolvedValue(mockTag)

      const result = await tagService.createTag(tenantId, input)

      expect(result).toEqual(mockTag)
      expect(metadataRepository.findTagByName).toHaveBeenCalledWith('VIP Customer', tenantId)
      expect(metadataRepository.createTag).toHaveBeenCalledWith(tenantId, input)
    })

    it('should throw ValidationError if tag with same name exists', async () => {
      const input = { name: 'Existing Tag' }
      const existingTag = { id: 'tag-123', name: 'Existing Tag' }

      ;(metadataRepository.findTagByName as jest.Mock).mockResolvedValue(existingTag)

      await expect(tagService.createTag(tenantId, input)).rejects.toThrow(ValidationError)
      await expect(tagService.createTag(tenantId, input)).rejects.toThrow(
        'Tag with name "Existing Tag" already exists'
      )
    })

    it('should throw ValidationError for invalid color format', async () => {
      const input = {
        name: 'Test Tag',
        color: 'invalid-color',
      }

      ;(metadataRepository.findTagByName as jest.Mock).mockResolvedValue(null)

      await expect(tagService.createTag(tenantId, input)).rejects.toThrow(ValidationError)
      await expect(tagService.createTag(tenantId, input)).rejects.toThrow(
        'Invalid color format. Use hex format like #3B82F6'
      )
    })

    it('should accept valid hex colors', async () => {
      const input = {
        name: 'Test Tag',
        color: '#FF5733',
      }

      const mockTag = {
        id: 'tag-123',
        tenantId,
        ...input,
        slug: 'test-tag',
        createdAt: new Date(),
      }

      ;(metadataRepository.findTagByName as jest.Mock).mockResolvedValue(null)
      ;(metadataRepository.createTag as jest.Mock).mockResolvedValue(mockTag)

      const result = await tagService.createTag(tenantId, input)

      expect(result).toEqual(mockTag)
    })
  })

  describe('getTagById', () => {
    it('should return tag when found', async () => {
      const mockTag = {
        id: 'tag-123',
        tenantId,
        name: 'Test Tag',
        slug: 'test-tag',
      }

      ;(metadataRepository.findTagById as jest.Mock).mockResolvedValue(mockTag)

      const result = await tagService.getTagById('tag-123', tenantId)

      expect(result).toEqual(mockTag)
    })

    it('should throw NotFoundError when tag not found', async () => {
      ;(metadataRepository.findTagById as jest.Mock).mockResolvedValue(null)

      await expect(tagService.getTagById('tag-123', tenantId)).rejects.toThrow(NotFoundError)
    })
  })

  describe('updateTag', () => {
    it('should successfully update tag with new name and regenerate slug', async () => {
      const existingTag = {
        id: 'tag-123',
        tenantId,
        name: 'Old Name',
        slug: 'old-name',
      }

      const updateData = {
        name: 'New Name',
        color: '#3B82F6',
      }

      const updatedTag = {
        ...existingTag,
        ...updateData,
        slug: 'new-name',
        updatedAt: new Date(),
      }

      ;(metadataRepository.findTagById as jest.Mock).mockResolvedValue(existingTag)
      ;(metadataRepository.findTagByName as jest.Mock).mockResolvedValue(null)
      ;(metadataRepository.updateTag as jest.Mock).mockResolvedValue(updatedTag)

      const result = await tagService.updateTag('tag-123', tenantId, updateData)

      expect(result).toEqual(updatedTag)
      expect(metadataRepository.updateTag).toHaveBeenCalledWith('tag-123', tenantId, {
        ...updateData,
        slug: 'new-name',
      })
    })

    it('should throw ValidationError if new name already exists', async () => {
      const existingTag = {
        id: 'tag-123',
        name: 'Old Name',
      }

      const duplicateTag = {
        id: 'tag-456',
        name: 'Duplicate Name',
      }

      ;(metadataRepository.findTagById as jest.Mock).mockResolvedValue(existingTag)
      ;(metadataRepository.findTagByName as jest.Mock).mockResolvedValue(duplicateTag)

      await expect(
        tagService.updateTag('tag-123', tenantId, { name: 'Duplicate Name' })
      ).rejects.toThrow('Tag with name "Duplicate Name" already exists')
    })
  })

  describe('assignTag', () => {
    it('should successfully assign tag to entity', async () => {
      const input = {
        tagId: 'tag-123',
        entityType: 'contact',
        entityId: 'contact-123',
      }

      const mockTag = { id: 'tag-123', name: 'Test Tag' }
      const mockEntityTag = {
        id: 'entity-tag-123',
        tenantId,
        ...input,
        createdAt: new Date(),
      }

      ;(metadataRepository.findTagById as jest.Mock).mockResolvedValue(mockTag)
      ;(metadataRepository.getEntityTags as jest.Mock).mockResolvedValue([])
      ;(metadataRepository.assignTag as jest.Mock).mockResolvedValue(mockEntityTag)

      const result = await tagService.assignTag(tenantId, input)

      expect(result).toEqual(mockEntityTag)
      expect(metadataRepository.assignTag).toHaveBeenCalledWith(tenantId, input)
    })

    it('should throw ValidationError if tag already assigned', async () => {
      const input = {
        tagId: 'tag-123',
        entityType: 'contact',
        entityId: 'contact-123',
      }

      const mockTag = { id: 'tag-123', name: 'Test Tag' }
      const existingTags = [{ id: 'tag-123', name: 'Test Tag' }]

      ;(metadataRepository.findTagById as jest.Mock).mockResolvedValue(mockTag)
      ;(metadataRepository.getEntityTags as jest.Mock).mockResolvedValue(existingTags)

      await expect(tagService.assignTag(tenantId, input)).rejects.toThrow(ValidationError)
      await expect(tagService.assignTag(tenantId, input)).rejects.toThrow(
        'Tag is already assigned to this entity'
      )
    })
  })

  describe('getTagStatistics', () => {
    it('should return tag statistics', async () => {
      const mockTags = {
        items: [
          { id: 'tag-1', name: 'VIP', usageCount: 100, category: 'customer' },
          { id: 'tag-2', name: 'Lead', usageCount: 50, category: 'prospect' },
          { id: 'tag-3', name: 'Hot', usageCount: 25, category: 'customer' },
        ],
        total: 3,
      }

      ;(metadataRepository.listTags as jest.Mock).mockResolvedValue(mockTags)

      const result = await tagService.getTagStatistics(tenantId)

      expect(result).toEqual({
        total: 3,
        mostUsed: mockTags.items,
        byCategory: {
          customer: 2,
          prospect: 1,
        },
      })
    })
  })
})
