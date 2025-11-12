/**
 * GDPR Template: Automated Decision-Making Objection
 * Template for handling GDPR Article 22 - Automated Decision-Making
 */

export const automatedDecisionObjectionTemplate = {
  id: 'automated-decision-objection',
  name: 'Automated Decision Objection (Article 22)',
  category: 'gdpr',
  priority: 'high',
  description: 'Customer objects to automated decision-making',

  requestDetails: {
    article: 'Article 22',
    rightName: 'Right not to be subject to automated decision-making',
    humanReviewRequired: true,
  },

  automatedDecisionTypes: [
    'Credit scoring',
    'Automated loan approval/denial',
    'Employment screening',
    'Algorithmic pricing',
    'Risk assessments',
  ],

  generateResponse: (data: any) => ({
    type: 'gdpr.automated_decision_objection',
    title: 'Automated Decision Objection Received',
    message: `${data.subjectName} objects to automated ${data.decisionType}`,
    metadata: {
      requestId: data.requestId,
      subjectId: data.subjectId,
      subjectName: data.subjectName,
      subjectEmail: data.subjectEmail,
      decisionType: data.decisionType,
      decisionId: data.decisionId,
      decisionDate: data.decisionDate,
      decisionOutcome: data.decisionOutcome,
      algorithmUsed: data.algorithmUsed,
      requestDate: data.requestDate,
      humanReviewRequested: true,
      status: 'pending_human_review',
    },
    actions: ['conduct_human_review', 'explain_decision', 'allow_appeal'],
    priority: 'high',
  }),

  example: {
    requestId: 'ado_007',
    subjectId: 'user_404',
    subjectName: 'Diana Chen',
    subjectEmail: 'diana.c@example.com',
    decisionType: 'Credit scoring',
    decisionId: 'decision_xyz789',
    decisionDate: '2025-11-15',
    decisionOutcome: 'Declined',
    algorithmUsed: 'ML_CreditScore_v2',
    requestDate: '2025-11-18',
  },
};
