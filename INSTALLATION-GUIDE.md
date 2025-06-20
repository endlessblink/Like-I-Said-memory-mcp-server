# Like-I-Said MCP v2.2.4 - Installation Guide

## 🎯 What's New in v2.2.4

### ✅ Worker Thread Backup Solution
- **Fixed**: MCP "process exited" errors that broke Claude Desktop, Cursor, and Windsurf
- **Solution**: Isolated Worker Thread architecture prevents stdio interference
- **Result**: All AI clients now work perfectly with backup system

### ✅ Windows NPM Fix
- **Fixed**: "not recognized as command" error on Windows
- **Solution**: Added `cli.cmd` wrapper for Windows compatibility
- **Result**: Works on Windows, Mac, and Linux

### ✅ Security Audit Complete
- **Verified**: NO user data in NPM package or GitHub repository
- **Cleaned**: All backup files removed from git history
- **Safe**: Environment variables used for all API keys

## 🚀 Installation Methods

### Method 1: Global Install (Recommended)
```bash
# Install globally
npm install -g @endlessblink/like-i-said-v2

# Run setup (auto-detects and configures all AI clients)
like-i-said-v2 install
```

### Method 2: NPX (No Global Install)
```bash
# One-time setup
npx @endlessblink/like-i-said-v2 like-i-said-v2 install
```

### Method 3: Update Existing Installation
```bash
# Update to latest version
npm update -g @endlessblink/like-i-said-v2
```

## 🔧 What Happens During Installation

1. **Auto-Detection**: Scans for Claude Desktop, Cursor, Windsurf configs
2. **File Setup**: Copies server files to project directory
3. **MCP Configuration**: Updates client configs with server path
4. **Memory Setup**: Creates `memories/` directory for storage
5. **Backup System**: Starts Worker Thread backup monitoring
6. **Verification**: Tests server with 6 available tools

## 💻 Supported AI Clients

### ✅ Claude Desktop
- Config: `~/.config/Claude/claude_desktop_config.json`
- Auto-configured during install

### ✅ Cursor
- Config: `~/.cursor/mcp.json`
- Auto-configured during install

### ✅ Windsurf
- Config: `~/.codeium/windsurf/mcp_config.json`
- Auto-configured during install

## 📋 Available Commands

```bash
# Primary commands
like-i-said-v2 install    # Auto-setup all clients
like-i-said-v2 start      # Start server manually
like-i-said-v2 backup     # Create immediate backup
like-i-said-v2 backup status # Check backup status

# Alternative commands
like-i-said-v2 setup      # Alternative setup
like-i-said-v2 init       # Advanced configuration
```

## 🧪 Verification Steps

### 1. Check Installation
```bash
# Verify server is working
node server-markdown.js
# Should show: "Like-I-Said Memory MCP Server v2 listening on stdio"
```

### 2. Test in AI Client
After restarting your AI client, ask:
```
What MCP tools do you have available?
```

Expected response should include:
- `add_memory` - Store new memories
- `get_memory` - Retrieve specific memory
- `list_memories` - Browse all memories
- `search_memories` - Search memory content
- `delete_memory` - Remove memories
- `test_tool` - Test server connectivity

### 3. Create Test Memory
```
Please add a memory: "Test memory created on [date]"
```

## 🐛 Troubleshooting

### Windows Issues
```cmd
# If command not recognized
npx cmd /c like-i-said-v2 install

# Or use PowerShell
npx --shell-cmd powershell @endlessblink/like-i-said-v2 like-i-said-v2 install
```

### Force Latest Version
```bash
# Clear npm cache and reinstall
npm cache clean --force
npm install -g @endlessblink/like-i-said-v2@latest
```

### Debug Mode
```bash
# Run with debug output
node cli.js install --debug
```

### MCP Client Not Found
- Install Claude Desktop, Cursor, or Windsurf first
- Run installation again after client is installed
- Manually restart AI client after configuration

## 🔒 Security Notes

- All API keys stored in environment variables
- No user data included in NPM package
- Memory files stored locally only
- Backup system runs in isolated Worker Thread

## 📁 Directory Structure After Install

```
your-project/
├── server-markdown.js      # Main MCP server
├── backup-system.js        # Backup coordination
├── backup-runner.js        # Backup execution
├── backup-worker.js        # Worker Thread backup
├── package.json            # Dependencies
├── memories/               # Your memory storage
└── README.md              # Usage instructions
```

## 🎉 Success Indicators

✅ **Installation Complete** when you see:
- "✅ Server working with 6 tools"
- AI client configs updated
- `memories/` directory created
- No error messages

✅ **Client Integration Working** when:
- AI client shows MCP tools available
- You can create and retrieve memories
- Backup system runs without "process exited" errors

## 🚀 Next Steps

1. **Test the tools**: Create, search, and manage memories
2. **Backup verification**: Check backup files are created
3. **Multi-client**: Test across Claude Desktop, Cursor, Windsurf
4. **Integration**: Use memories in your AI workflows

---

**Package**: @endlessblink/like-i-said-v2@2.2.4  
**GitHub**: https://github.com/endlessblink/like-i-said-mcp-server  
**Support**: Report issues on GitHub