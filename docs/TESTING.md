# Comprehensive Testing Guide for Like-I-Said MCP Server v2

## Overview

This project uses comprehensive testing across multiple categories to ensure reliability across all platforms, installation methods, and MCP clients. This guide covers all testing scenarios from unit tests to platform-specific validation.

## Quick Test Commands

```bash
# Run all tests
npm test                  # Jest unit tests
npm run test:all          # All automated tests
npm run test:coverage     # Coverage report

# Run specific test categories
npm run test:api          # API endpoint tests
npm run test:ui           # UI layout tests  
npm run test:syntax       # TypeScript validation
npm run test:websocket    # WebSocket reconnection tests
npm run test:pre-push     # Pre-commit validation
npm run test:integration  # Full integration tests

# Test specific components
npm run test:watch        # Watch mode for development
npm run test:mcp         # MCP server functionality
npm run test:dashboard    # Dashboard startup
```

## Test Categories

### 1. Unit Tests (`npm test`)
**Framework**: Jest  
**Location**: `tests/` directory  
**Config**: `jest.config.cjs`

#### Coverage Areas:
- Memory storage operations
- Task management functions  
- Path parsing and validation
- Mock data detection patterns
- Component rendering (React)
- API service functions
- Windows path handling
- Task ID validation

#### Running Unit Tests:
```bash
# Run all unit tests
npm test

# Run specific test file
npm test windows-path-handling.test.js

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### 2. Integration Tests

#### Full System Integration
```bash
# Test complete system
node tests/test-complete-system.js

# Test MCP server startup
node tests/test-mcp-server-startup.js

# Test dashboard startup
node tests/test-dashboard-startup.js

# Test everything works together
node tests/test-everything-works.js
```

#### API Integration Tests
```bash
# Test API endpoints
node tests/api-integration-test.js

# Test UI-API connection
node tests/test-ui-api-connection.js

# Test WebSocket reconnection
node tests/websocket-reconnection-test.js
```

### 3. Platform-Specific Testing

#### Windows Testing
```bash
# Windows-specific tests
npm run test:windows

# Test Windows path handling
npm test windows-path-handling.test.js

# WSL compatibility check
node scripts/test-platform-detection.js
```

**Windows Test Checklist:**
- [ ] Path handling with drive letters (C:\, D:\)
- [ ] Case-insensitive paths
- [ ] Spaces in paths
- [ ] UNC paths (\\server\share)
- [ ] WSL interoperability
- [ ] PowerShell script execution
- [ ] Batch file compatibility

#### macOS Testing
```bash
# macOS-specific paths
npm run test:mac

# Test case-sensitive filesystem
node tests/test-mac-paths.js
```

**macOS Test Checklist:**
- [ ] Case-sensitive paths
- [ ] Home directory expansion (~)
- [ ] Application Support paths
- [ ] Permissions (especially for ~/Library)

#### Linux Testing
```bash
# Linux-specific tests
npm run test:linux

# Test permissions
node tests/test-linux-permissions.js
```

### 4. Installation Testing

#### NPX Installation Test
```bash
# Test NPX installation flow
./scripts/test-npx-local.sh

# Test NPX configuration
node scripts/test-npx-config.js

# Simulate Claude Code installation
./scripts/simulate-claude-code.sh
```

**NPX Installation Checklist:**
- [ ] Package downloads correctly
- [ ] Dependencies install
- [ ] Configuration files created
- [ ] MCP server starts
- [ ] Dashboard accessible
- [ ] Memory/task paths configured

#### Fresh Installation Test
```bash
# Clean environment test
rm -rf test-local-install
npm run test:fresh-install

# Test custom path installation
node scripts/test-custom-path.js

# Comprehensive custom path test
node scripts/test-custom-path-comprehensive.js
```

**Installation Test Scenarios:**
1. **Default Installation**
   - Standard paths
   - Default configuration
   - No existing data

2. **Custom Path Installation**
   - User-specified memory path
   - User-specified task path
   - Non-standard directories

3. **Upgrade Installation**
   - Existing configuration
   - Data migration
   - Backward compatibility

### 5. Manual Testing Checklist

#### Pre-Release Checklist
- [ ] **MCP Server**
  - [ ] All 27 tools appear in Claude
  - [ ] Memory creation works
  - [ ] Task creation works
  - [ ] Search functionality
  - [ ] Auto-linking between memories and tasks

- [ ] **Dashboard**
  - [ ] Loads at http://localhost:3002
  - [ ] Real-time WebSocket updates
  - [ ] Memory cards display correctly
  - [ ] Task management works
  - [ ] Search and filters work
  - [ ] Theme switching
  - [ ] Export/Import functionality

- [ ] **Installation**
  - [ ] NPX installation completes
  - [ ] Manual installation works
  - [ ] Claude Desktop configuration
  - [ ] Claude Code configuration
  - [ ] IDE configurations (Cursor, Windsurf)

- [ ] **Cross-Platform**
  - [ ] Windows 10/11
  - [ ] macOS (Intel and Apple Silicon)
  - [ ] Linux (Ubuntu, Debian)
  - [ ] WSL2

#### Dashboard Manual Tests
1. **Memory Operations**
   - Create new memory
   - Edit existing memory
   - Delete memory
   - Bulk operations
   - Search memories
   - Filter by project/category

2. **Task Operations**
   - Create task
   - Update task status
   - Add subtasks
   - Link to memories
   - Delete task
   - View task hierarchy

3. **UI/UX Tests**
   - Theme switching (light/dark)
   - Responsive design (mobile/tablet)
   - Keyboard shortcuts
   - Loading states
   - Error handling
   - Toast notifications

### 6. Performance Testing

```bash
# Load testing
npm run test:load

