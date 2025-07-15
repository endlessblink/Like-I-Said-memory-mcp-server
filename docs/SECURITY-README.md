# Security Enhancements for Dashboard Launcher

## Quick Start

The secure dashboard launcher (`dashboard-launcher-secure-v2.cjs`) addresses critical command injection vulnerabilities found in the original launchers.

### Usage
```bash
# Run the secure launcher
node dashboard-launcher-secure-v2.cjs

# Or make it executable and run directly
chmod +x dashboard-launcher-secure-v2.cjs
./dashboard-launcher-secure-v2.cjs
```

### Testing Security
```bash
# Run security test suite
node scripts/test-security-fixes.js
```

## Key Security Improvements

### 1. **Command Injection Prevention**
- Replaced `exec()` with `execFile()` - no shell interpolation
- URL validation restricts to localhost only
- Direct argument passing instead of string concatenation

### 2. **Input Validation**
- **URLs**: Only `http://localhost`, `http://127.0.0.1`, or `http://[::1]` allowed
- **Paths**: Character whitelist, length limits, traversal prevention
- **Ports**: Range validation (1024-65535), integer-only

### 3. **Process Security**
- Minimal environment inheritance
- Only whitelisted environment variables passed to child processes
- Process isolation with proper user/group IDs

### 4. **Safe Browser Opening**
```javascript
// OLD (Vulnerable)
exec(`start "" "${url}"`);  // Command injection possible

// NEW (Secure)
execFile('cmd.exe', ['/c', 'start', '', url], {
  timeout: 5000
});  // No shell interpolation
```

## Security Comparison

| Feature | Original | Secure v2 |
|---------|----------|-----------|
| Browser Opening | `exec()` with string interpolation | `execFile()` with array args |
| URL Validation | None | Localhost-only whitelist |
| Path Validation | Basic | Full sanitization + traversal prevention |
| Environment | Full inheritance | Whitelisted variables only |
| Port Validation | None | Range and type checking |
| Log Injection | Possible | Prevented with sanitization |
| Command Timeout | None | 5-second timeout |

## Attack Scenarios Prevented

### 1. Command Injection via URL
```bash
# Attack attempt:
URL: http://localhost:3001"; rm -rf /; echo "

# Result: Rejected - Invalid URL
```

### 2. Path Traversal
```bash
# Attack attempt:
Memory Path: ../../../etc/passwd

# Result: Rejected - Path traversal detected
```

### 3. Environment Variable Injection
```bash
# Attack attempt:
export EVIL_VAR="malicious"

# Result: Variable not passed to child process
```

## Migration Guide

To use the secure launcher instead of the original:

1. **Replace** any existing launcher with `dashboard-launcher-secure-v2.cjs`
2. **Update** any scripts that call the launcher
3. **Test** with the security test suite
4. **Monitor** logs for any validation failures

## Validation Rules

### URL Validation
- Protocol: `http://` only
- Hosts: `localhost`, `127.0.0.1`, `[::1]`
- No external URLs allowed

### Path Validation
- Allowed characters: `[a-zA-Z0-9_\-./\\: ]`
- Maximum length: 260 characters
- No directory traversal (`../`)
- No null bytes

### Port Validation
- Range: 1024-65535
- Must be integer
- No privileged ports

## Best Practices

1. **Always validate user input** before using in system commands
2. **Use `execFile()` or `spawn()`** instead of `exec()`
3. **Whitelist allowed values** rather than blacklisting dangerous ones
4. **Implement timeouts** for all external commands
5. **Log validation failures** for security monitoring
6. **Fail securely** - deny by default

## Security Resources

- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)

## Support

For security concerns or questions:
- Review: `/docs/SECURITY-COMMAND-INJECTION-FIXES.md`
- Test: `node scripts/test-security-fixes.js`
- Report: Create an issue with security label