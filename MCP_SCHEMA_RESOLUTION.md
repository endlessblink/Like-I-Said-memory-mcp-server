# MCP Schema Validation Error Resolution - Complete Solution

**Date**: August 18, 2025  
**Issue**: Claude Code v1.0.83+ showing "tools.45.custom.input_schema: JSON schema is invalid. It must match JSON Schema draft 2020-12" error  
**Status**: ✅ **RESOLVED**

## Root Cause Discovered

Multiple MCP server processes running simultaneously:
- ❌ **Old problematic server**: `/mnt/c/Users/endle/mcp-servers/like-i-said-v2/server.js` (45 tools with invalid schemas)
- ✅ **Correct server**: `/mnt/d/APPSNospaces/like-i-said-mcp/server-markdown.js` (41 tools with proper schemas)

## Solution Steps Applied

### 1. Process Cleanup
- Killed conflicting old MCP server processes using `pkill` commands
- Identified background processes with `ps aux | grep server-markdown`
- Terminated processes that were loading old cached schemas

### 2. Configuration Cleanup
- **Global Claude Code config**: `~/.config/claude-code/mcp.json`
- **Cursor MCP config**: `~/.cursor/mcp.json`  
- **Local project config**: `~/.claude.json`
- Removed duplicate and conflicting server entries
- Ensured single source of truth for MCP server configuration

### 3. Cache Clearing
- Cleared Claude Code cache directories: `~/.cache/claude-cli-nodejs/`
- Forced fresh MCP server connections
- Eliminated stale schema caches

### 4. Configuration Restoration
- Re-added clean Like-I-Said MCP server configuration
- Verified proper environment variables and paths
- Confirmed single server instance running

## Key Insights

1. **Schema Format Was Already Correct**: The Like-I-Said server already had proper JSON Schema 2020-12 compliance with `"$schema": "https://json-schema.org/draft/2020-12/schema"`

2. **Issue Was Process Management**: Multiple competing server processes, not actual schema validation problems

3. **Claude Code Caching**: Claude Code was connecting to an old cached server configuration with invalid schemas from previous sessions

4. **Tool Count Mismatch**: Error referenced "tools.45" but current server only has 41 tools, confirming old server interference

## Technical Environment

- **OS**: WSL2 Ubuntu
- **Node.js**: v22.17.1
- **Claude Code**: v1.0.83 (introduced stricter JSON Schema validation)
- **MCP SDK**: @modelcontextprotocol/sdk v1.15.1
- **Schema Library**: zod-to-json-schema v3.24.6

## Resolution Confirmation

- ✅ MCP server responding correctly to tool calls
- ✅ No more "tools.45.custom.input_schema" errors
- ✅ All JSON Schema validation errors resolved  
- ✅ Advanced features initializing successfully
- ✅ Test tools working properly
- ✅ Message: "🔧 Initializing advanced features... ✅ Advanced features initialized successfully"

## Data Preservation

- **Memory Files**: 861 files preserved in `/mnt/d/APPSNospaces/like-i-said-mcp/memories/`
- **Task Files**: 84 files preserved in `/mnt/d/APPSNospaces/like-i-said-mcp/tasks/`
- **Configuration**: All user data and settings maintained

## Diagnostic Commands Used

```bash
# Check running processes
ps aux | grep -E "(server-markdown|like-i-said|mcp)"

# Kill conflicting processes  
pkill -f "old-server-path"

# Clear cache
rm -rf ~/.cache/claude-cli-nodejs/*

# Test MCP server directly
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node server-markdown.js

# Verify MCP status
claude mcp list
```

## Future Prevention

1. **Single Server Instance**: Ensure only one MCP server instance runs per configuration
2. **Process Monitoring**: Regularly check for duplicate/conflicting processes
3. **Cache Management**: Clear Claude Code cache when experiencing configuration issues
4. **Schema Validation**: Verify JSON Schema 2020-12 compliance during development

## Lesson Learned

This complex debugging session highlighted that **system-level process management** can often be the root cause of seemingly technical schema validation errors. The solution was systematic process cleanup rather than code changes, emphasizing the importance of examining the full system state during troubleshooting.