# Custom Installation Path Implementation Plan

## Overview
Add support for custom installation paths to the NPX installer, allowing users to specify where Like-I-Said MCP Server should be installed.

## Usage Example
```bash
# Install to specific directory
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path /opt/mcp-servers/like-i-said

# Install to relative path
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path ../shared-tools/mcp
```

## Implementation Steps

### 1. Add Argument Parsing (cli.js)
```javascript
// Add after line 1034
const customPath = process.argv.find((arg, i) => 
  process.argv[i-1] === '--path'
);
const installPath = customPath ? path.resolve(customPath) : process.cwd();
```

### 2. Create Path Resolution Helper
```javascript
// Add new function
function getInstallPath() {
  const pathIndex = process.argv.indexOf('--path');
  if (pathIndex !== -1 && process.argv[pathIndex + 1]) {
    const customPath = process.argv[pathIndex + 1];
    return path.resolve(customPath);
  }
  return process.cwd();
}
```

### 3. Update quickInstall() Function
- Replace all `process.cwd()` with `getInstallPath()`
- Replace all `context.currentDir` with `getInstallPath()`
- Update `projectPath` variable to use `getInstallPath()`

### 4. Update Path Detection
```javascript
// In quickInstall(), around line 649
const installPath = getInstallPath();
const projectPath = context.isNpxInstall ? installPath : context.scriptDir;
```

### 5. Update MCP Client Configurations
- Ensure all configured paths use the custom installation directory
- Update both local file paths and environment variables

### 6. Add Path Validation
```javascript
// Validate path before installation
if (customPath) {
  // Ensure parent directory exists
  const parentDir = path.dirname(installPath);
  if (!fs.existsSync(parentDir)) {
    log(`❌ Parent directory does not exist: ${parentDir}`, 'red');
    process.exit(1);
  }
  
  // Create install directory if needed
  if (!fs.existsSync(installPath)) {
    fs.mkdirSync(installPath, { recursive: true });
    log(`✓ Created installation directory: ${installPath}`, 'green');
  }
}
```

### 7. Update Help Text
Add to the help output:
```
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path /custom/path
```

## Risk Mitigation

### 1. Backward Compatibility
- Default behavior (no --path) remains unchanged
- Existing installations won't be affected

### 2. Cross-Platform Support
- Use `path.resolve()` for all paths
- Convert paths to forward slashes for JSON configs
- Test on Windows, Mac, Linux, WSL

### 3. Error Handling
- Validate paths before installation
- Check write permissions
- Provide clear error messages

### 4. Testing Strategy
```bash
# Test cases
npm test -- --path ./test-install
npm test -- --path /tmp/test-install
npm test -- --path C:\temp\test-install  # Windows
npm test -- --path ../test-install       # Relative path
```

## Implementation Checklist
- [ ] Add --path argument parsing
- [ ] Create getInstallPath() helper
- [ ] Update all process.cwd() references
- [ ] Update all projectPath references
- [ ] Add path validation logic
- [ ] Update help documentation
- [ ] Test on Windows
- [ ] Test on Mac
- [ ] Test on Linux
- [ ] Test on WSL
- [ ] Update README.md
- [ ] Update INSTALLATION.md

## Estimated Time: 2-3 hours
Plus 1-2 hours for comprehensive testing across platforms.