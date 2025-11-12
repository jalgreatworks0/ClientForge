/**
 * GDPR Template: Consent Withdrawal
 * Template for handling GDPR Article 7(3) - Right to Withdraw Consent
 */

export const consentWithdrawalTemplate = {
  id: 'consent-withdrawal',
  name: 'Consent Withdrawal (Article 7)',
  category: 'gdpr',
  priority: 'high',
  description: 'Customer withdraws consent for data processing',

  requestDetails: {
    article: 'Article 7(3)',
    rightName: 'Right to Withdraw Consent',
    immediateEffect: true,
  },

  consentTypes: [
    'Marketing communications',
    'Analytics tracking',
    'Third-party data sharing',
    'Profiling',
    'Automated decision-making',
  ],

  generateResponse: (data: any) => ({
    type: 'gdpr.consent_withdrawal',
    title: 'Consent Withdrawal Received',
    message: `${data.subjectName} withdrew consent for ${data.consentCategories.join(', ')}`,
    metadata: {
      requestId: data.requestId,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      subjectEmail: data.subjectEmail,
      consentCategories: data.consentCategories,
      withdrawalDate: data.withdrawalDate,
      effectiveDate: data.effectiveDate,
      impactedServices: data.impactedServices,
      status: 'processing',
    },
    actions: ['update_preferences', 'stop_processing', 'notify_systems'],
    priority: 'high',
  }),

  example: {
    requestId: 'cw_005',
    subjectId: 'user_202',
    subjectName: 'Emma Davis',
    subjectEmail: 'emma.d@example.com',
    consentCategories: ['marketing', 'profiling'],
    withdrawalDate: '2025-11-18',
    effectiveDate: '2025-11-18',
    impactedServices: ['email_campaigns', 'recommendation_engine'],
  },
};
