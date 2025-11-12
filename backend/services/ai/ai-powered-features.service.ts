/**
 * AI-Powered Features Service
 * Implements advanced AI capabilities for CRM intelligence
 * - Lead Scoring with ML
 * - Next Action Suggestions
 * - AI Email Composition
 * - Pattern Recognition (at-risk deals, upsell opportunities)
 * - Sentiment Analysis
 */

import { db } from '../../database/postgresql/pool'
import { logger } from '../../utils/logging/logger'

import { aiService } from './ai-service'
import {
  AIFeatureType,
  QueryComplexity,
  type AIRequest,
  type AIContext,
} from './ai-types'

// =====================================================
// LEAD SCORING
// =====================================================

export interface LeadScoreFactors {
  engagement: number // 0-100
  companyFit: number // 0-100
  timing: number // 0-100
  budget: number // 0-100
}

export interface LeadScoreResult {
  score: number // 0-100 overall score
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  factors: LeadScoreFactors
  reasoning: string
  priority: 'hot' | 'warm' | 'cold'
  nextSteps: string[]
  confidence: number // 0-1
}

export async function scoreContact(
  contactId: string,
  tenantId: string,
  userId: string
): Promise<LeadScoreResult> {
  try {
    // Fetch contact data with related activities, emails, deals
    const contactQuery = await db.query(
      `
      SELECT
        c.*,
        COUNT(DISTINCT a.id) as activity_count,
        COUNT(DISTINCT d.id) as deal_count,
        COUNT(DISTINCT em.id) as email_count,
        MAX(a.created_at) as last_activity,
        MAX(em.received_at) as last_email,
        AVG(CASE WHEN d.status = 'won' THEN 1 WHEN d.status = 'lost' THEN 0 ELSE NULL END) as win_rate
      FROM contacts c
      LEFT JOIN activities a ON c.id = a.contact_id AND a.deleted_at IS NULL
      LEFT JOIN deals d ON c.id = d.contact_id AND d.deleted_at IS NULL
      LEFT JOIN email_messages em ON c.id = em.contact_id AND em.deleted_at IS NULL
      WHERE c.id = $1 AND c.tenantId = $2 AND c.deleted_at IS NULL
      GROUP BY c.id
    `,
      [contactId, tenantId]
    )

    if (contactQuery.rows.length === 0) {
      throw new Error('Contact not found')
    }

    const contact = contactQuery.rows[0]

    // Build AI context
    const context: AIContext = {
      tenantId,
      userId,
      entityType: 'contact',
      entityId: contactId,
      entityData: {
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        company: contact.company,
        title: contact.title,
        source: contact.source,
        status: contact.status,
        activityCount: parseInt(contact.activity_count),
        dealCount: parseInt(contact.deal_count),
        emailCount: parseInt(contact.email_count),
        lastActivity: contact.last_activity,
        lastEmail: contact.last_email,
        winRate: parseFloat(contact.win_rate) || 0,
        tags: contact.tags,
        customFields: contact.custom_fields,
      },
    }

    // Create AI request for lead scoring
    const aiRequest: AIRequest = {
      prompt: `Analyze this lead and provide a comprehensive score.

Lead Information:
- Name: ${contact.name}
- Company: ${contact.company || 'Unknown'}
- Title: ${contact.title || 'Unknown'}
- Email: ${contact.email}
- Phone: ${contact.phone || 'Not provided'}
- Source: ${contact.source}
- Status: ${contact.status}

Engagement Metrics:
- Total Activities: ${contact.activity_count}
- Total Deals: ${contact.deal_count}
- Total Emails: ${contact.email_count}
- Last Activity: ${contact.last_activity || 'Never'}
- Last Email: ${contact.last_email || 'Never'}
- Historical Win Rate: ${(parseFloat(contact.win_rate) * 100 || 0).toFixed(1)}%

Please provide a lead score analysis in the following JSON format:
\`\`\`json
{
  "score": <number 0-100>,
  "grade": "<A|B|C|D|F>",
  "factors": {
    "engagement": <number 0-100>,
    "companyFit": <number 0-100>,
    "timing": <number 0-100>,
    "budget": <number 0-100>
  },
  "reasoning": "<detailed explanation>",
  "priority": "<hot|warm|cold>",
  "nextSteps": ["<action 1>", "<action 2>", "<action 3>"],
  "confidence": <number 0-1>
}
\`\`\``,
      featureType: AIFeatureType.LEAD_SCORING,
      complexity: QueryComplexity.MEDIUM,
      context,
    }

    const response = await aiService.execute(aiRequest)

    // Parse structured data from response
    const scoreData = response.data as LeadScoreResult

    // Store lead score in database for tracking
    await db.query(
      `INSERT INTO ai_lead_scores (contact_id, tenantId, score, grade, factors, reasoning, priority, next_steps, confidence, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (contact_id) DO UPDATE SET
         score = $3, grade = $4, factors = $5, reasoning = $6, priority = $7, next_steps = $8,
         confidence = $9, updated_at = NOW(), updated_by = $10`,
      [
        contactId,
        tenantId,
        scoreData.score,
        scoreData.grade,
        JSON.stringify(scoreData.factors),
        scoreData.reasoning,
        scoreData.priority,
        JSON.stringify(scoreData.nextSteps),
        scoreData.confidence,
        userId,
      ]
    )

    logger.info('[AI] Lead scoring completed', {
      contactId,
      score: scoreData.score,
      grade: scoreData.grade,
      priority: scoreData.priority,
    })

    return scoreData
  } catch (error: any) {
    logger.error('[AI] Lead scoring failed', { error: error.message, contactId })
    throw error
  }
}

