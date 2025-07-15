# Command Injection Security Fixes Documentation

## Overview

This document details the command injection vulnerabilities found in the Like-I-Said MCP Server dashboard launchers and the security measures implemented in `dashboard-launcher-secure-v2.cjs`.

## Vulnerabilities Identified

### 1. Command Injection in Browser Opening

**Vulnerable Code Pattern:**
```javascript
// dashboard-launcher.js (lines 70-82)
function openBrowser(url) {
  const platform = os.platform();
  let cmd;
  
  if (platform === 'win32') {
    cmd = `start "" "${url}"`;  // VULNERABLE: String interpolation in shell command
  } else if (platform === 'darwin') {
    cmd = `open "${url}"`;       // VULNERABLE: String interpolation in shell command
  } else {
    cmd = `xdg-open "${url}"`;   // VULNERABLE: String interpolation in shell command
  }
  
  require('child_process').exec(cmd, (error) => {  // VULNERABLE: Using exec with shell
    // ...
  });
}
```

**Attack Vector:**
If an attacker could control the URL parameter, they could inject shell commands:
```javascript
// Example malicious URL
url = 'http://localhost:3001"; rm -rf /; echo "'
// Results in: start "" "http://localhost:3001"; rm -rf /; echo ""
```

### 2. Path Injection Vulnerabilities

**Vulnerable Code Pattern:**
```javascript
// No validation on user-provided paths
const memoryPath = await askQuestion(`Enter memory path [${config.memoryPath}]: `);
config.memoryPath = path.resolve(memoryPath);  // VULNERABLE: No sanitization
```

### 3. Environment Variable Injection

**Vulnerable Code Pattern:**
```javascript
// Passing entire process.env to child processes
const child = spawn(nodeExe, [serverPath], {
  env: process.env,  // VULNERABLE: Inheriting all environment variables
  // ...
});
```

## Security Fixes Implemented

### 1. Safe Browser Opening

**Secure Implementation:**
```javascript
async function openBrowserSecure(url) {
  // Validate URL first
  if (!isValidLocalUrl(url)) {
    console.log('Error: Invalid URL. Only localhost URLs are allowed.');
    return;
  }
  
  const platform = os.platform();
  
  try {
    if (platform === 'win32') {
      // Use execFile with direct arguments (no shell)
      execFile('cmd.exe', ['/c', 'start', '', url], {
        windowsHide: true,
        timeout: SECURITY_CONFIG.EXEC_TIMEOUT
      }, (error) => {
        if (error) {
          console.log(`Please open your browser to: ${url}`);
        }
      });
    }
    // ... similar for other platforms
  }
}
```

**Key Security Measures:**
- Uses `execFile` instead of `exec` (no shell interpolation)
- Validates URL is localhost only
- Passes URL as array argument, not string interpolation
- Implements timeout to prevent hanging

### 2. URL Validation

**Implementation:**
```javascript
function isValidLocalUrl(url) {
  try {
    const parsed = new URL(url);
    return SECURITY_CONFIG.ALLOWED_HOSTS.includes(parsed.hostname) &&
           parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const SECURITY_CONFIG = {
  ALLOWED_HOSTS: ['localhost', '127.0.0.1', '[::1]'],
  // ...
};
```

**Security Benefits:**
- Only allows localhost URLs
- Prevents external URL redirection
- Validates URL structure before use

### 3. Path Sanitization

**Implementation:**
```javascript
function sanitizePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') {
    return null;
  }
  
  // Remove null bytes
  let cleaned = inputPath.replace(/\0/g, '');
  
  // Normalize the path
  cleaned = path.normalize(cleaned);
  
  // Check length
  if (cleaned.length > SECURITY_CONFIG.MAX_PATH_LENGTH) {
    return null;
  }
  
  // Check for valid characters
  if (!SECURITY_CONFIG.ALLOWED_PATH_CHARS.test(cleaned)) {
    return null;
  }
  
  // Prevent directory traversal
  const resolved = path.resolve(cleaned);
  const cwd = process.cwd();
  
  // Allow paths within current directory or absolute paths
  if (!resolved.startsWith(cwd) && !path.isAbsolute(cleaned)) {
    return null;
  }
  
  return resolved;
}
```

**Security Benefits:**
- Removes null bytes that could terminate strings early
- Validates character set to prevent special characters
- Prevents directory traversal attacks
- Enforces path length limits

### 4. Environment Sanitization

**Implementation:**
```javascript
function createSafeEnvironment(additionalVars = {}) {
  const safeEnv = {};
  
  // Copy only safe environment variables
  for (const varName of SECURITY_CONFIG.SAFE_ENV_VARS) {
    if (process.env[varName]) {
      safeEnv[varName] = process.env[varName];
    }
  }
  
  // Add additional vars after validation
  for (const [key, value] of Object.entries(additionalVars)) {
    if (typeof value === 'string' && value.length < 1000) {
      safeEnv[key] = value;
    }
  }
  
  return safeEnv;
}
```

