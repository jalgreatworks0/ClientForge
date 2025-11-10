import { useEffect, useState } from 'react'
import { Mail, RefreshCw, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { useEmailStore } from '../../store/emailStore'

export default function EmailIntegrationSettings() {
  const {
    accounts,
    isLoading,
    error,
    fetchAccounts,
    connectAccount,
    disconnectAccount,
    syncAccount,
    clearError,
  } = useEmailStore()

  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null)

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const handleConnectGmail = async () => {
    try {
      const authUrl = await connectAccount('gmail')
      // Open OAuth popup
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        authUrl,
        'Gmail OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // Listen for OAuth callback
      window.addEventListener('message', async (event) => {
        if (event.data.type === 'oauth-callback' && event.data.provider === 'gmail') {
          const { code } = event.data
          popup?.close()
          await useEmailStore.getState().handleOAuthCallback(code, 'gmail')
        }
      })
    } catch (error) {
      console.error('Failed to connect Gmail:', error)
    }
  }

  const handleConnectOutlook = async () => {
    try {
      const authUrl = await connectAccount('outlook')
      // Open OAuth popup
      const width = 600
      const height = 700
      const left = window.screenX + (window.outerWidth - width) / 2
      const top = window.screenY + (window.outerHeight - height) / 2

      const popup = window.open(
        authUrl,
        'Outlook OAuth',
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // Listen for OAuth callback
      window.addEventListener('message', async (event) => {
        if (event.data.type === 'oauth-callback' && event.data.provider === 'outlook') {
          const { code } = event.data
          popup?.close()
          await useEmailStore.getState().handleOAuthCallback(code, 'outlook')
        }
      })
    } catch (error) {
      console.error('Failed to connect Outlook:', error)
    }
  }

  const handleDisconnect = async (accountId: string) => {
    if (confirm('Are you sure you want to disconnect this email account?')) {
      try {
        await disconnectAccount(accountId)
      } catch (error) {
        console.error('Failed to disconnect account:', error)
      }
    }
  }

  const handleSync = async (accountId: string) => {
    setSyncingAccountId(accountId)
    try {
      await syncAccount(accountId)
    } catch (error) {
      console.error('Failed to sync account:', error)
    } finally {
      setSyncingAccountId(null)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Email Integration
      </h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={clearError}
            className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
          >
            ×
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* Connect Buttons */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">
            Connect Email Account
          </h3>
          <div className="flex gap-3">
            <button
              onClick={handleConnectGmail}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <Mail className="w-5 h-5 text-red-600" />
              <span className="font-medium text-gray-900 dark:text-white">Connect Gmail</span>
            </button>

            <button
              onClick={handleConnectOutlook}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <Mail className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900 dark:text-white">Connect Outlook</span>
            </button>
          </div>
        </div>

        {/* Connected Accounts */}
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white mb-3">
            Connected Accounts ({accounts.length})
          </h3>

          {accounts.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
              <Mail className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400">No email accounts connected</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                Connect Gmail or Outlook to sync your emails with the CRM
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="p-4 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Mail
                        className={`w-5 h-5 mt-1 ${
                          account.provider === 'gmail' ? 'text-red-600' : 'text-blue-600'
                        }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {account.email}
                          </h4>
                          {account.isActive && (
                            <span className="flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                          {account.provider}
                        </p>
                        {account.lastSyncAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Last synced: {new Date(account.lastSyncAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSync(account.id)}
                        disabled={syncingAccountId === account.id}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                        title="Sync now"
                      >
                        <RefreshCw
                          className={`w-4 h-4 ${syncingAccountId === account.id ? 'animate-spin' : ''}`}
                        />
                      </button>
                      <button
                        onClick={() => handleDisconnect(account.id)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Disconnect"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
            About Email Integration
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• Automatically sync emails from your Gmail or Outlook account</li>
            <li>• Link emails to contacts and deals</li>
            <li>• Send emails directly from the CRM</li>
            <li>• View email history and conversations in one place</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
