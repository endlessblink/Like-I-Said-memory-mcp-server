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

#### For Claude Desktop Users
```bash
# Same as before - creates local files
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install
```

#### For Claude Code Users

**Option 1: Quick Setup (Recommended)**
```bash
# No local files - instant setup
claude mcp add like-i-said-memory-v2 -- npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2
```

**Option 2: With Dashboard**
```bash
# Creates local files for dashboard access
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install
```

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
- Clarified differences between Claude Desktop and Claude Code

### 🔄 Migration Guide

No migration needed! Existing installations continue to work. The new system is fully backward compatible.

### 💡 Why This Matters

- **Claude Code users** can now use Like-I-Said without local file clutter
- **Dashboard users** can still get full local installation
- **One NPX package** intelligently handles all scenarios
- **Zero configuration** - it just works!

---

**Full Changelog**: [v2.8.4...v2.8.5](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/compare/v2.8.4...v2.8.5)