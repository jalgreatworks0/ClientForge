import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  confirmVariant?: 'danger' | 'primary'
  isLoading?: boolean
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  confirmVariant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal-900/50 backdrop-blur-sm p-4">
      <div className="floating-box w-full max-w-md bg-white dark:bg-dark-secondary animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-alabaster-600/30 dark:border-dark-border">
          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              confirmVariant === 'danger'
                ? 'bg-danger-100 dark:bg-danger-900/20'
                : 'bg-primary-100 dark:bg-primary-900/20'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                confirmVariant === 'danger'
                  ? 'text-danger-600 dark:text-danger-400'
                  : 'text-primary-600 dark:text-primary-400'
              }`} />
            </div>
            <h2 className="text-xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-alabaster-200 dark:hover:bg-dark-hover rounded-lg transition-all duration-200 hover:scale-110 disabled:opacity-50"
          >
            <X className="w-5 h-5 text-charcoal-600 dark:text-charcoal-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-charcoal-700 dark:text-charcoal-300 font-syne-mono text-sm leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-alabaster-600/30 dark:border-dark-border bg-alabaster-100 dark:bg-dark-tertiary rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isLoading}
            className={`btn ${
              confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'
            } ${isLoading ? 'opacity-75 cursor-wait' : ''}`}
          >
            {isLoading ? (
              <span className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Processing...</span>
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
