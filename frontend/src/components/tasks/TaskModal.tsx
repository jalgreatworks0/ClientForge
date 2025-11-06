import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Task {
  id?: string
  title: string
  dueDate: string
  priority: 'low' | 'medium' | 'high'
  status: 'pending' | 'in_progress' | 'completed'
  assignee: string
}

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (task: Task) => void
  task?: Task | null
}

export default function TaskModal({ isOpen, onClose, onSave, task }: TaskModalProps) {
  const [formData, setFormData] = useState<Task>({
    title: '',
    dueDate: '',
    priority: 'medium',
    status: 'pending',
    assignee: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof Task, string>>>({})

  useEffect(() => {
    if (task) {
      setFormData(task)
    } else {
      setFormData({
        title: '',
        dueDate: '',
        priority: 'medium',
        status: 'pending',
        assignee: '',
      })
    }
    setErrors({})
  }, [task, isOpen])

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof Task, string>> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Task title is required'
    }

    if (!formData.dueDate) {
      newErrors.dueDate = 'Due date is required'
    }

    if (!formData.assignee.trim()) {
      newErrors.assignee = 'Assignee is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validate()) {
      onSave(formData)
      onClose()
    }
  }

  const handleChange = (field: keyof Task, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/50 backdrop-blur-sm p-4">
      <div className="floating-box w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-dark-secondary">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-charcoal-950 to-charcoal-900 dark:from-charcoal-900 dark:to-charcoal-800 text-alabaster-50 p-6 rounded-t-xl flex items-center justify-between border-b-2 border-alabaster-400/30 dark:border-dark-border">
          <h2 className="text-2xl font-syne font-bold">
            {task ? 'Edit Task' : 'Add New Task'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-alabaster-300/25 rounded-lg transition-all duration-200 hover:scale-110 hover:rotate-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
              Task Title <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`input ${errors.title ? 'border-danger-600 focus:ring-danger-600' : ''}`}
              placeholder="Follow up with Acme Corp"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.title}</p>
            )}
          </div>

          {/* Due Date & Assignee Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Due Date <span className="text-danger-600">*</span>
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className={`input ${errors.dueDate ? 'border-danger-600 focus:ring-danger-600' : ''}`}
              />
              {errors.dueDate && (
                <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.dueDate}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Assignee <span className="text-danger-600">*</span>
              </label>
              <input
                type="text"
                value={formData.assignee}
                onChange={(e) => handleChange('assignee', e.target.value)}
                className={`input ${errors.assignee ? 'border-danger-600 focus:ring-danger-600' : ''}`}
                placeholder="John Doe"
              />
              {errors.assignee && (
                <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.assignee}</p>
              )}
            </div>
          </div>

          {/* Priority & Status Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Priority
              </label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="input"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="input"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-alabaster-600/30 dark:border-dark-border">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              {task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
