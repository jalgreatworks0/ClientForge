/**
 * Email Tracking Routes
 * Handles tracking pixel requests for email open tracking
 */

import { Router, Request, Response } from 'express'

import { logger } from '../../utils/logging/logger'
import { getPostgresPool } from '../../../config/database/postgres-config'
import { optionalAuthenticate as authenticateOptional } from '../../middleware/authenticate'

const router = Router()
const pool = getPostgresPool()

/**
 * Track email open via 1x1 tracking pixel
 * GET /api/email-tracking/pixel/:emailSendId
 */
router.get('/pixel/:emailSendId', async (req: Request, res: Response) => {
  const { emailSendId } = req.params
  const ipAddress = req.ip || req.socket.remoteAddress
  const userAgent = req.get('user-agent')

  try {
    // Validate emailSendId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(emailSendId)) {
      logger.warn('[Email Tracking] Invalid emailSendId format', { emailSendId })
      return sendTrackingPixel(res)
    }

    // Check if email_send exists
    const sendResult = await pool.query(
      `SELECT id, campaign_id, contact_id, tenant_id FROM email_sends WHERE id = $1`,
      [emailSendId]
    )

    if (sendResult.rows.length === 0) {
      logger.warn('[Email Tracking] Email send not found', { emailSendId })
      return sendTrackingPixel(res)
    }

    const emailSend = sendResult.rows[0]

    // Check if already tracked (avoid double-counting)
    const existingEvent = await pool.query(
      `SELECT id FROM email_events
       WHERE email_send_id = $1 AND event_type = 'open'
       ORDER BY created_at DESC LIMIT 1`,
      [emailSendId]
    )

    // If first open, record it
    if (existingEvent.rows.length === 0) {
      await pool.query(
        `INSERT INTO email_events
         (email_send_id, campaign_id, tenant_id, event_type, event_data, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, 'open', $4, $5, $6, NOW())`,
        [
          emailSendId,
          emailSend.campaign_id,
          emailSend.tenant_id,
          JSON.stringify({ first_open: true }),
          ipAddress,
          userAgent,
        ]
      )

      logger.info('[Email Tracking] First open tracked', {
        emailSendId,
        campaignId: emailSend.campaign_id,
        contactId: emailSend.contact_id,
      })
    } else {
      // Record subsequent open (for engagement metrics)
      await pool.query(
        `INSERT INTO email_events
         (email_send_id, campaign_id, tenant_id, event_type, event_data, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, 'open', $4, $5, $6, NOW())`,
        [
          emailSendId,
          emailSend.campaign_id,
          emailSend.tenant_id,
          JSON.stringify({ subsequent_open: true }),
          ipAddress,
          userAgent,
        ]
      )

      logger.debug('[Email Tracking] Subsequent open tracked', { emailSendId })
    }

    // Return 1x1 transparent GIF
    return sendTrackingPixel(res)
  } catch (error) {
    logger.error('[Email Tracking] Failed to track email open', { error, emailSendId })
    // Always return pixel even on error (don't leak errors to recipient)
    return sendTrackingPixel(res)
  }
})

/**
 * Track email link click
 * GET /api/email-tracking/click/:emailSendId/:linkId
 */
router.get('/click/:emailSendId/:linkId', async (req: Request, res: Response) => {
  const { emailSendId, linkId } = req.params
  const { url } = req.query // Original destination URL
  const ipAddress = req.ip || req.socket.remoteAddress
  const userAgent = req.get('user-agent')

  try {
    // Validate UUIDs
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(emailSendId)) {
      return res.status(400).send('Invalid tracking link')
    }

    // Get email send info
    const sendResult = await pool.query(
      `SELECT id, campaign_id, contact_id, tenant_id FROM email_sends WHERE id = $1`,
      [emailSendId]
    )

    if (sendResult.rows.length === 0) {
      return res.status(404).send('Email not found')
    }

    const emailSend = sendResult.rows[0]

    // Record click event
    await pool.query(
      `INSERT INTO email_events
       (email_send_id, campaign_id, tenant_id, event_type, event_data, ip_address, user_agent, created_at)
       VALUES ($1, $2, $3, 'click', $4, $5, $6, NOW())`,
      [
        emailSendId,
        emailSend.campaign_id,
        emailSend.tenant_id,
        JSON.stringify({ link_id: linkId, url: url || '' }),
        ipAddress,
        userAgent,
      ]
    )

    logger.info('[Email Tracking] Click tracked', {
      emailSendId,
      campaignId: emailSend.campaign_id,
      linkId,
      url,
    })

    // Redirect to original URL
    if (url && typeof url === 'string') {
      return res.redirect(url)
    } else {
      return res.status(400).send('Missing destination URL')
    }
  } catch (error) {
    logger.error('[Email Tracking] Failed to track click', { error, emailSendId, linkId })
    // Redirect to destination even on error (better UX)
    if (req.query.url && typeof req.query.url === 'string') {
      return res.redirect(req.query.url)
    }
    return res.status(500).send('Tracking error')
  }
})

