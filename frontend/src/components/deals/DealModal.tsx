import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Deal {
  id?: string
  name: string
  value: number
  stage: string
  contact: string
  probability: number
}

interface DealModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (deal: Deal) => void
  deal?: Deal | null
}

const stages = ['Lead', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']

export default function DealModal({ isOpen, onClose, onSave, deal }: DealModalProps) {
  const [formData, setFormData] = useState<Deal>({
    name: '',
    value: 0,
    stage: 'Lead',
    contact: '',
    probability: 30,
  })

  const [errors, setErrors] = useState<Partial<Record<keyof Deal, string>>>({})

  useEffect(() => {
    if (deal) {
      setFormData(deal)
    } else {
      setFormData({
        name: '',
        value: 0,
        stage: 'Lead',
        contact: '',
        probability: 30,
      })
    }
    setErrors({})
  }, [deal, isOpen])

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof Deal, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Deal name is required'
    }

    if (formData.value <= 0) {
      newErrors.value = 'Deal value must be greater than 0'
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact name is required'
    }

    if (formData.probability < 0 || formData.probability > 100) {
      newErrors.probability = 'Probability must be between 0 and 100'
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

  const handleChange = (field: keyof Deal, value: string | number) => {
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
            {deal ? 'Edit Deal' : 'Add New Deal'}
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
          {/* Deal Name */}
          <div>
            <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
              Deal Name <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`input ${errors.name ? 'border-danger-600 focus:ring-danger-600' : ''}`}
              placeholder="Enterprise Package - Acme Corp"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.name}</p>
            )}
          </div>

          {/* Value & Contact Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Deal Value <span className="text-danger-600">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-600 dark:text-charcoal-400 font-syne-mono">
                  $
                </span>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => handleChange('value', parseFloat(e.target.value) || 0)}
                  className={`input pl-8 ${errors.value ? 'border-danger-600 focus:ring-danger-600' : ''}`}
                  placeholder="125000"
                  min="0"
                  step="1000"
                />
              </div>
              {errors.value && (
                <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.value}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Contact Name <span className="text-danger-600">*</span>
              </label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => handleChange('contact', e.target.value)}
                className={`input ${errors.contact ? 'border-danger-600 focus:ring-danger-600' : ''}`}
                placeholder="Sarah Johnson"
              />
              {errors.contact && (
                <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.contact}</p>
              )}
            </div>
          </div>

          {/* Stage & Probability Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Stage
              </label>
              <select
                value={formData.stage}
                onChange={(e) => handleChange('stage', e.target.value)}
                className="input"
              >
                {stages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Probability (%)
              </label>
              <input
                type="number"
                value={formData.probability}
                onChange={(e) => handleChange('probability', parseInt(e.target.value) || 0)}
                className={`input ${errors.probability ? 'border-danger-600 focus:ring-danger-600' : ''}`}
                placeholder="70"
                min="0"
                max="100"
              />
              {errors.probability && (
                <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.probability}</p>
              )}
              {/* Visual Probability Bar */}
              <div className="mt-3">
                <div className="flex items-center">
                  <div className="flex-1 bg-alabaster-400 dark:bg-dark-tertiary rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-charcoal-900 to-charcoal-700 dark:from-charcoal-50 dark:to-charcoal-300 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(formData.probability, 100)}%` }}
                    ></div>
                  </div>
                  <span className="ml-3 text-sm font-syne-mono font-semibold text-charcoal-900 dark:text-charcoal-50">
                    {formData.probability}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Weighted Value Display */}
          <div className="bg-alabaster-200 dark:bg-dark-tertiary rounded-lg p-4 border border-alabaster-600/30 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-syne font-semibold text-charcoal-700 dark:text-charcoal-300">
                Weighted Value:
              </span>
              <span className="text-2xl font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                ${new Intl.NumberFormat('en-US').format(Math.round((formData.value * formData.probability) / 100))}
              </span>
            </div>
            <p className="text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400 mt-1">
              Deal Value × Probability = Expected Revenue
            </p>
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
              {deal ? 'Update Deal' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
