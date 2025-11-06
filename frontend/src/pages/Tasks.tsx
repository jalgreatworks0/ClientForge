import { useState } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import TaskModal from '../components/tasks/TaskModal'
import ConfirmDialog from '../components/common/ConfirmDialog'

interface Task {
  id: string
  title: string
  dueDate: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed'
  assignee: string
}

const initialTasks: Task[] = [
  { id: '1', title: 'Follow up with Acme Corp', dueDate: '2024-03-05', priority: 'high', status: 'pending', assignee: 'John Doe' },
  { id: '2', title: 'Prepare proposal for Beta Inc', dueDate: '2024-03-06', priority: 'medium', status: 'in_progress', assignee: 'Jane Smith' },
  { id: '3', title: 'Review contract with Gamma LLC', dueDate: '2024-03-06', priority: 'low', status: 'pending', assignee: 'John Doe' },
  { id: '4', title: 'Send demo invitation to Delta Corp', dueDate: '2024-03-04', priority: 'high', status: 'completed', assignee: 'Mike Johnson' },
  { id: '5', title: 'Update CRM data for Q1', dueDate: '2024-03-07', priority: 'medium', status: 'pending', assignee: 'Sarah Williams' },
]

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null)

  const filteredTasks = filter === 'all' ? tasks : tasks.filter(task => task.status === filter)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'low': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700'
      case 'in_progress': return 'bg-blue-100 text-blue-700'
      case 'pending': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const handleAddTask = () => {
    setSelectedTask(null)
    setIsModalOpen(true)
  }

  const handleEditTask = (task: Task) => {
    setSelectedTask(task)
    setIsModalOpen(true)
  }

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = () => {
    if (taskToDelete) {
      setTasks(prev => prev.filter(t => t.id !== taskToDelete.id))
      setTaskToDelete(null)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleSaveTask = (taskData: Omit<Task, 'id'> & { id?: string }) => {
    if (taskData.id) {
      setTasks(prev =>
        prev.map(t => (t.id === taskData.id ? { ...taskData, id: taskData.id } : t))
      )
    } else {
      const newTask: Task = {
        ...taskData,
        id: Date.now().toString(),
      }
      setTasks(prev => [...prev, newTask])
    }
    setIsModalOpen(false)
  }

  const handleToggleComplete = (task: Task) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === task.id
          ? { ...t, status: t.status === 'completed' ? 'pending' : 'completed' }
          : t
      )
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-2">
            Tasks
          </h1>
          <p className="text-charcoal-600 dark:text-charcoal-400 font-syne-mono text-sm">{filteredTasks.length} tasks</p>
        </div>
        <button onClick={handleAddTask} className="btn btn-primary">
          + New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-syne font-medium transition-colors ${
            filter === 'all' ? 'bg-charcoal-900 dark:bg-charcoal-50 text-white dark:text-charcoal-900' : 'bg-white dark:bg-dark-secondary border border-alabaster-700 dark:border-dark-border text-charcoal-700 dark:text-charcoal-300'
          }`}
        >
          All ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg font-syne font-medium transition-colors ${
            filter === 'pending' ? 'bg-charcoal-900 dark:bg-charcoal-50 text-white dark:text-charcoal-900' : 'bg-white dark:bg-dark-secondary border border-alabaster-700 dark:border-dark-border text-charcoal-700 dark:text-charcoal-300'
          }`}
        >
          Pending ({tasks.filter(t => t.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('in_progress')}
          className={`px-4 py-2 rounded-lg font-syne font-medium transition-colors ${
            filter === 'in_progress' ? 'bg-charcoal-900 dark:bg-charcoal-50 text-white dark:text-charcoal-900' : 'bg-white dark:bg-dark-secondary border border-alabaster-700 dark:border-dark-border text-charcoal-700 dark:text-charcoal-300'
          }`}
        >
          In Progress ({tasks.filter(t => t.status === 'in_progress').length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={`px-4 py-2 rounded-lg font-syne font-medium transition-colors ${
            filter === 'completed' ? 'bg-charcoal-900 dark:bg-charcoal-50 text-white dark:text-charcoal-900' : 'bg-white dark:bg-dark-secondary border border-alabaster-700 dark:border-dark-border text-charcoal-700 dark:text-charcoal-300'
          }`}
        >
          Completed ({tasks.filter(t => t.status === 'completed').length})
        </button>
      </div>

      {/* Tasks List */}
      <div className="floating-box divide-y divide-alabaster-600/30 dark:divide-dark-border">
        {filteredTasks.map((task) => (
          <div key={task.id} className="p-6 hover:bg-alabaster-100 dark:hover:bg-dark-hover transition-colors">
            <div className="flex items-start space-x-4">
              <input
                type="checkbox"
                checked={task.status === 'completed'}
                className="mt-1 h-5 w-5 text-charcoal-900 dark:text-charcoal-50 rounded"
                onChange={() => handleToggleComplete(task)}
              />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-syne font-medium ${
                    task.status === 'completed' ? 'line-through text-charcoal-500 dark:text-charcoal-600' : 'text-charcoal-900 dark:text-charcoal-50'
                  }`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleEditTask(task)}
                      className="p-2 text-charcoal-600 dark:text-charcoal-400 hover:text-charcoal-900 dark:hover:text-charcoal-100 hover:bg-alabaster-200 dark:hover:bg-dark-tertiary rounded-lg transition-all duration-200"
                      title="Edit task"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(task)}
                      className="p-2 text-danger-600 dark:text-danger-400 hover:text-danger-800 dark:hover:text-danger-300 hover:bg-danger-100 dark:hover:bg-danger-900/20 rounded-lg transition-all duration-200"
                      title="Delete task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`px-2 py-1 text-xs font-syne font-semibold rounded ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  <span className={`px-2 py-1 text-xs font-syne font-semibold rounded ${getStatusColor(task.status)}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                    Due: {task.dueDate}
                  </span>
                  <span className="text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                    Assigned to: {task.assignee}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="p-12 text-center text-charcoal-500 dark:text-charcoal-400 font-syne-mono">
            No tasks found
          </div>
        )}
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        task={selectedTask}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Task"
        message={`Are you sure you want to delete "${taskToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete Task"
        confirmVariant="danger"
      />
    </div>
  )
}
