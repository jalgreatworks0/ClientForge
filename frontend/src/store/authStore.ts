import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'
import { websocketService } from '../services/websocket.service'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: string
  tenantId: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string, tenantId?: string) => Promise<void>
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string, user: User) => void
  initialize: () => Promise<void>
}

// Default tenant ID for development (will be replaced with proper tenant selection)
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true,

      initialize: async () => {
        const { accessToken } = get()
        if (accessToken) {
          try {
            // Verify token is still valid
            await api.get('/v1/auth/verify')
            set({ isLoading: false })

            // Connect to WebSocket with valid token
            websocketService.connect(accessToken)
          } catch (error) {
            // Token expired or invalid, logout
            console.warn('Token verification failed, logging out')
            get().logout()
          }
        } else {
          set({ isLoading: false })
        }
      },

      login: async (email: string, password: string, tenantId?: string) => {
        const response = await api.post('/v1/auth/login', {
          email,
          password,
          tenantId: tenantId || DEFAULT_TENANT_ID,
        })

        const { user, tokens } = response.data.data
        const { accessToken, refreshToken } = tokens

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          isLoading: false,
        })

        // Connect to WebSocket after successful login
        websocketService.connect(accessToken)
      },

      logout: () => {
        // Disconnect WebSocket before clearing state
        websocketService.disconnect()

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      setTokens: (accessToken: string, refreshToken: string, user: User) => {
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        })
      },
    }),
    {
      name: 'auth-storage',
      onRehydrateStorage: () => (state) => {
        // After rehydration from localStorage, verify the token
        if (state) {
          state.initialize()
        }
      },
    }
  )
)
