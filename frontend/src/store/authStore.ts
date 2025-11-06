import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setTokens: (accessToken: string, refreshToken: string, user: User) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        // This will be implemented with actual API call
        const mockUser: User = {
          id: 'user-123',
          email,
          firstName: 'John',
          lastName: 'Doe',
          role: 'Admin',
          tenantId: 'tenant-123',
        }

        set({
          user: mockUser,
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
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
