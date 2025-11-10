/**
 * Analytics Service Unit Tests
 * Tests for analytics business logic
 */

import { AnalyticsService } from '../../../backend/core/analytics/analytics-service'
import { AnalyticsRepository } from '../../../backend/core/analytics/analytics-repository'
import { Pool } from 'pg'

// Mock dependencies
jest.mock('../../../backend/core/analytics/analytics-repository')
jest.mock('../../../backend/utils/logging/logger')

describe('AnalyticsService', () => {
  let service: AnalyticsService
  let mockPool: jest.Mocked<Pool>
  let mockRepository: jest.Mocked<AnalyticsRepository>

  beforeEach(() => {
    mockPool = {} as jest.Mocked<Pool>
    service = new AnalyticsService(mockPool)
    mockRepository = (service as any).repository
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics successfully', async () => {
      // Arrange
      const tenantId = 'test-tenant-id'
      const mockMetrics = {
        totalContacts: 150,
        totalDeals: 45,
        totalTasks: 78,
        totalRevenue: 125000,
        contactsChange: 12.5,
        dealsChange: 8.3,
        tasksChange: -5.2,
        revenueChange: 15.7,
        activeDeals: 30,
        pendingTasks: 25,
        overdueTasks: 5,
        dealsClosingSoon: 8,
      }

      mockRepository.getDashboardMetrics = jest.fn().mockResolvedValue(mockMetrics)

      // Act
      const result = await service.getDashboardMetrics(tenantId, {})

      // Assert
      expect(result).toEqual(mockMetrics)
      expect(mockRepository.getDashboardMetrics).toHaveBeenCalledWith(tenantId, undefined)
    })

    it('should pass filters to repository', async () => {
      // Arrange
      const tenantId = 'test-tenant-id'
      const filters = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        ownerId: 'owner-123',
      }

      mockRepository.getDashboardMetrics = jest.fn().mockResolvedValue({})

      // Act
      await service.getDashboardMetrics(tenantId, { filters })

      // Assert
      expect(mockRepository.getDashboardMetrics).toHaveBeenCalledWith(tenantId, filters)
    })

    it('should throw AppError on repository failure', async () => {
      // Arrange
      const tenantId = 'test-tenant-id'
      mockRepository.getDashboardMetrics = jest.fn().mockRejectedValue(new Error('DB Error'))

      // Act & Assert
      await expect(service.getDashboardMetrics(tenantId, {})).rejects.toThrow(
        'Failed to fetch dashboard metrics'
      )
    })
  })

  describe('getContactAnalytics', () => {
    it('should return contact analytics successfully', async () => {
      // Arrange
      const tenantId = 'test-tenant-id'
      const mockAnalytics = {
        totalContacts: 150,
        activeContacts: 145,
        inactiveContacts: 5,
        byLeadStatus: {
          new: 50,
          contacted: 40,
          qualified: 30,
          unqualified: 30,
        },
        byLifecycleStage: {
          lead: 60,
          mql: 30,
          sql: 20,
          opportunity: 15,
          customer: 20,
          evangelist: 3,
          other: 2,
        },
        averageLeadScore: 45.8,
        highValueLeads: 25,
        contactedLast30Days: 80,
        newContactsThisMonth: 12,
        newContactsLastMonth: 10,
        conversionRate: 13.3,
      }

      mockRepository.getContactAnalytics = jest.fn().mockResolvedValue(mockAnalytics)

      // Act
      const result = await service.getContactAnalytics(tenantId, {})

      // Assert
      expect(result).toEqual(mockAnalytics)
      expect(result.totalContacts).toBe(150)
      expect(result.conversionRate).toBeCloseTo(13.3, 1)
    })
  })

  describe('getDealAnalytics', () => {
    it('should return deal analytics successfully', async () => {
      // Arrange
      const tenantId = 'test-tenant-id'
      const mockAnalytics = {
        totalDeals: 45,
        openDeals: 30,
        closedDeals: 15,
        wonDeals: 10,
        lostDeals: 5,
        totalRevenue: 125000,
        wonRevenue: 100000,
        lostRevenue: 25000,
        projectedRevenue: 75000,
        averageDealSize: 2777.78,
        winRate: 66.67,
        averageSalesCycle: 45.5,
        averageDaysInStage: 12.3,
        pipelineCoverage: 0,
        staleDealCount: 3,
        dealsClosingThisMonth: 8,
        dealsClosingNextMonth: 12,
        byStage: [],
        byPipeline: [],
        byOwner: [],
        topDeals: [],
        atRiskDeals: [],
      }

      mockRepository.getDealAnalytics = jest.fn().mockResolvedValue(mockAnalytics)

      // Act
      const result = await service.getDealAnalytics(tenantId, {})

      // Assert
      expect(result).toEqual(mockAnalytics)
      expect(result.winRate).toBeCloseTo(66.67, 2)
      expect(result.totalRevenue).toBe(125000)
    })
  })

  describe('getRevenueForecast', () => {
    it('should generate monthly revenue forecast', async () => {
      // Arrange
      const tenantId = 'test-tenant-id'
      const mockDealAnalytics = {
        totalDeals: 45,
        openDeals: 30,
        closedDeals: 15,
        wonDeals: 10,
        lostDeals: 5,
        totalRevenue: 125000,
        wonRevenue: 100000,
        lostRevenue: 25000,
        projectedRevenue: 75000,
        averageDealSize: 2777.78,
        winRate: 66.67,
        averageSalesCycle: 45.5,
        averageDaysInStage: 12.3,
        pipelineCoverage: 0,
        staleDealCount: 3,
        dealsClosingThisMonth: 8,
        dealsClosingNextMonth: 12,
        byStage: [],
        byPipeline: [],
        byOwner: [],
        topDeals: [
          {
            id: 'deal-1',
            name: 'Deal 1',
            amount: 50000,
            probability: 80,
            weightedAmount: 40000,
            stageName: 'Proposal',
            expectedCloseDate: new Date('2025-01-15'),
          },
          {
            id: 'deal-2',
            name: 'Deal 2',
            amount: 25000,
            probability: 70,
            weightedAmount: 17500,
            stageName: 'Negotiation',
            expectedCloseDate: new Date('2025-01-20'),
          },
        ],
        atRiskDeals: [],
      }

      mockRepository.getDealAnalytics = jest.fn().mockResolvedValue(mockDealAnalytics)

      // Act
      const result = await service.getRevenueForecast(tenantId, { period: 'month' })

      // Assert
      expect(result.period).toBe('month')
      expect(result.projectedRevenue).toBe(75000)
      expect(result.committedRevenue).toBe(75000) // Both deals have probability >= 70%
      expect(result.bestCaseRevenue).toBe(90000) // 75000 * 1.2
      expect(result.worstCaseRevenue).toBe(60000) // 75000 * 0.8
      expect(result.previousPeriodRevenue).toBe(100000)
    })

    it('should calculate growth rate correctly', async () => {
      // Arrange
      const tenantId = 'test-tenant-id'
      const mockDealAnalytics = {
        projectedRevenue: 120000,
        wonRevenue: 100000,
        topDeals: [],
      } as any

      mockRepository.getDealAnalytics = jest.fn().mockResolvedValue(mockDealAnalytics)

      // Act
      const result = await service.getRevenueForecast(tenantId, { period: 'quarter' })

      // Assert
      expect(result.growthRate).toBe(20) // (120000 - 100000) / 100000 * 100
    })
  })

  describe('getTaskAnalytics', () => {
    it('should return task analytics successfully', async () => {
      // Arrange
      const tenantId = 'test-tenant-id'
      const mockAnalytics = {
        totalTasks: 78,
        pendingTasks: 25,
        inProgressTasks: 10,
        completedTasks: 40,
        cancelledTasks: 3,
        overdueTasks: 5,
        dueTodayTasks: 3,
        dueThisWeekTasks: 8,
        dueThisMonthTasks: 15,
        byPriority: {
          low: 20,
          medium: 30,
          high: 15,
          urgent: 8,
        },
        byAssignee: [],
        completionRate: 51.28,
        averageCompletionTime: 24.5,
        onTimeCompletionRate: 85.0,
      }

      mockRepository.getTaskAnalytics = jest.fn().mockResolvedValue(mockAnalytics)

      // Act
      const result = await service.getTaskAnalytics(tenantId, {})

      // Assert
      expect(result).toEqual(mockAnalytics)
      expect(result.completionRate).toBeCloseTo(51.28, 2)
      expect(result.onTimeCompletionRate).toBe(85.0)
    })
  })
})
