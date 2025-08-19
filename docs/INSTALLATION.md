# Installation Guide

Like-I-Said v2 is an advanced MCP memory management system with a modern React dashboard. This guide provides comprehensive installation instructions for all supported clients and deployment scenarios.

## Prerequisites

- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/)
- **npm or yarn** - Package manager (comes with Node.js)
- **Claude-compatible client** - Claude Desktop, Claude Code, or IDE with MCP support

## Quick Start (5 Minutes)

The fastest way to get started with Like-I-Said v2:

```bash
# Universal installation (works for all clients)
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install

# Start the dashboard (optional but recommended)
cd Like-I-Said-memory-mcp-server  # or your install directory
npm run start:dashboard
```

This will:
- Install the MCP server
- Auto-configure your IDE (Cursor, Windsurf, VS Code)
- Provide 27 powerful tools for memory and task management
- Set up the dashboard for visual memory management

## Installation Methods

### Method 1: NPX Installation (Recommended)

**Best for:** All users, especially beginners

```bash
# Install in current directory
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install

# Install to specific directory
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path /opt/mcp-servers/like-i-said

# Windows example
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path C:\tools\mcp-servers\like-i-said
```

**What this does:**
- Downloads the latest version from npm registry
- Auto-detects and configures your IDE
- Creates all necessary configuration files
- Sets up proper file paths

### Method 2: Claude Code CLI Integration

**Best for:** Claude Code users who want direct CLI integration

```bash
# Add to Claude Code MCP servers
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
```

**Note:** This requires having Claude CLI installed. If the command fails, use Method 1 instead.

### Method 3: Manual Installation

**Best for:** Developers, contributors, or custom setups

```bash
# Clone the repository
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server

# Install dependencies
npm install

# Run the installer
node cli.js install
```

## Client Configuration

### Claude Desktop Setup

1. Run the NPX installation command above
2. The installer will automatically configure Claude Desktop
3. Restart Claude Desktop
4. Test with: "What MCP tools do you have available?"

### Claude Code Setup

Claude Code is Anthropic's terminal CLI tool for local development:

1. Install using Method 2 (Claude CLI) or Method 1 (NPX)
2. Restart your IDE/terminal
3. Verify tools are available with: "List your available tools"

### IDE Configuration

The installer automatically configures these IDEs:

#### Cursor
Configuration file: `~/.cursor/mcp.json`
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "npx",
      "args": ["-p", "@endlessblink/like-i-said-v2@latest", "like-i-said-v2"],
      "env": {
        "MCP_QUIET": "true"
      }
    }
  }
}
```

#### Windsurf
Configuration file: `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcp": {
    "servers": {
      "like-i-said-memory-v2": {
        "command": "npx",
        "args": ["-p", "@endlessblink/like-i-said-v2@latest", "like-i-said-v2"],
        "env": {
          "MCP_QUIET": "true"
        }
      }
    }
  }
}
```

#### VS Code with Continue
Follow the Continue extension's MCP configuration documentation to add the server configuration.

**Manual Configuration (if auto-config fails):**
```json
{
  "command": "node",
  "args": ["/absolute/path/to/server-markdown.js"]
}
```

## Dashboard Setup

The dashboard provides a modern React interface for managing memories and tasks.

### Quick Dashboard Start

```bash
# Navigate to installation directory
cd Like-I-Said-memory-mcp-server  # or your install path

# Install dependencies (if not already done)
npm install

# Start the dashboard
npm run start:dashboard
```

**⚡ IMPORTANT:** Look for "DASHBOARD READY!" in the console. The dashboard runs on a single port (usually http://localhost:3002), NOT port 5173.

### Dashboard Features

- **Memories Tab**: View, search, and manage all your memories
- **Tasks Tab**: Create and track tasks with status management
- **Statistics**: Usage analytics and insights
- **Settings**: Configure paths, authentication, and preferences
- **Real-time Updates**: See memories appear as you use Claude

### Development Mode

For developers working on the dashboard:

```bash
# Start both API server and React dev server
npm run dev:full

# Or start individually:
npm run start:dashboard  # API server (port 3001)
npm run dev             # React dev server (port 5173)
```

## Configuration Options

### Custom Storage Paths

Set custom paths for memories and tasks:

1. Open the dashboard
2. Go to Settings → Path Configuration
3. Set custom paths for memories and tasks
4. Click "Update Paths"
5. Restart the MCP server

### Port Configuration

If default ports are in use:

```bash
# Use custom API port
PORT=3002 npm run start:dashboard

# Dashboard auto-discovers the API port
```

### Authentication (Optional)

By default, authentication is disabled. To enable:

1. Open dashboard → Settings → Authentication
2. Toggle "Enable Authentication" 
3. Create your admin account
4. Restart the server

**Programmatic Setup:**
```bash
curl -X POST http://localhost:3001/api/settings/setup-auth \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin", 
    "password": "your-secure-password"
  }'
