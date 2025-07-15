![Like-I-Said MCP v2](assets/images/cover.png)

# Like-I-Said MCP v2

[![npm version](https://img.shields.io/npm/v/@endlessblink/like-i-said-v2.svg)](https://www.npmjs.com/package/@endlessblink/like-i-said-v2)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Model Context Protocol (MCP) server that provides persistent memory and task management for AI assistants. Store information, track tasks, and maintain context across conversations.

## What This Does

Like-I-Said gives AI assistants the ability to remember information between conversations. When you tell your AI something important, it gets stored as a searchable memory that persists even after restarting. This creates a continuous experience where your AI maintains context about your projects, preferences, and ongoing work.

## Key Capabilities

- **Persistent Memory Storage**: Information saved as markdown files with metadata
- **Task Management**: Create, track, and link tasks with automatic memory connections
- **Project Organization**: Memories and tasks organized by project context
- **Smart Search**: Full-text search with filtering by project, tags, and categories
- **AI Enhancement**: Optional AI-powered title generation and content analysis
- **Real-time Dashboard**: Web interface for managing memories and tasks visually

## Installation Guide

### For Claude Desktop Users

**Easy Installation with DXT (Desktop Extension):**

1. Download [like-i-said-memory-v2.dxt](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/releases/latest/download/like-i-said-memory-v2.dxt)
2. Double-click the .dxt file
3. Claude Desktop will automatically install and configure everything
4. Restart Claude Desktop to activate

That's it! No technical setup required.

### For Claude Code Users (Web + IDE)

**Prerequisites**: Node.js 18+ installed on your system

#### Step 1: Configure Your IDE

Each IDE needs manual configuration to work with Claude Code (claude.ai/code).

**For Cursor:**
1. Create or edit `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "like-i-said-v2": {
      "command": "npx",
      "args": ["-p", "@endlessblink/like-i-said-v2", "like-i-said-v2", "start"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**For Windsurf:**
1. Create or edit `~/.codeium/windsurf/mcp_config.json`:
```json
{
  "mcp": {
    "servers": {
      "like-i-said-v2": {
        "command": "npx",
        "args": ["-p", "@endlessblink/like-i-said-v2", "like-i-said-v2", "start"],
        "env": {
          "NODE_ENV": "production"
        }
      }
    }
  }
}
```

**For VS Code with Continue:**
Follow the Continue extension's MCP configuration guide to add the server.

#### Step 2: Install the Package (Optional)

For better performance, install globally:
```bash
npm install -g @endlessblink/like-i-said-v2
```

Then update your IDE config to use:
```json
{
  "command": "like-i-said-v2",
  "args": ["start"]
}
```

#### Step 3: Verify Installation

1. Restart your IDE
2. Open claude.ai/code
3. Ask: "What MCP tools do you have available?"
4. You should see 23 tools including add_memory, create_task, etc.

## Running the Dashboard

The dashboard provides a visual interface for managing memories and tasks.

### Starting the Dashboard

**If installed globally:**
```bash
like-i-said-v2 dashboard
```

**Using npx (no installation):**
```bash
npx -p @endlessblink/like-i-said-v2 like-i-said-v2 dashboard
```

**From source code:**
```bash
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server
npm install
npm run dev:full  # Starts both API (port 3001) and UI (port 5173)
```

### Accessing the Dashboard

1. Open your browser to `http://localhost:5173` (development) or `http://localhost:3001` (production)
2. The dashboard shows all memories and tasks with real-time updates
3. Features include:
   - Search and filter memories
   - View task relationships
   - Manage projects
   - Export/import data
   - Analytics and insights

## Available Tools (23 Total)

### Memory Management (6 tools)
- `add_memory` - Store information with metadata and categories
- `get_memory` - Retrieve specific memory by ID
- `list_memories` - List memories with filtering options
- `search_memories` - Full-text search across all memories
- `delete_memory` - Remove a specific memory
- `test_tool` - Verify MCP connection is working

### Task Management (6 tools)
- `create_task` - Create tasks with automatic memory linking
- `update_task` - Update task status and properties
- `list_tasks` - List tasks with status filtering
- `get_task_context` - Get task details with related memories
- `delete_task` - Delete a task and its subtasks
- `generate_dropoff` - Create session handoff documents

### AI Enhancement (11 tools)
- `enhance_memory_metadata` - Generate titles and summaries
- `batch_enhance_memories` - Bulk enhance multiple memories
- `smart_status_update` - Natural language task updates
- `get_task_status_analytics` - Productivity analytics
- `validate_task_workflow` - Check workflow validity
- `get_automation_suggestions` - Get automation ideas
- `batch_enhance_memories_ollama` - Local AI enhancement
- `batch_enhance_tasks_ollama` - Bulk task enhancement
- `check_ollama_status` - Check local AI server
- `enhance_memory_ollama` - Enhance with local AI
- `deduplicate_memories` - Remove duplicate memories

## Storage Structure

Memories and tasks are stored as markdown files:

```
memories/
├── default/           # Default project memories
├── project-name/      # Project-specific memories
└── [other-projects]/

tasks/
├── project-name/      # Project-specific tasks
└── [other-projects]/
```

Each memory includes metadata like:
- Unique ID and timestamp
- Category (work, personal, code, research, etc.)
- Project assignment
- Tags and priority
- Complexity level (L1-L4)
- Related memories

## Usage Examples

**Storing Information:**
> "Remember that the API uses PostgreSQL with connection pooling enabled"

**Creating Tasks:**
> "Create a task to refactor the authentication module"

**Searching:**
> "Search for all memories about database configuration"

**Task Updates:**
> "Mark the authentication refactor task as complete"

## Configuration

### Memory Storage Location

Default locations by platform:
- **Windows**: `%USERPROFILE%\Documents\claude-memories`
- **macOS**: `~/Documents/claude-memories`
- **Linux**: `~/Documents/claude-memories`

You can customize these during installation or by setting environment variables:
```bash
MEMORY_DIR=/custom/path/memories
TASK_DIR=/custom/path/tasks
```

### Dashboard Settings

The dashboard includes settings for:
- Theme (light/dark mode)
- Default project selection
- Memory display options
- Export/import preferences
- AI enhancement settings

## Troubleshooting

### MCP Tools Not Appearing

1. **Restart your IDE/Claude Desktop completely**
2. **Check configuration files** are in the correct location
3. **Verify Node.js version**: `node --version` (should be 18+)
4. **Check logs** for error messages

### Dashboard Connection Issues

1. **Ensure API server is running** on port 3001
2. **Check firewall settings** aren't blocking ports
3. **Try accessing** `http://localhost:3001/api/status`
4. **Check browser console** for error messages

### Common Issues

**Windows Path Issues:**
- Use forward slashes in paths: `C:/Users/name/memories`
- Or escape backslashes: `C:\\Users\\name\\memories`

**Permission Errors:**
- Ensure write permissions for memory/task directories
- Run with appropriate user permissions

**Port Conflicts:**
- API server uses port 3001
- Dev UI uses port 5173
- Change with environment variables if needed

## Development

### Running from Source

```bash
# Clone repository
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server

# Install dependencies
npm install

# Development mode
npm run dev:full    # Both API and UI with hot reload
npm run dev         # UI only
npm run start:dashboard  # API only

# Production build
npm run build
npm run preview
```

### Testing

```bash
npm test           # Run test suite
npm run test:mcp   # Test MCP server
npm run test:api   # Test API endpoints
```

### Architecture

- **MCP Server**: Handles tool requests from AI assistants
- **API Server**: REST API for dashboard (Express.js)
- **Dashboard**: React + TypeScript with Vite
- **Storage**: File-based markdown with YAML frontmatter
- **Real-time**: WebSocket updates for live changes

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues)
- **Discussions**: [GitHub Discussions](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/discussions)
- **Documentation**: [Full docs](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/wiki)

---

Built with ❤️ for the AI-assisted development community