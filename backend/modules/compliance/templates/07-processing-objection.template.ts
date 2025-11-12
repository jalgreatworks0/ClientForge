/**
 * GDPR Template: Objection to Processing
 * Template for handling GDPR Article 21 - Right to Object
 */

export const processingObjectionTemplate = {
  id: 'processing-objection',
  name: 'Objection to Processing (Article 21)',
  category: 'gdpr',
  priority: 'high',
  description: 'Customer objects to specific data processing activities',

  requestDetails: {
    article: 'Article 21',
    rightName: 'Right to Object',
    responseRequired: 'Must stop or demonstrate compelling grounds',
  },

  processingTypes: [
    'Direct marketing',
    'Profiling for marketing',
    'Scientific research',
    'Statistical purposes',
    'Legitimate interests',
  ],

  generateResponse: (data: any) => ({
    type: 'gdpr.processing_objection',
    title: 'Processing Objection Received',
    message: `${data.subjectName} objects to ${data.processingActivity}`,
    metadata: {
      requestId: data.requestId,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      subjectEmail: data.subjectEmail,
      processingActivity: data.processingActivity,
      processingPurpose: data.processingPurpose,
      legalBasis: data.legalBasis,
      objectionReason: data.objectionReason,
      requestDate: data.requestDate,
      status: 'under_review',
    },
    actions: ['review_grounds', 'cease_processing', 'notify_subject'],
    priority: 'high',
  }),

  example: {
    requestId: 'po_006',
    subjectId: 'user_303',
    subjectName: 'Carlos Martinez',
    subjectEmail: 'carlos.m@example.com',
    processingActivity: 'Behavioral profiling',
    processingPurpose: 'Targeted advertising',
    legalBasis: 'legitimate_interest',
    objectionReason: 'Privacy concerns',
    requestDate: '2025-11-18',
  },
};
