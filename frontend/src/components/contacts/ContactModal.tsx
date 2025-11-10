import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Contact } from '../../services/contacts.service'

interface ContactFormData {
  id?: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  mobile?: string
  title?: string
  department?: string
  leadStatus?: string
  lifecycleStage?: string
  notes?: string
}

interface ContactModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (contact: ContactFormData) => void
  contact?: Contact | null
}

export default function ContactModal({ isOpen, onClose, onSave, contact }: ContactModalProps) {
  const [formData, setFormData] = useState<ContactFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    mobile: '',
    title: '',
    department: '',
    leadStatus: 'new',
    lifecycleStage: 'lead',
    notes: '',
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormData, string>>>({})

  useEffect(() => {
    if (contact) {
      setFormData({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email || '',
        phone: contact.phone || '',
        mobile: contact.mobile || '',
        title: contact.title || '',
        department: contact.department || '',
        leadStatus: contact.leadStatus || 'new',
        lifecycleStage: contact.lifecycleStage || 'lead',
        notes: contact.notes || '',
      })
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        mobile: '',
        title: '',
        department: '',
        leadStatus: 'new',
        lifecycleStage: 'lead',
        notes: '',
      })
    }
    setErrors({})
  }, [contact, isOpen])

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ContactFormData, string>> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required'
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required'
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (formData.phone && !/^\+?[\d\s-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validate()) {
      // Convert empty strings to null for optional fields
      const submitData = {
        ...formData,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        mobile: formData.mobile?.trim() || null,
        title: formData.title?.trim() || null,
        department: formData.department?.trim() || null,
        notes: formData.notes?.trim() || null,
      }
      onSave(submitData)
    }
  }

  const handleChange = (field: keyof ContactFormData, value: string) => {
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

          {/* Email & Title Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Email
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

            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Title/Position
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="input"
                placeholder="Sales Manager"
              />
            </div>
          </div>

          {/* Phone Numbers Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Phone
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

            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Mobile
              </label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => handleChange('mobile', e.target.value)}
                className="input"
                placeholder="+1 555-0101"
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
              Department
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => handleChange('department', e.target.value)}
              className="input"
              placeholder="Sales"
            />
          </div>

          {/* Lead Status & Lifecycle Stage Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Lead Status
              </label>
              <select
                value={formData.leadStatus}
                onChange={(e) => handleChange('leadStatus', e.target.value)}
                className="input"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="unqualified">Unqualified</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
                Lifecycle Stage
              </label>
              <select
                value={formData.lifecycleStage}
                onChange={(e) => handleChange('lifecycleStage', e.target.value)}
                className="input"
              >
                <option value="lead">Lead</option>
                <option value="mql">Marketing Qualified Lead</option>
                <option value="sql">Sales Qualified Lead</option>
                <option value="opportunity">Opportunity</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-syne font-semibold text-charcoal-900 dark:text-charcoal-50 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="input min-h-[100px]"
              placeholder="Additional notes about this contact..."
            />
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
