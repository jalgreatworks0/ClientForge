import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Edit2, Trash2 } from 'lucide-react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import DealModal from '../components/deals/DealModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { dealService, Deal, DealStage, Pipeline } from '../services/deals.service'

// Sortable Deal Card Component
function SortableDealCard({ deal, onEdit, onDelete }: {
  deal: Deal
  onEdit: (deal: Deal, e?: React.MouseEvent) => void
  onDelete: (deal: Deal, e?: React.MouseEvent) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="group relative bg-white dark:bg-dark-secondary rounded-lg p-4 border border-alabaster-600/50 dark:border-dark-border cursor-grab active:cursor-grabbing transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-2xl mb-3"
    >
      <Link to={`/deals/${deal.id}`} className="block">
        <h4 className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50 mb-2">{deal.name}</h4>
        <div className="flex items-center justify-between text-sm">
          <span className="font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
            {deal.amount ? formatCurrency(deal.amount) : '-'}
          </span>
          <span className="font-syne-mono text-charcoal-600 dark:text-charcoal-400">{deal.probability}%</span>
        </div>
        {deal.description && (
          <p className="text-xs font-syne-mono text-charcoal-600 dark:text-charcoal-400 mt-2 truncate">
            {deal.description}
          </p>
        )}
      </Link>

      {/* Action buttons - appear on hover */}
      <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onEdit(deal, e)
          }}
          className="p-2 bg-alabaster-200 dark:bg-dark-tertiary rounded-lg hover:bg-alabaster-300 dark:hover:bg-dark-hover transition-all duration-200 hover:scale-110"
          title="Edit deal"
        >
          <Edit2 className="w-4 h-4 text-charcoal-700 dark:text-charcoal-300" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete(deal, e)
          }}
          className="p-2 bg-danger-100 dark:bg-danger-900/20 rounded-lg hover:bg-danger-200 dark:hover:bg-danger-900/40 transition-all duration-200 hover:scale-110"
          title="Delete deal"
        >
          <Trash2 className="w-4 h-4 text-danger-600 dark:text-danger-400" />
        </button>
      </div>
    </div>
  )
}