/**
 * Get email tracking statistics for a campaign
 * GET /api/email-tracking/campaign/:campaignId/stats
 */
router.get('/campaign/:campaignId/stats', authenticateOptional, async (req: Request, res: Response) => {
  const { campaignId } = req.params

  try {
    // Get campaign statistics
    const statsResult = await pool.query(
      `SELECT
        c.id as campaign_id,
        c.name as campaign_name,
        c.subject,
        c.sent_at,
        COUNT(DISTINCT es.id) as total_sent,
        COUNT(DISTINCT CASE WHEN ee.event_type = 'open' THEN es.id END) as unique_opens,
        COUNT(CASE WHEN ee.event_type = 'open' THEN 1 END) as total_opens,
        COUNT(DISTINCT CASE WHEN ee.event_type = 'click' THEN es.id END) as unique_clicks,
        COUNT(CASE WHEN ee.event_type = 'click' THEN 1 END) as total_clicks,
        ROUND(
          (COUNT(DISTINCT CASE WHEN ee.event_type = 'open' THEN es.id END)::numeric /
           NULLIF(COUNT(DISTINCT es.id), 0) * 100), 2
        ) as open_rate,
        ROUND(
          (COUNT(DISTINCT CASE WHEN ee.event_type = 'click' THEN es.id END)::numeric /
           NULLIF(COUNT(DISTINCT es.id), 0) * 100), 2
        ) as click_rate
      FROM email_campaigns c
      LEFT JOIN email_sends es ON c.id = es.campaign_id
      LEFT JOIN email_events ee ON es.id = ee.email_send_id
      WHERE c.id = $1
      GROUP BY c.id, c.name, c.subject, c.sent_at`,
      [campaignId]
    )

    if (statsResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' })
    }

    const stats = statsResult.rows[0]

    // Get recent opens (last 50)
    const recentOpensResult = await pool.query(
      `SELECT
        ee.created_at as opened_at,
        c.email,
        c.first_name,
        c.last_name,
        ee.user_agent,
        ee.ip_address
      FROM email_events ee
      JOIN email_sends es ON ee.email_send_id = es.id
      LEFT JOIN contacts c ON es.contact_id = c.id
      WHERE ee.campaign_id = $1 AND ee.event_type = 'open'
      ORDER BY ee.created_at DESC
      LIMIT 50`,
      [campaignId]
    )

    logger.info('[Email Tracking] Campaign stats retrieved', { campaignId })

    return res.json({
      campaign: {
        id: stats.campaign_id,
        name: stats.campaign_name,
        subject: stats.subject,
        sentAt: stats.sent_at,
      },
      statistics: {
        totalSent: parseInt(stats.total_sent) || 0,
        uniqueOpens: parseInt(stats.unique_opens) || 0,
        totalOpens: parseInt(stats.total_opens) || 0,
        uniqueClicks: parseInt(stats.unique_clicks) || 0,
        totalClicks: parseInt(stats.total_clicks) || 0,
        openRate: parseFloat(stats.open_rate) || 0,
        clickRate: parseFloat(stats.click_rate) || 0,
      },
      recentOpens: recentOpensResult.rows,
    })
  } catch (error) {
    logger.error('[Email Tracking] Failed to get campaign stats', { error, campaignId })
    return res.status(500).json({ error: 'Failed to retrieve statistics' })
  }
})

/**
 * Helper: Send 1x1 transparent GIF pixel
 */
function sendTrackingPixel(res: Response): void {
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  )

  res.writeHead(200, {
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  })

  res.end(pixel)
}

export default router
