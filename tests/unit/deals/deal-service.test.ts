/**
 * Unit Tests: DealService
 * Tests for deal business logic
 */

import { DealService } from '../../../backend/core/deals/deal-service'
import { dealRepository } from '../../../backend/core/deals/deal-repository'
import { accountRepository } from '../../../backend/core/accounts/account-repository'
import { contactRepository } from '../../../backend/core/contacts/contact-repository'
import { ValidationError, NotFoundError } from '../../../backend/utils/errors/app-error'

// Mock the repositories
jest.mock('../../../backend/core/deals/deal-repository')
jest.mock('../../../backend/core/accounts/account-repository')
jest.mock('../../../backend/core/contacts/contact-repository')

const mockedDealRepo = dealRepository as jest.Mocked<typeof dealRepository>;
const mockedAccountRepo = accountRepository as jest.Mocked<typeof accountRepository>;
const mockedContactRepo = contactRepository as jest.Mocked<typeof contactRepository>;

describe('DealService', () => {
  let dealService: DealService

  const mockPipeline = {
    id: 'pipeline-123',
    tenantId: 'tenant-123',
    name: 'Sales Pipeline',
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  const mockStage = {
    id: 'stage-123',
    tenantId: 'tenant-123',
    pipelineId: 'pipeline-123',
    name: 'Qualification',
    displayOrder: 1,
    probability: 25,
    isClosedStage: false,
    isWonStage: false,
    color: '#3B82F6',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  }

  const mockDeal = {
    id: 'deal-123',
    tenantId: 'tenant-123',
    ownerId: 'user-123',
    accountId: 'account-123',
    contactId: 'contact-123',
    pipelineId: 'pipeline-123',
    stageId: 'stage-123',
    name: 'Enterprise Deal - Acme Corp',
    amount: 50000,
    currency: 'USD',
    probability: 25,
    expectedCloseDate: new Date('2025-12-31'),
    actualCloseDate: null,
    leadSource: 'website',
    nextStep: 'Schedule demo',
    description: 'Enterprise plan for 500 users',
    tags: ['enterprise', 'hot-lead'],
    isClosed: false,
    isWon: null,
    lostReason: null,
    competitors: ['Competitor A'],
    decisionMakers: ['John Doe', 'Jane Smith'],
    keyContacts: ['contact-123'],
    weightedAmount: 12500,
    daysInStage: 5,
    lastStageChangeAt: new Date(),
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-05'),
    deletedAt: null,
  }

  const mockAccount = {
    id: 'account-123',
    name: 'Acme Corp',
    tenantId: 'tenant-123',
  }

  const mockContact = {
    id: 'contact-123',
    firstName: 'John',
    lastName: 'Doe',
    tenantId: 'tenant-123',
  }

  beforeEach(() => {
    dealService = new DealService()
    jest.clearAllMocks()
  })

  describe('createDeal', () => {
    it('should create deal with valid data', async () => {
      const createData = {
        ownerId: 'user-123',
        pipelineId: 'pipeline-123',
        stageId: 'stage-123',
        name: 'Enterprise Deal - Acme Corp',
        amount: 50000,
        accountId: 'account-123',
        contactId: 'contact-123',
      }

      mockedDealRepo.findPipelineById.mockResolvedValue(mockPipeline)
      mockedDealRepo.findStageById.mockResolvedValue(mockStage)
      mockedAccountRepo.findById.mockResolvedValue(mockAccount as any)
      mockedContactRepo.findById.mockResolvedValue(mockContact as any)
      mockedDealRepo.create.mockResolvedValue(mockDeal)

      const result = await dealService.createDeal(
        'tenant-123',
        'user-123',
        createData
      )

      expect(result).toEqual(mockDeal)
      expect(mockedDealRepo.create).toHaveBeenCalledWith('tenant-123', {
        ...createData,
        probability: 25, // Service adds stage probability
      })
    })

    it('should throw error if pipeline does not exist', async () => {
      const createData = {
        ownerId: 'user-123',
        pipelineId: 'invalid-pipeline',
        stageId: 'stage-123',
        name: 'Test Deal',
      }

      mockedDealRepo.findPipelineById.mockResolvedValue(null)

      await expect(
        dealService.createDeal('tenant-123', 'user-123', createData)
      ).rejects.toThrow(ValidationError)

      expect(mockedDealRepo.create).not.toHaveBeenCalled()
    })

    it('should throw error if stage does not exist', async () => {
      const createData = {
        ownerId: 'user-123',
        pipelineId: 'pipeline-123',
        stageId: 'invalid-stage',
        name: 'Test Deal',
      }

      mockedDealRepo.findPipelineById.mockResolvedValue(mockPipeline)
      mockedDealRepo.findStageById.mockResolvedValue(null)

      await expect(
        dealService.createDeal('tenant-123', 'user-123', createData)
      ).rejects.toThrow(ValidationError)

      expect(mockedDealRepo.create).not.toHaveBeenCalled()
    })

    it('should throw error if stage does not belong to pipeline', async () => {
      const createData = {
        ownerId: 'user-123',
        pipelineId: 'pipeline-123',
        stageId: 'stage-456',
        name: 'Test Deal',
      }

      const wrongStage = { ...mockStage, pipelineId: 'different-pipeline' }

      mockedDealRepo.findPipelineById.mockResolvedValue(mockPipeline)
      mockedDealRepo.findStageById.mockResolvedValue(wrongStage)

      await expect(
        dealService.createDeal('tenant-123', 'user-123', createData)
      ).rejects.toThrow(ValidationError)

      expect(mockedDealRepo.create).not.toHaveBeenCalled()
    })

    it('should use stage probability if not provided', async () => {
      const createData = {
        ownerId: 'user-123',
        pipelineId: 'pipeline-123',
        stageId: 'stage-123',
        name: 'Test Deal',
      }

      mockedDealRepo.findPipelineById.mockResolvedValue(mockPipeline)
      mockedDealRepo.findStageById.mockResolvedValue(mockStage)
      mockedDealRepo.create.mockResolvedValue(mockDeal)

      await dealService.createDeal('tenant-123', 'user-123', createData)

      expect(mockedDealRepo.create).toHaveBeenCalledWith(
        'tenant-123',
        expect.objectContaining({ probability: 25 })
      )
    })
  })

  describe('getDealById', () => {
    it('should return deal when found', async () => {
      mockedDealRepo.findById.mockResolvedValue(mockDeal)

      const result = await dealService.getDealById('deal-123', 'tenant-123')

      expect(result).toEqual(mockDeal)
      expect(mockedDealRepo.findById).toHaveBeenCalledWith('deal-123', 'tenant-123')
    })

    it('should throw NotFoundError when deal not found', async () => {
      mockedDealRepo.findById.mockResolvedValue(null)

      await expect(
        dealService.getDealById('deal-123', 'tenant-123')
      ).rejects.toThrow(NotFoundError)
    })

    it('should return deal with relations when requested', async () => {
      const dealWithRelations = {
        ...mockDeal,
        owner: { id: 'user-123', firstName: 'Alice', lastName: 'Admin', email: 'alice@example.com' },
        account: { id: 'account-123', name: 'Acme Corp', industry: 'Technology' },
        contact: { id: 'contact-123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
      }

      mockedDealRepo.findByIdWithRelations.mockResolvedValue(dealWithRelations as any)

      const result = await dealService.getDealById('deal-123', 'tenant-123', true)

      expect(result).toEqual(dealWithRelations)
      expect(mockedDealRepo.findByIdWithRelations).toHaveBeenCalledWith('deal-123', 'tenant-123')
    })
  })

  describe('changeDealStage', () => {
    it('should change deal stage successfully', async () => {
      const newStage = { ...mockStage, id: 'stage-456', name: 'Proposal', probability: 50 }
      const updatedDeal = { ...mockDeal, stageId: 'stage-456', probability: 50 }

      mockedDealRepo.findById.mockResolvedValue(mockDeal)
      mockedDealRepo.findStageById.mockResolvedValue(newStage)
      mockedDealRepo.update.mockResolvedValue(updatedDeal)

      const result = await dealService.changeDealStage(
        'deal-123',
        'tenant-123',
        'user-123',
        { toStageId: 'stage-456', notes: 'Moving to proposal stage' }
      )

      expect(result.stageId).toBe('stage-456')
      expect(result.probability).toBe(50)
      expect(mockedDealRepo.update).toHaveBeenCalled()
    })

    it('should throw error if stage does not belong to same pipeline', async () => {
      const wrongStage = { ...mockStage, pipelineId: 'different-pipeline' }

      mockedDealRepo.findById.mockResolvedValue(mockDeal)
      mockedDealRepo.findStageById.mockResolvedValue(wrongStage)

      await expect(
        dealService.changeDealStage('deal-123', 'tenant-123', 'user-123', { toStageId: 'stage-456' })
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('closeDeal', () => {
    it('should close deal as won', async () => {
      const closedDeal = { ...mockDeal, isClosed: true, isWon: true, actualCloseDate: new Date() }

      mockedDealRepo.findById.mockResolvedValue(mockDeal)
      mockedDealRepo.update.mockResolvedValue(closedDeal)

      const result = await dealService.closeDeal(
        'deal-123',
        'tenant-123',
        'user-123',
        { isWon: true, actualCloseDate: new Date() }
      )

      expect(result.isClosed).toBe(true)
      expect(result.isWon).toBe(true)
    })

    it('should close deal as lost with reason', async () => {
      const closedDeal = { ...mockDeal, isClosed: true, isWon: false, lostReason: 'Price too high' }

      mockedDealRepo.findById.mockResolvedValue(mockDeal)
      mockedDealRepo.update.mockResolvedValue(closedDeal)

      const result = await dealService.closeDeal(
        'deal-123',
        'tenant-123',
        'user-123',
        { isWon: false, lostReason: 'Price too high', actualCloseDate: new Date() }
      )

      expect(result.isClosed).toBe(true)
      expect(result.isWon).toBe(false)
      expect(result.lostReason).toBe('Price too high')
    })

    it('should throw error if deal is already closed', async () => {
      const closedDeal = { ...mockDeal, isClosed: true }

      mockedDealRepo.findById.mockResolvedValue(closedDeal)

      await expect(
        dealService.closeDeal('deal-123', 'tenant-123', 'user-123', { isWon: true })
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('bulkOperation', () => {
    it('should perform bulk delete', async () => {
      const dealIds = ['deal-1', 'deal-2', 'deal-3']
      mockedDealRepo.bulkDelete.mockResolvedValue(3)

      const result = await dealService.bulkOperation('tenant-123', 'user-123', {
        dealIds,
        operation: 'delete',
      })

      expect(result).toEqual({ success: 3, failed: 0 })
      expect(mockedDealRepo.bulkDelete).toHaveBeenCalledWith(dealIds, 'tenant-123')
    })

    it('should perform bulk stage change', async () => {
      const dealIds = ['deal-1', 'deal-2']
      const newStage = { ...mockStage, id: 'stage-456' }

      mockedDealRepo.findById.mockResolvedValue(mockDeal)
      mockedDealRepo.findStageById.mockResolvedValue(newStage)
      mockedDealRepo.update.mockResolvedValue({ ...mockDeal, stageId: 'stage-456' })

      const result = await dealService.bulkOperation('tenant-123', 'user-123', {
        dealIds,
        operation: 'change_stage',
        data: { stageId: 'stage-456' },
      })

      expect(result.success).toBe(2)
    })

    it('should handle partial failures in bulk operations', async () => {
      const dealIds = ['deal-1', 'deal-2', 'deal-3']

      mockedDealRepo.findById
        .mockResolvedValueOnce(mockDeal)
        .mockResolvedValueOnce(null) // This one fails
        .mockResolvedValueOnce(mockDeal)
      mockedDealRepo.update.mockResolvedValue(mockDeal)

      const result = await dealService.bulkOperation('tenant-123', 'user-123', {
        dealIds,
        operation: 'update',
        data: { nextStep: 'Follow up' },
      })

      expect(result.success).toBe(2)
      expect(result.failed).toBe(1)
    })
  })

  describe('searchDeals', () => {
    it('should search deals with query', async () => {
      const searchResults = [mockDeal]
      mockedDealRepo.search.mockResolvedValue(searchResults)

      const result = await dealService.searchDeals('tenant-123', 'Enterprise', 20)

      expect(result).toEqual(searchResults)
      expect(mockedDealRepo.search).toHaveBeenCalledWith('tenant-123', 'Enterprise', 20)
    })

    it('should throw error for empty query', async () => {
      await expect(
        dealService.searchDeals('tenant-123', '', 20)
      ).rejects.toThrow(ValidationError)

      expect(mockedDealRepo.search).not.toHaveBeenCalled()
    })

    it('should trim query before searching', async () => {
      mockedDealRepo.search.mockResolvedValue([])

      await dealService.searchDeals('tenant-123', '  Enterprise Deal  ', 20)

      expect(mockedDealRepo.search).toHaveBeenCalledWith('tenant-123', 'Enterprise Deal', 20)
    })
  })

  describe('getStatistics', () => {
    it('should return deal statistics', async () => {
      const deals = [
        mockDeal,
        { ...mockDeal, id: 'deal-2', isClosed: true, isWon: true, amount: 30000 },
        { ...mockDeal, id: 'deal-3', isClosed: true, isWon: false, amount: 20000 },
      ]

      mockedDealRepo.list.mockResolvedValue({
        deals,
        total: 3,
        page: 1,
        limit: 10000,
        totalPages: 1,
      })

      const stats = await dealService.getStatistics('tenant-123')

      expect(stats.totalDeals).toBe(3)
      expect(stats.openDeals).toBe(1)
      expect(stats.closedDeals).toBe(2)
      expect(stats.wonDeals).toBe(1)
      expect(stats.lostDeals).toBe(1)
      expect(stats).toHaveProperty('totalValue')
      expect(stats).toHaveProperty('winRate')
    })
  })
})
