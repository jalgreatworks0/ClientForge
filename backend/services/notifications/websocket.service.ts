/**
 * WebSocket Service for Real-time Notifications
 * Handles WebSocket connections and real-time notification delivery
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../../utils/logging/logger';
import { notificationService } from './notification.service';
import * as jwt from 'jsonwebtoken';

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set<socketId>

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      path: '/ws',
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

        // Attach user info to socket
        socket.data.userId = decoded.userId;
        socket.data.tenantId = decoded.tenantId;

        next();
      } catch (error: any) {
        logger.error('[WebSocket] Authentication failed', {
          error: error.message,
        });
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // Handle connections
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    // Listen for new notifications from notification service
    notificationService.on('notification:new', (notification) => {
      this.deliverNotification(notification);
    });

    notificationService.on('notification:read', (data) => {
      this.broadcastToUser(data.userId, 'notification:read', data);
    });

    notificationService.on('notifications:all_read', (data) => {
      this.broadcastToUser(data.userId, 'notifications:all_read', data);
    });

    logger.info('[WebSocket] WebSocket server initialized');
  }

  /**
   * Handle new socket connection
   */
  private handleConnection(socket: Socket): void {
    const userId = socket.data.userId;
    const tenantId = socket.data.tenantId;

    logger.info('[WebSocket] Client connected', {
      socketId: socket.id,
      userId,
      tenantId,
    });

    // Track user socket
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);
    socket.join(`tenant:${tenantId}`);

    // Send initial unread count
    this.sendUnreadCount(socket, userId, tenantId);

    // Handle events
    socket.on('notification:read', async (notificationId: string) => {
      try {
        await notificationService.markAsRead(notificationId, userId);
        await this.sendUnreadCount(socket, userId, tenantId);
      } catch (error: any) {
        logger.error('[WebSocket] Failed to mark notification as read', {
          error: error.message,
          notificationId,
        });
      }
    });

    socket.on('notifications:mark_all_read', async () => {
      try {
        await notificationService.markAllAsRead(userId, tenantId);
        await this.sendUnreadCount(socket, userId, tenantId);
      } catch (error: any) {
        logger.error('[WebSocket] Failed to mark all as read', {
          error: error.message,
        });
      }
    });

    socket.on('notification:delete', async (notificationId: string) => {
      try {
        await notificationService.delete(notificationId, userId);
        await this.sendUnreadCount(socket, userId, tenantId);
      } catch (error: any) {
        logger.error('[WebSocket] Failed to delete notification', {
          error: error.message,
          notificationId,
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info('[WebSocket] Client disconnected', {
        socketId: socket.id,
        userId,
      });

      // Remove socket from tracking
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('[WebSocket] Socket error', {
        socketId: socket.id,
        userId,
        error: error.message,
      });
    });
  }

  /**
   * Deliver notification to user via WebSocket
   */
  private deliverNotification(notification: any): void {
    if (!this.io) return;

    const userId = notification.userId;

    // Send to all user's connected devices
    this.io.to(`user:${userId}`).emit('notification:new', notification);

    logger.info('[WebSocket] Notification delivered', {
      notificationId: notification.id,
      userId,
      socketCount: this.userSockets.get(userId)?.size || 0,
    });
  }

  /**
   * Broadcast message to all user's sockets
   */
  private broadcastToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Broadcast message to all tenant users
   */
  broadcastToTenant(tenantId: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(`tenant:${tenantId}`).emit(event, data);
  }

  /**
   * Send unread notification count to socket
   */
  private async sendUnreadCount(socket: Socket, userId: string, tenantId: string): Promise<void> {
    try {
      const count = await notificationService.getUnreadCount(userId, tenantId);
      socket.emit('notification:unread_count', { count });
    } catch (error: any) {
      logger.error('[WebSocket] Failed to send unread count', {
        error: error.message,
        userId,
      });
    }
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0;
  }

  /**
   * Get user's socket count (number of connected devices)
   */
  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }

  /**
   * Shutdown WebSocket server
   */
  async shutdown(): Promise<void> {
    if (this.io) {
      logger.info('[WebSocket] Shutting down WebSocket server...');

      // Disconnect all clients
      this.io.disconnectSockets(true);

      // Close server
      await new Promise<void>((resolve) => {
        this.io!.close(() => {
          logger.info('[WebSocket] WebSocket server shut down');
          resolve();
        });
      });
    }
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
