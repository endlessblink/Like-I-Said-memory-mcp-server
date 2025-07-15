# Like-I-Said v2 - AI Memory System

> 🧠 Give your AI assistants persistent memory across sessions

## 📑 Quick Navigation

- [🚀 Quick Start](#-quick-start)
- [📦 Installation Guides](#-installation-guides)
  - [Claude Desktop](#claude-desktop-1-minute)
  - [Claude Code (WSL)](#claude-code-wsl-5-minutes)
  - [Cursor IDE](#cursor-ide-3-minutes)
  - [Windsurf IDE](#windsurf-ide-3-minutes)
- [💻 Dashboard](#-dashboard)
- [🔧 Features](#-features)
- [❓ FAQ](#-faq)

---

## 🚀 Quick Start

Choose your platform:

| Platform | Installation Time | Method |
|----------|------------------|--------|
| **Claude Desktop** | 1 minute | Download `.dxt` file |
| **Claude Code (WSL)** | 5 minutes | Clone & configure |
| **Cursor/Windsurf** | 3 minutes | Add JSON config |

---

## 📦 Installation Guides

### Claude Desktop (1 minute)

1. Download [`like-i-said-memory-v2.dxt`](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/releases)
2. Double-click the `.dxt` file
3. ✅ Done! Memory tools now available in Claude Desktop

---

### Claude Code (WSL) (5 minutes)

1. **Clone the repository in WSL:**
```bash
cd ~
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server
npm install
```

2. **Create the configuration file:**
```bash
# Create config directory if it doesn't exist
mkdir -p ~/.claude

# Create the config file with nano (or your preferred editor)
nano ~/.claude/claude_desktop_config.json
```

3. **Add this configuration** (replace `YOUR_USERNAME` with your actual username):
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["/home/YOUR_USERNAME/Like-I-Said-memory-mcp-server/server-markdown.js"]
    }
  }
}
```

4. **Save and exit:**
   - Press `Ctrl+X`, then `Y`, then `Enter`

5. **Restart Claude Code:**
   - Refresh your browser tab
   - ✅ Memory tools should now appear!

---

### Cursor IDE (3 minutes)

1. **Install the server:**
```bash
npm install -g @endlessblink/like-i-said-v2
```

2. **Edit Cursor config:**
   - Windows: `%APPDATA%\Cursor\User\globalStorage\cursor-ai\mcp.json`
   - Mac/Linux: `~/.cursor/mcp.json`

3. **Add this configuration:**
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["~/.npm-global/lib/node_modules/@endlessblink/like-i-said-v2/server-markdown.js"]
    }
  }
}
```

4. **Restart Cursor**
   - ✅ Memory tools available!

---

### Windsurf IDE (3 minutes)

1. **Install the server:**
```bash
npm install -g @endlessblink/like-i-said-v2
```

2. **Edit Windsurf config:**
   - Windows: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`
   - Mac/Linux: `~/.codeium/windsurf/mcp_config.json`

3. **Add this configuration:**
```json
{
  "mcp": {
    "servers": {
      "like-i-said-memory-v2": {
        "command": "node",
        "args": ["~/.npm-global/lib/node_modules/@endlessblink/like-i-said-v2/server-markdown.js"]
      }
    }
  }
}
```

4. **Restart Windsurf**
   - ✅ Memory tools available!

---

## 💻 Dashboard

View and manage your memories with the web dashboard:

### Option A: Run from Source
```bash
cd Like-I-Said-memory-mcp-server
npm run dev:full
```
Opens at: http://localhost:3001

### Option B: Windows Executable
1. Download [`like-i-said-dashboard-v2.4.8-windows.zip`](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/releases)
2. Extract all files
3. Run `QUICK-START.bat`
4. Dashboard opens automatically

---

## 🔧 Features

### Memory Tools (in your AI)
- `add_memory` - Store important information
- `search_memories` - Find past conversations
- `list_memories` - Browse all memories
- `get_memory` - Retrieve specific memory
- `delete_memory` - Remove memories

### Dashboard Features
- 📊 Visual memory management
- 🔍 Advanced search
- 📈 Analytics
- 🏷️ Tagging system
- 📁 Project organization

---

## ❓ FAQ

**Q: Where are memories stored?**
- Default: `memories/` folder in your installation directory
- Configurable in dashboard settings

**Q: Do I need the dashboard?**
- No, memory tools work without it
- Dashboard is optional for viewing/managing memories

**Q: Can I use this with multiple AI platforms?**
- Yes! Install once, use everywhere

**Q: Is my data private?**
- 100% local storage
- No cloud, no external servers
- You own your data

---

## 🆘 Need Help?

- 📖 [Full Documentation](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/wiki)
- 🐛 [Report Issues](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues)
- 💬 [Discussions](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/discussions)

---

Made with ❤️ for the AI community