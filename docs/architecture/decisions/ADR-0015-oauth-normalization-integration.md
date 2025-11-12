# ADR-0015: OAuth Normalization Integration & No-Raw-Payload Policy

**Status**: Accepted  
**Date**: 2025-11-12  
**Deciders**: Engineering Team, OverLord  
**Technical Story**: OAuth Integration - Commit `2a6b050`  
**Supersedes**: N/A  
**Related**: ADR-0014 (Dunning & OAuth Type Hardening)

---

## Context

In ADR-0014, we created type-safe OAuth adapters (`GoogleAdapter`, `MicrosoftAdapter`) and a unified normalization function (`normalizeOAuthProfile()`). However, the existing OAuth provider implementations (`google-oauth.provider.ts`, `microsoft-oauth.provider.ts`) were still using raw, untyped API responses with `any` types.

### The Problem

**Before Integration**:
```typescript
// google-oauth.provider.ts
async handleCallback(code: string): Promise<User> {
  const tokens = await this.oauth2Client.getToken(code);
  const rawProfile: any = await this.oauth2Client.getUserInfo();  // ❌ Untyped
  
  // Manual field extraction (error-prone)
  const email = rawProfile.email;           // Could be undefined
  const sub = rawProfile.sub;               // Could be undefined
  const name = rawProfile.name || 
    `${rawProfile.given_name} ${rawProfile.family_name}`;  // Could crash
  
  // No validation, no type safety
  return this.findOrCreateUser({ email, sub, name });
}
```

**Issues**:
1. **No Type Safety**: Raw API responses typed as `any`
2. **No Validation**: No runtime checks for required fields
3. **Code Duplication**: Manual field extraction in multiple methods
4. **Error-Prone**: Different field name handling scattered across code
5. **Hard to Extend**: Adding new providers requires duplicating logic

---

## Decision

We will **integrate OAuth adapters into provider implementations** and establish a **no-raw-payload policy**: all OAuth API responses must pass through `normalizeOAuthProfile()` before use.

### Solution Components

1. **Integrate Adapters**: Update provider implementations to use `normalizeOAuthProfile()`
2. **Enhance Express Request**: Add `provider` and `providerId` to `req.user`
3. **Comprehensive Tests**: Unit and integration tests for adapters
4. **No-Raw-Payload Policy**: Ban direct use of raw OAuth responses

---

## Implementation Details

### 1. Google OAuth Provider Integration ✅

**File**: `backend/services/auth/sso/google-oauth.provider.ts`

#### A) handleCallback() Method (Lines 107-124)

**Before**:
```typescript
async handleCallback(code: string): Promise<User> {
  const { tokens } = await this.oauth2Client.getToken(code);
  const profile: any = await this.getUserInfo(tokens.access_token);  // ❌ any type
  
  const email = profile.email;
  const sub = profile.sub;
  const name = profile.name || `${profile.given_name} ${profile.family_name}`;
  
  // ... create user logic
}
```

**After**:
```typescript
import { normalizeOAuthProfile } from '@auth/providers/normalize';

async handleCallback(code: string): Promise<User> {
  const { tokens } = await this.oauth2Client.getToken(code);
  const rawProfile = await this.getUserInfo(tokens.access_token);
  
  // ✅ Type-safe normalization
  const profile = normalizeOAuthProfile('google', rawProfile);
  
  // ✅ TypeScript knows these fields exist
  const email = profile.email;         // string
  const sub = profile.sub;             // string
  const emailVerified = profile.emailVerified;  // boolean
  const name = profile.name;           // string | undefined
  
  return this.findOrCreateUser({
    email,
    googleId: sub,
    emailVerified,
    name,
    picture: profile.picture,
    provider: 'google',
    providerId: sub
  });
}
```

**Benefits**:
- ✅ Full type safety (no `any`)
- ✅ Runtime validation (throws if email/sub missing)
- ✅ Handles multiple OAuth response formats
- ✅ Single source of truth for field extraction

