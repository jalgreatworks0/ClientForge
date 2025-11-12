/**
 * Billing Template: Refund Processed
 * Triggered when a refund is processed
 */

export const refundProcessedTemplate = {
  id: 'refund-processed',
  name: 'Refund Processed',
  category: 'payments',
  priority: 'high',
  description: 'Notification for refund processing',

  generateNotification: (data: any) => ({
    type: 'billing.refund_processed',
    title: 'Refund Processed',
    message: `Refund of $${data.amount.toFixed(2)} processed for ${data.customerName}`,
    metadata: {
      refundId: data.refundId,
      paymentId: data.paymentId,
      customerId: data.customerId,
      customerName: data.customerName,
      amount: data.amount,
      refundReason: data.refundReason,
      processedDate: data.processedDate,
      refundMethod: data.refundMethod,
      expectedArrivalDate: data.expectedArrivalDate,
    },
    actions: ['view_refund', 'notify_customer', 'update_accounting'],
    icon: 'refund',
    color: '#9C27B0',
  }),

  example: {
    refundId: 'ref_123xyz',
    paymentId: 'pay_original_789',
    customerId: 'cus_ghi789',
    customerName: 'Dissatisfied Customer Inc',
    amount: 299.99,
    refundReason: 'Service not as expected',
    processedDate: '2025-11-18',
    refundMethod: 'Original payment method',
    expectedArrivalDate: '2025-11-25',
  },
};
