import { useState } from 'react'
import { Link } from 'react-router-dom'
import ContactModal from '../components/contacts/ContactModal'
import ConfirmDialog from '../components/common/ConfirmDialog'

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  company: string
  phone: string
  status: 'active' | 'inactive'
}

const initialContacts: Contact[] = [
  { id: '1', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@acme.com', company: 'Acme Corp', phone: '+1 555-0101', status: 'active' },
  { id: '2', firstName: 'Michael', lastName: 'Chen', email: 'm.chen@beta.com', company: 'Beta Inc', phone: '+1 555-0102', status: 'active' },
  { id: '3', firstName: 'Emma', lastName: 'Davis', email: 'emma@gamma.com', company: 'Gamma LLC', phone: '+1 555-0103', status: 'inactive' },
  { id: '4', firstName: 'James', lastName: 'Wilson', email: 'j.wilson@delta.com', company: 'Delta Corp', phone: '+1 555-0104', status: 'active' },
]

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null)

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.firstName.toLowerCase().includes(search.toLowerCase()) ||
      contact.lastName.toLowerCase().includes(search.toLowerCase()) ||
      contact.email.toLowerCase().includes(search.toLowerCase()) ||
      contact.company.toLowerCase().includes(search.toLowerCase())

    const matchesFilter = filter === 'all' || contact.status === filter

    return matchesSearch && matchesFilter
  })

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

  const handleSaveContact = (contactData: Omit<Contact, 'id'> & { id?: string }) => {
    if (contactData.id) {
      // Update existing contact
      setContacts(prev =>
        prev.map(c => (c.id === contactData.id ? { ...contactData, id: contactData.id } : c))
      )
    } else {
      // Add new contact
      const newContact: Contact = {
        ...contactData,
        id: Date.now().toString(),
      }
      setContacts(prev => [...prev, newContact])
    }
  }

  const handleConfirmDelete = () => {
    if (contactToDelete) {
      setContacts(prev => prev.filter(c => c.id !== contactToDelete.id))
      setIsDeleteDialogOpen(false)
      setContactToDelete(null)
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
            {contacts.length} total contacts
          </p>
        </div>
        <button onClick={handleAddContact} className="btn btn-primary">
          + Add Contact
        </button>
      </div>

      {/* Filters */}
      <div className="floating-box p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button className="btn btn-secondary">
            Import
          </button>
          <button className="btn btn-secondary">
            Export
          </button>
        </div>
      </div>

      {/* Contacts List */}
      <div className="floating-box overflow-hidden">
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
                Company
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
            {filteredContacts.map((contact) => (
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
                  {contact.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                  {contact.company}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-syne-mono text-charcoal-600 dark:text-charcoal-400">
                  {contact.phone}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`badge ${
                      contact.status === 'active'
                        ? 'badge-success'
                        : 'badge-danger'
                    }`}
                  >
                    {contact.status}
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

        {filteredContacts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-charcoal-500 dark:text-charcoal-400 font-syne-mono">No contacts found</p>
          </div>
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
