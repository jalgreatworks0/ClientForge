# ClientForge CRM v3.0 - AI Quick Context

## Project Identity
- **Name**: ClientForge CRM v3.0 (Enterprise AI-Powered CRM)
- **Owner**: Abstract Creatives LLC
- **Stack**: React 18 + Node.js + PostgreSQL + MongoDB + Redis + AI/ML
- **Scale**: 413 directories, 50+ active protocols
- **Quality**: 85%+ coverage, <200ms API, zero 'any' types, security-first

## Session Start (MANDATORY - 90 seconds)
1. Read README.md (single read, all context loaded)
2. Check logs/session-logs/ (last session summary)
3. Reserve 10 min at end for documentation

## Critical Rules (P0 - NEVER SKIP)
- **File Org**: Only README.md in root, 3-4 level deep folders required
- **Anti-Dup**: Search 2-3 min before creating ANY file (find + grep)
- **Dependencies**: Check imports before modifying (grep -r 'from.*filename')
- **Breaking Changes**: Assess impact, update ALL dependents immediately
- **Session End**: 10 min docs (CHANGELOG + session log + decisions)

## Essential Rules (P1 - ALWAYS APPLY)
- **Security**: Parameterized queries, zod validation, bcrypt (cost=12)
- **Testing**: 85%+ coverage, write tests immediately (happy/edge/error/security/perf)
- **Type Safety**: Zero 'any' types, explicit return types everywhere
- **Error Handling**: try-catch on async, AppError class, never swallow

## Conventions
- **Dirs/Files**: kebab-case (`user-service.ts`)
- **Components**: PascalCase.tsx (`UserProfile.tsx`)
- **Functions**: camelCase (`getUserById`)
- **Classes**: PascalCase (`UserService`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_RETRIES`)
- **DB Tables**: snake_case plural (`user_profiles`)
- **DB Columns**: snake_case (`first_name`, `created_at`)
- **APIs**: /api/v1/resource (kebab-case, versioned)

## File Placement
- Backend: `backend/services/[module]/[module]-service.ts`
- Frontend: `frontend/components/[Module]/[Component]/[ComponentName].tsx`
- Tests: `tests/unit/[module]/[component].test.ts`
- Docs: `docs/[category]/[name].md`

## Quick Commands
```bash
# Search before creating
find . -name '*keyword*' -type f
grep -r 'keyword' --include='*.ts'

# Check dependencies
grep -r 'from.*filename' --include='*.ts'

# Tests & quality
npm test -- --coverage
npm run type-check
npm audit
```

## Code Patterns

### TypeScript
```typescript
// ✅ ALWAYS
const user: User = { id: 1, name: 'John' }
async function getUser(id: number): Promise<User | null>

// ❌ NEVER
const user: any = { id: 1 }
async function getUser(id): Promise<any>
```

### Security
```typescript
// ✅ Parameterized queries
await db.query('SELECT * FROM users WHERE email = $1', [email])

// ❌ SQL injection risk
await db.query(`SELECT * FROM users WHERE email = '${email}'`)
```

### Error Handling
```typescript
// ✅ Proper handling
try {
  const result = await operation()
  return result
} catch (error) {
  logger.error('Operation failed', { error })
  throw new AppError('Operation failed', 500, { originalError: error })
}
```

### React Components
```typescript
// ✅ Use React Query + TypeScript
export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const { data, isLoading, error } = useQuery(['user', userId], () => getUser(userId))
  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  return <div>{data.name}</div>
}
```

## Session End Protocol
1. Update CHANGELOG.md (2 min)
2. Create session log in logs/session-logs/YYYY-MM-DD-task.md (5 min)
3. Document decisions made (rationale, alternatives, trade-offs)
4. List next steps for future sessions
5. Update affected docs if structure changed

## Reference Links
- Quick Reference: docs/protocols/00_QUICK_REFERENCE.md
- AI Quick Start: docs/ai/QUICK_START_AI.md
- Common Mistakes: docs/protocols/07_COMMON_MISTAKES.md
- All Protocols: docs/protocols/*.md

## Remember
- UPDATE > CREATE (search first, always)
- Quality > Speed (85%+ coverage mandatory)
- Security First (OWASP Top 10 on every change)
- Document Everything (10 min reserved)
- Deep Folders (3-4 levels minimum)
