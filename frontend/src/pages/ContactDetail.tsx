import { useParams, Link } from 'react-router-dom'

export default function ContactDetail() {
  const { id } = useParams()

  // Mock data
  const contact = {
    id,
    firstName: 'Sarah',
    lastName: 'Johnson',
    email: 'sarah.j@acme.com',
    phone: '+1 555-0101',
    company: 'Acme Corp',
    title: 'VP of Sales',
    status: 'active',
    createdAt: '2024-01-15',
  }

  const activities = [
    { id: 1, type: 'email', description: 'Sent follow-up email', date: '2024-03-01' },
    { id: 2, type: 'call', description: 'Phone call - Discussed pricing', date: '2024-02-28' },
    { id: 3, type: 'meeting', description: 'Demo meeting completed', date: '2024-02-25' },
  ]

  const deals = [
    { id: 1, name: 'Enterprise Package', value: '$125,000', stage: 'Proposal' },
    { id: 2, name: 'Premium Subscription', value: '$45,000', stage: 'Negotiation' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/contacts" className="text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-50 font-syne-mono text-sm transition-colors">
            ← Back
          </Link>
          <div className="w-16 h-16 rounded-full bg-charcoal-900 dark:bg-charcoal-700 flex items-center justify-center text-white text-2xl font-syne font-bold">
            {contact.firstName[0]}{contact.lastName[0]}
          </div>
          <div>
            <h1 className="text-5xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="text-charcoal-600 dark:text-charcoal-400 font-syne-mono text-sm">{contact.title} at {contact.company}</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="btn btn-secondary">
            Edit
          </button>
          <button className="btn btn-primary">
            Create Deal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="floating-box p-6">
            <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50 mb-4">Contact Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">Email</p>
                <p className="font-syne-mono font-medium text-charcoal-900 dark:text-charcoal-50">{contact.email}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">Phone</p>
                <p className="font-syne-mono font-medium text-charcoal-900 dark:text-charcoal-50">{contact.phone}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">Company</p>
                <p className="font-syne-mono font-medium text-charcoal-900 dark:text-charcoal-50">{contact.company}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">Title</p>
                <p className="font-syne-mono font-medium text-charcoal-900 dark:text-charcoal-50">{contact.title}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">Status</p>
                <span className="badge badge-success">
                  {contact.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">Created</p>
                <p className="font-syne-mono font-medium text-charcoal-900 dark:text-charcoal-50">{contact.createdAt}</p>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="floating-box p-6">
            <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50 mb-4">Activity Timeline</h2>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-4 p-3 border-l-4 border-charcoal-900 dark:border-charcoal-50">
                  <div className="flex-1">
                    <p className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50">{activity.description}</p>
                    <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mt-1">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Deals */}
        <div className="space-y-6">
          <div className="floating-box p-6">
            <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50 mb-4">Related Deals</h2>
            <div className="space-y-3">
              {deals.map((deal) => (
                <div key={deal.id} className="p-4 border border-alabaster-600/30 dark:border-dark-border rounded-lg hover:bg-alabaster-100 dark:hover:bg-dark-hover transition-colors">
                  <p className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50">{deal.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">{deal.value}</span>
                    <span className="badge badge-info">
                      {deal.stage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
