# Task: 001-UPDATED - Fix Babel Config + All Failing Tests

**Created**: 2025-11-05 (Updated with Babel fix)
**Priority**: HIGH (Critical path - blocks production)
**Estimated Time**: 3.5-4.5 hours (15 min Babel + 3-4 hours tests)
**Status**: PENDING

---

## 🚨 CRITICAL PREREQUISITE DISCOVERED

**Issue Found by Claude Code**:
- Original analysis: 79/160 tests passing (49%)
- **Actual current state**: 0 tests running
- **Error**: `SyntaxError: Unexpected token '?'` (optional chaining)
- **Root Cause**: Babel/Jest configuration can't parse modern TypeScript

**Impact**: MUST fix Babel configuration before executing test fixes!

---

## 📝 TASK DESCRIPTION

**Phase 0 (NEW)**: Fix Babel/Jest configuration (15 minutes)
**Phase 1-3**: Fix all failing tests to achieve 85%+ coverage (3-4 hours)

**Current State**: 0 tests running (Babel error)
**Phase 0 Target**: Tests can run, get baseline count
**Final Target**: 136+/160 tests passing (85%+)

---

## 🎯 OBJECTIVES

### Phase 0: Babel Configuration Fix (NEW - 15 minutes)
1. Diagnose Babel/Jest parsing error with optional chaining
2. Update babel.config.js or jest.config.js
3. Verify tests can run
4. Get baseline test count (expect 79/160 passing per original analysis)

### Phase 1-3: Test Fixes (3-4 hours) 
1. Fix AuthService tests (~30 tests) using established JWTService pattern
2. Fix PasswordService tests (~36 tests) using same pattern
3. Fix remaining service tests (Task, Contact, Deal, Account)
4. Achieve 85%+ overall test coverage
5. Verify all tests pass with zero TypeScript errors

---

## 📁 PHASE 0: BABEL CONFIGURATION FIX (15 MINUTES)

### Step 1: Diagnose Current Error

**Run tests to see error**:
```bash
cd d:/clientforge-crm
npm test

# Expected error:
# SyntaxError: Unexpected token '?'
# Indicates optional chaining (?.) not being transpiled
```

### Step 2: Check Current Babel/Jest Configuration

**Read current configs**:
```bash
# Check jest.config.js
cat tests/jest.config.js

# Check if babel.config.js exists
cat babel.config.js
# OR
cat .babelrc
```

### Step 3: Fix Babel Configuration

**Option A: Update jest.config.js** (Recommended)

**Current** `tests/jest.config.js` likely has:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // ...
};
```

**Update to**:
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Add transform configuration
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2020',  // Support optional chaining
        lib: ['ES2020'],
        module: 'commonjs',
        esModuleInterop: true,
        skipLibCheck: true,
        strict: true
      }
    }]
  },
  
  // Existing config...
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    'backend/**/*.ts',
    '!backend/**/*.d.ts',
    '!backend/**/*.test.ts',
    '!backend/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};
```

**Option B: Create babel.config.js in root** (If needed)

**Create**: `d:/clientforge-crm/babel.config.js`
```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      }
    }],
    '@babel/preset-typescript'
  ],
  plugins: [
    '@babel/plugin-proposal-optional-chaining',
    '@babel/plugin-proposal-nullish-coalescing-operator'
  ]
};
```

**Then install Babel dependencies** (if not already installed):
```bash
npm install --save-dev @babel/preset-env @babel/preset-typescript @babel/plugin-proposal-optional-chaining @babel/plugin-proposal-nullish-coalescing-operator
```

### Step 4: Verify Fix

```bash
# Run tests again
npm test

# Should now see:
# Test Suites: X passed, Y failed, Z total
# Tests: XX passed, YY failed, ZZ total
# (No more SyntaxError)
```

### Step 5: Get Baseline Count

**Record the numbers**:
```
Tests Passing: ___/___
Tests Failing: ___/___
Test Suites Passing: ___/___

Expected (from original analysis):
- Tests: ~79/160 passing (49%)
- Need to reach: 136+/160 (85%+)
```

---

## 📁 PHASE 1: FIX AUTHSERVICE TESTS (60 MINUTES)

**After Babel fix is verified, proceed with original task...**

### Modify: `tests/unit/auth/auth-service.test.ts`

**Current Issue**: 
- Test tries to inject dependencies via constructor
- Actual `AuthService` has no constructor parameters
- Service imports singleton instances directly

