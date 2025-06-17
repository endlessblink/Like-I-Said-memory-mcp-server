# 🚀 Like I Said MCP v2 - Complete Setup Instructions

## Step-by-Step Installation Guide

### Option 1: NPX Installation (Recommended) ⚡

```bash
# Install for all MCP clients automatically
npx @endlessblink/like-i-said-v2 install

# Restart your AI client (Claude Desktop, Cursor, etc.)
# Ask: "What MCP tools do you have available?"
```

### Option 2: Manual Development Setup 🛠️

#### Prerequisites:
- Node.js 18+ 
- npm 8+
- Git

#### 1. Clone Repository
```bash
git clone https://github.com/endlessblink/like-i-said-mcp-server.git
cd like-i-said-mcp-server
```

#### 2. Install Dependencies
```bash
npm install
```

#### 3. Test MCP Server
```bash
# Test MCP server functionality
npm run test:mcp

# Expected output: JSON with 6 tools listed
```

#### 4. Start Development Environment
```bash
# Start both API server (port 3001) and React dashboard (port 5173)
npm run dev:full
```

#### 5. Access Dashboard
- **React Dashboard**: http://localhost:5173
- **API Status**: http://localhost:3001/api/status

#### 6. Configure MCP Clients

**Claude Desktop:**
```json
{
  "mcpServers": {
    "like-i-said-memory": {
      "command": "node",
      "args": ["/path/to/your/project/server-markdown.js"]
    }
  }
}
```

**Cursor:**
```json
{
  "mcpServers": {
    "like-i-said-memory": {
      "command": "node", 
      "args": ["/path/to/your/project/server-markdown.js"]
    }
  }
}
```

**Claude Code (VS Code):**
```json
{
  "claude.mcpServers": {
    "like-i-said-memory": {
      "command": "node",
      "args": ["/path/to/your/project/server-markdown.js"],
      "env": {}
    }
  }
}
```

## 🧪 Testing & Validation

### Basic Tests
```bash
# Test MCP server
echo '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' | node server-markdown.js

# Test CLI help
node cli.js --help

# Test API (if running)
curl http://localhost:3001/api/status
```

### Development Commands
```bash
# Start just the MCP server
npm run start

# Start just the dashboard API
npm run start:dashboard

# Start just the React frontend
npm run dev

# Build for production
npm run build
```

## 📁 File Structure Explained

```
like-i-said-mcp-server-v2/
├── server-markdown.js          # Main MCP server (production)
├── dashboard-server-bridge.js  # WebSocket API server
├── cli.js                      # NPX installer script
├── package.json               # Dependencies and scripts
├── memories/                  # Markdown storage directory
│   ├── default/              # Default project memories
│   └── [project-name]/       # Project-specific memories
├── src/                      # React dashboard source
│   ├── App.tsx              # Main dashboard component
│   ├── components/          # UI components
│   ├── utils/              # Helper functions
│   └── types.ts            # TypeScript definitions
└── dist/                   # Built dashboard assets
```

## 🎯 Key Features

### Enhanced Memory System
- **Hierarchical Complexity**: 4-level system (L1-L4)
- **Smart Detection**: Automatic content analysis
- **Cross-References**: Memory relationships
- **Project Organization**: Group memories by project

### MCP Tools Available
1. **add_memory** - Store memories with enhanced metadata
2. **get_memory** - Retrieve by ID with full details
3. **list_memories** - Browse with complexity indicators
4. **delete_memory** - Remove memories safely
5. **search_memories** - Full-text search with filters
6. **test_tool** - Verify MCP connectivity

### Dashboard Features
- **Card Layout**: Visual memory organization
- **Advanced Search**: Multi-filter system
- **Real-time Sync**: WebSocket synchronization
- **Project Tabs**: Hierarchical organization
- **Export/Import**: Memory data management

## 🔧 Troubleshooting

### MCP Server Issues
```bash
# Check if Node.js is working
node --version

# Test server startup
node server-markdown.js
# Press Ctrl+C to stop
```

### Port Conflicts
```bash
# Check if ports are in use
netstat -an | grep 3001  # API port
netstat -an | grep 5173  # Dashboard port

# Kill processes if needed
pkill -f "dashboard-server"
pkill -f "vite"
```

### Memory Storage Issues
```bash
# Check memories directory
ls -la memories/

# Verify permissions
ls -la memories/default/

# Test memory creation
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"add_memory","arguments":{"content":"Test memory"}}}' | node server-markdown.js
```

### Client Configuration Issues
1. **Claude Desktop**: Restart completely (not just reload)
2. **Cursor**: Reload window (Ctrl+Shift+P → "Reload Window")
3. **Claude Code**: Reload VS Code window
4. **Check paths**: Ensure absolute paths in configs

## 📊 Production Usage

### NPM Package Commands
```bash
# Install globally
npm install -g @endlessblink/like-i-said-v2

# Use CLI commands
like-i-said-v2 install    # Install for all clients
like-i-said-v2 init       # Advanced configuration
like-i-said-v2 start      # Start MCP server
```

### PM2 Process Management
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
pm2 start ecosystem.config.js

# Monitor
pm2 status
pm2 logs like-i-said-mcp

# Stop
pm2 stop like-i-said-mcp
```

## 🎉 Success Verification

After setup, test with your AI client:

1. **Ask**: "What MCP tools do you have available?"
2. **Should see**: 6 memory tools listed
3. **Test**: "Add a test memory: Hello world"
4. **Verify**: "List all memories"
5. **Dashboard**: Visit http://localhost:5173 (if running dev)

## 🆘 Getting Help

- **GitHub Issues**: https://github.com/endlessblink/like-i-said-mcp-server/issues
- **Documentation**: README.md and CLAUDE.md
- **Test Commands**: All validation scripts included

---

*Like I Said MCP Server v2.0.3 - Production Ready* 🚀