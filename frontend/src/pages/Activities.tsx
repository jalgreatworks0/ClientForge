import { useState, useEffect } from 'react'
import { Calendar, Phone, Mail, MessageSquare, CheckSquare, Clock } from 'lucide-react'

interface Activity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'note' | 'task'
  title: string
  description: string
  entityType: string
  entityId: string
  performedBy: string
  performedAt: string
  durationMinutes?: number
}

const activityIcons = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  task: CheckSquare,
}

const activityColors = {
  call: 'text-green-600 bg-green-100 dark:bg-green-900/20',
  email: 'text-blue-600 bg-blue-100 dark:bg-blue-900/20',
  meeting: 'text-purple-600 bg-purple-100 dark:bg-purple-900/20',
  note: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20',
  task: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20',
}

export default function Activities() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')

  useEffect(() => {
    // TODO: Fetch activities from API
    setIsLoading(false)
  }, [])

  const filteredActivities = filterType === 'all'
    ? activities
    : activities.filter(a => a.type === filterType)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Activities
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track all interactions and activities across your CRM
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-2 overflow-x-auto">
        <FilterButton
          label="All"
          active={filterType === 'all'}
          onClick={() => setFilterType('all')}
        />
        <FilterButton
          label="Calls"
          active={filterType === 'call'}
          onClick={() => setFilterType('call')}
          icon={Phone}
        />
        <FilterButton
          label="Emails"
          active={filterType === 'email'}
          onClick={() => setFilterType('email')}
          icon={Mail}
        />
        <FilterButton
          label="Meetings"
          active={filterType === 'meeting'}
          onClick={() => setFilterType('meeting')}
          icon={Calendar}
        />
        <FilterButton
          label="Notes"
          active={filterType === 'note'}
          onClick={() => setFilterType('note')}
          icon={MessageSquare}
        />
        <FilterButton
          label="Tasks"
          active={filterType === 'task'}
          onClick={() => setFilterType('task')}
          icon={CheckSquare}
        />
      </div>

      {/* Activities Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No activities yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Activities will appear here as you interact with contacts, deals, and tasks
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function FilterButton({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string
  active: boolean
  onClick: () => void
  icon?: React.ComponentType<{ className?: string }>
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {Icon && <Icon className="w-4 h-4" />}
      {label}
    </button>
  )
}

function ActivityItem({ activity }: { activity: Activity }) {
  const Icon = activityIcons[activity.type]
  const colorClass = activityColors[activity.type]

  return (
    <div className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
      <div className="flex gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1">
            <h4 className="font-medium text-gray-900 dark:text-white">
              {activity.title}
            </h4>
            <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
              {new Date(activity.performedAt).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {activity.description}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
            <span className="capitalize">{activity.type}</span>
            {activity.durationMinutes && (
              <span>{activity.durationMinutes} minutes</span>
            )}
            <span>By {activity.performedBy}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
