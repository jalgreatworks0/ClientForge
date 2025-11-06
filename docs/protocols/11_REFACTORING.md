# 🔄 Refactoring Protocol

**P3 OPTIONAL**: Code improvement without changing behavior

---

## Core Principle

**Refactoring changes HOW code works, not WHAT it does.** Behavior stays identical.

---

## When to Refactor

### Refactor When:
- ✅ Function > 50 lines (extract smaller functions)
- ✅ Duplicate code in 3+ places (DRY violation)
- ✅ Complex conditionals (extract to named functions)
- ✅ Poor naming (unclear variable/function names)
- ✅ Low test coverage area (add tests, then refactor)

### Don't Refactor When:
- ❌ Adding new features (refactor separately)
- ❌ Fixing urgent bugs (fix first, refactor later)
- ❌ No tests (write tests first!)
- ❌ Near deadline (defer to next sprint)

---

## Refactoring Patterns

### Extract Function
```typescript
// ❌ BEFORE: Long function
async function createContact(data: ContactData) {
  // Validate email format
  if (!data.email.includes('@')) throw new Error('Invalid email')
  if (data.email.length > 255) throw new Error('Email too long')

  // Check for duplicate
  const existing = await db.query('SELECT * FROM contacts WHERE email = $1', [data.email])
  if (existing.rows.length > 0) throw new Error('Email exists')

  // Create contact
  const result = await db.query(
    'INSERT INTO contacts (email, name) VALUES ($1, $2) RETURNING *',
    [data.email, data.name]
  )

  return result.rows[0]
}

// ✅ AFTER: Extracted functions
async function createContact(data: ContactData) {
  validateEmail(data.email)
  await ensureEmailUnique(data.email)
  return await insertContact(data)
}

function validateEmail(email: string): void {
  if (!email.includes('@')) throw new ValidationError('Invalid email')
  if (email.length > 255) throw new ValidationError('Email too long')
}

async function ensureEmailUnique(email: string): Promise<void> {
  const existing = await contactRepository.findByEmail(email)
  if (existing) throw new ConflictError('Email already exists')
}

async function insertContact(data: ContactData): Promise<Contact> {
  return await contactRepository.create(data)
}
```

### Replace Conditional with Polymorphism
```typescript
// ❌ BEFORE: Complex conditionals
function getDiscount(customer: Customer, amount: number): number {
  if (customer.type === 'regular') {
    return amount * 0.05
  } else if (customer.type === 'premium') {
    return amount * 0.10
  } else if (customer.type === 'vip') {
    return amount * 0.20
  }
  return 0
}

// ✅ AFTER: Strategy pattern
interface DiscountStrategy {
  calculate(amount: number): number
}

class RegularDiscount implements DiscountStrategy {
  calculate(amount: number): number {
    return amount * 0.05
  }
}

class PremiumDiscount implements DiscountStrategy {
  calculate(amount: number): number {
    return amount * 0.10
  }
}

class VIPDiscount implements DiscountStrategy {
  calculate(amount: number): number {
    return amount * 0.20
  }
}

const discountStrategies: Record<CustomerType, DiscountStrategy> = {
  regular: new RegularDiscount(),
  premium: new PremiumDiscount(),
  vip: new VIPDiscount()
}

function getDiscount(customer: Customer, amount: number): number {
  return discountStrategies[customer.type].calculate(amount)
}
```

---

## Refactoring Checklist

Before refactoring:
- [ ] All tests passing (baseline)
- [ ] Test coverage > 85% for code being refactored
- [ ] Create new branch for refactoring
- [ ] Commit working code before starting

During refactoring:
- [ ] Change ONE thing at a time
- [ ] Run tests after each change
- [ ] Commit after each successful refactoring

After refactoring:
- [ ] All tests still passing
- [ ] No new functionality added
- [ ] Code is more readable
- [ ] Performance not degraded

---

## Red-Green-Refactor Cycle

1. **Red**: Write failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

```typescript
// 1. RED: Write test
it('should calculate regular discount', () => {
  expect(getDiscount('regular', 100)).toBe(5)
})

// 2. GREEN: Make it pass (even if ugly)
function getDiscount(type: string, amount: number) {
  if (type === 'regular') return amount * 0.05
}

// 3. REFACTOR: Improve while tests stay green
function getDiscount(type: CustomerType, amount: number): number {
  const discountRates = { regular: 0.05, premium: 0.10, vip: 0.20 }
  return amount * (discountRates[type] || 0)
}
```

---

## Common Refactorings

- Extract Function
- Extract Variable
- Inline Function (if too small)
- Rename Variable/Function
- Move Function (to better module)
- Replace Magic Numbers with Constants
- Replace Nested Conditional with Guard Clauses
- Consolidate Duplicate Conditional Fragments