**Required Changes**:

1. **Add Module Mocks** (at top of file, before imports):
```typescript
// Mock all dependencies at module level
jest.mock('../../../backend/core/users/user-repository');
jest.mock('../../../backend/core/auth/jwt-service');
jest.mock('../../../backend/core/auth/password-service');
jest.mock('../../../backend/core/auth/session-service');
jest.mock('../../../backend/core/email/email-service');
jest.mock('../../../config/security/security-config');
```

2. **Import Mocked Modules**:
```typescript
import { userRepository } from '../../../backend/core/users/user-repository';
import { jwtService } from '../../../backend/core/auth/jwt-service';
import { passwordService } from '../../../backend/core/auth/password-service';
import { sessionService } from '../../../backend/core/auth/session-service';
import { emailService } from '../../../backend/core/email/email-service';
import { securityConfig } from '../../../config/security/security-config';
```

3. **Mock Security Config**:
```typescript
(securityConfig as any) = {
  jwt: {
    accessTokenSecret: 'test-secret',
    refreshTokenSecret: 'test-refresh-secret',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d'
  },
  bcrypt: {
    saltRounds: 10
  },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 100
  }
};
```

4. **Setup Mock Functions** (in beforeEach):
```typescript
beforeEach(() => {
  jest.clearAllMocks();

  // Mock userRepository methods
  (userRepository.findByEmailAndTenant as jest.Mock) = jest.fn();
  (userRepository.create as jest.Mock) = jest.fn();
  (userRepository.update as jest.Mock) = jest.fn();
  (userRepository.incrementFailedLoginAttempts as jest.Mock) = jest.fn();
  (userRepository.resetFailedLoginAttempts as jest.Mock) = jest.fn();

  // Mock passwordService methods
  (passwordService.hash as jest.Mock) = jest.fn();
  (passwordService.verify as jest.Mock) = jest.fn();

  // Mock jwtService methods
  (jwtService.generateTokenPair as jest.Mock) = jest.fn();
  (jwtService.verifyAccessToken as jest.Mock) = jest.fn();
  (jwtService.verifyRefreshToken as jest.Mock) = jest.fn();

  // Mock sessionService methods
  (sessionService.createSession as jest.Mock) = jest.fn();
  (sessionService.getSession as jest.Mock) = jest.fn();
  (sessionService.deleteSession as jest.Mock) = jest.fn();

  // Mock emailService methods
  (emailService.sendVerificationEmail as jest.Mock) = jest.fn();
  (emailService.sendPasswordResetEmail as jest.Mock) = jest.fn();
});
```

5. **Update Test Cases** to use mocked methods:
```typescript
describe('login', () => {
  it('should login user with valid credentials', async () => {
    const mockUser = {
      id: '123',
      email: 'test@example.com',
      password_hash: 'hashed_password',
      tenant_id: 'tenant-123',
      is_active: true,
      is_verified: true,
      is_locked: false
    };

    const mockTokens = {
      accessToken: 'access_token',
      refreshToken: 'refresh_token'
    };

    // Setup mocks
    (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(mockUser);
    (passwordService.verify as jest.Mock).mockResolvedValue(true);
    (jwtService.generateTokenPair as jest.Mock).mockReturnValue(mockTokens);
    (sessionService.createSession as jest.Mock).mockResolvedValue(undefined);
    (userRepository.resetFailedLoginAttempts as jest.Mock).mockResolvedValue(undefined);

    // Execute
    const result = await authService.login({
      email: 'test@example.com',
      password: 'Password123!',
      tenantId: 'tenant-123',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    });

    // Verify
    expect(result).toEqual({
      user: expect.objectContaining({ id: '123' }),
      tokens: mockTokens
    });
    expect(userRepository.findByEmailAndTenant).toHaveBeenCalledWith('test@example.com', 'tenant-123');
    expect(passwordService.verify).toHaveBeenCalledWith('Password123!', 'hashed_password');
  });

  it('should throw UnauthorizedError for invalid credentials', async () => {
    (userRepository.findByEmailAndTenant as jest.Mock).mockResolvedValue(null);

    await expect(authService.login({
      email: 'wrong@example.com',
      password: 'wrong',
      tenantId: 'tenant-123',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent'
    })).rejects.toThrow('Invalid credentials');
  });
});
```

**Apply this pattern to ALL test methods** in auth-service.test.ts

---

## 📁 PHASE 2: FIX PASSWORDSERVICE TESTS (60 MINUTES)

