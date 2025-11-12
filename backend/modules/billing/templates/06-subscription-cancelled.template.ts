/**
 * Billing Template: Subscription Cancelled
 * Triggered when a customer cancels their subscription
 */

export const subscriptionCancelledTemplate = {
  id: 'subscription-cancelled',
  name: 'Subscription Cancelled',
  category: 'subscriptions',
  priority: 'high',
  description: 'Alert for subscription cancellation',

  generateNotification: (data: any) => ({
    type: 'billing.subscription_cancelled',
    title: 'Subscription Cancelled',
    message: `${data.customerName} cancelled their "${data.planName}" subscription`,
    metadata: {
      subscriptionId: data.subscriptionId,
      customerId: data.customerId,
      customerName: data.customerName,
      planName: data.planName,
      cancellationDate: data.cancellationDate,
      cancellationReason: data.cancellationReason,
      endOfService: data.endOfService,
      monthsSubscribed: data.monthsSubscribed,
      lifetimeValue: data.lifetimeValue,
    },
    actions: ['contact_customer', 'offer_retention', 'process_refund'],
    icon: 'subscription-cancel',
    color: '#FF9800',
  }),

  example: {
    subscriptionId: 'sub_cancelled_789',
    customerId: 'cus_xyz999',
    customerName: 'Small Business Co',
    planName: 'Basic Plan',
    cancellationDate: '2025-11-18',
    cancellationReason: 'Too expensive',
    endOfService: '2025-12-18',
    monthsSubscribed: 6,
    lifetimeValue: 594.00,
  },
};
