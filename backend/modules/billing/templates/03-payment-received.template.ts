/**
 * Billing Template: Payment Received
 * Triggered when a payment is successfully processed
 */

export const paymentReceivedTemplate = {
  id: 'payment-received',
  name: 'Payment Received',
  category: 'payments',
  priority: 'high',
  description: 'Notification for successful payment',

  generateNotification: (data: any) => ({
    type: 'billing.payment_received',
    title: 'Payment Received',
    message: `Payment of $${data.amount.toFixed(2)} received from ${data.customerName}`,
    metadata: {
      paymentId: data.paymentId,
      customerId: data.customerId,
      customerName: data.customerName,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      invoiceId: data.invoiceId,
      transactionDate: data.transactionDate,
      receiptUrl: data.receiptUrl,
    },
    actions: ['view_payment', 'send_receipt', 'update_invoice'],
    icon: 'payment-success',
    color: '#4CAF50',
  }),

  example: {
    paymentId: 'pay_123abc',
    customerId: 'cus_abc123',
    customerName: 'Global Solutions Ltd',
    amount: 1299.99,
    paymentMethod: 'Visa **** 4242',
    invoiceId: 'inv_xyz789',
    transactionDate: '2025-11-18T10:30:00Z',
    receiptUrl: 'https://receipts.stripe.com/abc123',
  },
};
