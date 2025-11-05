/**
 * Deal Service
 * Business logic for deals/opportunities management
 */

import { dealRepository } from './deal-repository'
import { accountRepository } from '../accounts/account-repository'
import { contactRepository } from '../contacts/contact-repository'
import {
  Deal,
  CreateDealInput,
  UpdateDealInput,
  DealListOptions,
  DealListResponse,
  BulkDealOperation,
  DealWithRelations,
  ChangeDealStageInput,
  CloseDealInput,
  DealStatistics,
} from './deal-types'
import { ValidationError, NotFoundError } from '../../utils/errors/app-error'
import { logger } from '../../utils/logging/logger'

export class DealService {
  /**
   * Create a new deal
   */
  async createDeal(
    tenantId: string,
    userId: string,
    data: CreateDealInput
  ): Promise<Deal> {
    // Validate pipeline and stage exist
    const pipeline = await dealRepository.findPipelineById(data.pipelineId, tenantId)
    if (!pipeline) {
      throw new ValidationError('Pipeline does not exist')
    }

    const stage = await dealRepository.findStageById(data.stageId, tenantId)
    if (!stage) {
      throw new ValidationError('Deal stage does not exist')
    }

    // Verify stage belongs to pipeline
    if (stage.pipelineId !== data.pipelineId) {
      throw new ValidationError('Stage does not belong to the specified pipeline')
    }

    // Validate account if provided
    if (data.accountId) {
      const account = await accountRepository.findById(data.accountId, tenantId)
      if (!account) {
        throw new ValidationError('Account does not exist')
      }
    }

    // Validate contact if provided
    if (data.contactId) {
      const contact = await contactRepository.findById(data.contactId, tenantId)
      if (!contact) {
        throw new ValidationError('Contact does not exist')
      }
    }

    // Use stage probability if not provided
    if (data.probability === undefined) {
      data.probability = stage.probability
    }

    const deal = await dealRepository.create(tenantId, data)

    logger.info('Deal created', {
      dealId: deal.id,
      dealName: deal.name,
      amount: deal.amount,
      tenantId,
      userId,
    })

    return deal
  }

  /**
   * Get deal by ID
   */
  async getDealById(
    id: string,
    tenantId: string,
    includeRelations: boolean = false
  ): Promise<Deal | DealWithRelations> {
    let deal: Deal | DealWithRelations | null

    if (includeRelations) {
      deal = await dealRepository.findByIdWithRelations(id, tenantId)
    } else {
      deal = await dealRepository.findById(id, tenantId)
    }

    if (!deal) {
      throw new NotFoundError('Deal not found')
    }

    return deal
  }

  /**
   * List deals with pagination and filters
   */
  async listDeals(
    tenantId: string,
    options: DealListOptions
  ): Promise<DealListResponse> {
    return await dealRepository.list(tenantId, options)
  }

  /**
   * Update deal
   */
  async updateDeal(
    id: string,
    tenantId: string,
    userId: string,
    data: UpdateDealInput
  ): Promise<Deal> {
    // Verify deal exists
    const existingDeal = await dealRepository.findById(id, tenantId)
    if (!existingDeal) {
      throw new NotFoundError('Deal not found')
    }

    // Validate pipeline if being updated
    if (data.pipelineId) {
      const pipeline = await dealRepository.findPipelineById(data.pipelineId, tenantId)
      if (!pipeline) {
        throw new ValidationError('Pipeline does not exist')
      }
    }

    // Validate stage if being updated
    if (data.stageId) {
      const stage = await dealRepository.findStageById(data.stageId, tenantId)
      if (!stage) {
        throw new ValidationError('Deal stage does not exist')
      }

      // Verify stage belongs to pipeline
      const pipelineId = data.pipelineId || existingDeal.pipelineId
      if (stage.pipelineId !== pipelineId) {
        throw new ValidationError('Stage does not belong to the specified pipeline')
      }
    }

    // Validate account if being updated
    if (data.accountId) {
      const account = await accountRepository.findById(data.accountId, tenantId)
      if (!account) {
        throw new ValidationError('Account does not exist')
      }
    }

    // Validate contact if being updated
    if (data.contactId) {
      const contact = await contactRepository.findById(data.contactId, tenantId)
      if (!contact) {
        throw new ValidationError('Contact does not exist')
      }
    }

    const updatedDeal = await dealRepository.update(id, tenantId, data)

    logger.info('Deal updated', {
      dealId: id,
      dealName: updatedDeal.name,
      tenantId,
      userId,
      changes: Object.keys(data),
    })

    return updatedDeal
  }

