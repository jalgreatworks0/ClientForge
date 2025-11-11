# Claude Desktop - Protocols & Guidelines Integration

**Date**: 2025-11-05
**Enhancement**: ClientForge MCP Server v1.1 - Protocols Integration
**Built By**: Claude Code (Sonnet 4.5)

---

## What Was Added

I've enhanced the ClientForge MCP server to give Claude Desktop **complete access to all project protocols and guidelines** from CLAUDE.md and README.md!

### New MCP Resources:

1. **`clientforge://protocols/all`** (JSON)
   - Complete PROJECT_PROTOCOLS data structure
   - Initialization requirements (6 files, verification code)
   - Critical rules (file org, anti-dup, dependencies, breaking changes, session end)
   - Essential rules (security, testing, type safety, error handling)
   - Conventions (naming for dirs, files, components, functions, classes, etc.)
   - Quality targets (85%+ coverage, <200ms API, <2s page load, etc.)
   - File placement patterns

2. **`clientforge://protocols/quick-reference`** (Markdown)
   - Fast reference guide with all critical information
   - Session start protocol
   - File organization rules
   - Anti-duplication strategy
   - Dependency checking
   - Security patterns
   - Testing requirements
   - Naming conventions
   - Quality targets
   - Quick commands
   - **ClientForge-specific patterns** (singleton services, test mocking, error handling)
   - Current session context
   - Verification codes

---

## What Claude Desktop Can Now Do

### Before (Without Protocols):
- ❌ No knowledge of project rules
- ❌ Would create files in wrong locations
- ❌ Would duplicate functionality
- ❌ Would use wrong naming conventions
- ❌ Would skip required verification codes
- ❌ Wouldn't know about singleton pattern

### After (With Protocols):
- ✅ **Knows all project rules and protocols**
- ✅ **Follows file organization (3-4 level depth)**
- ✅ **Searches before creating (UPDATE > CREATE)**
- ✅ **Uses correct naming conventions**
- ✅ **Includes verification codes**
- ✅ **Understands singleton service pattern**
- ✅ **Knows test mocking strategies**
- ✅ **Follows security best practices**
- ✅ **Targets 85%+ test coverage**
- ✅ **Checks dependencies before modifying**

---

## Key Protocol Information Available

### Session Initialization
```json
{
  "required_files": [
    "CLAUDE.md",
    "README.md",
    "docs/ai/QUICK_START_AI.md",
    "docs/protocols/00_QUICK_REFERENCE.md",
    "docs/07_CHANGELOG.md",
    "docs/00_MAP.md"
  ],
  "verification_code": "README-v3.0-SESSION-INIT-COMPLETE",
  "time_budget": "2 minutes"
}
```

### Critical Rules
- **File Organization**: Only README.md and CLAUDE.md in root, 3-4 level deep folders required
- **Anti-Duplication**: Search 2-3 min before creating ANY file (UPDATE > CREATE)
- **Dependencies**: Check imports before modifying (grep -r 'from.*filename')
- **Breaking Changes**: Assess impact, update ALL dependents immediately
- **Session End**: 10 min docs (CHANGELOG + session log + decisions)

### Essential Rules
- **Security**: Parameterized queries, zod validation, bcrypt (cost=12)
- **Testing**: 85%+ coverage, write tests immediately (happy/edge/error/security/perf)
- **Type Safety**: Zero 'any' types, explicit return types everywhere
- **Error Handling**: try-catch on async, AppError class, never swallow

### Conventions
- Directories: `kebab-case`
- Files: `kebab-case`
- Components: `PascalCase.tsx`
- Functions: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- DB Tables: `snake_case (plural)`
- DB Columns: `snake_case`
- API Endpoints: `/api/v1/resource (kebab-case, versioned)`

### Quality Targets
- Test Coverage: **85%+**
- API Response Time: **<200ms**
- Page Load: **<2s**
- Bundle Size: **<500KB**
- Test Suite Time: **<30s**

---

## ClientForge-Specific Patterns

### Singleton Service Pattern
Claude Desktop now knows that services use **singleton pattern**, NOT constructor injection:

