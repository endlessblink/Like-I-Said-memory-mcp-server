# Troubleshooting Guide for Like-I-Said MCP Server v2

## Quick Fixes for Common Issues

### MCP Server Not Starting

**Symptom**: Tools don't appear in Claude, server crashes on startup

**Solutions**:
1. Check Node.js version (requires 16+):
   ```bash
   node --version
   ```

2. Clear and reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. Verify MCP configuration:
   ```bash
   # For Claude Code
   claude mcp list
   
   # Check config file directly
   cat ~/.claude/claude.json
   ```

4. Test MCP server directly:
   ```bash
   npm run test:mcp
   ```

### Dashboard Not Loading

**Symptom**: Can't access dashboard at http://localhost:3002

**Solutions**:
1. Check if port is in use:
   ```bash
   lsof -i :3002
   ```

2. Start with different port:
   ```bash
   PORT=3003 npm run start:dashboard
   ```

3. Verify both servers are running:
   ```bash
   # Start full stack
   npm run dev:full
   ```

4. Check for WebSocket issues:
   ```bash
   # Test WebSocket connection
   node tests/websocket-reconnection-test.js
   ```

## Installation Issues

### NPX Installation Fails

**Symptom**: `npx @endlessblink/like-i-said-v2@latest install` doesn't complete

**Solutions**:
1. Clear NPX cache:
   ```bash
   npx clear-npx-cache
   ```

2. Try manual installation:
   ```bash
   git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
   cd Like-I-Said-memory-mcp-server
   npm install
   node cli.js install
   ```

3. Check network/proxy settings:
   ```bash
   npm config get proxy
   npm config get https-proxy
   ```

### Path Configuration Issues

**Symptom**: "Invalid project path - path traversal attempt detected"

**Solutions**:
1. Use absolute paths:
   ```bash
   # Good
   /home/user/memories
   C:\Users\Name\memories
   
   # Bad
   ./memories
   ../memories
   ```

2. Avoid special characters in paths
3. Check path permissions:
   ```bash
   ls -la /path/to/memories
   ```

## Platform-Specific Issues

### Windows/WSL Issues

**Symptom**: File access errors, phantom directories

**Solutions**:
1. Use Windows paths in WSL:
   ```bash
   # Instead of /mnt/c/Users/...
   # Use C:\Users\... when configuring
   ```

2. Fix line endings:
   ```bash
   dos2unix script-name.sh
   ```

3. Grant full permissions:
   ```powershell
   # In PowerShell as admin
   icacls "C:\path\to\project" /grant Everyone:F /T
   ```

### macOS Permission Issues

**Symptom**: Can't create files in ~/Library

**Solutions**:
1. Grant terminal permissions:
   - System Preferences → Security & Privacy → Privacy → Full Disk Access
   - Add Terminal/VS Code

2. Use alternative path:
   ```bash
   # Instead of ~/Library/Application Support
   mkdir -p ~/.like-i-said
   ```

### Linux Permission Denied

**Symptom**: EACCES errors

**Solutions**:
1. Fix npm permissions:
   ```bash
   mkdir ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   source ~/.bashrc
   ```

2. Change ownership:
   ```bash
   sudo chown -R $(whoami) ~/.like-i-said
   ```

## Memory and Task Issues

### Memories Not Saving

**Symptom**: Created memories disappear

**Solutions**:
1. Check memory directory exists:
   ```bash
   ls -la memories/
   ```

2. Verify write permissions:
   ```bash
   touch memories/test.md
   rm memories/test.md
   ```

3. Check disk space:
   ```bash
   df -h
   ```

### Task Linking Not Working

**Symptom**: Tasks don't auto-link to memories

**Solutions**:
1. Rebuild vector index:
   ```bash
   rm -rf vectors/
   npm run rebuild:vectors
   ```

2. Check linker service:
   ```bash
   node lib/task-memory-linker.js --test
   ```

## Dashboard Issues

### WebSocket Connection Lost

**Symptom**: "Disconnected" message, no real-time updates

**Solutions**:
1. Restart dashboard server:
   ```bash
   npm run start:dashboard
   ```

2. Check WebSocket port (3001):
   ```bash
   lsof -i :3001
   ```

3. Clear browser cache and reload

### Theme Not Applying

**Symptom**: Dark/light theme doesn't change

**Solutions**:
1. Clear localStorage:
   ```javascript
   // In browser console
   localStorage.clear()
   location.reload()
   ```

2. Check theme CSS loaded:
   ```javascript
   // In browser console
   document.querySelector('[data-theme]')
   ```

