import { useParams, Link } from 'react-router-dom'

export default function AccountDetail() {
  const { id } = useParams()

  const account = {
    id,
    name: 'Acme Corporation',
    industry: 'Technology',
    employees: 500,
    revenue: 50000000,
    website: 'www.acmecorp.com',
    phone: '+1 555-0100',
    address: '123 Tech Street, San Francisco, CA 94102',
    status: 'active',
  }

  const contacts = [
    { id: '1', name: 'Sarah Johnson', title: 'VP of Sales', email: 'sarah.j@acme.com', phone: '+1 555-0101' },
    { id: '2', name: 'Michael Brown', title: 'CTO', email: 'm.brown@acme.com', phone: '+1 555-0102' },
  ]

  const deals = [
    { id: '1', name: 'Enterprise Package', value: 125000, stage: 'Proposal' },
    { id: '2', name: 'Professional Services', value: 45000, stage: 'Negotiation' },
  ]

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to="/accounts" className="text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-50 font-syne-mono text-sm transition-colors">
            ← Back to Accounts
          </Link>
          <h1 className="text-5xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mt-2 mb-2">{account.name}</h1>
          <p className="text-charcoal-600 dark:text-charcoal-400 font-syne-mono text-sm">{account.industry}</p>
        </div>
        <div className="flex space-x-3">
          <button className="btn btn-secondary">
            Edit
          </button>
          <button className="btn btn-primary">
            + New Deal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Account Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="floating-box p-6">
            <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50 mb-4">Account Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Revenue</p>
                <p className="text-2xl font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">{formatCurrency(account.revenue)}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Employees</p>
                <p className="text-2xl font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                  {new Intl.NumberFormat('en-US').format(account.employees)}
                </p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Website</p>
                <a href={`https://${account.website}`} className="text-charcoal-900 dark:text-charcoal-50 hover:text-charcoal-700 dark:hover:text-charcoal-300 font-syne-mono underline transition-colors">
                  {account.website}
                </a>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Phone</p>
                <p className="font-syne-mono font-medium text-charcoal-900 dark:text-charcoal-50">{account.phone}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Address</p>
                <p className="font-syne-mono font-medium text-charcoal-900 dark:text-charcoal-50">{account.address}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Status</p>
                <span className="badge badge-success">
                  {account.status}
                </span>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="floating-box p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50">Contacts</h2>
              <button className="px-3 py-1 text-sm font-syne text-charcoal-900 dark:text-charcoal-50 hover:text-charcoal-700 dark:hover:text-charcoal-300 font-medium transition-colors">
                + Add Contact
              </button>
            </div>
            <div className="space-y-4">
              {contacts.map((contact) => (
                <Link
                  key={contact.id}
                  to={`/contacts/${contact.id}`}
                  className="flex items-center p-4 border border-alabaster-600/30 dark:border-dark-border rounded-lg hover:bg-alabaster-100 dark:hover:bg-dark-hover transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-charcoal-900 dark:bg-charcoal-700 flex items-center justify-center text-white font-syne font-semibold">
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50">{contact.name}</p>
                    <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">{contact.title}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">{contact.email}</p>
                    <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">{contact.phone}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Deals */}
        <div className="space-y-6">
          <div className="floating-box p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50">Active Deals</h2>
              <span className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">{deals.length} deals</span>
            </div>
            <div className="space-y-3">
              {deals.map((deal) => (
                <Link
                  key={deal.id}
                  to={`/deals/${deal.id}`}
                  className="block p-4 border border-alabaster-600/30 dark:border-dark-border rounded-lg hover:bg-alabaster-100 dark:hover:bg-dark-hover transition-colors"
                >
                  <p className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50">{deal.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-syne-mono font-semibold text-charcoal-900 dark:text-charcoal-50">
                      {formatCurrency(deal.value)}
                    </span>
                    <span className="badge badge-info">
                      {deal.stage}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-alabaster-600/30 dark:border-dark-border">
              <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                Total Pipeline: <span className="font-semibold text-charcoal-900 dark:text-charcoal-50">
                  {formatCurrency(deals.reduce((sum, d) => sum + d.value, 0))}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
