# Like I Said MCP Server v2 - Production

## Production Files Only

This package contains only the essential files for production deployment:

### Core Files:
- `server-markdown.js` - Main MCP server with enhanced markdown storage
- `dashboard-server-bridge.js` - WebSocket-enabled API server  
- `cli.js` - NPX installer for all MCP clients
- `package.json` - Dependencies and scripts

### Frontend Dashboard:
- `src/` - React TypeScript dashboard application
- `dist/` - Built production assets
- `index.html` - Dashboard entry point

### Configuration:
- `claude_desktop_config.json` - Example Claude Desktop config
- `mcp-config.json` - Example MCP configuration
- `ecosystem.config.js` - PM2 process management

### Storage:
- `memories/` - Markdown-based memory storage with frontmatter
- `memories.json` - Fallback JSON storage

## Quick Start:
```bash
npx @endlessblink/like-i-said-v2 install
```

All development and testing files have been removed for production deployment.
