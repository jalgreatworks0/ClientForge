# Task: 001 - Fix All Failing Tests Systematically

**Created**: 2025-11-05
**Priority**: HIGH (Critical path - blocks production)
**Estimated Time**: 3-4 hours
**Status**: PENDING

---

## 📝 TASK DESCRIPTION

Fix all failing unit tests in the ClientForge CRM test suite to achieve 85%+ test coverage (target: 136/160 tests passing). Currently at 49% passing rate (79/160), need to reach 85%+ for production readiness.

**Current State**: 
- Tests Passing: 79/160 (49%)
- Tests Failing: 81/160 (51%)
- Target: 136+/160 (85%+)

**Root Cause**: Services use singleton pattern with direct imports, not constructor injection. Tests need module-level mocking instead of constructor injection.

---

## 🎯 OBJECTIVES

1. Fix AuthService tests (~30 tests) using established JWTService pattern
2. Fix PasswordService tests (~36 tests) using same pattern
3. Fix remaining service tests (Task, Contact, Deal, Account)
4. Achieve 85%+ overall test coverage
5. Verify all tests pass with zero TypeScript errors

---

## 📁 FILES TO MODIFY

### Phase 1: AuthService Tests (Priority 1)

#### Modify: `tests/unit/auth/auth-service.test.ts`

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

### Phase 2: PasswordService Tests (Priority 2)

#### Modify: `tests/unit/auth/password-service.test.ts`

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

### Phase 3: Service Tests (Priority 3)

#### Modify: `tests/unit/tasks/task-service.test.ts`
#### Modify: `tests/unit/contacts/contact-service.test.ts`
#### Modify: `tests/unit/deals/deal-service.test.ts`
#### Modify: `tests/unit/accounts/account-service.test.ts`

**Common Issues**:
1. Error type mismatches (ValidationError vs AppError)
2. Missing mock implementations
3. Logic/assertion errors

**Fix Pattern**:

1. **Check error types** - Ensure tests expect the correct error class:
```typescript
// If service throws AppError, test should expect AppError
await expect(service.method()).rejects.toThrow(AppError);

// If service throws ValidationError, test should expect ValidationError
await expect(service.method()).rejects.toThrow(ValidationError);
```

2. **Ensure all repository methods are mocked**:
```typescript
beforeEach(() => {
  jest.clearAllMocks();
  
  // Mock EVERY method the service calls
  (repository.findById as jest.Mock) = jest.fn();
  (repository.create as jest.Mock) = jest.fn();
  (repository.update as jest.Mock) = jest.fn();
  (repository.delete as jest.Mock) = jest.fn();
  (repository.findAll as jest.Mock) = jest.fn();
  // ... etc for ALL methods
});
```

3. **Verify mock return values match expected types**:
```typescript
// Service expects User type, mock must return User type
const mockUser: User = {
  id: '123',
  email: 'test@example.com',
  tenant_id: 'tenant-123',
  // ... all required User fields
};

(userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
```

---

## ✅ SUCCESS CRITERIA

### Test Results
- [ ] All AuthService tests passing (30/30)
- [ ] All PasswordService tests passing (36/36)
- [ ] All TaskService tests passing (26/26)
- [ ] All ContactService tests passing (20/20)
- [ ] All DealService tests passing (20/20)
- [ ] All AccountService tests passing (15/15)
- [ ] Overall: 136+/160 tests passing (85%+)

### Quality Checks
- [ ] No TypeScript errors: `npm run type-check`
- [ ] No lint errors: `npm run lint`
- [ ] Test coverage report shows 85%+: `npm test -- --coverage`

---

## 🧪 TESTING INSTRUCTIONS

### Step 1: Run Specific Test Suites
```bash
# Test AuthService (should see 30/30 passing)
npm test tests/unit/auth/auth-service.test.ts

# Test PasswordService (should see 36/36 passing)
npm test tests/unit/auth/password-service.test.ts

# Test TaskService (should see 26/26 passing)
npm test tests/unit/tasks/task-service.test.ts

# Test ContactService (should see 20/20 passing)
npm test tests/unit/contacts/contact-service.test.ts

# Test DealService (should see 20/20 passing)
npm test tests/unit/deals/deal-service.test.ts

# Test AccountService (should see 15/15 passing)
npm test tests/unit/accounts/account-service.test.ts
```

