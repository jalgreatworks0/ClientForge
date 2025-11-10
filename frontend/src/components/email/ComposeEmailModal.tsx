import { useState } from 'react'
import { X, Send } from 'lucide-react'
import { useEmailStore } from '../../store/emailStore'

interface ComposeEmailModalProps {
  onClose: () => void
  replyTo?: {
    email: string
    name?: string
    subject?: string
    messageId?: string
  }
}

export default function ComposeEmailModal({ onClose, replyTo }: ComposeEmailModalProps) {
  const { accounts, sendEmail, isLoading } = useEmailStore()
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '')
  const [to, setTo] = useState(replyTo?.email || '')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState(
    replyTo?.subject ? `Re: ${replyTo.subject}` : ''
  )
  const [bodyText, setBodyText] = useState('')
  const [error, setError] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)

  const parseEmailAddresses = (emails: string) => {
    return emails
      .split(',')
      .map((email) => email.trim())
      .filter((email) => email)
      .map((email) => ({ email }))
  }

  const handleSend = async () => {
    if (!selectedAccountId) {
      setError('Please select an email account')
      return
    }

    if (!to.trim()) {
      setError('Please enter at least one recipient')
      return
    }

    if (!subject.trim()) {
      setError('Please enter a subject')
      return
    }

    if (!bodyText.trim()) {
      setError('Please enter a message')
      return
    }

    try {
      setError('')
      await sendEmail(selectedAccountId, {
        to: parseEmailAddresses(to),
        cc: cc.trim() ? parseEmailAddresses(cc) : undefined,
        bcc: bcc.trim() ? parseEmailAddresses(bcc) : undefined,
        subject,
        bodyText,
        replyTo: replyTo?.messageId,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to send email')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {replyTo ? 'Reply to Email' : 'Compose Email'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Account Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                From
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.email} ({account.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                To
              </label>
              <input
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com, another@example.com"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <div className="mt-2 flex gap-3">
                {!showCc && (
                  <button
                    onClick={() => setShowCc(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Add Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    onClick={() => setShowBcc(true)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Add Bcc
                  </button>
                )}
              </div>
            </div>

            {/* Cc */}
            {showCc && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cc
                </label>
                <input
                  type="text"
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="cc@example.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {/* Bcc */}
            {showBcc && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bcc
                </label>
                <input
                  type="text"
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="bcc@example.com"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message
              </label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                rows={12}
                placeholder="Write your message here..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
              />
            </div>
          </div>
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
            onClick={handleSend}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isLoading ? 'Sending...' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  )
}
