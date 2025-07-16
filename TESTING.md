# Testing Guide for Like-I-Said MCP Server

## Overview

This project uses comprehensive testing to ensure reliability and catch issues before they reach users.

## Test Categories

### 1. Syntax Validation (`npm run test:syntax`)
- Checks TypeScript compilation
- Validates build process
- Detects problematic code patterns
- **Run before every commit**

### 2. API Integration Tests (`npm run test:api`)
- Tests all API endpoints
- Validates data loading
- Checks CORS configuration
- Tests WebSocket connectivity
- **Run after API changes**

### 3. UI Layout Tests (`npm run test:ui`)
- Detects CSS issues (overlapping elements, fixed positioning)
- Checks responsive design
- Validates mobile navigation
- **Run after UI changes**

### 4. WebSocket Reconnection Test (`npm run test:websocket`)
- Tests auto-reconnection on port changes
- Validates connection resilience
- **Run after WebSocket changes**

### 5. Pre-Push Validation (`npm run test:pre-push`)
- Runs critical tests before pushing
- Includes syntax, build, and unit tests
- **Automatically run before git push**

## Running Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific test category
npm run test:api
npm run test:ui
npm run test:syntax

# Run before pushing to GitHub
npm run test:pre-push

# Run all tests
npm run test:all
```

## Adding Tests for New Features

When adding a new feature:

### 1. Create Unit Tests
```javascript
// src/components/NewFeature.test.tsx
describe('NewFeature', () => {
  it('should render correctly', () => {
    // Test rendering
  });
  
  it('should handle user interaction', () => {
    // Test functionality
  });
});
```

### 2. Add Integration Tests
```javascript
// tests/integration/new-feature-integration.js
describe('New Feature Integration', () => {
  it('should work with existing features', async () => {
    // Test integration points
  });
});
```

### 3. Update UI Tests
If your feature adds UI elements:
- Add checks to `ui-layout-test.js`
- Test responsive behavior
- Check for accessibility

### 4. Update API Tests
If your feature adds endpoints:
- Add endpoint tests to `api-integration-test.js`
- Test error cases
- Validate response format

## Common Test Patterns

### Testing API Endpoints
```javascript
await testApiEndpoint('Endpoint Name', '/api/endpoint', expectedStatus);
```

### Testing UI Components
```javascript
// Check for problematic CSS
const problematicPatterns = [
  {
    pattern: /position:\s*fixed.*bottom:\s*0/,
    issue: 'Fixed positioning can overlap taskbar',
    suggestion: 'Add safe area insets'
  }
];
```

### Testing WebSocket
```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.on('message', (data) => {
  // Validate message handling
});
```

## CI/CD Integration

Add to `.github/workflows/test.yml`:
```yaml
- run: npm run test:syntax
- run: npm run test:integration
- run: npm run build
```

## Best Practices

1. **Write tests first** - TDD helps design better APIs
2. **Test edge cases** - Empty data, errors, timeouts
3. **Keep tests fast** - Mock external dependencies
4. **Test one thing** - Each test should verify one behavior
5. **Use descriptive names** - Test names should explain what they verify
6. **Clean up** - Always clean up test data/connections

## Debugging Failed Tests

1. Run test in isolation: `node tests/specific-test.js`
2. Add console.logs to understand flow
3. Check if services are running (API server, etc.)
4. Verify test environment matches production

## Coverage Goals

- **Unit Tests**: 80% code coverage
- **Integration Tests**: All critical paths
- **E2E Tests**: Main user workflows
- **Performance Tests**: Response times < 200ms

## Future Improvements

- [ ] Add Jest for unit testing
- [ ] Add Playwright for E2E testing
- [ ] Add performance benchmarks
- [ ] Add visual regression tests
- [ ] Set up automated CI/CD