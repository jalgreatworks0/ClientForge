/**
 * AI Routes
 * Routes for Albedo AI assistant and intelligent actions
 */

import { Router } from 'express';
import * as aiController from '../controllers/ai-controller';

const router = Router();

/**
 * POST /api/v1/ai/chat
 * Chat with Albedo AI assistant
 *
 * Request body:
 * - message: string (required) - User's message
 * - collaborative: boolean - Use both Claude and OpenAI
 * - provider: 'claude' | 'openai' - Force specific provider
 * - model: string - Specific model to use
 * - context: object - Additional context
 *
 * Response:
 * - success: boolean
 * - data: ChatResponse
 */
router.post('/chat', aiController.chat);

/**
 * POST /api/v1/ai/chat/stream
 * Stream chat response in real-time
 *
 * Returns Server-Sent Events stream
 */
router.post('/chat/stream', aiController.chatStream);

/**
 * POST /api/v1/ai/analyze
 * Analyze CRM entity and provide insights
 *
 * Request body:
 * - entityType: string (contact, deal, account, etc.)
 * - entityId: number
 * - analysisType: 'insights' | 'nextAction' | 'prediction'
 * - context: object - Additional data
 */
router.post('/analyze', aiController.analyze);

/**
 * POST /api/v1/ai/execute
 * Execute an action through AI
 *
 * Request body:
 * - action: string (e.g., 'create_contact', 'send_email')
 * - parameters: object - Action parameters
 * - context: object - Execution context
 */
router.post('/execute', aiController.executeAction);

/**
 * GET /api/v1/ai/models
 * Get available AI models and capabilities
 */
router.get('/models', aiController.getModels);

/**
 * GET /api/v1/ai/usage
 * Get AI usage statistics
 */
router.get('/usage', aiController.getUsage);

export default router;
