# 🏗️ Technical Debt Protocol

**P3 OPTIONAL**: Debt prevention and management

---

## Core Principle

**Prevent debt, don't accumulate it.** Pay down debt immediately when discovered.

---

## What is Technical Debt?

### High-Interest Debt (Fix Immediately)
- ❌ No tests (< 85% coverage)
- ❌ Security vulnerabilities (HIGH/CRITICAL)
- ❌ 'any' types everywhere
- ❌ Hardcoded secrets
- ❌ N+1 query problems

### Medium-Interest Debt (Fix Within Sprint)
- ⚠️ Duplicate code (DRY violations)
- ⚠️ Complex functions (> 100 lines)
- ⚠️ Missing error handling
- ⚠️ Poor naming
- ⚠️ Outdated dependencies

### Low-Interest Debt (Fix When Convenient)
- 📝 Missing JSDoc comments
- 📝 Inconsistent formatting
- 📝 TODO comments
- 📝 Console.logs in production code

---

## Debt Prevention

### Before Writing Code
- [ ] Search for existing solution (don't duplicate)
- [ ] Plan architecture (don't code-and-fix)
- [ ] Write tests first (TDD)

### While Writing Code
- [ ] Follow protocols (security, testing, quality)
- [ ] Refactor as you go
- [ ] Document decisions

### After Writing Code
- [ ] Code review (9-point checklist)
- [ ] Update documentation
- [ ] Clean up TODOs

---

## Debt Tracking

```typescript
// ❌ DON'T leave vague TODOs
// TODO: Fix this later

// ✅ DO document with context
// TODO (2025-11-06): Refactor to use async/await instead of callbacks
//                    Issue: #123
//                    Priority: Medium
//                    Estimated: 2 hours
```

---

## Debt Paydown Strategy

### Boy Scout Rule
**"Leave code better than you found it."**

When touching a file:
1. Fix obvious issues (typos, formatting)
2. Add missing tests
3. Improve naming
4. Extract long functions

### Dedicated Debt Sprints
- Reserve 20% of sprint capacity for debt paydown
- Track debt in backlog with "Tech Debt" label
- Prioritize high-interest debt

---

## Debt Metrics

Track weekly:
- Test coverage % (target: 85%+)
- TypeScript errors count (target: 0)
- npm audit HIGH/CRITICAL (target: 0)
- Code duplicat ion % (target: < 5%)
- Average function length (target: < 30 lines)

---

## When to Accept Debt

Sometimes debt is acceptable:
- ✅ Prototype/MVP (pay down before launch)
- ✅ Time-sensitive hotfix (create ticket to refactor)
- ✅ Experiment (delete if it fails)

Always:
1. Document why debt was accepted
2. Create ticket to pay it down
3. Set deadline for paydown
