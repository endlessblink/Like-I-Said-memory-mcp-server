# Windows MCP Connection Troubleshooting Guide

This guide helps resolve connection issues between Like-I-Said MCP Server and Claude clients on Windows.

## Common Symptoms

- ❌ "MCP connection lost" error in Claude
- ❌ Tools disappear from Claude interface
- ❌ Server starts but immediately disconnects
- ❌ "TTY not available" errors
- ❌ Silent failures with no error messages

## Quick Diagnosis

Run this command to check your setup:
```cmd
node --version && echo MCP_MODE=%MCP_MODE% && echo MCP_QUIET=%MCP_QUIET%
```

Expected output:
- Node.js v16+ 
- Environment variables may or may not be set

## Issue #1: TTY Detection Problems

**Problem**: Windows doesn't properly detect TTY, causing the server to misidentify the connection mode.

### Diagnosis
```cmd
node -e "console.log('TTY:', process.stdin.isTTY, process.stdout.isTTY)"
```

If this shows `undefined` or `false`, you have TTY detection issues.

### Fix
Set the MCP_MODE environment variable explicitly:

**For current session:**
```cmd
set MCP_MODE=true
```

**For permanent fix (User level):**
```cmd
setx MCP_MODE true
```

**For permanent fix (System level - requires admin):**
```cmd
setx MCP_MODE true /M
```

## Issue #2: Stdio Transport Problems

**Problem**: Windows handles stdio differently, causing transport layer issues.

### Diagnosis
Test the MCP server directly:
```cmd
echo {"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{}},"id":1} | node server-markdown.js
```

If you get no response or an error, stdio transport is failing.

### Fix
1. **Use the wrapper script**:
   ```cmd
   node mcp-server-wrapper.js
   ```

2. **Set quiet mode to prevent output interference**:
   ```cmd
   set MCP_QUIET=true
   ```

## Issue #3: Path and Permission Issues

**Problem**: Windows path handling or permissions blocking access.

### Diagnosis
```cmd
dir memories
dir tasks
```

Check if directories exist and are accessible.

### Fix
1. **Create directories if missing**:
   ```cmd
   mkdir memories
   mkdir tasks
   ```

2. **Fix permissions** (requires admin):
   ```cmd
   icacls memories /grant %USERNAME%:F
   icacls tasks /grant %USERNAME%:F
   ```

## Issue #4: Process Signal Handling

**Problem**: Windows handles SIGINT/SIGTERM differently, causing unexpected disconnections.

### Diagnosis
Check if the server stays running:
```cmd
start /B node server-markdown.js
timeout /t 5
tasklist | findstr node
```

### Fix
1. **Disable signal handlers temporarily**:
   Create a file `start-mcp-windows.bat`:
   ```batch
   @echo off
   set MCP_MODE=true
   set MCP_QUIET=true
   set NO_SIGNAL_HANDLERS=true
   node mcp-server-wrapper.js
   ```

2. **Use this batch file in your Claude configuration**.

## Issue #5: Claude Configuration Problems

**Problem**: Claude client not properly configured for Windows paths.

### Diagnosis
Check your Claude configuration:

**For Claude Desktop:**
```cmd
type %APPDATA%\Claude\claude_desktop_config.json
```

**For Claude Code:**
```cmd
claude mcp list
```

### Fix

**For Claude Desktop**, ensure your config uses Windows paths:
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["C:\\path\\to\\like-i-said\\mcp-server-wrapper.js"],
      "env": {
        "MCP_MODE": "true",
        "MCP_QUIET": "true"
      }
    }
  }
}
```

**For Claude Code**:
```cmd
claude mcp remove like-i-said-memory-v2
claude mcp add like-i-said-memory-v2 -- node C:\path\to\like-i-said\mcp-server-wrapper.js
```

## Issue #6: Node.js Process Issues

**Problem**: Node.js process management differs on Windows.

### Diagnosis
```cmd
where node
node --version
```

Ensure you're using the correct Node.js installation.

### Fix
1. **Use full path to Node.js**:
   ```cmd
   "C:\Program Files\nodejs\node.exe" server-markdown.js
   ```

2. **Clear Node.js cache**:
   ```cmd
   npm cache clean --force
   ```

## Complete Windows Fix Script

Save this as `fix-windows-connection.bat`:

```batch
@echo off
echo Fixing Like-I-Said MCP Connection for Windows...

REM Set environment variables
setx MCP_MODE true
setx MCP_QUIET true

REM Create directories if needed
if not exist memories mkdir memories
if not exist tasks mkdir tasks

REM Fix permissions
icacls memories /grant %USERNAME%:F >nul 2>&1
icacls tasks /grant %USERNAME%:F >nul 2>&1

REM Test Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js v16+
    exit /b 1
)

REM Create start script
echo @echo off > start-mcp.bat
echo set MCP_MODE=true >> start-mcp.bat
echo set MCP_QUIET=true >> start-mcp.bat
echo node "%~dp0mcp-server-wrapper.js" >> start-mcp.bat

echo.
echo Fix applied! Use start-mcp.bat to run the server.
echo Update your Claude configuration to use: %cd%\start-mcp.bat
```

## Testing Your Fix

After applying fixes, test the connection:

1. **Manual test**:
   ```cmd
   start-mcp.bat
   ```
   Leave this running and check if Claude recognizes the tools.

2. **Diagnostic test**:
   ```cmd
   node scripts\windows\diagnose-connection.js
   ```

## Still Having Issues?

### Enable Debug Mode
```cmd
set DEBUG_MCP=true
set NODE_ENV=development
node server-markdown.js 2> debug.log
```

Check `debug.log` for detailed error messages.

### Common Error Messages and Solutions

| Error | Solution |
|-------|----------|
| "EPIPE: Broken pipe" | Set `MCP_QUIET=true` |
| "TTY not available" | Set `MCP_MODE=true` |
| "ENOENT: no such file" | Check paths and create missing directories |
| "EACCES: permission denied" | Run as administrator or fix permissions |
| "Cannot find module" | Run `npm install` |

### Get Help

If problems persist:
1. Run the diagnostic script and save output
2. Check `debug.log` for errors
3. Report issue at: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues

Include:
- Windows version (`winver`)
- Node.js version (`node --version`)
- Claude client type and version
- Diagnostic script output
- Any error messages

## Prevention Tips

1. **Always use wrapper script** (`mcp-server-wrapper.js`)
2. **Set environment variables permanently** using `setx`
3. **Use batch files** for consistent startup
4. **Keep paths simple** (avoid spaces and special characters)
5. **Run with proper permissions** (but avoid running as admin unless necessary)

Remember: Windows MCP connections are more sensitive to configuration than Unix systems. Following these guidelines will help maintain a stable connection.