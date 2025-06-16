# Like-I-Said MCP v2

> **MCP memory server for AI assistants** - Remember conversations across sessions

Give your AI assistants persistent memory! Store information, preferences, and context that survives conversation restarts.

## ✨ Features

- 🧠 **Persistent Memory** - AI remembers across conversations
- 🚀 **One-Command Install** - Auto-configures all AI clients
- 🌍 **Cross-Platform** - Windows, macOS, Linux
- 📊 **Web Dashboard** - Visual memory management
- 🔧 **6 Memory Tools** - Complete memory management suite

## 🚀 Quick Install

```bash
npx @endlessblink/like-i-said-v2 install
```

That's it! The installer will:
- ✅ Auto-detect your AI clients (Claude Desktop, Cursor, Windsurf)
- ✅ Configure MCP settings automatically  
- ✅ Test server functionality
- ✅ Preserve existing MCP servers

## 🎯 Supported AI Clients

| Client | Status | Platform |
|--------|--------|----------|
| **Claude Desktop** | ✅ Full Support | Windows, macOS, Linux |
| **Cursor** | ✅ Full Support | Windows, macOS, Linux |  
| **Windsurf** | ✅ Full Support | Windows, macOS, Linux |
| **Claude Code (VS Code)** | ✅ Full Support | Windows, macOS, Linux |
| **Continue** | ✅ Full Support | Windows, macOS, Linux |
| **Zed Editor** | ✅ Full Support | Windows, macOS, Linux |

## 🛠️ Available Tools

After installation, your AI assistant will have these tools:

- **`add_memory`** - Store information with optional tags
- **`get_memory`** - Retrieve specific memory by ID
- **`list_memories`** - Show all stored memories
- **`delete_memory`** - Remove specific memory
- **`search_memories`** - Search through memories by content
- **`test_tool`** - Verify MCP connection

## 📋 Usage Examples

**Store a preference:**
> "Remember that I prefer TypeScript over JavaScript for new projects"

**Recall information:**  
> "What did I tell you about my TypeScript preference?"

**Project context:**
> "Store that this React app uses Tailwind CSS and shadcn/ui components"

**Search memories:**
> "Find all memories about React projects"

## 🔧 Advanced Setup

### Custom Installation
```bash
npx @endlessblink/like-i-said-v2 init
```

### Web Dashboard
```bash
npm install @endlessblink/like-i-said-v2
cd node_modules/@endlessblink/like-i-said-v2  
npm run dev:full
```
Visit `http://localhost:3001` for visual memory management.

### Manual Server Start
```bash
npx @endlessblink/like-i-said-v2 start
```

## 🔄 After Installation

1. **Restart your AI client:**
   - **Claude Desktop**: Close completely and restart
   - **Cursor**: Press `Ctrl+Shift+P` → "Reload Window"
   - **Windsurf**: Auto-detects changes

2. **Test the installation:**
   > "What MCP tools do you have available?"

3. **Start using memory:**
   > "Remember that I'm working on a Next.js project called MyApp"

## 🆘 Troubleshooting

### Tools don't appear?
- Ensure you fully restarted your AI client
- Wait 2-3 minutes for detection
- Check client-specific logs

### Config locations:
- **Claude Desktop**: `%APPDATA%\Claude\claude_desktop_config.json` (Windows)
- **Cursor**: `%USERPROFILE%\.cursor\mcp.json` (Windows)  
- **Windsurf**: `%USERPROFILE%\.codeium\windsurf\mcp_config.json` (Windows)

### Reset installation:
```bash
npx @endlessblink/like-i-said-v2 install
```

## 📊 Memory Storage

- **Format**: JSON-based persistent storage
- **Location**: `memories.json` in package directory
- **Backup**: Automatic backup creation
- **Migration**: Preserves existing memories

## 🤝 Contributing

Found a bug or want to contribute?
- **Issues**: [GitHub Issues](https://github.com/endlessblink/like-i-said-mcp-server/issues)
- **Repository**: [GitHub](https://github.com/endlessblink/like-i-said-mcp-server)

## 📜 License

MIT License - see LICENSE file for details.

---

**Made for AI enthusiasts who want their assistants to remember! 🧠✨**
