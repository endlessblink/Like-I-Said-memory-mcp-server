# Release Notes v2.8.5

## 🎉 Major Enhancement: Universal NPX Installation

This release introduces a revolutionary dual-mode installation system that works seamlessly for both Claude Desktop and Claude Code users.

### 🚀 New Features

#### 1. **Dual-Mode NPX Installation**
- **Quick Setup Mode**: Run directly from NPX without creating local files
- **Full Installation Mode**: Create local files for dashboard access and customization
- Intelligent context detection automatically chooses the right mode

#### 2. **Claude Code Native Support**
```bash
# No local files needed - runs from NPX cache
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
```

#### 3. **Smart Context Detection**
- Automatically detects if running from NPX or local installation
- Detects interactive vs non-interactive execution
- Configures appropriately for each scenario

### 📦 Installation Methods

#### Option 1: Automatic Installation (Recommended)
Works for both Claude Desktop and Claude Code:
```bash
npx @endlessblink/like-i-said-v2@latest like-i-said-v2 install

# Or install to a specific directory:
npx @endlessblink/like-i-said-v2@latest like-i-said-v2 install --path /custom/path
```

This command automatically:
- Installs the MCP server
- Configures your Claude client (Desktop or Code)
- Sets up necessary directories
- No manual configuration needed

#### Option 2: Claude Code Direct Registration
If you're using Claude Code and Option 1 didn't work:
```bash
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
```

This registers the MCP server directly with Claude Code's configuration system.

### 🔧 Technical Improvements

1. **Enhanced CLI (`cli.js`)**
   - Context-aware execution mode detection
   - Intelligent configuration generation
   - Dual-mode operation support

2. **New MCP Wrapper**
   - `scripts/mcp-wrappers/mcp-quiet-wrapper.js` for proper server startup
   - Handles both NPX and local execution paths

3. **Automatic IDE Configuration**
   - Detects and configures Cursor, Windsurf automatically
   - Generates appropriate config based on installation type

### 🐛 Bug Fixes

- Fixed NPX execution path detection
- Resolved non-TTY mode server startup issues
- Improved error handling for missing server files

### 📚 Documentation Updates

- Updated README with clear installation options
- Added detailed guides for each installation method
- Fixed Claude Code description (it's a terminal CLI, not a web interface)
- Clarified dashboard runs on port 3001 by default

### 🔄 Migration Guide

No migration needed! Existing installations continue to work. The new system is fully backward compatible.

### 💡 Why This Matters

- **Claude Code users** can now use Like-I-Said without local file clutter
- **Dashboard users** can still get full local installation
- **One NPX package** intelligently handles all scenarios
- **Zero configuration** - it just works!

---

**Full Changelog**: [v2.8.4...v2.8.5](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/compare/v2.8.4...v2.8.5)