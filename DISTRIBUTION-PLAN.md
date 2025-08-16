# Like-I-Said MCP v2 - Distribution Strategy

## 🎯 Goal: One-Command Installation

Users should be able to install and configure the entire system with:
```bash
npx like-i-said-mcp install
```

## 📦 NPX Distribution Strategy

### Why NPX over NPM
- ✅ **No global installation** - Keeps user's system clean
- ✅ **Always latest version** - Auto-updates on each run
- ✅ **Cross-platform** - Works on Windows, Mac, Linux
- ✅ **Simple UX** - One command to rule them all

### Package Name Options
1. `like-i-said-mcp` (preferred - short and clear)
2. `@endlessblink/like-i-said-mcp` (scoped package)
3. `mcp-memory-server` (generic name)

## 🚀 Installation Flow Design

### Single Command Experience
```bash
# Install everything
npx like-i-said-mcp install

# Install for specific client
npx like-i-said-mcp install --cursor
npx like-i-said-mcp install --claude
npx like-i-said-mcp install --both

# Advanced options
npx like-i-said-mcp install --path /custom/path
npx like-i-said-mcp install --global
npx like-i-said-mcp install --with-dashboard
```

### What the Command Does
1. **Detects OS** (Windows/Mac/Linux)
2. **Checks prerequisites** (Node.js version)
3. **Creates clean installation path** (no spaces)
4. **Downloads and installs server files**
5. **Installs dependencies** (`npm install`)
6. **Tests server functionality**
7. **Configures MCP clients** (Cursor, Claude Desktop)
8. **Optionally starts dashboard** (React UI)
9. **Provides verification steps**

## 📁 Package Structure for NPM

```
like-i-said-mcp/
├── package.json           # NPM package config
├── bin/
│   └── cli.js            # Main CLI entry point
├── lib/
│   ├── installer.js      # Cross-platform installer logic
│   ├── detector.js       # OS/client detection
│   ├── config.js         # Configuration generators
│   └── validator.js      # Installation verification
├── templates/
│   ├── server.js         # MCP server template
│   ├── dashboard-server.js # API server template
│   └── configs/          # Client configurations
│       ├── cursor.json
│       ├── claude.json
│       └── vscode.json
├── assets/
│   ├── frontend/         # React dashboard files
│   └── docs/            # Installation guides
└── README.md            # npm package documentation
```

## 🔧 CLI Interface Design

### Main Commands
```bash
npx like-i-said-mcp install     # Interactive installation
npx like-i-said-mcp start       # Start MCP server
npx like-i-said-mcp dashboard   # Start web dashboard
npx like-i-said-mcp status      # Check installation status
npx like-i-said-mcp uninstall   # Remove installation
npx like-i-said-mcp update      # Update to latest version
```

### Interactive Installation
```
? Which MCP clients would you like to configure?
  ◉ Cursor IDE
  ◉ Claude Desktop
  ◯ VS Code (coming soon)

? Where should we install the server?
  ◉ Recommended: ~/mcp-servers/like-i-said
  ◯ Custom path: ________________

? Would you like to start the web dashboard?
  ◉ Yes (port 3001)
  ◯ No, just the MCP server

Installing Like-I-Said MCP v2...
✓ Checking Node.js version (18.20.8)
✓ Creating installation directory
✓ Installing server files
✓ Installing dependencies (15 packages)
✓ Testing server functionality (6 tools found)
✓ Configuring Cursor IDE
✓ Configuring Claude Desktop
✓ Starting dashboard server

🎉 Installation complete!

Next steps:
1. Restart Cursor IDE
2. Restart Claude Desktop
3. Visit http://localhost:3001 for the dashboard
4. Test with: "Use the add_memory tool to save this conversation"
```

## 🌍 Cross-Platform Compatibility

### Windows Support
- Use `cmd /c` wrapper for MCP execution
- Handle paths with backslashes
- Admin privilege detection and elevation
- PowerShell integration for advanced features

### macOS/Linux Support
- Direct Node.js execution
- Unix-style paths with forward slashes
- `chmod +x` for executable permissions
- Shell integration

### Client Configuration Paths
```javascript
const CONFIG_PATHS = {
  cursor: {
    windows: '%APPDATA%/Cursor/User/globalStorage/cursor.mcp/mcp.json',
    mac: '~/Library/Application Support/Cursor/User/globalStorage/cursor.mcp/mcp.json',
    linux: '~/.config/Cursor/User/globalStorage/cursor.mcp/mcp.json'
  },
  claude: {
    windows: '%APPDATA%/Claude/claude_desktop_config.json',
    mac: '~/Library/Application Support/Claude/claude_desktop_config.json',
    linux: '~/.config/Claude/claude_desktop_config.json'
  }
};
```

## 🚧 Implementation Phases

### Phase 1: Core NPX Package
- ✅ Create CLI entry point
- ✅ Implement cross-platform installer
- ✅ Add Cursor + Claude Desktop support
- ✅ Basic error handling and validation

### Phase 2: Enhanced Features
- 🔄 Web dashboard integration
- 🔄 Configuration management CLI
- 🔄 Update/uninstall commands
- 🔄 Better error reporting

### Phase 3: Extended Support
- ⏳ VS Code MCP support
- ⏳ Multiple MCP server management
- ⏳ Cloud sync for memories
- ⏳ Plugin system for custom tools

## 📈 Success Metrics

### User Experience Goals
- **Installation time**: < 2 minutes
- **Success rate**: > 95% on first try
- **Support requests**: < 5% of installations
- **User retention**: > 80% after first week

### Technical Requirements
- **Cross-platform**: Windows 10+, macOS 12+, Ubuntu 20+
- **Node.js**: 16+ support
- **Dependencies**: Minimal (< 20 packages)
- **Size**: Package < 5MB, installed < 50MB

## 🔒 Security Considerations

### Safe Installation
- No admin privileges required (except for system-wide installs)
- Sandboxed installation directory
- No modification of system files
- Clear permission requests

### Configuration Security
- No credential storage in configs
- Local-only by default
- Optional encryption for sensitive memories
- Clear data retention policies

## 📝 Documentation Strategy

### NPM Package README
- Quick start (30 seconds to first memory)
- Troubleshooting guide
- API reference for tools
- Contributing guidelines

### Interactive Help
```bash
npx like-i-said-mcp --help
npx like-i-said-mcp install --help
npx like-i-said-mcp troubleshoot
```

---

**Next Step**: Implement the CLI structure and cross-platform installer logic.