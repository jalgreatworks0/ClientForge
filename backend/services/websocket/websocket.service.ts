/**
 * WebSocket Service
 * Real-time bidirectional communication using Socket.io
 */

import { Server as SocketIOServer, Socket } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { verify } from 'jsonwebtoken'
import logger from '../../utils/logger'

interface JWTPayload {
  userId: string
  tenantId: string
  email: string
  roleId: string
}

interface AuthenticatedSocket extends Socket {
  user?: JWTPayload
}

class WebSocketService {
  private io?: SocketIOServer
  private userSockets: Map<string, Set<string>> = new Map() // userId -> Set of socket IDs
  private tenantSockets: Map<string, Set<string>> = new Map() // tenantId -> Set of socket IDs

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    })

    // JWT Authentication Middleware
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]

        if (!token) {
          return next(new Error('Authentication error: No token provided'))
        }

        const decoded = verify(token, process.env.JWT_SECRET || '') as JWTPayload

        socket.user = decoded
        next()
      } catch (error) {
        logger.error('WebSocket authentication failed', { error })
        next(new Error('Authentication error: Invalid token'))
      }
    })

    // Connection handler
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      const { userId, tenantId, email } = socket.user!

      logger.info('WebSocket client connected', { userId, tenantId, email, socketId: socket.id })

      // Track user socket
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set())
      }
      this.userSockets.get(userId)!.add(socket.id)

      // Track tenant socket
      if (!this.tenantSockets.has(tenantId)) {
        this.tenantSockets.set(tenantId, new Set())
      }
      this.tenantSockets.get(tenantId)!.add(socket.id)

      // Join tenant and user rooms
      socket.join(`tenant:${tenantId}`)
      socket.join(`user:${userId}`)

      // Send connection confirmation
      socket.emit('connected', {
        message: 'WebSocket connection established',
        userId,
        tenantId,
      })

      // Handle client events
      socket.on('subscribe', (data: { room: string }) => {
        socket.join(data.room)
        logger.info('Client subscribed to room', { userId, room: data.room })
      })

      socket.on('unsubscribe', (data: { room: string }) => {
        socket.leave(data.room)
        logger.info('Client unsubscribed from room', { userId, room: data.room })
      })

      // Disconnect handler
      socket.on('disconnect', (reason) => {
        logger.info('WebSocket client disconnected', { userId, tenantId, socketId: socket.id, reason })

        // Remove from tracking maps
        this.userSockets.get(userId)?.delete(socket.id)
        if (this.userSockets.get(userId)?.size === 0) {
          this.userSockets.delete(userId)
        }

        this.tenantSockets.get(tenantId)?.delete(socket.id)
        if (this.tenantSockets.get(tenantId)?.size === 0) {
          this.tenantSockets.delete(tenantId)
        }
      })
    })

    logger.info('WebSocket server initialized')
  }

  /**
   * Broadcast event to all clients in a tenant
   */
  broadcastToTenant(tenantId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized')
      return
    }

    this.io.to(`tenant:${tenantId}`).emit(event, data)
    logger.debug('Broadcast to tenant', { tenantId, event, socketCount: this.tenantSockets.get(tenantId)?.size || 0 })
  }

  /**
   * Send event to specific user (all their connected clients)
   */
  sendToUser(userId: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized')
      return
    }

    this.io.to(`user:${userId}`).emit(event, data)
    logger.debug('Sent to user', { userId, event, socketCount: this.userSockets.get(userId)?.size || 0 })
  }

  /**
   * Broadcast event to specific room
   */
  broadcastToRoom(room: string, event: string, data: any): void {
    if (!this.io) {
      logger.warn('WebSocket server not initialized')
      return
    }

    this.io.to(room).emit(event, data)
    logger.debug('Broadcast to room', { room, event })
  }

  /**
   * Broadcast to deal participants
   */
  broadcastToDeal(dealId: string, event: string, data: any): void {
    this.broadcastToRoom(`deal:${dealId}`, event, data)
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId) && this.userSockets.get(userId)!.size > 0
  }

  /**
   * Get online users count for tenant
   */
  getTenantOnlineCount(tenantId: string): number {
    return this.tenantSockets.get(tenantId)?.size || 0
  }

  /**
   * Get all online users in tenant
   */
  getTenantOnlineUsers(tenantId: string): string[] {
    const socketIds = this.tenantSockets.get(tenantId) || new Set()
    const userIds = new Set<string>()

    for (const [userId, sockets] of this.userSockets.entries()) {
      for (const socketId of sockets) {
        if (socketIds.has(socketId)) {
          userIds.add(userId)
          break
        }
      }
    }

    return Array.from(userIds)
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.io) {
      logger.info('Shutting down WebSocket server...')
      await this.io.close()
      this.userSockets.clear()
      this.tenantSockets.clear()
      logger.info('WebSocket server shut down')
    }
  }
}

// Singleton instance
export const websocketService = new WebSocketService()
