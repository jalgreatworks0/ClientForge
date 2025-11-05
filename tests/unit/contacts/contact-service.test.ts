/**
 * Unit Tests: ContactService
 * Tests for contact business logic
 */

import { ContactService } from '../../../backend/core/contacts/contact-service'
import { contactRepository } from '../../../backend/core/contacts/contact-repository'
import { LeadStatus, LifecycleStage } from '../../../backend/core/contacts/contact-types'
import { ValidationError, NotFoundError } from '../../../backend/utils/errors/app-error'

// Mock the repository
jest.mock('../../../backend/core/contacts/contact-repository')
const mockedRepository = contactRepository as jest.Mocked<typeof contactRepository>

describe('ContactService', () => {
  let contactService: ContactService

  const mockContact = {
    id: 'contact-123',
    tenantId: 'tenant-123',
    ownerId: 'user-123',
    accountId: 'account-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    mobile: null,
    title: 'CEO',
    department: 'Executive',
    leadSource: 'website',
    leadStatus: LeadStatus.QUALIFIED,
    lifecycleStage: LifecycleStage.SQL,
    leadScore: 85,
    tags: ['hot-lead', 'enterprise'],
    addressStreet: '123 Main St',
    addressCity: 'San Francisco',
    addressState: 'CA',
    addressPostalCode: '94102',
    addressCountry: 'USA',
    socialLinkedin: 'https://linkedin.com/in/johndoe',
    socialTwitter: '@johndoe',
    socialFacebook: null,
    notes: 'Very interested in enterprise plan',
    isActive: true,
    lastContactedAt: new Date('2025-01-01'),
    createdAt: new Date('2024-12-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
  }

  beforeEach(() => {
    contactService = new ContactService()
    jest.clearAllMocks()
  })

  describe('createContact', () => {
    it('should create contact with valid data', async () => {
      const createData = {
        ownerId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
      }

      mockedRepository.findByEmail.mockResolvedValue([])
      mockedRepository.create.mockResolvedValue(mockContact)

      const result = await contactService.createContact(
        'tenant-123',
        'user-123',
        createData
      )

      expect(result).toEqual(mockContact)
      expect(mockedRepository.create).toHaveBeenCalledWith('tenant-123', createData)
    })

    it('should throw error if email already exists', async () => {
      const createData = {
        ownerId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
      }

      mockedRepository.findByEmail.mockResolvedValue([mockContact])

      await expect(
        contactService.createContact('tenant-123', 'user-123', createData)
      ).rejects.toThrow(ValidationError)

      expect(mockedRepository.create).not.toHaveBeenCalled()
    })

    it('should create contact without email if phone provided', async () => {
      const createData = {
        ownerId: 'user-123',
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+1234567890',
      }

      const contactWithoutEmail = { ...mockContact, email: null }
      mockedRepository.create.mockResolvedValue(contactWithoutEmail as any)

      const result = await contactService.createContact(
        'tenant-123',
        'user-123',
        createData
      )

      expect(result).toEqual(contactWithoutEmail)
      expect(mockedRepository.findByEmail).not.toHaveBeenCalled()
    })
  })

  describe('getContactById', () => {
    it('should return contact when found', async () => {
      mockedRepository.findById.mockResolvedValue(mockContact)

      const result = await contactService.getContactById(
        'contact-123',
        'tenant-123'
      )

      expect(result).toEqual(mockContact)
      expect(mockedRepository.findById).toHaveBeenCalledWith(
        'contact-123',
        'tenant-123'
      )
    })

    it('should throw NotFoundError when contact not found', async () => {
      mockedRepository.findById.mockResolvedValue(null)

      await expect(
        contactService.getContactById('contact-123', 'tenant-123')
      ).rejects.toThrow(NotFoundError)
    })

    it('should return contact with relations when requested', async () => {
      const contactWithRelations = {
        ...mockContact,
        owner: {
          id: 'user-123',
          firstName: 'Alice',
          lastName: 'Admin',
          email: 'alice@example.com',
        },
        account: {
          id: 'account-123',
          name: 'Acme Corp',
          industry: 'Technology',
        },
      }

      mockedRepository.findByIdWithRelations.mockResolvedValue(
        contactWithRelations
      )

      const result = await contactService.getContactById(
        'contact-123',
        'tenant-123',
        true
      )

      expect(result).toEqual(contactWithRelations)
      expect(mockedRepository.findByIdWithRelations).toHaveBeenCalledWith(
        'contact-123',
        'tenant-123'
      )
    })
  })

  describe('updateContact', () => {
    it('should update contact with valid data', async () => {
      const updateData = {
        title: 'CTO',
        leadScore: 90,
      }

      const updatedContact = { ...mockContact, ...updateData }

      mockedRepository.findById.mockResolvedValue(mockContact)
      mockedRepository.update.mockResolvedValue(updatedContact)

      const result = await contactService.updateContact(
        'contact-123',
        'tenant-123',
        'user-123',
        updateData
      )

      expect(result).toEqual(updatedContact)
      expect(mockedRepository.update).toHaveBeenCalledWith(
        'contact-123',
        'tenant-123',
        updateData
      )
    })

    it('should throw NotFoundError if contact does not exist', async () => {
      mockedRepository.findById.mockResolvedValue(null)

      await expect(
        contactService.updateContact('contact-123', 'tenant-123', 'user-123', {
          title: 'CTO',
        })
      ).rejects.toThrow(NotFoundError)

      expect(mockedRepository.update).not.toHaveBeenCalled()
    })

    it('should throw error if updating to duplicate email', async () => {
      const updateData = {
        email: 'existing@example.com',
      }

      const existingContact = { ...mockContact, id: 'different-id' }

      mockedRepository.findById.mockResolvedValue(mockContact)
      mockedRepository.findByEmail.mockResolvedValue([existingContact])

      await expect(
        contactService.updateContact(
          'contact-123',
          'tenant-123',
          'user-123',
          updateData
        )
      ).rejects.toThrow(ValidationError)

      expect(mockedRepository.update).not.toHaveBeenCalled()
    })

    it('should allow updating to same email', async () => {
      const updateData = {
        email: mockContact.email,
        title: 'VP',
      }

      mockedRepository.findById.mockResolvedValue(mockContact)
      mockedRepository.findByEmail.mockResolvedValue([mockContact])
      mockedRepository.update.mockResolvedValue({ ...mockContact, title: 'VP' })

      const result = await contactService.updateContact(
        'contact-123',
        'tenant-123',
        'user-123',
        updateData
      )

      expect(result.title).toBe('VP')
      expect(mockedRepository.update).toHaveBeenCalled()
    })
  })

  describe('deleteContact', () => {
    it('should delete existing contact', async () => {
      mockedRepository.findById.mockResolvedValue(mockContact)
      mockedRepository.delete.mockResolvedValue(true)

      await contactService.deleteContact('contact-123', 'tenant-123', 'user-123')

      expect(mockedRepository.delete).toHaveBeenCalledWith(
        'contact-123',
        'tenant-123'
      )
    })

    it('should throw NotFoundError if contact does not exist', async () => {
      mockedRepository.findById.mockResolvedValue(null)

      await expect(
        contactService.deleteContact('contact-123', 'tenant-123', 'user-123')
      ).rejects.toThrow(NotFoundError)

      expect(mockedRepository.delete).not.toHaveBeenCalled()
    })
  })

  describe('searchContacts', () => {
    it('should search contacts with query', async () => {
      const searchResults = [mockContact]
      mockedRepository.search.mockResolvedValue(searchResults)

      const result = await contactService.searchContacts(
        'tenant-123',
        'John Doe',
        20
      )

      expect(result).toEqual(searchResults)
      expect(mockedRepository.search).toHaveBeenCalledWith(
        'tenant-123',
        'John Doe',
        20
      )
    })

    it('should throw error for empty query', async () => {
      await expect(
        contactService.searchContacts('tenant-123', '', 20)
      ).rejects.toThrow(ValidationError)

      expect(mockedRepository.search).not.toHaveBeenCalled()
    })

    it('should trim query before searching', async () => {
      mockedRepository.search.mockResolvedValue([])

      await contactService.searchContacts('tenant-123', '  John Doe  ', 20)

      expect(mockedRepository.search).toHaveBeenCalledWith(
        'tenant-123',
        'John Doe',
        20
      )
    })
  })

  describe('calculateLeadScore', () => {
    it('should calculate score based on contact data', async () => {
      mockedRepository.findById.mockResolvedValue(mockContact)
      mockedRepository.update.mockResolvedValue({ ...mockContact, leadScore: 90 })

      const score = await contactService.calculateLeadScore(
        'contact-123',
        'tenant-123'
      )

      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(100)
      expect(mockedRepository.update).toHaveBeenCalled()
    })

    it('should give higher score for complete profiles', async () => {
      const completeContact = {
        ...mockContact,
        email: 'john@example.com',
        phone: '+1234567890',
        title: 'CEO',
        accountId: 'account-123',
        socialLinkedin: 'https://linkedin.com/in/john',
        lifecycleStage: LifecycleStage.CUSTOMER,
      }

      mockedRepository.findById.mockResolvedValue(completeContact)
      mockedRepository.update.mockResolvedValue({
        ...completeContact,
        leadScore: 95,
      })

      const score = await contactService.calculateLeadScore(
        'contact-123',
        'tenant-123'
      )

      expect(score).toBeGreaterThan(70)
    })

    it('should cap score at 100', async () => {
      mockedRepository.findById.mockResolvedValue(mockContact)
      mockedRepository.update.mockResolvedValue({
        ...mockContact,
        leadScore: 100,
      })

      const score = await contactService.calculateLeadScore(
        'contact-123',
        'tenant-123'
      )

      expect(score).toBeLessThanOrEqual(100)
    })
  })

  describe('bulkOperation', () => {
    it('should perform bulk delete', async () => {
      const contactIds = ['contact-1', 'contact-2', 'contact-3']
      mockedRepository.bulkDelete.mockResolvedValue(3)

      const result = await contactService.bulkOperation(
        'tenant-123',
        'user-123',
        {
          contactIds,
          operation: 'delete',
        }
      )

      expect(result).toEqual({ success: 3, failed: 0 })
      expect(mockedRepository.bulkDelete).toHaveBeenCalledWith(
        contactIds,
        'tenant-123'
      )
    })

    it('should perform bulk tag addition', async () => {
      const contactIds = ['contact-1', 'contact-2']
      mockedRepository.findById
        .mockResolvedValueOnce({ ...mockContact, tags: ['existing'] })
        .mockResolvedValueOnce({ ...mockContact, tags: [] })
      mockedRepository.update.mockResolvedValue(mockContact)

      const result = await contactService.bulkOperation(
        'tenant-123',
        'user-123',
        {
          contactIds,
          operation: 'add_tags',
          data: { tags: ['new-tag'] },
        }
      )

      expect(result.success).toBe(2)
      expect(mockedRepository.update).toHaveBeenCalledTimes(2)
    })

    it('should handle partial failures in bulk operations', async () => {
      const contactIds = ['contact-1', 'contact-2', 'contact-3']
      mockedRepository.findById
        .mockResolvedValueOnce(mockContact)
        .mockResolvedValueOnce(null) // This one fails
        .mockResolvedValueOnce(mockContact)
      mockedRepository.update.mockResolvedValue(mockContact)

      const result = await contactService.bulkOperation(
        'tenant-123',
        'user-123',
        {
          contactIds,
          operation: 'update',
          data: { leadStatus: LeadStatus.QUALIFIED },
        }
      )

      expect(result.success).toBe(2)
      expect(result.failed).toBe(1)
    })
  })

  describe('markAsContacted', () => {
    it('should update last contacted timestamp', async () => {
      mockedRepository.findById.mockResolvedValue(mockContact)
      mockedRepository.updateLastContacted.mockResolvedValue(undefined)

      await contactService.markAsContacted('contact-123', 'tenant-123')

      expect(mockedRepository.updateLastContacted).toHaveBeenCalledWith(
        'contact-123',
        'tenant-123'
      )
    })

    it('should throw error if contact not found', async () => {
      mockedRepository.findById.mockResolvedValue(null)

      await expect(
        contactService.markAsContacted('contact-123', 'tenant-123')
      ).rejects.toThrow(NotFoundError)

      expect(mockedRepository.updateLastContacted).not.toHaveBeenCalled()
    })
  })
})
