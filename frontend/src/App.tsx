import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import Contacts from './pages/Contacts'
import ContactDetail from './pages/ContactDetail'
import Deals from './pages/Deals'
import DealDetail from './pages/DealDetail'
import Tasks from './pages/Tasks'
import Accounts from './pages/Accounts'
import AccountDetail from './pages/AccountDetail'
import Notes from './pages/Notes'
import Activities from './pages/Activities'
import Settings from './pages/Settings'
import Emails from './pages/Emails'
import Login from './pages/Login'
import EmailOAuthCallback from './pages/EmailOAuthCallback'
import { useAuthStore } from './store/authStore'

function App() {
  const { isAuthenticated, isLoading, initialize } = useAuthStore()

  // Initialize auth state on mount
  useEffect(() => {
    initialize()
  }, [initialize])

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/email/callback" element={<EmailOAuthCallback />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/contacts/:id" element={<ContactDetail />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/deals/:id" element={<DealDetail />} />
        <Route path="/tasks" element={<Tasks />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/accounts/:id" element={<AccountDetail />} />
        <Route path="/notes" element={<Notes />} />
        <Route path="/activities" element={<Activities />} />
        <Route path="/emails" element={<Emails />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/email/callback" element={<EmailOAuthCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  )
}

export default App