---

#### B) getUserProfile() Method (Lines 223-240)

**Before**:
```typescript
async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const rawProfile: any = await this.getUserInfo(accessToken);  // ❌ any type
  
  return {
    id: rawProfile.sub,
    email: rawProfile.email,
    emailVerified: rawProfile.email_verified,
    name: rawProfile.name,
    picture: rawProfile.picture
  };
}
```

**After**:
```typescript
async getUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const rawProfile = await this.getUserInfo(accessToken);
  
  // ✅ Use adapter for normalization
  const normalized = normalizeOAuthProfile('google', rawProfile);
  
  // ✅ Map to legacy GoogleUserProfile interface
  return {
    id: normalized.sub,
    email: normalized.email,
    emailVerified: normalized.emailVerified,
    name: normalized.name,
    picture: normalized.picture
  };
}
```

**Note**: Maintains backward compatibility with existing `GoogleUserProfile` interface while using adapter internally.

---

### 2. Microsoft OAuth Provider Integration ✅

**File**: `backend/services/auth/sso/microsoft-oauth.provider.ts`

#### getUserProfile() Method (Lines 208-226)

**Before**:
```typescript
async getUserProfile(accessToken: string): Promise<MicrosoftUserProfile> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const rawProfile: any = await response.json();  // ❌ any type
  
  return {
    id: rawProfile.id,
    email: rawProfile.mail || rawProfile.userPrincipalName,
    name: rawProfile.displayName,
    picture: rawProfile.photo
  };
}
```

**After**:
```typescript
async getUserProfile(accessToken: string): Promise<MicrosoftUserProfile> {
  const response = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const rawProfile = await response.json();
  
  // ✅ Use adapter for normalization
  const normalized = normalizeOAuthProfile('microsoft', rawProfile);
  
  // ✅ Map to legacy MicrosoftUserProfile interface
  return {
    id: normalized.oid,
    email: normalized.email,
    name: normalized.name,
    picture: normalized.picture
  };
}
```

**Handles Microsoft Graph API Variations**:
- `mail` vs `userPrincipalName` vs `email`
- `displayName` vs `name`
- `photo` vs `picture`
- `oid` as user ID (object ID)

---

### 3. Express Request Type Enhancement ✅

**File**: `backend/types/auth.d.ts`

**Before**:
```typescript
declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      userId: string;
      tenantId: string;
      email: string;
      role: string;
    };
  }
}
```

**After**:
```typescript
declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      userId: string;
      tenantId: string;
      email: string;
      role: string;
      
      // OAuth provider context
      provider?: 'google' | 'microsoft' | 'local';  // Authentication provider
      providerId?: string;                          // Provider-specific user ID
    };
  }
}
```

**Usage**:
```typescript
// In authenticated routes
router.get('/profile', authenticate, (req: AuthRequest, res) => {
  if (req.user.provider === 'google') {
    console.log('Google user:', req.user.providerId);  // Google sub
  } else if (req.user.provider === 'microsoft') {
    console.log('Microsoft user:', req.user.providerId);  // Microsoft oid
  } else {
    console.log('Local user (email/password)');
  }
});
```

**Benefits**:
- ✅ Know authentication method
- ✅ Access provider-specific ID for API calls
- ✅ Enable provider-specific features (Google Calendar, Microsoft Teams)
- ✅ Audit trail for security

---

### 4. Comprehensive Unit Tests ✅

#### A) Adapter Tests

**File**: `backend/auth/providers/tests/adapters.spec.ts` (323 lines)

