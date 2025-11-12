/**
 * Activity Template: Call Logged
 * Triggered when a phone call is logged in the system
 */

export const callLoggedTemplate = {
  id: 'call-logged',
  name: 'Call Logged',
  category: 'communication',
  priority: 'medium',
  description: 'Activity logged when a phone call is recorded',

  generateActivity: (data: any) => ({
    type: 'call.logged',
    title: `${data.callType} call: ${data.contactName}`,
    description: `${data.userName} logged a ${data.duration} minute ${data.callType} call with ${data.contactName}`,
    metadata: {
      callId: data.callId,
      callType: data.callType,
      duration: data.duration,
      contactName: data.contactName,
      contactPhone: data.contactPhone,
      outcome: data.outcome,
      notes: data.notes,
    },
    icon: 'phone',
    color: '#4CAF50',
  }),

  example: {
    callId: 'call-777',
    callType: 'Outbound',
    duration: 25,
    contactName: 'Lisa Anderson',
    contactPhone: '+1-555-0123',
    userName: 'Tom Wilson',
    outcome: 'interested',
    notes: 'Discussed pricing options, will send proposal',
  },
};
