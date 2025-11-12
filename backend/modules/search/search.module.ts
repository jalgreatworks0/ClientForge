/**
 * Search Module
 * Handles Elasticsearch initialization and automatic indexing
 */

import { EventEmitter } from 'events';

import { elasticsearchService } from '../../services/search/elasticsearch.service';
import { logger } from '../../utils/logging/logger';

export interface IModule {
  name: string;
  initialize(): Promise<void>;
  shutdown?(): Promise<void>;
}

export class SearchModule implements IModule {
  public name = 'search';
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('[Search Module] Initializing...');

      // Create Elasticsearch index if needed
      await elasticsearchService.createIndex();

      // Setup event handlers for automatic indexing
      this.setupEventHandlers();

      logger.info('[Search Module] Initialized successfully');
    } catch (error: any) {
      logger.error('[Search Module] Failed to initialize', {
        error: error.message,
      });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('[Search Module] Shutting down...');
    // Cleanup if needed
  }

  /**
   * Setup event handlers for automatic document indexing
   */
  private setupEventHandlers(): void {
    // Contact events
    this.eventEmitter.on('contact:created', async (data) => {
      await this.indexContact(data);
    });

    this.eventEmitter.on('contact:updated', async (data) => {
      await this.updateContact(data);
    });

    this.eventEmitter.on('contact:deleted', async (data) => {
      await elasticsearchService.delete('contact', data.contactId);
    });

    // Deal events
    this.eventEmitter.on('deal:created', async (data) => {
      await this.indexDeal(data);
    });

    this.eventEmitter.on('deal:updated', async (data) => {
      await this.updateDeal(data);
    });

    this.eventEmitter.on('deal:deleted', async (data) => {
      await elasticsearchService.delete('deal', data.dealId);
    });

    // Task events
    this.eventEmitter.on('task:created', async (data) => {
      await this.indexTask(data);
    });

    this.eventEmitter.on('task:updated', async (data) => {
      await this.updateTask(data);
    });

    this.eventEmitter.on('task:deleted', async (data) => {
      await elasticsearchService.delete('task', data.taskId);
    });

    // Note events
    this.eventEmitter.on('note:created', async (data) => {
      await this.indexNote(data);
    });

    this.eventEmitter.on('note:updated', async (data) => {
      await this.updateNote(data);
    });

    this.eventEmitter.on('note:deleted', async (data) => {
      await elasticsearchService.delete('note', data.noteId);
    });

    // Company events
    this.eventEmitter.on('company:created', async (data) => {
      await this.indexCompany(data);
    });

    this.eventEmitter.on('company:updated', async (data) => {
      await this.updateCompany(data);
    });

    this.eventEmitter.on('company:deleted', async (data) => {
      await elasticsearchService.delete('company', data.companyId);
    });

    logger.info('[Search Module] Event handlers configured for automatic indexing');
  }

  /**
   * Index a contact
   */
  private async indexContact(data: any): Promise<void> {
    try {
      await elasticsearchService.index('contact', data.contactId, {
        tenantId: data.tenantId,
        title: `${data.firstName} ${data.lastName}`,
        description: data.email,
        content: `${data.firstName} ${data.lastName} ${data.email || ''} ${data.phone || ''} ${data.companyName || ''}`,
        email: data.email,
        phone: data.phone,
        tags: data.tags || [],
        assigned_to: data.assignedTo,
        created_at: data.createdAt || new Date().toISOString(),
        first_name: data.firstName,
        last_name: data.lastName,
        company_name: data.companyName,
      });

      logger.debug('[Search Module] Contact indexed', {
        contactId: data.contactId,
      });
    } catch (error: any) {
      logger.error('[Search Module] Failed to index contact', {
        error: error.message,
        contactId: data.contactId,
      });
    }
  }

  /**
   * Update a contact
   */
  private async updateContact(data: any): Promise<void> {
    try {
      await elasticsearchService.update('contact', data.contactId, {
        title: data.firstName && data.lastName ? `${data.firstName} ${data.lastName}` : undefined,
        description: data.email,
        content: data.firstName || data.lastName || data.email || data.phone || data.companyName
          ? `${data.firstName || ''} ${data.lastName || ''} ${data.email || ''} ${data.phone || ''} ${data.companyName || ''}`
          : undefined,
        email: data.email,
        phone: data.phone,
        tags: data.tags,
        assigned_to: data.assignedTo,
        first_name: data.firstName,
        last_name: data.lastName,
        company_name: data.companyName,
      });

      logger.debug('[Search Module] Contact updated', {
        contactId: data.contactId,
      });
    } catch (error: any) {
      logger.error('[Search Module] Failed to update contact', {
        error: error.message,
        contactId: data.contactId,
      });
    }
  }

  /**
   * Index a deal
   */
  private async indexDeal(data: any): Promise<void> {
    try {
      await elasticsearchService.index('deal', data.dealId, {
        tenantId: data.tenantId,
        title: data.dealName || data.name,
        description: data.description,
        content: `${data.dealName || data.name} ${data.description || ''}`,
        tags: data.tags || [],
        assigned_to: data.assignedTo,
        created_at: data.createdAt || new Date().toISOString(),
        value: data.value,
        stage: data.stage,
        probability: data.probability,
      });

      logger.debug('[Search Module] Deal indexed', {
        dealId: data.dealId,
      });
    } catch (error: any) {
      logger.error('[Search Module] Failed to index deal', {
        error: error.message,
        dealId: data.dealId,
      });
    }
  }

  /**
   * Update a deal
   */
  private async updateDeal(data: any): Promise<void> {
    try {
      await elasticsearchService.update('deal', data.dealId, {
        title: data.dealName || data.name,
        description: data.description,
        content: (data.dealName || data.name || data.description)
          ? `${data.dealName || data.name || ''} ${data.description || ''}`
          : undefined,
        tags: data.tags,
        assigned_to: data.assignedTo,
        value: data.value,
        stage: data.stage,
        probability: data.probability,
      });

      logger.debug('[Search Module] Deal updated', {
        dealId: data.dealId,
      });
    } catch (error: any) {
      logger.error('[Search Module] Failed to update deal', {
        error: error.message,
        dealId: data.dealId,
      });
    }
  }

  /**
   * Index a task
   */
  private async indexTask(data: any): Promise<void> {
    try {
      await elasticsearchService.index('task', data.taskId, {
        tenantId: data.tenantId,
        title: data.taskTitle || data.title,
        description: data.description,
        content: `${data.taskTitle || data.title} ${data.description || ''}`,
        tags: data.tags || [],
        assigned_to: data.assignedTo,
        created_at: data.createdAt || new Date().toISOString(),
        status: data.status,
        priority: data.priority,
        due_date: data.dueDate,
      });

      logger.debug('[Search Module] Task indexed', {
        taskId: data.taskId,
      });
    } catch (error: any) {
      logger.error('[Search Module] Failed to index task', {
        error: error.message,
        taskId: data.taskId,
      });
    }
  }

  /**
   * Update a task
   */
  private async updateTask(data: any): Promise<void> {
    try {
      await elasticsearchService.update('task', data.taskId, {
        title: data.taskTitle || data.title,
        description: data.description,
        content: (data.taskTitle || data.title || data.description)
          ? `${data.taskTitle || data.title || ''} ${data.description || ''}`
          : undefined,
        tags: data.tags,
        assigned_to: data.assignedTo,
        status: data.status,
        priority: data.priority,
        due_date: data.dueDate,
      });

      logger.debug('[Search Module] Task updated', {
        taskId: data.taskId,
      });
    } catch (error: any) {
      logger.error('[Search Module] Failed to update task', {
        error: error.message,
        taskId: data.taskId,
      });
    }
  }

  /**
   * Index a note
   */
  private async indexNote(data: any): Promise<void> {
    try {
      await elasticsearchService.index('note', data.noteId, {
        tenantId: data.tenantId,
        title: data.title,
        description: data.content?.substring(0, 200),
        content: `${data.title} ${data.content || ''}`,
        tags: data.tags || [],
        created_at: data.createdAt || new Date().toISOString(),
      });

      logger.debug('[Search Module] Note indexed', {
        noteId: data.noteId,
      });
    } catch (error: any) {
      logger.error('[Search Module] Failed to index note', {
        error: error.message,
        noteId: data.noteId,
      });
    }
  }

  /**
   * Update a note
   */
  private async updateNote(data: any): Promise<void> {
    try {
      await elasticsearchService.update('note', data.noteId, {
        title: data.title,
        description: data.content?.substring(0, 200),
        content: (data.title || data.content)
          ? `${data.title || ''} ${data.content || ''}`
          : undefined,
        tags: data.tags,
      });

      logger.debug('[Search Module] Note updated', {
        noteId: data.noteId,
      });
    } catch (error: any) {
      logger.error('[Search Module] Failed to update note', {
        error: error.message,
        noteId: data.noteId,
      });
    }
  }

  /**
   * Index a company
   */
  private async indexCompany(data: any): Promise<void> {
    try {
      await elasticsearchService.index('company', data.companyId, {
        tenantId: data.tenantId,
        title: data.name,
        description: data.description,
        content: `${data.name} ${data.description || ''} ${data.website || ''} ${data.industry || ''}`,
        tags: data.tags || [],
        assigned_to: data.assignedTo,
        created_at: data.createdAt || new Date().toISOString(),
        website: data.website,
        industry: data.industry,
      });

      logger.debug('[Search Module] Company indexed', {
        companyId: data.companyId,
      });
    } catch (error: any) {
      logger.error('[Search Module] Failed to index company', {
        error: error.message,
        companyId: data.companyId,
      });
    }
  }

  /**
   * Update a company
   */
  private async updateCompany(data: any): Promise<void> {
    try {
      await elasticsearchService.update('company', data.companyId, {
        title: data.name,
        description: data.description,
        content: (data.name || data.description || data.website || data.industry)
          ? `${data.name || ''} ${data.description || ''} ${data.website || ''} ${data.industry || ''}`
          : undefined,
        tags: data.tags,
        assigned_to: data.assignedTo,
        website: data.website,
        industry: data.industry,
      });

      logger.debug('[Search Module] Company updated', {
        companyId: data.companyId,
      });
    } catch (error: any) {
      logger.error('[Search Module] Failed to update company', {
        error: error.message,
        companyId: data.companyId,
      });
    }
  }
}

// Export singleton instance factory
export const createSearchModule = (eventEmitter: EventEmitter): SearchModule => {
  return new SearchModule(eventEmitter);
};
