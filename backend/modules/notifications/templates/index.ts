/**
 * Notifications Module Templates
 * 10 example notification templates for real-time alerts
 */

// 1. Deal Won Notification
export const dealWonNotificationTemplate = {
  id: 'deal-won-notification',
  name: 'Deal Won Alert',
  priority: 'high',
  channels: ['in-app', 'email', 'push'],
  template: '🎉 Congratulations! {{user}} closed {{deal_name}} worth ${{value}}',
  example: { user: 'Sarah J.', deal_name: 'Enterprise Contract', value: '50,000' },
};

// 2. Task Due Soon Notification
export const taskDueSoonNotificationTemplate = {
  id: 'task-due-soon',
  name: 'Task Due Soon',
  priority: 'medium',
  channels: ['in-app', 'email'],
  template: '⏰ Task "{{task_title}}" is due in {{hours}} hours',
  example: { task_title: 'Follow up with client', hours: '2' },
};

// 3. New Lead Assigned Notification
export const newLeadAssignedNotificationTemplate = {
  id: 'new-lead-assigned',
  name: 'New Lead Assigned',
  priority: 'high',
  channels: ['in-app', 'email', 'sms'],
  template: '📩 New lead assigned: {{contact_name}} from {{company}}',
  example: { contact_name: 'Michael Chen', company: 'TechStart Inc' },
};

// 4. Meeting Reminder Notification
export const meetingReminderNotificationTemplate = {
  id: 'meeting-reminder',
  name: 'Meeting Reminder',
  priority: 'high',
  channels: ['in-app', 'email', 'push'],
  template: '📅 Meeting "{{meeting_title}}" starts in {{minutes}} minutes',
  example: { meeting_title: 'Q4 Strategy Review', minutes: '15' },
};

// 5. Invoice Paid Notification
export const invoicePaidNotificationTemplate = {
  id: 'invoice-paid',
  name: 'Invoice Paid',
  priority: 'medium',
  channels: ['in-app', 'email'],
  template: '✅ Invoice #{{invoice_number}} paid by {{customer}} (${{amount}})',
  example: { invoice_number: 'INV-2025-001', customer: 'Acme Corp', amount: '1,299.99' },
};

// 6. Deal Stage Changed Notification
export const dealStageChangedNotificationTemplate = {
  id: 'deal-stage-changed',
  name: 'Deal Stage Change',
  priority: 'medium',
  channels: ['in-app'],
  template: '🔄 {{user}} moved "{{deal_name}}" from {{old_stage}} to {{new_stage}}',
  example: { user: 'Tom W.', deal_name: 'Enterprise Deal', old_stage: 'Qualification', new_stage: 'Proposal' },
};

// 7. Team Mention Notification
export const teamMentionNotificationTemplate = {
  id: 'team-mention',
  name: 'Team Mention',
  priority: 'high',
  channels: ['in-app', 'push'],
  template: '💬 {{user}} mentioned you in {{context}}: "{{preview}}"',
  example: { user: 'Emily R.', context: 'Deal Notes', preview: '@john can you follow up on this?' },
};

// 8. Goal Achievement Notification
export const goalAchievementNotificationTemplate = {
  id: 'goal-achievement',
  name: 'Goal Achieved',
  priority: 'high',
  channels: ['in-app', 'email'],
  template: '🎯 Goal achieved! {{team}} reached {{goal_name}} ({{percentage}}%)',
  example: { team: 'Sales Team', goal_name: 'Q4 Revenue Target', percentage: '105' },
};

// 9. Customer Feedback Received Notification
export const feedbackReceivedNotificationTemplate = {
  id: 'feedback-received',
  name: 'Customer Feedback',
  priority: 'medium',
  channels: ['in-app', 'email'],
  template: '⭐ New {{rating}}-star review from {{customer}}: "{{feedback}}"',
  example: { rating: '5', customer: 'Jane Smith', feedback: 'Excellent service!' },
};

// 10. System Alert Notification
export const systemAlertNotificationTemplate = {
  id: 'system-alert',
  name: 'System Alert',
  priority: 'critical',
  channels: ['in-app', 'email', 'sms'],
  template: '🚨 ALERT: {{alert_type}} - {{message}}',
  example: { alert_type: 'Performance Issue', message: 'API response time elevated' },
};

// Export all templates
export const notificationTemplates = [
  dealWonNotificationTemplate,
  taskDueSoonNotificationTemplate,
  newLeadAssignedNotificationTemplate,
  meetingReminderNotificationTemplate,
  invoicePaidNotificationTemplate,
  dealStageChangedNotificationTemplate,
  teamMentionNotificationTemplate,
  goalAchievementNotificationTemplate,
  feedbackReceivedNotificationTemplate,
  systemAlertNotificationTemplate,
];
