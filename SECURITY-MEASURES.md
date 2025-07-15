# Security Measures - Dashboard Launcher Secure v1

## Overview

The `dashboard-launcher-secure-v1.cjs` file implements comprehensive security measures to prevent path injection attacks while maintaining all existing functionality of the original launcher.

## Security Features Implemented

### 1. Path Injection Protection

The secure launcher implements a robust `secureSanitizePath()` function that validates all user-provided paths against multiple security criteria:

#### Blocked Patterns:
- **Directory Traversal**: `../`, `..\\` patterns are blocked
- **Absolute Paths**: `/etc/passwd`, `C:\Windows\System32`
- **UNC Paths**: `\\server\share` network paths
- **Null Bytes**: `\0` character injection attempts
- **URL Encoding**: `%2F`, `%2E` encoded traversal attempts
- **Special Characters**: `<>"|?*` that could be used for injection

### 2. Path Containment

All paths are validated to ensure they remain within the project directory:
- Paths are resolved to absolute paths
- Relative paths are checked to ensure they don't escape the base directory
- Maximum path depth is limited to 5 levels
- Maximum path length is limited to 260 characters

### 3. Input Sanitization

- Whitespace is trimmed from input
- Empty paths are rejected
- Path components are validated against safe patterns
- Only alphanumeric characters plus `-`, `_`, and `.` are allowed in directory names

## Security Test Results

The launcher includes built-in security tests that validate protection against:

1. Unix path traversal: `../../../etc/passwd` ✅ BLOCKED
2. Windows path traversal: `..\\..\\..\\windows\\system32` ✅ BLOCKED
3. Hidden traversal: `memories/../../../etc/passwd` ✅ BLOCKED
4. Unix absolute paths: `/etc/passwd` ✅ BLOCKED
5. Windows absolute paths: `C:\\Windows\\System32` ✅ BLOCKED
6. UNC paths: `\\\\server\\share` ✅ BLOCKED
7. Null byte injection: `memories\0/etc/passwd` ✅ BLOCKED
8. URL encoding: `memories%2F..%2F..%2Fetc%2Fpasswd` ✅ BLOCKED
9. Command injection: `memories;rm -rf /` ✅ BLOCKED
10. Valid paths: `memories`, `memories/project1` ✅ ALLOWED

## Usage

### Running the Secure Launcher

```bash
# Make executable
chmod +x dashboard-launcher-secure-v1.cjs

# Run with configuration menu
./dashboard-launcher-secure-v1.cjs --config

# Run normally (uses saved config)
./dashboard-launcher-secure-v1.cjs
```

### Testing Security

From the configuration menu (option 6), you can run the built-in security tests to verify all protection measures are working correctly.

### Example Attack Prevention

When a user tries to enter a malicious path:

```
Enter memory path [/home/user/project/memories]: ../../../etc/passwd

❌ Invalid path: Forbidden pattern detected: /\.\./g
🔒 Security: Path must be within project directory and contain only safe characters.
```

## Security Logging

All security events are logged to timestamped files in the `logs/` directory:
- Path validation attempts
- Blocked malicious inputs
- Security test results
- Configuration changes

Log files are named: `dashboard-secure-YYYY-MM-DDTHH-mm-ss-sssZ.log`

## Maintained Functionality

The secure version maintains all original features:
- Automatic port detection
- Memory and task directory configuration
- Browser auto-opening
- Comprehensive memory analysis
- Environment variable support
- Cross-platform compatibility

## Implementation Details

### Security Configuration

```javascript
const SECURITY_CONFIG = {
  maxPathDepth: 5,
  forbiddenPatterns: [
    /\.\./g,           // Parent directory traversal
    /^\//,             // Absolute paths on Unix
    /^[A-Za-z]:\\/,    // Absolute paths on Windows
    /^\\\\+/,          // UNC paths
    /\0/,              // Null bytes
    /%/,               // URL encoding
    /[<>"|?*]/         // Invalid filename characters
  ],
  allowedDirPattern: /^[a-zA-Z0-9\-_.]+$/,
  maxPathLength: 260
};
```

### Validation Process

1. **Input Check**: Verify input is a non-empty string
2. **Length Check**: Ensure path is under 260 characters
3. **Pattern Check**: Test against forbidden patterns
4. **Component Validation**: Validate each path segment
5. **Resolution**: Safely resolve to absolute path
6. **Containment Check**: Ensure path stays within project
7. **Depth Check**: Verify path depth is within limits

## Best Practices

1. Always use the secure launcher for production deployments
2. Regularly check security logs for attempted attacks
3. Keep the launcher updated with latest security patches
4. Use the built-in security tests to verify protection
5. Configure paths through the menu interface rather than editing config files directly

## Security Considerations

While this implementation provides robust protection against path injection attacks, remember:

- This protects the launcher configuration only
- The underlying MCP server should also implement its own security measures
- File system permissions should be properly configured
- The launcher should be run with minimal privileges
- Regular security audits are recommended

## Future Enhancements

Potential future security improvements:
- Rate limiting for configuration attempts
- Audit trail for all path changes
- Integration with OS security features
- Encrypted configuration storage
- Multi-factor authentication for configuration changes