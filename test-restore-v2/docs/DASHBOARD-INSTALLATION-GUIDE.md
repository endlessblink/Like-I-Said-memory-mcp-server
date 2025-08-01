# Dashboard Installation Guide

This guide will help you install and set up the Like-I-Said MCP Server v2 Dashboard.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- A Claude-compatible client (Claude Desktop, Cursor, Windsurf, etc.)

## Quick Start (5 minutes)

### 1. Choose Your Installation Method

#### For Claude Desktop Users
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
```

#### For Claude Code + IDE Users
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
```

### 2. Start the Dashboard
```bash
npm run start:dashboard
```

### 3. Open Dashboard
⚡ **IMPORTANT**: Look for "DASHBOARD READY!" in the console
- The server will show the URL (usually `http://localhost:3002`)
- Open that URL in your browser
- **IGNORE port 5173** if mentioned - that's only for development

That's it! The dashboard is now running and will show memories in real-time as you use Claude.

## Detailed Installation

### Step 1: Clone or Download

#### Option A: Clone from GitHub
```bash
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server
```

#### Option B: Download Release
1. Go to [Releases](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/releases)
2. Download the latest `like-i-said-v2.6.8.zip`
3. Extract to your desired location

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Build the Dashboard
```bash
npm run build
```

### Step 4: Configure Your Claude Client

<details>
<summary><b>Claude Desktop Configuration</b></summary>

1. Run the NPX installation command
2. Restart Claude Desktop
3. Dashboard will be available at the URL shown in console

</details>

<details>
<summary><b>Cursor Configuration</b></summary>

1. Open Cursor settings
2. Find MCP configuration
3. Add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["C:/path/to/Like-I-Said-memory-mcp-server/server-markdown.js"]
    }
  }
}
```

</details>

<details>
<summary><b>Windsurf Configuration</b></summary>

1. Open Windsurf settings
2. Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcp": {
    "servers": {
      "like-i-said-memory-v2": {
        "command": "node",
        "args": ["/path/to/Like-I-Said-memory-mcp-server/server-markdown.js"]
      }
    }
  }
}
```

</details>

### Step 5: Start the Services

#### Development Mode (Recommended for First Use)
```bash
# Start the dashboard server
npm run start:dashboard
```

This starts:
- API Server with dashboard (single port, shown in console)
- WebSocket for real-time updates
- All memory and task management features

⚠️ **Note**: Port 5173 is ONLY for React development. Normal users should use the URL shown in console (usually port 3002).

#### Production Mode
```bash
# Terminal 1: Start MCP Server
npm start

# Terminal 2: Start Dashboard API
npm run start:dashboard
```

Dashboard will be available at the URL shown in console (check for "DASHBOARD READY!")

## Verifying Installation

### 1. Check MCP Server
In your Claude client, type:
```
/test memory system
```

You should see: "✅ MCP memory system is working!"

### 2. Check Dashboard
1. Open `http://localhost:5173` (dev) or `http://localhost:3001` (prod)
2. You should see the Like-I-Said dashboard
3. The status indicator should show "Connected"

### 3. Test Memory Creation
In Claude, type:
```
Remember this: The dashboard is working perfectly!
```

The memory should appear instantly in the dashboard.

## Configuration Options

### Custom Storage Paths
1. Open dashboard
2. Go to Settings → Path Configuration
3. Set custom paths for memories and tasks
4. Click "Update Paths"

### Port Configuration
If default ports are in use:

```bash
# Use custom API port
PORT=3002 npm run start:dashboard

# Dashboard will auto-discover the API port
```

### Authentication (Optional)
By default, authentication is disabled. To enable:

1. Go to Settings → Authentication
2. Toggle "Enable Authentication"
3. Create your admin account
4. Restart the server

## Troubleshooting

### Dashboard Won't Load
```bash
# Check if services are running
ps aux | grep node

# Check ports
netstat -an | grep -E "3001|5173"

# Restart the dashboard
npm run start:dashboard
```

### "Port already in use" Error
```bash
# Kill processes on ports
# Linux/Mac
lsof -ti:3001 | xargs kill -9
lsof -ti:5173 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Memories Not Appearing
1. Check WebSocket connection (status indicator)
2. Verify MCP server is running
3. Check browser console for errors
4. Try refreshing the page

### API Connection Failed
1. Check if API server is running
2. Verify no firewall blocking
3. Try accessing `http://localhost:3001/api/status`

## Advanced Usage

### Running on Different Host
```bash
# Make dashboard accessible on network
VITE_HOST=0.0.0.0 npm run dev

# Access from other devices
http://YOUR-IP:5173
```

### Using with Docker
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
    }
}
```

## Updating

### Auto Update Check
The dashboard checks for updates automatically and shows a notification when available.

### Manual Update
```bash
git pull origin main
npm install
npm run build
# Restart services
```

## Support

- **Issues**: [GitHub Issues](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/discussions)
- **Documentation**: [Full Docs](https://github.com/endlessblink/Like-I-Said-memory-mcp-server#readme)

---

Enjoy your new Like-I-Said Dashboard! 🎉