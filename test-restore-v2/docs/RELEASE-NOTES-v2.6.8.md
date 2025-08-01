# Like-I-Said MCP Server v2.6.8 - Dashboard Edition 🎉

## 🌟 Major Release: Modern React Dashboard

We're excited to announce the release of Like-I-Said v2.6.8, featuring a **brand new React dashboard** for managing your AI memories and tasks!

![Dashboard Preview](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/assets/placeholder/dashboard-preview.png)

## ✨ What's New

### 🎨 Modern React Dashboard
- **Beautiful UI**: Clean, modern interface built with React and Tailwind CSS
- **Real-time Updates**: WebSocket-powered live updates as memories are created
- **Dark/Light Themes**: Automatic theme switching based on your preference
- **Responsive Design**: Works seamlessly on desktop and mobile devices

### 📝 Memory Management
- **Visual Memory Cards**: See all your memories at a glance with enhanced previews
- **Advanced Search**: Powerful search with filters and logical operators
- **Bulk Operations**: Select and manage multiple memories at once
- **Memory Relationships**: Visualize connections between related memories
- **Quality Indicators**: See memory quality scores and improvement suggestions

### ✅ Task Management
- **Integrated Tasks**: Create and manage tasks with automatic memory linking
- **Status Tracking**: Track task progress (todo, in_progress, done, blocked)
- **Subtask Support**: Break down complex tasks into manageable subtasks
- **Smart Linking**: AI-powered automatic linking between tasks and relevant memories

### 🚀 Performance & Reliability
- **Robust Server Startup**: Fixed validation issues that prevented startup on some systems
- **Port Discovery**: Automatic port selection with improved error handling
- **Cross-Platform**: Tested on Windows, macOS, and Linux
- **Error Recovery**: Graceful handling of missing files and configuration

## 📦 Installation

### Installation Methods

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

### Option 3: Manual Installation
```bash
# Clone the repository
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server

# Install dependencies
npm install

# Build the dashboard
npm run build

# Configure your MCP client (see below)
```

## 🔧 Configuration

### For Claude Desktop Users
1. Run the NPX installation command (Option 1 above)
2. Restart Claude Desktop
3. The dashboard will be available automatically

### For Cursor/Windsurf/VS Code Users

#### Cursor Configuration
Add to `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "like-i-said-memory-v2": {
      "command": "node",
      "args": ["/path/to/Like-I-Said-memory-mcp-server/server-markdown.js"]
    }
  }
}
```

#### Windsurf Configuration
Add to `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcp": {
    "servers": {
      "like-i-said-memory-v2": {
        "command": "node",
        "args": ["/path/to/Like-I-Said-memory-mcp-server/server-markdown.js"]
      }
    }
  }
}
```

## 🖥️ Accessing the Dashboard

### Starting the Dashboard

#### Full Stack (Recommended)
```bash
npm run dev:full
```
This starts both the API server and the React dashboard.

#### Production Mode
```bash
npm start          # Start MCP server
npm run start:dashboard  # Start dashboard API (separate terminal)
```

### Accessing the Dashboard
1. Open your browser to `http://localhost:5173` (development) or `http://localhost:3001` (production)
2. The dashboard will automatically connect to the API server
3. Start using Claude/Cursor/Windsurf - memories will appear in real-time!

### Dashboard Features

#### Memory View
- **Search Bar**: Full-text search across all memories
- **Filters**: Filter by project, category, priority, and date
- **Bulk Actions**: Select multiple memories for batch operations
- **Quick Actions**: Edit, delete, or enhance memories with one click

#### Task Management
- **Create Tasks**: Add new tasks with descriptions and priorities
- **Link Memories**: Automatically or manually link related memories
- **Track Progress**: Update task status as you work
- **Subtasks**: Break down complex tasks

#### Settings
- **Path Configuration**: Set custom paths for memory and task storage
- **Theme Selection**: Choose between light, dark, or system themes
- **Authentication**: Optional authentication system (disabled by default)
- **Quality Standards**: Configure memory quality requirements

## 🐛 Bug Fixes

### Major Fixes
- **Server Validation**: Fixed "Server started but not responding correctly" errors
- **Port Discovery**: Fixed issues with port 0 and automatic port selection
- **Route Registration**: Added proper delays for Express route initialization
- **Static File Handling**: Fixed conflicts between API routes and static files
- **Console Errors**: Eliminated "Unexpected token '<'" errors in development

### Quality of Life
- **Better Error Messages**: More descriptive error logging
- **Graceful Degradation**: Handle missing configuration files
- **Cross-Platform Compatibility**: Fixed Windows-specific path issues

## 📊 Dashboard API Endpoints

The dashboard provides a REST API for programmatic access:

- `GET /api/memories` - List all memories
- `POST /api/memories` - Create new memory
- `GET /api/memories/:id` - Get specific memory
- `PUT /api/memories/:id` - Update memory
- `DELETE /api/memories/:id` - Delete memory
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create new task
- `GET /api/status` - Server status
- `GET /api/paths` - Get current storage paths
- `POST /api/paths` - Update storage paths

## 🔄 Migration Guide

If upgrading from v2.x.x:
1. Pull the latest changes: `git pull origin main`
2. Install new dependencies: `npm install`
3. Build the dashboard: `npm run build`
4. Start with: `npm run dev:full`

Your existing memories and tasks will be automatically available in the new dashboard!

## 🙏 Acknowledgments

Special thanks to all contributors and testers who helped identify and fix the startup issues, especially those who provided detailed error logs and testing on different platforms.

## 📝 Full Changelog

### Added
- Modern React dashboard with real-time updates
- WebSocket support for live memory updates
- Advanced search and filtering capabilities
- Task management with memory linking
- Bulk operations for memories
- Theme support (light/dark/system)
- Path configuration UI
- Memory quality indicators
- Authentication system (optional)

### Fixed
- Server startup validation issues
- Port 0 handling in robust port finder
- Static file routing conflicts
- Console errors in development mode
- Missing standards file errors
- Cross-platform compatibility issues

### Changed
- Improved error logging and debugging
- Better port discovery mechanism
- Enhanced memory format with quality metrics
- Updated documentation and examples

---

**Full Changelog**: https://github.com/endlessblink/Like-I-Said-memory-mcp-server/compare/v2.0.0...v2.6.8

**Download**: See the Assets section below for pre-built releases