**Google Adapter Tests** (15 test cases):
```typescript
describe('adaptGoogle', () => {
  describe('happy paths', () => {
    it('should adapt OAuth2 token response format', () => {
      const raw = {
        email: 'user@gmail.com',
        sub: '12345',
        email_verified: true,
        given_name: 'John',
        family_name: 'Doe',
        picture: 'https://example.com/photo.jpg'
      };
      
      const profile = adaptGoogle(raw);
      
      expect(profile.kind).toBe('google');
      expect(profile.email).toBe('user@gmail.com');
      expect(profile.sub).toBe('12345');
      expect(profile.emailVerified).toBe(true);
      expect(profile.name).toBe('John Doe');
      expect(profile.picture).toBe('https://example.com/photo.jpg');
    });
    
    it('should adapt userinfo API response format', () => {
      const raw = {
        email: 'user@gmail.com',
        sub: '12345',
        emailVerified: true,  // Note: camelCase
        name: 'John Doe',      // Note: combined name
        picture: 'https://example.com/photo.jpg'
      };
      
      const profile = adaptGoogle(raw);
      
      expect(profile.emailVerified).toBe(true);
      expect(profile.name).toBe('John Doe');
    });
  });
  
  describe('alternative field names', () => {
    it('should handle missing emailVerified (default false)', () => {
      const raw = { email: 'user@gmail.com', sub: '12345' };
      const profile = adaptGoogle(raw);
      expect(profile.emailVerified).toBe(false);
    });
    
    it('should combine given_name and family_name if name missing', () => {
      const raw = {
        email: 'user@gmail.com',
        sub: '12345',
        given_name: 'Jane',
        family_name: 'Smith'
      };
      const profile = adaptGoogle(raw);
      expect(profile.name).toBe('Jane Smith');
    });
  });
  
  describe('error cases', () => {
    it('should throw if email missing', () => {
      const raw = { sub: '12345' };
      expect(() => adaptGoogle(raw))
        .toThrow('Invalid Google profile: missing email');
    });
    
    it('should throw if sub missing', () => {
      const raw = { email: 'user@gmail.com' };
      expect(() => adaptGoogle(raw))
        .toThrow('Invalid Google profile: missing sub');
    });
    
    it('should throw if raw is not an object', () => {
      expect(() => adaptGoogle(null))
        .toThrow('Invalid Google profile: not an object');
      expect(() => adaptGoogle('string'))
        .toThrow('Invalid Google profile: not an object');
    });
  });
});
```

**Microsoft Adapter Tests** (15 test cases):
```typescript
describe('adaptMicrosoft', () => {
  describe('happy paths', () => {
    it('should adapt Microsoft Graph API response', () => {
      const raw = {
        mail: 'user@company.com',
        oid: 'abc-123-def',
        displayName: 'John Doe',
        photo: 'https://example.com/photo.jpg'
      };
      
      const profile = adaptMicrosoft(raw);
      
      expect(profile.kind).toBe('microsoft');
      expect(profile.email).toBe('user@company.com');
      expect(profile.oid).toBe('abc-123-def');
      expect(profile.name).toBe('John Doe');
      expect(profile.picture).toBe('https://example.com/photo.jpg');
    });
  });
  
  describe('alternative field names', () => {
    it('should use userPrincipalName if mail is missing', () => {
      const raw = {
        userPrincipalName: 'user@company.com',
        oid: 'abc-123-def'
      };
      const profile = adaptMicrosoft(raw);
      expect(profile.email).toBe('user@company.com');
    });
    
    it('should fall back to email field if both mail and UPN missing', () => {
      const raw = {
        email: 'user@company.com',
        oid: 'abc-123-def'
      };
      const profile = adaptMicrosoft(raw);
      expect(profile.email).toBe('user@company.com');
    });
    
    it('should use name field if displayName missing', () => {
      const raw = {
        mail: 'user@company.com',
        oid: 'abc-123-def',
        name: 'Jane Smith'
      };
      const profile = adaptMicrosoft(raw);
      expect(profile.name).toBe('Jane Smith');
    });
    
    it('should use picture field if photo missing', () => {
      const raw = {
        mail: 'user@company.com',
        oid: 'abc-123-def',
        picture: 'https://example.com/avatar.jpg'
      };
      const profile = adaptMicrosoft(raw);
      expect(profile.picture).toBe('https://example.com/avatar.jpg');
    });
  });
  
  describe('error cases', () => {
    it('should throw if email missing', () => {
      const raw = { oid: 'abc-123-def' };
      expect(() => adaptMicrosoft(raw))
        .toThrow('Invalid Microsoft profile: missing email');
    });
    
    it('should throw if oid missing', () => {
      const raw = { mail: 'user@company.com' };
      expect(() => adaptMicrosoft(raw))
        .toThrow('Invalid Microsoft profile: missing oid');
    });
  });
});
```

