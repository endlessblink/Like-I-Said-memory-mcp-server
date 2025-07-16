# Like-I-Said Dashboard Setup Guide

## Quick Start for Windows

1. **Clone the repository** (in a new terminal):
   ```bash
   git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
   cd Like-I-Said-memory-mcp-server
   ```

2. **Run the dashboard**:
   ```bash
   run-dashboard.bat
   ```

3. **Access the dashboard**:
   - Open your browser to: http://localhost:5173
   - The dashboard will automatically connect to your memories and tasks

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
- The API server runs on port 3001
- The React dashboard runs on port 5173
- If either port is busy, close other applications using those ports

### Dashboard not loading
- Wait 10-15 seconds for both servers to start
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