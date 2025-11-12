/**
 * GDPR Template: Data Access Request
 * Template for handling GDPR Article 15 - Right of Access requests
 */

export const dataAccessRequestTemplate = {
  id: 'data-access-request',
  name: 'Data Access Request (Article 15)',
  category: 'gdpr',
  priority: 'high',
  description: 'Subject Access Request - Customer wants to see all their data',

  requestDetails: {
    article: 'Article 15',
    rightName: 'Right of Access',
    deadline: '30 days',
    verificationRequired: true,
  },

  dataToProvide: [
    'Personal identification data',
    'Contact details',
    'Account history',
    'Transaction records',
    'Communication logs',
    'System activity logs',
    'Marketing preferences',
  ],

  generateResponse: (data: any) => ({
    type: 'gdpr.data_access_request',
    title: 'Data Access Request Received',
    message: `${data.subjectName} (${data.subjectEmail}) has requested access to their personal data`,
    metadata: {
      requestId: data.requestId,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      subjectEmail: data.subjectEmail,
      requestDate: data.requestDate,
      verificationMethod: data.verificationMethod,
      deadline: data.deadline,
      status: 'pending_verification',
    },
    actions: ['verify_identity', 'collect_data', 'generate_report'],
    priority: 'high',
  }),

  example: {
    requestId: 'dar_001',
    subjectId: 'user_123',
    subjectName: 'Jane Doe',
    subjectEmail: 'jane.doe@example.com',
    requestDate: '2025-11-18',
    verificationMethod: 'email',
    deadline: '2025-12-18',
  },
};
