# Like I Said v2.3.3 - Complete Documentation

[![npm version](https://img.shields.io/npm/v/@endlessblink/like-i-said-v2.svg)](https://www.npmjs.com/package/@endlessblink/like-i-said-v2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Support](https://img.shields.io/badge/Docker-Alpine%20Ready-blue)](./DOCKER.md)

> **Persistent Memory System for AI Assistants** - Remember conversations across sessions

Complete documentation for Like I Said v2.3.3, the advanced MCP memory server that gives AI assistants persistent memory across conversations.

## 🚀 Quick Start

### Installation
```bash
# One-command installation
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 install

# Start dashboard (optional)
npm install -g @endlessblink/like-i-said-v2
like-i-said-v2 start
```

### Docker Deployment
```bash
# Docker with dashboard
docker-compose up like-i-said-dashboard

# Access at: http://localhost:3002
```

## 📚 Documentation Structure

### 📖 User Documentation
- **[Main README](../README.md)** - Project overview and quick start
- **[Setup Instructions](./SETUP-INSTRUCTIONS.md)** - Comprehensive installation guide
- **[Docker Guide](./DOCKER.md)** - Docker deployment and enterprise setup

### 🛠️ Developer Documentation  
- **[Development Guide](./DEVELOPMENT.md)** - Development setup and workflows
- **[Claude Code Guide](./CLAUDE.md)** - Claude Code specific integration and troubleshooting
- **[Project Status](./PROJECT-STATUS-AND-ROADMAP.md)** - Current status and roadmap

### 🚀 Production Documentation
- **[Production README](./PRODUCTION-README.md)** - Production deployment guide
- **[Deployment Checklist](./PRODUCTION-DEPLOYMENT-CHECKLIST.md)** - Pre-deployment checklist
- **[NPM Management](./NPM-MANAGEMENT-GUIDE.md)** - Package management guide

### 🌐 Multilingual Documentation
- **[Hebrew (עברית)](./rtl/README-HE.md)** - Complete RTL Hebrew documentation
- **[Docker Hebrew](./rtl/DOCKER-HE.md)** - Docker guide in Hebrew
- **[Setup Hebrew](./rtl/SETUP-HE.md)** - Installation guide in Hebrew

### 📰 Marketing & Launch
- **[Hebrew Launch Post](./HEBREW_LAUNCH_POST.md)** - Hebrew marketing content for v2.3.3

### 🔧 Reference Documentation
- **[Docker Testing Notes](./DOCKER-TESTING-MEMORY.md)** - Docker testing session documentation
- **[Commands Reference](./DROPOFF-COMMANDS.md)** - Common commands and utilities
- **[Session Handoff](./DROPOFF-PROMPT-NEW-CONVERSATION.md)** - Context preservation template

## ✨ Key Features

### 🧠 Memory System
- **6 MCP Tools** - Complete memory management suite
- **Persistent Storage** - Markdown files with enhanced metadata
- **Project Organization** - Group memories by project context
- **Advanced Search** - Full-text search with filters and tags

### 📊 Modern Dashboard
- **React Interface** - Modern web dashboard with real-time updates
- **Memory Cards** - Card-based layout with metadata display
- **Relationship Graph** - Interactive visualization of memory connections
- **Analytics** - Usage statistics and insights

### 🐳 Docker Support
- **Alpine Linux** - Optimized for lightweight containers
- **React Force Graph** - Full canvas rendering support in Docker
- **Enterprise Ready** - Production deployment patterns
- **Multi-environment** - Development, team, and enterprise setups

### 🌍 Cross-Platform
- **AI Clients** - Claude Desktop, Cursor, Windsurf, Claude Code
- **Operating Systems** - Windows, macOS, Linux (including WSL)
- **Deployment** - Local, Docker, Kubernetes, cloud platforms

## 🎯 Supported AI Clients

| Client | Status | Configuration |
|--------|--------|---------------|
| **Claude Desktop** | ✅ Full Support | Auto-configured |
| **Cursor** | ✅ Full Support | Auto-configured |
| **Windsurf** | ✅ Full Support | Auto-configured |
| **Claude Code** | ✅ Full Support | Manual setup required |
| **Continue** | ✅ Full Support | Manual setup required |
| **Zed Editor** | ✅ Full Support | Manual setup required |

## 🛠️ MCP Tools Available

After installation, AI assistants get these tools:

1. **`add_memory`** - Store information with categories, tags, projects
2. **`get_memory`** - Retrieve specific memory by ID
3. **`list_memories`** - Show memories with metadata and filtering
4. **`delete_memory`** - Remove specific memory
5. **`search_memories`** - Full-text search with project filtering
6. **`test_tool`** - Verify MCP connection and functionality

## 📋 Usage Examples

### Basic Memory Operations
```
Store a preference:
> "Remember that I prefer TypeScript over JavaScript for new projects"

Recall information:
> "What did I tell you about my TypeScript preference?"

Project context:
> "Store that this React app uses Tailwind CSS and shadcn/ui components"

Search memories:
> "Find all memories about React projects"
```

### Advanced Features
```
Category organization:
> "Add this to my work memories: The API endpoint is https://api.example.com"

Project-specific storage:
> "For the e-commerce project, remember we're using Stripe for payments"

Complex search:
> "Show me all code-related memories from the last month"
```

## 🔧 Installation Paths

### Standard Installation
```bash
# Global NPM installation
npm install -g @endlessblink/like-i-said-v2

# Run installer
like-i-said-v2 install

# Start dashboard
like-i-said-v2 start
```

### Development Installation
```bash
# Clone repository
git clone https://github.com/endlessblink/Like-I-Said-Memory-V2
cd Like-I-Said-Memory-V2

# Install dependencies
npm install

# Run development servers
npm run dev:full
```

### Docker Installation
```bash
# Simple deployment
docker run -p 3002:3001 -v ./memories:/app/memories like-i-said:latest

# Production deployment
docker-compose up like-i-said-dashboard
```

## 🆘 Troubleshooting

### Common Issues

**Tools don't appear in AI client:**
- Fully restart your AI client (close completely and reopen)
- Wait 2-5 minutes for MCP server detection
- Check configuration files are correctly updated

**Windows-specific issues:**
- Always use full npx command format
- Use Command Prompt instead of PowerShell if issues occur
- Ensure proper path escaping in configuration files

**Docker issues:**
- Verify volume mounting: `-v ./memories:/app/memories`
- Check port conflicts (3001, 3002)
- Ensure proper file permissions

### Configuration Locations

**Claude Desktop:**
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Cursor:**
- Windows: `%USERPROFILE%\.cursor\mcp.json`
- macOS/Linux: `~/.cursor/mcp.json`

**Windsurf:**
- Windows: `%USERPROFILE%\.codeium\windsurf\mcp_config.json`
- macOS/Linux: `~/.codeium/windsurf/mcp_config.json`

## 🚀 What's New in v2.3.3

### Docker Revolution
- ✅ **Alpine Linux Support** - Full canvas rendering in containers
- ✅ **React Force Graph** - Interactive relationship visualization
- ✅ **Optimized Build** - Separated graph libraries (200KB chunk)
- ✅ **Enterprise Ready** - Production deployment patterns

### Enhanced Memory System  
- ✅ **Enhanced Metadata** - Categories, projects, complexity levels
- ✅ **Relationship Mapping** - 3,230+ connections between memories
- ✅ **Advanced Search** - Full-text search with filters
- ✅ **Real-time Updates** - WebSocket connections for live data

### Modern Dashboard
- ✅ **Card-based Layout** - Modern memory card interface
- ✅ **Advanced Analytics** - Usage statistics and insights
- ✅ **Dark Theme** - Professional appearance
- ✅ **Responsive Design** - Works on all screen sizes

## 📊 Technical Specifications

### System Requirements
- **Node.js**: 18+ (recommended 20+)
- **Memory**: 2GB RAM minimum, 4GB recommended
- **Storage**: 1GB for basic use, 10GB+ for large memory collections
- **Network**: Ports 3001 (dashboard), 3000 (MCP server)

### Docker Requirements
- **Docker**: 20.10+
- **Docker Compose**: 1.29+
- **Memory**: 4GB RAM for containers
- **Storage**: 5GB additional for Docker images

### Browser Support
- **Chrome/Chromium**: 88+
- **Firefox**: 78+
- **Safari**: 14+
- **Edge**: 88+

## 🔗 Links & Resources

### Package Information
- **NPM**: [@endlessblink/like-i-said-v2](https://www.npmjs.com/package/@endlessblink/like-i-said-v2)
- **GitHub**: [Like-I-Said-Memory-V2](https://github.com/endlessblink/Like-I-Said-Memory-V2)
- **Issues**: [GitHub Issues](https://github.com/endlessblink/Like-I-Said-Memory-V2/issues)

### Community
- **Discussions**: [GitHub Discussions](https://github.com/endlessblink/Like-I-Said-Memory-V2/discussions)
- **Updates**: Follow NPM for new releases
- **Support**: Create issues for bugs and feature requests

## 📜 License

MIT License - see [LICENSE](../LICENSE) file for details.

---

**Like I Said v2.3.3** - Give your AI assistants the memory they deserve! 🧠✨

*The smart assistant that remembers everything, so you can focus on creating* 🚀