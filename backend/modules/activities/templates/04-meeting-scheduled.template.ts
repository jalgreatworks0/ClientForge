/**
 * Activity Template: Meeting Scheduled
 * Triggered when a meeting is scheduled with a contact or account
 */

export const meetingScheduledTemplate = {
  id: 'meeting-scheduled',
  name: 'Meeting Scheduled',
  category: 'meetings',
  priority: 'high',
  description: 'Activity logged when a meeting is scheduled',

  generateActivity: (data: any) => ({
    type: 'meeting.scheduled',
    title: `Meeting scheduled: ${data.meetingTitle}`,
    description: `${data.userName} scheduled "${data.meetingTitle}" for ${data.scheduledDate}`,
    metadata: {
      meetingId: data.meetingId,
      meetingTitle: data.meetingTitle,
      scheduledDate: data.scheduledDate,
      duration: data.duration,
      attendees: data.attendees,
      location: data.location,
      relatedTo: data.relatedTo,
    },
    icon: 'calendar',
    color: '#9C27B0',
  }),

  example: {
    meetingId: 'meeting-001',
    meetingTitle: 'Q4 Strategy Review',
    userName: 'David Martinez',
    scheduledDate: '2025-11-20 14:00',
    duration: 60,
    attendees: ['john@example.com', 'sarah@example.com'],
    location: 'Conference Room A',
    relatedTo: 'account-123',
  },
};