**Type Guard Tests**:
```typescript
describe('type guards', () => {
  it('isGoogle should return true for Google profiles', () => {
    const profile: OAuthProfile = {
      kind: 'google',
      email: 'user@gmail.com',
      sub: '12345',
      emailVerified: true
    };
    expect(isGoogle(profile)).toBe(true);
    expect(isMicrosoft(profile)).toBe(false);
  });
  
  it('isMicrosoft should return true for Microsoft profiles', () => {
    const profile: OAuthProfile = {
      kind: 'microsoft',
      email: 'user@company.com',
      oid: 'abc-123-def'
    };
    expect(isMicrosoft(profile)).toBe(true);
    expect(isGoogle(profile)).toBe(false);
  });
});
```

**Total**: 30+ test cases

---

#### B) Provider Integration Tests

**File**: `backend/auth/providers/tests/provider-integration.spec.ts` (322 lines)

**Normalization Tests**:
```typescript
describe('normalizeOAuthProfile', () => {
  describe('Google integration', () => {
    it('should normalize Google OAuth2 response', () => {
      const rawGoogle = {
        email: 'user@gmail.com',
        sub: '12345',
        email_verified: true,
        given_name: 'John',
        family_name: 'Doe'
      };
      
      const profile = normalizeOAuthProfile('google', rawGoogle);
      
      expect(profile.kind).toBe('google');
      expect(profile.email).toBe('user@gmail.com');
      if (isGoogle(profile)) {
        expect(profile.sub).toBe('12345');
        expect(profile.emailVerified).toBe(true);
      }
    });
  });
  
  describe('Microsoft integration', () => {
    it('should normalize Microsoft Graph response', () => {
      const rawMicrosoft = {
        mail: 'user@company.com',
        oid: 'abc-123-def',
        displayName: 'Jane Smith'
      };
      
      const profile = normalizeOAuthProfile('microsoft', rawMicrosoft);
      
      expect(profile.kind).toBe('microsoft');
      expect(profile.email).toBe('user@company.com');
      if (isMicrosoft(profile)) {
        expect(profile.oid).toBe('abc-123-def');
        expect(profile.name).toBe('Jane Smith');
      }
    });
  });
});
```

**Discriminated Union Type Narrowing**:
```typescript
describe('discriminated union type narrowing', () => {
  it('should enable type-safe field access after narrowing', () => {
    const profiles: OAuthProfile[] = [
      { kind: 'google', email: 'g@gmail.com', sub: '1', emailVerified: true },
      { kind: 'microsoft', email: 'm@company.com', oid: 'abc' }
    ];
    
    profiles.forEach(profile => {
      if (isGoogle(profile)) {
        // TypeScript knows profile is GoogleAdapter here
        expect(typeof profile.sub).toBe('string');
        expect(typeof profile.emailVerified).toBe('boolean');
        // profile.oid would be a compile error ✅
      } else if (isMicrosoft(profile)) {
        // TypeScript knows profile is MicrosoftAdapter here
        expect(typeof profile.oid).toBe('string');
        // profile.sub would be a compile error ✅
        // profile.emailVerified would be a compile error ✅
      }
    });
  });
});
```