# Memory performance with large datasets
node tests/test-memory-performance.js

# Dashboard rendering performance
npm run test:ui-performance
```

**Performance Benchmarks:**
- Memory operations: < 100ms
- Task operations: < 100ms
- Dashboard load: < 2 seconds
- WebSocket latency: < 50ms
- Search response: < 200ms

### 7. Security Testing

```bash
# Security validation
npm run test:security

# Path traversal prevention
node tests/test-path-security.js

# Authentication tests (if enabled)
npm run test:auth
```

**Security Checklist:**
- [ ] Path traversal prevention
- [ ] Input sanitization
- [ ] XSS prevention
- [ ] CORS configuration
- [ ] Authentication (when enabled)
- [ ] Rate limiting

### 8. Regression Testing

```bash
# Run regression suite
npm run test:regression

# Test specific bug fixes
node tests/mcp-server-regression.test.js
node tests/react-import-regression.test.js
```

**Key Regression Tests:**
- Mock data detection fix
- React import issues
- Path validation bugs
- WebSocket reconnection
- Task ID validation

### 9. Test Results and Known Issues

#### Current Test Status (v2.8.10)
- ✅ **Unit Tests**: 15/15 passing
- ✅ **Integration Tests**: All passing
- ✅ **Windows Tests**: Fully compatible
- ✅ **NPX Installation**: Working
- ✅ **Custom Paths**: Supported

#### Known Issues and Workarounds

1. **WSL File System**
   - Issue: Phantom directories in WSL
   - Workaround: Use native Windows paths when possible

2. **Port Conflicts**
   - Issue: Dashboard port 3002 may be in use
   - Workaround: Set `PORT=3003 npm run start:dashboard`

3. **Ollama Optional Dependency**
   - Issue: Ollama client may fail to load
   - Resolution: Optional dependency, doesn't affect core functionality

### 10. Continuous Testing

#### Pre-Commit Hooks
```bash
# Setup pre-commit hooks
./scripts/setup-git-hooks.sh

# Manual pre-push validation
npm run test:pre-push
```

#### Automated Testing
```bash
# Setup continuous testing
./scripts/setup-automated-testing.sh

# Run continuous test monitor
node scripts/continuous-testing.js
```

#### GitHub Actions (if configured)
- Runs on every push
- Tests all platforms
- Validates build process
- Checks code quality

### 11. Debugging Test Failures

#### Common Issues and Solutions

1. **Test Timeout**
   ```bash
   # Increase timeout
   jest --testTimeout=20000
   ```

2. **Mock Detection Failures**
   ```bash
   # Clear test cache
   npm run test:clear-cache
   ```

3. **Path-related Failures**
   ```bash
   # Check path configuration
   node scripts/verify-path-parsing.js
   ```

4. **WebSocket Connection Issues**
   ```bash
   # Test WebSocket separately
   node tests/websocket-reconnection-test.js
   ```

### 12. Test Development

#### Adding New Tests

1. **Unit Tests**: Add to `tests/` directory
2. **Integration Tests**: Add to `tests/` with descriptive names
3. **Platform Tests**: Add to appropriate section in `tests/`

#### Test File Naming Convention
- Unit tests: `*.test.js`
- Integration tests: `*-integration.test.js`
- Platform tests: `*-platform.test.js`
- UI tests: `*-ui.test.js`

#### Test Structure
```javascript
describe('Component/Feature Name', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something specific', () => {
    // Test implementation
    expect(result).toBe(expected);
  });
});
```

## Test Coverage Requirements

### Minimum Coverage Targets
- Overall: 70%
- Critical paths: 90%
- New features: 80%
- Bug fixes: 100% (test for regression)

### Coverage Reports
```bash
# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

## Troubleshooting Test Issues

### Environment Setup
```bash
# Verify Node version (16+ required)
node --version

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear test cache
npm run test:clear-cache
```

### Debug Mode
```bash
# Run tests in debug mode
NODE_ENV=test DEBUG=* npm test

# Run specific test with debugging
node --inspect tests/test-file.js
```

### Test Isolation
```bash
# Run tests in band (no parallelization)
npm test -- --runInBand

# Run single test file
npm test -- --testPathPattern=specific-test
```

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing React Components](https://testing-library.com/docs/react-testing-library/intro/)
- [MCP Testing Guide](https://modelcontextprotocol.io/docs/testing)
- Project-specific test utilities: `tests/test-utils.js`

---

For questions or issues with testing, please refer to the [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) guide or open an issue on GitHub.