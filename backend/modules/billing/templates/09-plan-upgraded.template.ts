/**
 * Billing Template: Plan Upgraded
 * Triggered when a customer upgrades their subscription plan
 */

export const planUpgradedTemplate = {
  id: 'plan-upgraded',
  name: 'Plan Upgraded',
  category: 'subscriptions',
  priority: 'high',
  description: 'Notification for plan upgrade',

  generateNotification: (data: any) => ({
    type: 'billing.plan_upgraded',
    title: 'Plan Upgraded!',
    message: `${data.customerName} upgraded from "${data.oldPlan}" to "${data.newPlan}"`,
    metadata: {
      subscriptionId: data.subscriptionId,
      customerId: data.customerId,
      customerName: data.customerName,
      oldPlan: data.oldPlan,
      newPlan: data.newPlan,
      oldAmount: data.oldAmount,
      newAmount: data.newAmount,
      proratedCharge: data.proratedCharge,
      upgradeDate: data.upgradeDate,
      effectiveDate: data.effectiveDate,
    },
    actions: ['send_welcome_email', 'update_features', 'thank_customer'],
    icon: 'arrow-up-circle',
    color: '#4CAF50',
  }),

  example: {
    subscriptionId: 'sub_upgrade_555',
    customerId: 'cus_abc123',
    customerName: 'Growing Business LLC',
    oldPlan: 'Starter Plan',
    newPlan: 'Professional Plan',
    oldAmount: 99.99,
    newAmount: 299.99,
    proratedCharge: 166.67,
    upgradeDate: '2025-11-18',
    effectiveDate: '2025-11-18',
  },
};