// =====================================================
// NEXT ACTION SUGGESTIONS
// =====================================================

export interface NextActionSuggestion {
  type: 'call' | 'email' | 'meeting' | 'task' | 'follow_up' | 'demo'
  priority: 'urgent' | 'high' | 'medium' | 'low'
  title: string
  description: string
  reasoning: string
  timing: string // e.g., "within 24 hours", "this week"
  estimatedImpact: 'high' | 'medium' | 'low'
  confidence: number
}

export interface NextActionsResult {
  primaryAction: NextActionSuggestion
  alternativeActions: NextActionSuggestion[]
  dealHealthScore: number
  riskFactors: string[]
  opportunities: string[]
}

export async function suggestNextActions(
  dealId: string,
  tenantId: string,
  userId: string
): Promise<NextActionsResult> {
  try {
    // Fetch deal data with comprehensive context
    const dealQuery = await db.query(
      `
      SELECT
        d.*,
        c.name as contact_name,
        c.email as contact_email,
        c.company as contact_company,
        c.title as contact_title,
        u.name as owner_name,
        COUNT(DISTINCT a.id) as activity_count,
        MAX(a.created_at) as last_activity,
        COUNT(DISTINCT em.id) as email_count,
        MAX(em.sent_at) as last_email_sent,
        MAX(em.received_at) as last_email_received,
        EXTRACT(DAY FROM NOW() - d.updated_at) as days_since_update
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN users u ON d.owner_id = u.id
      LEFT JOIN activities a ON d.id = a.deal_id AND a.deleted_at IS NULL
      LEFT JOIN email_messages em ON d.id = em.deal_id AND em.deleted_at IS NULL
      WHERE d.id = $1 AND d.tenantId = $2 AND d.deleted_at IS NULL
      GROUP BY d.id, c.id, u.id
    `,
      [dealId, tenantId]
    )

    if (dealQuery.rows.length === 0) {
      throw new Error('Deal not found')
    }

    const deal = dealQuery.rows[0]

    const context: AIContext = {
      tenantId,
      userId,
      entityType: 'deal',
      entityId: dealId,
      entityData: {
        title: deal.title,
        value: deal.value,
        stage: deal.stage,
        status: deal.status,
        probability: deal.probability,
        expectedCloseDate: deal.expected_close_date,
        contactName: deal.contact_name,
        contactEmail: deal.contact_email,
        contactCompany: deal.contact_company,
        contactTitle: deal.contact_title,
        ownerName: deal.owner_name,
        activityCount: parseInt(deal.activity_count),
        emailCount: parseInt(deal.email_count),
        lastActivity: deal.last_activity,
        lastEmailSent: deal.last_email_sent,
        lastEmailReceived: deal.last_email_received,
        daysSinceUpdate: parseInt(deal.days_since_update),
      },
    }

    const aiRequest: AIRequest = {
      prompt: `Analyze this deal and suggest the best next actions to move it forward.

Deal Information:
- Title: ${deal.title}
- Value: $${parseFloat(deal.value).toLocaleString()}
- Stage: ${deal.stage}
- Status: ${deal.status}
- Probability: ${deal.probability}%
- Expected Close: ${deal.expected_close_date || 'Not set'}
- Days Since Last Update: ${deal.days_since_update}

Contact Information:
- Name: ${deal.contact_name}
- Company: ${deal.contact_company}
- Title: ${deal.contact_title}
- Email: ${deal.contact_email}

Engagement History:
- Total Activities: ${deal.activity_count}
- Total Emails: ${deal.email_count}
- Last Activity: ${deal.last_activity || 'Never'}
- Last Email Sent: ${deal.last_email_sent || 'Never'}
- Last Email Received: ${deal.last_email_received || 'Never'}

Provide actionable recommendations in JSON format:
\`\`\`json
{
  "primaryAction": {
    "type": "<call|email|meeting|task|follow_up|demo>",
    "priority": "<urgent|high|medium|low>",
    "title": "<action title>",
    "description": "<detailed description>",
    "reasoning": "<why this action>",
    "timing": "<when to do it>",
    "estimatedImpact": "<high|medium|low>",
    "confidence": <number 0-1>
  },
  "alternativeActions": [
    { "type": "...", "priority": "...", "title": "...", "description": "...", "reasoning": "...", "timing": "...", "estimatedImpact": "...", "confidence": 0.8 }
  ],
  "dealHealthScore": <number 0-100>,
  "riskFactors": ["<risk 1>", "<risk 2>"],
  "opportunities": ["<opportunity 1>", "<opportunity 2>"]
}
\`\`\``,
      featureType: AIFeatureType.NEXT_BEST_ACTION,
      complexity: QueryComplexity.COMPLEX,
      context,
    }

    const response = await aiService.execute(aiRequest)
    const actionsData = response.data as NextActionsResult

    logger.info('[AI] Next actions suggested', {
      dealId,
      primaryActionType: actionsData.primaryAction.type,
      dealHealthScore: actionsData.dealHealthScore,
    })

    return actionsData
  } catch (error: any) {
    logger.error('[AI] Next actions suggestion failed', { error: error.message, dealId })
    throw error
  }
}

