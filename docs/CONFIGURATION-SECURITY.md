# Configuration Security Documentation

## Overview

The `dashboard-launcher-secure-v3.cjs` implements comprehensive security measures for configuration handling in the Like-I-Said MCP Server dashboard. This document details all security enhancements and best practices implemented.

## Security Measures Implemented

### 1. JSON Parsing Security

#### Protected JSON Parsing Function
```javascript
function parseJsonSecure(jsonString, description = 'JSON') {
  // Input validation
  // Size limits (1MB max)
  // Type checking
  // Error handling with graceful fallback
}
```

**Features:**
- Input type validation (must be string)
- Empty string detection
- Size limit enforcement (1MB max)
- Ensures parsed result is an object (not array, null, etc.)
- Comprehensive error handling with descriptive messages
- Returns structured result with success/error status

**Protection Against:**
- JSON parsing exceptions crashing the application
- Malformed JSON causing undefined behavior
- Large JSON payloads causing memory issues
- Type confusion attacks

### 2. Configuration Validation

#### Schema-Based Validation
```javascript
const CONFIG_SCHEMA = {
  memoryPath: {
    type: 'string',
    required: true,
    validate: (value) => {
      // Custom validation logic
      // Path traversal prevention
      // Type checking
    }
  },
  // ... other fields
}
```

**Features:**
- Type checking for all configuration fields
- Required field enforcement
- Custom validation functions per field
- Path traversal attack prevention (`..` detection)
- Port range validation (1-65535)
- Enum validation for log levels
- ISO date format validation
- Default value assignment for optional fields

**Validation Rules:**
- **memoryPath/taskPath**: No parent directory references, non-empty strings
- **preferredPort**: Integer between 1 and 65535
- **logLevel**: Must be one of: debug, info, warn, error
- **autoOpenBrowser**: Boolean type enforcement
- **lastUsed**: Valid ISO date string format

### 3. Atomic File Operations

#### Write-Rename Pattern
```javascript
// 1. Write to temporary file
fs.writeFileSync(tempFile, finalJson, { mode: 0o600 });

// 2. Verify temporary file
const verifyContent = fs.readFileSync(tempFile, 'utf8');

// 3. Atomic rename
fs.renameSync(tempFile, CONFIG_FILE);
```

**Features:**
- Write to temporary file first
- Verify written content before commit
- Atomic rename operation (instant switch)
- Backup creation before modifications
- Rollback capability on failure
- File permission setting (0600 - owner read/write only)

#### File Locking Mechanism
```javascript
function acquireLock(timeout = 5000) {
  // Create lock file with process info
  // Timeout handling for stale locks
  // Process identification
}
```

**Lock File Contents:**
```json
{
  "pid": 12345,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "host": "workstation-01"
}
```

**Features:**
- Prevents concurrent configuration modifications
- Automatic stale lock removal after timeout
- Process and host identification
- Graceful handling of lock conflicts

### 4. Configuration Integrity

#### Checksum Verification
```javascript
{
  "memoryPath": "/path/to/memories",
  "taskPath": "/path/to/tasks",
  "_metadata": {
    "version": "2.4.5-secure-v3",
    "checksum": "sha256-hash-of-config"
  }
}
```

**Features:**
- SHA-256 checksum for configuration integrity
- Detects unauthorized modifications
- Version tracking for compatibility
- Backward compatibility (allows configs without checksum)

### 5. Secure File Permissions

**Unix/Linux Systems:**
- Configuration files: 0600 (owner read/write only)
- Prevents other users from reading sensitive configuration

**Windows Systems:**
- Standard file permissions apply
- Graceful handling when chmod not available

### 6. Error Recovery

#### Backup and Restore
```javascript
// Before modification
fs.copyFileSync(CONFIG_FILE, CONFIG_BACKUP_FILE);

// On failure
if (error) {
  fs.copyFileSync(CONFIG_BACKUP_FILE, CONFIG_FILE);
}
```

**Features:**
- Automatic backup before changes
- Restore capability on save failure
- Preserves last known good configuration

### 7. Input Sanitization

