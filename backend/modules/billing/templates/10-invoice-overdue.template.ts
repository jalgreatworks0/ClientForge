/**
 * Billing Template: Invoice Overdue
 * Triggered when an invoice becomes overdue
 */

export const invoiceOverdueTemplate = {
  id: 'invoice-overdue',
  name: 'Invoice Overdue',
  category: 'invoices',
  priority: 'critical',
  description: 'Alert for overdue invoices requiring immediate attention',

  generateNotification: (data: any) => ({
    type: 'billing.invoice_overdue',
    title: '⚠️ Invoice Overdue',
    message: `Invoice #${data.invoiceNumber} is ${data.daysOverdue} days overdue for ${data.customerName}`,
    metadata: {
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      amount: data.amount,
      dueDate: data.dueDate,
      daysOverdue: data.daysOverdue,
      totalOutstanding: data.totalOutstanding,
      previousReminders: data.previousReminders,
    },
    actions: ['send_reminder', 'call_customer', 'suspend_service', 'collections'],
    icon: 'alert-triangle',
    color: '#F44336',
  }),

  example: {
    invoiceId: 'inv_overdue_999',
    invoiceNumber: 'INV-2025-0042',
    customerId: 'cus_late_pay',
    customerName: 'Late Payment Corp',
    amount: 1599.99,
    dueDate: '2025-10-31',
    daysOverdue: 18,
    totalOutstanding: 3199.98,
    previousReminders: 2,
  },
};
