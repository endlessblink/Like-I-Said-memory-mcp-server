# Claude Code MCP Installation Guide for like-i-said-memory-mcp-v2

This document explains how to properly install the like-i-said MCP server for Claude Code on WSL, Linux, and macOS.

## Problem Summary

Claude Code uses a different configuration system than Claude Desktop:
- ❌ **Wrong approach**: Editing configuration files like `/home/user/.config/claude-code/mcp.json`
- ✅ **Correct approach**: Using the `claude mcp add` CLI command

## Installation Methods

### Method 1: Direct Installation (Current)

For WSL/Linux/macOS users with the server files locally:

```bash
claude mcp add like-i-said-memory-mcp-v2 \
  -e MEMORY_DIR=/mnt/d/APPSNospaces/like-i-said-mcp-server-v2/memories \
  -e TASK_DIR=/mnt/d/APPSNospaces/like-i-said-mcp-server-v2/tasks \
  -e MCP_QUIET=true \
  -- node /mnt/d/APPSNospaces/like-i-said-mcp-server-v2/server-markdown.js
```

### Method 2: NPX Installation (Proposed)

To enable `npx -y like-i-said-memory-mcp-v2` installation, the package needs to be published to npm with this structure:

#### Package Structure

```
like-i-said-memory-mcp-v2/
├── package.json
├── bin/
│   └── cli.js          # Installation script
├── server-markdown.js  # Main server file
├── mcp-server-wrapper.js
└── README.md
```

#### package.json

```json
{
  "name": "like-i-said-memory-mcp-v2",
  "version": "1.0.0",
  "description": "Like-I-Said MCP Server for Claude Code",
  "bin": {
    "like-i-said-memory-mcp-v2": "./bin/cli.js"
  },
  "files": [
    "bin/",
    "server-markdown.js",
    "mcp-server-wrapper.js"
  ],
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### bin/cli.js

```javascript
#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// When run via npx, this script is in node_modules
const serverPath = path.join(__dirname, '..', 'server-markdown.js');

// Default directories
const homeDir = os.homedir();
const memoryDir = process.env.MEMORY_DIR || path.join(homeDir, '.like-i-said', 'memories');
const taskDir = process.env.TASK_DIR || path.join(homeDir, '.like-i-said', 'tasks');

// Ensure directories exist
[memoryDir, taskDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Check if running as MCP server or installer
if (process.argv.includes('--mcp-server')) {
  // Run as MCP server
  require('../server-markdown.js');
} else {
  // Run as installer
  console.log('Installing like-i-said MCP server for Claude Code...');
  
  const cmd = `claude mcp add like-i-said-memory-mcp-v2 \
    -e MEMORY_DIR="${memoryDir}" \
    -e TASK_DIR="${taskDir}" \
    -e MCP_QUIET=true \
    -- npx -y like-i-said-memory-mcp-v2 --mcp-server`;

  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log('\n✅ Successfully installed!');
    console.log(`📁 Memory directory: ${memoryDir}`);
    console.log(`📁 Task directory: ${taskDir}`);
    console.log('\nThe server should now appear as connected in Claude Code.');
  } catch (error) {
    console.error('\n❌ Installation failed:', error.message);
    console.log('\nTry running this command manually:');
    console.log(cmd);
  }
}
```

## Usage After Publishing to NPM

Once published, users can install with:

```bash
# One-time installation that registers with Claude Code
npx -y like-i-said-memory-mcp-v2

# Or manually add to Claude Code
claude mcp add like-i-said-memory-mcp-v2 npx -y like-i-said-memory-mcp-v2 --mcp-server
```

## Verification

After installation, verify with:

```bash
# List all MCP servers
claude mcp list

# Get details for this server
claude mcp get like-i-said-memory-mcp-v2
```

## Customization

Users can customize the installation with environment variables:

```bash
MEMORY_DIR=/custom/path/memories TASK_DIR=/custom/path/tasks \
  npx -y like-i-said-memory-mcp-v2
```

## Troubleshooting

1. **"MCP server already exists"**: Remove it first with `claude mcp remove like-i-said-memory-mcp-v2`
2. **Permission errors**: Don't use `sudo` with npm/npx commands
3. **Server not connecting**: Restart Claude Code after installation

## Cross-Platform Paths

- **WSL**: `/mnt/c/...` or `/mnt/d/...` for Windows drives
- **Linux/macOS**: Use absolute paths like `/home/user/...` or `$HOME/...`
- **Default**: `~/.like-i-said/` directory in user's home