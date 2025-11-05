# 🎯 Top 50 Mistakes Prevention Library

**P1 ESSENTIAL**: Learn from common mistakes. Prevent them before they happen.

---

## Critical Principle

**Prevention is better than cure.** This library documents the 50 most common mistakes and how to avoid them.

---

## File Organization Mistakes (10)

### MISTAKE #001: Creating .md files in root directory

**Why Wrong**: README.md is the ONLY .md file allowed in root

**Correct Approach**: Create in `docs/guides/`, `docs/readme/`, or `docs/[category]/`

**Detection**: Pre-commit hook scans for new .md files in root

**Example**:
```
❌ BAD:  /NEW_FEATURE.md
✅ GOOD: /docs/guides/NEW_FEATURE.md
```

---

### MISTAKE #002: Creating files without checking if they exist

**Why Wrong**: Creates duplicates, violates anti-duplication protocol

**Correct Approach**: Run 2-3 min search (find + grep) before creating

**Detection**: Run comprehensive search first

**Example**:
```bash
# ❌ BAD: Write new file immediately

# ✅ GOOD: Search for similar files first
grep -r 'ContactValidator' --include='*.ts'
find . -name '*contact*validator*'
```

---

### MISTAKE #003: Using wrong naming convention

**Why Wrong**: Breaks consistency, hard to find files

**Correct Approach**: kebab-case for files, PascalCase for React components

**Example**:
```
❌ BAD:  ContactForm_Component.tsx
❌ BAD:  contact_form.tsx
✅ GOOD: ContactForm.tsx (React component)
✅ GOOD: contact-service.ts (service file)
```

---

## Type Safety Mistakes (5)

### MISTAKE #004: Using 'any' type in TypeScript

**Why Wrong**: Defeats type safety, causes runtime errors

**Correct Approach**: Use proper types or 'unknown' with type guards

**Detection**: `grep -r ': any' --include='*.ts' | grep -v '.d.ts'`

**Example**:
```typescript
// ❌ BAD
function process(data: any) {
  return data.name // Runtime error if data has no name
}

// ✅ GOOD
function process(data: Contact | Deal): string {
  if ('name' in data) return data.name
  throw new Error('Invalid data type')
}

// ✅ ALSO GOOD
function process(data: unknown): string {
  if (isContact(data)) return data.name
  throw new Error('Not a contact')
}
```

---

### MISTAKE #005: Missing return type annotations

**Why Wrong**: TypeScript infers wrong types, leads to bugs

**Correct Approach**: Always annotate function return types

**Detection**: ESLint rule `@typescript-eslint/explicit-function-return-type`

**Example**:
```typescript
// ❌ BAD
function getUser(id: string) {
  return db.users.findOne({ id })
}

// ✅ GOOD
function getUser(id: string): Promise<User | null> {
  return db.users.findOne({ id })
}
```

---

## Database Mistakes (10)

### MISTAKE #006: N+1 query pattern (query in loop)

**Why Wrong**: Catastrophic performance (1000 queries instead of 1)

**Correct Approach**: Use JOIN or WHERE IN with single query

**Detection**: `grep -r 'forEach.*await.*db|for.*await.*db' --include='*.ts'`

**Example**:
```typescript
// ❌ BAD (N+1)
const users = await db.query('SELECT * FROM users')
for (const user of users) {
  const orders = await db.query(
    'SELECT * FROM orders WHERE user_id = $1',
    [user.id]
  ) // 1 + N queries!
}

// ✅ GOOD (JOIN)
const usersWithOrders = await db.query(`
  SELECT u.*, json_agg(o.*) as orders
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id
`) // 1 query!
```

---

### MISTAKE #007: Missing database indexes

**Why Wrong**: Slow queries, sequential scans on large tables

**Correct Approach**: Add index for columns in WHERE/JOIN clauses

**Detection**: EXPLAIN ANALYZE shows 'Seq Scan'

**Example**:
```sql
-- ❌ BAD (No index)
SELECT * FROM users WHERE email = 'user@example.com';
-- Seq Scan on users (cost=0.00..1234.00)

-- ✅ GOOD (With index)
CREATE INDEX idx_users_email ON users(email);
SELECT * FROM users WHERE email = 'user@example.com';
-- Index Scan using idx_users_email (cost=0.00..8.00)
```

