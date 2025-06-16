# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm install` - Install all dependencies
- `npm run dev:full` - Start both API server (port 3001) and React dashboard (port 5173) concurrently
- `npm run dev` - Start React dashboard only
- `npm run dashboard` - Start API server only
- `npm start` - Start MCP server (production mode)

### Build & Production
- `npm run build` - Build React frontend for production
- `npm run preview` - Preview production build

### Process Management (PM2)
- `npm run pm2:start` - Start with PM2 process manager
- `npm run pm2:stop` - Stop PM2 process
- `npm run pm2:status` - Check PM2 status

## Architecture

### MCP Server (server.js)
- Model Context Protocol server using `@modelcontextprotocol/sdk`
- Stores memories in `memories.json` file with structure: `[{ id, content, tags, timestamp }]`
- Exposes 6 tools: add_memory, get_memory, list_memories, delete_memory, search_memories, test_tool
- Uses StdioServerTransport for Claude Desktop communication
- **IMPORTANT**: Uses simplified server structure without InitializeRequestSchema for Windows compatibility

### Dashboard Backend (dashboard-server.js)
- Express REST API on port 3001
- Endpoints: GET /api/memories, POST /api/memories, PUT /api/memories/:key, DELETE /api/memories/:key
- Shares the same memory.json file with MCP server

### Frontend Dashboard
- React + TypeScript + Vite application
- UI components from shadcn/ui (Radix UI + Tailwind CSS)
- Main components: MemoriesTable, AddMemoryDialog, EditMemoryDialog
- Real-time memory management interface

### Key Configuration Files
- `mcp-config.template.json` - Template for MCP client configuration
- `claude_desktop_config.json` - Example Claude Desktop configuration
- `memory.json` - Persistent storage for all memories

## MCP Integration

The server implements the Model Context Protocol with:
- Server name: "like-i-said-memory"
- Transport: stdio (standard input/output)
- Tools capability with 4 memory management functions
- Memory persistence in JSON file format

When integrating with Claude Desktop or other MCP clients, ensure the command path points to server.js and the working directory is set correctly.

## Windows MCP Configuration Issues - ONGOING 🚧

### Problem
Installer not properly configuring MCP clients - tools not appearing in any client.

### Critical Discovery - Config Path Confusion
**WRONG ASSUMPTION**: Installing server files to `%USERPROFILE%\mcp-servers\like-i-said-v2` 
**ACTUAL PROBLEM**: Each MCP client has specific config file locations that need to be correctly identified

