/**
 * Billing Template: Subscription Created
 * Triggered when a new subscription is created
 */

export const subscriptionCreatedTemplate = {
  id: 'subscription-created',
  name: 'Subscription Created',
  category: 'subscriptions',
  priority: 'high',
  description: 'Notification for new subscription creation',

  generateNotification: (data: any) => ({
    type: 'billing.subscription_created',
    title: 'New Subscription Created',
    message: `Subscription "${data.planName}" has been activated for ${data.customerName}`,
    metadata: {
      subscriptionId: data.subscriptionId,
      customerId: data.customerId,
      customerName: data.customerName,
      planName: data.planName,
      billingCycle: data.billingCycle,
      amount: data.amount,
      startDate: data.startDate,
      nextBillingDate: data.nextBillingDate,
    },
    actions: ['view_subscription', 'send_welcome_email'],
    icon: 'subscription',
    color: '#4CAF50',
  }),

  example: {
    subscriptionId: 'sub_1234567890',
    customerId: 'cus_abc123',
    customerName: 'Acme Corporation',
    planName: 'Enterprise Plan',
    billingCycle: 'monthly',
    amount: 299.99,
    startDate: '2025-11-15',
    nextBillingDate: '2025-12-15',
  },
};
