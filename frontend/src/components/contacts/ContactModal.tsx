import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

interface Contact {
  id?: string
  firstName: string
  lastName: string
  email: string
  company: string
  phone: string
  status: 'active' | 'inactive'
}

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (contact: Contact) => void
  contact?: Contact | null
}

export default function ContactModal({ isOpen, onClose, onSave, contact }: ContactModalProps) {
  const [formData, setFormData] = useState<Contact>({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
    status: 'active',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof Contact, string>>>({})

  useEffect(() => {
    if (contact) {
      setFormData(contact)
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        company: '',
        phone: '',
        status: 'active',
      })
    }
    setErrors({})
  }, [contact, isOpen])

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof Contact, string>> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (!formData.company.trim()) {
      newErrors.company = 'Company is required'
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required'
    } else if (!/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format'
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

  const handleChange = (field: keyof Contact, value: string) => {
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
            {contact ? 'Edit Contact' : 'Add New Contact'}
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
          {/* Name Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                First Name <span className="text-danger-600">*</span>
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                className={`input ${errors.firstName ? 'border-danger-600 focus:ring-danger-600' : ''}`}
                placeholder="John"
              />
              {errors.firstName && (
                <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.firstName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Last Name <span className="text-danger-600">*</span>
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                className={`input ${errors.lastName ? 'border-danger-600 focus:ring-danger-600' : ''}`}
                placeholder="Doe"
              />
              {errors.lastName && (
                <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
              Email <span className="text-danger-600">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              className={`input ${errors.email ? 'border-danger-600 focus:ring-danger-600' : ''}`}
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.email}</p>
            )}
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
              Company <span className="text-danger-600">*</span>
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => handleChange('company', e.target.value)}
              className={`input ${errors.company ? 'border-danger-600 focus:ring-danger-600' : ''}`}
              placeholder="Acme Corporation"
            />
            {errors.company && (
              <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.company}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
              Phone <span className="text-danger-600">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              className={`input ${errors.phone ? 'border-danger-600 focus:ring-danger-600' : ''}`}
              placeholder="+1 555-0100"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-danger-600 font-syne-mono">{errors.phone}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value as 'active' | 'inactive')}
              className="input"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
              {contact ? 'Update Contact' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
