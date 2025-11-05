# 🚀 Protocol Quick Reference - ClientForge CRM v3.0

**One-Page Cheat Sheet for AI Assistants**

---

## 🔥 CRITICAL PROTOCOLS (P0) - Never Skip

### 1. Session Start (5 minutes)
```
✓ Read README.md
✓ Read CHANGELOG.md
✓ Review last 2-3 session logs
✓ Answer 5 self-awareness questions
✓ Reserve 10 min for docs at end
```

### 2. File Organization
```
ROOT: Only README.md + config files
CODE: backend/[category]/[module]/[file].ts
      frontend/[category]/[Module]/[Component].tsx
DOCS: docs/[category]/[name].md
TESTS: tests/[type]/[module]/[file].test.ts
```

### 3. Anti-Duplication (2-3 min search)
```bash
# Phase 1: Global search
find . -name '*keyword*' -type f
grep -r 'keyword' --include='*.ts' --include='*.md'

# Phase 2: Check similarity
80%+ similar = EXTEND existing
90%+ similar = USE existing, DON'T create

# Decision: UPDATE > CREATE
```

### 4. Breaking Change Detection
```bash
# Before modifying ANY file:
grep -r 'from.*filename' --include='*.ts'  # Find dependents
grep -r 'import.*filename' --include='*.ts'

# Update ALL dependents immediately
# Run ALL affected tests
```

### 5. Session End (10 minutes)
```
✓ Update CHANGELOG.md
✓ Create session log in logs/session-logs/
✓ Update affected docs
✓ Document decisions made
✓ List next steps
```

---

## ⚡ ESSENTIAL PROTOCOLS (P1) - Always Apply

### Dependency Chain
```
Before modifying file:
1. Find who imports it (30 sec)
2. Assess breaking change risk (20 sec)
3. Update all dependents (variable)
4. Run affected tests (5-30 min)
```

### Security Implication
```
Auto-check on every change:
✓ SQL injection (parameterized queries)
✓ XSS (sanitize inputs, safe rendering)
✓ Auth bypass (verify permissions)
✓ Sensitive data exposure (never log secrets)
✓ CSRF (tokens on state-changing operations)
```

### Test Coverage
```
Coverage Targets:
- Overall: 85%+
- Auth/Payment: 95%+
- Security: 90%+
- API: 85%+

Auto-generate tests:
1. Happy path
2. Edge cases
3. Error cases
4. Security cases
5. Performance cases
```

### API Contracts
```
Never break existing APIs:
✓ Keep old function signatures
✓ Make new params optional
✓ Add deprecation warnings
✓ Provide migration guide
✓ Version APIs (/api/v1, /api/v2)
```

### Database Migrations
```
Migration Rules:
✓ Never destructive (no DROP in production)
✓ Always reversible (up + down)
✓ Multi-phase for breaking changes
✓ Test on copy of production data
```

---

## 🎯 IMPORTANT PROTOCOLS (P2) - Enhance Quality

### Code Review (9-Section Check)
```
1. Type Safety (zero 'any')
2. Error Handling (try-catch, AppError)
3. Security (OWASP Top 10)
4. Performance (N+1, indexes, caching)
5. Testing (85%+ coverage)
6. Documentation (JSDoc, comments)
7. Naming (clear, consistent)
8. DRY (no duplication)
9. SOLID (design principles)
```

### Performance Impact
```
Budgets:
- API response: <200ms
- Page load: <2s
- Database query: <100ms
- Bundle size: <500KB initial

Optimizations:
✓ Lazy loading for routes
✓ React.memo for expensive components
✓ Virtual scrolling for >50 items
✓ Database indexes on foreign keys
✓ Redis caching for hot data
```

### Technical Debt
```
Prevention Checklist:
✓ No TODO comments (create tickets)
✓ No commented code (delete it)
✓ No console.log (use logger)
✓ No hardcoded values (use config)
✓ No copy-paste (extract shared)
```

---

## 📋 QUICK DECISION MATRICES

### Should I Create New File?
```
NO if:
- Existing file covers 80%+ functionality → EXTEND
- Similar functionality exists → REFACTOR to shared
- <200 lines of content → MERGE into existing
- One-time note → SESSION LOG only

YES if:
- Truly unique functionality (verified)
- Existing files cannot be extended
- Logical place in architecture
- Documented why necessary
```

### Should I Create New Doc?
```
NO if:
- Main docs (00-08) already cover topic → UPDATE
- Can be subsection of existing doc → ADD section
- <200 lines → MERGE into related doc
- One-time note → SESSION LOG only

YES if:
- New protocol/system to document
- 200+ lines of permanent content
- Logical place in docs/ structure
- Cannot fit in existing docs
```

