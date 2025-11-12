/**
 * Activity Template: Note Added
 * Triggered when a note is added to a contact, account, or deal
 */

export const noteAddedTemplate = {
  id: 'note-added',
  name: 'Note Added',
  category: 'notes',
  priority: 'low',
  description: 'Activity logged when a note is added',

  generateActivity: (data: any) => ({
    type: 'note.added',
    title: `Note added to ${data.relatedType}`,
    description: `${data.userName} added a note: "${data.notePreview}..."`,
    metadata: {
      noteId: data.noteId,
      relatedType: data.relatedType,
      relatedId: data.relatedId,
      notePreview: data.notePreview,
      isPrivate: data.isPrivate,
      tags: data.tags,
    },
    icon: 'note',
    color: '#607D8B',
  }),

  example: {
    noteId: 'note-555',
    relatedType: 'contact',
    relatedId: 'contact-789',
    userName: 'Emily Rodriguez',
    notePreview: 'Client expressed interest in premium features',
    isPrivate: false,
    tags: ['follow-up', 'upsell-opportunity'],
  },
};
