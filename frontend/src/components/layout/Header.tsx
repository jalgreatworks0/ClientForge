import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'

export default function Header() {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const navItems = [
    { name: 'Dashboard', path: '/', icon: '📊' },
    { name: 'Contacts', path: '/contacts', icon: '👥' },
    { name: 'Accounts', path: '/accounts', icon: '🏢' },
    { name: 'Deals', path: '/deals', icon: '💼' },
    { name: 'Emails', path: '/emails', icon: '📧' },
    { name: 'Analytics', path: '/analytics', icon: '📈' },
    { name: 'Tasks', path: '/tasks', icon: '✓' },
    { name: 'Activities', path: '/activities', icon: '📅' },
    { name: 'Notes', path: '/notes', icon: '📝' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
  ]

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <header className="bg-white border-b border-gray-200">
      {/* Top Bar */}
      <div className="px-6 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="ClientForge"
              className="w-8 h-8 object-contain"
            />
            <div>
              <h1 className="text-lg font-syne font-bold text-charcoal-900">ClientForge</h1>
              <p className="text-xs font-syne-mono text-charcoal-600">powered by Abstract Creatives</p>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search contacts, deals, companies (Ctrl+K)"
                className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg font-syne-mono text-sm focus:outline-none focus:ring-2 focus:ring-charcoal-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-600 hover:text-charcoal-900 hover:bg-gray-100 rounded-lg transition-colors">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </button>

            <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
              <div className="text-right">
                <p className="text-sm font-syne font-semibold text-charcoal-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs font-syne-mono text-charcoal-600">Admin</p>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm font-syne font-medium text-charcoal-700 hover:text-charcoal-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6">
        <nav className="flex items-center space-x-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center space-x-2 px-4 py-3 font-syne font-medium text-sm rounded-t-lg transition-colors
                ${
                  isActive(item.path)
                    ? 'bg-gray-50 text-charcoal-900 border-b-2 border-charcoal-900'
                    : 'text-charcoal-600 hover:text-charcoal-900 hover:bg-gray-50'
                }
              `}
            >
              <span>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
