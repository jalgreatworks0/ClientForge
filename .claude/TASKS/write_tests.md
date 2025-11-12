# Task: Write Tests

Template for writing comprehensive tests.

## Test Structure (AAA Pattern)
\\\	ypescript
describe('Module/Function', () => {
  // Arrange
  beforeEach(() => {
    // Setup
  });

  it('should do X when Y', async () => {
    // Arrange
    const input = {};

    // Act
    const result = await functionUnderTest(input);

    // Assert
    expect(result).toBeDefined();
  });
});
\\\

## Coverage Requirements
- **Unit tests:** >80% line coverage
- **Integration tests:** All API endpoints
- **E2E tests:** Critical user flows

## Test Types
1. **Happy path:** Normal usage
2. **Edge cases:** Boundary values
3. **Error cases:** Invalid inputs
4. **Async:** Promise rejection handling

## Run Tests
\\\ash
npm run test -- [file].test.ts --watch
\\\

## VS Code
- Run current file: \Ctrl+Alt+J\
- Debug current file: Select "Jest: Current File" in debugger
