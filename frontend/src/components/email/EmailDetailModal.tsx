import { X, Reply, Link as LinkIcon, User, Building2 } from 'lucide-react'
import type { EmailMessage } from '../../store/emailStore'

interface EmailDetailModalProps {
  message: EmailMessage
  onClose: () => void
}

export default function EmailDetailModal({ message, onClose }: EmailDetailModalProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {message.subject || '(No subject)'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Email Header Info */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="space-y-3">
              {/* From */}
              <div className="flex items-start gap-3">
                <div className="w-24 text-sm font-medium text-gray-500 dark:text-gray-400">
                  From:
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-white">
                    {message.from_name || message.from_email}
                  </div>
                  {message.from_name && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {message.from_email}
                    </div>
                  )}
                </div>
              </div>

              {/* To */}
              <div className="flex items-start gap-3">
                <div className="w-24 text-sm font-medium text-gray-500 dark:text-gray-400">
                  To:
                </div>
                <div className="flex-1">
                  {message.to_addresses.map((addr, idx) => (
                    <div key={idx} className="text-gray-900 dark:text-white">
                      {addr.name || addr.email}
                    </div>
                  ))}
                </div>
              </div>

              {/* Cc */}
              {message.cc_addresses && message.cc_addresses.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="w-24 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Cc:
                  </div>
                  <div className="flex-1">
                    {message.cc_addresses.map((addr, idx) => (
                      <div key={idx} className="text-gray-900 dark:text-white">
                        {addr.name || addr.email}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Date */}
              <div className="flex items-start gap-3">
                <div className="w-24 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Date:
                </div>
                <div className="flex-1 text-gray-900 dark:text-white">
                  {formatDate(message.receivedAt)}
                </div>
              </div>

              {/* CRM Links */}
              {(message.contactId || message.dealId) && (
                <div className="flex items-start gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="w-24 text-sm font-medium text-gray-500 dark:text-gray-400">
                    Linked to:
                  </div>
                  <div className="flex-1 flex gap-3">
                    {message.contactId && (
                      <a
                        href={`/contacts/${message.contactId}`}
                        className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        View Contact
                      </a>
                    )}
                    {message.dealId && (
                      <a
                        href={`/deals/${message.dealId}`}
                        className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                      >
                        <Building2 className="w-4 h-4" />
                        View Deal
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Email Body */}
          <div className="p-6">
            {message.bodyHtml ? (
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
              />
            ) : (
              <div className="whitespace-pre-wrap text-gray-900 dark:text-white">
                {message.bodyText}
              </div>
            )}
          </div>

          {/* Labels */}
          {message.labels && message.labels.length > 0 && (
            <div className="px-6 pb-6">
              <div className="flex flex-wrap gap-2">
                {message.labels.map((label, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                  >
                    {label}
                  </span>
                ))}
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
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