### Config Path Research Status - FOUND ✅
- ✅ **Cursor IDE**: `%USERPROFILE%\.cursor\mcp.json` (global) or `[project]\.cursor\mcp.json` (project-level)
- ✅ **Claude Desktop**: `%APPDATA%\Claude\claude_desktop_config.json`  
- ✅ **Windsurf**: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`

### Verified Config Paths (Web Research)
**Cursor IDE:**
- Global: `C:\Users\[Username]\.cursor\mcp.json`
- Project: `[ProjectDir]\.cursor\mcp.json`
- Note: Project-level has issues on Windows 11

**Claude Desktop:**
- Path: `C:\Users\[Username]\AppData\Roaming\Claude\claude_desktop_config.json`
- Access: Settings → Developer → Edit Config

**Windsurf:**
- Path: `C:\Users\[Username]\.codeium\windsurf\mcp_config.json`
- Access: Ctrl+Shift+P → "Open Windsurf Settings" → Cascade section

### Failed Installer Attempts
1. **Complex dual-mode installer** - Over-engineered, didn't work
2. **Smart config merger with Node.js** - ES module conflicts, added complexity
3. **Simple installer with wrong paths** - Configs written to wrong locations

### Key Learning - NEED ACTUAL PATHS
**Windows MCP client config paths are environment-specific and need to be verified on actual system**

### TODO - Required Information  
- [x] Find exact Cursor MCP config file location - FOUND via web research
- [x] Find exact Claude Desktop config file location - FOUND via web research
- [x] Find exact Windsurf config file location - FOUND via web research
- [x] Updated installer with verified paths
- [ ] Test installer works with actual clients
- [ ] Verify server.js works independently before configuring clients

### Server Status
- ✅ Server responds to `{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}` with 6 tools
- ✅ All tools work when tested manually
- ✅ No path spaces issues (moved to `D:\APPSNospaces\Like-I-said-mcp-server-v2`)
- ✅ Uses simplified server structure without InitializeRequestSchema

### Root Cause Analysis
**Installer failure was due to incorrect config file paths AND Windows environment variable issues**

### Critical Fix Applied
**Problem**: %USERPROFILE% and %APPDATA% variables not working properly
**Solution**: Use dynamic username detection with absolute paths:
```batch
for /f "tokens=*" %%i in ('whoami') do set "CURRENT_USER=%%i"
for /f "tokens=2 delims=\" %%i in ("%CURRENT_USER%") do set "USERNAME=%%i"
```

**Fixed Paths**:
- Cursor: `C:\Users\%USERNAME%\.cursor\mcp.json`
- Claude: `C:\Users\%USERNAME%\AppData\Roaming\Claude\claude_desktop_config.json`
- Windsurf: `C:\Users\%USERNAME%\.codeium\windsurf\mcp_config.json`

### FINAL SOLUTION - Learned from Working Installer ✅

**Root Cause**: All previous attempts used wrong approach (batch JSON generation, PowerShell complexity)
**Working Solution**: Use embedded Node.js script (learned from `/mnt/d/APPSNospaces/like-i-said-memory-mcp/install-mcp-memory-server.bat`)

### Safe Config Merger - Node.js Approach ✅
**Key Features:**
- ✅ **Reads existing configs** before making any changes
- ✅ **Preserves ALL existing MCP servers** (never deletes)
- ✅ **Proper JSON handling** using Node.js JSON.parse/stringify  
- ✅ **Atomic writes** using temp file + rename
- ✅ **Skip if exists** - won't duplicate servers
- ✅ **Robust error handling** for corrupted configs

**Critical Implementation Details:**
```javascript
// Safe read - returns default if file missing/corrupt
readConfig(configPath) {
    if (!fs.existsSync(configPath)) {
        return { mcpServers: {} };
    }
    const parsed = JSON.parse(content);
    if (!parsed.mcpServers) {
        parsed.mcpServers = {};
    }
    return parsed;
}

