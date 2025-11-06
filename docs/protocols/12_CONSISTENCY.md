# 🎯 Consistency Protocol

**P3 OPTIONAL**: Cross-module consistency patterns

---

## Core Principle

**Code should look like it was written by one person.** Follow consistent patterns.

---

## Naming Conventions

### Files & Directories
- kebab-case: `contact-service.ts`, `user-repository.ts`
- Components: `UserProfile.tsx`, `ContactCard.tsx`

### Functions & Variables
- camelCase: `getUserById`, `contactData`, `isValid`

### Classes & Interfaces
- PascalCase: `UserService`, `ContactRepository`, `Contact`

### Constants
- UPPER_SNAKE_CASE: `MAX_RETRIES`, `API_BASE_URL`

### Database
- snake_case: `user_profiles`, `created_at`, `first_name`

---

## Consistent Error Handling

```typescript
// ✅ Always use custom error classes
throw new NotFoundError('Contact not found')
throw new ValidationError('Invalid email format')
throw new UnauthorizedError('Invalid credentials')

// ❌ Don't use generic Error
throw new Error('Something went wrong')
```

---

## Consistent Response Format

```typescript
// ✅ All API responses follow same format
return res.status(200).json({
  success: true,
  data: contact
})

// ✅ All errors follow same format
return res.status(404).json({
  success: false,
  error: {
    code: 'NOT_FOUND',
    message: 'Contact not found'
  }
})
```

---

## Consistent Validation

```typescript
// ✅ All validation uses Zod
import { z } from 'zod'

const contactSchema = z.object({
  firstName: z.string().min(1).max(100),
  email: z.string().email()
})
```

---

## Consistent Folder Structure

```
backend/
├── api/
│   ├── rest/
│   │   └── v1/
│   │       ├── controllers/
│   │       └── routes/
├── core/
│   ├── contacts/
│   │   ├── contact-service.ts
│   │   ├── contact-repository.ts
│   │   ├── contact-types.ts
│   │   └── contact-validators.ts
```

Pattern: Every module has service, repository, types, validators.

---

## Import Organization

```typescript
// 1. External dependencies
import { Request, Response } from 'express'
import { z } from 'zod'

// 2. Internal dependencies (absolute imports)
import { ContactService } from '@backend/core/contacts/contact-service'
import { authenticate } from '@backend/middleware/auth'

// 3. Types
import type { Contact, CreateContactDTO } from '@backend/core/contacts/contact-types'

// 4. Relative imports (only for same module)
import { validateContact } from './contact-validators'
```