export default function Deals() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [stages, setStages] = useState<DealStage[]>([])
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeDealId, setActiveDealId] = useState<string | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Fetch deals and pipeline on mount
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch pipeline with stages
      const pipelinesResponse = await dealService.listPipelines()
      const defaultPipeline = pipelinesResponse.find((p) => p.isDefault) || pipelinesResponse[0]

      if (defaultPipeline) {
        setPipeline(defaultPipeline)

        // Fetch stages for this pipeline
        const stagesResponse = await dealService.listStages(defaultPipeline.id)
        setStages(stagesResponse.sort((a, b) => a.displayOrder - b.displayOrder))

        // Fetch deals
        const dealsResponse = await dealService.listDeals({
          page: 1,
          limit: 1000,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          filters: {
            pipelineId: defaultPipeline.id,
            isClosed: false, // Only show open deals in Kanban
          },
        })

        setDeals(dealsResponse.data)
      }
    } catch (err: any) {
      console.error('Failed to fetch deals:', err)
      setError(err.response?.data?.message || 'Failed to load deals')
    } finally {
      setLoading(false)
    }
  }

  const getDealsByStage = (stageId: string) => {
    return deals.filter((deal) => deal.stageId === stageId)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const handleAddDeal = () => {
    setSelectedDeal(null)
    setIsModalOpen(true)
  }

  const handleEditDeal = (deal: Deal, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setSelectedDeal(deal)
    setIsModalOpen(true)
  }

  const handleDeleteClick = (deal: Deal, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setDealToDelete(deal)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (dealToDelete) {
      try {
        await dealService.deleteDeal(dealToDelete.id)
        setIsDeleteDialogOpen(false)
        setDealToDelete(null)
        fetchData() // Refresh list
      } catch (err: any) {
        console.error('Failed to delete deal:', err)
        alert(err.response?.data?.message || 'Failed to delete deal')
      }
    }
  }

  const handleSaveDeal = async (dealData: any) => {
    try {
      if (dealData.id) {
        // Update existing deal
        await dealService.updateDeal(dealData.id, dealData)
      } else {
        // Add new deal - use first stage if not specified
        if (!dealData.stageId && stages.length > 0) {
          dealData.stageId = stages[0].id
        }
        if (!dealData.pipelineId && pipeline) {
          dealData.pipelineId = pipeline.id
        }
        await dealService.createDeal(dealData)
      }
      setIsModalOpen(false)
      fetchData() // Refresh list
    } catch (err: any) {
      console.error('Failed to save deal:', err)
      alert(err.response?.data?.message || 'Failed to save deal')
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDealId(event.active.id as string)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveDealId(null)

    if (!over) return

    const dealId = active.id as string
    const newStageId = over.id as string

    // Find the deal
    const deal = deals.find((d) => d.id === dealId)
    if (!deal) return

    // If dropped on same stage, do nothing
    if (deal.stageId === newStageId) return

    try {
      // Optimistic update
      setDeals((prevDeals) =>
        prevDeals.map((d) => (d.id === dealId ? { ...d, stageId: newStageId } : d))
      )

      // Update via API
      await dealService.changeDealStage(dealId, newStageId)

      // Refresh to get updated data
      fetchData()
    } catch (err: any) {
      console.error('Failed to change deal stage:', err)
      alert(err.response?.data?.message || 'Failed to move deal')
      // Revert on error
      fetchData()
    }
  }

  const activeDeal = activeDealId ? deals.find((d) => d.id === activeDealId) : null

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-charcoal-500 dark:text-charcoal-400 font-syne-mono">Loading deals...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-2">
            Deals Pipeline
          </h1>
          <p className="text-charcoal-600 dark:text-charcoal-400 font-syne-mono text-sm">
            {deals.length} deals • Total value: {formatCurrency(deals.reduce((sum, d) => sum + (d.amount || 0), 0))}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex bg-alabaster-300 dark:bg-dark-tertiary rounded-lg p-1">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-4 py-2 rounded font-syne font-medium text-sm transition-colors ${
                viewMode === 'kanban' ? 'bg-white dark:bg-dark-secondary shadow-sm text-charcoal-900 dark:text-charcoal-50' : 'text-charcoal-600 dark:text-charcoal-400'
              }`}
            >
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded font-syne font-medium text-sm transition-colors ${
                viewMode === 'list' ? 'bg-white dark:bg-dark-secondary shadow-sm text-charcoal-900 dark:text-charcoal-50' : 'text-charcoal-600 dark:text-charcoal-400'
              }`}
            >
              List
            </button>
          </div>
          <button onClick={handleAddDeal} className="btn btn-primary">
            + New Deal
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="floating-box p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
          <p className="text-danger-800 dark:text-danger-200 font-syne">{error}</p>
        </div>
      )}

      {viewMode === 'kanban' ? (
        /* Kanban View with Drag and Drop */
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex space-x-4 overflow-x-auto pb-4">
            {stages.map((stage) => {
              const stageDeals = getDealsByStage(stage.id)
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.amount || 0), 0)

              return (
                <div key={stage.id} className="flex-shrink-0 w-80">
                  <div className="bg-alabaster-300 dark:bg-dark-tertiary rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color || '#94a3b8' }}
                        />
                        <h3 className="font-syne font-normal text-charcoal-900 dark:text-charcoal-50">
                          {stage.name}
                          <span className="ml-2 text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                            ({stageDeals.length})
                          </span>
                        </h3>
                      </div>
                      <span className="text-sm font-syne-mono font-medium text-charcoal-600 dark:text-charcoal-400">
                        {formatCurrency(stageValue)}
                      </span>
                    </div>

                    <SortableContext items={stageDeals.map((d) => d.id)} strategy={verticalListSortingStrategy} id={stage.id}>
                      <div className="space-y-3 min-h-[200px]">
                        {stageDeals.map((deal) => (
                          <SortableDealCard
                            key={deal.id}
                            deal={deal}
                            onEdit={handleEditDeal}
                            onDelete={handleDeleteClick}
                          />
                        ))}

                        {stageDeals.length === 0 && (
                          <div className="text-center py-8 text-charcoal-500 dark:text-charcoal-400 text-sm font-syne-mono">
                            No deals in this stage
                          </div>
                        )}
                      </div>
                    </SortableContext>
                  </div>
                </div>
              )
            })}
          </div>

          <DragOverlay>
            {activeDeal ? (
              <div className="bg-white dark:bg-dark-secondary rounded-lg p-4 border-2 border-charcoal-900 dark:border-charcoal-50 shadow-2xl w-80 cursor-grabbing">
                <h4 className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50 mb-2">{activeDeal.name}</h4>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-syne-mono font-bold text-charcoal-900 dark:text-charcoal-50">
                    {activeDeal.amount ? formatCurrency(activeDeal.amount) : '-'}
                  </span>
                  <span className="font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                    {activeDeal.probability}%
                  </span>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* List View */
        <div className="floating-box overflow-hidden">
          <table className="min-w-full divide-y divide-alabaster-600/30 dark:divide-dark-border">
            <thead className="bg-alabaster-200 dark:bg-dark-tertiary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-syne font-bold text-charcoal-800 dark:text-charcoal-200 uppercase tracking-wider">
                  Deal Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-syne font-bold text-charcoal-800 dark:text-charcoal-200 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-syne font-bold text-charcoal-800 dark:text-charcoal-200 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-syne font-bold text-charcoal-800 dark:text-charcoal-200 uppercase tracking-wider">
                  Probability
                </th>
                <th className="px-6 py-3 text-right text-xs font-syne font-bold text-charcoal-800 dark:text-charcoal-200 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-secondary divide-y divide-alabaster-600/30 dark:divide-dark-border">
              {deals.map((deal) => {
                const stage = stages.find((s) => s.id === deal.stageId)
                return (
                  <tr key={deal.id} className="hover:bg-alabaster-100 dark:hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        to={`/deals/${deal.id}`}
                        className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50 hover:text-charcoal-700 dark:hover:text-charcoal-300 transition-colors"
                      >
                        {deal.name}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm font-syne-mono font-semibold text-charcoal-900 dark:text-charcoal-50">
                      {deal.amount ? formatCurrency(deal.amount) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center space-x-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: stage?.color || '#94a3b8' }}
                        />
                        <span className="badge badge-info">{stage?.name || 'Unknown'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                      {deal.probability}%
                    </td>
                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => handleEditDeal(deal)}
                        className="inline-flex items-center space-x-1 text-charcoal-900 dark:text-charcoal-300 hover:text-charcoal-700 dark:hover:text-charcoal-100 font-syne font-semibold mr-3 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteClick(deal)}
                        className="inline-flex items-center space-x-1 text-danger-600 dark:text-danger-400 hover:text-danger-800 dark:hover:text-danger-300 font-syne font-semibold transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {deals.length === 0 && !loading && (
            <div className="text-center py-12">
              <p className="text-charcoal-500 dark:text-charcoal-400 font-syne-mono">No deals found</p>
            </div>
          )}
        </div>
      )}

      {/* Deal Modal */}
      <DealModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveDeal}
        deal={selectedDeal}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Deal"
        message={`Are you sure you want to delete "${dealToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete Deal"
        confirmVariant="danger"
      />
    </div>
  )
}
