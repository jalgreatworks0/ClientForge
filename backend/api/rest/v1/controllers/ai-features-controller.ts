/**
 * AI-Powered Features Controller
 * Handles requests for advanced AI capabilities
 */

import { Request, Response } from 'express'

import {
  scoreContact,
  suggestNextActions,
  composeEmail,
  recognizePatterns,
  analyzeSentiment,
  type EmailCompositionRequest,
} from '../../../../services/ai/ai-powered-features.service'
import { logger } from '../../../../utils/logging/logger'

/**
 * POST /api/v1/ai/lead-score/:contactId
 * Calculate AI-powered lead score for a contact
 */
export async function getLeadScore(req: Request, res: Response): Promise<void> {
  try {
    const { contactId } = req.params
    const tenantId = req.user?.tenantId
    const userId = req.user?.id

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
      return
    }

    if (!contactId) {
      res.status(400).json({
        success: false,
        message: 'Contact ID is required',
      })
      return
    }

    const scoreResult = await scoreContact(contactId, tenantId, userId)

    res.json({
      success: true,
      data: scoreResult,
      message: `Lead scored: ${scoreResult.grade} (${scoreResult.score}/100)`,
    })
  } catch (error: any) {
    logger.error('[AI Features] Lead scoring failed', {
      error: error.message,
      contactId: req.params.contactId,
      userId: req.user?.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to score lead',
      error: error.message,
    })
  }
}

/**
 * POST /api/v1/ai/next-actions/:dealId
 * Get AI-powered next action suggestions for a deal
 */
export async function getNextActions(req: Request, res: Response): Promise<void> {
  try {
    const { dealId } = req.params
    const tenantId = req.user?.tenantId
    const userId = req.user?.id

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
      return
    }

    if (!dealId) {
      res.status(400).json({
        success: false,
        message: 'Deal ID is required',
      })
      return
    }

    const actionsResult = await suggestNextActions(dealId, tenantId, userId)

    res.json({
      success: true,
      data: actionsResult,
      message: 'Next actions suggested successfully',
    })
  } catch (error: any) {
    logger.error('[AI Features] Next actions suggestion failed', {
      error: error.message,
      dealId: req.params.dealId,
      userId: req.user?.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to suggest next actions',
      error: error.message,
    })
  }
}

/**
 * POST /api/v1/ai/compose-email
 * Compose an email using AI
 * Body: { purpose, tone, recipientName, recipientCompany, etc. }
 */
export async function composeEmailAI(req: Request, res: Response): Promise<void> {
  try {
    const tenantId = req.user?.tenantId
    const userId = req.user?.id

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
      return
    }

    const emailRequest: EmailCompositionRequest = {
      purpose: req.body.purpose || 'follow_up',
      tone: req.body.tone || 'professional',
      recipientName: req.body.recipientName,
      recipientCompany: req.body.recipientCompany,
      recipientTitle: req.body.recipientTitle,
      contextNotes: req.body.contextNotes,
      previousEmailContext: req.body.previousEmailContext,
      dealContext: req.body.dealContext,
      contactContext: req.body.contactContext,
    }

    if (!emailRequest.purpose) {
      res.status(400).json({
        success: false,
        message: 'Email purpose is required',
      })
      return
    }

    const emailResult = await composeEmail(emailRequest, tenantId, userId)

    res.json({
      success: true,
      data: emailResult,
      message: 'Email composed successfully',
    })
  } catch (error: any) {
    logger.error('[AI Features] Email composition failed', {
      error: error.message,
      userId: req.user?.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to compose email',
      error: error.message,
    })
  }
}

/**
 * POST /api/v1/ai/recognize-patterns/:dealId
 * Recognize patterns in a deal (at-risk, upsell opportunities, etc.)
 */
export async function recognizePatternsAI(req: Request, res: Response): Promise<void> {
  try {
    const { dealId } = req.params
    const tenantId = req.user?.tenantId
    const userId = req.user?.id

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
      return
    }

    if (!dealId) {
      res.status(400).json({
        success: false,
        message: 'Deal ID is required',
      })
      return
    }

    const patternResult = await recognizePatterns(dealId, tenantId, userId)

    res.json({
      success: true,
      data: patternResult,
      message: `Found ${patternResult.patterns.length} patterns`,
    })
  } catch (error: any) {
    logger.error('[AI Features] Pattern recognition failed', {
      error: error.message,
      dealId: req.params.dealId,
      userId: req.user?.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to recognize patterns',
      error: error.message,
    })
  }
}

/**
 * POST /api/v1/ai/sentiment-analysis/:emailId
 * Analyze sentiment of an email message
 */
export async function analyzeSentimentAI(req: Request, res: Response): Promise<void> {
  try {
    const { emailId } = req.params
    const tenantId = req.user?.tenantId
    const userId = req.user?.id

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
      return
    }

    if (!emailId) {
      res.status(400).json({
        success: false,
        message: 'Email ID is required',
      })
      return
    }

    const sentimentResult = await analyzeSentiment(emailId, tenantId, userId)

    res.json({
      success: true,
      data: sentimentResult,
      message: `Sentiment: ${sentimentResult.overallSentiment}`,
    })
  } catch (error: any) {
    logger.error('[AI Features] Sentiment analysis failed', {
      error: error.message,
      emailId: req.params.emailId,
      userId: req.user?.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to analyze sentiment',
      error: error.message,
    })
  }
}

/**
 * POST /api/v1/ai/batch-score-leads
 * Batch score multiple leads at once
 * Body: { contactIds: string[] }
 */
export async function batchScoreLeads(req: Request, res: Response): Promise<void> {
  try {
    const { contactIds } = req.body
    const tenantId = req.user?.tenantId
    const userId = req.user?.id

    if (!tenantId || !userId) {
      res.status(401).json({
        success: false,
        message: 'User not authenticated',
      })
      return
    }

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Contact IDs array is required',
      })
      return
    }

    if (contactIds.length > 50) {
      res.status(400).json({
        success: false,
        message: 'Maximum 50 contacts can be scored at once',
      })
      return
    }

    // Score contacts in parallel with limit
    const results = await Promise.allSettled(
      contactIds.map((contactId) => scoreContact(contactId, tenantId, userId))
    )

    const successful = results.filter((r) => r.status === 'fulfilled')
    const failed = results.filter((r) => r.status === 'rejected')

    res.json({
      success: true,
      data: {
        scored: successful.map((r: any) => r.value),
        errors: failed.map((r: any) => r.reason?.message),
        summary: {
          total: contactIds.length,
          successful: successful.length,
          failed: failed.length,
        },
      },
      message: `Scored ${successful.length}/${contactIds.length} leads`,
    })
  } catch (error: any) {
    logger.error('[AI Features] Batch lead scoring failed', {
      error: error.message,
      userId: req.user?.id,
    })

    res.status(500).json({
      success: false,
      message: 'Failed to batch score leads',
      error: error.message,
    })
  }
}