#### Path Sanitization
```javascript
// Normalize and validate paths
const normalized = path.normalize(value);
if (normalized.includes('..')) {
  return 'Path cannot contain parent directory references';
}
```

**Protection Against:**
- Directory traversal attacks
- Path injection
- Symbolic link attacks

### 8. Secure Defaults

```javascript
const DEFAULT_CONFIG = {
  memoryPath: path.join(process.cwd(), 'memories'),
  taskPath: path.join(process.cwd(), 'tasks'),
  autoOpenBrowser: true,
  preferredPort: 3001,
  logLevel: 'info',
  lastUsed: null
};
```

**Features:**
- Safe default values for all settings
- Relative to current working directory
- No external network access by default
- Conservative permission model

## Security Best Practices

### 1. Configuration Access

- **Read Operations**: Always acquire lock before reading
- **Write Operations**: Use atomic write pattern with verification
- **Concurrent Access**: File locking prevents race conditions

### 2. Error Handling

- **Graceful Degradation**: Fall back to defaults on errors
- **No Information Disclosure**: Generic error messages to users
- **Detailed Logging**: Security events logged with context

### 3. Validation Workflow

1. Parse JSON with size and type limits
2. Validate against schema
3. Apply custom validation rules
4. Normalize values (paths, etc.)
5. Verify final configuration

### 4. Security Logging

```javascript
log('SECURITY', 'Configuration integrity verified');
log('SECURITY', 'Secure file permissions set');
```

**Logged Events:**
- Configuration loading/saving
- Validation failures
- Lock acquisition/release
- Permission changes
- Integrity check results

## Usage Examples

### Secure Configuration Loading
```javascript
const config = loadConfig();
// Automatically handles:
// - Lock acquisition
// - Secure JSON parsing
// - Schema validation
// - Integrity verification
// - Fallback to defaults
```

### Secure Configuration Saving
```javascript
if (saveConfig(config)) {
  console.log('Configuration saved securely');
} else {
  console.log('Failed to save configuration');
  // Original configuration preserved
}
```

### Manual Validation
```javascript
const validation = validateConfig(userInput);
if (validation.valid) {
  // Use validation.config (normalized values)
} else {
  // Show validation.errors to user
}
```

## Testing Security Features

### 1. Malformed JSON Test
```bash
echo '{"invalid json}' > dashboard-config.json
node dashboard-launcher-secure-v3.cjs
# Should load defaults without crashing
```

### 2. Large File Test
```bash
# Create 2MB JSON file
node -e "console.log(JSON.stringify({data: 'x'.repeat(2097152)}))" > dashboard-config.json
node dashboard-launcher-secure-v3.cjs
# Should reject as too large
```

### 3. Path Traversal Test
```javascript
// Try to set memory path to parent directories
config.memoryPath = "../../../etc/passwd"
// Validation should fail
```

### 4. Concurrent Access Test
```bash
# Run two instances simultaneously
node dashboard-launcher-secure-v3.cjs &
node dashboard-launcher-secure-v3.cjs &
# Lock mechanism should prevent conflicts
```

## Security Checklist

- [x] All JSON.parse operations wrapped in try-catch
- [x] Input validation for all configuration values
- [x] Path traversal attack prevention
- [x] Size limits on configuration files
- [x] Atomic file write operations
- [x] File locking for concurrent access
- [x] Configuration integrity verification
- [x] Secure file permissions (Unix/Linux)
- [x] Backup and restore mechanism
- [x] Comprehensive error logging
- [x] Graceful fallback to defaults
- [x] No sensitive data in error messages

## Future Enhancements

1. **Encryption at Rest**: Encrypt sensitive configuration values
2. **Configuration Signing**: Digital signatures for configuration files
3. **Audit Trail**: Complete history of configuration changes
4. **Role-Based Access**: Different permission levels for configuration
5. **Configuration Templates**: Pre-validated configuration templates
6. **Remote Configuration**: Secure remote configuration management

## Conclusion

The secure configuration implementation provides multiple layers of protection against common attacks and failure modes. The system is designed to fail safely, preserving data integrity and application availability even under adverse conditions.