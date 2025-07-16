# Like-I-Said MCP Server v2.6.8 - Dashboard Edition 🎉

## 🌟 Highlights

**This release introduces a modern React dashboard for managing your AI memories!**

- 🎨 **Beautiful Dashboard**: Modern UI with real-time updates
- 📝 **Visual Memory Management**: See and manage all memories at a glance  
- ✅ **Integrated Task System**: Create tasks with automatic memory linking
- 🚀 **Improved Reliability**: Fixed startup issues across all platforms

## 📦 Installation

### Quick Install (Recommended)
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
```

### Download Options
- 📦 **like-i-said-v2.6.8.zip** - For Windows users
- 📦 **like-i-said-v2.6.8.tar.gz** - For Mac/Linux users
- 📦 **like-i-said-v2.6.8.dxt** - For Claude Desktop users

## 🚀 Getting Started

1. **Extract the downloaded file**
2. **Install dependencies**: `npm install`
3. **Start dashboard**: `npm run dev:full`
4. **Open browser**: http://localhost:5173

See [Dashboard Installation Guide](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/blob/main/DASHBOARD-INSTALLATION-GUIDE.md) for detailed instructions.

## ✨ What's New

### Dashboard Features
- Real-time memory updates via WebSocket
- Advanced search with filters
- Bulk operations for memory management
- Dark/Light theme support
- Task management with subtasks
- Memory quality indicators
- Path configuration UI

### Bug Fixes
- Fixed "Server started but not responding correctly" errors
- Resolved port discovery issues
- Fixed static file routing conflicts
- Eliminated console errors in development
- Improved cross-platform compatibility

### Improvements
- Better error messages and debugging
- Graceful handling of missing files
- Enhanced memory format with metadata
- Comprehensive test coverage

## 📊 Dashboard Preview

![Dashboard Memory View](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/assets/placeholder/dashboard-memories.png)
![Dashboard Task View](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/assets/placeholder/dashboard-tasks.png)

## 🔧 Configuration

The dashboard works with all Claude-compatible clients:
- **Claude Desktop**: Use the .dxt installer
- **Cursor**: Configure in ~/.cursor/mcp.json
- **Windsurf**: Configure in ~/.codeium/windsurf/mcp_config.json
- **VS Code**: Follow Continue extension docs

## 📝 Documentation

- [Full Documentation](https://github.com/endlessblink/Like-I-Said-memory-mcp-server#readme)
- [Dashboard Guide](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/blob/main/DASHBOARD-INSTALLATION-GUIDE.md)
- [API Reference](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/blob/main/API.md)

## 🙏 Thanks

Special thanks to all testers who helped identify and fix platform-specific issues!

---

**Full Changelog**: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/compare/v2.0.0...v2.6.8