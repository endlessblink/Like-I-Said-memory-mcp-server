# Secure Launcher Integration Guide

## Quick Start

The new `dashboard-launcher-secure-v4.cjs` is a drop-in replacement for existing launchers with enhanced security features.

### Basic Usage

```bash
# Direct execution
node dashboard-launcher-secure-v4.cjs

# Or if made executable
./dashboard-launcher-secure-v4.cjs
```

### Integration Steps

1. **Update package.json scripts** (if needed):
```json
{
  "scripts": {
    "dashboard": "node dashboard-launcher-secure-v4.cjs",
    "start:dashboard": "node dashboard-launcher-secure-v4.cjs"
  }
}
```

2. **Update any automation scripts** that reference old launchers:
```bash
# Old
node dashboard-launcher-complete.cjs

# New
node dashboard-launcher-secure-v4.cjs
```

3. **Environment Variables** (optional):
```bash
# Enable debug output
DEBUG_LAUNCHER=true node dashboard-launcher-secure-v4.cjs

# All existing environment variables still work
PORT=3005 node dashboard-launcher-secure-v4.cjs
```

## Key Improvements

### 1. Mutex-Based Port Detection
- Prevents multiple processes from claiming the same port
- Automatic cleanup of stale locks
- Zero configuration required

### 2. Enhanced Security
- Port range validation (3001-65535)
- Rate limiting on port checks
- Secure file operations
- Environment sanitization

### 3. Better Error Handling
- Detailed logging with timestamps
- Graceful shutdown
- Automatic recovery from failures

### 4. Performance
- Minimal overhead (~500ms total)
- Efficient port scanning
- Smart health checking

## Testing

### Run Concurrent Process Test
```bash
node test-concurrent-launch.js
```

Expected output:
```
🧪 Testing concurrent launcher execution...

Starting process 1...
Starting process 2...
Starting process 3...
Starting process 4...
Starting process 5...

📊 Results Analysis:
===================

Processes spawned: 5
Successful port allocations: 5
Unique ports allocated: 5
Ports: 3001, 3002, 3003, 3004, 3005

✅ Test Results:
  Port conflict prevention: ✅ PASSED
  Mutex implementation: ✅ WORKING
  All processes completed: ✅ YES
```

### Manual Testing
```bash
# Terminal 1
./dashboard-launcher-secure-v4.cjs

# Terminal 2 (while Terminal 1 is running)
./dashboard-launcher-secure-v4.cjs
# Should automatically find next available port
```

## Troubleshooting

### Lock Files
If you see lock-related errors:
```bash
# Check for stale locks
ls -la /tmp/like-i-said-locks/

# Remove stale lock (if needed)
rm /tmp/like-i-said-locks/port-detection.lock
```

### Debug Mode
Enable detailed logging:
```bash
DEBUG_LAUNCHER=true ./dashboard-launcher-secure-v4.cjs
```

### Log Files
Check logs for detailed information:
```bash
# View latest log
ls -lt logs/dashboard-secure-*.log | head -1

# Follow log in real-time
tail -f logs/dashboard-secure-*.log
```

## Backward Compatibility

The secure launcher maintains 100% backward compatibility:

- ✅ Same command-line interface
- ✅ Same environment variables
- ✅ Same output format
- ✅ Same browser auto-open behavior
- ✅ Same server detection logic

## Security Considerations

1. **Never run as root** - Not required and not recommended
2. **Localhost only** - Binds only to 127.0.0.1
3. **No external dependencies** - Uses only Node.js built-ins
4. **Secure defaults** - Production mode, debug disabled

## Deployment Checklist

- [ ] Replace old launcher files with secure version
- [ ] Update package.json scripts if needed
- [ ] Test concurrent execution with test script
- [ ] Verify logs directory has proper permissions
- [ ] Document any custom port ranges in use
- [ ] Update team documentation/wikis

## Support

For issues or questions:
1. Check the debug logs first
2. Run the concurrent test script
3. Review NETWORKING-SECURITY-V4.md for details
4. File an issue with log output if needed