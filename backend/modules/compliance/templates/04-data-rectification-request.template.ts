/**
 * GDPR Template: Data Rectification Request
 * Template for handling GDPR Article 16 - Right to Rectification
 */

export const dataRectificationRequestTemplate = {
  id: 'data-rectification-request',
  name: 'Data Rectification Request (Article 16)',
  category: 'gdpr',
  priority: 'medium',
  description: 'Customer wants to correct inaccurate data',

  requestDetails: {
    article: 'Article 16',
    rightName: 'Right to Rectification',
    deadline: '30 days',
    verificationRequired: true,
  },

  generateResponse: (data: any) => ({
    type: 'gdpr.data_rectification_request',
    title: 'Data Rectification Request Received',
    message: `${data.subjectName} wants to correct ${data.fieldsToUpdate.length} field(s)`,
    metadata: {
      requestId: data.requestId,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      subjectEmail: data.subjectEmail,
      fieldsToUpdate: data.fieldsToUpdate,
      currentValues: data.currentValues,
      proposedValues: data.proposedValues,
      requestDate: data.requestDate,
      deadline: data.deadline,
      status: 'pending_review',
    },
    actions: ['verify_changes', 'update_records', 'notify_third_parties'],
    priority: 'medium',
  }),

  example: {
    requestId: 'drr_004',
    subjectId: 'user_101',
    subjectName: 'Bob Williams',
    subjectEmail: 'bob.w@example.com',
    fieldsToUpdate: ['phone', 'address'],
    currentValues: {
      phone: '+1-555-1234',
      address: '123 Old St',
    },
    proposedValues: {
      phone: '+1-555-9999',
      address: '456 New Ave',
    },
    requestDate: '2025-11-18',
    deadline: '2025-12-18',
  },
};
