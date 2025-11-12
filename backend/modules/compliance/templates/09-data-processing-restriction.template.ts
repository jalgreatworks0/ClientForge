/**
 * GDPR Template: Data Processing Restriction
 * Template for handling GDPR Article 18 - Right to Restriction of Processing
 */

export const dataProcessingRestrictionTemplate = {
  id: 'data-processing-restriction',
  name: 'Processing Restriction (Article 18)',
  category: 'gdpr',
  priority: 'high',
  description: 'Customer requests restriction of data processing',

  requestDetails: {
    article: 'Article 18',
    rightName: 'Right to Restriction of Processing',
    dataRetained: true,
    processingRestricted: true,
  },

  restrictionGrounds: [
    'Accuracy of data is contested',
    'Processing is unlawful',
    'No longer needed but subject requires for legal claims',
    'Objection pending verification',
  ],

  generateResponse: (data: any) => ({
    type: 'gdpr.processing_restriction',
    title: 'Processing Restriction Requested',
    message: `${data.subjectName} requests restriction on ${data.dataCategories.join(', ')}`,
    metadata: {
      requestId: data.requestId,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      subjectEmail: data.subjectEmail,
      restrictionGround: data.restrictionGround,
      dataCategories: data.dataCategories,
      requestDate: data.requestDate,
      restrictionPeriod: data.restrictionPeriod,
      impactedProcesses: data.impactedProcesses,
      status: 'restriction_applied',
    },
    actions: ['apply_restriction', 'notify_third_parties', 'lift_when_resolved'],
    priority: 'high',
  }),

  example: {
    requestId: 'dpr_008',
    subjectId: 'user_505',
    subjectName: 'Frank Anderson',
    subjectEmail: 'frank.a@example.com',
    restrictionGround: 'Accuracy contested',
    dataCategories: ['contact_info', 'employment_history'],
    requestDate: '2025-11-18',
    restrictionPeriod: 'Until verification complete',
    impactedProcesses: ['marketing', 'analytics'],
  },
};