### Modify: `tests/unit/auth/password-service.test.ts`

**Similar approach as AuthService**:

1. **Mock bcrypt module**:
```typescript
jest.mock('bcrypt');
import * as bcrypt from 'bcrypt';
```

2. **Mock security config**:
```typescript
jest.mock('../../../config/security/security-config');
import { securityConfig } from '../../../config/security/security-config';

(securityConfig as any) = {
  bcrypt: { saltRounds: 10 },
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true
  }
};
```

3. **Setup mocks in beforeEach**:
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  (bcrypt.hash as jest.Mock) = jest.fn();
  (bcrypt.compare as jest.Mock) = jest.fn();
  (bcrypt.genSalt as jest.Mock) = jest.fn();
});
```

4. **Update test cases**:
```typescript
describe('hash', () => {
  it('should hash password with correct salt rounds', async () => {
    const password = 'Password123!';
    const hashedPassword = '$2b$10$hashedpassword';

    (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

    const result = await passwordService.hash(password);

    expect(result).toBe(hashedPassword);
    expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
  });
});

describe('verify', () => {
  it('should return true for matching password', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const result = await passwordService.verify('Password123!', '$2b$10$hash');

    expect(result).toBe(true);
    expect(bcrypt.compare).toHaveBeenCalledWith('Password123!', '$2b$10$hash');
  });
});

describe('validate', () => {
  it('should validate strong password', () => {
    const result = passwordService.validate('Password123!');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject password without uppercase', () => {
    const result = passwordService.validate('password123!');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must contain at least one uppercase letter');
  });
});
```

---

## 📁 PHASE 3: FIX REMAINING SERVICE TESTS (90 MINUTES)

### Services to Fix:
- `tests/unit/tasks/task-service.test.ts`
- `tests/unit/contacts/contact-service.test.ts`
- `tests/unit/deals/deal-service.test.ts`
- `tests/unit/accounts/account-service.test.ts`

**Common Issues**:
1. Error type mismatches (ValidationError vs AppError)
2. Missing mock implementations
3. Logic/assertion errors

**Fix Pattern**:

1. **Check error types** - Ensure tests expect the correct error class
2. **Ensure all repository methods are mocked**
3. **Verify mock return values match expected types**

---

## ✅ SUCCESS CRITERIA

### Phase 0: Babel Fix ✅
- [ ] No more `SyntaxError: Unexpected token '?'`
- [ ] Tests can run successfully
- [ ] Baseline test count obtained (expect ~79/160)
- [ ] Zero TypeScript compilation errors

### Phase 1-3: Test Fixes ✅
- [ ] All AuthService tests passing (30/30)
- [ ] All PasswordService tests passing (36/36)
- [ ] All TaskService tests passing (26/26)
- [ ] All ContactService tests passing (20/20)
- [ ] All DealService tests passing (20/20)
- [ ] All AccountService tests passing (15/15)
- [ ] Overall: 136+/160 tests passing (85%+)

### Quality Checks ✅
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No lint errors: `npm run lint`
- [ ] Test coverage report shows 85%+: `npm test -- --coverage`

---

## 🧪 TESTING INSTRUCTIONS

### Phase 0: Verify Babel Fix
```bash
# Step 1: Run tests (expect Babel error)
cd d:/clientforge-crm
npm test

# Step 2: Apply Babel fix (update jest.config.js or create babel.config.js)

# Step 3: Run tests again (should work now)
npm test

# Step 4: Record baseline
# Expected: Tests: ~79 passed, ~81 failed, 160 total
```

### Phase 1-3: Run Test Suites
```bash
# After Babel fix, test each service:

# AuthService (should see 30/30 passing after fixes)
npm test tests/unit/auth/auth-service.test.ts

# PasswordService (should see 36/36 passing after fixes)
npm test tests/unit/auth/password-service.test.ts

# TaskService (should see 26/26 passing after fixes)
npm test tests/unit/tasks/task-service.test.ts

# ContactService (should see 20/20 passing after fixes)
npm test tests/unit/contacts/contact-service.test.ts

# DealService (should see 20/20 passing after fixes)
npm test tests/unit/deals/deal-service.test.ts

# AccountService (should see 15/15 passing after fixes)
npm test tests/unit/accounts/account-service.test.ts

