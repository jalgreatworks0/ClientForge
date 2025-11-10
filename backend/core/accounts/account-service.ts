/**
 * Account Service
 * Business logic for accounts/companies management
 */

import { ValidationError, NotFoundError, ConflictError } from '../../utils/errors/app-error'
import { logger } from '../../utils/logging/logger'
import { elasticsearchSyncService } from '../../services/search/elasticsearch-sync.service'

import {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
  AccountListOptions,
  AccountListResponse,
  BulkAccountOperation,
  AccountWithRelations,
  AccountHierarchy,
} from './account-types'
import { accountRepository } from './account-repository'

export class AccountService {
  /**
   * Create a new account
   */
  async createAccount(
    tenantId: string,
    userId: string,
    data: CreateAccountInput
  ): Promise<Account> {
    // Default ownerId to authenticated user if not provided
    const accountData = {
      ...data,
      ownerId: data.ownerId || userId,
    }

    // Check for duplicate account name (case-insensitive)
    const existingAccounts = await accountRepository.findByName(accountData.name, tenantId)
    if (existingAccounts.length > 0) {
      throw new ConflictError('An account with this name already exists')
    }

    // Validate parent account if specified
    if (accountData.parentAccountId) {
      const parentAccount = await accountRepository.findById(accountData.parentAccountId, tenantId)
      if (!parentAccount) {
        throw new ValidationError('Parent account does not exist')
      }

      // Prevent circular references
      if (accountData.parentAccountId === accountData.ownerId) {
        throw new ValidationError('Account cannot be its own parent')
      }
    }

    const account = await accountRepository.create(tenantId, accountData)

    // Sync to Elasticsearch for search
    try {
      await elasticsearchSyncService.syncAccount(
        {
          id: account.id,
          tenant_id: tenantId,
          name: account.name,
          website: account.website,
          industry: account.industry,
          description: account.description,
          created_at: account.createdAt,
          updated_at: account.updatedAt,
        },
        'create'
      )
    } catch (error) {
      logger.warn('[Elasticsearch] Failed to sync new account', {
        accountId: account.id,
        error,
      })
      // Don't fail the request if search sync fails
    }

    logger.info('Account created', {
      accountId: account.id,
      accountName: account.name,
      tenantId,
      userId,
    })

    return account
  }

  /**
   * Get account by ID
   */
  async getAccountById(
    id: string,
    tenantId: string,
    includeRelations: boolean = false
  ): Promise<Account | AccountWithRelations> {
    let account: Account | AccountWithRelations | null

    if (includeRelations) {
      account = await accountRepository.findByIdWithRelations(id, tenantId)
    } else {
      account = await accountRepository.findById(id, tenantId)
    }

    if (!account) {
      throw new NotFoundError('Account not found')
    }

    return account
  }

  /**
   * List accounts with pagination and filters
   */
  async listAccounts(
    tenantId: string,
    options: AccountListOptions
  ): Promise<AccountListResponse> {
    return await accountRepository.list(tenantId, options)
  }

  /**
   * Update account
   */
  async updateAccount(
    id: string,
    tenantId: string,
    userId: string,
    data: UpdateAccountInput
  ): Promise<Account> {
    // Verify account exists
    const existingAccount = await accountRepository.findById(id, tenantId)
    if (!existingAccount) {
      throw new NotFoundError('Account not found')
    }

    // Check for duplicate name if name is being changed
    if (data.name && data.name.toLowerCase() !== existingAccount.name.toLowerCase()) {
      const duplicates = await accountRepository.findByName(data.name, tenantId)
      if (duplicates.length > 0 && duplicates[0].id !== id) {
        throw new ConflictError('An account with this name already exists')
      }
    }

    // Validate parent account if being updated
    if (data.parentAccountId) {
      // Prevent self-reference
      if (data.parentAccountId === id) {
        throw new ValidationError('Account cannot be its own parent')
      }

      const parentAccount = await accountRepository.findById(data.parentAccountId, tenantId)
      if (!parentAccount) {
        throw new ValidationError('Parent account does not exist')
      }

      // Prevent circular references
      const hierarchy = await accountRepository.getHierarchy(id, tenantId)
      const descendantIds = hierarchy.map((a) => a.id)
      if (descendantIds.includes(data.parentAccountId)) {
        throw new ValidationError('Cannot set a descendant account as parent (circular reference)')
      }
    }

    const updatedAccount = await accountRepository.update(id, tenantId, data)

    // Sync to Elasticsearch for search
    try {
      await elasticsearchSyncService.syncAccount(
        {
          id: updatedAccount.id,
          tenant_id: tenantId,
          name: updatedAccount.name,
          website: updatedAccount.website,
          industry: updatedAccount.industry,
          description: updatedAccount.description,
          created_at: updatedAccount.createdAt,
          updated_at: updatedAccount.updatedAt,
        },
        'update'
      )
    } catch (error) {
      logger.warn('[Elasticsearch] Failed to sync updated account', {
        accountId: id,
        error,
      })
      // Don't fail the request if search sync fails
    }

    logger.info('Account updated', {
      accountId: id,
      accountName: updatedAccount.name,
      tenantId,
      userId,
      changes: Object.keys(data),
    })

    return updatedAccount
  }

