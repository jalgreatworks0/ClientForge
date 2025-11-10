import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import ContactModal from '../components/contacts/ContactModal'
import ConfirmDialog from '../components/common/ConfirmDialog'
import { contactService, Contact } from '../services/contacts.service'

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const limit = 20

  // Fetch contacts on mount and when filters change
  useEffect(() => {
    fetchContacts()
  }, [page, search, filter])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      setError(null)

      const filters: any = {}
      if (search) filters.search = search
      if (filter !== 'all') filters.isActive = filter === 'active'

      const response = await contactService.listContacts({
        page,
        limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
        filters,
      })

      setContacts(response.data)
      setTotal(response.pagination.total)
      setTotalPages(response.pagination.totalPages)
    } catch (err: any) {
      console.error('Failed to fetch contacts:', err)
      setError(err.response?.data?.message || 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }

  const handleAddContact = () => {
    setSelectedContact(null)
    setIsModalOpen(true)
  }

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact)
    setIsModalOpen(true)
  }

  const handleDeleteClick = (contact: Contact) => {
    setContactToDelete(contact)
    setIsDeleteDialogOpen(true)
  }

  const handleSaveContact = async (contactData: any) => {
    try {
      if (contactData.id) {
        // Update existing contact
        await contactService.updateContact(contactData.id, contactData)
      } else {
        // Add new contact
        await contactService.createContact(contactData)
      }
      setIsModalOpen(false)
      fetchContacts() // Refresh list
    } catch (err: any) {
      console.error('Failed to save contact:', err)
      alert(err.response?.data?.message || 'Failed to save contact')
    }
  }

  const handleConfirmDelete = async () => {
    if (contactToDelete) {
      try {
        await contactService.deleteContact(contactToDelete.id)
        setIsDeleteDialogOpen(false)
        setContactToDelete(null)
        fetchContacts() // Refresh list
      } catch (err: any) {
        console.error('Failed to delete contact:', err)
        alert(err.response?.data?.message || 'Failed to delete contact')
      }
    }
  }

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(1) // Reset to first page on search
  }

  const handleFilterChange = (value: string) => {
    setFilter(value)
    setPage(1) // Reset to first page on filter change
  }

  const handleExport = async (format: 'csv' | 'xlsx') => {
    try {
      setExporting(true)
      const blob = await contactService.exportContacts(format)

      // Download file
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contacts-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      console.error('Failed to export contacts:', err)
      alert(err.response?.data?.message || 'Failed to export contacts')
    } finally {
      setExporting(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setImporting(true)
      const result = await contactService.importContacts(file)

      alert(
        `Import completed!\n\nTotal: ${result.data.total}\nSuccessful: ${result.data.successCount}\nFailed: ${result.data.failedCount}`
      )

      if (result.data.successCount > 0) {
        fetchContacts() // Refresh list
      }
    } catch (err: any) {
      console.error('Failed to import contacts:', err)
      alert(err.response?.data?.message || 'Failed to import contacts')
    } finally {
      setImporting(false)
      // Reset file input
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-syne font-bold text-charcoal-900 dark:text-charcoal-50 mb-2">
            Contacts
          </h1>
          <p className="text-charcoal-600 dark:text-charcoal-400 font-syne-mono text-sm">
            {total} total contacts
          </p>
        </div>
        <button onClick={handleAddContact} className="btn btn-primary">
          + Add Contact
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="floating-box p-4 bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800">
          <p className="text-danger-800 dark:text-danger-200 font-syne">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="floating-box p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <label className="btn btn-secondary cursor-pointer">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleImport}
              className="hidden"
              disabled={importing}
            />
            {importing ? 'Importing...' : 'Import'}
          </label>
          <button
            onClick={() => handleExport('csv')}
            disabled={exporting}
            className="btn btn-secondary"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exporting}
            className="btn btn-secondary"
          >
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      {/* Contacts List */}
      <div className="floating-box overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <p className="text-charcoal-500 dark:text-charcoal-400 font-syne-mono">Loading contacts...</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-alabaster-600/30 dark:divide-dark-border">
              <thead className="bg-alabaster-200 dark:bg-dark-tertiary">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-syne font-bold text-charcoal-800 dark:text-charcoal-200 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-syne font-bold text-charcoal-800 dark:text-charcoal-200 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-syne font-bold text-charcoal-800 dark:text-charcoal-200 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-syne font-bold text-charcoal-800 dark:text-charcoal-200 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-syne font-bold text-charcoal-800 dark:text-charcoal-200 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-syne font-bold text-charcoal-800 dark:text-charcoal-200 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-secondary divide-y divide-alabaster-600/30 dark:divide-dark-border">
                {contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-alabaster-100 dark:hover:bg-dark-hover transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-charcoal-900 dark:bg-charcoal-700 flex items-center justify-center text-white font-syne font-semibold text-sm">
                          {contact.firstName[0]}{contact.lastName[0]}
                        </div>
                        <div className="ml-4">
                          <Link
                            to={`/contacts/${contact.id}`}
                            className="font-syne font-medium text-charcoal-900 dark:text-charcoal-50 hover:text-charcoal-700 dark:hover:text-charcoal-300 transition-colors"
                          >
                            {contact.firstName} {contact.lastName}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                      {contact.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                      {contact.title || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                      {contact.phone || contact.mobile || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`badge ${
                          contact.isActive
                            ? 'badge-success'
                            : 'badge-danger'
                        }`}
                      >
                        {contact.isActive ? 'active' : 'inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleEditContact(contact)}
                        className="text-charcoal-900 dark:text-charcoal-300 hover:text-charcoal-700 dark:hover:text-charcoal-100 font-syne font-semibold mr-3 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(contact)}
                        className="text-danger-600 dark:text-danger-400 hover:text-danger-800 dark:hover:text-danger-300 font-syne font-semibold transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {contacts.length === 0 && !loading && (
              <div className="text-center py-12">
                <p className="text-charcoal-500 dark:text-charcoal-400 font-syne-mono">No contacts found</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-alabaster-100 dark:bg-dark-tertiary border-t border-alabaster-600/30 dark:border-dark-border">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-charcoal-600 dark:text-charcoal-400 font-syne-mono">
                    Page {page} of {totalPages} ({total} total)
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="btn btn-secondary btn-sm"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="btn btn-secondary btn-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveContact}
        contact={selectedContact}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Contact"
        message={`Are you sure you want to delete ${contactToDelete?.firstName} ${contactToDelete?.lastName}? This action cannot be undone.`}
        confirmText="Delete"
        confirmVariant="danger"
      />
    </div>
  )
}