**Error Handling**:
```typescript
describe('error handling', () => {
  it('should throw for unsupported provider', () => {
    expect(() => normalizeOAuthProfile('github' as any, {}))
      .toThrow('Unsupported OAuth provider: github');
  });
  
  it('should propagate adapter validation errors', () => {
    const invalidGoogle = { sub: '12345' };  // Missing email
    expect(() => normalizeOAuthProfile('google', invalidGoogle))
      .toThrow('Invalid Google profile: missing email');
  });
});
```

**Total**: 20+ test cases

---

## No-Raw-Payload Policy

### Established Rules

**ALWAYS** ✅:
- Use `normalizeOAuthProfile()` immediately after receiving OAuth API response
- Work with `OAuthProfile` discriminated union (type-safe)
- Validate external responses at boundaries

**NEVER** ❌:
- Use raw OAuth API responses directly
- Type OAuth responses as `any`
- Access provider-specific fields without type narrowing

### Code Review Checklist

**Red Flags** 🚩:
```typescript
// ❌ RED FLAG: Raw OAuth response
const profile: any = await oauth2Client.getUserInfo();

// ❌ RED FLAG: Unvalidated field access
const email = rawProfile.email;  // Could be undefined

// ❌ RED FLAG: Provider-specific code without adapter
if (provider === 'google') {
  userId = profile.sub;
} else if (provider === 'microsoft') {
  userId = profile.oid;
}
```

**Approved Pattern** ✅:
```typescript
// ✅ CORRECT: Normalize immediately
const rawProfile = await oauth2Client.getUserInfo();
const profile = normalizeOAuthProfile('google', rawProfile);

// ✅ CORRECT: Type-safe field access
const email = profile.email;  // TypeScript knows it's a string

// ✅ CORRECT: Type narrowing for provider-specific fields
if (isGoogle(profile)) {
  userId = profile.sub;
} else if (isMicrosoft(profile)) {
  userId = profile.oid;
}
```

---

## OAuth Provider Flow Diagram

### Before Integration (Unsafe)

```
┌──────────────┐
│ OAuth API    │
│ (Google/MS)  │
└──────┬───────┘
       │
       ▼ Returns unknown shape
┌──────────────┐
│ Raw Response │ ❌ any type
│ { email, ... }│
└──────┬───────┘
       │
       ▼ Manual extraction
┌──────────────┐
│ Provider Code│ ❌ Unvalidated
│              │
└──────┬───────┘
       │
       ▼ No normalization
┌──────────────┐
│ User Model   │
└──────────────┘
```

---

### After Integration (Type-Safe)

```
┌──────────────┐
│ OAuth API    │
│ (Google/MS)  │
└──────┬───────┘
       │
       ▼ Returns unknown
┌─────────────────────┐
│ normalizeOAuthProfile│ ✅ Validates & normalizes
│ (Adapter Pattern)    │
└──────┬──────────────┘
       │
       ▼ Returns OAuthProfile union
┌──────────────────────┐
│ GoogleAdapter        │ ✅ Type-safe
│ - kind: 'google'     │
│ - email: string      │
│ - sub: string        │
│ - emailVerified: bool│
└──────┬───────────────┘
       │ OR
       ▼
┌──────────────────────┐
│ MicrosoftAdapter     │ ✅ Type-safe
│ - kind: 'microsoft'  │
│ - email: string      │
│ - oid: string        │
└──────┬───────────────┘
       │
       ▼ Discriminated union
┌──────────────────────┐
│ Provider Code        │ ✅ Type narrowing
│ (with type guards)   │
└──────┬───────────────┘
       │
       ▼ Persist normalized data
┌──────────────────────┐
│ User Model           │
│ - provider: 'google' │
│ - providerId: sub/oid│
└──────────────────────┘
```

---

## Provider Field Mapping

### Google OAuth Response

| Raw Field (OAuth2) | Raw Field (Userinfo) | Normalized Field | Type | Required |
|--------------------|---------------------|------------------|------|----------|
| `sub` | `sub` | `sub` | string | ✅ Yes |
| `email` | `email` | `email` | string | ✅ Yes |
| `email_verified` | `emailVerified` | `emailVerified` | boolean | No (default false) |
| `given_name + family_name` | `name` | `name` | string? | No |
| `picture` | `picture` | `picture` | string? | No |