  /**
   * Delete account (soft delete)
   */
  async deleteAccount(id: string, tenantId: string, userId: string): Promise<void> {
    // Verify account exists
    const account = await accountRepository.findById(id, tenantId)
    if (!account) {
      throw new NotFoundError('Account not found')
    }

    // Check if account has child accounts
    const hierarchy = await accountRepository.getHierarchy(id, tenantId)
    if (hierarchy.length > 1) {
      throw new ValidationError(
        'Cannot delete account with child accounts. Delete or reassign child accounts first.'
      )
    }

    await accountRepository.delete(id, tenantId)

    // Remove from Elasticsearch search index
    try {
      await elasticsearchSyncService.syncAccount(
        {
          id,
          tenant_id: tenantId,
        },
        'delete'
      )
    } catch (error) {
      logger.warn('[Elasticsearch] Failed to delete account from search index', {
        accountId: id,
        error,
      })
      // Don't fail the request if search sync fails
    }

    logger.info('Account deleted', {
      accountId: id,
      accountName: account.name,
      tenantId,
      userId,
    })
  }

  /**
   * Search accounts with full-text search
   */
  async searchAccounts(
    tenantId: string,
    query: string,
    limit: number = 20
  ): Promise<Account[]> {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      throw new ValidationError('Search query cannot be empty')
    }

    if (trimmedQuery.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters')
    }