// =====================================================
// AI EMAIL COMPOSITION
// =====================================================

export interface EmailCompositionRequest {
  purpose: 'follow_up' | 'introduction' | 'proposal' | 'thank_you' | 'meeting_request' | 'cold_outreach'
  tone: 'professional' | 'casual' | 'friendly' | 'formal'
  recipientName?: string
  recipientCompany?: string
  recipientTitle?: string
  contextNotes?: string
  previousEmailContext?: string
  dealContext?: any
  contactContext?: any
}

export interface EmailCompositionResult {
  subject: string
  body: string
  alternativeSubjects: string[]
  keyPoints: string[]
  callToAction: string
  estimatedReadTime: string
  toneAnalysis: string
}

export async function composeEmail(
  request: EmailCompositionRequest,
  tenantId: string,
  userId: string
): Promise<EmailCompositionResult> {
  try {
    const context: AIContext = {
      tenantId,
      userId,
    }

    const aiRequest: AIRequest = {
      prompt: `Compose a professional email with the following requirements:

Purpose: ${request.purpose}
Tone: ${request.tone}
${request.recipientName ? `Recipient: ${request.recipientName}` : ''}
${request.recipientCompany ? `Company: ${request.recipientCompany}` : ''}
${request.recipientTitle ? `Title: ${request.recipientTitle}` : ''}
${request.contextNotes ? `Context: ${request.contextNotes}` : ''}
${request.previousEmailContext ? `Previous Email Context: ${request.previousEmailContext}` : ''}

${request.dealContext ? `Deal Information:\n${JSON.stringify(request.dealContext, null, 2)}` : ''}
${request.contactContext ? `Contact Information:\n${JSON.stringify(request.contactContext, null, 2)}` : ''}

Provide the email composition in JSON format:
\`\`\`json
{
  "subject": "<compelling subject line>",
  "body": "<well-formatted email body>",
  "alternativeSubjects": ["<alt 1>", "<alt 2>", "<alt 3>"],
  "keyPoints": ["<point 1>", "<point 2>", "<point 3>"],
  "callToAction": "<clear CTA>",
  "estimatedReadTime": "<X minutes>",
  "toneAnalysis": "<tone description>"
}
\`\`\`

Guidelines:
- Keep it concise and scannable
- Include a clear call-to-action
- Personalize based on context
- Use proper formatting with paragraphs
- Match the requested tone
- Make subject line compelling (under 60 characters)`,
      featureType: AIFeatureType.EMAIL_GENERATION,
      complexity: QueryComplexity.MEDIUM,
      context,
      options: {
        temperature: 0.7, // Higher creativity for email composition
      },
    }

    const response = await aiService.execute(aiRequest)
    const emailData = response.data as EmailCompositionResult

    logger.info('[AI] Email composed', {
      purpose: request.purpose,
      tone: request.tone,
      subjectLength: emailData.subject.length,
    })

    return emailData
  } catch (error: any) {
    logger.error('[AI] Email composition failed', { error: error.message })
    throw error
  }
}

