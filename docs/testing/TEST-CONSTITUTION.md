# Test Constitution

## Overview

This document defines the testing standards, organization, and fortress test inventory for ClientForge CRM.

## Testing Principles

### 1. Test Categories

- **Unit Tests**: Isolated component/function testing (`tests/unit/`)
- **Integration Tests**: Multi-component interaction testing (`tests/integration/`)
- **E2E Tests**: Full user workflow testing (`tests/e2e/`)

### 2. Fortress Test Standards

Fortress tests are high-quality, comprehensive test suites that:
- Use real implementations (no brittle mocks)
- Test via HTTP when possible (using supertest)
- Cover all critical paths and edge cases
- Execute quickly (<500ms per suite)
- Never skip tests without clear TODOs
- Maintain 0 TypeScript errors
- Maintain 0 ESLint errors (warnings allowed)

### 3. Test Organization

```
tests/
├── helpers/           # Test utilities and mini-apps (deprecated path)
├── support/           # Test utilities and mini-apps (new standard path)
├── unit/             # Unit tests by domain
│   ├── auth/
│   ├── security/
│   └── ...
├── integration/      # Integration tests
│   ├── auth/
│   ├── errors/
│   ├── validation/
│   └── ...
└── e2e/             # End-to-end tests
```

## Fortress Test Inventory

### HTTP Integration / Error Handling

| ID | Suite Name | Location | Tests | Status | Notes |
|----|------------|----------|-------|--------|-------|
| TM-16 | Error Handler HTTP Integration | `tests/integration/errors/error-handler.fortress.test.ts` | 22 | ✅ Complete | Global error handler with real HTTP calls |

### HTTP Integration / Request Validation

| ID | Suite Name | Location | Tests | Status | Notes |
|----|------------|----------|-------|--------|-------|
| TM-17 | Request Validation HTTP Integration | `tests/integration/validation/request-validation.fortress.test.ts` | 22 | ✅ Complete | Zod validation with middleware pipeline |

### Total Fortress Test Statistics

- **Total Fortress Suites**: 2
- **Total Fortress Tests**: 44
- **Total Coverage**: Error handling, request validation, auth errors, rate limits, 404s, 500s, nested/array validation
- **All Passing**: ✅
- **No Skipped**: ✅

## Test Helpers

| Helper | Location | Purpose |
|--------|----------|---------|
| Error Handler Test App | `tests/helpers/test-error-handler-app.ts` | Mini Express app for error handler testing |
| Validation Test App | `tests/support/test-validation-app.ts` | Mini Express app for request validation testing |

## Test Execution

### Run All Tests
```bash
npm run test:backend
```

### Run Specific Suite
```bash
npm run test:backend -- --testPathPattern=error-handler
```

### Run with Coverage
```bash
npm run test:backend -- --coverage
```

### Type Checking
```bash
npm run typecheck
```

### Linting
```bash
npm run lint
```

## Quality Gates

All changes must pass:
- ✅ `npm run typecheck` → 0 TypeScript errors
- ✅ `npm run lint` → 0 ESLint errors (warnings allowed)
- ✅ `npm run test:backend` → 0 failing tests
- ✅ No new skipped tests (unless with clear TODO)
- ✅ New tests execute in <500ms per suite

## Future Fortress Suite Targets

Potential areas for TM-18+:
- CORS & Security Headers middleware integration
- File upload validation and error handling
- WebSocket connection and error handling
- Streaming response errors
- Multi-tenant data isolation testing
- Rate limiter integration (deeper coverage)