```

## Verification

### Check MCP Server
In your Claude client, type:
```
Test the memory system
```
You should see: "✅ MCP memory system is working!"

### Check Available Tools
Ask Claude: "What MCP tools do you have available?"

You should see 27 tools including:
- **Memory Tools**: `add_memory`, `search_memories`, `list_memories`, `get_memory`, `delete_memory`
- **Task Tools**: `create_task`, `update_task`, `list_tasks`, `get_task_context`, `delete_task`
- **Advanced Tools**: `generate_dropoff`, `enhance_memory_metadata`, task analytics, and more

### Test Memory Creation
In Claude, say:
```
Remember this: The dashboard is working perfectly!
```

The memory should appear instantly in the dashboard (if running).

## Troubleshooting

### Installation Issues

#### "npm not found" error
- Install Node.js from https://nodejs.org/
- Restart your terminal after installation

#### Permission errors  
- **Windows**: Run installer as Administrator
- **macOS/Linux**: You may need `sudo` for global installation
- **WSL**: Use the Linux commands in WSL terminal

#### Package not found
- Ensure you're using the correct package name: `@endlessblink/like-i-said-v2`
- Try clearing npm cache: `npm cache clean --force`

### MCP Server Issues

#### Tools not appearing
1. **Restart your IDE/client** - This is the most common fix
2. Check MCP configuration file exists and has correct path
3. Verify Node.js v18+ is installed: `node --version`
4. Check for error messages in IDE console/logs

#### Wrong installation method used
If you see errors or missing tools:
1. Use the NPX installation method (most reliable)
2. Remove any old configurations
3. Restart your IDE completely

#### Windows WSL Issues
```bash
# Try explicit package specification
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install

# Or manual installation
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server
npm install
node cli.js install
```

### Dashboard Issues

#### Dashboard won't load
```bash
# Check if services are running
ps aux | grep node

# Check ports (Linux/Mac)
netstat -an | grep -E "3001|5173"

# Windows
netstat -ano | findstr :3001

# Restart dashboard
npm run start:dashboard
```

#### "Port already in use" error
```bash
# Kill processes on ports (Linux/Mac)
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

#### Memories not appearing
1. Check WebSocket connection (dashboard status indicator)
2. Verify MCP server is running and configured
3. Check browser console for errors  
4. Try refreshing the page
5. Test memory creation in Claude client

#### API connection failed
1. Verify API server is running: `http://localhost:3001/api/status`
2. Check firewall isn't blocking the connection
3. Try different port: `PORT=3002 npm run start:dashboard`

### Connection Issues

#### Firewall blocking
- **Windows**: Allow Node.js through Windows Firewall
- **macOS**: Check System Preferences → Security → Firewall
- **Linux**: Check iptables or ufw rules

#### Path issues
- Use absolute paths in configuration files
- Verify the server file exists at the specified path
- Check file permissions

### Common Mistakes

1. **Wrong package name**: Use `@endlessblink/like-i-said-v2`, not `like-i-said-memory-mcp-v2`
2. **Missing -p flag**: Always use `npx -p` when specifying packages
3. **Not restarting IDE**: Always restart your IDE after installation
4. **Confusing port 5173**: The dashboard runs on port 3002 (or as shown in console), not 5173

## Advanced Usage

### Running on Different Host

```bash
# Make dashboard accessible on network
VITE_HOST=0.0.0.0 npm run dev

# Access from other devices
http://YOUR-IP:5173
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3001
CMD ["npm", "run", "start:dashboard"]
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name memories.local;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }
}
```

## Updating

### Automatic Updates

The dashboard checks for updates automatically and shows notifications when available.

### Manual Update

```bash
# If installed via NPX (recommended)
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install

# If manually installed
git pull origin main
npm install
npm run build
# Restart services
```

## Support and Resources

- **GitHub Repository**: [Like-I-Said Memory MCP Server](https://github.com/endlessblink/Like-I-Said-memory-mcp-server)
- **Issues**: [GitHub Issues](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues)  
- **Discussions**: [GitHub Discussions](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/discussions)
- **Documentation**: [Full Documentation](https://github.com/endlessblink/Like-I-Said-memory-mcp-server#readme)

## What's Next?

After successful installation:

1. **Create your first memory**: Ask Claude to remember something important
2. **Open the dashboard**: See your memories visually organized
3. **Create tasks**: Use task management features for project organization
4. **Explore advanced features**: Try semantic search, memory linking, and analytics

---

🎉 **Congratulations!** You now have a powerful MCP memory system running with Like-I-Said v2. Enjoy enhanced conversations with persistent memory across all your Claude interactions!