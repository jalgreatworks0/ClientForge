/**
 * Route Configuration
 * Central routing configuration for all API endpoints
 */

import { Application } from 'express'
import { appConfig } from '../../config/app/app-config'
import authRoutes from './rest/v1/routes/auth-routes'
import healthRoutes from './rest/v1/routes/health-routes'
import contactsRoutes from './rest/v1/routes/contacts-routes'
import accountsRoutes from './rest/v1/routes/accounts-routes'
import dealsRoutes from './rest/v1/routes/deals-routes'
import tasksRoutes from './rest/v1/routes/tasks-routes'
import activitiesRoutes from './rest/v1/routes/activities-routes'
import notesRoutes from './rest/v1/routes/notes-routes'
import commentsRoutes from './rest/v1/routes/comments-routes'
import tagsRoutes from './rest/v1/routes/tags-routes'
import customFieldsRoutes from './rest/v1/routes/custom-fields-routes'

/**
 * Configure all application routes
 */
export function configureRoutes(app: Application): void {
  const apiPrefix = `/api/${appConfig.apiVersion}`

  // Health check routes (no auth required)
  app.use(`${apiPrefix}/health`, healthRoutes)

  // Authentication routes (public)
  app.use(`${apiPrefix}/auth`, authRoutes)

  // CRM routes (authentication required)
  app.use(`${apiPrefix}/contacts`, contactsRoutes)
  app.use(`${apiPrefix}/accounts`, accountsRoutes)
  app.use(`${apiPrefix}/deals`, dealsRoutes)
  app.use(`${apiPrefix}/tasks`, tasksRoutes)
  app.use(`${apiPrefix}/activities`, activitiesRoutes)

  // Metadata routes (authentication required)
  app.use(`${apiPrefix}/notes`, notesRoutes)
  app.use(`${apiPrefix}/comments`, commentsRoutes)
  app.use(`${apiPrefix}/tags`, tagsRoutes)
  app.use(`${apiPrefix}/custom-fields`, customFieldsRoutes)

  // TODO: Add more routes as we build features
  // app.use(`${apiPrefix}/users`, userRoutes)
}
