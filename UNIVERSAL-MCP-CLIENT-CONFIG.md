# Universal MCP Client Configuration

Configure any MCP client to access the same unified storage location for truly cross-platform memory and task management.

## Unified Storage Location

**All clients access the same data at:**
- **Windows**: `D:\APPSNospaces\like-i-said-mcp\`
- **WSL2**: `/mnt/d/APPSNospaces/like-i-said-mcp/`
- **WSL1**: `/mnt/d/APPSNospaces/like-i-said-mcp/`

## MCP Client Configurations

### Claude Desktop (Windows)

**File**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "like-i-said": {
      "command": "node",
      "args": ["D:\\APPSNospaces\\like-i-said-mcp\\server-unified.js"],
      "env": {
        "MCP_MODE": "full"
      }
    }
  }
}
```

### Claude Code (WSL2)

**File**: `~/.claude.json` or `~/.claude/mcp_settings.json`

```json
{
  "mcpServers": {
    "like-i-said": {
      "type": "stdio",
      "command": "node",
      "args": ["/mnt/d/APPSNospaces/like-i-said-mcp/server-unified.js"],
      "env": {
        "MCP_MODE": "full"
      }
    }
  }
}
```

### Claude Code (WSL1/Native Linux)

**File**: `~/.claude.json`

```json
{
  "mcpServers": {
    "like-i-said": {
      "type": "stdio", 
      "command": "node",
      "args": ["/mnt/d/APPSNospaces/like-i-said-mcp/server-unified.js"],
      "env": {
        "MCP_MODE": "full"
      }
    }
  }
}
```

### Cursor/Windsurf (Any Platform)

**File**: `~/.cursor/mcp.json` or `~/.codeium/windsurf/mcp_config.json`

```json
{
  "mcpServers": {
    "like-i-said": {
      "command": "node", 
      "args": ["/mnt/d/APPSNospaces/like-i-said-mcp/server-unified.js"],
      "env": {
        "MCP_MODE": "full"
      }
    }
  }
}
```

## Universal Data Access

### What This Achieves

✅ **Unified Memory Management**: All memories accessible from any client
✅ **Cross-Platform Tasks**: Tasks created in Claude Desktop visible in Claude Code
✅ **Real-Time Sync**: Changes made in one client immediately available in others
✅ **Single Source of Truth**: No more scattered data across different systems

### Data Flow

```
Claude Desktop (Windows) ────┐
                             ├─── D:\APPSNospaces\like-i-said-mcp\
Claude Code (WSL2) ──────────┤     ├── memories/
                             │     └── tasks/ 
Claude Code (WSL1) ──────────┤
                             │
Cursor/Windsurf ─────────────┘
```

## Verification Steps

### 1. Test Multi-Client Access
```bash
# From WSL2
npx @endlessblink/like-i-said-mcp watch

# Should show same tasks created from any MCP client
```

### 2. Test Cross-System Sync
1. Create memory in Claude Desktop (Windows)
2. Check if visible in Claude Code (WSL2)
3. Create task in Claude Code (WSL2)  
4. Check if visible in Claude Desktop (Windows)

### 3. Verify Storage Location
```bash
# All clients should read/write to:
ls /mnt/d/APPSNospaces/like-i-said-mcp/memories/
ls /mnt/d/APPSNospaces/like-i-said-mcp/tasks/
```

## Benefits

🚀 **Universal Access**: Same data from Windows, WSL2, WSL1
🚀 **Real-Time Collaboration**: Changes sync instantly between clients  
🚀 **Simplified Setup**: Just point all clients to same directory
🚀 **Zero Fragmentation**: All memories/tasks in one location
🚀 **Development Workflow**: Use Claude Desktop for heavy work, Claude Code for quick tasks

## Result

**Any MCP client you configure will access the same unified storage**, making your memory and task system truly universal across all environments and tools.