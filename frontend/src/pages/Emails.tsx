import { useEffect, useState } from 'react'
import { Mail, Search, Filter, RefreshCw, Send, Link as LinkIcon } from 'lucide-react'
import { useEmailStore } from '../store/emailStore'
import type { EmailSearchFilters } from '../store/emailStore'
import ComposeEmailModal from '../components/email/ComposeEmailModal'
import EmailDetailModal from '../components/email/EmailDetailModal'
import LinkEmailModal from '../components/email/LinkEmailModal'

export default function Emails() {
  const {
    messages,
    accounts,
    isLoading,
    totalMessages,
    currentPage,
    fetchMessages,
    fetchAccounts,
    setSelectedMessage,
    selectedMessage,
  } = useEmailStore()

  const [showFilters, setShowFilters] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [filters, setFilters] = useState<EmailSearchFilters>({})

  useEffect(() => {
    fetchAccounts()
    fetchMessages()
  }, [fetchAccounts, fetchMessages])

  const handleRefresh = () => {
    fetchMessages(filters, currentPage)
  }

  const handleFilter = () => {
    fetchMessages(filters, 1)
  }

  const handlePageChange = (page: number) => {
    fetchMessages(filters, page)
  }

  const handleMessageClick = (message: any) => {
    setSelectedMessage(message)
    setShowDetail(true)
  }

  const handleLinkEmail = (message: any) => {
    setSelectedMessage(message)
    setShowLinkModal(true)
  }

  const totalPages = Math.ceil(totalMessages / 50)

  if (accounts.length === 0 && !isLoading) {
    return (
      <div className="p-8">
        <div className="text-center py-20">
          <Mail className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Email Accounts Connected
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect your Gmail or Outlook account to start syncing emails
          </p>
          <a
            href="/settings"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Mail className="w-5 h-5" />
            Connect Email Account
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Emails</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {totalMessages} messages across {accounts.length} account{accounts.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            Compose
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>

          {Object.keys(filters).length > 0 && (
            <button
              onClick={() => {
                setFilters({})
                fetchMessages({}, 1)
              }}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="From email..."
              value={filters.from || ''}
              onChange={(e) => setFilters({ ...filters, from: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />

            <input
              type="text"
              placeholder="Subject..."
              value={filters.subject || ''}
              onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            />

            <select
              value={filters.isRead === undefined ? '' : filters.isRead.toString()}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  isRead: e.target.value === '' ? undefined : e.target.value === 'true',
                })
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
            >
              <option value="">All emails</option>
              <option value="false">Unread only</option>
              <option value="true">Read only</option>
            </select>

            <button
              onClick={handleFilter}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        )}
      </div>

      {/* Email List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading && messages.length === 0 ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading emails...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No emails found</p>
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      From
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Subject
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {messages.map((message) => (
                    <tr
                      key={message.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => handleMessageClick(message)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {!message.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full mr-2"></div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {message.from_name || message.from_email}
                            </div>
                            {message.from_name && (
                              <div className="text-sm text-gray-500">{message.from_email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 dark:text-white">
                          {message.subject || '(No subject)'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(message.receivedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLinkEmail(message)
                          }}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                          title="Link to contact/deal"
                        >
                          <LinkIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Showing {(currentPage - 1) * 50 + 1} to{' '}
                  {Math.min(currentPage * 50, totalMessages)} of {totalMessages} emails
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showCompose && <ComposeEmailModal onClose={() => setShowCompose(false)} />}
      {showDetail && selectedMessage && (
        <EmailDetailModal message={selectedMessage} onClose={() => setShowDetail(false)} />
      )}
      {showLinkModal && selectedMessage && (
        <LinkEmailModal
          message={selectedMessage}
          onClose={() => setShowLinkModal(false)}
          onLinked={() => {
            setShowLinkModal(false)
            handleRefresh()
          }}
        />
      )}
    </div>
  )
}