    return await accountRepository.search(tenantId, trimmedQuery, limit)
  }

  /**
   * Bulk operations on accounts
   */
  async bulkOperation(
    tenantId: string,
    userId: string,
    operation: BulkAccountOperation
  ): Promise<{ success: number; failed: number }> {
    const { accountIds, operation: operationType, data } = operation

    let successCount = 0
    let failedCount = 0

    switch (operationType) {
      case 'delete':
        const deleted = await accountRepository.bulkDelete(accountIds, tenantId)
        successCount = deleted
        failedCount = accountIds.length - deleted
        break

      case 'update':
        for (const accountId of accountIds) {
          try {
            await this.updateAccount(accountId, tenantId, userId, data)
            successCount++
          } catch (error) {
            failedCount++
            logger.error('Bulk update failed for account', {
              accountId,
              error,
              tenantId,
              userId,
            })
          }
        }
        break

      case 'assign':
        if (!data.ownerId) {
          throw new ValidationError('Owner ID is required for assign operation')
        }

        for (const accountId of accountIds) {
          try {
            await this.updateAccount(accountId, tenantId, userId, { ownerId: data.ownerId })
            successCount++
          } catch (error) {
            failedCount++
            logger.error('Bulk assign failed for account', {
              accountId,
              error,
              tenantId,
              userId,
            })
          }
        }
        break

      case 'add_tags':
        if (!data.tags || !Array.isArray(data.tags)) {
          throw new ValidationError('Tags array is required for add_tags operation')
        }

        for (const accountId of accountIds) {
          try {
            const account = await accountRepository.findById(accountId, tenantId)
            if (account) {
              const currentTags = account.tags || []
              const newTags = Array.from(new Set([...currentTags, ...data.tags]))
              await this.updateAccount(accountId, tenantId, userId, { tags: newTags })
              successCount++
            } else {
              failedCount++
            }
          } catch (error) {
            failedCount++
            logger.error('Bulk add_tags failed for account', {
              accountId,
              error,
              tenantId,
              userId,
            })
          }
        }
        break

      case 'remove_tags':
        if (!data.tags || !Array.isArray(data.tags)) {
          throw new ValidationError('Tags array is required for remove_tags operation')
        }

        for (const accountId of accountIds) {
          try {
            const account = await accountRepository.findById(accountId, tenantId)
            if (account) {
              const currentTags = account.tags || []
              const newTags = currentTags.filter((tag) => !data.tags.includes(tag))
              await this.updateAccount(accountId, tenantId, userId, { tags: newTags })
              successCount++
            } else {
              failedCount++
            }
          } catch (error) {
            failedCount++
            logger.error('Bulk remove_tags failed for account', {
              accountId,
              error,
              tenantId,
              userId,
            })
          }
        }
        break

      case 'change_status':
        if (!data.accountStatus) {
          throw new ValidationError('Account status is required for change_status operation')
        }

        for (const accountId of accountIds) {
          try {
            await this.updateAccount(accountId, tenantId, userId, {
              accountStatus: data.accountStatus,
            })
            successCount++
          } catch (error) {
            failedCount++
            logger.error('Bulk change_status failed for account', {
              accountId,
              error,
              tenantId,
              userId,
            })
          }
        }
        break

      default:
        throw new ValidationError(`Unknown operation: ${operationType}`)
    }

    logger.info('Bulk operation completed', {
      operation: operationType,
      success: successCount,
      failed: failedCount,
      tenantId,
      userId,
    })

    return { success: successCount, failed: failedCount }
  }

  /**
   * Mark account as having recent activity
   */
  async markActivity(id: string, tenantId: string): Promise<void> {
    const account = await accountRepository.findById(id, tenantId)
    if (!account) {
      throw new NotFoundError('Account not found')
    }

    await accountRepository.updateLastActivity(id, tenantId)

    logger.debug('Account activity marked', {
      accountId: id,
      tenantId,
    })
  }

  /**
   * Get account hierarchy (parent and all children)
   */
  async getAccountHierarchy(id: string, tenantId: string): Promise<AccountHierarchy> {
    const accounts = await accountRepository.getHierarchy(id, tenantId)

    if (accounts.length === 0) {
      throw new NotFoundError('Account not found')
    }

    // Build hierarchy tree
    const buildTree = (
      parentId: string | null | undefined,
      depth: number
    ): AccountHierarchy[] => {
      return accounts
        .filter((a: any) => {
          if (depth === 0 && a.id === id) return true
          return a.parentAccountId === parentId && a.id !== id
        })
        .map((account: any) => ({
          account,
          children: buildTree(account.id, depth + 1),
          depth,
        }))
    }

    const tree = buildTree(null, 0)
    return tree[0] || { account: accounts[0], children: [], depth: 0 }
  }

  /**
   * Get account statistics
   */
  async getStatistics(tenantId: string): Promise<any> {
    // This would typically query aggregated data
    // For now, returning placeholder structure
    // TODO: Implement with proper aggregation queries

    const allAccounts = await accountRepository.list(tenantId, {
      page: 1,
      limit: 10000, // Get all for statistics
    })

    const total = allAccounts.total
    const active = allAccounts.accounts.filter((a) => a.isActive).length

    const byType: Record<string, number> = {}
    const byStatus: Record<string, number> = {}
    const bySize: Record<string, number> = {}
    const byIndustry: Record<string, number> = {}

    let totalRevenue = 0
    let revenueCount = 0

    allAccounts.accounts.forEach((account) => {
      if (account.accountType) {
        byType[account.accountType] = (byType[account.accountType] || 0) + 1
      }
      if (account.accountStatus) {
        byStatus[account.accountStatus] = (byStatus[account.accountStatus] || 0) + 1
      }
      if (account.companySize) {
        bySize[account.companySize] = (bySize[account.companySize] || 0) + 1
      }
      if (account.industry) {
        byIndustry[account.industry] = (byIndustry[account.industry] || 0) + 1
      }
      if (account.annualRevenue) {
        totalRevenue += account.annualRevenue
        revenueCount++
      }
    })

    return {
      totalAccounts: total,
      activeAccounts: active,
      byAccountType: byType,
      byAccountStatus: byStatus,
      byCompanySize: bySize,
      byIndustry: byIndustry,
      totalRevenue,
      averageRevenue: revenueCount > 0 ? totalRevenue / revenueCount : 0,
    }
  }
}

// Export singleton instance
export const accountService = new AccountService()
