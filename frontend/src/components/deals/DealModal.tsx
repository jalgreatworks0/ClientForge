import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Deal, DealStage, Pipeline } from '../../services/deals.service'
import { dealService } from '../../services/deals.service'

interface DealModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (deal: Partial<Deal>) => void
  deal?: Deal | null
}

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY']

export default function DealModal({ isOpen, onClose, onSave, deal }: DealModalProps) {
  const [formData, setFormData] = useState<Partial<Deal>>({
    name: '',
    amount: 0,
    currency: 'USD',
    probability: 30,
    description: '',
    expectedCloseDate: '',
    contactId: '',
    tags: [],
  })

  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [stages, setStages] = useState<DealStage[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  // Fetch pipelines and stages on mount
  useEffect(() => {
    if (isOpen) {
      fetchPipelinesAndStages()
    }
  }, [isOpen])

  // Update form data when deal changes
  useEffect(() => {
    if (deal) {
      setFormData({
        ...deal,
        expectedCloseDate: deal.expectedCloseDate
          ? new Date(deal.expectedCloseDate).toISOString().split('T')[0]
          : '',
      })
    } else {
      const defaultPipeline = pipelines.find(p => p.isDefault)
      const defaultStage = stages.find(s => s.pipelineId === defaultPipeline?.id)

      setFormData({
        name: '',
        amount: 0,
        currency: 'USD',
        probability: defaultStage?.probability || 30,
        description: '',
        expectedCloseDate: '',
        contactId: '',
        tags: [],
        pipelineId: defaultPipeline?.id || '',
        stageId: defaultStage?.id || '',
      })
    }
    setErrors({})
  }, [deal, isOpen, pipelines, stages])

  const fetchPipelinesAndStages = async () => {
    try {
      setLoading(true)
      const [pipelinesData, stagesData] = await Promise.all([
        dealService.listPipelines(),
        dealService.listStages(),
      ])
      setPipelines(pipelinesData)
      setStages(stagesData)
    } catch (error) {
      console.error('Failed to fetch pipelines and stages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePipelineChange = (pipelineId: string) => {
    const pipelineStages = stages.filter(s => s.pipelineId === pipelineId)
    const firstStage = pipelineStages[0]

    setFormData(prev => ({
      ...prev,
      pipelineId,
      stageId: firstStage?.id || '',
      probability: firstStage?.probability || 30,
    }))
  }

  const handleStageChange = (stageId: string) => {
    const stage = stages.find(s => s.id === stageId)

    setFormData(prev => ({
      ...prev,
      stageId,
      probability: stage?.probability || prev.probability || 30,
    }))
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {}

    if (!formData.name?.trim()) {
      newErrors.name = 'Deal name is required'
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Deal amount must be greater than 0'
    }

    if (!formData.pipelineId) {
      newErrors.pipelineId = 'Pipeline is required'
    }

    if (!formData.stageId) {
      newErrors.stageId = 'Stage is required'
    }

    if (formData.probability !== undefined && (formData.probability < 0 || formData.probability > 100)) {
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

  const handleChange = (field: string, value: string | number | string[]) => {
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
          {loading && (
            <div className="text-center py-4">
              <p className="text-sm text-charcoal-600 dark:text-charcoal-400">Loading pipelines and stages...</p>
            </div>
          )}

          {/* Deal Name */}
          <div>
            <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
              Deal Name <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`input ${errors.name ? 'border-danger-600 focus:ring-danger-600' : ''}`}
              placeholder="Enterprise Package - Acme Corp"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.name}</p>
            )}
          </div>

          {/* Pipeline & Stage Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Pipeline <span className="text-danger-600">*</span>
              </label>
              <select
                value={formData.pipelineId || ''}
                onChange={(e) => handlePipelineChange(e.target.value)}
                className={`input ${errors.pipelineId ? 'border-danger-600 focus:ring-danger-600' : ''}`}
                disabled={loading}
              >
                <option value="">Select Pipeline</option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name} {pipeline.isDefault && '(Default)'}
                  </option>
                ))}
              </select>
              {errors.pipelineId && (
                <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.pipelineId}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Stage <span className="text-danger-600">*</span>
              </label>
              <select
                value={formData.stageId || ''}
                onChange={(e) => handleStageChange(e.target.value)}
                className={`input ${errors.stageId ? 'border-danger-600 focus:ring-danger-600' : ''}`}
                disabled={loading || !formData.pipelineId}
              >
                <option value="">Select Stage</option>
                {stages
                  .filter(s => s.pipelineId === formData.pipelineId)
                  .map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name} ({stage.probability}%)
                    </option>
                  ))}
              </select>
              {errors.stageId && (
                <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.stageId}</p>
              )}
            </div>
          </div>

          {/* Amount & Currency Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Deal Amount <span className="text-danger-600">*</span>
              </label>
              <input
                type="number"
                value={formData.amount || 0}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                className={`input ${errors.amount ? 'border-danger-600 focus:ring-danger-600' : ''}`}
                placeholder="125000"
                min="0"
                step="1000"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Currency
              </label>
              <select
                value={formData.currency || 'USD'}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="input"
              >
                {currencies.map((curr) => (
                  <option key={curr} value={curr}>
                    {curr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Expected Close Date & Probability Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Expected Close Date
              </label>
              <input
                type="date"
                value={formData.expectedCloseDate || ''}
                onChange={(e) => handleChange('expectedCloseDate', e.target.value)}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Probability (%)
              </label>
              <input
                type="number"
                value={formData.probability || 0}
                onChange={(e) => handleChange('probability', parseInt(e.target.value) || 0)}
                className={`input ${errors.probability ? 'border-danger-600 focus:ring-danger-600' : ''}`}
                placeholder="70"
                min="0"
                max="100"
                readOnly
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
                      style={{ width: `${Math.min(formData.probability || 0, 100)}%` }}
                    ></div>
                  </div>
                  <span className="ml-3 text-sm font-syne-mono font-semibold text-charcoal-900 dark:text-charcoal-50">
                    {formData.probability || 0}%
                  </span>
                </div>
              </div>
              <p className="text-xs text-charcoal-600 dark:text-charcoal-400 mt-1">
                Auto-set based on selected stage
              </p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input min-h-[100px] resize-y"
              placeholder="Additional details about this deal..."
              rows={3}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={(formData.tags || []).join(', ')}
              onChange={(e) => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
              className="input"
              placeholder="enterprise, priority, quarterly (comma-separated)"
            />
            <p className="text-xs text-charcoal-600 dark:text-charcoal-400 mt-1">
              Separate tags with commas
            </p>
          </div>

          {/* Weighted Value Display */}
          <div className="bg-alabaster-200 dark:bg-dark-tertiary rounded-lg p-4 border border-alabaster-600/30 dark:border-dark-border">
            <div className="flex items-center justify-between">
              <span className="text-sm font-syne font-semibold text-charcoal-700 dark:text-charcoal-300">
                Weighted Value:
              </span>
              <span className="text-2xl font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                {formData.currency || 'USD'} {new Intl.NumberFormat('en-US').format(Math.round(((formData.amount || 0) * (formData.probability || 0)) / 100))}
              </span>
            </div>
            <p className="text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400 mt-1">
              Deal Amount × Probability = Expected Revenue
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
