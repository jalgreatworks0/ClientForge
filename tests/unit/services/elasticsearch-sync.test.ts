/**
 * Elasticsearch Sync Service Tests
 */

import { elasticsearchSyncService } from '../../../backend/services/search/elasticsearch-sync.service'
import { queueService } from '../../../backend/services/queue/queue.service'

// Mock the queue service
jest.mock('../../../backend/services/queue/queue.service', () => ({
  queueService: {
    addSearchIndexJob: jest.fn(),
  },
}))

// TODO(phase5): Unskip after Elasticsearch service is fully implemented or mocked
describe.skip('ElasticsearchSyncService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('syncContact', () => {
    it('should queue contact for indexing on create', async () => {
      const contact = {
        contact_id: 'contact-123',
        tenant_id: 'tenant-123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        title: 'CEO',
        department: 'Executive',
        account_id: 'account-123',
        owner_id: 'user-123',
        status: 'active',
        lead_source: 'website',
        tags: ['vip', 'customer'],
        created_at: new Date(),
        updated_at: new Date(),
      }

      await elasticsearchSyncService.syncContact('index', contact)

      expect(queueService.addSearchIndexJob).toHaveBeenCalledWith({
        action: 'index',
        index: 'contacts',
        id: contact.contact_id,
        document: expect.objectContaining({
          id: contact.contact_id,
          tenantId: contact.tenant_id,
          firstName: contact.first_name,
          lastName: contact.last_name,
          fullName: 'John Doe',
          email: contact.email,
        }),
        tenantId: contact.tenant_id,
      })
    })

    it('should queue contact for update', async () => {
      const contact = {
        contact_id: 'contact-123',
        tenant_id: 'tenant-123',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        phone: '+1234567890',
        title: 'CTO',
        department: 'Engineering',
        account_id: 'account-123',
        owner_id: 'user-123',
        status: 'active',
        lead_source: 'referral',
        tags: ['tech'],
        created_at: new Date(),
        updated_at: new Date(),
      }

      await elasticsearchSyncService.syncContact('update', contact)

      expect(queueService.addSearchIndexJob).toHaveBeenCalledWith({
        action: 'update',
        index: 'contacts',
        id: contact.contact_id,
        document: expect.objectContaining({
          id: contact.contact_id,
          fullName: 'Jane Smith',
        }),
        tenantId: contact.tenant_id,
      })
    })

    it('should queue contact for deletion', async () => {
      const contact = {
        contact_id: 'contact-123',
        tenant_id: 'tenant-123',
      }

      await elasticsearchSyncService.syncContact('delete', contact)

      expect(queueService.addSearchIndexJob).toHaveBeenCalledWith({
        action: 'delete',
        index: 'contacts',
        id: contact.contact_id,
        tenantId: contact.tenant_id,
      })
    })
  })

  describe('syncAccount', () => {
    it('should queue account for indexing', async () => {
      const account = {
        account_id: 'account-123',
        tenant_id: 'tenant-123',
        name: 'Acme Corp',
        website: 'https://acme.com',
        industry: 'Technology',
        employees: 500,
        revenue: 10000000,
        phone: '+1234567890',
        billing_address: '123 Main St',
        shipping_address: '123 Main St',
        owner_id: 'user-123',
        status: 'active',
        tags: ['enterprise'],
        created_at: new Date(),
        updated_at: new Date(),
      }

      await elasticsearchSyncService.syncAccount('index', account)

      expect(queueService.addSearchIndexJob).toHaveBeenCalledWith({
        action: 'index',
        index: 'accounts',
        id: account.account_id,
        document: expect.objectContaining({
          id: account.account_id,
          name: 'Acme Corp',
          industry: 'Technology',
        }),
        tenantId: account.tenant_id,
      })
    })
  })

  describe('syncDeal', () => {
    it('should queue deal for indexing', async () => {
      const deal = {
        deal_id: 'deal-123',
        tenant_id: 'tenant-123',
        name: 'Enterprise Deal',
        amount: 50000,
        stage: 'negotiation',
        probability: 75,
        expected_close_date: new Date(),
        actual_close_date: null,
        account_id: 'account-123',
        contact_id: 'contact-123',
        owner_id: 'user-123',
        status: 'open',
        lost_reason: null,
        tags: ['high-value'],
        created_at: new Date(),
        updated_at: new Date(),
      }

      await elasticsearchSyncService.syncDeal('index', deal)

      expect(queueService.addSearchIndexJob).toHaveBeenCalledWith({
        action: 'index',
        index: 'deals',
        id: deal.deal_id,
        document: expect.objectContaining({
          id: deal.deal_id,
          name: 'Enterprise Deal',
          amount: 50000,
          stage: 'negotiation',
        }),
        tenantId: deal.tenant_id,
      })
    })
  })

  describe('bulkSync', () => {
    it('should queue multiple documents for indexing', async () => {
      const documents = [
        {
          id: 'contact-1',
          tenantId: 'tenant-123',
          firstName: 'John',
          lastName: 'Doe',
        },
        {
          id: 'contact-2',
          tenantId: 'tenant-123',
          firstName: 'Jane',
          lastName: 'Smith',
        },
      ]

      await elasticsearchSyncService.bulkSync('contacts', documents)

      expect(queueService.addSearchIndexJob).toHaveBeenCalledTimes(2)
    })
  })

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const health = await elasticsearchSyncService.healthCheck()

      expect(health).toEqual({
        status: 'healthy',
        message: 'Elasticsearch sync service is operational',
      })
    })
  })
})
