# Like-I-Said MCP Server v2 - Desktop Extension (DXT) Package

## Overview

This is the official Desktop Extension (DXT) package for Like-I-Said MCP Server v2, a persistent memory and task management system for AI assistants.

## Package Details

- **Package Name**: `like-i-said-memory-v2.dxt`
- **Version**: 2.3.7
- **Size**: ~2.2 MB
- **Type**: Node.js MCP Server

## Installation

### For Claude Desktop

1. **Download the DXT file**: `like-i-said-memory-v2.dxt`

2. **Install via Claude Desktop**:
   - Open Claude Desktop
   - Go to Settings → Extensions
   - Click "Install Extension"
   - Select the `like-i-said-memory-v2.dxt` file
   - Configure the extension settings if prompted

3. **Verify Installation**:
   - Restart Claude Desktop
   - Check that the memory tools appear in your conversation

### Manual Installation (Advanced Users)

If you need to manually extract and configure:

```bash
# Extract the DXT package
unzip like-i-said-memory-v2.dxt -d like-i-said-extension

# The server entry point is:
# like-i-said-extension/server/mcp-server-standalone.js
```

## Package Structure

```
like-i-said-memory-v2.dxt
├── manifest.json              # Extension manifest
├── icon.png                   # Extension icon
├── server/                    # MCP server files
│   ├── mcp-server-standalone.js  # Main entry point
│   ├── package.json           # Server dependencies
│   ├── lib/                   # Core libraries
│   └── node_modules/          # Bundled dependencies
├── memories/                  # Memory storage directory
│   └── default/              # Default project
├── tasks/                     # Task storage directory
│   └── default/              # Default project
└── assets/                    # Screenshots and media
    └── screenshots/
```

## Configuration Options

The extension supports the following user-configurable options:

1. **Memory Storage Directory**
   - Where memories are stored
   - Default: `./memories`

2. **Task Storage Directory**
   - Where tasks are stored
   - Default: `./tasks`

3. **Default Project**
   - Default project name for organization
   - Default: `default`

4. **Enable Auto-Linking**
   - Automatically link related memories and tasks
   - Default: `true`

5. **Maximum Search Results**
   - Limit for search results
   - Default: `20` (Range: 5-100)

## Available Tools

The extension provides 12 MCP tools:

### Memory Management (6 tools)
- `add_memory` - Store information with auto-categorization
- `get_memory` - Retrieve specific memory by ID
- `list_memories` - List memories with filtering
- `search_memories` - Full-text search across memories
- `delete_memory` - Remove a memory
- `test_tool` - Test MCP connection

### Task Management (6 tools)
- `create_task` - Create tasks with auto-memory linking
- `update_task` - Update task status and details
- `list_tasks` - List tasks with filtering
- `get_task_context` - Get task with connected memories
- `delete_task` - Delete tasks and subtasks
- `generate_dropoff` - Generate session handoff documents

## Features

- **Persistent Memory**: Store conversations and information across sessions
- **Task Management**: Create and track tasks with automatic memory linking
- **Project Organization**: Organize memories and tasks by project
- **Smart Search**: Full-text search with project filtering
- **Auto-Linking**: Automatic connection between related memories and tasks
- **Session Handoffs**: Generate context documents for seamless transitions
- **Privacy First**: All data stored locally in markdown files

## Data Storage

All data is stored locally on your machine using markdown files with YAML frontmatter:
- Memories: `memories/<project>/<date>-<title>-<id>.md`
- Tasks: `tasks/<project>/tasks.md`

## Troubleshooting

### Extension not appearing in Claude Desktop
1. Restart Claude Desktop
2. Check Settings → Extensions
3. Verify the extension is enabled

### Tools not working
1. Check that the extension is running (green status indicator)
2. Try the `test_tool` to verify connection
3. Check Claude Desktop logs for errors

### Memory/Task storage issues
1. Verify write permissions for storage directories
2. Check available disk space
3. Ensure no antivirus is blocking file operations

## Support

- **GitHub**: https://github.com/endlessblink/like-i-said-mcp-server-v2
- **Issues**: https://github.com/endlessblink/like-i-said-mcp-server-v2/issues
- **Documentation**: https://github.com/endlessblink/like-i-said-mcp-server-v2#readme

## License

MIT License - See the repository for full license text.

## Version History

- **2.3.7** - Current release with DXT support
  - Desktop Extension packaging
  - Bundled dependencies
  - Improved stability
  - Enhanced auto-linking capabilities