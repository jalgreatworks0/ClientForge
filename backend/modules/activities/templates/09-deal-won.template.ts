/**
 * Activity Template: Deal Won
 * Triggered when a deal is marked as won
 */

export const dealWonTemplate = {
  id: 'deal-won',
  name: 'Deal Won',
  category: 'deals',
  priority: 'critical',
  description: 'Activity logged when a deal is won - celebrate!',

  generateActivity: (data: any) => ({
    type: 'deal.won',
    title: `🎉 Deal Won: ${data.dealName}`,
    description: `${data.userName} closed "${data.dealName}" worth $${data.value.toLocaleString()}`,
    metadata: {
      dealId: data.dealId,
      dealName: data.dealName,
      value: data.value,
      closedDate: data.closedDate,
      salesCycle: data.salesCycle,
      competitorInfo: data.competitorInfo,
      winReason: data.winReason,
    },
    icon: 'trophy',
    color: '#FFD700',
  }),

  example: {
    dealId: 'deal-456',
    dealName: 'Enterprise Contract - Acme Corp',
    userName: 'Sarah Johnson',
    value: 50000,
    closedDate: '2025-11-18',
    salesCycle: 45,
    competitorInfo: 'Beat CompetitorX',
    winReason: 'Superior features and customer service',
  },
};
