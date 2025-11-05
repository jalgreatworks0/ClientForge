/**
 * Route Configuration
 * Central routing configuration for all API endpoints
 */

import { Application } from 'express'
import { appConfig } from '../../config/app/app-config'
import authRoutes from './rest/v1/routes/auth-routes'
import healthRoutes from './rest/v1/routes/health-routes'

/**
 * Configure all application routes
 */
export function configureRoutes(app: Application): void {
  const apiPrefix = `/api/${appConfig.apiVersion}`

  // Health check routes (no auth required)
  app.use(`${apiPrefix}/health`, healthRoutes)

  // Authentication routes (public)
  app.use(`${apiPrefix}/auth`, authRoutes)

  // TODO: Add more routes as we build features
  // app.use(`${apiPrefix}/users`, userRoutes)
  // app.use(`${apiPrefix}/contacts`, contactRoutes)
  // app.use(`${apiPrefix}/deals`, dealRoutes)
}
