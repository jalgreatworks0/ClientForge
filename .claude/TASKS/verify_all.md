# Task: Verify All Systems

Run full verification suite to ensure system health.

## Commands
\\\ash
npm run typecheck
npm run lint
npm run test -- --runInBand
npm run errors:check
\\\

## Expected Output
- TypeScript: 0 errors
- ESLint: 0 errors, 0 warnings
- Jest: All tests passing
- Error system: All error IDs registered

## If Failures
1. TypeScript errors â†’ Fix types
2. ESLint errors â†’ Run \
pm run lint -- --fix\
3. Test failures â†’ Debug failing tests
4. Error check failures â†’ Register missing error IDs

## VS Code Task
Press \Ctrl+Shift+B\ to run "Project: Full Verify"
