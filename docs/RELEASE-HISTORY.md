# Like-I-Said MCP Server - Release History

This document contains the complete release history for Like-I-Said MCP Server v2.

## Version 2.8.10 - Complete Path Validation Fix (Latest)

### 🎉 Major Fix: Path Validation Issues Resolved

This release fixes the critical path validation issues that prevented memory and task creation in NPX installations.

### 🐛 Bug Fixes
- **Removed ALL restrictive path validation** that was breaking NPX installations
- Fixed issue where validation expected memory paths to start with Claude's working directory
- Now properly supports custom memory/task directories configured during installation
- Works correctly with NPX mode where working directory differs from storage directories

### 📦 Installation
```bash
# NPX Installation (Recommended)
npx -p @endlessblink/like-i-said-v2@2.8.10 like-i-said-v2 install
```

### ✅ Verified Working
- NPX installations with custom directories
- Local installations  
- Default Claude Desktop directories
- All memory and task operations

---

## Version 2.8.5 - Enhanced Memory Display

### ✨ New Features
- **Enhanced Memory Display**: Improved title extraction with multiple fallback strategies
- **ASCII Art Support**: Special handling for ASCII diagrams in memory display
- **Project Deduplication**: Zero-downtime project consolidation

### 🐛 Bug Fixes
- Fixed memory card title extraction for various content formats
- Improved handling of code blocks and technical content
- Better support for memories without explicit titles

### 🎯 Dashboard Improvements
- More intelligent title extraction from memory content
- Fallback to first line, first sentence, or content preview
- ASCII art preservation in memory cards

---

## Version 2.6.8 - Dashboard Edition 🎉

### 🌟 Major Release: Modern React Dashboard

We're excited to announce the release of Like-I-Said v2.6.8, featuring a **brand new React dashboard** for managing your AI memories and tasks!

### ✨ What's New

#### 🎨 Modern React Dashboard
- **Beautiful UI**: Clean, modern interface built with React and Tailwind CSS
- **Real-time Updates**: WebSocket-powered live updates as memories are created
- **Dark/Light Themes**: Automatic theme switching based on your preference
- **Responsive Design**: Works seamlessly on desktop and mobile devices

#### 📝 Memory Management
- **Visual Memory Cards**: See all your memories at a glance with enhanced previews
- **Advanced Search**: Powerful search with filters and logical operators
- **Bulk Operations**: Select and manage multiple memories at once
- **Memory Relationships**: Visualize connections between related memories
- **Quality Indicators**: See memory quality scores and improvement suggestions

#### ✅ Task Management
- **Integrated Tasks**: Create and manage tasks with automatic memory linking
- **Status Tracking**: Track task progress (todo, in_progress, done, blocked)
- **Subtask Support**: Break down complex tasks into manageable subtasks
- **Smart Linking**: AI-powered automatic linking between tasks and relevant memories

#### 🚀 Performance & Reliability
- **Optimized Storage**: Improved file-based storage with better indexing
- **Error Recovery**: Graceful handling of corrupted or missing files
- **Backup System**: Automatic backups with easy restoration
- **WebSocket Reconnection**: Automatic reconnection for real-time updates

### 📦 Installation & Setup

#### Quick Install (NPX)
```bash
npx -p @endlessblink/like-i-said-v2@latest like-i-said-v2 install
```

#### Manual Installation
```bash
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server
npm install
npm run dev:full  # Starts both API server and dashboard
```

### 🔧 Dashboard Access
- **Local URL**: http://localhost:5173 (development)
- **API Server**: http://localhost:3001 (backend)
- **Default Ports**: Can be customized via environment variables

### 🎯 Key Features in Detail

#### Memory Organization
- **Project-based Storage**: Organize memories by project context
- **Complexity Levels**: 4-level complexity detection (L1-L4)
- **Content Types**: Automatic detection (text, code, structured)
- **Categories**: 6 categories (personal, work, code, research, conversations, preferences)

#### Task Features
- **Task Hierarchy**: Support for tasks, subtasks, and parent relationships
- **Auto-linking**: Intelligent connection to relevant memories
- **Status Management**: Track progress with 4 status states
- **Priority Levels**: low, medium, high, urgent

#### Dashboard Capabilities
- **Filter & Sort**: Multiple filter options with preset support
- **Export/Import**: Backup and restore your data easily
- **Statistics**: Visual analytics and usage metrics
- **Keyboard Shortcuts**: Efficient navigation with hotkeys

### 🛠️ Technical Improvements
- **MCP Protocol**: Full compliance with Model Context Protocol
- **12 MCP Tools**: Comprehensive toolset for memory and task operations
- **REST API**: Complete API for dashboard integration
- **WebSocket**: Real-time updates and synchronization
- **TypeScript**: Frontend built with TypeScript for reliability

### 🐛 Bug Fixes
- Fixed memory duplication issues
- Resolved path validation problems in custom installations
- Improved error handling in MCP server
- Fixed WebSocket reconnection issues
- Resolved dashboard loading problems in production

### 📚 Documentation
- Comprehensive API documentation
- Dashboard user guide
- Developer documentation for contributors
- Installation troubleshooting guide

### 🔄 Breaking Changes
- Dashboard now requires Node.js 16+ (previously 14+)
- API endpoints have been restructured (see API-REFERENCE.md)
- Memory format includes new metadata fields

### 🙏 Acknowledgments
Special thanks to all contributors and testers who helped make this release possible!

---

## Version History Summary

| Version | Release Date | Type | Key Changes |
|---------|-------------|------|-------------|
| 2.8.10 | August 2025 | Patch | Critical path validation fix for NPX |
| 2.8.5 | August 2025 | Minor | Enhanced memory display, ASCII support |
| 2.6.8 | July 2025 | Major | React Dashboard, Task Management |
| 2.6.0 | July 2025 | Minor | MCP protocol improvements |
| 2.5.0 | June 2025 | Minor | Memory categorization |
| 2.0.0 | May 2025 | Major | Complete rewrite with MCP |

For detailed upgrade instructions, see [UPDATE-INSTRUCTIONS.md](./UPDATE-INSTRUCTIONS.md).
For the complete changelog, see [CHANGELOG.md](./CHANGELOG.md).