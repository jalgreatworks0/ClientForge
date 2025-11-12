/**
 * GDPR Template: Right to be Forgotten
 * Template for handling GDPR Article 17 - Right to Erasure requests
 */

export const dataDeletionRequestTemplate = {
  id: 'data-deletion-request',
  name: 'Data Deletion Request (Article 17)',
  category: 'gdpr',
  priority: 'critical',
  description: 'Right to be Forgotten - Customer wants their data deleted',

  requestDetails: {
    article: 'Article 17',
    rightName: 'Right to Erasure',
    deadline: '30 days',
    verificationRequired: true,
    legalHoldsCheck: true,
  },

  dataToDelete: [
    'Personal information',
    'Account details',
    'Transaction history (where legally allowed)',
    'Communication logs',
    'Marketing data',
    'Activity logs',
  ],

  dataToRetain: [
    'Financial records (tax compliance - 7 years)',
    'Legal documents',
    'Fraud prevention data',
  ],

  generateResponse: (data: any) => ({
    type: 'gdpr.data_deletion_request',
    title: '⚠️ Data Deletion Request Received',
    message: `${data.subjectName} has requested deletion of all personal data`,
    metadata: {
      requestId: data.requestId,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      subjectEmail: data.subjectEmail,
      requestDate: data.requestDate,
      legalHoldsCheck: data.legalHoldsCheck,
      retentionRequirements: data.retentionRequirements,
      deadline: data.deadline,
      status: 'pending_review',
    },
    actions: ['verify_identity', 'check_legal_holds', 'execute_deletion'],
    priority: 'critical',
  }),

  example: {
    requestId: 'ddr_002',
    subjectId: 'user_456',
    subjectName: 'John Smith',
    subjectEmail: 'john.smith@example.com',
    requestDate: '2025-11-18',
    legalHoldsCheck: false,
    retentionRequirements: ['financial_7years'],
    deadline: '2025-12-18',
  },
};
