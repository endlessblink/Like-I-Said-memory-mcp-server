# MCP Dropoff Tool Usage

## 🚀 Generate Session Dropoff

The `generate_dropoff` MCP tool automatically creates comprehensive session handoff documents.

### Basic Usage

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_dropoff",
    "arguments": {
      "session_summary": "Implemented WebSocket real-time updates and fixed memory format issues"
    }
  }
}
```

### Advanced Usage

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "generate_dropoff",
    "arguments": {
      "session_summary": "Major dashboard enhancements and Neo4j planning session",
      "include_recent_memories": true,
      "include_git_status": true,
      "recent_memory_count": 5,
      "output_format": "markdown"
    }
  }
}
```

## 📋 Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `session_summary` | string | "Session work completed" | Brief summary of work done |
| `include_recent_memories` | boolean | `true` | Include recent memories in dropoff |
| `include_git_status` | boolean | `true` | Include git status and commits |
| `recent_memory_count` | number | `5` | Number of recent memories to include |
| `output_format` | string | "markdown" | Output format: "markdown" or "json" |

## 🎯 What It Generates

The tool automatically collects and formats:

- **Project Information**: Name, version, location, repository
- **Session Summary**: Your provided summary of work completed
- **Recent Memories**: Latest memory files with metadata
- **Git Status**: Current branch, changes, recent commits
- **System Status**: Node version, ports, directory info
- **Next Steps**: Intelligent suggestions based on recent activity

## 📁 Output

- **Markdown format**: Creates `SESSION-DROPOFF-[timestamp].md` file
- **JSON format**: Returns structured data object
- **File location**: Project root directory
- **Content**: Copy-paste ready prompt for new sessions

## ✅ Benefits

1. **Zero Manual Work**: Eliminates manual dropoff creation
2. **Complete Context**: Never miss important session details
3. **Smart Suggestions**: AI-powered next steps recommendations
4. **Git Integration**: Automatic change detection and commit history
5. **Memory Context**: Recent work automatically included

## 🔧 Integration

The tool is now available in:
- Claude Code MCP sessions
- Any MCP-compatible AI assistant
- Cursor with MCP support
- Direct API calls

Perfect for maintaining context across long development sessions!