// =====================================================
// PATTERN RECOGNITION
// =====================================================

export interface DealPattern {
  pattern: 'at_risk' | 'upsell_opportunity' | 'cross_sell' | 'renewal_risk' | 'expansion_ready'
  confidence: number
  indicators: string[]
  reasoning: string
  recommendedActions: string[]
  estimatedImpact: number // potential revenue impact
}

export interface PatternRecognitionResult {
  dealId: string
  patterns: DealPattern[]
  overallRisk: 'high' | 'medium' | 'low'
  opportunityScore: number // 0-100
  urgency: 'immediate' | 'soon' | 'monitor'
}

export async function recognizePatterns(
  dealId: string,
  tenantId: string,
  userId: string
): Promise<PatternRecognitionResult> {
  try {
    // Fetch deal with extensive historical data
    const dealQuery = await db.query(
      `
      SELECT
        d.*,
        c.name as contact_name,
        c.email as contact_email,
        c.company as contact_company,
        json_agg(DISTINCT jsonb_build_object(
          'type', a.type,
          'description', a.description,
          'created_at', a.created_at
        ) ORDER BY a.created_at DESC) FILTER (WHERE a.id IS NOT NULL) as activities,
        json_agg(DISTINCT jsonb_build_object(
          'subject', em.subject,
          'from_email', em.from_email,
          'sent_at', em.sent_at,
          'is_read', em.is_read
        ) ORDER BY em.sent_at DESC) FILTER (WHERE em.id IS NOT NULL) as emails,
        EXTRACT(DAY FROM NOW() - d.updated_at) as days_stale,
        EXTRACT(DAY FROM NOW() - MAX(a.created_at)) as days_since_activity
      FROM deals d
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN activities a ON d.id = a.deal_id AND a.deleted_at IS NULL
      LEFT JOIN email_messages em ON d.id = em.deal_id AND em.deleted_at IS NULL
      WHERE d.id = $1 AND d.tenantId = $2 AND d.deleted_at IS NULL
      GROUP BY d.id, c.id
    `,
      [dealId, tenantId]
    )

    if (dealQuery.rows.length === 0) {
      throw new Error('Deal not found')
    }

    const deal = dealQuery.rows[0]

    const context: AIContext = {
      tenantId,
      userId,
      entityType: 'deal',
      entityId: dealId,
      entityData: deal,
    }

    const aiRequest: AIRequest = {
      prompt: `Analyze this deal for patterns that indicate risks or opportunities.

Deal Details:
- Value: $${parseFloat(deal.value).toLocaleString()}
- Stage: ${deal.stage}
- Status: ${deal.status}
- Probability: ${deal.probability}%
- Expected Close: ${deal.expected_close_date || 'Not set'}
- Days Since Update: ${deal.days_stale}
- Days Since Last Activity: ${deal.days_since_activity || 'N/A'}

Contact: ${deal.contact_name} (${deal.contact_company})

Recent Activities:
${JSON.stringify(deal.activities || [], null, 2)}

Recent Emails:
${JSON.stringify(deal.emails || [], null, 2)}

Identify patterns and provide analysis in JSON format:
\`\`\`json
{
  "dealId": "${dealId}",
  "patterns": [
    {
      "pattern": "<at_risk|upsell_opportunity|cross_sell|renewal_risk|expansion_ready>",
      "confidence": <number 0-1>,
      "indicators": ["<indicator 1>", "<indicator 2>"],
      "reasoning": "<detailed reasoning>",
      "recommendedActions": ["<action 1>", "<action 2>"],
      "estimatedImpact": <number in USD>
    }
  ],
  "overallRisk": "<high|medium|low>",
  "opportunityScore": <number 0-100>,
  "urgency": "<immediate|soon|monitor>"
}
\`\`\`

Look for:
- Lack of engagement (at-risk deals)
- Budget expansion signals (upsell opportunities)
- Additional product fit indicators (cross-sell)
- Contract expiration patterns (renewal risk)
- Growth indicators (expansion ready)`,
      featureType: AIFeatureType.DEAL_INSIGHTS,
      complexity: QueryComplexity.COMPLEX,
      context,
    }

    const response = await aiService.execute(aiRequest)
    const patternData = response.data as PatternRecognitionResult

    logger.info('[AI] Pattern recognition completed', {
      dealId,
      patternsFound: patternData.patterns.length,
      overallRisk: patternData.overallRisk,
    })

    return patternData
  } catch (error: any) {
    logger.error('[AI] Pattern recognition failed', { error: error.message, dealId })
    throw error
  }
}