# Final: Run full suite with coverage
npm test -- --coverage
# Expected: 147/147 tests passing (91%+)
```

---

## 📊 VERIFICATION CHECKLIST

### Phase 0: Babel Configuration ✅
- [ ] jest.config.js updated with ts-jest transform config
- [ ] OR babel.config.js created with TypeScript presets
- [ ] Tests run without SyntaxError
- [ ] Baseline test count recorded
- [ ] Proceed to Phase 1

### Phase 1: AuthService ✅
- [ ] Module mocks added at top of file
- [ ] All dependencies imported (userRepository, jwtService, etc.)
- [ ] Security config mocked with all required fields
- [ ] All mock functions setup in beforeEach
- [ ] All test cases updated to use mocked methods
- [ ] Tests run: `npm test tests/unit/auth/auth-service.test.ts`
- [ ] Result: 30/30 passing

### Phase 2: PasswordService ✅
- [ ] bcrypt module mocked
- [ ] Security config mocked
- [ ] Mock functions setup in beforeEach
- [ ] All test cases updated
- [ ] Tests run: `npm test tests/unit/auth/password-service.test.ts`
- [ ] Result: 36/36 passing

### Phase 3: Other Services ✅
- [ ] TaskService tests fixed and passing (26/26)
- [ ] ContactService tests fixed and passing (20/20)
- [ ] DealService tests fixed and passing (20/20)
- [ ] AccountService tests fixed and passing (15/15)

### Final Verification ✅
- [ ] Full test suite: `npm test -- --coverage`
- [ ] Result: 147+/160 passing (91%+)
- [ ] Coverage report generated
- [ ] No TypeScript errors
- [ ] No lint errors

---

## 📝 NOTES FOR EXECUTOR (CLAUDE CODE)

### CRITICAL: Start with Phase 0!

**You CANNOT skip Phase 0**. The Babel configuration must be fixed before any test fixes will work.

### Phase 0 Time: 15 minutes
1. Run `npm test` to see Babel error (2 min)
2. Update jest.config.js with ts-jest transform (5 min)
3. Run `npm test` again to verify fix (2 min)
4. Record baseline test count (1 min)
5. Document fix in session log (5 min)

### Expected Baseline After Phase 0
- Tests can run (no Babel error)
- Approximately 79/160 passing (49%)
- Ready to proceed to Phase 1-3

### Time Estimate (UPDATED)
- **Phase 0**: 15 minutes (Babel fix)
- **Phase 1**: 60 minutes (AuthService)
- **Phase 2**: 60 minutes (PasswordService)
- **Phase 3**: 90 minutes (Other services)
- **Verification**: 30 minutes
- **Total**: 3.5-4.5 hours

### Reference Pattern
**JWTService test file** (`tests/unit/auth/jwt-service.test.ts`) is still the GOLD STANDARD for mocking pattern - but only AFTER Babel is fixed!

---

## 🎯 DELIVERABLES

After completion, provide:

1. **Babel Fix Summary**:
```
✅ Phase 0 Complete
Fix Applied: [jest.config.js update / babel.config.js created]
Babel Error: RESOLVED
Tests Running: YES
Baseline: [X/160 passing]
```

2. **Test Results Summary**:
```
AuthService:       30/30 passing ✅
PasswordService:   36/36 passing ✅
TaskService:       26/26 passing ✅
ContactService:    20/20 passing ✅
DealService:       20/20 passing ✅
AccountService:    15/15 passing ✅
-----------------------------------
TOTAL:           147/147 passing ✅ (91% - EXCEEDS TARGET!)
```

3. **Coverage Report**: Output from `npm test -- --coverage`
4. **Files Modified**: List all files changed
5. **Issues Encountered**: Any challenges and solutions

---

## 📈 SUCCESS METRICS (UPDATED)

| Metric | Before | After Phase 0 | After Phase 1-3 | Target |
|--------|--------|---------------|-----------------|--------|
| Babel Status | BROKEN | ✅ FIXED | ✅ FIXED | ✅ |
| Tests Running | NO | YES | YES | YES |
| Tests Passing | 0/0 (error) | ~79/160 (49%) | 147/160 (91%+) | 136/160 (85%+) |

---

**Created by**: Command Center (Claude Desktop)
**Updated by**: Command Center (based on Claude Code analysis)
**Assigned to**: Claude Code (Executor)
**Handoff Status**: ⏳ READY FOR EXECUTION (WITH PHASE 0 PREREQUISITE)
**Priority**: HIGH - Blocks production deployment

**CRITICAL**: Execute Phase 0 FIRST, then proceed with Phase 1-3
