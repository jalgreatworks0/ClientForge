/**
 * GDPR Template: Data Portability Request
 * Template for handling GDPR Article 20 - Right to Data Portability
 */

export const dataPortabilityRequestTemplate = {
  id: 'data-portability-request',
  name: 'Data Portability Request (Article 20)',
  category: 'gdpr',
  priority: 'high',
  description: 'Customer wants their data in a machine-readable format',

  requestDetails: {
    article: 'Article 20',
    rightName: 'Right to Data Portability',
    deadline: '30 days',
    format: 'structured, commonly used, machine-readable',
  },

  exportFormats: ['JSON', 'CSV', 'XML'],

  dataToExport: [
    'Account information',
    'Profile data',
    'Transaction history',
    'Communication history',
    'Preferences and settings',
    'Uploaded documents',
  ],

  generateResponse: (data: any) => ({
    type: 'gdpr.data_portability_request',
    title: 'Data Portability Request Received',
    message: `${data.subjectName} requested their data in ${data.preferredFormat} format`,
    metadata: {
      requestId: data.requestId,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      subjectEmail: data.subjectEmail,
      preferredFormat: data.preferredFormat,
      transferTo: data.transferTo,
      requestDate: data.requestDate,
      deadline: data.deadline,
      status: 'processing',
    },
    actions: ['generate_export', 'encrypt_data', 'deliver_securely'],
    priority: 'high',
  }),

  example: {
    requestId: 'dpr_003',
    subjectId: 'user_789',
    subjectName: 'Alice Johnson',
    subjectEmail: 'alice.j@example.com',
    preferredFormat: 'JSON',
    transferTo: 'competitor-crm.com',
    requestDate: '2025-11-18',
    deadline: '2025-12-18',
  },
};