// =====================================================
// SENTIMENT ANALYSIS
// =====================================================

export interface SentimentResult {
  overallSentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  sentimentScore: number // -1 to 1
  confidence: number // 0 to 1
  emotions: {
    joy: number
    anger: number
    frustration: number
    enthusiasm: number
    concern: number
  }
  keyPhrases: string[]
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low'
  actionRequired: boolean
  summary: string
  trends: {
    improving: boolean
    stable: boolean
    declining: boolean
  }
}

export async function analyzeSentiment(
  emailId: string,
  tenantId: string,
  userId: string
): Promise<SentimentResult> {
  try {
    // Fetch email message
    const emailQuery = await db.query(
      `
      SELECT
        em.*,
        c.name as contact_name,
        c.email as contact_email,
        d.title as deal_title,
        d.stage as deal_stage
      FROM email_messages em
      LEFT JOIN contacts c ON em.contact_id = c.id
      LEFT JOIN deals d ON em.deal_id = d.id
      WHERE em.id = $1 AND em.tenantId = $2 AND em.deleted_at IS NULL
    `,
      [emailId, tenantId]
    )

    if (emailQuery.rows.length === 0) {
      throw new Error('Email not found')
    }

    const email = emailQuery.rows[0]

    // Get email thread context
    const threadQuery = await db.query(
      `
      SELECT subject, body_text, from_email, sent_at
      FROM email_messages
      WHERE thread_id = $1 AND tenantId = $2 AND deleted_at IS NULL
      ORDER BY sent_at DESC
      LIMIT 5
    `,
      [email.thread_id, tenantId]
    )

    const context: AIContext = {
      tenantId,
      userId,
      entityType: 'email',
      entityId: emailId,
      entityData: {
        subject: email.subject,
        bodyText: email.body_text,
        fromName: email.from_name,
        fromEmail: email.from_email,
        contactName: email.contact_name,
        dealTitle: email.deal_title,
        dealStage: email.deal_stage,
        threadContext: threadQuery.rows,
      },
    }

    const aiRequest: AIRequest = {
      prompt: `Analyze the sentiment and emotional tone of this email conversation.

Email Subject: ${email.subject}
From: ${email.from_name} <${email.from_email}>
${email.contact_name ? `Contact: ${email.contact_name}` : ''}
${email.deal_title ? `Deal: ${email.deal_title} (${email.deal_stage})` : ''}

Current Email:
${email.body_text}

Thread Context (recent emails):
${threadQuery.rows.map((e: any) => `[${e.sent_at}] ${e.from_email}: ${e.body_text?.substring(0, 200)}...`).join('\n\n')}

Provide comprehensive sentiment analysis in JSON format:
\`\`\`json
{
  "overallSentiment": "<very_positive|positive|neutral|negative|very_negative>",
  "sentimentScore": <number -1 to 1>,
  "confidence": <number 0-1>,
  "emotions": {
    "joy": <0-1>,
    "anger": <0-1>,
    "frustration": <0-1>,
    "enthusiasm": <0-1>,
    "concern": <0-1>
  },
  "keyPhrases": ["<phrase 1>", "<phrase 2>", "<phrase 3>"],
  "urgencyLevel": "<critical|high|medium|low>",
  "actionRequired": <true|false>,
  "summary": "<brief summary of emotional tone and intent>",
  "trends": {
    "improving": <true|false>,
    "stable": <true|false>,
    "declining": <true|false>
  }
}
\`\`\`

Consider:
- Word choice and tone
- Exclamation points and emphasis
- Questions vs statements
- Urgency indicators
- Positive vs negative language
- Emotional cues
- Thread history trends`,
      featureType: AIFeatureType.SENTIMENT_ANALYSIS,
      complexity: QueryComplexity.MEDIUM,
      context,
    }

    const response = await aiService.execute(aiRequest)
    const sentimentData = response.data as SentimentResult

    // Store sentiment analysis
    await db.query(
      `UPDATE email_messages
       SET sentiment_score = $1, sentiment_data = $2, updated_at = NOW()
       WHERE id = $3`,
      [sentimentData.sentimentScore, JSON.stringify(sentimentData), emailId]
    )

    logger.info('[AI] Sentiment analysis completed', {
      emailId,
      sentiment: sentimentData.overallSentiment,
      score: sentimentData.sentimentScore,
      actionRequired: sentimentData.actionRequired,
    })

    return sentimentData
  } catch (error: any) {
    logger.error('[AI] Sentiment analysis failed', { error: error.message, emailId })
    throw error
  }
}