  /**
   * Delete deal (soft delete)
   */
  async deleteDeal(id: string, tenantId: string, userId: string): Promise<void> {
    // Verify deal exists
    const deal = await dealRepository.findById(id, tenantId)
    if (!deal) {
      throw new NotFoundError('Deal not found')
    }

    await dealRepository.delete(id, tenantId)

    logger.info('Deal deleted', {
      dealId: id,
      dealName: deal.name,
      tenantId,
      userId,
    })
  }

  /**
   * Search deals with full-text search
   */
  async searchDeals(
    tenantId: string,
    query: string,
    limit: number = 20
  ): Promise<Deal[]> {
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      throw new ValidationError('Search query cannot be empty')
    }

    if (trimmedQuery.length < 2) {
      throw new ValidationError('Search query must be at least 2 characters')
    }

    return await dealRepository.search(tenantId, trimmedQuery, limit)
  }

  /**
   * Change deal stage
   */
  async changeDealStage(
    id: string,
    tenantId: string,
    userId: string,
    input: ChangeDealStageInput
  ): Promise<Deal> {
    // Verify deal exists
    const deal = await dealRepository.findById(id, tenantId)
    if (!deal) {
      throw new NotFoundError('Deal not found')
    }

    // Verify new stage exists
    const newStage = await dealRepository.findStageById(input.toStageId, tenantId)
    if (!newStage) {
      throw new ValidationError('Deal stage does not exist')
    }

    // Verify stage belongs to same pipeline
    if (newStage.pipelineId !== deal.pipelineId) {
      throw new ValidationError('Stage does not belong to the deal\'s pipeline')
    }

    // Update deal stage and probability
    const updatedDeal = await dealRepository.update(id, tenantId, {
      stageId: input.toStageId,
      probability: newStage.probability,
      isClosed: newStage.isClosedStage,
      isWon: newStage.isWonStage ? true : (newStage.isClosedStage ? false : undefined),
    })

    logger.info('Deal stage changed', {
      dealId: id,
      fromStageId: deal.stageId,
      toStageId: input.toStageId,
      tenantId,
      userId,
    })

    return updatedDeal
  }

  /**
   * Close deal (won or lost)
   */
  async closeDeal(
    id: string,
    tenantId: string,
    userId: string,
    input: CloseDealInput
  ): Promise<Deal> {
    // Verify deal exists
    const deal = await dealRepository.findById(id, tenantId)
    if (!deal) {
      throw new NotFoundError('Deal not found')
    }

    if (deal.isClosed) {
      throw new ValidationError('Deal is already closed')
    }

    const updateData: UpdateDealInput = {
      isClosed: true,
      isWon: input.isWon,
      actualCloseDate: input.actualCloseDate || new Date(),
    }

    if (!input.isWon && input.lostReason) {
      updateData.lostReason = input.lostReason
    }

    const updatedDeal = await dealRepository.update(id, tenantId, updateData)

    logger.info('Deal closed', {
      dealId: id,
      isWon: input.isWon,
      amount: deal.amount,
      tenantId,
      userId,
    })

    return updatedDeal
  }

  /**
   * Bulk operations on deals
   */
  async bulkOperation(
    tenantId: string,
    userId: string,
    operation: BulkDealOperation
  ): Promise<{ success: number; failed: number }> {
    const { dealIds, operation: operationType, data } = operation

    let successCount = 0
    let failedCount = 0

    switch (operationType) {
      case 'delete':
        const deleted = await dealRepository.bulkDelete(dealIds, tenantId)
        successCount = deleted
        failedCount = dealIds.length - deleted
        break

      case 'update':
        for (const dealId of dealIds) {
          try {
            await this.updateDeal(dealId, tenantId, userId, data)
            successCount++
          } catch (error) {
            failedCount++
            logger.error('Bulk update failed for deal', {
              dealId,
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

        for (const dealId of dealIds) {
          try {
            await this.updateDeal(dealId, tenantId, userId, { ownerId: data.ownerId })
            successCount++
          } catch (error) {
            failedCount++
            logger.error('Bulk assign failed for deal', {
              dealId,
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

        for (const dealId of dealIds) {
          try {
            const deal = await dealRepository.findById(dealId, tenantId)
            if (deal) {
              const currentTags = deal.tags || []
              const newTags = Array.from(new Set([...currentTags, ...data.tags]))
              await this.updateDeal(dealId, tenantId, userId, { tags: newTags })
              successCount++
            } else {
              failedCount++
            }
          } catch (error) {
            failedCount++
            logger.error('Bulk add_tags failed for deal', {
              dealId,
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

        for (const dealId of dealIds) {
          try {
            const deal = await dealRepository.findById(dealId, tenantId)
            if (deal) {
              const currentTags = deal.tags || []
              const newTags = currentTags.filter((tag) => !data.tags.includes(tag))
              await this.updateDeal(dealId, tenantId, userId, { tags: newTags })
              successCount++
            } else {
              failedCount++
            }
          } catch (error) {
            failedCount++
            logger.error('Bulk remove_tags failed for deal', {
              dealId,
              error,
              tenantId,
              userId,
            })
          }
        }
        break

      case 'change_stage':
        if (!data.stageId) {
          throw new ValidationError('Stage ID is required for change_stage operation')
        }

        for (const dealId of dealIds) {
          try {
            await this.changeDealStage(dealId, tenantId, userId, {
              toStageId: data.stageId,
              notes: data.notes,
            })
            successCount++
          } catch (error) {
            failedCount++
            logger.error('Bulk change_stage failed for deal', {
              dealId,
              error,
              tenantId,
              userId,
            })
          }
        }
        break

      case 'close_won':
        for (const dealId of dealIds) {
          try {
            await this.closeDeal(dealId, tenantId, userId, {
              isWon: true,
              actualCloseDate: new Date(),
            })
            successCount++
          } catch (error) {
            failedCount++
            logger.error('Bulk close_won failed for deal', {
              dealId,
              error,
              tenantId,
              userId,
            })
          }
        }
        break

      case 'close_lost':
        if (!data.lostReason) {
          throw new ValidationError('Lost reason is required for close_lost operation')
        }

        for (const dealId of dealIds) {
          try {
            await this.closeDeal(dealId, tenantId, userId, {
              isWon: false,
              lostReason: data.lostReason,
              actualCloseDate: new Date(),
            })
            successCount++
          } catch (error) {
            failedCount++
            logger.error('Bulk close_lost failed for deal', {
              dealId,
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
   * Get deal statistics
   */
  async getStatistics(tenantId: string): Promise<DealStatistics> {
    // Get all deals for statistics calculation
    const allDeals = await dealRepository.list(tenantId, {
      page: 1,
      limit: 10000, // Get all for statistics
    })

    const total = allDeals.total
    const open = allDeals.deals.filter((d) => !d.isClosed).length
    const closed = allDeals.deals.filter((d) => d.isClosed).length
    const won = allDeals.deals.filter((d) => d.isWon === true).length
    const lost = allDeals.deals.filter((d) => d.isWon === false).length

    let totalValue = 0
    let wonValue = 0
    let lostValue = 0
    let weightedValue = 0

    allDeals.deals.forEach((deal) => {
      if (deal.amount) {
        totalValue += deal.amount
        if (deal.isWon) wonValue += deal.amount
        if (deal.isWon === false) lostValue += deal.amount
      }
      if (deal.weightedAmount) {
        weightedValue += deal.weightedAmount
      }
    })

    const averageDealSize = total > 0 ? totalValue / total : 0
    const winRate = closed > 0 ? (won / closed) * 100 : 0
    const averageSalesCycle = 30 // TODO: Calculate from actual data

    return {
      totalDeals: total,
      openDeals: open,
      closedDeals: closed,
      wonDeals: won,
      lostDeals: lost,
      totalValue,
      wonValue,
      lostValue,
      weightedPipelineValue: weightedValue,
      averageDealSize,
      winRate,
      averageSalesCycle,
      byStage: {},
      byPipeline: {},
      byOwner: {},
      topDeals: allDeals.deals.slice(0, 10),
      dealsClosingSoon: [],
      staleDealeddeals: [],
    }
  }

  /**
   * Get deal stage history
   */
  async getStageHistory(id: string, tenantId: string) {
    const deal = await dealRepository.findById(id, tenantId)
    if (!deal) {
      throw new NotFoundError('Deal not found')
    }

    return await dealRepository.getStageHistory(id, tenantId)
  }
}

// Export singleton instance
export const dealService = new DealService()
