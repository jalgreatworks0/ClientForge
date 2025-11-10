import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../lib/api'

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
  login: (email: string, password: string, tenantId?: string) => Promise<void>
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string, user: User) => void
}

// Default tenant ID for development (will be replaced with proper tenant selection)
const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001'

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

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
        })
      },

      logout: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      setTokens: (accessToken: string, refreshToken: string, user: User) => {
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        })
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)
