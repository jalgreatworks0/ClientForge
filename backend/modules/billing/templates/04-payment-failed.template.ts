/**
 * Billing Template: Payment Failed
 * Triggered when a payment attempt fails
 */

export const paymentFailedTemplate = {
  id: 'payment-failed',
  name: 'Payment Failed',
  category: 'payments',
  priority: 'critical',
  description: 'Alert for failed payment requiring attention',

  generateNotification: (data: any) => ({
    type: 'billing.payment_failed',
    title: '⚠️ Payment Failed',
    message: `Payment of $${data.amount.toFixed(2)} failed for ${data.customerName}: ${data.failureReason}`,
    metadata: {
      paymentId: data.paymentId,
      customerId: data.customerId,
      customerName: data.customerName,
      amount: data.amount,
      failureReason: data.failureReason,
      attemptNumber: data.attemptNumber,
      nextRetryDate: data.nextRetryDate,
      invoiceId: data.invoiceId,
    },
    actions: ['retry_payment', 'contact_customer', 'update_payment_method'],
    icon: 'payment-error',
    color: '#F44336',
  }),

  example: {
    paymentId: 'pay_failed_456',
    customerId: 'cus_def456',
    customerName: 'StartUp Ventures',
    amount: 199.99,
    failureReason: 'Insufficient funds',
    attemptNumber: 2,
    nextRetryDate: '2025-11-22',
    invoiceId: 'inv_abc111',
  },
};
