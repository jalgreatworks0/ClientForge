import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Responsive, WidthProvider, Layout } from 'react-grid-layout'
import { Lock, Unlock, RotateCcw, Eye, EyeOff, Plus, Phone, Mail, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import 'react-grid-layout/css/styles.css'
import { useDashboardMetrics, useTaskAnalytics, useActivityAnalytics, useDealAnalytics } from '../hooks/useAnalytics'

const ResponsiveGridLayout = WidthProvider(Responsive)

const defaultLayout: Layout[] = [
  { i: 'metrics', x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
  { i: 'recent-contacts', x: 0, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'pipeline-overview', x: 4, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'upcoming-tasks', x: 8, y: 2, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'top-deals', x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'activity-feed', x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
  { i: 'quick-actions', x: 0, y: 10, w: 12, h: 2, minW: 6, minH: 2 },
]

// Sortable Metric Item Component
interface SortableMetricProps {
  metric: { name: string; value: string; link: string; icon: string; iconBg: string; trend?: number }
  id: string
}

function SortableMetric({ metric, id }: SortableMetricProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const formatTrend = (trend: number | undefined) => {
    if (trend === undefined) return null
    const isPositive = trend >= 0
    const TrendIcon = isPositive ? TrendingUp : TrendingDown
    return (
      <div className={`flex items-center text-xs font-syne-mono ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        <TrendIcon className="w-3 h-3 mr-1" />
        <span>{Math.abs(trend).toFixed(1)}%</span>
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Link
        to={metric.link}
        className="group p-4 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary hover:bg-alabaster-200 dark:hover:bg-dark-hover transition-all duration-200 hover:scale-105 hover:shadow-md block"
      >
        <div className="flex items-center justify-between mb-3">
          <div className={`${metric.iconBg} w-10 h-10 rounded-lg flex items-center justify-center text-xl shadow-sm`}>
            {metric.icon}
          </div>
          {formatTrend(metric.trend)}
        </div>
        <div className="text-2xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-1">
          {metric.value}
        </div>
        <div className="text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
          {metric.name}
        </div>
      </Link>
    </div>
  )
}

// Skeleton Metric Component
function SkeletonMetric() {
  return (
    <div className="p-4 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-lg bg-alabaster-300 dark:bg-dark-hover"></div>
        <div className="w-12 h-4 rounded bg-alabaster-300 dark:bg-dark-hover"></div>
      </div>
      <div className="w-16 h-8 rounded bg-alabaster-300 dark:bg-dark-hover mb-2"></div>
      <div className="w-24 h-3 rounded bg-alabaster-300 dark:bg-dark-hover"></div>
    </div>
  )
}

export default function Dashboard() {
  const [isLocked, setIsLocked] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [layouts, setLayouts] = useState<{ lg: Layout[] }>({ lg: defaultLayout })
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(new Set())
  const [metricsOrder, setMetricsOrder] = useState(['metric-0', 'metric-1', 'metric-2', 'metric-3'])

  // Fetch real analytics data
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useDashboardMetrics()
  const { data: taskAnalytics, isLoading: tasksLoading } = useTaskAnalytics()
  const { data: activityAnalytics, isLoading: activitiesLoading } = useActivityAnalytics()
  const { data: dealAnalytics, isLoading: dealsLoading } = useDealAnalytics()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load layout and hidden widgets from localStorage on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-layout')
    const savedHidden = localStorage.getItem('dashboard-hidden-widgets')

    if (savedLayout) {
      try {
        setLayouts({ lg: JSON.parse(savedLayout) })
      } catch (e) {
        console.error('Failed to parse saved layout:', e)
      }
    }

    if (savedHidden) {
      try {
        setHiddenWidgets(new Set(JSON.parse(savedHidden)))
      } catch (e) {
        console.error('Failed to parse hidden widgets:', e)
      }
    }
  }, [])

  const handleLayoutChange = (layout: Layout[]) => {
    setLayouts({ lg: layout })
    // Save to localStorage
    localStorage.setItem('dashboard-layout', JSON.stringify(layout))
  }

  const handleResetLayout = () => {
    setLayouts({ lg: defaultLayout })
    setHiddenWidgets(new Set())
    localStorage.removeItem('dashboard-layout')
    localStorage.removeItem('dashboard-hidden-widgets')
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    const newHidden = new Set(hiddenWidgets)
    if (newHidden.has(widgetId)) {
      newHidden.delete(widgetId)
    } else {
      newHidden.add(widgetId)
    }
    setHiddenWidgets(newHidden)
    localStorage.setItem('dashboard-hidden-widgets', JSON.stringify(Array.from(newHidden)))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setMetricsOrder((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  // Build metrics array from real data
  const allMetrics = metrics ? [
    {
      name: 'Total Contacts',
      value: metrics.totalContacts.toString(),
      link: '/contacts',
      icon: '👥',
      iconBg: 'bg-blue-500',
      trend: metrics.contactsChange
    },
    {
      name: 'Active Deals',
      value: metrics.totalDeals.toString(),
      link: '/deals',
      icon: '💼',
      iconBg: 'bg-green-500',
      trend: metrics.dealsChange
    },
    {
      name: 'Total Revenue',
      value: `$${(metrics.totalRevenue / 1000).toFixed(0)}K`,
      link: '/deals',
      icon: '💰',
      iconBg: 'bg-orange-500',
      trend: metrics.revenueChange
    },
    {
      name: 'Pending Tasks',
      value: metrics.pendingTasks.toString(),
      link: '/tasks',
      icon: '📋',
      iconBg: 'bg-purple-500',
      trend: metrics.tasksChange
    },
  ] : []

  const metricsToDisplay = metricsOrder.map(id => {
    const index = parseInt(id.split('-')[1])
    return allMetrics[index]
  })

  const widgets = [
    { id: 'metrics', name: 'Key Metrics', icon: '📊' },
    { id: 'recent-contacts', name: 'Recent Contacts', icon: '👥' },
    { id: 'pipeline-overview', name: 'Pipeline Overview', icon: '📈' },
    { id: 'upcoming-tasks', name: 'Upcoming Tasks', icon: '📋' },
    { id: 'top-deals', name: 'Top Deals', icon: '💼' },
    { id: 'activity-feed', name: 'Activity Feed', icon: '🔔' },
    { id: 'quick-actions', name: 'Quick Actions', icon: '⚡' },
  ]

  const visibleLayouts = layouts.lg.filter(layout => !hiddenWidgets.has(layout.i))

  return (
    <div className={`dashboard-grid-background ${!isLocked ? 'grid-visible' : ''}`}>
      <div className="space-y-6">
        {/* Header with Controls */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-2">
            Dashboard
          </h1>
          <p className="text-charcoal-600 dark:text-charcoal-400 font-syne-mono text-sm">
            {isLocked ? 'Your personalized business overview' : '✨ Drag widgets to rearrange • Resize by dragging edges'}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Widget Visibility Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-syne font-medium bg-alabaster-300 dark:bg-dark-tertiary text-charcoal-700 dark:text-charcoal-300 hover:bg-alabaster-400 dark:hover:bg-dark-hover transition-all duration-200"
              title="Widget settings"
            >
              <Eye className="w-4 h-4" />
              <span>Widgets</span>
            </button>
            {showSettings && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-dark-secondary rounded-lg shadow-2xl border border-alabaster-600/30 dark:border-dark-border p-4 z-50">
                <h3 className="text-sm font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-3">
                  Show/Hide Widgets
                </h3>
                <div className="space-y-2">
                  {widgets.map((widget) => (
                    <label
                      key={widget.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-alabaster-100 dark:hover:bg-dark-tertiary cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!hiddenWidgets.has(widget.id)}
                        onChange={() => toggleWidgetVisibility(widget.id)}
                        className="w-4 h-4 text-charcoal-900 dark:text-charcoal-50 rounded"
                      />
                      <span className="text-lg">{widget.icon}</span>
                      <span className="text-sm font-syne-mono text-charcoal-700 dark:text-charcoal-300 flex-1">
                        {widget.name}
                      </span>
                      {hiddenWidgets.has(widget.id) && (
                        <EyeOff className="w-3 h-3 text-charcoal-400" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Reset Layout Button */}
          <button
            onClick={handleResetLayout}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg font-syne font-medium bg-alabaster-300 dark:bg-dark-tertiary text-charcoal-700 dark:text-charcoal-300 hover:bg-alabaster-400 dark:hover:bg-dark-hover transition-all duration-200"
            title="Reset to default layout"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          {/* Lock/Unlock Toggle */}
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-syne font-medium transition-all duration-200 ${
              isLocked
                ? 'bg-alabaster-300 dark:bg-dark-tertiary text-charcoal-700 dark:text-charcoal-300 hover:bg-alabaster-400 dark:hover:bg-dark-hover'
                : 'bg-charcoal-900 dark:bg-charcoal-50 text-white dark:text-charcoal-900 hover:bg-charcoal-800 dark:hover:bg-charcoal-200 shadow-lg'
            }`}
            title={isLocked ? 'Unlock to rearrange widgets' : 'Lock widgets in place'}
          >
            {isLocked ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Locked</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Editing</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid Layout with Moveable Widgets */}
      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: visibleLayouts }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={80}
        isDraggable={!isLocked}
        isResizable={!isLocked}
        onLayoutChange={handleLayoutChange}
        compactType={null}
        preventCollision={true}
      >
        {/* Metrics Widget */}
        {!hiddenWidgets.has('metrics') && (
          <div key="metrics" className="widget">
            <div className="floating-box p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50">
                  📊 Key Metrics
                </h2>
              </div>

              {/* Error State */}
              {metricsError && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                  <p className="text-sm font-syne text-red-800 dark:text-red-300">
                    Failed to load metrics. Please try again later.
                  </p>
                  <p className="text-xs font-syne-mono text-red-600 dark:text-red-400 mt-1">
                    {metricsError.message}
                  </p>
                </div>
              )}

              {/* Loading State */}
              {metricsLoading && (
                <div className="grid grid-cols-4 gap-4">
                  <SkeletonMetric />
                  <SkeletonMetric />
                  <SkeletonMetric />
                  <SkeletonMetric />
                </div>
              )}

              {/* Data Loaded State */}
              {!metricsLoading && !metricsError && metrics && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={metricsOrder}
                    strategy={rectSortingStrategy}
                  >
                    <div className="grid grid-cols-4 gap-4">
                      {metricsOrder.map((id, index) => (
                        <SortableMetric
                          key={id}
                          id={id}
                          metric={metricsToDisplay[index]}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        )}

        {/* Recent Contacts Widget */}
        {!hiddenWidgets.has('recent-contacts') && (
          <div key="recent-contacts" className="widget">
            <div className="floating-box p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50">
                  👥 Top Contacts
                </h2>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {activitiesLoading ? (
                  // Loading skeleton
                  <>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary animate-pulse"
                      >
                        <div className="h-4 bg-alabaster-300 dark:bg-dark-hover rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-alabaster-300 dark:bg-dark-hover rounded w-1/2"></div>
                      </div>
                    ))}
                  </>
                ) : activityAnalytics?.topContacts && activityAnalytics.topContacts.length > 0 ? (
                  // Display top contacts
                  activityAnalytics.topContacts.slice(0, 5).map((contact) => (
                    <Link
                      key={contact.id}
                      to={`/contacts/${contact.id}`}
                      className="block p-3 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary hover:bg-alabaster-200 dark:hover:bg-dark-hover transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50">
                            {contact.name}
                          </div>
                          <div className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                            {contact.activityCount} activities
                          </div>
                        </div>
                        <span className="px-2 py-1 text-xs font-syne font-semibold rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          Active
                        </span>
                      </div>
                    </Link>
                  ))
                ) : (
                  // Empty state
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="text-4xl mb-3">👥</div>
                    <div className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50 mb-2">
                      No Contact Data
                    </div>
                    <div className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                      Top contacts will appear here
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/contacts"
                className="mt-4 text-center py-2 text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 hover:text-charcoal-700 dark:hover:text-charcoal-300 transition-colors"
              >
                View All Contacts →
              </Link>
            </div>
          </div>
        )}

        {/* Pipeline Overview Widget */}
        {!hiddenWidgets.has('pipeline-overview') && (
          <div key="pipeline-overview" className="widget">
            <div className="floating-box p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50">
                  📈 Pipeline Overview
                </h2>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {dealsLoading ? (
                  // Loading skeleton
                  <>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary animate-pulse"
                      >
                        <div className="h-4 bg-alabaster-300 dark:bg-dark-hover rounded w-2/3 mb-2"></div>
                        <div className="h-2 bg-alabaster-300 dark:bg-dark-hover rounded w-full"></div>
                      </div>
                    ))}
                  </>
                ) : dealAnalytics?.byStage && dealAnalytics.byStage.length > 0 ? (
                  // Display pipeline stages
                  dealAnalytics.byStage.map((stage) => {
                    const totalValue = dealAnalytics.byStage.reduce((sum, s) => sum + s.totalValue, 0)
                    const percentage = totalValue > 0 ? (stage.totalValue / totalValue) * 100 : 0
                    return (
                      <div
                        key={stage.stageId}
                        className="p-3 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50">
                            {stage.stageName}
                          </span>
                          <span className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                            {stage.dealCount} deals
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex-1 bg-alabaster-300 dark:bg-dark-hover rounded-full h-2 mr-3">
                            <div
                              className="bg-gradient-to-r from-charcoal-900 to-charcoal-700 dark:from-charcoal-50 dark:to-charcoal-300 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                            ${(stage.totalValue / 1000).toFixed(0)}K
                          </span>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  // Empty state
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="text-4xl mb-3">📈</div>
                    <div className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50 mb-2">
                      No Pipeline Data
                    </div>
                    <div className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                      Pipeline stages will appear here
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/deals"
                className="mt-4 text-center py-2 text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 hover:text-charcoal-700 dark:hover:text-charcoal-300 transition-colors"
              >
                View Pipeline →
              </Link>
            </div>
          </div>
        )}

        {/* Upcoming Tasks Widget */}
        {!hiddenWidgets.has('upcoming-tasks') && (
          <div key="upcoming-tasks" className="widget">
            <div className="floating-box p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50">
                  📋 Upcoming Tasks
                </h2>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {tasksLoading ? (
                  // Loading skeleton
                  <>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary animate-pulse"
                      >
                        <div className="h-4 bg-alabaster-300 dark:bg-dark-hover rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-alabaster-300 dark:bg-dark-hover rounded w-1/2"></div>
                      </div>
                    ))}
                  </>
                ) : taskAnalytics ? (
                  // Display task summary stats
                  <>
                    <div className="p-4 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50">
                          Total Tasks
                        </span>
                        <span className="text-2xl font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                          {taskAnalytics.totalTasks}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-syne font-medium text-red-900 dark:text-red-300">
                          Overdue
                        </span>
                        <span className="text-2xl font-syne-mono font-bold text-red-700 dark:text-red-400">
                          {taskAnalytics.overdueTasks}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-syne font-medium text-yellow-900 dark:text-yellow-300">
                          Due Today
                        </span>
                        <span className="text-2xl font-syne-mono font-bold text-yellow-700 dark:text-yellow-400">
                          {taskAnalytics.dueTodayTasks}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-syne font-medium text-blue-900 dark:text-blue-300">
                          Due This Week
                        </span>
                        <span className="text-2xl font-syne-mono font-bold text-blue-700 dark:text-blue-400">
                          {taskAnalytics.dueThisWeekTasks}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary">
                      <div className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-3">
                        By Priority
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-syne text-charcoal-700 dark:text-charcoal-300">Urgent</span>
                          <span className="text-sm font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                            {taskAnalytics.byPriority.urgent}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-syne text-charcoal-700 dark:text-charcoal-300">High</span>
                          <span className="text-sm font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                            {taskAnalytics.byPriority.high}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-syne text-charcoal-700 dark:text-charcoal-300">Medium</span>
                          <span className="text-sm font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                            {taskAnalytics.byPriority.medium}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-syne text-charcoal-700 dark:text-charcoal-300">Low</span>
                          <span className="text-sm font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                            {taskAnalytics.byPriority.low}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  // Empty state
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="text-4xl mb-3">📋</div>
                    <div className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50 mb-2">
                      No Tasks Data
                    </div>
                    <div className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                      Task analytics will appear here
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/tasks"
                className="mt-4 text-center py-2 text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 hover:text-charcoal-700 dark:hover:text-charcoal-300 transition-colors"
              >
                View All Tasks →
              </Link>
            </div>
          </div>
        )}

        {/* Top Deals Widget */}
        {!hiddenWidgets.has('top-deals') && (
          <div key="top-deals" className="widget">
            <div className="floating-box p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50">
                  💼 Top Deals
                </h2>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {dealsLoading ? (
                  // Loading skeleton
                  <>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary animate-pulse"
                      >
                        <div className="h-4 bg-alabaster-300 dark:bg-dark-hover rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-alabaster-300 dark:bg-dark-hover rounded w-1/2"></div>
                      </div>
                    ))}
                  </>
                ) : dealAnalytics?.topDeals && dealAnalytics.topDeals.length > 0 ? (
                  // Display top deals
                  dealAnalytics.topDeals.map((deal) => (
                    <Link
                      key={deal.id}
                      to={`/deals/${deal.id}`}
                      className="block p-3 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary hover:bg-alabaster-200 dark:hover:bg-dark-hover transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50">
                          {deal.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                          ${(deal.amount / 1000).toFixed(0)}K
                        </span>
                        <div className="flex items-center space-x-2">
                          <span className="badge badge-info text-xs">
                            {deal.stageName}
                          </span>
                          {deal.probability !== undefined && (
                            <span className="text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                              {deal.probability}%
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  // Empty state
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="text-4xl mb-3">💼</div>
                    <div className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50 mb-2">
                      No Deals Data
                    </div>
                    <div className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                      Top deals will appear here
                    </div>
                  </div>
                )}
              </div>
              <Link
                to="/deals"
                className="mt-4 text-center py-2 text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 hover:text-charcoal-700 dark:hover:text-charcoal-300 transition-colors"
              >
                View All Deals →
              </Link>
            </div>
          </div>
        )}

        {/* Activity Feed Widget */}
        {!hiddenWidgets.has('activity-feed') && (
          <div key="activity-feed" className="widget">
            <div className="floating-box p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50">
                  🔔 Recent Activity
                </h2>
              </div>
              <div className="space-y-3 flex-1 overflow-y-auto">
                {activitiesLoading ? (
                  // Loading skeleton
                  <>
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="p-3 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary animate-pulse"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-alabaster-300 dark:bg-dark-hover"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-alabaster-300 dark:bg-dark-hover rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-alabaster-300 dark:bg-dark-hover rounded w-1/2"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </>
                ) : activityAnalytics ? (
                  // Display activity analytics
                  <>
                    <div className="p-4 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary">
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50">
                          Total Activities
                        </span>
                        <span className="text-2xl font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                          {activityAnalytics.totalActivities}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-syne font-medium text-blue-900 dark:text-blue-300">
                          This Week
                        </span>
                        <span className="text-2xl font-syne-mono font-bold text-blue-700 dark:text-blue-400">
                          {activityAnalytics.activitiesThisWeek}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-syne font-medium text-green-900 dark:text-green-300">
                          This Month
                        </span>
                        <span className="text-2xl font-syne-mono font-bold text-green-700 dark:text-green-400">
                          {activityAnalytics.activitiesThisMonth}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary">
                      <div className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-3">
                        By Type
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-charcoal-600 dark:text-charcoal-400" />
                            <span className="text-xs font-syne text-charcoal-700 dark:text-charcoal-300">Calls</span>
                          </div>
                          <span className="text-sm font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                            {activityAnalytics.byType.call}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Mail className="w-4 h-4 text-charcoal-600 dark:text-charcoal-400" />
                            <span className="text-xs font-syne text-charcoal-700 dark:text-charcoal-300">Emails</span>
                          </div>
                          <span className="text-sm font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                            {activityAnalytics.byType.email}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-charcoal-600 dark:text-charcoal-400" />
                            <span className="text-xs font-syne text-charcoal-700 dark:text-charcoal-300">Meetings</span>
                          </div>
                          <span className="text-sm font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                            {activityAnalytics.byType.meeting}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-charcoal-600 dark:text-charcoal-400">📝</span>
                            <span className="text-xs font-syne text-charcoal-700 dark:text-charcoal-300">Notes</span>
                          </div>
                          <span className="text-sm font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                            {activityAnalytics.byType.note}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="text-charcoal-600 dark:text-charcoal-400">✓</span>
                            <span className="text-xs font-syne text-charcoal-700 dark:text-charcoal-300">Tasks</span>
                          </div>
                          <span className="text-sm font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                            {activityAnalytics.byType.task}
                          </span>
                        </div>
                      </div>
                    </div>

                    {activityAnalytics.topContacts && activityAnalytics.topContacts.length > 0 && (
                      <div className="p-4 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary">
                        <div className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400 mb-3">
                          Most Active Contacts
                        </div>
                        <div className="space-y-2">
                          {activityAnalytics.topContacts.slice(0, 5).map((contact) => (
                            <Link
                              key={contact.id}
                              to={`/contacts/${contact.id}`}
                              className="flex items-center justify-between hover:bg-alabaster-200 dark:hover:bg-dark-hover p-2 rounded transition-colors"
                            >
                              <span className="text-xs font-syne text-charcoal-700 dark:text-charcoal-300">
                                {contact.name}
                              </span>
                              <span className="text-xs font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                                {contact.activityCount}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // Empty state
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="text-4xl mb-3">🔔</div>
                    <div className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50 mb-2">
                      No Activity Data
                    </div>
                    <div className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                      Activity analytics will appear here
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Widget */}
        {!hiddenWidgets.has('quick-actions') && (
          <div key="quick-actions" className="widget">
            <div className="floating-box p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-syne font-normal text-charcoal-900 dark:text-charcoal-50">
                  ⚡ Quick Actions
                </h2>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <Link
                  to="/contacts"
                  className="group flex flex-col items-center justify-center p-4 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary hover:bg-alabaster-200 dark:hover:bg-dark-hover transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <Plus className="w-6 h-6 text-charcoal-900 dark:text-charcoal-50 mb-2" />
                  <span className="text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                    New Contact
                  </span>
                </Link>
                <Link
                  to="/deals"
                  className="group flex flex-col items-center justify-center p-4 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary hover:bg-alabaster-200 dark:hover:bg-dark-hover transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <Plus className="w-6 h-6 text-charcoal-900 dark:text-charcoal-50 mb-2" />
                  <span className="text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                    New Deal
                  </span>
                </Link>
                <Link
                  to="/tasks"
                  className="group flex flex-col items-center justify-center p-4 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary hover:bg-alabaster-200 dark:hover:bg-dark-hover transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <Plus className="w-6 h-6 text-charcoal-900 dark:text-charcoal-50 mb-2" />
                  <span className="text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                    New Task
                  </span>
                </Link>
                <button
                  className="group flex flex-col items-center justify-center p-4 rounded-lg bg-alabaster-100 dark:bg-dark-tertiary hover:bg-alabaster-200 dark:hover:bg-dark-hover transition-all duration-200 hover:scale-105 hover:shadow-md"
                >
                  <Mail className="w-6 h-6 text-charcoal-900 dark:text-charcoal-50 mb-2" />
                  <span className="text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                    Send Email
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </ResponsiveGridLayout>
      </div>
    </div>
  )
}
