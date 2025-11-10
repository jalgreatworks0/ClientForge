import { NavLink } from 'react-router-dom'
import { Settings as SettingsIcon } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: '📊' },
  { name: 'Contacts', href: '/contacts', icon: '👥' },
  { name: 'Accounts', href: '/accounts', icon: '🏢' },
  { name: 'Deals', href: '/deals', icon: '💼' },
  { name: 'Tasks', href: '/tasks', icon: '✓' },
  { name: 'Activities', href: '/activities', icon: '📅' },
  { name: 'Notes', href: '/notes', icon: '📝' },
]

export default function Sidebar() {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          ClientForge
        </h1>
        <p className="text-xs text-gray-400 mt-1">Enterprise CRM v3.0</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span className="text-xl mr-3">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Settings Link */}
      <div className="p-4 border-t border-gray-800">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center px-4 py-3 rounded-lg transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`
          }
        >
          <SettingsIcon className="w-5 h-5 mr-3" />
          <span className="font-medium">Settings</span>
        </NavLink>
      </div>

      {/* User info */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-sm font-bold">JD</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">John Doe</p>
            <p className="text-xs text-gray-400">Admin</p>
          </div>
        </div>
      </div>
    </div>
  )
}
