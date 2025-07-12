# 🚨 IMMEDIATE FIX FOR CLAUDE DESKTOP

## The Problem
Your logs show the server IS working but these messages are breaking it:
```
Like-I-Said Memory Server v2 - Markdown File Mode
Like I Said Memory MCP Server v2 started successfully
```

## The Fix - Use mcp-wrapper.mjs

### 1. Update Your Claude Desktop Config

**Location**: `%APPDATA%\Claude\claude_desktop_config.json`

Replace the ENTIRE file content with:
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": [
        "D:/APPSNospaces/Like-I-said-mcp-server-v2/mcp-wrapper.mjs"
      ]
    }
  }
}
```

⚠️ **IMPORTANT**: Use `mcp-wrapper.mjs` NOT `server-markdown.js`!

### 2. Completely Restart Claude Desktop
1. Right-click the Claude icon in your system tray
2. Click "Quit" (not just close the window)
3. Wait 10 seconds
4. Start Claude Desktop again

### 3. Check It's Working
1. Open Settings → Developer
2. Look for "like-i-said-memory-v2" - should show "running"
3. Memory tools should now appear!

## If Still Not Working

Try the minimal test server instead:
```json
{
  "mcpServers": {
    "minimal-test": {
      "command": "node",
      "args": [
        "D:/APPSNospaces/Like-I-said-mcp-server-v2/mcp-minimal-test.js"
      ]
    }
  }
}
```

If the minimal test works but the main server doesn't, the wrapper needs debugging.

## What the Wrapper Does
- Intercepts ALL console output before it can pollute stdout
- Only allows valid JSON-RPC messages through
- Redirects everything else to stderr
- Guarantees 100% protocol compliance

## Quick Test
Open Command Prompt and run:
```
node D:\APPSNospaces\Like-I-said-mcp-server-v2\mcp-wrapper.mjs
```

Then type:
```
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
```

You should get back ONLY clean JSON, no other text!