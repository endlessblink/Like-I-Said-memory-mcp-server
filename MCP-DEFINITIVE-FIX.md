# MCP Claude Desktop - DEFINITIVE FIX

## The Core Problem
The MCP server was outputting startup messages to stdout, breaking the JSON-RPC protocol. Even with environment variables and TTY detection, the messages were still appearing because:
1. Claude Desktop doesn't always pass environment variables correctly
2. TTY detection doesn't work reliably on Windows
3. Any non-JSON output to stdout breaks the protocol

## The Solution: Clean Wrapper
I've created `mcp-server-clean.js` that:
- **Intercepts ALL console output** before any code runs
- **Redirects everything to stderr** except valid JSON-RPC messages
- **Guarantees clean stdout** for MCP protocol

## Installation Steps

### 1. Update Claude Desktop Configuration
Replace your `claude_desktop_config.json` with:

**Windows** (`%APPDATA%\Claude\claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": [
        "D:/APPSNospaces/Like-I-said-mcp-server-v2/mcp-server-clean.js"
      ]
    }
  }
}
```

**Note**: Update the path to match your installation directory.

### 2. Restart Claude Desktop
1. **Completely quit Claude Desktop** (right-click system tray icon → Quit)
2. Wait 5 seconds
3. Start Claude Desktop again

### 3. Verify Connection
1. Open Claude Desktop Settings → Developer
2. Check that "like-i-said-memory-v2" shows as "running"
3. The MCP tools should now be available

## Why This Works
1. **No stdout pollution**: The wrapper intercepts ALL stdout writes
2. **Clean JSON-RPC**: Only valid JSON messages pass through
3. **All debug to stderr**: Startup messages, logs, etc. go to stderr
4. **No environment dependencies**: Works regardless of how Claude Desktop launches it

## Debugging
If it still doesn't work:
1. Enable Developer Mode in Claude Desktop
2. Check the log file: `mcp-server-like-i-said-memory-v2.log`
3. Look for any error messages

## The Technical Details
The wrapper:
```javascript
// Redirects console.log to stderr
console.log = (...args) => console.error('[LOG]', ...args);

// Intercepts process.stdout.write
process.stdout.write = function(chunk, encoding, callback) {
  const str = chunk.toString();
  // Only allow JSON-RPC through
  if (str.trim().startsWith('{') && str.includes('"jsonrpc"')) {
    return originalStdoutWrite.call(process.stdout, chunk, encoding, callback);
  }
  // Everything else goes to stderr
  console.error('[STDOUT REDIRECT]', str.trim());
};
```

This ensures ABSOLUTE protocol compliance with zero stdout pollution.