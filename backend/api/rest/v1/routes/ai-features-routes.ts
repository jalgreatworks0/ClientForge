/**
 * AI-Powered Features Routes
 * Routes for advanced AI capabilities
 */

import { Router } from 'express'

import { authenticate } from '../../../../middleware/authenticate'
import {
  getLeadScore,
  getNextActions,
  composeEmailAI,
  recognizePatternsAI,
  analyzeSentimentAI,
  batchScoreLeads,
} from '../controllers/ai-features-controller'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * POST /api/v1/ai/lead-score/:contactId
 * Calculate AI-powered lead score for a contact
 */
router.post('/lead-score/:contactId', getLeadScore)

/**
 * POST /api/v1/ai/batch-score-leads
 * Batch score multiple leads at once
 * Body: { contactIds: string[] }
 */
router.post('/batch-score-leads', batchScoreLeads)

/**
 * POST /api/v1/ai/next-actions/:dealId
 * Get AI-powered next action suggestions for a deal
 */
router.post('/next-actions/:dealId', getNextActions)

/**
 * POST /api/v1/ai/compose-email
 * Compose an email using AI
 * Body: EmailCompositionRequest
 */
router.post('/compose-email', composeEmailAI)

/**
 * POST /api/v1/ai/recognize-patterns/:dealId
 * Recognize patterns in a deal (at-risk, upsell opportunities, etc.)
 */
router.post('/recognize-patterns/:dealId', recognizePatternsAI)

/**
 * POST /api/v1/ai/sentiment-analysis/:emailId
 * Analyze sentiment of an email message
 */
router.post('/sentiment-analysis/:emailId', analyzeSentimentAI)

export default router
