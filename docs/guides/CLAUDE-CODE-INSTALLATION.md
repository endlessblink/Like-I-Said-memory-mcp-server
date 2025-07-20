# Claude Code Installation Guide

## What is Claude Code?

Claude Code is Anthropic's terminal CLI tool that runs locally in your command line. It allows you to use Claude directly from your terminal and integrates with various IDEs. This is different from Claude Desktop, which is a standalone desktop application.

## Installation Command

To add Like-I-Said to Claude Code, use this command:

```bash
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
```

## Alternative Methods

### Direct NPX Installation

If the Claude CLI command doesn't work, you can use direct NPX:

```bash
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install
```

### Manual Installation

```bash
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server
npm install
node cli.js install
```

## Manual IDE Configuration

If automatic configuration fails, you can manually configure your IDE:

### For Cursor

Edit `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "npx",
      "args": ["-p", "@endlessblink/like-i-said-v2@latest", "like-i-said-v2"]
    }
  }
}
```

### For Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcp": {
    "servers": {
      "like-i-said-memory-v2": {
        "command": "npx",
        "args": ["-p", "@endlessblink/like-i-said-v2@latest", "like-i-said-v2"]
      }
    }
  }
}
```

### For VS Code with Continue

Follow the Continue extension's MCP configuration guide to add the server.

## Verification

After installation:
1. Restart your IDE
2. In Claude, ask: "What MCP tools do you have available?"
3. You should see 27 tools including `add_memory`, `create_task`, etc.

## Troubleshooting

### Wrong Installation Method Used

If you accidentally used the wrong installation method:
1. Use the NPX command above for proper installation
2. Restart your IDE

### Command Not Found

If `claude` command is not found:
1. Ensure you have Claude CLI installed
2. Use the direct NPX installation method instead

### Windows WSL Issues

For Windows WSL users:
```bash
# Try with explicit package specification
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install

# Or clone and install manually
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server
npm install
node cli.js install
```

## Common Mistakes

1. **Using the wrong package name**: The correct package is `@endlessblink/like-i-said-v2`, not `like-i-said-memory-mcp-v2`
2. **Missing -p flag**: Always use `npx -p` when specifying the package
3. **Not restarting IDE**: Always restart your IDE after installation

## Support

If you continue to have issues:
1. Check the [GitHub Issues](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues)
2. Ensure you're using Node.js 18+
3. Try the manual installation method