/**
 * GDPR Template: Data Breach Notification
 * Template for GDPR Article 33/34 - Data Breach Notification
 */

export const dataBreachNotificationTemplate = {
  id: 'data-breach-notification',
  name: 'Data Breach Notification (Article 33/34)',
  category: 'gdpr',
  priority: 'critical',
  description: 'Notification protocol for data breaches',

  requestDetails: {
    article: 'Articles 33 & 34',
    supervisoryAuthorityDeadline: '72 hours',
    subjectNotificationRequired: 'if high risk',
  },

  generateResponse: (data: any) => ({
    type: 'gdpr.data_breach',
    title: '🚨 CRITICAL: Data Breach Detected',
    message: `Data breach affecting ${data.affectedCount} subjects - ${data.severity} severity`,
    metadata: {
      breachId: data.breachId,
      detectedDate: data.detectedDate,
      breachType: data.breachType,
      affectedCount: data.affectedCount,
      dataCategories: data.dataCategories,
      severity: data.severity,
      containmentStatus: data.containmentStatus,
      supervisoryAuthorityNotified: data.supervisoryAuthorityNotified,
      subjectsNotified: data.subjectsNotified,
      reportingDeadline: data.reportingDeadline,
    },
    actions: [
      'contain_breach',
      'notify_dpo',
      'notify_supervisory_authority',
      'notify_affected_subjects',
      'document_incident',
    ],
    priority: 'critical',
  }),

  example: {
    breachId: 'breach_001',
    detectedDate: '2025-11-18T09:15:00Z',
    breachType: 'Unauthorized access',
    affectedCount: 1250,
    dataCategories: ['email', 'names', 'phone numbers'],
    severity: 'high',
    containmentStatus: 'contained',
    supervisoryAuthorityNotified: false,
    subjectsNotified: false,
    reportingDeadline: '2025-11-21T09:15:00Z',
  },
};
