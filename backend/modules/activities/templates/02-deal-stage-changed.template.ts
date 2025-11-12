/**
 * Activity Template: Deal Stage Changed
 * Triggered when a deal moves through the pipeline
 */

export const dealStageChangedTemplate = {
  id: 'deal-stage-changed',
  name: 'Deal Stage Changed',
  category: 'deals',
  priority: 'high',
  description: 'Activity logged when a deal moves to a new stage',

  generateActivity: (data: any) => ({
    type: 'deal.stage_changed',
    title: `Deal moved to ${data.newStage}`,
    description: `${data.userName} moved "${data.dealName}" from ${data.oldStage} to ${data.newStage}`,
    metadata: {
      dealId: data.dealId,
      dealName: data.dealName,
      oldStage: data.oldStage,
      newStage: data.newStage,
      value: data.value,
      probability: data.probability,
    },
    icon: 'pipeline',
    color: '#2196F3',
  }),

  example: {
    dealId: 'deal-456',
    dealName: 'Enterprise Contract - Acme Corp',
    userName: 'Sarah Johnson',
    oldStage: 'Qualification',
    newStage: 'Proposal',
    value: 50000,
    probability: 60,
  },
};
