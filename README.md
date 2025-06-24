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

## 🚀 Easy Installation (No Technical Skills Required!)

### Prerequisites: Install Node.js (First Time Only)

**If you don't have Node.js installed**, follow these simple steps:

1. **Visit**: [nodejs.org](https://nodejs.org)
2. **Download**: The "LTS" version (recommended for most users)
3. **Install**: Run the downloaded installer with default settings
4. **Verify**: Open terminal/command prompt and type `node --version`

*Node.js is required to run the MCP server. It's like installing a program that helps your AI remember things.*

### Step 1: One-Command Installation
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install
```

**What this does automatically:**
- ✅ Downloads and sets up the memory server
- ✅ Finds your AI apps (Claude Desktop, Cursor, Windsurf) 
- ✅ Configures everything to work together
- ✅ Tests that everything is working
- ✅ Keeps your existing settings safe

**No coding knowledge required! The installer does everything for you.**

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

## 🤝 Contributing

Found a bug or want to contribute?
- **Issues**: [GitHub Issues](https://github.com/endlessblink/like-i-said-mcp-server/issues)
- **Repository**: [GitHub](https://github.com/endlessblink/like-i-said-mcp-server)

## 📜 License

MIT License - see LICENSE file for details.

---

**Made for AI enthusiasts who want their assistants to remember! 🧠✨**
