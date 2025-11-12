# Task: Refactor Module

Template for refactoring an existing module safely.

## Pre-Flight
1. Run anti-duplication check
2. Identify affected files
3. Write characterization tests (if missing)

## Refactoring Steps
1. Extract interface/types
2. Create new implementation
3. Run tests (should still pass)
4. Swap old â†’ new
5. Run tests again
6. Remove old implementation
7. Update documentation

## Safety Checks
- [ ] No behavior changes (tests prove it)
- [ ] No new dependencies introduced
- [ ] Performance unchanged or improved
- [ ] All callers updated

## Verification
\\\ash
npm run typecheck && npm run test -- [module].test.ts
\\\