### Breaking Change Risk Level
```
HIGH RISK:
- Function signature changed
- Interface/type definition changed
- Export removed/renamed
- File moved
→ Update ALL dependents immediately

MEDIUM RISK:
- New required parameter
- Default behavior changed
- Return type changed
→ Update affected files, add deprecation

LOW RISK:
- Internal function changed (not exported)
- Optional parameter added
- Documentation updated
→ Verify no side effects, run smoke tests
```

---

## 🛠️ COMMON COMMANDS

### Search Commands
```bash
# Find files
find . -name '*keyword*' -type f
find backend/services -name '*-service.ts'

# Find content
grep -r 'keyword' --include='*.ts'
grep -r 'export.*FunctionName' --include='*.ts'
grep -r 'class ClassName' --include='*.ts'

# Find dependencies
grep -r 'from.*filename' --include='*.ts'
grep -r 'import.*filename' --include='*.tsx'
```

### Test Commands
```bash
# Run tests
npm test                          # All tests
npm test -- --coverage            # With coverage
npm test -- path/to/test.test.ts  # Specific test

# Coverage check
npm run test:coverage
```

### Quality Commands
```bash
# Linting
npm run lint
npm run lint:fix

# Type checking
npm run type-check

# Build
npm run build
```

---

## 🎨 CODE PATTERNS

### TypeScript Strict Mode
```typescript
// ✅ GOOD
const user: User = { id: 1, name: 'John' }
function getUser(id: number): Promise<User | null>

// ❌ BAD
const user: any = { id: 1, name: 'John' }
function getUser(id): Promise<any>
```

### Error Handling
```typescript
// ✅ GOOD
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  throw new AppError('Operation failed', 500, { originalError: error })
}

// ❌ BAD
try {
  return await riskyOperation()
} catch (error) {
  console.log(error)
  return null
}
```

### API Endpoints
```typescript
// ✅ GOOD
GET    /api/v1/users
GET    /api/v1/users/:id
POST   /api/v1/users
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id

// ❌ BAD
GET    /getUsers
POST   /user/create
GET    /api/users/:id/getData
```

### React Components
```typescript
// ✅ GOOD
export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const { data, isLoading, error } = useQuery(['user', userId], () => getUser(userId))

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  if (!data) return <NotFound />

  return <div>{data.name}</div>
}

// ❌ BAD
export function UserProfile(props) {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch('/api/users/' + props.id).then(r => r.json()).then(setUser)
  }, [])

  return <div>{user?.name}</div>
}
```

---

## 📊 NAMING CONVENTIONS

| Element | Convention | Example |
|---------|-----------|---------|
| Directories | kebab-case | `user-management/` |
| Files | kebab-case.ext | `user-service.ts` |
| React Components | PascalCase.tsx | `UserProfile.tsx` |
| Classes | PascalCase | `UserService` |
| Functions | camelCase | `getUserById` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Interfaces | PascalCase | `IUserRepository` |
| Types | PascalCase | `UserRole` |
| Database Tables | snake_case (plural) | `user_profiles` |
| Database Columns | snake_case | `first_name` |
| API Endpoints | kebab-case | `/api/v1/user-profiles` |

---

## 🔗 PROTOCOL DOCUMENTATION

For detailed information, see:

- **[01_DEPENDENCY_CHAIN.md](./01_DEPENDENCY_CHAIN.md)** - Prevent breaking changes
- **[02_SECURITY.md](./02_SECURITY.md)** - Security best practices
- **[03_TEST_COVERAGE.md](./03_TEST_COVERAGE.md)** - Testing strategies
- **[04_BREAKING_CHANGES.md](./04_BREAKING_CHANGES.md)** - API evolution
- **[05_API_CONTRACTS.md](./05_API_CONTRACTS.md)** - API design patterns
- **[06_DATABASE_MIGRATIONS.md](./06_DATABASE_MIGRATIONS.md)** - Safe schema changes
- **[07_COMMON_MISTAKES.md](./07_COMMON_MISTAKES.md)** - Error prevention
- **[08_CONTEXT_PRESERVATION.md](./08_CONTEXT_PRESERVATION.md)** - Session continuity
- **[09_PERFORMANCE.md](./09_PERFORMANCE.md)** - Optimization strategies
- **[10_CODE_REVIEW.md](./10_CODE_REVIEW.md)** - Review checklists
- **[11_REFACTORING.md](./11_REFACTORING.md)** - Code improvement
- **[12_CONSISTENCY.md](./12_CONSISTENCY.md)** - Pattern enforcement
- **[13_TECHNICAL_DEBT.md](./13_TECHNICAL_DEBT.md)** - Debt prevention
- **[14_QUALITY_SCORING.md](./14_QUALITY_SCORING.md)** - Quality metrics

---

**Last Updated**: 2025-11-05
**Protocol Version**: 3.0.0
**Maintained By**: Abstract Creatives LLC
