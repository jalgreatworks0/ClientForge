/**
 * WebSocket Client Service
 * Real-time updates from server using Socket.io
 */

import { io, Socket } from 'socket.io-client'

type EventHandler = (data: any) => void

class WebSocketService {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private eventHandlers: Map<string, Set<EventHandler>> = new Map()

  /**
   * Connect to WebSocket server
   */
  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('[WebSocket] Already connected')
      return
    }

    const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'

    this.socket = io(serverUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    })

    this.setupEventListeners()
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.eventHandlers.clear()
      console.log('[WebSocket] Disconnected')
    }
  }

  /**
   * Subscribe to an event
   */
  on(event: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }

    this.eventHandlers.get(event)!.add(handler)

    if (this.socket) {
      this.socket.on(event, handler)
    }
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler?: EventHandler): void {
    if (handler) {
      this.eventHandlers.get(event)?.delete(handler)

      if (this.socket) {
        this.socket.off(event, handler)
      }
    } else {
      this.eventHandlers.delete(event)

      if (this.socket) {
        this.socket.off(event)
      }
    }
  }

  /**
   * Emit an event to the server
   */
  emit(event: string, data?: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
    } else {
      console.warn('[WebSocket] Cannot emit - not connected')
    }
  }

  /**
   * Subscribe to a room
   */
  subscribeToRoom(room: string): void {
    this.emit('subscribe', { room })
  }

  /**
   * Unsubscribe from a room
   */
  unsubscribeFromRoom(room: string): void {
    this.emit('unsubscribe', { room })
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false
  }

  /**
   * Set up internal event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected to server')
      this.reconnectAttempts = 0

      // Re-register all event handlers after reconnection
      this.eventHandlers.forEach((handlers, event) => {
        handlers.forEach((handler) => {
          this.socket?.on(event, handler)
        })
      })
    })

    this.socket.on('connected', (data: any) => {
      console.log('[WebSocket] Connection confirmed:', data)
    })

    this.socket.on('disconnect', (reason: string) => {
      console.log('[WebSocket] Disconnected:', reason)
    })

    this.socket.on('connect_error', (error: Error) => {
      this.reconnectAttempts++
      console.error('[WebSocket] Connection error:', error.message)

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('[WebSocket] Max reconnection attempts reached')
        this.disconnect()
      }
    })

    this.socket.on('error', (error: any) => {
      console.error('[WebSocket] Error:', error)
    })
  }

  /**
   * Subscribe to contact updates
   */
  onContactUpdate(handler: EventHandler): void {
    this.on('contact:updated', handler)
  }

  /**
   * Subscribe to contact creation
   */
  onContactCreated(handler: EventHandler): void {
    this.on('contact:created', handler)
  }

  /**
   * Subscribe to contact deletion
   */
  onContactDeleted(handler: EventHandler): void {
    this.on('contact:deleted', handler)
  }

  /**
   * Subscribe to deal updates
   */
  onDealUpdate(handler: EventHandler): void {
    this.on('deal:updated', handler)
  }

  /**
   * Subscribe to deal creation
   */
  onDealCreated(handler: EventHandler): void {
    this.on('deal:created', handler)
  }

  /**
   * Subscribe to deal deletion
   */
  onDealDeleted(handler: EventHandler): void {
    this.on('deal:deleted', handler)
  }

  /**
   * Subscribe to notifications
   */
  onNotification(handler: EventHandler): void {
    this.on('notification', handler)
  }

  /**
   * Subscribe to system broadcasts
   */
  onSystemBroadcast(handler: EventHandler): void {
    this.on('system:broadcast', handler)
  }
}

// Export singleton instance
export const websocketService = new WebSocketService()
