/**
 * Billing Template: Subscription Renewed
 * Triggered when a subscription auto-renews successfully
 */

export const subscriptionRenewedTemplate = {
  id: 'subscription-renewed',
  name: 'Subscription Renewed',
  category: 'subscriptions',
  priority: 'medium',
  description: 'Notification for successful subscription renewal',

  generateNotification: (data: any) => ({
    type: 'billing.subscription_renewed',
    title: 'Subscription Renewed',
    message: `${data.customerName}'s "${data.planName}" subscription has been renewed for $${data.amount.toFixed(2)}`,
    metadata: {
      subscriptionId: data.subscriptionId,
      customerId: data.customerId,
      customerName: data.customerName,
      planName: data.planName,
      amount: data.amount,
      renewalDate: data.renewalDate,
      nextBillingDate: data.nextBillingDate,
      consecutiveRenewals: data.consecutiveRenewals,
    },
    actions: ['view_subscription', 'send_thank_you'],
    icon: 'renewal',
    color: '#4CAF50',
  }),

  example: {
    subscriptionId: 'sub_1234567890',
    customerId: 'cus_abc123',
    customerName: 'Enterprise Solutions Inc',
    planName: 'Professional Plan',
    amount: 499.99,
    renewalDate: '2025-11-15',
    nextBillingDate: '2025-12-15',
    consecutiveRenewals: 12,
  },
};
