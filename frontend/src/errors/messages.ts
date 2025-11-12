/**
 * Frontend Error Messages - User-Facing
 *
 * Maps error IDs to localized, user-friendly messages
 * Keyed by user_message_key from error-registry.yaml
 *
 * Usage:
 * ```ts
 * import { ERROR_MESSAGES } from './errors/messages';
 * const userMessage = ERROR_MESSAGES[error.userMessageKey] || ERROR_MESSAGES['errors.unexpected'];
 * ```
 */

export const ERROR_MESSAGES: Record<string, string> = {
  // ===========================
  // Authentication Errors
  // ===========================
  "errors.auth.invalid_credentials":
    "The email or password you entered is incorrect. Please try again.",

  "errors.auth.account_locked":
    "Your account has been locked due to multiple failed login attempts. Please contact support or try again in 30 minutes.",

  "errors.auth.session_expired":
    "Your session has expired. Please log in again to continue.",

  "errors.auth.token_invalid":
    "Your authentication token is invalid or has expired. Please log in again.",

  "errors.auth.insufficient_permissions":
    "You don't have permission to perform this action. Please contact your administrator.",

  // ===========================
  // Database Errors
  // ===========================
  "errors.db.connection_failed":
    "We're experiencing technical difficulties. Please try again in a few moments.",

  "errors.db.query_timeout":
    "This operation is taking longer than expected. Please try again.",

  "errors.db.unique_violation":
    "This record already exists. Please check your input and try again.",

  "errors.db.foreign_key_violation":
    "This action cannot be completed because related records exist. Please remove dependencies first.",

  "errors.db.record_not_found":
    "The requested record could not be found. It may have been deleted.",

  // ===========================
  // Redis/Cache Errors
  // ===========================
  "errors.redis.connection_lost":
    "Connection interrupted. Please refresh the page and try again.",

  "errors.redis.eviction":
    "Session data expired. Please log in again.",

  // ===========================
  // Search Errors
  // ===========================
  "errors.search.unavailable":
    "Search is temporarily unavailable. Please try again later.",

  "errors.search.query_invalid":
    "Your search query contains invalid characters. Please modify and try again.",

  "errors.search.index_missing":
    "Search index is being rebuilt. Please try again in a few minutes.",

  // ===========================
  // Queue Errors
  // ===========================
  "errors.queue.connection_lost":
    "Background task system unavailable. Your request has been saved and will be processed when service resumes.",

  "errors.queue.job_failed":
    "This background task failed to complete. Please try again or contact support.",

  "errors.queue.job_timeout":
    "This operation timed out. The system may still be processing your request.",

  // ===========================
  // Email Errors
  // ===========================
  "errors.email.send_failed":
    "We couldn't send the email. Please check the recipient address and try again.",

  "errors.email.invalid_recipient":
    "The email address appears to be invalid. Please check and try again.",

  "errors.email.quota_exceeded":
    "Email sending limit reached. Please try again later or contact support.",

  // ===========================
  // AI Errors
  // ===========================
  "errors.ai.api_error":
    "AI service is temporarily unavailable. Please try again later.",

  "errors.ai.rate_limit":
    "AI request limit reached. Please wait a moment and try again.",

  "errors.ai.invalid_prompt":
    "The AI request contains invalid content. Please modify and try again.",

  "errors.ai.timeout":
    "AI request timed out. Please try a shorter or simpler request.",

  // ===========================
  // Frontend Errors
  // ===========================
  "errors.frontend.network":
    "Network connection lost. Please check your internet connection and try again.",

  "errors.frontend.validation":
    "Please correct the highlighted fields and try again.",

  "errors.frontend.state_invalid":
    "Application state is inconsistent. Please refresh the page.",

  // ===========================
  // Agent Errors
  // ===========================
  "errors.agent.orchestration_failed":
    "Multi-agent system encountered an error. Please try again or simplify your request.",

  "errors.agent.communication_error":
    "Agent communication failed. The system is working to restore service.",

  // ===========================
  // Billing Errors
  // ===========================
  "errors.billing.payment_failed":
    "Payment could not be processed. Please check your payment details and try again.",

  "errors.billing.subscription_inactive":
    "Your subscription is inactive. Please update your payment method to continue.",

  "errors.billing.invoice_generation_failed":
    "Invoice could not be generated. Please contact support.",

  // ===========================
  // Storage Errors
  // ===========================
  "errors.storage.upload_failed":
    "File upload failed. Please check your file and try again.",

  "errors.storage.file_too_large":
    "The file is too large. Maximum file size is 100MB.",

  "errors.storage.invalid_file_type":
    "This file type is not supported. Please upload a different file.",

  // ===========================
  // Validation Errors
  // ===========================
  "errors.validation.invalid_input":
    "One or more fields contain invalid data. Please review and correct them.",

  "errors.validation.required_field":
    "Required fields are missing. Please fill in all required information.",

  "errors.validation.format_error":
    "Data format is incorrect. Please check the format and try again.",

  // ===========================
  // Rate Limiting
  // ===========================
  "errors.rate_limit.exceeded":
    "Too many requests. Please wait a moment and try again.",

  // ===========================
  // General Errors
  // ===========================
  "errors.unexpected":
    "An unexpected error occurred. Our team has been notified. Please try again.",

  "errors.not_found":
    "The page or resource you're looking for doesn't exist.",

  "errors.maintenance":
    "System maintenance in progress. We'll be back shortly.",
};

/**
 * Get user-friendly error message
 */
export function getErrorMessage(messageKey?: string): string {
  if (!messageKey) {
    return ERROR_MESSAGES["errors.unexpected"];
  }

  return ERROR_MESSAGES[messageKey] || ERROR_MESSAGES["errors.unexpected"];
}

/**
 * Check if error should be displayed to user
 */
export function isUserFacingError(messageKey?: string): boolean {
  return messageKey !== undefined && messageKey in ERROR_MESSAGES;
}
