/**
 * Email Tracking Helper
 * Utilities for inserting tracking pixels and converting links to tracked links
 */

export interface TrackingOptions {
  emailSendId: string
  backendUrl?: string
}

/**
 * Insert tracking pixel into HTML email content
 * Adds a 1x1 transparent pixel at the end of the email body
 */
export function insertTrackingPixel(htmlContent: string, options: TrackingOptions): string {
  const { emailSendId, backendUrl = process.env.BACKEND_URL || 'http://localhost:3000' } = options

  const trackingPixelUrl = `${backendUrl}/api/email-tracking/pixel/${emailSendId}`
  const trackingPixelHtml = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:block" />`

  // Try to insert before </body> tag
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${trackingPixelHtml}</body>`)
  }

  // If no </body> tag, append at the end
  return htmlContent + trackingPixelHtml
}

/**
 * Convert all links in HTML content to tracked links
 * Wraps URLs in tracking redirect endpoints for click tracking
 */
export function convertLinksToTracked(htmlContent: string, options: TrackingOptions): string {
  const { emailSendId, backendUrl = process.env.BACKEND_URL || 'http://localhost:3000' } = options

  // Regex to find all <a href="..."> tags
  const linkRegex = /<a\s+([^>]*\s+)?href="([^"]+)"([^>]*)>/gi

  let linkIndex = 0
  const convertedHtml = htmlContent.replace(linkRegex, (match, beforeHref, originalUrl, afterHref) => {
    linkIndex++

    // Skip tracking for unsubscribe links, mailto:, and anchor links
    if (
      originalUrl.includes('{{unsubscribe_url}}') ||
      originalUrl.startsWith('mailto:') ||
      originalUrl.startsWith('#') ||
      originalUrl.includes('/unsubscribe')
    ) {
      return match
    }

    // Create tracked link URL
    const linkId = `link-${linkIndex}`
    const trackedUrl = `${backendUrl}/api/email-tracking/click/${emailSendId}/${linkId}?url=${encodeURIComponent(originalUrl)}`

    // Reconstruct <a> tag with tracked URL
    return `<a ${beforeHref || ''}href="${trackedUrl}"${afterHref || ''}>`
  })

  return convertedHtml
}

/**
 * Add tracking to email (both pixel and link tracking)
 */
export function addEmailTracking(htmlContent: string, options: TrackingOptions): string {
  // First convert links to tracked links
  let trackedContent = convertLinksToTracked(htmlContent, options)

  // Then insert tracking pixel
  trackedContent = insertTrackingPixel(trackedContent, options)

  return trackedContent
}

/**
 * Extract plain text version from HTML (removes tracking elements)
 */
export function extractPlainText(htmlContent: string): string {
  // Remove tracking pixel
  let plainText = htmlContent.replace(/<img[^>]*email-tracking[^>]*>/gi, '')

  // Convert <a> tags to plain URLs
  plainText = plainText.replace(/<a\s+[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '$2 ($1)')

  // Remove all HTML tags
  plainText = plainText.replace(/<[^>]+>/g, '')

  // Decode HTML entities
  plainText = plainText
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  // Trim excessive whitespace
  plainText = plainText.replace(/\n\s*\n\s*\n/g, '\n\n').trim()

  return plainText
}

/**
 * Generate unsubscribe link for email footer
 */
export function generateUnsubscribeLink(emailSendId: string, backendUrl?: string): string {
  const baseUrl = backendUrl || process.env.BACKEND_URL || 'http://localhost:3000'
  return `${baseUrl}/api/email-tracking/unsubscribe/${emailSendId}`
}

/**
 * Add unsubscribe footer to email (required by CAN-SPAM Act)
 */
export function addUnsubscribeFooter(htmlContent: string, emailSendId: string): string {
  const unsubscribeUrl = generateUnsubscribeLink(emailSendId)

  const footerHtml = `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
      <p>
        Don't want to receive these emails anymore?
        <a href="${unsubscribeUrl}" style="color: #0066cc; text-decoration: underline;">Unsubscribe</a>
      </p>
    </div>
  `

  // Insert before </body> or at the end
  if (htmlContent.includes('</body>')) {
    return htmlContent.replace('</body>', `${footerHtml}</body>`)
  }

  return htmlContent + footerHtml
}
