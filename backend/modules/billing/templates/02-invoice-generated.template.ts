/**
 * Billing Template: Invoice Generated
 * Triggered when a new invoice is generated
 */

export const invoiceGeneratedTemplate = {
  id: 'invoice-generated',
  name: 'Invoice Generated',
  category: 'invoices',
  priority: 'high',
  description: 'Notification for invoice generation',

  generateNotification: (data: any) => ({
    type: 'billing.invoice_generated',
    title: `Invoice #${data.invoiceNumber} Generated`,
    message: `Invoice for $${data.amount.toFixed(2)} has been generated for ${data.customerName}`,
    metadata: {
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      customerId: data.customerId,
      customerName: data.customerName,
      amount: data.amount,
      tax: data.tax,
      total: data.total,
      dueDate: data.dueDate,
      status: data.status,
    },
    actions: ['view_invoice', 'send_invoice', 'download_pdf'],
    icon: 'invoice',
    color: '#2196F3',
  }),

  example: {
    invoiceId: 'inv_xyz789',
    invoiceNumber: 'INV-2025-0001',
    customerId: 'cus_abc123',
    customerName: 'TechStart Inc.',
    amount: 500.00,
    tax: 45.00,
    total: 545.00,
    dueDate: '2025-12-15',
    status: 'pending',
  },
};