### Step 2: Run Full Test Suite
```bash
# Run all tests with coverage
npm test -- --coverage

# Expected output:
# Tests: 136 passed, 136 total
# Test Suites: 6 passed, 6 total
# Coverage: 85%+ overall
```

### Step 3: Verify Quality
```bash
# Check TypeScript
npm run type-check
# Expected: No errors

# Check Linting
npm run lint
# Expected: No errors
```

---

## 📊 VERIFICATION CHECKLIST

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
- [ ] Result: 136+/160 passing (85%+)
- [ ] Coverage report generated
- [ ] No TypeScript errors
- [ ] No lint errors

---

## 📝 NOTES FOR EXECUTOR (CLAUDE CODE)

### Critical Pattern to Follow

**The JWTService test file is the GOLD STANDARD** - it shows the correct mocking pattern:
- Module-level mocks (before imports)
- Import the mocked modules
- Setup mock functions in beforeEach
- Use mocked methods in test cases

**DO NOT**:
- Try to inject dependencies via constructor
- Create mock classes manually
- Use any pattern OTHER than the JWTService pattern

**DO**:
- Copy the JWTService mocking pattern exactly
- Mock at module level
- Clear mocks in beforeEach
- Verify mock calls in assertions

### Expected Challenges

1. **AuthService**: ~30 test cases to update (largest file)
   - Solution: Work methodically through each describe block
   - Time: ~60 minutes

2. **PasswordService**: ~36 test cases with bcrypt mocking
   - Solution: Mock bcrypt at module level
   - Time: ~60 minutes

3. **Other Services**: Error type mismatches, missing mocks
   - Solution: Check actual service implementation for error types
   - Time: ~60-90 minutes

### Time Estimate Breakdown
- AuthService: 60 minutes
- PasswordService: 60 minutes
- Other Services: 90 minutes
- Verification & Cleanup: 30 minutes
- **Total: 3-4 hours**

### When You Encounter Issues

1. **Test still failing after applying pattern?**
   - Check if service method signature changed
   - Verify mock return types match expected types
   - Ensure all service dependencies are mocked

2. **Error type mismatch?**
   - Read actual service implementation
   - Update test to expect correct error class

3. **Mock not being called?**
   - Verify mock is imported correctly
   - Check jest.clearAllMocks() is in beforeEach
   - Ensure mock function is setup before test runs

---

## 🎯 DELIVERABLES

After completion, provide:

1. **Test Results Summary**:
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

2. **Coverage Report**: Screenshot or text output from `npm test -- --coverage`

3. **Files Modified**: List all test files that were changed

4. **Issues Encountered**: Any unexpected challenges and how they were resolved

5. **Verification**: Confirm zero TypeScript errors, zero lint errors

---

## 📈 SUCCESS METRICS

| Metric | Before | Target | Expected After |
|--------|--------|--------|----------------|
| Tests Passing | 79/160 (49%) | 136/160 (85%) | 147/160 (91%+) |
| AuthService | ~5/30 (17%) | 30/30 (100%) | 30/30 (100%) |
| PasswordService | ~8/36 (22%) | 36/36 (100%) | 36/36 (100%) |
| TaskService | 17/26 (65%) | 26/26 (100%) | 26/26 (100%) |
| ContactService | ~12/20 (60%) | 20/20 (100%) | 20/20 (100%) |
| DealService | ~8/20 (40%) | 20/20 (100%) | 20/20 (100%) |
| AccountService | ~10/15 (67%) | 15/15 (100%) | 15/15 (100%) |

---

**Created by**: Command Center (Claude Desktop)
**Assigned to**: Claude Code (Executor)
**Handoff Status**: ⏳ READY FOR EXECUTION
**Priority**: HIGH - Blocks production deployment

**Pattern Reference**: See `tests/unit/auth/jwt-service.test.ts` for correct mocking approach
