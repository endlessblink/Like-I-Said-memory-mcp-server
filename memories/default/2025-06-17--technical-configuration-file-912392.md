---
id: 1750185153231
timestamp: 2025-06-17T18:32:33.231Z
complexity: 4
tags: ["technical-config", "file-structure", "mcp-setup", "wsl-configuration", "development-commands"]
priority: medium
status: active
access_count: 0
last_accessed: 2025-06-17T18:32:33.231Z
metadata:
  content_type: code
  size: 1313
  mermaid_diagram: false
---## Technical Configuration & File Structure

**PROJECT LOCATION:**
`/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2`

**KEY FILES:**
- `server-markdown.js` - MCP server with markdown storage (ACTIVE)
- `server.js` - Original JSON-based MCP server (LEGACY)  
- `dashboard-server-markdown.js` - Read-only markdown API server
- `dashboard-server.js` - Full-featured JSON API server
- `package.json` - Scripts and dependencies (v2.0.2)

**MCP CONFIGURATION:**
Claude Code WSL config in `~/.claude.json`:
```json
"like-i-said-v2": {
  "command": "node",
  "args": ["/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2/server.js"],
  "cwd": "/mnt/d/APPSNospaces/Like-I-said-mcp-server-v2"
}
```

**DEVELOPMENT COMMANDS:**
- `npm run dev:markdown` - Start markdown dashboard (API: 3001, UI: 5173)
- `npm run start:mcp-markdown` - Start markdown MCP server
- `npm run dev:full` - Start JSON dashboard (legacy mode)

**MEMORY STORAGE:**
- Format: Markdown files with YAML frontmatter
- Location: `/memories/[project]/YYYY-MM-DD-slug-timestamp.md`
- Migration: 15 memories successfully migrated from JSON
- Projects: Organized by directory structure

**STATUS:**
- ✅ MCP server working in Claude Code WSL
- ✅ Markdown storage system operational
- ✅ Auto-migration from JSON completed
- 🚧 Enhanced frontmatter structure in progress