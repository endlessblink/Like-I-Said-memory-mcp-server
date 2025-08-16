# Like-I-Said MCP v2 - Project Memory

This file contains crucial context for Claude Code when continuing work on this project.

## Current Status: ✅ WORKING

**Date**: 2025-06-15  
**Status**: Windows MCP configuration issues RESOLVED  
**Tools**: All 6 tools appearing correctly in Cursor  

## Critical Success Factors

### 1. Windows MCP Fix Applied
The server now works correctly with Cursor on Windows using these specific configurations:

**Key Requirements:**
- Path without spaces: `D:\APPSNospaces\Like-I-said-mcp-server-v2`
- cmd.exe wrapper: `"command": "cmd", "args": ["/c", "node", "path"]`
- Simplified server.js structure (no InitializeRequestSchema)
- NODE_PATH environment variable set

### 2. Working Server Structure
File: `server.js`
- Uses `@modelcontextprotocol/sdk` v0.5.0
- Simple Server() constructor without initialize handler
- 6 tools: add_memory, get_memory, list_memories, delete_memory, search_memories, test_tool
- JSON storage in `memories.json` with array format: `[{id, content, tags, timestamp}]`

### 3. Proven Configuration
```json
{
  "mcpServers": {
    "like-i-said-v2": {
      "command": "cmd",
      "args": ["/c", "node", "D:\\APPSNospaces\\Like-I-said-mcp-server-v2\\server.js"],
      "cwd": "D:\\APPSNospaces\\Like-I-said-mcp-server-v2",
      "env": {"NODE_PATH": "C:\\Program Files\\nodejs"}
    }
  }
}
```

## Installation Files Created

### Auto-Installers
1. **auto-install-all-clients.bat** - Complete Windows batch installer
   - Copies files to clean path
   - Installs dependencies  
   - Tests server functionality
   - Configures both Cursor and Claude Desktop
   - Requires Administrator privileges

2. **quick-setup.ps1** - PowerShell installer with options
   - Parameter-driven (-Cursor, -Claude, -All)
   - Better error handling
   - Admin privilege checks
   - JSON configuration generation

3. **INSTALLATION-README.md** - Complete documentation
   - Step-by-step manual setup
   - Troubleshooting guide
   - Configuration examples

### Reference Files
- `cursor-windows-config.json` - Working Cursor config template
- `cursor-forward-slash-windows.json` - Alternative path format
- `PROJECT-MEMORY.md` - This context file

## Debugging Process Used

### Original Problem
- Tools not appearing in Cursor despite server working
- Server responded correctly to manual JSON-RPC requests
- Configuration looked correct but Cursor couldn't spawn process

### Investigation Steps
1. ✅ Verified server functionality with direct calls
2. ✅ Found original working like-i-said-memory server
3. ✅ Identified differences in server structure  
4. ✅ Researched Windows MCP issues online
5. ✅ Applied cmd.exe wrapper solution
6. ✅ Moved to path without spaces
7. ✅ Copied working server.js structure
8. ✅ Verified 6 tools appear in Cursor

### Key Differences from Original
- Simplified server.js (removed InitializeRequestSchema)
- Array-based JSON storage instead of object
- Windows-specific configuration handling
- Multiple client support (Cursor + Claude Desktop)

## Next Steps Available

### Potential Enhancements
1. **Add more MCP clients** (VS Code, other IDEs)
2. **Improve memory search** (fuzzy search, relevance scoring)
3. **Add memory categories** (project-specific, global, etc.)
4. **Create web dashboard** (already partially implemented)
5. **Add memory export/import** (backup/restore functionality)

### Maintenance Tasks
1. **Update SDK version** (check for breaking changes)
2. **Add error logging** (better debugging for users)
3. **Create test suite** (automated verification)
4. **Package as npm module** (easier distribution)

## Important Commands

### Test Server
```bash
cd D:\APPSNospaces\Like-I-said-mcp-server-v2
echo {"jsonrpc": "2.0", "id": 1, "method": "tools/list"} | node server.js
```

### Install Dependencies
```bash
npm install --prefix "D:\APPSNospaces\Like-I-said-mcp-server-v2"
```

### Run Auto-Installer
```batch
# As Administrator
auto-install-all-clients.bat
```

## Contact Points for Future Development

When continuing this project:
1. **Read this file first** for full context
2. **Check CLAUDE.md** for current architecture
3. **Test server before changes**: Use the test command above
4. **Verify Cursor connection** after any server.js modifications
5. **Update installers** if configuration format changes

---
*This memory file ensures continuity between Claude Code sessions*