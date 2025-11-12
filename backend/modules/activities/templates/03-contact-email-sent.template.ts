/**
 * Activity Template: Contact Email Sent
 * Triggered when an email is sent to a contact
 */

export const contactEmailSentTemplate = {
  id: 'contact-email-sent',
  name: 'Contact Email Sent',
  category: 'communication',
  priority: 'medium',
  description: 'Activity logged when an email is sent to a contact',

  generateActivity: (data: any) => ({
    type: 'contact.email_sent',
    title: `Email sent to ${data.contactName}`,
    description: `${data.userName} sent "${data.subject}" to ${data.contactEmail}`,
    metadata: {
      contactId: data.contactId,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      subject: data.subject,
      emailId: data.emailId,
      hasAttachments: data.hasAttachments,
    },
    icon: 'email-send',
    color: '#FF9800',
  }),

  example: {
    contactId: 'contact-789',
    contactName: 'Michael Chen',
    contactEmail: 'michael.chen@example.com',
    userName: 'Sales Team',
    subject: 'Re: Product Demo Request',
    emailId: 'email-abc123',
    hasAttachments: true,
  },
};
