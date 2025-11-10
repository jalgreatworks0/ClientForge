/**
 * Note Service Unit Tests
 * Comprehensive tests for notes functionality
 */

import { NoteService } from '../../../backend/core/metadata/metadata-service'
import { metadataRepository } from '../../../backend/core/metadata/metadata-repository'
import { ValidationError, NotFoundError } from '../../../backend/utils/errors'

// Mock the repository
jest.mock('../../../backend/core/metadata/metadata-repository')

describe('NoteService', () => {
  let noteService: NoteService
  const tenantId = 'tenant-123'
  const userId = 'user-123'

  beforeEach(() => {
    noteService = new NoteService()
    jest.clearAllMocks()
  })

  describe('createNote', () => {
    it('should successfully create note with valid data', async () => {
      const input = {
        entityType: 'contact',
        entityId: 'contact-123',
        content: 'Test note content',
        isPinned: false,
      }

      const mockNote = {
        id: 'note-123',
        tenantId,
        createdBy: userId,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(metadataRepository.createNote as jest.Mock).mockResolvedValue(mockNote)

      const result = await noteService.createNote(tenantId, userId, input)

      expect(result).toEqual(mockNote)
      expect(metadataRepository.createNote).toHaveBeenCalledWith(tenantId, userId, input)
    })

    it('should throw ValidationError if content exceeds 50,000 characters', async () => {
      const input = {
        entityType: 'contact',
        entityId: 'contact-123',
        content: 'a'.repeat(50001),
      }

      await expect(noteService.createNote(tenantId, userId, input)).rejects.toThrow(
        ValidationError
      )
      await expect(noteService.createNote(tenantId, userId, input)).rejects.toThrow(
        'Note content exceeds maximum length of 50,000 characters'
      )
      expect(metadataRepository.createNote).not.toHaveBeenCalled()
    })

    it('should allow content up to 50,000 characters', async () => {
      const input = {
        entityType: 'contact',
        entityId: 'contact-123',
        content: 'a'.repeat(50000), // Exactly 50k
      }

      const mockNote = {
        id: 'note-123',
        tenantId,
        createdBy: userId,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      ;(metadataRepository.createNote as jest.Mock).mockResolvedValue(mockNote)

      const result = await noteService.createNote(tenantId, userId, input)

      expect(result).toEqual(mockNote)
    })
  })

  describe('getNoteById', () => {
    it('should return note when found', async () => {
      const mockNote = {
        id: 'note-123',
        tenantId,
        createdBy: userId,
        entityType: 'contact',
        entityId: 'contact-123',
        content: 'Test note',
        createdAt: new Date(),
      }

      ;(metadataRepository.findNoteById as jest.Mock).mockResolvedValue(mockNote)

      const result = await noteService.getNoteById('note-123', tenantId)

      expect(result).toEqual(mockNote)
      expect(metadataRepository.findNoteById).toHaveBeenCalledWith('note-123', tenantId)
    })

    it('should throw NotFoundError when note not found', async () => {
      ;(metadataRepository.findNoteById as jest.Mock).mockResolvedValue(null)

      await expect(noteService.getNoteById('note-123', tenantId)).rejects.toThrow(
        NotFoundError
      )
      await expect(noteService.getNoteById('note-123', tenantId)).rejects.toThrow(
        'Note not found'
      )
    })
  })

  describe('listNotes', () => {
    it('should return paginated notes list', async () => {
      const mockResult = {
        notes: [
          { id: 'note-1', content: 'Note 1' },
          { id: 'note-2', content: 'Note 2' },
        ],
        items: [
          { id: 'note-1', content: 'Note 1' },
          { id: 'note-2', content: 'Note 2' },
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      }

      ;(metadataRepository.listNotes as jest.Mock).mockResolvedValue(mockResult)

      const options = {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      }

      const result = await noteService.listNotes(tenantId, options)

      expect(result).toEqual(mockResult)
      expect(metadataRepository.listNotes).toHaveBeenCalledWith(tenantId, options)
    })
  })

  describe('updateNote', () => {
    it('should successfully update note', async () => {
      const existingNote = {
        id: 'note-123',
        tenantId,
        content: 'Old content',
        createdAt: new Date(),
      }

      const updateData = {
        content: 'New content',
        isPinned: true,
      }

      const updatedNote = {
        ...existingNote,
        ...updateData,
        updatedAt: new Date(),
      }

      ;(metadataRepository.findNoteById as jest.Mock).mockResolvedValue(existingNote)
      ;(metadataRepository.updateNote as jest.Mock).mockResolvedValue(updatedNote)

      const result = await noteService.updateNote('note-123', tenantId, userId, updateData)

      expect(result).toEqual(updatedNote)
      expect(metadataRepository.updateNote).toHaveBeenCalledWith(
        'note-123',
        tenantId,
        userId,
        updateData
      )
    })

    it('should throw ValidationError if updated content exceeds 50,000 characters', async () => {
      const existingNote = {
        id: 'note-123',
        tenantId,
        content: 'Old content',
      }

      ;(metadataRepository.findNoteById as jest.Mock).mockResolvedValue(existingNote)

      const updateData = {
        content: 'a'.repeat(50001),
      }

      await expect(
        noteService.updateNote('note-123', tenantId, userId, updateData)
      ).rejects.toThrow(ValidationError)
      expect(metadataRepository.updateNote).not.toHaveBeenCalled()
    })

    it('should throw NotFoundError if note does not exist', async () => {
      ;(metadataRepository.findNoteById as jest.Mock).mockResolvedValue(null)

      await expect(
        noteService.updateNote('note-123', tenantId, userId, { content: 'New' })
      ).rejects.toThrow(NotFoundError)
      expect(metadataRepository.updateNote).not.toHaveBeenCalled()
    })
  })

  describe('deleteNote', () => {
    it('should successfully delete note', async () => {
      const existingNote = {
        id: 'note-123',
        tenantId,
        content: 'Note to delete',
      }

      ;(metadataRepository.findNoteById as jest.Mock).mockResolvedValue(existingNote)
      ;(metadataRepository.deleteNote as jest.Mock).mockResolvedValue(undefined)

      await noteService.deleteNote('note-123', tenantId)

      expect(metadataRepository.deleteNote).toHaveBeenCalledWith('note-123', tenantId)
    })

    it('should throw NotFoundError if note does not exist', async () => {
      ;(metadataRepository.findNoteById as jest.Mock).mockResolvedValue(null)

      await expect(noteService.deleteNote('note-123', tenantId)).rejects.toThrow(
        NotFoundError
      )
      expect(metadataRepository.deleteNote).not.toHaveBeenCalled()
    })
  })

  describe('bulkDeleteNotes', () => {
    it('should successfully delete multiple notes', async () => {
      const ids = ['note-1', 'note-2', 'note-3']
      ;(metadataRepository.bulkDeleteNotes as jest.Mock).mockResolvedValue(3)

      const result = await noteService.bulkDeleteNotes(ids, tenantId)

      expect(result).toBe(3)
      expect(metadataRepository.bulkDeleteNotes).toHaveBeenCalledWith(ids, tenantId)
    })

    it('should throw ValidationError if no IDs provided', async () => {
      await expect(noteService.bulkDeleteNotes([], tenantId)).rejects.toThrow(
        ValidationError
      )
      await expect(noteService.bulkDeleteNotes([], tenantId)).rejects.toThrow(
        'No note IDs provided'
      )
    })

    it('should throw ValidationError if more than 100 IDs provided', async () => {
      const ids = Array(101).fill('note-id')

      await expect(noteService.bulkDeleteNotes(ids, tenantId)).rejects.toThrow(
        ValidationError
      )
      await expect(noteService.bulkDeleteNotes(ids, tenantId)).rejects.toThrow(
        'Cannot delete more than 100 notes at once'
      )
    })
  })

  describe('bulkPinNotes', () => {
    it('should successfully pin multiple notes', async () => {
      const ids = ['note-1', 'note-2']
      ;(metadataRepository.bulkPinNotes as jest.Mock).mockResolvedValue(2)

      const result = await noteService.bulkPinNotes(ids, tenantId, true)

      expect(result).toBe(2)
      expect(metadataRepository.bulkPinNotes).toHaveBeenCalledWith(ids, tenantId, true)
    })

    it('should successfully unpin multiple notes', async () => {
      const ids = ['note-1', 'note-2']
      ;(metadataRepository.bulkPinNotes as jest.Mock).mockResolvedValue(2)

      const result = await noteService.bulkPinNotes(ids, tenantId, false)

      expect(result).toBe(2)
      expect(metadataRepository.bulkPinNotes).toHaveBeenCalledWith(ids, tenantId, false)
    })

    it('should throw ValidationError if no IDs provided', async () => {
      await expect(noteService.bulkPinNotes([], tenantId, true)).rejects.toThrow(
        ValidationError
      )
    })

    it('should throw ValidationError if more than 100 IDs provided', async () => {
      const ids = Array(101).fill('note-id')

      await expect(noteService.bulkPinNotes(ids, tenantId, true)).rejects.toThrow(
        ValidationError
      )
      await expect(noteService.bulkPinNotes(ids, tenantId, true)).rejects.toThrow(
        'Cannot update more than 100 notes at once'
      )
    })
  })

  describe('searchNotes', () => {
    it('should search notes with valid query', async () => {
      const mockNotes = [
        { id: 'note-1', content: 'Test search' },
        { id: 'note-2', content: 'Another test' },
      ]

      ;(metadataRepository.searchNotes as jest.Mock).mockResolvedValue(mockNotes)

      const result = await noteService.searchNotes(tenantId, 'test', 20)

      expect(result).toEqual(mockNotes)
      expect(metadataRepository.searchNotes).toHaveBeenCalledWith(tenantId, 'test', 20)
    })

    it('should throw ValidationError for empty query', async () => {
      await expect(noteService.searchNotes(tenantId, '', 20)).rejects.toThrow(
        ValidationError
      )
      await expect(noteService.searchNotes(tenantId, '', 20)).rejects.toThrow(
        'Search query is required'
      )
    })

    it('should throw ValidationError for whitespace-only query', async () => {
      await expect(noteService.searchNotes(tenantId, '   ', 20)).rejects.toThrow(
        ValidationError
      )
    })

    it('should throw ValidationError for query longer than 255 characters', async () => {
      const longQuery = 'a'.repeat(256)

      await expect(noteService.searchNotes(tenantId, longQuery, 20)).rejects.toThrow(
        ValidationError
      )
      await expect(noteService.searchNotes(tenantId, longQuery, 20)).rejects.toThrow(
        'Search query too long'
      )
    })
  })

  describe('getEntityNotes', () => {
    it('should get notes for specific entity', async () => {
      const mockResult = {
        notes: [{ id: 'note-1', entityType: 'contact', entityId: 'contact-123' }],
        items: [{ id: 'note-1', entityType: 'contact', entityId: 'contact-123' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      }

      ;(metadataRepository.listNotes as jest.Mock).mockResolvedValue(mockResult)

      const result = await noteService.getEntityNotes(
        tenantId,
        'contact',
        'contact-123',
        1,
        20
      )

      expect(result).toEqual(mockResult)
      expect(metadataRepository.listNotes).toHaveBeenCalledWith(tenantId, {
        page: 1,
        limit: 20,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters: {
          entityType: 'contact',
          entityId: 'contact-123',
        },
      })
    })
  })

  describe('getNoteStatistics', () => {
    it('should return note statistics', async () => {
      ;(metadataRepository.listNotes as jest.Mock)
        .mockResolvedValueOnce({ total: 10 }) // All notes
        .mockResolvedValueOnce({ total: 3 }) // Pinned notes

      const result = await noteService.getNoteStatistics(tenantId)

      expect(result).toEqual({
        total: 10,
        pinned: 3,
      })
    })

    it('should return statistics for specific entity', async () => {
      ;(metadataRepository.listNotes as jest.Mock)
        .mockResolvedValueOnce({ total: 5 })
        .mockResolvedValueOnce({ total: 2 })

      const result = await noteService.getNoteStatistics(
        tenantId,
        'contact',
        'contact-123'
      )

      expect(result).toEqual({
        total: 5,
        pinned: 2,
      })
    })
  })
})