// Atomic write - temp file + rename prevents corruption  
writeConfig(configPath, config) {
    const tempPath = configPath + '.tmp';
    fs.writeFileSync(tempPath, jsonString, 'utf8');
    fs.renameSync(tempPath, configPath);
}
```

**User Experience:**
- Detects available AI assistants automatically
- Asks user permission for each client
- Shows clear progress and results
- Never touches configs user didn't approve

### Testing Results - Partial Success ✅❌

**✅ SUCCESS:**
- Claude Desktop: Configured correctly, preserves existing servers
- Windsurf: Preserves existing servers (doesn't delete)

**❌ ISSUES FOUND:**
1. **Wrong server name**: Using `like-i-said-memory-v2` instead of `like-i-said-memory` 
2. **Wrong paths in some cases**: Still seeing old paths like `C:\Users\endle\mcp-servers\like-i-said-v2`
3. **Cursor overwrites**: Despite Node.js script, Cursor config gets overwritten

### BULLETPROOF INSTALLER - Final Version ✅

**Completely rewrote installer using proven working approach:**

**Key Fixes Applied:**
1. **Consistent server name**: `like-i-said-memory-v2` throughout
2. **Proper path handling**: Uses `%CD%\server.js` (current directory)
3. **Enhanced logging**: Shows existing servers before/after
4. **Atomic writes**: Temp file + rename prevents corruption
5. **Better error handling**: Graceful fallbacks for corrupt configs

**Bulletproof Features:**
- ✅ **NEVER deletes existing servers** - reads before writing
- ✅ **Shows existing servers** before making changes  
- ✅ **Validates JSON** before writing to disk
- ✅ **Atomic file operations** prevent corruption
- ✅ **Skip if exists** - won't create duplicates
- ✅ **Detailed console output** for debugging
- ✅ **User confirmation** for each client

### PRODUCTION SOLUTION IMPLEMENTED ✅

**Critical Issues RESOLVED via Perplexity Analysis:**

1. **JSON Path Escaping - FIXED** ✅
   - **Problem**: Single backslashes in JSON caused parsing errors
   - **Solution**: Double backslashes (`\\\\`) for Windows paths in JSON
   - **Implementation**: `escapeWindowsPath()` function converts `\` to `\\\\`

2. **Environment Variable Access - FIXED** ✅  
   - **Problem**: Node.js script running in WSL couldn't access Windows env vars
   - **Solution**: Ensure installer runs in Windows CMD environment
   - **Validation**: Check `APPDATA` and `USERPROFILE` availability

3. **Config Safety - ENHANCED** ✅
   - **Problem**: Configs getting overwritten despite safety measures
   - **Solution**: Production-grade atomic writes with retries
   - **Features**: Timestamped backups, checksums, file locking handling

4. **Client-Specific Requirements - ADDRESSED** ✅
   - **Claude Desktop**: Requires full restart (not reload), 2-5 min detection time
   - **Cursor**: Supports reload window (Ctrl+Shift+P), immediate detection  
   - **Windsurf**: Auto-detection, no restart needed

5. **Windows-Specific Edge Cases - HANDLED** ✅
   - **Non-ASCII usernames**: Detection and warning system
   - **OneDrive path redirections**: Warning for sync issues
   - **File locking**: Retry logic with exponential backoff
   - **Path length limits**: Validation for 260-character Windows limit

### PRODUCTION INSTALLER: `install-production.bat`

**Key Features:**
- ✅ **Proper JSON escaping**: Double backslashes for Windows paths
- ✅ **Environment validation**: APPDATA/USERPROFILE availability checks
- ✅ **Edge case detection**: Non-ASCII usernames, OneDrive paths
- ✅ **Atomic operations**: Temp file + rename with retry logic
- ✅ **Comprehensive backups**: Timestamped with checksum verification
- ✅ **Client-specific handling**: Restart requirements and timelines
- ✅ **Error recovery**: 3-retry limit with detailed logging

**Production Config Format:**
```json
{
  "mcpServers": {
    "like-i-said-memory": {
      "command": "node", 
      "args": ["C:\\\\absolute\\\\path\\\\server.js"],
      "env": {}
    }
  }
}
```

**Restart Requirements:**
- **Claude Desktop**: Full restart required, 2-5 minutes detection
- **Cursor**: Reload window (Ctrl+Shift+P) or full restart, immediate
- **Windsurf**: Auto-detection, no restart needed

**Troubleshooting Locations:**
- Claude logs: `%APPDATA%\Claude\logs`
- Cursor logs: `%USERPROFILE%\.cursor\logs`  
- Windsurf logs: `%USERPROFILE%\.codeium\windsurf.log`

### DEVELOPMENT LOCATION CHANGE REQUIRED ✅

**IMMEDIATE ACTION - Move Development:**
- **FROM:** `D:\MY PROJECTS\AI\LLM\AI Code Gen\my-builds\My MCP\Like-I-said-mcp-server-v2`
- **TO:** `D:\APPSNospaces\Like-I-said-mcp-server-v2`

**Why This Fixes Everything:**
1. ✅ **Path consistency** - installer will generate correct paths
2. ✅ **No spaces** - Windows compatibility 
3. ✅ **Matches working examples** - your working Windsurf config expects this location
4. ✅ **Eliminates path confusion** - no more wrong path generation

**After Move - Critical Fixes Needed:**
1. Fix JSON escaping for Claude Desktop (backslash issues)
2. Debug why Cursor config still gets overwritten
3. Test installer from correct location
4. Ensure all paths use forward slashes in JSON

**All progress and learnings preserved in CLAUDE.md for continued development.**

### Verbose Logging Added ✅
**Added comprehensive logging to installer:**
- Creates `install.log` file in installer directory
- Logs all file operations, directory creation, npm install
- Shows exact config file paths being created
- Logs success/failure of each MCP client configuration
- Includes error codes and timestamps
- Final log location shown to user for troubleshooting

## Project Structure (Cleaned ✅)

### Essential Files Only
- **server.js** - Working MCP server (Windows compatible)
- **auto-install-all-clients.bat** - Batch installer 
- **quick-setup.ps1** - PowerShell installer
- **dashboard-server.js** - Express API backend
- **src/** - React frontend components

### Configuration Files
- **cursor-windows-config.json** - Working Cursor config
- **claude_desktop_config.json** - Claude Desktop config
- **package.json** - Dependencies and scripts

### Documentation Files
- **CLAUDE.md** - This development guide
- **PROJECT-MEMORY.md** - Complete troubleshooting context
- **INSTALLATION-README.md** - User installation guide
- **FILE-STRUCTURE.md** - Clean project structure overview

### Removed ❌
- 20+ redundant installer files
- 10+ duplicate configuration files  
- Debug scripts and test files
- Log files and backup files

## Quick Reference Commands

### Test Server Functionality
```bash
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node server.js
```

### Install for Users
```batch
install.bat             # Install everything (MCP + Dashboard)
```

### Start Dashboard
```batch
start.bat               # Start web interface at http://localhost:3001
```

### Development
```bash
npm run dev:full        # Start dashboard + API
npm start              # Start MCP server only
```

## NPM Package Distribution ✅

The project is now distributed as an NPM package for easy installation:

### **NPM Package: @endlessblink/like-i-said-v2**
```bash
npx @endlessblink/like-i-said-v2 install
```

**Package Features:**
- ✅ One-command installation for all platforms
- ✅ Auto-detects AI clients (Claude Desktop, Cursor, Windsurf)
- ✅ Creates proper MCP configurations
- ✅ Tests server functionality
- ✅ Cross-platform (Windows, macOS, Linux)

## Current Development Status (January 2025)

### **✅ Working Features**
1. **MCP Server** - 6 tools working perfectly
2. **CLI Installer** - Auto-configures all AI clients
3. **Dashboard Backend** - Express API on port 3001
4. **Simple Dashboard** - HTML fallback interface
5. **React Frontend** - Built but needs UI improvements

### **🚧 TODO Issues**
1. **Dashboard-MCP Connection** - Dashboard can't connect to MCP server running via AI clients
   - Current: Dashboard expects its own server instance
   - Needed: Connect to existing MCP server stdio instance
   - Solution: Share memory.json file between instances

2. **React Dashboard UI** - Missing features:
   - Memory categories (Personal/Work/Projects)
   - Visual card layout instead of table
   - Enhanced search and filters
   - Analytics and insights

3. **Test Script** - CLI test hangs, needs timeout handling

### **📦 Publishing Status**
- Package name: `@endlessblink/like-i-said-v2`
- Version: 2.0.1 (ready to publish)
- Size: ~40KB (cleaned from 150+ files to 44 essential)
- Command: `npm publish --access public`

### **🎯 Development Roadmap**

**Phase 1 (2-3 days):**
- Fix dashboard-MCP server connection
- Add memory categories
- Implement card-based UI
- Add search filters

**Phase 2 (1 week):**
- Memory analytics
- Export/Import functionality
- Batch operations
- Memory relationships

**Phase 3 (2 weeks):**
- AI auto-save functionality
- Smart memory suggestions
- Project-specific scoping
- Cloud sync options

### **🔧 Development Commands**

```bash
# Test everything
test-everything.bat

# Run dashboard
npm run dev:full

# Build for production
npm run build

# Publish updates
git add . && git commit -m "Update" && npm version patch && npm publish
```

### **📍 Key Files**
- `server.js` - MCP server implementation
- `cli.js` - NPX installer
- `dashboard-server.js` - Express API
- `src/App.tsx` - React dashboard
- `PROJECT-STATUS-AND-ROADMAP.md` - Detailed development plan
- `NPM-MANAGEMENT-GUIDE.md` - NPM package management guide