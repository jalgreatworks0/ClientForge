/**
 * Billing Template: Usage Threshold Reached
 * Triggered when customer reaches usage limits
 */

export const usageThresholdReachedTemplate = {
  id: 'usage-threshold-reached',
  name: 'Usage Threshold Reached',
  category: 'usage',
  priority: 'high',
  description: 'Alert when customer reaches usage threshold',

  generateNotification: (data: any) => ({
    type: 'billing.usage_threshold_reached',
    title: 'Usage Threshold Reached',
    message: `${data.customerName} has reached ${data.percentageUsed}% of their ${data.resourceType} limit`,
    metadata: {
      customerId: data.customerId,
      customerName: data.customerName,
      resourceType: data.resourceType,
      currentUsage: data.currentUsage,
      limit: data.limit,
      percentageUsed: data.percentageUsed,
      billingPeriod: data.billingPeriod,
      overageRate: data.overageRate,
    },
    actions: ['notify_customer', 'offer_upgrade', 'monitor_usage'],
    icon: 'usage-warning',
    color: '#FF9800',
  }),

  example: {
    customerId: 'cus_abc123',
    customerName: 'Growth Company Ltd',
    resourceType: 'API calls',
    currentUsage: 9500,
    limit: 10000,
    percentageUsed: 95,
    billingPeriod: '2025-11',
    overageRate: 0.002,
  },
};
