/**
 * Auto-generated Error Types
 * DO NOT EDIT MANUALLY
 * Generated from: config/errors/error-registry.yaml
 * Generated at: 2025-11-11T14:27:10.320Z
 */

/**
 * All registered error IDs
 */
export type ErrorId =
  | "AUTH-001"
  | "AUTH-002"
  | "AUTH-003"
  | "AUTH-004"
  | "AUTH-005"
  | "DB-001"
  | "DB-002"
  | "DB-003"
  | "DB-004"
  | "DB-005"
  | "RDS-001"
  | "RDS-002"
  | "ES-001"
  | "ES-002"
  | "ES-003"
  | "QUEUE-001"
  | "QUEUE-002"
  | "QUEUE-003"
  | "MAIL-001"
  | "MAIL-002"
  | "MAIL-003"
  | "AI-001"
  | "AI-002"
  | "AI-003"
  | "AI-004"
  | "FE-001"
  | "FE-002"
  | "FE-003"
  | "AGT-001"
  | "AGT-002"
  | "BIL-001"
  | "BIL-002"
  | "BIL-003"
  | "STG-001"
  | "STG-002"
  | "STG-003"
  | "VAL-001"
  | "VAL-002"
  | "VAL-003"
  | "RL-001"
  | "GEN-001"
  | "GEN-002"
  | "GEN-003";

/**
 * All registered error names
 */
export type ErrorName =
  | "InvalidCredentials"
  | "MFARequired"
  | "TokenExpired"
  | "SessionInvalid"
  | "PermissionDenied"
  | "PostgresUnavailable"
  | "MongoWriteFailed"
  | "MongoConnectionFailed"
  | "QueryTimeout"
  | "TransactionFailed"
  | "RedisUnavailable"
  | "CacheWriteFailed"
  | "IndexMissing"
  | "SearchFailed"
  | "ElasticsearchUnavailable"
  | "WorkerDown"
  | "JobFailed"
  | "QueueFull"
  | "OAuthTokenExpired"
  | "SendFailed"
  | "InvalidRecipient"
  | "ProviderRateLimited"
  | "InvalidAPIKey"
  | "ContextTooLarge"
  | "ProviderUnavailable"
  | "NetworkOffline"
  | "ValidationFailed"
  | "ResourceNotFound"
  | "AgentUnreachable"
  | "AgentTimeout"
  | "PaymentFailed"
  | "SubscriptionExpired"
  | "StripeWebhookFailed"
  | "UploadFailed"
  | "FileNotFound"
  | "StorageQuotaExceeded"
  | "InvalidInput"
  | "MissingRequiredField"
  | "InvalidFormat"
  | "RateLimitExceeded"
  | "UnexpectedError"
  | "ServiceUnavailable"
  | "Timeout";

/**
 * All user message keys
 */
export type UserMessageKey =
  | "errors.auth.invalid_credentials"
  | "errors.auth.session_expired"
  | "errors.auth.token_invalid"
  | "errors.auth.session_expired"
  | "errors.auth.insufficient_permissions"
  | "errors.email.send_failed"
  | "errors.email.send_failed"
  | "errors.email.invalid_recipient"
  | "errors.ai.rate_limit"
  | "errors.ai.api_error"
  | "errors.ai.invalid_prompt"
  | "errors.ai.api_error"
  | "errors.frontend.network"
  | "errors.frontend.validation"
  | "errors.validation.format_error"
  | "errors.billing.payment_failed"
  | "errors.billing.subscription_inactive"
  | "errors.storage.upload_failed"
  | "errors.not_found"
  | "errors.storage.file_too_large"
  | "errors.validation.invalid_input"
  | "errors.validation.required_field"
  | "errors.validation.format_error"
  | "errors.rate_limit.exceeded";

/**
 * Error registry metadata
 */
export const ERROR_REGISTRY_META = {
  version: 1,
  owner: "ClientForge Platform",
  totalErrors: 43,
  errorIds: [
  "AUTH-001",
  "AUTH-002",
  "AUTH-003",
  "AUTH-004",
  "AUTH-005",
  "DB-001",
  "DB-002",
  "DB-003",
  "DB-004",
  "DB-005",
  "RDS-001",
  "RDS-002",
  "ES-001",
  "ES-002",
  "ES-003",
  "QUEUE-001",
  "QUEUE-002",
  "QUEUE-003",
  "MAIL-001",
  "MAIL-002",
  "MAIL-003",
  "AI-001",
  "AI-002",
  "AI-003",
  "AI-004",
  "FE-001",
  "FE-002",
  "FE-003",
  "AGT-001",
  "AGT-002",
  "BIL-001",
  "BIL-002",
  "BIL-003",
  "STG-001",
  "STG-002",
  "STG-003",
  "VAL-001",
  "VAL-002",
  "VAL-003",
  "RL-001",
  "GEN-001",
  "GEN-002",
  "GEN-003"
],
  errorNames: [
  "InvalidCredentials",
  "MFARequired",
  "TokenExpired",
  "SessionInvalid",
  "PermissionDenied",
  "PostgresUnavailable",
  "MongoWriteFailed",
  "MongoConnectionFailed",
  "QueryTimeout",
  "TransactionFailed",
  "RedisUnavailable",
  "CacheWriteFailed",
  "IndexMissing",
  "SearchFailed",
  "ElasticsearchUnavailable",
  "WorkerDown",
  "JobFailed",
  "QueueFull",
  "OAuthTokenExpired",
  "SendFailed",
  "InvalidRecipient",
  "ProviderRateLimited",
  "InvalidAPIKey",
  "ContextTooLarge",
  "ProviderUnavailable",
  "NetworkOffline",
  "ValidationFailed",
  "ResourceNotFound",
  "AgentUnreachable",
  "AgentTimeout",
  "PaymentFailed",
  "SubscriptionExpired",
  "StripeWebhookFailed",
  "UploadFailed",
  "FileNotFound",
  "StorageQuotaExceeded",
  "InvalidInput",
  "MissingRequiredField",
  "InvalidFormat",
  "RateLimitExceeded",
  "UnexpectedError",
  "ServiceUnavailable",
  "Timeout"
],
  userMessageKeys: [
  "errors.auth.invalid_credentials",
  "errors.auth.session_expired",
  "errors.auth.token_invalid",
  "errors.auth.session_expired",
  "errors.auth.insufficient_permissions",
  "errors.email.send_failed",
  "errors.email.send_failed",
  "errors.email.invalid_recipient",
  "errors.ai.rate_limit",
  "errors.ai.api_error",
  "errors.ai.invalid_prompt",
  "errors.ai.api_error",
  "errors.frontend.network",
  "errors.frontend.validation",
  "errors.validation.format_error",
  "errors.billing.payment_failed",
  "errors.billing.subscription_inactive",
  "errors.storage.upload_failed",
  "errors.not_found",
  "errors.storage.file_too_large",
  "errors.validation.invalid_input",
  "errors.validation.required_field",
  "errors.validation.format_error",
  "errors.rate_limit.exceeded"
],
} as const;
