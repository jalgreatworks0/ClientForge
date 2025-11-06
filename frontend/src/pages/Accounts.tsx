import { Link } from 'react-router-dom'

const mockAccounts = [
  { id: '1', name: 'Acme Corporation', industry: 'Technology', employees: 500, revenue: 50000000, contacts: 12, deals: 3, status: 'active' },
  { id: '2', name: 'Beta Industries', industry: 'Manufacturing', employees: 250, revenue: 25000000, contacts: 8, deals: 2, status: 'active' },
  { id: '3', name: 'Gamma LLC', industry: 'Retail', employees: 100, revenue: 10000000, contacts: 5, deals: 1, status: 'inactive' },
  { id: '4', name: 'Delta Enterprises', industry: 'Healthcare', employees: 1000, revenue: 100000000, contacts: 20, deals: 5, status: 'active' },
]

export default function Accounts() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-2">
            Accounts
          </h1>
          <p className="text-charcoal-600 dark:text-charcoal-400 font-syne-mono text-sm">{mockAccounts.length} companies</p>
        </div>
        <button className="btn btn-primary">
          + Add Account
        </button>
      </div>

      {/* Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {mockAccounts.map((account) => (
          <Link
            key={account.id}
            to={`/accounts/${account.id}`}
            className="floating-box p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50">{account.name}</h3>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mt-1">{account.industry}</p>
              </div>
              <span
                className={`badge ${
                  account.status === 'active' ? 'badge-success' : 'badge-danger'
                }`}
              >
                {account.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">Revenue</p>
                <p className="font-syne-mono font-semibold text-charcoal-900 dark:text-charcoal-50">{formatCurrency(account.revenue)}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">Employees</p>
                <p className="font-syne-mono font-semibold text-charcoal-900 dark:text-charcoal-50">{formatNumber(account.employees)}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">Contacts</p>
                <p className="font-syne-mono font-semibold text-charcoal-900 dark:text-charcoal-50">{account.contacts}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">Active Deals</p>
                <p className="font-syne-mono font-semibold text-charcoal-900 dark:text-charcoal-50">{account.deals}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-alabaster-600/30 dark:border-dark-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-charcoal-800 dark:bg-charcoal-700 border-2 border-white dark:border-dark-secondary"></div>
                  <div className="w-8 h-8 rounded-full bg-charcoal-700 dark:bg-charcoal-600 border-2 border-white dark:border-dark-secondary"></div>
                  <div className="w-8 h-8 rounded-full bg-charcoal-600 dark:bg-charcoal-500 border-2 border-white dark:border-dark-secondary"></div>
                </div>
                <span className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">+{account.contacts - 3} more</span>
              </div>
              <svg className="h-5 w-5 text-charcoal-400 dark:text-charcoal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
