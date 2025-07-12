# Claude Desktop + WSL Setup Guide

Since you're running the MCP server in WSL (Windows Subsystem for Linux), Claude Desktop on Windows needs special configuration to connect to it.

## Quick Setup (Recommended)

### Step 1: Copy the Batch File to Windows
1. Open Windows File Explorer
2. Navigate to a location like `C:\Users\YourUsername\Documents\`
3. Copy the `like-i-said-mcp.bat` file from this WSL directory to that Windows location

### Step 2: Update Claude Desktop Configuration
1. Open Windows File Explorer
2. Navigate to: `%APPDATA%\Claude\`
3. Open or create `claude_desktop_config.json`
4. Use this configuration:

```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "C:\\Users\\YourUsername\\Documents\\like-i-said-mcp.bat",
      "args": [],
      "env": {}
    }
  }
}
```

Replace `YourUsername` with your actual Windows username.

### Step 3: Restart Claude Desktop
1. Completely quit Claude Desktop (right-click system tray icon > Quit)
2. Start Claude Desktop again
3. The MCP tools should now appear

## Alternative Methods

### Method 1: Direct WSL Command
Use this configuration in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "wsl",
      "args": [
        "-e",
        "node",
        "/home/endlessblink/projects/like-i-said-mcp-server-v2/server-markdown.js"
      ],
      "env": {}
    }
  }
}
```

### Method 2: WSL with Bash Wrapper
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "wsl",
      "args": [
        "-e",
        "bash",
        "-c",
        "cd /home/endlessblink/projects/like-i-said-mcp-server-v2 && node server-markdown.js"
      ],
      "env": {}
    }
  }
}
```

## Troubleshooting

### 1. Verify WSL is Working
Open Windows Command Prompt and run:
```cmd
wsl -e node --version
```

You should see the Node.js version. If not, ensure WSL is installed and running.

### 2. Check Claude Desktop Developer Tools
1. In Claude Desktop, press `Ctrl+Shift+I` to open developer tools
2. Check the Console tab for any error messages
3. Look for MCP-related errors

### 3. Test the Batch File
Open Windows Command Prompt and run:
```cmd
C:\Users\YourUsername\Documents\like-i-said-mcp.bat
```

You should see the server start. Press Ctrl+C to stop it.

### 4. Common Issues
- **"wsl is not recognized"**: WSL is not installed or not in PATH
- **"node: command not found"**: Node.js is not installed in WSL
- **No MCP tools showing**: Configuration syntax error or Claude needs restart
- **Permission denied**: The batch file needs to be in a Windows directory, not WSL

### 5. Debug Mode
Add logging to see what's happening:

```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "cmd",
      "args": [
        "/c",
        "echo Starting MCP server... && wsl -e bash -c \"cd /home/endlessblink/projects/like-i-said-mcp-server-v2 && node server-markdown.js\""
      ],
      "env": {}
    }
  }
}
```

## Verification
Once properly configured, you should see these tools in Claude Desktop:
- add_memory
- get_memory
- list_memories
- search_memories
- create_task
- update_task
- And many more...

## Need Help?
Run the diagnostic script from WSL:
```bash
node diagnose-claude-desktop.js
```