**User ID**: Use `sub` (Subject) - Google's stable user identifier

---

### Microsoft OAuth Response

| Raw Field (Graph API) | Alternative Field | Normalized Field | Type | Required |
|-----------------------|-------------------|------------------|------|----------|
| `oid` | - | `oid` | string | ✅ Yes |
| `mail` | `userPrincipalName`, `email` | `email` | string | ✅ Yes |
| `displayName` | `name` | `name` | string? | No |
| `photo` | `picture` | `picture` | string? | No |

**User ID**: Use `oid` (Object ID) - Microsoft's stable user identifier

---

## Consequences

### Positive

- **✅ Type Safety**: All OAuth responses validated at runtime
- **✅ Single Source of Truth**: Adapters centralize field extraction logic
- **✅ Extensible**: Easy to add new providers (just add adapter)
- **✅ Test Coverage**: 50+ unit and integration tests
- **✅ No Raw Payloads**: Policy prevents unsafe OAuth handling
- **✅ Provider Context**: `req.user.provider` and `req.user.providerId` available
- **✅ Backward Compatible**: Legacy interfaces still work

### Neutral

- **Legacy Interfaces**: `GoogleUserProfile` and `MicrosoftUserProfile` still exist (for now)
- **Two-Layer System**: Adapters map to normalized type, then to legacy interface

### Negative (Mitigated)

- **More Code**: Adapters add 300+ lines
  - **Mitigation**: Clear separation of concerns
  - **Mitigation**: Comprehensive test coverage
- **Indirection**: Extra function call for normalization
  - **Mitigation**: Negligible performance cost (<1ms)
  - **Mitigation**: Type safety benefits outweigh minimal overhead
- **Learning Curve**: Developers need to learn discriminated unions
  - **Mitigation**: Clear documentation and examples
  - **Mitigation**: Type guards make usage intuitive

---

## Verification

### Check Integration

```bash
# All OAuth provider tests should pass
npm test -- auth/providers

# Expected: 50+ tests passing
```

### Verify Type Safety

```typescript
// This should compile without errors:
import { normalizeOAuthProfile, isGoogle } from '@auth/providers';

const rawGoogle = await oauth2Client.getUserInfo();
const profile = normalizeOAuthProfile('google', rawGoogle);

if (isGoogle(profile)) {
  console.log(profile.sub);           // ✅ string
  console.log(profile.emailVerified); // ✅ boolean
  // console.log(profile.oid);        // ❌ Compile error - doesn't exist
}
```

### Check Express Request

```typescript
// In authenticated routes:
router.get('/profile', authenticate, (req: AuthRequest, res) => {
  const provider = req.user?.provider;    // ✅ 'google' | 'microsoft' | 'local' | undefined
  const providerId = req.user?.providerId; // ✅ string | undefined
  
  res.json({ provider, providerId });
});
```

---

## Future Enhancements

### 1. Deprecate Legacy Interfaces

**Phase out `GoogleUserProfile` and `MicrosoftUserProfile`**:

```typescript
// OLD (to deprecate)
interface GoogleUserProfile {
  id: string;
  email: string;
  // ...
}

// NEW (use everywhere)
import { OAuthProfile, GoogleAdapter } from '@types/auth/oauth';
```

**Time**: 1 hour to migrate all references  
**Benefit**: Single type system for OAuth

---

### 2. Add More OAuth Providers

**GitHub Adapter**:
```typescript
export interface GitHubAdapter {
  kind: 'github';
  email: string;
  name?: string;
  avatarUrl?: string;
  id: number;
}

export function adaptGitHub(raw: unknown): GitHubAdapter {
  // Validation + normalization
}

// Update union
export type OAuthProfile = 
  | GoogleAdapter 
  | MicrosoftAdapter 
  | GitHubAdapter;
```

