/**
 * Event Bus - Decoupled inter-module communication
 * Modules can emit/listen to events without importing each other
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logging/logger';

export class ModuleEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100); // Support many modules
  }

  /**
   * Emit event with logging
   */
  async emitAsync(event: string, data: any): Promise<void> {
    logger.debug(`[EventBus] Event emitted: ${event}`, {
      event,
      dataKeys: data ? Object.keys(data) : [],
    });

    this.emit(event, data);
  }

  /**
   * Register event handler with logging
   */
  onEvent(event: string, handler: Function, moduleName?: string): void {
    const wrappedHandler = async (data: any) => {
      try {
        await handler(data);
      } catch (error: any) {
        logger.error(`[EventBus] Error in event handler`, {
          event,
          module: moduleName,
          error: error.message,
        });
      }
    };

    this.on(event, wrappedHandler);

    if (moduleName) {
      logger.debug(`[EventBus] Handler registered: ${moduleName} → ${event}`);
    }
  }

  /**
   * Get event statistics
   */
  getStats(): { event: string; listenerCount: number }[] {
    const events = this.eventNames();
    return events.map((event) => ({
      event: event.toString(),
      listenerCount: this.listenerCount(event),
    }));
  }
}

// Export singleton
export const eventBus = new ModuleEventBus();
