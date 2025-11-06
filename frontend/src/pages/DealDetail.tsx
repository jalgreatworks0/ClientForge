import { useParams, Link } from 'react-router-dom'

export default function DealDetail() {
  const { id } = useParams()

  const deal = {
    id,
    name: 'Enterprise Package - Acme Corp',
    value: 125000,
    stage: 'Proposal',
    probability: 70,
    contact: 'Sarah Johnson',
    company: 'Acme Corp',
    expectedCloseDate: '2024-04-15',
    createdAt: '2024-02-01',
  }

  const timeline = [
    { id: 1, event: 'Deal created', date: '2024-02-01', user: 'John Doe' },
    { id: 2, event: 'Moved to Qualified', date: '2024-02-10', user: 'John Doe' },
    { id: 3, event: 'Proposal sent', date: '2024-02-25', user: 'John Doe' },
    { id: 4, event: 'Follow-up call completed', date: '2024-03-01', user: 'John Doe' },
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
          <Link to="/deals" className="text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-50 font-syne-mono text-sm transition-colors">
            ← Back to Deals
          </Link>
          <h1 className="text-5xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mt-2 mb-2">{deal.name}</h1>
          <p className="text-charcoal-600 dark:text-charcoal-400 font-syne-mono text-sm">
            {deal.contact} • {deal.company}
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="btn btn-secondary">
            Edit
          </button>
          <button className="btn btn-primary">
            Move Stage
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="floating-box p-6">
            <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50 mb-4">Deal Information</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Value</p>
                <p className="text-2xl font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">{formatCurrency(deal.value)}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Probability</p>
                <div className="flex items-center">
                  <div className="flex-1 bg-alabaster-400 dark:bg-dark-tertiary rounded-full h-2 mr-3">
                    <div
                      className="bg-charcoal-900 dark:bg-charcoal-50 h-2 rounded-full"
                      style={{ width: `${deal.probability}%` }}
                    ></div>
                  </div>
                  <span className="text-lg font-syne-mono font-semibold text-charcoal-900 dark:text-charcoal-50">{deal.probability}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Stage</p>
                <span className="badge badge-info">
                  {deal.stage}
                </span>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Expected Close Date</p>
                <p className="font-syne-mono font-medium text-charcoal-900 dark:text-charcoal-50">{deal.expectedCloseDate}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Created</p>
                <p className="font-syne-mono font-medium text-charcoal-900 dark:text-charcoal-50">{deal.createdAt}</p>
              </div>
              <div>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-1">Weighted Value</p>
                <p className="font-syne-mono font-medium text-charcoal-900 dark:text-charcoal-50">
                  {formatCurrency(deal.value * (deal.probability / 100))}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="floating-box p-6">
            <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50 mb-4">Deal Timeline</h2>
            <div className="space-y-4">
              {timeline.map((item) => (
                <div key={item.id} className="flex items-start space-x-4 p-3 border-l-4 border-charcoal-900 dark:border-charcoal-50">
                  <div className="flex-1">
                    <p className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50">{item.event}</p>
                    <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mt-1">
                      {item.date} • {item.user}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Actions & Notes */}
        <div className="space-y-6">
          <div className="floating-box p-6">
            <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50 mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <button className="btn btn-primary w-full">
                Send Email
              </button>
              <button className="btn btn-secondary w-full">
                Schedule Call
              </button>
              <button className="btn btn-secondary w-full">
                Add Note
              </button>
              <button className="btn btn-secondary w-full">
                Create Task
              </button>
            </div>
          </div>

          <div className="floating-box p-6">
            <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50 mb-4">Contact</h2>
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-charcoal-900 dark:bg-charcoal-700 flex items-center justify-center text-white font-syne font-semibold">
                SJ
              </div>
              <div>
                <p className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50">{deal.contact}</p>
                <p className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">{deal.company}</p>
              </div>
            </div>
            <Link
              to={`/contacts/1`}
              className="block mt-4 text-center text-sm font-syne text-charcoal-900 dark:text-charcoal-50 hover:text-charcoal-700 dark:hover:text-charcoal-300 font-medium transition-colors"
            >
              View Contact →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
