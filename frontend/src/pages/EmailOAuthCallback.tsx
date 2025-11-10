import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

export default function EmailOAuthCallback() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (code && state) {
      try {
        // Parse state to get provider
        const stateData = JSON.parse(atob(state))
        const provider = stateData.provider

        // Send message to opener window
        if (window.opener) {
          window.opener.postMessage(
            {
              type: 'oauth-callback',
              provider,
              code,
            },
            window.location.origin
          )
        }
      } catch (error) {
        console.error('Failed to process OAuth callback:', error)
      }
    }
  }, [searchParams])

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Completing authorization...</p>
        <p className="text-sm text-gray-500 mt-2">You can close this window once complete</p>
      </div>
    </div>
  )
}