**Time**: 30 minutes per provider  
**Benefit**: Support more SSO options

---

### 3. OAuth Profile Caching

**Cache normalized profiles to reduce API calls**:

```typescript
const cacheKey = `oauth:${provider}:${accessToken}`;
let profile = await cache.get(cacheKey);

if (!profile) {
  const rawProfile = await fetchFromProvider(accessToken);
  profile = normalizeOAuthProfile(provider, rawProfile);
  await cache.set(cacheKey, profile, 3600);  // 1 hour TTL
}
```

**Time**: 30 minutes  
**Benefit**: Faster authentication, reduced API quota usage

---

### 4. Provider-Specific Features

**Enable provider-specific integrations**:

```typescript
if (req.user.provider === 'google') {
  // Access Google Calendar API
  const events = await googleCalendar.listEvents({
    userId: req.user.providerId  // Use Google sub
  });
}

if (req.user.provider === 'microsoft') {
  // Access Microsoft Teams API
  const teams = await microsoftGraph.listTeams({
    userId: req.user.providerId  // Use Microsoft oid
  });
}
```

**Time**: Variable (depends on integration)  
**Benefit**: Leverage OAuth scopes for rich features

---

## Alternatives Considered

### 1. No Integration (Rejected)

**Approach**: Leave adapters unused

**Pros**:
- No code changes
- Existing code works

**Cons**:
- **Wasted effort**: Adapters created but not used
- **No benefits**: Type safety not realized
- **Rejected**: Integration is the whole point

---

### 2. Hard Cutover (Rejected)

**Approach**: Remove legacy interfaces immediately

**Pros**:
- Clean codebase
- No duplication

**Cons**:
- **Breaking changes**: Existing code breaks
- **Risky**: Hard to rollback
- **Rejected**: Incremental approach safer

---

### 3. Runtime Type Casting (Rejected)

**Approach**: Cast raw responses to `OAuthProfile`

```typescript
const profile = rawProfile as GoogleAdapter;  // ❌ No validation
```

**Pros**:
- Simpler code

**Cons**:
- **No validation**: Could crash at runtime
- **False type safety**: TypeScript happy, runtime fails
- **Rejected**: Validation is crucial

---

## References

- **TypeScript Discriminated Unions**: [typescriptlang.org/docs/handbook/unions-and-intersections.html](https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html)
- **Adapter Pattern**: [refactoring.guru/design-patterns/adapter](https://refactoring.guru/design-patterns/adapter)
- **Google OAuth**: [developers.google.com/identity/protocols/oauth2](https://developers.google.com/identity/protocols/oauth2)
- **Microsoft Graph**: [docs.microsoft.com/en-us/graph/auth-v2-user](https://docs.microsoft.com/en-us/graph/auth-v2-user)
- **Jest Testing**: [jestjs.io/docs/getting-started](https://jestjs.io/docs/getting-started)
- **Related ADRs**:
  - [ADR-0014: Dunning & OAuth Type Hardening](/docs/architecture/decisions/ADR-0014-dunning-oauth-type-hardening.md)

---

## Revision History

| Date | Action | Status |
|------|--------|--------|
| 2025-11-12 | Integrated adapters into Google OAuth provider | ✅ Complete |
| 2025-11-12 | Integrated adapters into Microsoft OAuth provider | ✅ Complete |
| 2025-11-12 | Enhanced Express Request with provider context | ✅ Complete |
| 2025-11-12 | Created 50+ unit and integration tests | ✅ Complete |
| 2025-11-12 | Established no-raw-payload policy | ✅ Documented |
| 2025-11-12 | OAuth normalization fully integrated | ✅ **COMPLETE** 🎉 |
| TBD | Deprecate legacy profile interfaces | 📋 Future |
| TBD | Add GitHub OAuth adapter | 📋 Future |
