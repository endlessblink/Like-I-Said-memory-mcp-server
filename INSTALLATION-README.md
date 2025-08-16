# Like-I-Said MCP v2 - Universal Installer

## Quick Installation

### Option 1: Automatic Installation (Recommended)

**For Windows Command Prompt:**
```batch
# Run as Administrator
auto-install-all-clients.bat
```

**For PowerShell:**
```powershell
# Run PowerShell as Administrator
PowerShell -ExecutionPolicy Bypass -File quick-setup.ps1
```

**PowerShell Options:**
```powershell
# Install for Cursor only
.\quick-setup.ps1 -Cursor

# Install for Claude Desktop only  
.\quick-setup.ps1 -Claude

# Install for both clients
.\quick-setup.ps1 -All
```

### Option 2: Manual Configuration

#### Prerequisites
- Node.js installed
- Project moved to path without spaces: `D:\APPSNospaces\Like-I-said-mcp-server-v2`
- Run `npm install` in project directory

#### Cursor Configuration
Add to Cursor MCP settings:
```json
{
  "mcpServers": {
    "like-i-said-v2": {
      "command": "cmd",
      "args": [
        "/c",
        "node", 
        "D:\\APPSNospaces\\Like-I-said-mcp-server-v2\\server.js"
      ],
      "cwd": "D:\\APPSNospaces\\Like-I-said-mcp-server-v2",
      "env": {
        "NODE_PATH": "C:\\Program Files\\nodejs"
      }
    }
  }
}
```

#### Claude Desktop Configuration
Add to `%APPDATA%\Claude\claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["server.js"],
      "cwd": "D:\\APPSNospaces\\Like-I-said-mcp-server-v2"
    }
  }
}
```

## Available Tools

After installation, you'll have access to these 6 tools:

1. **add_memory** - Store a new memory with content and tags
2. **get_memory** - Retrieve a memory by ID
3. **list_memories** - List all stored memories with optional limit
4. **delete_memory** - Delete a memory by ID  
5. **search_memories** - Search memories by content or tags
6. **test_tool** - Simple test tool to verify MCP is working

## Verification

### Test the Server
```batch
cd D:\APPSNospaces\Like-I-said-mcp-server-v2
echo {"jsonrpc": "2.0", "id": 1, "method": "tools/list"} | node server.js
```

Should return JSON with all 6 tools listed.

### Test in Cursor
1. Restart Cursor after configuration
2. Open a chat and type: "test the MCP tools"
3. Tools should appear in the MCP settings page

### Test in Claude Desktop  
1. Restart Claude Desktop after configuration
2. Look for the MCP server in connection status
3. Tools should be available in conversations

## Troubleshooting

### Common Issues

**Tools not appearing:**
- Ensure path has no spaces
- Use `cmd /c` wrapper for Windows
- Verify Node.js is in PATH
- Restart the client application

**Permission errors:**
- Run installer as Administrator
- Check file permissions in install directory

**Node module errors:**
- Run `npm install` in project directory
- Verify Node.js version compatibility

### Configuration Files

The installer creates these reference files:
- `cursor-windows-config.json` - Cursor configuration template
- `claude-desktop-config.json` - Claude Desktop configuration template

## Support

If you encounter issues:
1. Check the console output for error messages
2. Verify Node.js installation: `node --version`
3. Test server manually: `node server.js`
4. Check client logs for MCP connection errors

## Key Windows Fixes Applied

This installer implements the Windows-specific fixes:
- ✅ Uses `cmd /c` wrapper to fix process spawning
- ✅ Handles paths with proper escaping
- ✅ Sets NODE_PATH environment variable
- ✅ Creates admin-level installations
- ✅ Tests server functionality before configuration