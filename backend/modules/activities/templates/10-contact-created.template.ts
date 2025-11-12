/**
 * Activity Template: Contact Created
 * Triggered when a new contact is added to the system
 */

export const contactCreatedTemplate = {
  id: 'contact-created',
  name: 'Contact Created',
  category: 'contacts',
  priority: 'medium',
  description: 'Activity logged when a new contact is created',

  generateActivity: (data: any) => ({
    type: 'contact.created',
    title: `New contact: ${data.contactName}`,
    description: `${data.userName} added ${data.contactName} from ${data.company} as a new contact`,
    metadata: {
      contactId: data.contactId,
      contactName: data.contactName,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      company: data.company,
      source: data.source,
      assignedTo: data.assignedTo,
    },
    icon: 'user-add',
    color: '#2196F3',
  }),

  example: {
    contactId: 'contact-new-001',
    contactName: 'Robert Taylor',
    contactEmail: 'robert.taylor@techcorp.com',
    contactPhone: '+1-555-9876',
    company: 'TechCorp Solutions',
    userName: 'Marketing Team',
    source: 'Website Form',
    assignedTo: 'sales@clientforge.com',
  },
};