---

## Security Mistakes (15)

### MISTAKE #008: SQL injection via string interpolation

**Why Wrong**: Critical security vulnerability, data breach risk

**Correct Approach**: Always use parameterized queries

**Detection**: `grep -r 'db.query.*\${' --include='*.ts'`

**Example**:
```typescript
// ❌ BAD (SQL Injection)
const email = req.query.email
const user = await db.query(`
  SELECT * FROM users WHERE email = '${email}'
`) // Vulnerable!

// ✅ GOOD (Parameterized)
const email = req.query.email
const user = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
) // Safe!
```

---

### MISTAKE #009: XSS via dangerouslySetInnerHTML

**Why Wrong**: Allows JavaScript injection, user account takeover

**Correct Approach**: Sanitize HTML or avoid dangerouslySetInnerHTML

**Detection**: `grep -r 'dangerouslySetInnerHTML' --include='*.tsx'`

**Example**:
```tsx
// ❌ BAD (XSS)
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ GOOD (Sanitized)
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(userInput)
}} />

// ✅ BETTER (Avoid it)
<div>{userInput}</div>
```

---

### MISTAKE #010: Passwords/secrets in code or logs

**Why Wrong**: Credentials leaked, security breach

**Correct Approach**: Use environment variables, never log secrets

**Detection**: `grep -r 'password.*=.*[\'"]' --include='*.ts'`

**Example**:
```typescript
// ❌ BAD
const DB_PASSWORD = 'super_secret_123'
logger.info('User logged in', { password: user.password })

// ✅ GOOD
const DB_PASSWORD = process.env.DB_PASSWORD
logger.info('User logged in', {
  userId: user.id
  // Never log password!
})
```

---

### MISTAKE #011: Missing authentication checks

**Why Wrong**: Unauthorized access to sensitive endpoints

**Correct Approach**: Use authentication middleware on all protected routes

**Example**:
```typescript
// ❌ BAD
app.get('/api/users/:id', async (req, res) => {
  const user = await getUser(req.params.id)
  res.json(user) // Anyone can access!
})

// ✅ GOOD
app.get('/api/users/:id', authenticateUser, async (req, res) => {
  const user = await getUser(req.params.id)
  res.json(user) // Only authenticated users
})
```

---

### MISTAKE #012: Missing authorization checks

**Why Wrong**: Users can access other users' data

**Correct Approach**: Verify user owns the resource

**Example**:
```typescript
// ❌ BAD
app.get('/api/contacts/:id', async (req, res) => {
  const contact = await getContact(req.params.id)
  res.json(contact) // Any logged-in user can see any contact!
})

// ✅ GOOD
app.get('/api/contacts/:id', authenticateUser, async (req, res) => {
  const contact = await getContact(req.params.id)

  if (contact.userId !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  res.json(contact)
})
```

---

## API/Endpoint Mistakes (10)

### MISTAKE #013: Missing pagination on list endpoints

**Why Wrong**: Returns all records (crashes with 100K+ records)

**Correct Approach**: Always paginate with limit and offset

**Detection**: `grep -r 'findMany()' | grep -v 'take|limit'`

**Example**:
```typescript
// ❌ BAD
app.get('/api/contacts', async (req, res) => {
  const contacts = await db.contacts.findMany()
  res.json(contacts) // Returns ALL contacts!
})

// ✅ GOOD
app.get('/api/contacts', async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 20
  const offset = (page - 1) * limit

  const [contacts, total] = await Promise.all([
    db.contacts.findMany({ skip: offset, take: limit }),
    db.contacts.count()
  ])

  res.json({ data: contacts, total, page })
})
```

---

### MISTAKE #014: Missing error handling in async functions

**Why Wrong**: Unhandled promise rejections crash server

**Correct Approach**: Wrap in try-catch, use error middleware

**Example**:
```typescript
// ❌ BAD
app.post('/api/contacts', async (req, res) => {
  const contact = await db.contacts.create(req.body)
  res.json(contact) // What if create() fails?
})

// ✅ GOOD
app.post('/api/contacts', async (req, res) => {
  try {
    const contact = await db.contacts.create(req.body)
    res.json(contact)
  } catch (error) {
    logger.error('Failed to create contact', { error, body: req.body })
    res.status(500).json({
      error: 'Failed to create contact',
      message: error.message
    })
  }
})
```

