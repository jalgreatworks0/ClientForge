import { useState, useEffect } from 'react'
import { X, Link as LinkIcon, Search } from 'lucide-react'
import { useEmailStore, type EmailMessage } from '../../store/emailStore'
import api from '../../lib/api'

interface LinkEmailModalProps {
  message: EmailMessage
  onClose: () => void
  onLinked: () => void
}

export default function LinkEmailModal({ message, onClose, onLinked }: LinkEmailModalProps) {
  const { linkMessage, isLoading } = useEmailStore()
  const [linkType, setLinkType] = useState<'contact' | 'deal'>('contact')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    if (searchQuery.length >= 2) {
      handleSearch()
    } else {
      setSearchResults([])
    }
  }, [searchQuery, linkType])

  const handleSearch = async () => {
    setIsSearching(true)
    try {
      if (linkType === 'contact') {
        const response = await api.get('/v1/contacts', {
          params: { search: searchQuery, limit: 10 },
        })
        setSearchResults(response.data.data)
      } else {
        const response = await api.get('/v1/deals', {
          params: { search: searchQuery, limit: 10 },
        })
        setSearchResults(response.data.data)
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleLink = async () => {
    if (!selectedId) return

    try {
      await linkMessage(
        message.id,
        linkType === 'contact' ? selectedId : undefined,
        linkType === 'deal' ? selectedId : undefined
      )
      onLinked()
    } catch (error) {
      console.error('Failed to link email:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Link Email to CRM
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Email Info */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email Subject</div>
            <div className="font-medium text-gray-900 dark:text-white">
              {message.subject || '(No subject)'}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              From: {message.from_email}
            </div>
          </div>

          {/* Link Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Link to
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setLinkType('contact')
                  setSearchQuery('')
                  setSearchResults([])
                  setSelectedId('')
                }}
                className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${
                  linkType === 'contact'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Contact
              </button>
              <button
                onClick={() => {
                  setLinkType('deal')
                  setSearchQuery('')
                  setSearchResults([])
                  setSelectedId('')
                }}
                className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${
                  linkType === 'deal'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Deal
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search {linkType === 'contact' ? 'Contacts' : 'Deals'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search ${linkType === 'contact' ? 'contacts' : 'deals'}...`}
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="mb-4">
              {isSearching ? (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                  No {linkType === 'contact' ? 'contacts' : 'deals'} found
                </div>
              ) : (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700 max-h-64 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => setSelectedId(result.id)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        selectedId === result.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                          : ''
                      }`}
                    >
                      {linkType === 'contact' ? (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {result.firstName} {result.lastName}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {result.email}
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {result.title}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {result.company} • ${result.value?.toLocaleString()}
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Current Links */}
          {(message.contactId || message.dealId) && (
            <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-1">
                Current Links
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-400">
                This email is already linked to a {message.contactId ? 'contact' : ''}
                {message.contactId && message.dealId ? ' and ' : ''}
                {message.dealId ? 'deal' : ''}.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={!selectedId || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <LinkIcon className="w-4 h-4" />
            {isLoading ? 'Linking...' : 'Link Email'}
          </button>
        </div>
      </div>
    </div>
  )
}
