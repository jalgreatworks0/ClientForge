import axios from 'axios'
import { useAuthStore } from '../store/authStore'

// In production, VITE_API_URL will be set to the backend host from Render
// We need to append /api to it since Render provides just the host
const API_HOST = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const API_BASE_URL = API_HOST.endsWith('/api') ? API_HOST : `${API_HOST}/api`

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
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
