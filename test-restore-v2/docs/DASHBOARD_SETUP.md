# Like-I-Said Dashboard Setup Guide

⚡ **IMPORTANT**: The dashboard runs on a SINGLE PORT (not 5173!)

## Quick Start for Windows

1. **Clone the repository** (in a new terminal):
   ```bash
   git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
   cd Like-I-Said-memory-mcp-server
   ```

2. **Run the dashboard**:
   ```bash
   npm install
   npm run start:dashboard
   ```

3. **Access the dashboard**:
   - Look for "DASHBOARD READY!" in the console
   - Open the URL shown (usually http://localhost:3002)
   - **IGNORE any mention of port 5173** - that's only for development

## Quick Start for Mac/Linux

1. **Clone the repository**:
   ```bash
   git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
   cd Like-I-Said-memory-mcp-server
   ```

2. **Run the dashboard**:
   ```bash
   ./run-dashboard.sh
   ```

3. **Access the dashboard**:
   - Open your browser to: http://localhost:5173

## What the Dashboard Shows

- **Memories Tab**: View, search, and manage all your memories
- **Tasks Tab**: Manage tasks with status tracking
- **Statistics**: View usage analytics and insights
- **Settings**: Configure dashboard preferences

## Troubleshooting

### "npm not found" error
- Install Node.js from https://nodejs.org/

### Port already in use
- The dashboard server automatically finds an available port
- Look for "DASHBOARD READY!" in the console for the actual URL
- The server will choose a different port if the default is busy

### Dashboard not loading
- Check the console for the actual URL (shown after "DASHBOARD READY!")
- **IGNORE port 5173** - that's only for development
- The dashboard runs on a single port (usually 3002)
- Check the terminal for any error messages
- Try refreshing the browser

### Can't see my memories/tasks
- The dashboard automatically connects to the same directories configured in Claude Desktop
- Check that you have memories/tasks created through Claude

## Manual Commands (if needed)

```bash
# Install dependencies
npm install

# Start API server only (port 3001)
npm run start:dashboard

# Start React dashboard only (port 5173)
npm run dev

# Start both servers
npm run dev:full
```