## Performance Issues

### Slow Memory Search

**Symptom**: Search takes >1 second

**Solutions**:
1. Limit search scope:
   ```javascript
   // Use project filter
   searchMemories({ project: 'current-project' })
   ```

2. Rebuild search index:
   ```bash
   node scripts/rebuild-index.js
   ```

### Dashboard Slow to Load

**Symptom**: Takes >3 seconds to load

**Solutions**:
1. Build production version:
   ```bash
   npm run build
   npm run preview
   ```

2. Limit initial data load:
   ```bash
   # Set environment variable
   MAX_INITIAL_MEMORIES=50 npm run start:dashboard
   ```

## API and Authentication Issues

### CORS Errors

**Symptom**: "CORS policy" errors in browser

**Solutions**:
1. Check API server running on correct port (3001)
2. Verify CORS settings in `dashboard-server-bridge.js`
3. Use same domain for both servers

### Authentication Failed

**Symptom**: Can't login when auth enabled

**Solutions**:
1. Check auth settings:
   ```bash
   cat data/settings.json | grep authentication
   ```

2. Reset auth:
   ```bash
   # Disable auth temporarily
   echo '{"authentication":{"enabled":false}}' > data/settings.json
   ```

3. Create new admin user:
   ```bash
   node scripts/create-admin.js
   ```

## Debug Commands

### Comprehensive System Check
```bash
# Run all diagnostics
npm run diagnose

# Individual checks
npm run check:mcp
npm run check:api
npm run check:dashboard
npm run check:permissions
```

### Enable Debug Logging
```bash
# MCP Server debug
DEBUG=* npm start

# Dashboard debug
DEBUG=* npm run start:dashboard

# Full debug
DEBUG=* npm run dev:full
```

### Test Individual Components
```bash
# Test memory storage
node -e "require('./lib/memory-storage-wrapper.js').test()"

# Test task storage
node -e "require('./lib/task-storage.js').test()"

# Test WebSocket
node tests/websocket-reconnection-test.js
```

## Error Messages Reference

| Error | Cause | Solution |
|-------|-------|----------|
| `ENOENT: no such file or directory` | Missing file/directory | Create the missing directory |
| `EACCES: permission denied` | Insufficient permissions | Fix ownership/permissions |
| `EADDRINUSE: address already in use` | Port conflict | Use different port or kill process |
| `Cannot find module` | Missing dependency | Run `npm install` |
| `Invalid project path` | Path validation failure | Use absolute paths |
| `WebSocket connection failed` | Server not running | Start dashboard server |
| `Mock data detected` | Test data in production | Clear test files |

## Getting Help

### Before Asking for Help

1. Check this guide thoroughly
2. Search existing issues: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues
3. Run diagnostics: `npm run diagnose`
4. Collect error logs

### Information to Provide

When reporting issues, include:
- Operating system and version
- Node.js version (`node --version`)
- NPM version (`npm --version`)
- Installation method (NPX, manual, etc.)
- Complete error message
- Steps to reproduce

### Support Channels

- **GitHub Issues**: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues
- **Documentation**: This guide and other docs in `/docs`
- **Community**: Discussions on GitHub

## Advanced Debugging

### Source Maps
```bash
# Enable source maps for better stack traces
NODE_OPTIONS='--enable-source-maps' npm start
```

### Memory Leaks
```bash
# Monitor memory usage
node --inspect npm start
# Open chrome://inspect in Chrome
```

### Network Debugging
```bash
# Monitor network traffic
DEBUG=express:* npm run start:dashboard
```

### File System Watching
```bash
# Debug file watcher
DEBUG=chokidar npm start
```

## Claude Desktop Specific Issues

### JSON Parse Error in Embedded Browser

**Symptom**: "Unexpected token '�', ... is not valid JSON" when accessing dashboard

**Solutions**:
1. Ensure API server is running on correct port
2. Check CORS settings allow Claude Desktop origin
3. Verify response headers are correct:
   ```javascript
   res.setHeader('Content-Type', 'application/json')
   ```
4. Test API directly: `curl http://localhost:3002/api/memories`

### MCP Configuration Errors

**Symptom**: Invalid JSON in Claude Desktop config

**Solutions**:
1. Validate JSON syntax:
   ```bash
   jq . ~/.claude/claude.json
   ```
2. Check for trailing commas
3. Ensure proper escaping of paths on Windows
4. Use absolute paths only

---

For issues not covered here, please open a GitHub issue with detailed information about your problem.