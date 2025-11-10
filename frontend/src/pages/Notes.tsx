import { useState, useEffect } from 'react'
import { Plus, Search, Pin, Edit2, Trash2, FileText } from 'lucide-react'

interface Note {
  id: string
  title: string
  content: string
  entityType: string
  entityId: string
  isPinned: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export default function Notes() {
  const [notes, setNotes] = useState<Note[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    // TODO: Fetch notes from API
    setIsLoading(false)
  }, [])

  const pinnedNotes = notes.filter(note => note.isPinned)
  const regularNotes = notes.filter(note => !note.isPinned)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Notes
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your notes and documentation
        </p>
      </div>

      {/* Search and Actions */}
      <div className="mb-6 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                   transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Note
        </button>
      </div>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Pin className="w-5 h-5 text-blue-600" />
            Pinned Notes
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pinnedNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        </div>
      )}

      {/* All Notes */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          All Notes
        </h2>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No notes yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Get started by creating your first note
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Note
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularNotes.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function NoteCard({ note }: { note: Note }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-white flex-1">
          {note.title}
        </h3>
        {note.isPinned && (
          <Pin className="w-4 h-4 text-blue-600 flex-shrink-0" />
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
        {note.content}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
        <span>{new Date(note.createdAt).toLocaleDateString()}</span>
        <div className="flex gap-2">
          <button className="p-1 hover:text-blue-600 transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button className="p-1 hover:text-red-600 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
