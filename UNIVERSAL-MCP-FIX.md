# Universal MCP Connection Fix

This fix ensures the Like-I-Said MCP server works with ALL clients (Claude Desktop, Claude Code, Cursor, Windsurf) on all platforms (Windows, WSL, macOS, Linux).

## What Was Fixed

1. **Debug Output Pollution**: All debug logs that were outputting to stdout (breaking JSON-RPC protocol) have been redirected to stderr with `DEBUG_MCP` environment variable control.

2. **Universal Wrapper**: Created `mcp-server-wrapper.js` that ensures clean stdio communication.

3. **Auto-Configuration**: The `setup-all-clients.js` script automatically configures all MCP clients.

## Quick Setup (Automatic)

Run this command to configure all clients:
```bash
node setup-all-clients.js
```

This will:
- Detect your platform (Windows/WSL/Mac/Linux)
- Configure Claude Desktop, Claude Code, Cursor, and Windsurf
- Create backups of existing configurations
- Test the server connection

## Manual Configuration

If you prefer manual setup, use these configurations:

### Claude Desktop (Windows with WSL)
File: `%APPDATA%\Claude\claude_desktop_config.json`
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "wsl",
      "args": ["-e", "node", "/home/YOUR_USERNAME/projects/like-i-said-mcp-server-v2/mcp-server-wrapper.js"],
      "env": {}
    }
  }
}
```

### Claude Desktop (Mac/Linux)
File: 
- Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["/path/to/like-i-said-mcp-server-v2/mcp-server-wrapper.js"],
      "env": {}
    }
  }
}
```

### Cursor
File: `~/.cursor/mcp.json`
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["/path/to/like-i-said-mcp-server-v2/mcp-server-wrapper.js"]
    }
  }
}
```

### Windsurf
File: 
- Windows: `~/.codeium/windsurf/mcp_config.json`
- Mac/Linux: `~/.config/Windsurf/User/settings.json`
```json
{
  "mcp": {
    "servers": {
      "like-i-said-memory-v2": {
        "command": "node",
        "args": ["/path/to/like-i-said-mcp-server-v2/mcp-server-wrapper.js"]
      }
    }
  }
}
```

## Important Steps After Configuration

1. **Completely restart your MCP client** (not just reload - fully quit and restart)
2. Check for the memory tools in your client
3. If tools don't appear, open developer console (Ctrl+Shift+I) and check for errors

## Debugging

If the connection still doesn't work:

1. **Test the server directly**:
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node mcp-server-wrapper.js
```

2. **Enable debug mode**:
```bash
DEBUG_MCP=true node mcp-server-wrapper.js
```

3. **For WSL users**, verify WSL is accessible from Windows:
```cmd
wsl -e node --version
```

## What Changed

### Fixed Files
- `lib/task-storage.js` - Redirected debug logs to stderr
- `lib/task-format.js` - Redirected debug logs to stderr  
- `lib/connection-protection.cjs` - Redirected console logs to stderr
- `lib/data-integrity.cjs` - Redirected console logs to stderr

### New Files
- `mcp-server-wrapper.js` - Clean stdio wrapper for all clients
- `setup-all-clients.js` - Automatic configuration script
- `configs/` - Example configurations for each client

## Verification

After setup, you should see these tools in your MCP client:
- add_memory
- get_memory
- list_memories
- search_memories
- create_task
- update_task
- list_tasks
- get_task_context
- And many more...

The server is now universally compatible with all MCP clients!