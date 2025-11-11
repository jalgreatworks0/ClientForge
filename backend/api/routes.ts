/**
 * Route Configuration
 * Central routing configuration for all API endpoints
 */

import { Application } from 'express'

import { appConfig } from '../../config/app/app-config'
import { getPool } from '../database/postgresql/pool'
import { performanceStatsEndpoint } from '../middleware/performance-monitoring'
import { register } from 'prom-client'

import authRoutes from './rest/v1/routes/auth-routes'
import healthRoutes from './rest/v1/routes/health-routes'
import contactsRoutes from './rest/v1/routes/contacts-routes'
import accountsRoutes from './rest/v1/routes/accounts-routes'
import dealsRoutes from './rest/v1/routes/deals-routes'
import pipelinesRoutes from './rest/v1/routes/pipelines-routes'
import dealStagesRoutes from './rest/v1/routes/deal-stages-routes'
import tasksRoutes from './rest/v1/routes/tasks-routes'
import activitiesRoutes from './rest/v1/routes/activities-routes'
import notesRoutes from './rest/v1/routes/notes-routes'
import commentsRoutes from './rest/v1/routes/comments-routes'
import tagsRoutes from './rest/v1/routes/tags-routes'
import customFieldsRoutes from './rest/v1/routes/custom-fields-routes'
import aiRoutes from './rest/v1/routes/ai-routes'
import aiFeaturesRoutes from './rest/v1/routes/ai-features-routes'
import searchRoutes from './rest/v1/routes/search-routes'
import emailRoutes from './rest/v1/routes/email-routes'
import filesRoutes from './rest/v1/routes/files-routes'
import analyticsSimpleRoutes from './rest/v1/routes/analytics-simple-routes'
import { createAnalyticsRoutes } from './rest/v1/routes/analytics-routes'

/**
 * Configure all application routes
 */
export function configureRoutes(app: Application): void {
  const apiPrefix = `/api/${appConfig.apiVersion}`

  // Health check routes (no auth required)
  app.use(`${apiPrefix}/health`, healthRoutes)

  // Performance stats endpoint (no auth required - for monitoring)
  app.get(`${apiPrefix}/performance`, performanceStatsEndpoint)

  // Prometheus metrics endpoint (no auth required - for Prometheus scraping)
  app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', register.contentType)
      res.end(await register.metrics())
    } catch (error) {
      res.status(500).end(error)
    }
  })

  // Authentication routes (public)
  app.use(`${apiPrefix}/auth`, authRoutes)

  // AI routes (authentication required) - Albedo AI assistant
  app.use(`${apiPrefix}/ai`, aiRoutes)
  app.use(`${apiPrefix}/ai`, aiFeaturesRoutes)

  // Search routes (authentication required) - Elasticsearch unified search
  app.use(`${apiPrefix}/search`, searchRoutes)

  // Email integration routes (authentication required) - Gmail & Outlook
  app.use(`${apiPrefix}/email`, emailRoutes)

  // File storage routes (authentication required) - Secure signed URLs only
  app.use(`${apiPrefix}/files`, filesRoutes)

  // CRM routes (authentication required)
  app.use(`${apiPrefix}/contacts`, contactsRoutes)
  app.use(`${apiPrefix}/accounts`, accountsRoutes)
  app.use(`${apiPrefix}/deals`, dealsRoutes)
  app.use(`${apiPrefix}/pipelines`, pipelinesRoutes)
  app.use(`${apiPrefix}/deal-stages`, dealStagesRoutes)
  app.use(`${apiPrefix}/tasks`, tasksRoutes)
  app.use(`${apiPrefix}/activities`, activitiesRoutes)

  // Metadata routes (authentication required)
  app.use(`${apiPrefix}/notes`, notesRoutes)
  app.use(`${apiPrefix}/comments`, commentsRoutes)
  app.use(`${apiPrefix}/tags`, tagsRoutes)
  app.use(`${apiPrefix}/custom-fields`, customFieldsRoutes)

  // Analytics routes (authentication required)
  // Both simplified (for Analytics page) and complex (for Dashboard) routes
  app.use(`${apiPrefix}/analytics`, analyticsSimpleRoutes)
  const pool = getPool()
  app.use(`${apiPrefix}/analytics`, createAnalyticsRoutes(pool))

  console.log('[OK] All routes configured including AI, AI-Powered Features, Analytics, Email Integration, and File Storage endpoints')
}
