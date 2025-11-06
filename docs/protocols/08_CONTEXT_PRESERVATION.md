# 🧠 Context Preservation Protocol

**P2 RECOMMENDED**: Maintain session continuity across AI sessions

---

## Core Principle

**Future AI sessions should understand past decisions.** Document context for continuity.

---

## Session End Protocol (10 Minutes)

At end of EVERY session:

### 1. Update CHANGELOG (2 min)
```markdown
## [Unreleased]

### Added - 2025-11-06
- Contact merge/deduplication feature
- Global search with FTS5 full-text index
```

### 2. Create Session Log (5 min)
```
logs/session-logs/2025-11-06-contact-merge-implementation.md

# Session: Contact Merge Implementation
## Date: 2025-11-06
## Duration: 2.5 hours

## What Changed
- Implemented contact merge API endpoint
- Added deduplication algorithm (fuzzy matching)
- Created 15 tests (95% coverage)

## Decisions Made
1. **Fuzzy matching threshold: 85%**
   - Rationale: Balance between false positives/negatives
   - Alternatives considered: 80%, 90%
   - Trade-off: 85% gave best results in testing

2. **Keep newer contact on merge**
   - Rationale: Newer data usually more accurate
   - Alternative: Keep contact with more complete data
   - Trade-off: Simpler logic, predictable behavior

## Files Modified
- backend/core/contacts/contact-service.ts
- backend/core/contacts/contact-repository.ts
- backend/database/migrations/002_contact_merge.sql

## Next Steps
- [ ] Add UI for merge confirmation
- [ ] Implement undo/rollback for merges
- [ ] Add bulk deduplication job
```

### 3. Document Decisions (3 min)
Why decisions were made, alternatives considered, trade-offs.

---

## Context Files

### Primary Context (Read First)
1. `CLAUDE.md` - Quick context (90 seconds)
2. `README.md` - Full protocols (5 minutes)
3. `docs/07_CHANGELOG.md` - Recent changes
4. `logs/session-logs/[latest].md` - Last session

### Secondary Context
5. `docs/00_MAP.md` - File structure map
6. `docs/protocols/00_QUICK_REFERENCE.md` - Protocol cheat sheet

---

## Decision Documentation Template

```markdown
## Decision: [Title]

**Context**: What problem were we solving?

**Options Considered**:
1. Option A - Pros/Cons
2. Option B - Pros/Cons
3. Option C - Pros/Cons

**Decision**: We chose Option B

**Rationale**: Why we chose it

**Trade-offs**: What we sacrificed

**Reversibility**: How hard to undo? (Easy/Medium/Hard)
```

---

## Verification Questions (Session Start)

Every AI should answer these 5 questions:

1. **What was the last major change?** (Check CHANGELOG)
2. **What files am I modifying?** (Anti-duplication search)
3. **Who depends on this code?** (Breaking change check)
4. **What's the testing requirement?** (85%+ coverage)
5. **When does this session end?** (Reserve 10 min for docs)

---

## Context Loss Prevention

### DO ✅
- Document WHY, not just WHAT
- Explain trade-offs and alternatives
- Update CHANGELOG immediately
- Create session logs before closing

### DON'T ❌
- Skip documentation ("I'll do it later")
- Document only WHAT changed
- Forget to explain WHY decisions were made
- Leave incomplete thoughts
