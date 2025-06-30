# Like-I-Said MCP Server v2 - Session Drop-off Prompt

## Quick Copy-Paste Prompt for New Session

```
Continue working on Like-I-Said MCP Server v2 from where we left off.

Project location: /mnt/d/APPSNospaces/Like-I-said-mcp-server-v2
Current version: 2.3.7

Recent implementations:
1. WebSocket real-time updates - Dashboard auto-refreshes when memories are saved
2. Fixed memory format inconsistency - All memories now load correctly
3. Created shared MemoryFormat module for consistent parsing

Current status:
- Dashboard shows all memories correctly ✅
- WebSocket connection indicator working ✅
- Memory format migration complete ✅
- Shared format parser implemented ✅

Next priorities:
1. Test the WebSocket updates with actual MCP memory creation
2. Update MCP server to use shared MemoryFormat module
3. Add error handling for malformed memory files
4. Implement batch memory operations

Quick verification:
cd /mnt/d/APPSNospaces/Like-I-said-mcp-server-v2
npm run dev:full
# Dashboard: http://localhost:5173
# API: http://localhost:3001
```

## Full Context Commands

```bash
# Navigate to project
cd /mnt/d/APPSNospaces/Like-I-said-mcp-server-v2

# Check current status
git status
find memories -name "*.md" | wc -l  # Check memory count

# Start development
npm run dev:full

# Test dashboard API
curl http://localhost:3001/api/memories | jq '. | length'

# Run memory format migration (if needed)
npm run migrate
```

## Key Files Modified Today

1. `/src/App.tsx` - Added WebSocket client for real-time updates
2. `/dashboard-server-bridge.js` - Updated to use shared MemoryFormat
3. `/lib/memory-format.js` - NEW: Shared memory parser/generator
4. `/scripts/migrate-memory-formats.js` - NEW: Migration tool
5. Fixed: `memories/default/2025-06-17_5bf3aec7.md`
6. Fixed: `memories/default/2025-06-18_8d47b584.md`

## Implementation Details

### WebSocket Real-time Updates
- React app connects to WebSocket on mount
- Auto-reconnects if connection drops (3s delay)
- Visual indicator: green (connected) / yellow (disconnected)
- Refreshes memories on file change events

### Memory Format Consistency
- Problem: 2 files used HTML comments instead of YAML frontmatter
- Solution: Created MemoryFormat module that handles both formats
- Migration script available: `npm run migrate`
- Both MCP and dashboard now use same parser

### Current Architecture
```
MCP Server (server-markdown.js) <-> Memory Files <-> Dashboard (React + Express)
                                         |
                                   File Watcher
                                         |
                                   WebSocket Updates
```

## Testing the Implementation

1. Create a new memory via MCP:
```json
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "add_memory", "arguments": {"content": "Test WebSocket update", "tags": ["test"]}}}
```

2. Watch dashboard update automatically without refresh

3. Check WebSocket console logs in browser DevTools

## Remember
- Always use shared MemoryFormat module for parsing/generating
- Dashboard expects YAML frontmatter at top of files
- WebSocket runs on same port as Express API (3001)
- File watcher uses chokidar for cross-platform compatibility