```typescript
// WRONG (constructor injection):
class AuthService {
  constructor(private userRepo, private jwtService) {}
}

// RIGHT (singleton pattern):
import { userRepository } from '../users/user-repository'
import { jwtService } from './jwt-service'

class AuthService {
  async login() {
    const user = await userRepository.findByEmail(...)
    const tokens = jwtService.generateTokenPair(...)
  }
}
export const authService = new AuthService()
```

### Test Mocking Pattern
Claude Desktop knows to **mock modules**, not constructors:

```typescript
// Mock modules
jest.mock('../../../backend/core/users/user-repository');
import { userRepository } from '../../../backend/core/users/user-repository'

// Use mocked methods
(userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser)
```

### Error Handling Pattern
Claude Desktop knows services **catch and re-throw** with generic messages:

```typescript
try {
  // ... logic
  if (!user) {
    throw new UnauthorizedError('Invalid credentials')
  }
} catch (error) {
  if (error instanceof UnauthorizedError) {
    throw error  // Re-throw specific errors
  }
  throw new UnauthorizedError('Login failed')  // Generic for unexpected
}
```

---

## How to Use

### Test Protocol Knowledge
Ask Claude Desktop:
```
What are the critical rules I must follow when working on ClientForge CRM?
```

She should respond with:
- Session start protocol (read CLAUDE.md first)
- File organization rules
- Anti-duplication strategy
- Testing requirements
- Verification codes

### Test Quick Reference
Ask Claude Desktop:
```
Show me the quick reference for ClientForge development
```

She should provide:
- Critical rules summary
- Naming conventions
- Quality targets
- Quick commands
- ClientForge-specific patterns

### Use in Development
When Claude Desktop works on tasks, she will now:
1. Know to search before creating files
2. Use correct folder depth (3-4 levels)
3. Follow naming conventions
4. Include verification codes
5. Write tests with 85%+ coverage
6. Use singleton pattern for services
7. Mock modules correctly in tests
8. Follow security best practices

---

## Files Modified

### C:\ScrollForge\08_SYSTEM_NEXUS\Gateway\clientforge_mcp.py

**Added**:
1. `PROJECT_PROTOCOLS` dictionary (lines 41-92)
   - initialization
   - critical_rules
   - essential_rules
   - conventions
   - quality_targets
   - file_placement

2. New Resources (lines 110-120)
   - `clientforge://protocols/all`
   - `clientforge://protocols/quick-reference`

3. New Resource Handlers (lines 158-161)
   - `get_protocols_all()`
   - `get_protocols_quick_reference()`

4. New Functions (lines 679-880)
   - `async def get_protocols_all()` - Returns PROJECT_PROTOCOLS as JSON
   - `async def get_protocols_quick_reference()` - Returns 194-line markdown guide

### d:\clientforge-crm\logs\CLAUDE_DESKTOP_CLIENTFORGE_INTEGRATION.md

**Updated**:
- Added protocol resources to capabilities list
- Added Test 1: Protocol Knowledge
- Updated "What Claude Desktop Now Knows" section
- Renumbered tests (Test 2-5)

---

## Testing Instructions

### 1. Restart Claude Desktop
```powershell
# Close Claude Desktop completely
taskkill /F /IM "Claude.exe"

# Reopen from Start Menu
```

### 2. Test Protocol Access
Ask Claude Desktop:
```
What verification code should I include when I initialize a session?
```

**Expected**: She should respond with `README-v3.0-SESSION-INIT-COMPLETE`

### 3. Test Pattern Knowledge
Ask Claude Desktop:
```
How should I mock services in ClientForge tests?
```

**Expected**: She should explain:
- Services use singleton pattern
- Mock entire modules, not constructors
- Use `jest.mock()` with module paths
- Import mocked instances
- Cast methods as `jest.Mock`

### 4. Test Rule Knowledge
Ask Claude Desktop:
```
What should I do before creating a new file in ClientForge?
```

