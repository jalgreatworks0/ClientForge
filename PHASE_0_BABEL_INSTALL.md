# Phase 0 Babel Fix - Installation Commands

## Current Status
- ✅ babel.config.js created
- ✅ jest.config.js updated (switched to babel-jest)
- ⏳ Need to install Babel packages

## Required Babel Packages

Run this command to install all required Babel dependencies:

```bash
npm install --save-dev \
  babel-jest \
  @babel/core \
  @babel/preset-env \
  @babel/preset-typescript \
  @babel/plugin-proposal-optional-chaining \
  @babel/plugin-proposal-nullish-coalescing-operator \
  @babel/plugin-proposal-class-properties \
  @babel/plugin-proposal-private-methods
```

## What Each Package Does

- **babel-jest**: Jest transformer using Babel
- **@babel/core**: Core Babel compiler
- **@babel/preset-env**: Smart preset for target environments
- **@babel/preset-typescript**: TypeScript support in Babel
- **@babel/plugin-proposal-optional-chaining**: Supports `?.` operator
- **@babel/plugin-proposal-nullish-coalescing-operator**: Supports `??` operator
- **@babel/plugin-proposal-class-properties**: Class properties support
- **@babel/plugin-proposal-private-methods**: Private methods support

## After Installation

1. **Install packages** (command above)
2. **Run tests**: `npm test`
3. **Expected**: Tests should run without SyntaxError
4. **Record baseline**: Note how many tests pass/fail

## Alternative: Simpler ts-jest Configuration

If you prefer to stay with ts-jest (already installed), try this alternative:

### Update jest.config.js back to ts-jest with globals:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'ES2020',
        lib: ['ES2020'],
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    },
  },
  
  // ... rest of config
};
```

## Recommendation

**Try Option 1** (babel-jest) first since:
- More flexible with modern syntax
- Better handling of edge cases
- Explicit plugin support for optional chaining

If that doesn't work, **fall back to Option 2** (ts-jest with globals).

## Next Steps After Fix

Once tests run:
1. Record baseline (e.g., 79/160 passing)
2. Proceed to Phase 1: Fix AuthService tests
3. Continue with Phase 2-3 as planned

---

**Created**: 2025-11-05
**Issue**: Babel parsing strict TypeScript syntax
**Solution**: Install Babel packages + use babel-jest transformer
