/**
 * CRM Structured Output Schemas
 * Location: D:\ClientForge\02_CODE\backend\src\ai\schemas\crm-schemas.ts
 * Purpose: JSON schemas for structured AI outputs in ClientForge CRM
 */

/**
 * Contact Analysis Schema
 * Use for: AI-powered contact insights and scoring
 */
export const ContactAnalysisSchema = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'contact_analysis' as const,
    strict: true,
    schema: {
      type: 'object',
      properties: {
        lead_score: {
          type: 'number',
          description: 'Lead quality score from 0-100',
        },
        engagement_level: {
          type: 'string',
          enum: ['cold', 'warm', 'hot', 'champion'],
          description: 'Contact engagement classification',
        },
        next_actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
              deadline: { type: 'string' },
            },
            required: ['action', 'priority'],
          },
          minItems: 1,
          maxItems: 5,
        },
        summary: {
          type: 'string',
          description: 'Brief summary of contact status',
        },
        red_flags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Potential issues or concerns',
        },
      },
      required: ['lead_score', 'engagement_level', 'next_actions', 'summary'],
    },
  },
};

/**
 * Deal Prediction Schema
 * Use for: Forecasting deal outcomes and win probability
 */
export const DealPredictionSchema = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'deal_prediction' as const,
    strict: true,
    schema: {
      type: 'object',
      properties: {
        win_probability: {
          type: 'number',
          description: 'Probability of closing (0-100)',
        },
        predicted_close_date: {
          type: 'string',
          description: 'Estimated close date (YYYY-MM-DD)',
        },
        risk_factors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              factor: { type: 'string' },
              severity: { type: 'string', enum: ['low', 'medium', 'high'] },
              mitigation: { type: 'string' },
            },
            required: ['factor', 'severity', 'mitigation'],
          },
        },
        success_factors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Positive indicators for the deal',
        },
        recommended_actions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              impact: { type: 'string', enum: ['high', 'medium', 'low'] },
              effort: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            required: ['action', 'impact', 'effort'],
          },
        },
        confidence: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'AI confidence in prediction',
        },
      },
      required: [
        'win_probability',
        'predicted_close_date',
        'risk_factors',
        'success_factors',
        'confidence',
      ],
    },
  },
};

/**
 * Email Generation Schema
 * Use for: AI-generated emails with structure
 */
export const EmailGenerationSchema = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'email_generation' as const,
    strict: true,
    schema: {
      type: 'object',
      properties: {
        subject: {
          type: 'string',
          description: 'Email subject line',
        },
        body: {
          type: 'string',
          description: 'Email body content',
        },
        tone: {
          type: 'string',
          enum: ['formal', 'friendly', 'urgent', 'casual'],
          description: 'Tone of the email',
        },
        call_to_action: {
          type: 'string',
          description: 'Main CTA for recipient',
        },
        suggested_send_time: {
          type: 'string',
          description: 'Best time to send (e.g., "Tuesday morning")',
        },
      },
      required: ['subject', 'body', 'tone', 'call_to_action'],
    },
  },
};

/**
 * Meeting Summary Schema
 * Use for: Structured meeting notes and action items
 */
export const MeetingSummarySchema = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'meeting_summary' as const,
    strict: true,
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'string',
          description: 'Brief meeting summary (2-3 sentences)',
        },
        key_points: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          description: 'Main discussion points',
        },
        action_items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              task: { type: 'string' },
              owner: { type: 'string' },
              due_date: { type: 'string' },
              status: {
                type: 'string',
                enum: ['pending', 'in_progress', 'completed'],
              },
            },
            required: ['task', 'owner'],
          },
        },
        decisions_made: {
          type: 'array',
          items: { type: 'string' },
          description: 'Key decisions from the meeting',
        },
        next_meeting: {
          type: 'object',
          properties: {
            suggested_date: { type: 'string' },
            agenda_items: {
              type: 'array',
              items: { type: 'string' },
            },
          },
        },
      },
      required: ['summary', 'key_points', 'action_items'],
    },
  },
};

/**
 * Sales Opportunity Extraction Schema
 * Use for: Extracting opportunities from conversations/emails
 */
export const OpportunityExtractionSchema = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'opportunity_extraction' as const,
    strict: true,
    schema: {
      type: 'object',
      properties: {
        opportunities: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              estimated_value: { type: 'number' },
              probability: {
                type: 'string',
                enum: ['low', 'medium', 'high'],
              },
              timeline: { type: 'string' },
              required_actions: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: [
              'title',
              'description',
              'estimated_value',
              'probability',
            ],
          },
          minItems: 0,
        },
        sentiment: {
          type: 'string',
          enum: ['negative', 'neutral', 'positive', 'very_positive'],
        },
        urgency: {
          type: 'string',
          enum: ['low', 'medium', 'high', 'immediate'],
        },
      },
      required: ['opportunities', 'sentiment', 'urgency'],
    },
  },
};

/**
 * Customer Segmentation Schema
 * Use for: AI-powered customer categorization
 */
export const CustomerSegmentationSchema = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'customer_segmentation' as const,
    strict: true,
    schema: {
      type: 'object',
      properties: {
        segment: {
          type: 'string',
          enum: [
            'enterprise',
            'mid_market',
            'small_business',
            'startup',
            'individual',
          ],
        },
        value_tier: {
          type: 'string',
          enum: ['platinum', 'gold', 'silver', 'bronze'],
        },
        engagement_pattern: {
          type: 'string',
          enum: ['highly_engaged', 'regular', 'occasional', 'dormant'],
        },
        growth_potential: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
        },
        recommended_strategy: {
          type: 'object',
          properties: {
            approach: { type: 'string' },
            touch_frequency: { type: 'string' },
            content_type: { type: 'string' },
          },
          required: ['approach', 'touch_frequency', 'content_type'],
        },
        characteristics: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: [
        'segment',
        'value_tier',
        'engagement_pattern',
        'growth_potential',
        'recommended_strategy',
      ],
    },
  },
};

