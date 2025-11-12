/**
 * GDPR Template: Data Protection Impact Assessment
 * Template for GDPR Article 35 - DPIA requirement
 */

export const dpiaAssessmentTemplate = {
  id: 'dpia-assessment',
  name: 'Data Protection Impact Assessment (Article 35)',
  category: 'gdpr',
  priority: 'high',
  description: 'Template for conducting Data Protection Impact Assessments',

  requestDetails: {
    article: 'Article 35',
    requiredWhen: 'High risk to rights and freedoms',
    consultDPO: true,
  },

  assessmentAreas: [
    'Systematic description of processing',
    'Necessity and proportionality',
    'Risks to rights and freedoms',
    'Measures to address risks',
    'Safeguards and security',
  ],

  generateResponse: (data: any) => ({
    type: 'gdpr.dpia_required',
    title: 'DPIA Assessment Required',
    message: `New processing activity "${data.processingName}" requires DPIA`,
    metadata: {
      dpiaId: data.dpiaId,
      processingName: data.processingName,
      processingType: data.processingType,
      dataCategories: data.dataCategories,
      subjectsCount: data.subjectsCount,
      riskLevel: data.riskLevel,
      triggerFactors: data.triggerFactors,
      assessmentDate: data.assessmentDate,
      dpoConsulted: data.dpoConsulted,
      supervisoryAuthorityConsult: data.supervisoryAuthorityConsult,
      status: 'assessment_required',
    },
    actions: [
      'conduct_dpia',
      'consult_dpo',
      'evaluate_risks',
      'implement_safeguards',
      'document_assessment',
    ],
    priority: 'high',
  }),

  example: {
    dpiaId: 'dpia_009',
    processingName: 'AI-powered Customer Behavior Analysis',
    processingType: 'Automated profiling',
    dataCategories: ['behavioral', 'demographic', 'transactional'],
    subjectsCount: 50000,
    riskLevel: 'high',
    triggerFactors: [
      'Large scale processing',
      'Automated decision-making',
      'Profiling with legal effects',
    ],
    assessmentDate: '2025-11-18',
    dpoConsulted: false,
    supervisoryAuthorityConsult: false,
  },
};
