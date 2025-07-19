# Installation Flow - Visual Comparison

## Method 1: Local Installation via NPX

```
User runs: npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install
    ↓
NPX downloads package to cache (~/.npm/_npx/)
    ↓
Runs: cli.js install
    ↓
Copies files to current directory:
  • mcp-server-wrapper.js
  • server-markdown.js
  • package.json
  • Creates memories/ directory
  • Creates tasks/ directory
    ↓
Configures IDEs with LOCAL PATH:
{
  "command": "node",
  "args": ["/current/dir/mcp-server-wrapper.js"]
}
    ↓
✅ Result: Local installation with local files
```

## Method 2: Claude MCP Add Command

```
User runs: claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
    ↓
Claude adds configuration:
{
  "command": "npx",
  "args": ["-y", "-p", "@endlessblink/like-i-said-v2@latest", "like-i-said-v2"]
}
    ↓
NO files created locally
    ↓
When Claude starts:
    ↓
Runs: npx -y -p @endlessblink/like-i-said-v2@latest like-i-said-v2
    ↓
NPX downloads to cache (if needed)
    ↓
Runs cli.js from cache
    ↓
cli.js detects non-TTY → starts MCP server
    ↓
✅ Result: No local files, runs from NPX cache
```

## Key Differences

| Aspect | Local Installation | Claude MCP Add |
|--------|-------------------|----------------|
| **Command** | `npx ... install` | `claude mcp add ...` |
| **Local Files** | ✅ Created | ❌ None |
| **Config Type** | Local path | NPX command |
| **Storage Location** | Current directory | NPX cache |
| **Memory/Task Location** | `./memories`, `./tasks` | `~/memories`, `~/tasks` |
| **Best For** | Dashboard, development | Quick setup, no clutter |

## Implementation Logic in cli.js

```javascript
if (context.isNpxInstall && !fs.existsSync(localServerPath)) {
  // No local files → Use NPX command
  config = { command: 'npx', args: ['-y', '-p', '@endlessblink/like-i-said-v2@latest', 'like-i-said-v2'] }
} else if (fs.existsSync(localServerPath)) {
  // Local files exist → Use local path
  config = { command: 'node', args: [localServerPath] }
}
```