**Expected**: She should say:
- Search for 2-3 minutes
- Run 5-phase search protocol
- Check for similar files
- UPDATE > CREATE philosophy
- Include ANTI-DUP-CHECK-COMPLETE verification code

---

## Benefits

### For Development Quality:
1. **Consistency**: Claude Desktop follows same rules as Claude Code
2. **No Duplication**: She knows to search before creating
3. **Correct Patterns**: She uses singleton services, proper mocking
4. **Security First**: She follows parameterized queries, validation
5. **Test Coverage**: She targets 85%+ coverage

### For Collaboration:
1. **Shared Context**: Both AIs have same protocol knowledge
2. **Verification**: Both use same verification codes
3. **Standards**: Both follow same conventions
4. **Quality**: Both target same quality metrics

### For User:
1. **Less Correction**: AIs make fewer mistakes
2. **Faster Development**: AIs work more efficiently
3. **Better Code**: AIs produce higher quality output
4. **Seamless Handoff**: Work transfers smoothly between AIs

---

## Example Usage Scenario

### User asks Claude Desktop:
```
Can you fix the PasswordService tests? They're failing like the AuthService tests were.
```

### Claude Desktop's Workflow (WITH protocols):
1. ✅ Checks `clientforge://protocols/quick-reference` for patterns
2. ✅ Sees "Singleton Service Pattern" and "Test Mocking Pattern"
3. ✅ Uses `get_module_info('auth')` to find PasswordService
4. ✅ Uses `get_test_file('password-service')` to locate test
5. ✅ Reads actual PasswordService implementation
6. ✅ Creates module mocks (not constructor injection)
7. ✅ Writes fixed test with proper singleton pattern
8. ✅ Includes verification code: ANTI-DUP-CHECK-COMPLETE
9. ✅ Ensures 85%+ coverage
10. ✅ Uses kebab-case naming

### Claude Desktop's Workflow (WITHOUT protocols):
1. ❌ Guesses that services use constructor injection
2. ❌ Creates test with wrong mocking strategy
3. ❌ Uses wrong naming convention
4. ❌ Doesn't include verification codes
5. ❌ Doesn't check coverage targets
6. ❌ User has to correct and explain patterns
7. ❌ Wastes time with rework

---

## Verification

To verify Claude Desktop has protocol access after restart:

```
Hey Claude Desktop! Quick verification:

1. What's the anti-duplication philosophy? (Should be: UPDATE > CREATE)
2. How deep should folders be? (Should be: 3-4 levels)
3. What's the test coverage target? (Should be: 85%+)
4. What pattern do services use? (Should be: singleton, not constructor injection)
5. What's the session init verification code? (Should be: README-v3.0-SESSION-INIT-COMPLETE)

If you can answer all 5, you have protocol access!
```

---

## Next Steps

1. **Restart Claude Desktop** (see Testing Instructions above)
2. **Test protocol access** (ask verification questions)
3. **Ask her to fix PasswordService tests** (test pattern knowledge)
4. **Verify she includes verification codes**
5. **Check she uses correct mocking strategy**

---

## Summary

Claude Desktop now has **complete access to all ClientForge CRM protocols and guidelines**!

She knows:
- ✅ All critical rules (P0)
- ✅ All essential rules (P1)
- ✅ All conventions
- ✅ All quality targets
- ✅ ClientForge-specific patterns
- ✅ Singleton service pattern
- ✅ Module mocking strategy
- ✅ Error handling patterns
- ✅ Verification codes
- ✅ Session protocols

This means:
- 🎯 **Higher quality** code generation
- 🚀 **Faster development** (fewer mistakes)
- 🤝 **Better collaboration** between AIs
- ✅ **Consistent patterns** across all work
- 📊 **Better test coverage** (85%+ target)
- 🔒 **Better security** (parameterized queries, validation)

**Ready to collaborate with Claude Desktop on fixing the remaining 81 test failures!**

---

**Built by Claude Code (Sonnet 4.5)**
**For Abstract Creatives LLC - ClientForge CRM v3.0**
**MCP Enhancement: Protocols & Guidelines Integration v1.1**
**Date**: 2025-11-05
