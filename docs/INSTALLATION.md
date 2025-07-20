# Installation Guide

Like-I-Said v2 supports multiple installation methods depending on your use case.

## Quick Install Options

### 1. Claude Desktop Users - Recommended

The recommended installation method for Claude Desktop users is via NPX (see option 2 below).

### 2. NPX Installation (For All Users)

**This method is for Claude Code users** who are using Claude through web browsers with IDE integrations (Cursor, Windsurf, VS Code).

```bash
# Install in current directory
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install

# Install to a specific directory
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path /opt/mcp-servers/like-i-said

# Windows example
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install --path C:\tools\mcp-servers\like-i-said
```

This will:
- Install the MCP server in the specified directory (or current directory if no --path)
- Configure your IDE (Cursor, Windsurf, VS Code)
- Set up the necessary paths

### 3. Manual Installation

```bash
# Clone the repository
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server

# Install dependencies
npm install

# Run the installer
node cli.js install
```

## IDE Configuration

### Cursor
Configuration file: `~/.cursor/mcp.json`
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["/path/to/server-markdown.js"]
    }
  }
}
```

### Windsurf
Configuration file: `~/.codeium/windsurf/mcp_config.json`
```json
{
  "mcp": {
    "servers": {
      "like-i-said-memory-v2": {
        "command": "node",
        "args": ["/path/to/server-markdown.js"]
      }
    }
  }
}
```

### VS Code with Continue
Follow the Continue extension documentation for MCP server configuration.

## Verification

After installation, restart your IDE and check that the MCP tools are available:
- `add_memory` - Store memories
- `search_memories` - Search stored memories
- `create_task` - Create tasks
- And 20+ more tools

## Troubleshooting

### Tools not appearing
1. Restart your IDE
2. Check the MCP configuration file path
3. Verify Node.js is installed (v18+ required)

### Permission errors
- Windows: Run installer as Administrator
- macOS/Linux: You may need to use `sudo` for global installation

### Connection issues
- Check firewall settings for port 3001 (dashboard)
- Verify the server path in your configuration

For more help, see our [GitHub Issues](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues)