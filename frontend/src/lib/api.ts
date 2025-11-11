import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// In development, we use Vite proxy which already maps /api -> http://localhost:3000/api
// In production, VITE_API_URL will be set to the full backend URL including /api
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    // Only logout if it's a 401 on a critical auth endpoint
    // Don't logout on email integration failures or other optional features
    if (error.response?.status === 401) {
      const url = originalRequest?.url || ''

      // Critical endpoints that should trigger logout
      const criticalEndpoints = [
        '/v1/auth/me',
        '/v1/auth/refresh',
        '/v1/users/profile',
      ]

      // Check if this is a critical endpoint or repeated 401
      const isCriticalEndpoint = criticalEndpoints.some(endpoint => url.includes(endpoint))

      if (isCriticalEndpoint || originalRequest._retry) {
        // This is a critical auth failure or we already tried refreshing
        useAuthStore.getState().logout()
        window.location.href = '/login'
      } else {
        // Mark that we've tried once to prevent infinite loops
        originalRequest._retry = true

        // For non-critical endpoints, silently fail
        // Don't auto-logout - let the component handle it
        // No console warning needed - these are expected when features aren't configured
      }
    }
    return Promise.reject(error)
  }
)

export default api