---

### MISTAKE #015: No input validation

**Why Wrong**: Invalid data enters database, causes crashes

**Correct Approach**: Use validation library (zod, joi, yup)

**Example**:
```typescript
// ❌ BAD
app.post('/api/contacts', async (req, res) => {
  const contact = await db.contacts.create(req.body) // No validation!
})

// ✅ GOOD
import { z } from 'zod'

const ContactSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().optional()
})

app.post('/api/contacts', async (req, res) => {
  const validatedData = ContactSchema.parse(req.body) // Throws if invalid
  const contact = await db.contacts.create(validatedData)
  res.json(contact)
})
```

---

## Testing Mistakes (10)

### MISTAKE #016: No tests for new code

**Why Wrong**: Code will break in future, no safety net

**Correct Approach**: Write tests first (TDD) or immediately after

**Detection**: Check if new file has corresponding .test.ts file

**Example**:
```
❌ BAD:
backend/services/contact-service.ts created
No test file!

✅ GOOD:
backend/services/contact-service.ts created
backend/__tests__/services/contact-service.test.ts created
Coverage: 92%
```

---

### MISTAKE #017: Tests that don't actually test anything

**Why Wrong**: False sense of security, bugs slip through

**Correct Approach**: Test actual behavior, edge cases, errors

**Example**:
```typescript
// ❌ BAD (Meaningless test)
it('should create contact', () => {
  expect(true).toBe(true) // Useless!
})

// ✅ GOOD (Real test)
it('should create contact with valid data', async () => {
  const contact = await createContact({
    name: 'John Doe',
    email: 'john@example.com'
  })

  expect(contact.id).toBeDefined()
  expect(contact.name).toBe('John Doe')
  expect(contact.email).toBe('john@example.com')
})
```

---

## Performance Mistakes (5)

### MISTAKE #018: Loading all data at once

**Why Wrong**: Memory exhaustion, slow response times

**Correct Approach**: Use pagination, streaming, or lazy loading

**Example**:
```typescript
// ❌ BAD
const allUsers = await db.users.findMany() // 100K users!
return allUsers

// ✅ GOOD
const users = await db.users.findMany({
  skip: offset,
  take: 20
})
return users
```

---

### MISTAKE #019: Not caching frequently accessed data

**Why Wrong**: Unnecessary database queries, slow responses

**Correct Approach**: Use Redis for hot data

**Example**:
```typescript
// ❌ BAD
app.get('/api/settings', async (req, res) => {
  const settings = await db.settings.findMany() // Every request hits DB
  res.json(settings)
})

// ✅ GOOD
app.get('/api/settings', async (req, res) => {
  const cached = await redis.get('settings')
  if (cached) return res.json(JSON.parse(cached))

  const settings = await db.settings.findMany()
  await redis.set('settings', JSON.stringify(settings), 'EX', 3600) // 1 hour cache
  res.json(settings)
})
```

---

## Quick Detection Commands

Run these periodically to catch mistakes:

```bash
# Find 'any' types
grep -r ': any' --include='*.ts' | grep -v '.d.ts'

# Find SQL injection risks
grep -r 'db.query.*\${' --include='*.ts'

# Find XSS risks
grep -r 'dangerouslySetInnerHTML' --include='*.tsx'

# Find N+1 patterns
grep -r 'forEach.*await.*db|for.*await.*db' --include='*.ts'

# Find hardcoded secrets
grep -r 'password.*=.*[\'"]' --include='*.ts'

# Find files without tests
find backend -name '*.ts' ! -name '*.test.ts' -exec sh -c 'test -f "${1%.ts}.test.ts" || echo "$1"' _ {} \;

# Find missing pagination
grep -r 'findMany()' --include='*.ts' | grep -v 'take\|limit'
```

---

**Protocol Version**: 3.0.0
**Last Updated**: 2025-11-05
**See Also**: [02_SECURITY.md](./02_SECURITY.md), [03_TEST_COVERAGE.md](./03_SECURITY.md), [09_PERFORMANCE.md](./09_PERFORMANCE.md)
