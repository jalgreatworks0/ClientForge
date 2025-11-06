/**
 * Unit Tests: AccountService
 * Tests for account business logic
 */

import { AccountService } from '../../../backend/core/accounts/account-service'
import { accountRepository } from '../../../backend/core/accounts/account-repository'
import { CompanySize, AccountType, AccountStatus } from '../../../backend/core/accounts/account-types'
import { ValidationError, NotFoundError, ConflictError } from '../../../backend/utils/errors/app-error'

// Mock the repository
jest.mock('../../../backend/core/accounts/account-repository')
const mockedRepository = accountRepository as jest.Mocked<typeof accountRepository>;

describe('AccountService', () => {
  let accountService: AccountService

  const mockAccount = {
    id: 'account-123',
    tenantId: 'tenant-123',
    ownerId: 'user-123',
    name: 'Acme Corporation',
    website: 'https://acme.com',
    industry: 'Technology',
    companySize: CompanySize.LARGE,
    annualRevenue: 5000000,
    phone: '+1234567890',
    email: 'contact@acme.com',
    description: 'Leading technology company',
    accountType: AccountType.CUSTOMER,
    accountStatus: AccountStatus.ACTIVE,
    parentAccountId: null,
    tags: ['enterprise', 'tech'],
    billingAddressStreet: '123 Main St',
    billingAddressCity: 'San Francisco',
    billingAddressState: 'CA',
    billingAddressPostalCode: '94102',
    billingAddressCountry: 'USA',
    shippingAddressStreet: '123 Main St',
    shippingAddressCity: 'San Francisco',
    shippingAddressState: 'CA',
    shippingAddressPostalCode: '94102',
    shippingAddressCountry: 'USA',
    socialLinkedin: 'https://linkedin.com/company/acme',
    socialTwitter: '@acmecorp',
    socialFacebook: null,
    employeeCount: 500,
    foundedYear: 2010,
    stockSymbol: 'ACME',
    isActive: true,
    lastActivityAt: new Date('2025-01-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2025-01-01'),
    deletedAt: null,
  }

  beforeEach(() => {
    accountService = new AccountService()
    jest.clearAllMocks()
  })

  describe('createAccount', () => {
    it('should create account with valid data', async () => {
      const createData = {
        ownerId: 'user-123',
        name: 'Acme Corporation',
        website: 'https://acme.com',
        industry: 'Technology',
        companySize: CompanySize.LARGE,
        annualRevenue: 5000000,
      }

      mockedRepository.findByName.mockResolvedValue([])
      mockedRepository.create.mockResolvedValue(mockAccount)

      const result = await accountService.createAccount(
        'tenant-123',
        'user-123',
        createData
      )

      expect(result).toEqual(mockAccount)
      expect(mockedRepository.create).toHaveBeenCalledWith('tenant-123', createData)
    })

    it('should throw error if account name already exists', async () => {
      const createData = {
        ownerId: 'user-123',
        name: 'Acme Corporation',
      }

      mockedRepository.findByName.mockResolvedValue([mockAccount])

      await expect(
        accountService.createAccount('tenant-123', 'user-123', createData)
      ).rejects.toThrow(ConflictError)

      expect(mockedRepository.create).not.toHaveBeenCalled()
    })

    it('should validate parent account exists', async () => {
      const createData = {
        ownerId: 'user-123',
        name: 'Acme Subsidiary',
        parentAccountId: 'parent-123',
      }

      mockedRepository.findByName.mockResolvedValue([])
      mockedRepository.findById.mockResolvedValue(null)

      await expect(
        accountService.createAccount('tenant-123', 'user-123', createData)
      ).rejects.toThrow(ValidationError)

      expect(mockedRepository.create).not.toHaveBeenCalled()
    })

    it('should prevent self-parent reference', async () => {
      const createData = {
        ownerId: 'user-123',
        name: 'Acme Corporation',
        parentAccountId: 'user-123',
      }

      mockedRepository.findByName.mockResolvedValue([])
      mockedRepository.findById.mockResolvedValue(mockAccount)

      await expect(
        accountService.createAccount('tenant-123', 'user-123', createData)
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('getAccountById', () => {
    it('should return account when found', async () => {
      mockedRepository.findById.mockResolvedValue(mockAccount)

      const result = await accountService.getAccountById(
        'account-123',
        'tenant-123'
      )

      expect(result).toEqual(mockAccount)
      expect(mockedRepository.findById).toHaveBeenCalledWith(
        'account-123',
        'tenant-123'
      )
    })

    it('should throw NotFoundError when account not found', async () => {
      mockedRepository.findById.mockResolvedValue(null)

      await expect(
        accountService.getAccountById('account-123', 'tenant-123')
      ).rejects.toThrow(NotFoundError)
    })

    it('should return account with relations when requested', async () => {
      const accountWithRelations = {
        ...mockAccount,
        owner: {
          id: 'user-123',
          firstName: 'Alice',
          lastName: 'Admin',
          email: 'alice@example.com',
        },
        contactCount: 15,
        dealCount: 5,
        totalDealValue: 250000,
      }

      mockedRepository.findByIdWithRelations.mockResolvedValue(
        accountWithRelations
      )

      const result = await accountService.getAccountById(
        'account-123',
        'tenant-123',
        true
      )

      expect(result).toEqual(accountWithRelations)
      expect(mockedRepository.findByIdWithRelations).toHaveBeenCalledWith(
        'account-123',
        'tenant-123'
      )
    })
  })

  describe('updateAccount', () => {
    it('should update account with valid data', async () => {
      const updateData = {
        industry: 'Software',
        annualRevenue: 6000000,
      }

      const updatedAccount = { ...mockAccount, ...updateData }

      mockedRepository.findById.mockResolvedValue(mockAccount)
      mockedRepository.update.mockResolvedValue(updatedAccount)

      const result = await accountService.updateAccount(
        'account-123',
        'tenant-123',
        'user-123',
        updateData
      )

      expect(result).toEqual(updatedAccount)
      expect(mockedRepository.update).toHaveBeenCalledWith(
        'account-123',
        'tenant-123',
        updateData
      )
    })

    it('should throw NotFoundError if account does not exist', async () => {
      mockedRepository.findById.mockResolvedValue(null)

      await expect(
        accountService.updateAccount('account-123', 'tenant-123', 'user-123', {
          industry: 'Software',
        })
      ).rejects.toThrow(NotFoundError)

      expect(mockedRepository.update).not.toHaveBeenCalled()
    })

    it('should throw error if updating to duplicate name', async () => {
      const updateData = {
        name: 'Existing Company',
      }

      const existingAccount = { ...mockAccount, id: 'different-id', name: 'Existing Company' }

      mockedRepository.findById.mockResolvedValue(mockAccount)
      mockedRepository.findByName.mockResolvedValue([existingAccount])

      await expect(
        accountService.updateAccount(
          'account-123',
          'tenant-123',
          'user-123',
          updateData
        )
      ).rejects.toThrow(ConflictError)

      expect(mockedRepository.update).not.toHaveBeenCalled()
    })

    it('should allow updating to same name (case changes)', async () => {
      const updateData = {
        name: 'ACME CORPORATION',
        industry: 'Software',
      }

      mockedRepository.findById.mockResolvedValue(mockAccount)
      mockedRepository.findByName.mockResolvedValue([mockAccount])
      mockedRepository.update.mockResolvedValue({ ...mockAccount, ...updateData })

      const result = await accountService.updateAccount(
        'account-123',
        'tenant-123',
        'user-123',
        updateData
      )

      expect(result.name).toBe('ACME CORPORATION')
      expect(mockedRepository.update).toHaveBeenCalled()
    })

    it('should prevent circular parent references', async () => {
      const updateData = {
        parentAccountId: 'child-account-123',
      }

      mockedRepository.findById
        .mockResolvedValueOnce(mockAccount) // Initial account
        .mockResolvedValueOnce({ ...mockAccount, id: 'child-account-123' }) // Parent account

      mockedRepository.getHierarchy.mockResolvedValue([
        mockAccount,
        { ...mockAccount, id: 'child-account-123', parentAccountId: 'account-123' },
      ])

      await expect(
        accountService.updateAccount(
          'account-123',
          'tenant-123',
          'user-123',
          updateData
        )
      ).rejects.toThrow(ValidationError)
    })

    it('should prevent self-parent reference', async () => {
      const updateData = {
        parentAccountId: 'account-123',
      }

      mockedRepository.findById.mockResolvedValue(mockAccount)

      await expect(
        accountService.updateAccount(
          'account-123',
          'tenant-123',
          'user-123',
          updateData
        )
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('deleteAccount', () => {
    it('should delete existing account', async () => {
      mockedRepository.findById.mockResolvedValue(mockAccount)
      mockedRepository.getHierarchy.mockResolvedValue([mockAccount])
      mockedRepository.delete.mockResolvedValue(true)

      await accountService.deleteAccount('account-123', 'tenant-123', 'user-123')

      expect(mockedRepository.delete).toHaveBeenCalledWith(
        'account-123',
        'tenant-123'
      )
    })

    it('should throw NotFoundError if account does not exist', async () => {
      mockedRepository.findById.mockResolvedValue(null)

      await expect(
        accountService.deleteAccount('account-123', 'tenant-123', 'user-123')
      ).rejects.toThrow(NotFoundError)

      expect(mockedRepository.delete).not.toHaveBeenCalled()
    })

    it('should prevent deleting account with children', async () => {
      mockedRepository.findById.mockResolvedValue(mockAccount)
      mockedRepository.getHierarchy.mockResolvedValue([
        mockAccount,
        { ...mockAccount, id: 'child-123', parentAccountId: 'account-123' },
      ])

      await expect(
        accountService.deleteAccount('account-123', 'tenant-123', 'user-123')
      ).rejects.toThrow(ValidationError)

      expect(mockedRepository.delete).not.toHaveBeenCalled()
    })
  })

  describe('searchAccounts', () => {
    it('should search accounts with query', async () => {
      const searchResults = [mockAccount]
      mockedRepository.search.mockResolvedValue(searchResults)

      const result = await accountService.searchAccounts(
        'tenant-123',
        'Acme Corporation',
        20
      )

      expect(result).toEqual(searchResults)
      expect(mockedRepository.search).toHaveBeenCalledWith(
        'tenant-123',
        'Acme Corporation',
        20
      )
    })

    it('should throw error for empty query', async () => {
      await expect(
        accountService.searchAccounts('tenant-123', '', 20)
      ).rejects.toThrow(ValidationError)

      expect(mockedRepository.search).not.toHaveBeenCalled()
    })

    it('should throw error for query less than 2 characters', async () => {
      await expect(
        accountService.searchAccounts('tenant-123', 'A', 20)
      ).rejects.toThrow(ValidationError)

      expect(mockedRepository.search).not.toHaveBeenCalled()
    })

    it('should trim query before searching', async () => {
      mockedRepository.search.mockResolvedValue([])

      await accountService.searchAccounts('tenant-123', '  Acme Corporation  ', 20)

      expect(mockedRepository.search).toHaveBeenCalledWith(
        'tenant-123',
        'Acme Corporation',
        20
      )
    })
  })

  describe('bulkOperation', () => {
    it('should perform bulk delete', async () => {
      const accountIds = ['account-1', 'account-2', 'account-3']
      mockedRepository.bulkDelete.mockResolvedValue(3)

      const result = await accountService.bulkOperation(
        'tenant-123',
        'user-123',
        {
          accountIds,
          operation: 'delete',
        }
      )

      expect(result).toEqual({ success: 3, failed: 0 })
      expect(mockedRepository.bulkDelete).toHaveBeenCalledWith(
        accountIds,
        'tenant-123'
      )
    })

    it('should perform bulk tag addition', async () => {
      const accountIds = ['account-1', 'account-2']
      mockedRepository.findById
        .mockResolvedValueOnce({ ...mockAccount, tags: ['existing'] })
        .mockResolvedValueOnce({ ...mockAccount, tags: [] })
      mockedRepository.update.mockResolvedValue(mockAccount)

      const result = await accountService.bulkOperation(
        'tenant-123',
        'user-123',
        {
          accountIds,
          operation: 'add_tags',
          data: { tags: ['new-tag'] },
        }
      )

      expect(result.success).toBe(2)
      expect(mockedRepository.update).toHaveBeenCalledTimes(2)
    })

    it('should handle partial failures in bulk operations', async () => {
      const accountIds = ['account-1', 'account-2', 'account-3']
      mockedRepository.findById
        .mockResolvedValueOnce(mockAccount)
        .mockResolvedValueOnce(null) // This one fails
        .mockResolvedValueOnce(mockAccount)
      mockedRepository.update.mockResolvedValue(mockAccount)

      const result = await accountService.bulkOperation(
        'tenant-123',
        'user-123',
        {
          accountIds,
          operation: 'update',
          data: { accountStatus: AccountStatus.INACTIVE },
        }
      )

      expect(result.success).toBe(2)
      expect(result.failed).toBe(1)
    })

    it('should perform bulk status change', async () => {
      const accountIds = ['account-1', 'account-2']
      mockedRepository.findById.mockResolvedValue(mockAccount)
      mockedRepository.update.mockResolvedValue({
        ...mockAccount,
        accountStatus: AccountStatus.INACTIVE,
      })

      const result = await accountService.bulkOperation(
        'tenant-123',
        'user-123',
        {
          accountIds,
          operation: 'change_status',
          data: { accountStatus: AccountStatus.INACTIVE },
        }
      )

      expect(result.success).toBe(2)
      expect(mockedRepository.update).toHaveBeenCalledTimes(2)
    })
  })

  describe('markActivity', () => {
    it('should update last activity timestamp', async () => {
      mockedRepository.findById.mockResolvedValue(mockAccount)
      mockedRepository.updateLastActivity.mockResolvedValue(undefined)

      await accountService.markActivity('account-123', 'tenant-123')

      expect(mockedRepository.updateLastActivity).toHaveBeenCalledWith(
        'account-123',
        'tenant-123'
      )
    })

    it('should throw error if account not found', async () => {
      mockedRepository.findById.mockResolvedValue(null)

      await expect(
        accountService.markActivity('account-123', 'tenant-123')
      ).rejects.toThrow(NotFoundError)

      expect(mockedRepository.updateLastActivity).not.toHaveBeenCalled()
    })
  })

  describe('getAccountHierarchy', () => {
    it('should return account hierarchy', async () => {
      const parent = { ...mockAccount, id: 'parent-123' }
      const child = { ...mockAccount, id: 'child-123', parentAccountId: 'parent-123' }

      mockedRepository.getHierarchy.mockResolvedValue([parent, child])

      const result = await accountService.getAccountHierarchy('parent-123', 'tenant-123')

      expect(result).toBeDefined()
      expect(result.account).toEqual(parent)
      expect(result.children).toHaveLength(1)
    })

    it('should throw error if account not found', async () => {
      mockedRepository.getHierarchy.mockResolvedValue([])

      await expect(
        accountService.getAccountHierarchy('account-123', 'tenant-123')
      ).rejects.toThrow(NotFoundError)
    })
  })

  describe('getStatistics', () => {
    it('should return account statistics', async () => {
      const accounts = [
        mockAccount,
        { ...mockAccount, id: 'account-2', accountType: AccountType.PROSPECT },
        { ...mockAccount, id: 'account-3', isActive: false },
      ]

      mockedRepository.list.mockResolvedValue({
        accounts,
        total: 3,
        page: 1,
        limit: 10000,
        totalPages: 1,
      })

      const stats = await accountService.getStatistics('tenant-123')

      expect(stats.totalAccounts).toBe(3)
      expect(stats.activeAccounts).toBe(2)
      expect(stats).toHaveProperty('byAccountType')
      expect(stats).toHaveProperty('byAccountStatus')
    })
  })
})
