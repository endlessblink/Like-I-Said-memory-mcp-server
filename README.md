![Like-I-Said MCP v2](assets/images/cover.png)

# Like-I-Said MCP v2

[![npm version](https://img.shields.io/npm/v/@endlessblink/like-i-said-v2.svg)](https://www.npmjs.com/package/@endlessblink/like-i-said-v2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **MCP memory server for AI assistants** - Remember conversations across sessions

Give your AI assistants persistent memory! Store information, preferences, and context that survives conversation restarts.

## ✨ Features

- 🧠 **Persistent Memory** - AI remembers across conversations
- 🚀 **One-Command Install** - Auto-configures all AI clients
- 🌍 **Cross-Platform** - Windows, macOS, Linux (including WSL)
- 📊 **React Dashboard** - Modern web interface with real-time updates
- 🔧 **6 Memory Tools** - Complete memory management suite
- 📝 **Markdown Storage** - Enhanced frontmatter with categories and relationships
- 🔍 **Advanced Search** - Full-text search with filters and tags
- 📈 **Analytics** - Memory usage statistics and insights
- 🎨 **Modern UI** - Card-based layout with dark theme

## 🚀 Quick Install

### Prerequisites: Install Node.js (First Time Only)

If you don't have Node.js installed, download and install it first:

1. **Visit**: [nodejs.org](https://nodejs.org)
2. **Download**: The "LTS" version (recommended for most users)
3. **Install**: Run the downloaded installer with default settings
4. **Verify**: Open terminal/command prompt and type `node --version`

> **What is Node.js?** A JavaScript runtime that allows this memory server to run on your computer. It's free, safe, and used by millions of developers worldwide.

### Step 1: Install MCP Server
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
```

The installer will:
- ✅ Auto-detect your AI clients (Claude Desktop, Cursor, Windsurf)
- ✅ Configure MCP settings automatically  
- ✅ Test server functionality
- ✅ Preserve existing MCP servers

### Step 2: Start the Web Dashboard (Optional)
```bash
# Global installation (recommended)
npm install -g @endlessblink/like-i-said-v2
like-i-said-v2 start

# Or run directly from npx
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 start
```
Visit `http://localhost:3001` for visual memory management with AI insights, statistics, and relationship mapping.

## 📸 Dashboard Screenshots

### Memory Management
![Memory Cards View](assets/images/dashboard_1.png)
*Modern card-based memory interface with search, filtering, and project organization*

### Relationship Visualization
![Memory Relationships](assets/images/dashboard_2.png)
*Interactive graph visualization showing connections between memories*

### Analytics Dashboard
![Analytics Dashboard](assets/images/dashboard_3.png)
*Comprehensive statistics and insights about your memory usage*

### Enhanced Features
![Advanced Features](assets/images/dashboard_4.png)
*AI-powered memory enhancement, clustering, and advanced organization*

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

- **`add_memory`** - Store information with tags, categories, and project context
- **`get_memory`** - Retrieve specific memory by ID
- **`list_memories`** - Show memories with complexity levels and metadata
- **`delete_memory`** - Remove specific memory
- **`search_memories`** - Full-text search with project filtering
- **`test_tool`** - Verify MCP connection

### Enhanced Memory Features:
- **Categories**: personal, work, code, research, conversations, preferences
- **Complexity Levels**: L1 (Simple) → L4 (Advanced)
- **Projects**: Organize memories by project context
- **Relationships**: Link related memories together

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
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 init
```



### Manual Server Start
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 start
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
- Wait 2-3 minutes for detection (Claude Desktop may take up to 5 minutes)
- Check client-specific logs

### Don't have Node.js installed?
- **Install Node.js first**: Download from [nodejs.org](https://nodejs.org) (choose LTS version)
- **Then run the command above**
- **Need help?** See our [Node.js Installation Guide](#prerequisites-install-nodejs-first-time-only)

### Windows-specific notes:
- ⚠️ **Always use the full npx command format**: `npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install`
- The simplified `npx @endlessblink/like-i-said-v2 install` will NOT work on Windows
- For PowerShell issues, try: `cmd /c "npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install"`

### Config locations:
- **Claude Desktop**: 
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
  - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Linux: `~/.config/Claude/claude_desktop_config.json`
- **Cursor**: 
  - Windows: `%USERPROFILE%\.cursor\mcp.json`
  - macOS/Linux: `~/.cursor/mcp.json`
- **Windsurf**: 
  - Windows: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`
  - macOS/Linux: `~/.codeium/windsurf/mcp_config.json`

### Reset installation:
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
```

## 🔄 Updating Like-I-Said

### For npm users:
```bash
# Check current version
npm list -g @endlessblink/like-i-said-v2

# Update to latest version
npm update -g @endlessblink/like-i-said-v2

# Or force reinstall
npm install -g @endlessblink/like-i-said-v2@latest
```

### For local development:
```bash
# Pull latest changes
git pull origin main

# Reinstall dependencies if needed
npm install
```

### After updating:
1. **Restart your MCP client** (Claude Desktop, Cursor, Windsurf)
2. **No configuration changes needed** - The server uses relative paths automatically
3. **Your memories are preserved** - They remain in your memories folder

### Version Check:
You can verify you have the latest version by checking:
- npm package version: `npm list -g @endlessblink/like-i-said-v2`
- Memory path fix: Look for `fileURLToPath` in your `server-markdown.js`

## 🛡️ Safe Update Guide: MCP Memory & Dashboard

To update the Like-I-Said-Memory MCP and dashboard **without breaking anything**, follow these best practices:

1. **Backup Your Memories**
   - Before any update, back up your `memories/` directory and any custom configuration files.
   - Use the built-in backup tool or manually copy the `memories/` folder to a safe location.

2. **Update the MCP Server & Dashboard**
   - For npm users:
     ```bash
     npm update -g @endlessblink/like-i-said-v2
     # or
     npm install -g @endlessblink/like-i-said-v2@latest
     ```
   - For source users:
     ```bash
     git pull origin main  # or your active branch
     npm install
     ```

3. **Restart All Clients**
   - Fully close and restart Claude Desktop, Cursor, Windsurf, or any other connected AI client.
   - For VS Code/Cursor: Use `Ctrl+Shift+P` → "Reload Window".

4. **Verify Memory Path**
   - Ensure your `memories/` directory is still present and accessible.
   - Check that your configuration files (see above) still point to the correct memory path.

5. **Test the Dashboard**
   - Open the dashboard at `http://localhost:3001` and verify your memories and projects are visible.
   - Use the search and analytics features to confirm data integrity.

6. **Restore from Backup if Needed**
   - If anything is missing or broken, restore your `memories/` directory from your backup.
   - Restart the server and clients again.

7. **Never Delete or Overwrite the `memories/` Folder**
   - Updates should never remove or overwrite your `memories/` directory. If prompted, always choose to preserve existing data.

8. **Check for Breaking Changes**
   - Review the release notes (GitHub/NPM) for any breaking changes or migration steps.

**Following these steps ensures your memories and dashboard remain safe and fully functional during updates.**

## 🔨 Development Setup

If you want to run from source:

```bash
# Clone the repository
git clone https://github.com/endlessblink/like-i-said-mcp-server.git
cd like-i-said-mcp-server

# Install dependencies
npm install

# Run development servers
npm run dev:full    # Start both API and React dashboard
npm run dev         # React dashboard only
npm run dashboard   # API server only

# Build for production
npm run build
```

## 📊 Memory Storage

- **Format**: Markdown files with enhanced frontmatter
- **Location**: `memories/` directory organized by project
- **Structure**: 145+ memories with complexity levels, categories, and relationships
- **Features**: Real-time file watching, automatic indexing
- **API**: RESTful API on port 3001 for dashboard integration

## 📚 Documentation

For comprehensive documentation, visit the [`documentation/`](./documentation/) folder:

- **[Setup Instructions](./documentation/SETUP-INSTRUCTIONS.md)** - Detailed installation guide
- **[Docker Guide](./documentation/DOCKER.md)** - Docker deployment and enterprise setup
- **[Development Guide](./documentation/DEVELOPMENT.md)** - Development setup and guidelines
- **[Hebrew Documentation](./documentation/rtl/)** - Complete RTL documentation in Hebrew
- **[Full Documentation Index](./documentation/INDEX.md)** - Complete documentation overview

## 🤝 Contributing

Found a bug or want to contribute?
- **Issues**: [GitHub Issues](https://github.com/endlessblink/like-i-said-mcp-server/issues)
- **Repository**: [GitHub](https://github.com/endlessblink/like-i-said-mcp-server)

## 📜 License

MIT License - see LICENSE file for details.

---

**Made for AI enthusiasts who want their assistants to remember! 🧠✨**