/**
 * Report Insights Schema
 * Use for: Structured analytics and insights
 */
export const ReportInsightsSchema = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'report_insights' as const,
    strict: true,
    schema: {
      type: 'object',
      properties: {
        executive_summary: {
          type: 'string',
          description: 'High-level summary for executives',
        },
        key_metrics: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              value: { type: 'string' },
              trend: { type: 'string', enum: ['up', 'down', 'stable'] },
              insight: { type: 'string' },
            },
            required: ['metric', 'value', 'trend', 'insight'],
          },
        },
        trends: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              trend: { type: 'string' },
              significance: { type: 'string', enum: ['high', 'medium', 'low'] },
              recommendation: { type: 'string' },
            },
            required: ['trend', 'significance', 'recommendation'],
          },
        },
        anomalies: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              impact: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
              suggested_action: { type: 'string' },
            },
            required: ['description', 'impact'],
          },
        },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              expected_impact: { type: 'string' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['action', 'expected_impact', 'priority'],
          },
          minItems: 3,
        },
      },
      required: [
        'executive_summary',
        'key_metrics',
        'trends',
        'recommendations',
      ],
    },
  },
};

/**
 * Smart Search Results Schema
 * Use for: Structured search results with relevance
 */
export const SmartSearchSchema = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'smart_search' as const,
    strict: true,
    schema: {
      type: 'object',
      properties: {
        interpretation: {
          type: 'string',
          description: 'AI interpretation of search query',
        },
        results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['contact', 'deal', 'company', 'activity', 'document'],
              },
              id: { type: 'string' },
              title: { type: 'string' },
              snippet: { type: 'string' },
              relevance_score: { type: 'number' },
              reason: { type: 'string' },
            },
            required: ['type', 'id', 'title', 'relevance_score'],
          },
        },
        suggested_filters: {
          type: 'array',
          items: { type: 'string' },
        },
        related_searches: {
          type: 'array',
          items: { type: 'string' },
        },
      },
      required: ['interpretation', 'results'],
    },
  },
};

// Export all schemas as a collection
export const CRMSchemas = {
  ContactAnalysis: ContactAnalysisSchema,
  DealPrediction: DealPredictionSchema,
  EmailGeneration: EmailGenerationSchema,
  MeetingSummary: MeetingSummarySchema,
  OpportunityExtraction: OpportunityExtractionSchema,
  CustomerSegmentation: CustomerSegmentationSchema,
  ReportInsights: ReportInsightsSchema,
  SmartSearch: SmartSearchSchema,
};

// TypeScript types for structured outputs
export interface ContactAnalysis {
  lead_score: number;
  engagement_level: 'cold' | 'warm' | 'hot' | 'champion';
  next_actions: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    deadline?: string;
  }>;
  summary: string;
  red_flags?: string[];
}

export interface DealPrediction {
  win_probability: number;
  predicted_close_date: string;
  risk_factors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
  success_factors: string[];
  recommended_actions?: Array<{
    action: string;
    impact: 'high' | 'medium' | 'low';
    effort: 'low' | 'medium' | 'high';
  }>;
  confidence: 'low' | 'medium' | 'high';
}

export interface EmailGeneration {
  subject: string;
  body: string;
  tone: 'formal' | 'friendly' | 'urgent' | 'casual';
  call_to_action: string;
  suggested_send_time?: string;
}

export interface MeetingSummary {
  summary: string;
  key_points: string[];
  action_items: Array<{
    task: string;
    owner: string;
    due_date?: string;
    status?: 'pending' | 'in_progress' | 'completed';
  }>;
  decisions_made?: string[];
  next_meeting?: {
    suggested_date?: string;
    agenda_items?: string[];
  };
}

export interface OpportunityExtraction {
  opportunities: Array<{
    title: string;
    description: string;
    estimated_value: number;
    probability: 'low' | 'medium' | 'high';
    timeline?: string;
    required_actions?: string[];
  }>;
  sentiment: 'negative' | 'neutral' | 'positive' | 'very_positive';
  urgency: 'low' | 'medium' | 'high' | 'immediate';
}

export interface CustomerSegmentation {
  segment: 'enterprise' | 'mid_market' | 'small_business' | 'startup' | 'individual';
  value_tier: 'platinum' | 'gold' | 'silver' | 'bronze';
  engagement_pattern: 'highly_engaged' | 'regular' | 'occasional' | 'dormant';
  growth_potential: 'high' | 'medium' | 'low';
  recommended_strategy: {
    approach: string;
    touch_frequency: string;
    content_type: string;
  };
  characteristics?: string[];
}

export interface ReportInsights {
  executive_summary: string;
  key_metrics: Array<{
    metric: string;
    value: string;
    trend: 'up' | 'down' | 'stable';
    insight: string;
  }>;
  trends: Array<{
    trend: string;
    significance: 'high' | 'medium' | 'low';
    recommendation: string;
  }>;
  anomalies?: Array<{
    description: string;
    impact: 'positive' | 'negative' | 'neutral';
    suggested_action?: string;
  }>;
  recommendations: Array<{
    action: string;
    expected_impact: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

export interface SmartSearchResult {
  interpretation: string;
  results: Array<{
    type: 'contact' | 'deal' | 'company' | 'activity' | 'document';
    id: string;
    title: string;
    snippet?: string;
    relevance_score: number;
    reason?: string;
  }>;
  suggested_filters?: string[];
  related_searches?: string[];
}