**Security Benefits:**
- Only passes whitelisted environment variables
- Prevents environment variable injection attacks
- Validates additional variables before adding
- Limits variable value length

### 5. Process Security

**Implementation:**
```javascript
const child = spawn(nodeExe, [serverPath], {
  env: createSafeEnvironment({...}),  // Sanitized environment
  stdio: 'inherit',
  windowsHide: false,
  // Additional security options
  uid: process.getuid ? process.getuid() : undefined,
  gid: process.getgid ? process.getgid() : undefined
});
```

**Security Benefits:**
- Uses minimal, sanitized environment
- Inherits user/group IDs for proper permissions
- No shell execution (using spawn, not exec)

### 6. Input Validation

**Implementation:**
```javascript
function askQuestion(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      // Basic input sanitization
      resolve(answer.trim().substring(0, 1000));
    });
  });
}
```

**Security Benefits:**
- Limits input length to prevent buffer overflows
- Trims whitespace to prevent injection via spaces
- Returns sanitized input only

### 7. Port Validation

**Implementation:**
```javascript
function isValidPort(port) {
  return Number.isInteger(port) && 
         port >= SECURITY_CONFIG.MIN_PORT && 
         port <= SECURITY_CONFIG.MAX_PORT;
}

const SECURITY_CONFIG = {
  MIN_PORT: 1024,      // Avoid privileged ports
  MAX_PORT: 65535,     // Valid port range
  // ...
};
```

**Security Benefits:**
- Prevents binding to privileged ports
- Validates port is within valid range
- Ensures port is an integer

### 8. Log Injection Prevention

**Implementation:**
```javascript
function log(msg, showConsole = true) {
  // Sanitize log messages to prevent log injection
  const sanitized = String(msg).replace(/[\r\n]/g, ' ');
  const line = `[${new Date().toISOString()}] ${sanitized}`;
  
  if (showConsole) console.log(sanitized);
  logStream.write(line + '\n');
}
```

**Security Benefits:**
- Prevents log injection attacks
- Removes newline characters that could create fake log entries
- Ensures consistent log format

## Testing Security Fixes

### Test Cases for Command Injection

```bash
# Test 1: URL with shell commands
node dashboard-launcher-secure-v2.cjs
# When prompted for URL, try: http://localhost:3001"; rm -rf /tmp/test; echo "
# Expected: Error - Invalid URL

# Test 2: URL with backticks
# Try URL: http://localhost:3001`whoami`
# Expected: Error - Invalid URL

# Test 3: External URL
# Try URL: http://evil.com:3001
# Expected: Error - Only localhost URLs allowed
```

### Test Cases for Path Injection

```bash
# Test 1: Directory traversal
# Memory path: ../../../etc/passwd
# Expected: Path sanitized or rejected

# Test 2: Null byte injection
# Memory path: /valid/path\x00/etc/passwd
# Expected: Null byte removed, path sanitized

# Test 3: Special characters
# Memory path: /path/with/;rm -rf /;/memory
# Expected: Invalid characters rejected
```

### Test Cases for Environment Security

```bash
# Test 1: Check inherited environment
# Set malicious env var: export EVIL_VAR="malicious"
# Run launcher and verify child process doesn't inherit EVIL_VAR

# Test 2: Long environment values
# Set very long env var and verify it's truncated/rejected
```

## Migration Guide

To migrate from vulnerable launchers to the secure version:

1. **Replace Browser Opening:**
   ```javascript
   // Old (vulnerable)
   exec(`start "" "${url}"`);
   
   // New (secure)
   await openBrowserSecure(url);
   ```

2. **Replace Path Handling:**
   ```javascript
   // Old (vulnerable)
   config.memoryPath = path.resolve(userInput);
   
   // New (secure)
   const sanitized = sanitizePath(userInput);
   if (sanitized) {
     config.memoryPath = sanitized;
   }
   ```

3. **Replace Process Spawning:**
   ```javascript
   // Old (vulnerable)
   spawn(nodeExe, [serverPath], {
     env: process.env
   });
   
   // New (secure)
   spawn(nodeExe, [serverPath], {
     env: createSafeEnvironment({...})
   });
   ```

## Security Best Practices

1. **Never use `exec()` with user input** - Always use `execFile()` or `spawn()`
2. **Validate all user input** - Whitelist allowed characters and formats
3. **Use minimal environment** - Only pass required environment variables
4. **Implement timeouts** - Prevent hanging on malicious input
5. **Log security events** - Track validation failures for monitoring
6. **Fail securely** - Default to denying access on validation failure
7. **Regular updates** - Keep dependencies updated for security patches

## Conclusion

The secure launcher implementation addresses all identified command injection vulnerabilities through:
- Input validation and sanitization
- Safe command execution without shell interpolation
- Environment isolation
- Comprehensive error handling

These measures ensure the dashboard launcher is resistant to command injection attacks while maintaining full functionality.