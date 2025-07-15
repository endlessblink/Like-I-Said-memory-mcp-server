# Networking Security Documentation - Version 4

## Overview

The `dashboard-launcher-secure-v4.cjs` implements a unified, secure port detection system with comprehensive security measures to prevent race conditions, validate network operations, and ensure safe concurrent execution.

## Security Features

### 1. Unified Port Detection

The system uses a single, reusable `SecurePortDetector` class that:

- **Centralizes all port detection logic** - No duplicate implementations
- **Validates port ranges** - Ensures ports are within allowed bounds (3001-65535)
- **Implements rate limiting** - Minimum 50ms between port checks to prevent rapid scanning
- **Uses secure binding** - Binds only to localhost (127.0.0.1) to prevent external access

```javascript
// Example usage
const detector = new SecurePortDetector();
const port = await detector.findAvailablePort();
```

### 2. Race Condition Prevention

#### Mutex Implementation

The `SecurePortMutex` class provides exclusive locking for port detection:

- **File-based locking** - Uses exclusive file creation (O_EXCL flag)
- **Process identification** - Each lock includes PID, timestamp, and unique ID
- **Stale lock detection** - Automatically removes locks older than 5 seconds
- **Atomic operations** - Ensures only one process can detect ports at a time

```javascript
// Lock structure
{
  pid: 12345,
  processId: "12345-1234567890-abcd1234",
  timestamp: 1642001234567,
  host: "hostname"
}
```

#### Lock Directory

- Location: `$TMPDIR/like-i-said-locks/`
- Permissions: 0o700 (owner read/write/execute only)
- Cleanup: Automatic on shutdown and stale lock removal

### 3. Network Security

#### Port Validation

```javascript
validatePort(port) {
  // Type checking
  if (typeof port !== 'number' || isNaN(port)) {
    throw new Error('Invalid port: must be a number');
  }
  
  // Range validation
  if (port < 3001 || port > 65535) {
    throw new Error('Port outside allowed range');
  }
}
```

#### Timeout Handling

- **Port check timeout**: 200ms per port
- **Server start timeout**: 30 seconds total
- **Health check timeout**: 5 seconds per request
- **Lock acquisition timeout**: 5 seconds

#### Security Headers

The launcher adds security headers when checking server health:

```javascript
headers: {
  'User-Agent': 'dashboard-launcher-secure-v4'
}
```

### 4. Rate Limiting Support

Built-in rate limiting prevents port scanning attacks:

- **Minimum interval**: 50ms between port checks
- **Automatic throttling**: Delays requests if too frequent
- **Configurable limits**: Can be adjusted via CONFIG

### 5. Process Security

#### Environment Sanitization

```javascript
const env = {
  ...process.env,
  PORT: port.toString(),
  NODE_ENV: 'production',
  DEBUG: '',        // Disable debug output
  DEBUG_MCP: ''     // Disable MCP debug output
};
```

#### File Security

- **Symlink protection**: Refuses to execute symlinked server files
- **Path validation**: Only looks for server files in expected locations
- **Secure file operations**: Uses lstat to detect file types

### 6. Error Handling

Comprehensive error handling with:

- **Graceful degradation**: Falls back safely on errors
- **Detailed logging**: All operations logged with timestamps
- **Clean shutdown**: Proper cleanup of locks and processes
- **Uncaught exception handling**: Prevents crashes from leaving locks

## Configuration

All security settings are centralized in the CONFIG object:

```javascript
const CONFIG = {
  // Port configuration
  START_PORT: 3001,
  MAX_PORT: 3100,
  PORT_CHECK_TIMEOUT: 200,
  
  // Security configuration
  ALLOWED_PORT_RANGE: { min: 3001, max: 65535 },
  LOCK_DIR: path.join(os.tmpdir(), 'like-i-said-locks'),
  LOCK_TIMEOUT: 5000,
  
  // Server configuration
  SERVER_START_TIMEOUT: 30000,
  HEALTH_CHECK_INTERVAL: 1000,
  MAX_HEALTH_CHECKS: 30,
  
  // Rate limiting
  MIN_PORT_CHECK_INTERVAL: 50,
  
  // Logging
  LOG_DIR: path.join(process.cwd(), 'logs'),
  ENABLE_DEBUG: process.env.DEBUG_LAUNCHER === 'true'
};
```

## Testing

### Testing Concurrent Processes

```bash
# Terminal 1
node dashboard-launcher-secure-v4.cjs

# Terminal 2 (while Terminal 1 is scanning)
node dashboard-launcher-secure-v4.cjs

# Expected: Terminal 2 waits for Terminal 1 to finish port detection
```

### Testing Stale Lock Recovery

```bash
# Create a stale lock manually
echo '{"pid":99999,"processId":"test","timestamp":1000000000000,"host":"test"}' > /tmp/like-i-said-locks/port-detection.lock

# Run launcher - should detect and remove stale lock
node dashboard-launcher-secure-v4.cjs
```

### Testing Port Range Validation

```javascript
// In Node REPL
const { SecurePortDetector } = require('./dashboard-launcher-secure-v4.cjs');
const detector = new SecurePortDetector();

// Should throw error
detector.validatePort(1000);    // Port too low
detector.validatePort(70000);   // Port too high
detector.validatePort("3001");  // Not a number
```

## Security Best Practices

1. **Never run as root** - The launcher doesn't require elevated privileges
2. **Keep logs secure** - Log directory should have appropriate permissions
3. **Monitor lock directory** - Check for accumulation of stale locks
4. **Update timeouts** - Adjust timeouts based on system performance
5. **Validate inputs** - Always validate port numbers and paths
6. **Use localhost only** - Never bind to 0.0.0.0 for local development tools

## Debugging

Enable debug mode for detailed output:

```bash
DEBUG_LAUNCHER=true node dashboard-launcher-secure-v4.cjs
```

Debug output includes:
- Mutex acquisition/release
- Individual port checks
- Lock file operations
- Detailed timing information

## Migration Guide

To migrate from older launchers:

1. Replace old launcher files with `dashboard-launcher-secure-v4.cjs`
2. Update any scripts that reference old launchers
3. No configuration changes needed - uses same environment variables
4. Old log files remain compatible

## Performance Impact

The security measures have minimal performance impact:

- **Mutex overhead**: ~5-10ms per port scan session
- **Rate limiting**: Adds max 50ms between port checks
- **Validation**: <1ms per port validation
- **Total impact**: Typically <500ms added to startup time

## Future Enhancements

Potential future security improvements:

1. **Cryptographic lock tokens** - Use signed tokens for lock ownership
2. **Network namespace isolation** - Run in isolated network namespace
3. **Capability dropping** - Drop unnecessary Linux capabilities
4. **Audit logging** - Detailed security event logging
5. **TLS support** - HTTPS support for production deployments