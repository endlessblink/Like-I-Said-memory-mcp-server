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

## Windows MCP Configuration Issues - SOLVED ✅

### Problem
Tools not appearing in Cursor IDE on Windows despite server working correctly.

### Root Cause
1. Windows process spawning issues with direct Node.js execution
2. Path handling problems with spaces in directory names
3. Server structure incompatibility with Cursor's MCP implementation

### Solution Applied
1. **Move to path without spaces**: `D:\APPSNospaces\Like-I-said-mcp-server-v2`
2. **Use cmd.exe wrapper** for Windows process spawning
3. **Copy working server.js structure** from original like-i-said-memory
4. **Remove InitializeRequestSchema handler** that was causing conflicts

### Working Cursor Configuration
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

### Verification
- Server responds to `{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}` with 6 tools
- All tools appear in Cursor MCP settings after restart
- Test tool confirms MCP communication works

### Auto-Installers Created
- `auto-install-all-clients.bat` - Batch file installer
- `quick-setup.ps1` - PowerShell installer with options
- `INSTALLATION-README.md` - Complete manual setup guide

### Key Learning
**Windows MCP servers require cmd.exe wrapper + no-spaces paths + simplified server structure**

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
# Run as Administrator
auto-install-all-clients.bat
```

### Development
```bash
npm run dev:full        # Start dashboard + API
npm start              # Start MCP server only
```