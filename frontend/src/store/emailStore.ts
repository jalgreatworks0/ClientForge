import { create } from 'zustand'
import api from '../lib/api'

export interface EmailAccount {
  id: string
  userId: string
  tenantId: string
  provider: 'gmail' | 'outlook'
  email: string
  isActive: boolean
  syncEnabled: boolean
  lastSyncAt: string | null
  createdAt: string
  updatedAt: string
}

export interface EmailMessage {
  id: string
  accountId: string
  tenantId: string
  messageId: string
  threadId?: string
  from_name?: string
  from_email: string
  to_addresses: { email: string; name?: string }[]
  cc_addresses?: { email: string; name?: string }[]
  subject?: string
  bodyText?: string
  bodyHtml?: string
  receivedAt: string
  sentAt?: string
  isRead: boolean
  hasAttachments: boolean
  labels?: string[]
  contactId?: string
  dealId?: string
  createdAt: string
}

export interface EmailSearchFilters {
  from?: string
  subject?: string
  isRead?: boolean
  dateFrom?: Date
  dateTo?: Date
  contactId?: string
  dealId?: string
}

interface EmailState {
  accounts: EmailAccount[]
  messages: EmailMessage[]
  selectedMessage: EmailMessage | null
  isLoading: boolean
  error: string | null
  totalMessages: number
  currentPage: number

  // Actions
  fetchAccounts: () => Promise<void>
  connectAccount: (provider: 'gmail' | 'outlook') => Promise<string>
  handleOAuthCallback: (code: string, provider: 'gmail' | 'outlook') => Promise<void>
  disconnectAccount: (accountId: string) => Promise<void>
  syncAccount: (accountId: string) => Promise<void>

  fetchMessages: (filters?: EmailSearchFilters, page?: number) => Promise<void>
  fetchMessage: (messageId: string) => Promise<void>
  sendEmail: (accountId: string, emailData: any) => Promise<void>
  linkMessage: (messageId: string, contactId?: string, dealId?: string) => Promise<void>

  setSelectedMessage: (message: EmailMessage | null) => void
  clearError: () => void
}

export const useEmailStore = create<EmailState>((set, get) => ({
  accounts: [],
  messages: [],
  selectedMessage: null,
  isLoading: false,
  error: null,
  totalMessages: 0,
  currentPage: 1,

  fetchAccounts: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get('/v1/email/accounts')
      set({ accounts: response.data.data, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch email accounts',
        isLoading: false
      })
    }
  },

  connectAccount: async (provider: 'gmail' | 'outlook') => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/v1/email/auth/${provider}`)
      const { authUrl } = response.data.data
      set({ isLoading: false })
      return authUrl
    } catch (error: any) {
      set({
        error: error.response?.data?.message || `Failed to connect ${provider} account`,
        isLoading: false
      })
      throw error
    }
  },

  handleOAuthCallback: async (code: string, provider: 'gmail' | 'outlook') => {
    set({ isLoading: true, error: null })
    try {
      await api.post('/v1/email/callback', { code, provider })
      // Refresh accounts list
      await get().fetchAccounts()
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to complete OAuth flow',
        isLoading: false
      })
      throw error
    }
  },

  disconnectAccount: async (accountId: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/v1/email/accounts/${accountId}`)
      // Remove from local state
      set(state => ({
        accounts: state.accounts.filter(acc => acc.id !== accountId),
        isLoading: false
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to disconnect account',
        isLoading: false
      })
      throw error
    }
  },

  syncAccount: async (accountId: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.post(`/v1/email/accounts/${accountId}/sync`)
      // Refresh messages after sync
      await get().fetchMessages()
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to sync account',
        isLoading: false
      })
      throw error
    }
  },

  fetchMessages: async (filters?: EmailSearchFilters, page: number = 1) => {
    set({ isLoading: true, error: null, currentPage: page })
    try {
      const params: any = { page, limit: 50 }
      if (filters) {
        if (filters.from) params.from = filters.from
        if (filters.subject) params.subject = filters.subject
        if (filters.isRead !== undefined) params.isRead = filters.isRead
        if (filters.dateFrom) params.dateFrom = filters.dateFrom.toISOString()
        if (filters.dateTo) params.dateTo = filters.dateTo.toISOString()
        if (filters.contactId) params.contactId = filters.contactId
        if (filters.dealId) params.dealId = filters.dealId
      }

      const response = await api.get('/v1/email/messages', { params })
      set({
        messages: response.data.data,
        totalMessages: response.data.pagination.total,
        isLoading: false
      })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch messages',
        isLoading: false
      })
    }
  },

  fetchMessage: async (messageId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get(`/v1/email/messages/${messageId}`)
      set({ selectedMessage: response.data.data, isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch message',
        isLoading: false
      })
    }
  },

  sendEmail: async (accountId: string, emailData: any) => {
    set({ isLoading: true, error: null })
    try {
      await api.post('/v1/email/send', { accountId, ...emailData })
      set({ isLoading: false })
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to send email',
        isLoading: false
      })
      throw error
    }
  },

  linkMessage: async (messageId: string, contactId?: string, dealId?: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.patch(`/v1/email/messages/${messageId}/link`, { contactId, dealId })
      // Update message in local state
      set(state => ({
        messages: state.messages.map(msg =>
          msg.id === messageId ? { ...msg, contactId, dealId } : msg
        ),
        selectedMessage: state.selectedMessage?.id === messageId
          ? { ...state.selectedMessage, contactId, dealId }
          : state.selectedMessage,
        isLoading: false
      }))
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to link message',
        isLoading: false
      })
      throw error
    }
  },

  setSelectedMessage: (message: EmailMessage | null) => {
    set({ selectedMessage: message })
  },

  clearError: () => {
    set({ error: null })
  },
}))
