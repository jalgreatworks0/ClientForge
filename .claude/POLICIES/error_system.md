# Error System Policy

## RFC7807 Problem Details

All errors use RFC7807 format via AppError class.

### AppError Structure
\\\	ypescript
new AppError({
  statusCode: 400,
  errorId: "ERR_INVALID_INPUT",
  severity: "low" | "medium" | "high" | "critical",
  message: "User-friendly message",
  problem: {
    type: "/problems/validation-error",
    title: "Validation Error",
    detail: "Specific field: email",
    instance: req.path,
    correlationId: req.correlationId
  }
})
\\\

### Error IDs (Standardized)
- \ERR_AUTH_*\ â€” Authentication errors
- \ERR_VALIDATION_*\ â€” Input validation
- \ERR_NOT_FOUND\ â€” Resource not found
- \ERR_DATABASE_*\ â€” Database errors
- \ERR_EXTERNAL_*\ â€” Third-party API errors

### Severity Levels
- **low:** Client errors (400s)
- **medium:** Server errors (500s), recoverable
- **high:** Service degradation
- **critical:** Data corruption, security breach

### Alert Routes
- **critical:** PagerDuty + Slack + email
- **high:** Slack + email
- **medium:** Slack
- **low:** Logged only

## Error Handling Pattern
\\\	ypescript
try {
  // operation
} catch (error) {
  if (error instanceof AppError) {
    throw error; // Already formatted
  }
  throw new AppError({
    statusCode: 500,
    errorId: "ERR_INTERNAL",
    severity: "high",
    message: "An unexpected error occurred",
    problem: { /* ... */ }
  });
}
\\\
