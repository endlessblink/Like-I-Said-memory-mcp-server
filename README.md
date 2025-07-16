![Like-I-Said MCP v2](assets/images/cover.png)

# Like-I-Said v2: Task Management & Memory for Claude Desktop

[![npm version](https://img.shields.io/npm/v/@endlessblink/like-i-said-v2.svg)](https://www.npmjs.com/package/@endlessblink/like-i-said-v2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Turn Claude Desktop into your intelligent project manager. Track tasks, remember context, and maintain continuity across sessions.

## 📚 Table of Contents

- [What Makes This Different](#-what-makes-this-different)
- [Quick Start](#-quick-start-30-seconds)
- [Installation for Other MCP Clients](#️-installation-for-other-mcp-clients)
  - [Cursor IDE](#for-cursor)
  - [Windsurf Editor](#for-windsurf)
  - [VS Code with Continue](#for-vs-code-with-continue)
- [Running the Dashboard](#-running-the-dashboard)
  - [Starting the Dashboard](#starting-the-dashboard)
  - [Accessing the Dashboard](#accessing-the-dashboard)
- [Key Features](#-key-features)
- [Available Tools](#️-available-tools-23-total)
- [How It Works](#-how-it-works)
- [Advanced Usage](#-advanced-usage)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 What Makes This Different

Unlike simple memory tools, Like-I-Said v2 provides **intelligent task management** that understands your workflow:

- **Smart Task Tracking** - Say "I finished the auth system" and Claude updates your tasks
- **Automatic Memory-Task Linking** - Every decision, code snippet, and conversation links to relevant tasks
- **Natural Language Updates** - No commands needed, just talk naturally about your progress
- **Cross-Session Continuity** - Pick up exactly where you left off, even days later
- **Project-Based Organization** - Keep multiple projects separate and organized

## 🚀 Quick Start (30 seconds)

### For Claude Desktop Users

```bash
npx @endlessblink/like-i-said-v2@2.6.3 like-i-said-v2 install
```

That's it! Restart Claude Desktop and start using it.

### Test It's Working

In Claude Desktop:
```
"Create a task: Build authentication system"
"I'm starting work on the auth system now"
"Remember: We're using JWT tokens with refresh rotation"
```

Close Claude completely, then reopen:
```
"What am I currently working on?"
"Show me everything related to authentication"
```

## 🖥️ Installation for Other MCP Clients

### Prerequisites
- Node.js 18+ installed on your system
- Claude Code access (claude.ai/code)

### For Cursor

1. Create or edit `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "like-i-said-v2": {
      "command": "npx",
      "args": ["-p", "@endlessblink/like-i-said-v2", "like-i-said-v2", "start"]
    }
  }
}
```

2. Restart Cursor and verify in Claude Code

### For Windsurf

1. Create or edit `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcp": {
    "servers": {
      "like-i-said-v2": {
        "command": "npx",
        "args": ["-p", "@endlessblink/like-i-said-v2", "like-i-said-v2", "start"]
      }
    }
  }
}
```

2. Restart Windsurf and verify in Claude Code

### For VS Code with Continue

Follow the Continue extension's MCP configuration guide to add the server.

## 📊 Running the Dashboard

The dashboard provides a visual interface for managing memories and tasks.

### Starting the Dashboard

**Option 1: Using NPX (Recommended)**
```bash
npx @endlessblink/like-i-said-v2@2.6.3 like-i-said-v2 dashboard
```

**Option 2: Global Installation**
```bash
# Install globally
npm install -g @endlessblink/like-i-said-v2

# Run dashboard
like-i-said-v2 dashboard
```

**Option 3: From Source**
```bash
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server
npm install
npm run dev:full
```

### Accessing the Dashboard

1. Open your browser to `http://localhost:3001`
2. The dashboard shows all memories and tasks with real-time updates
3. Features include:
   - 📊 Task progress visualization
   - 🔍 Search and filter memories
   - 🔗 View task-memory relationships
   - 📁 Manage projects
   - 📤 Export/import data
   - 📈 Analytics and insights

## 💪 Key Features

### Task Management That Understands You
- **Status tracking** - todo → in_progress → done → blocked
- **Smart updates** - "I'm done with X" automatically updates status
- **Subtask management** - Break down complex tasks
- **Progress analytics** - See what you've accomplished

### Memory With Purpose
- **Task-linked memories** - Every memory connects to relevant tasks
- **Project organization** - Separate contexts for different projects
- **Semantic search** - Find information using natural language
- **Automatic categorization** - Code, decisions, research, etc.

### Built for Real Work
- **Dynamic path configuration** - "Change my task folder to D:\Projects"
- **Environment variables** - Set MEMORY_DIR and TASK_DIR
- **Windows optimized** - Full Windows path support
- **Real-time dashboard** - Visual interface at http://localhost:3001

## 🛠️ Available Tools (23 Total)

### Core Task Tools
- `create_task` - Create tasks with automatic memory linking
- `update_task` - Update status, add subtasks, link memories
- `smart_status_update` - Natural language status changes ("I finished X")
- `list_tasks` - View tasks by status, project, or priority
- `get_task_context` - See all memories and subtasks for a task
- `get_task_status_analytics` - Productivity insights and suggestions

### Memory Tools
- `add_memory` - Store any information with rich metadata
- `search_memories` - Find information across all projects
- `list_memories` - Browse memories by project or category
- `generate_dropoff` - Create handoff documents for new sessions

### Path Management (New in v2.6+)
- `set_memory_path` - Claude can change where memories are stored
- `set_task_path` - Claude can change where tasks are stored
- `get_current_paths` - Check current storage locations

### AI Enhancement Tools
- `enhance_memory_metadata` - Generate titles and summaries
- `batch_enhance_memories` - Bulk enhance multiple memories
- `validate_task_workflow` - Check workflow validity
- `get_automation_suggestions` - Get automation ideas
- Plus 7 more enhancement tools...

## 📁 How It Works

Tasks and memories are stored as markdown files with rich metadata:

```
memories/
├── project-name/
│   ├── 2024-07-15-auth-decision-a7b3c9.md
│   └── 2024-07-15-jwt-implementation-d4e8f2.md
tasks/
├── project-name/
│   ├── TASK-00001-build-authentication.md
│   └── TASK-00002-add-user-dashboard.md
```

Each task tracks:
- Status, priority, and timestamps
- Linked memories and subtasks
- Project and category assignment
- Natural language descriptions

## 🎮 Advanced Usage

### Natural Language Task Management
```
"I'm blocked on the payment integration because we need API credentials"
"The frontend is done but needs code review"
"What should I work on next?"
"Show me my progress this week"
```

### Dynamic Path Configuration
```
"Change my memory storage to D:\AI\Memories"
"Set task directory to C:\Projects\MyApp\tasks"
"Where are my files currently stored?"
```

### Project Switching
```
"Switch to the mobile-app project"
"Show me all tasks for the API project"
"What's the status across all my projects?"
```

## 🐛 Troubleshooting

### "Server not connecting"
```bash
# Update to latest version
npm install -g @endlessblink/like-i-said-v2@2.6.3

# Reinstall in Claude Desktop
npx @endlessblink/like-i-said-v2@2.6.3 like-i-said-v2 install
```

### "Can't find memories after path change"
Your old memories stay in the original location. Either:
- Copy them to the new location
- Change back to the original path

### Debug Mode
Set environment variable before starting Claude:
```bash
set DEBUG_MCP=true  # Windows
export DEBUG_MCP=true  # Mac/Linux
```

### Common Issues

**Windows Path Issues:**
- Use forward slashes: `C:/Users/name/memories`
- Or escape backslashes: `C:\\Users\\name\\memories`

**Port Conflicts:**
- Dashboard API uses port 3001
- Development UI uses port 5173
- Change with PORT environment variable if needed

## 🤝 Contributing

Found a bug? Have a feature idea? 
- [Report issues](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues)
- [View source code](https://github.com/endlessblink/Like-I-Said-memory-mcp-server)

## 📄 License

MIT © endlessblink

---

**Note**: This is an MCP (Model Context Protocol) server for Claude Desktop. It requires Claude Desktop or a compatible MCP client to function.