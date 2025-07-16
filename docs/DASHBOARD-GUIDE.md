# Dashboard User Guide

The Like-I-Said Dashboard provides a modern web interface for managing your memories and tasks.

## Starting the Dashboard

### Full Stack Development Mode
```bash
npm run dev:full
```
This starts both:
- API server on `http://localhost:3001`
- React dashboard on `http://localhost:5173`

### Individual Components
```bash
# Start API server only
npm run start:dashboard

# Start React frontend only
npm run dev
```

## Dashboard Features

### Memory Management
- **Create Memories**: Click the "+" button to add new memories
- **Search**: Use the search bar for full-text search across all memories
- **Filter**: Filter by project, category, complexity level, or tags
- **View/Edit**: Click any memory card to view details or edit
- **Delete**: Remove memories you no longer need

### Task Management
- **Create Tasks**: Add tasks with automatic memory linking
- **Task States**: Track tasks as todo, in_progress, done, or blocked
- **Subtasks**: Break down complex tasks into smaller steps
- **Memory Connections**: See which memories are related to each task

### Advanced Features

#### AI Enhancement
- **Ollama Integration**: Enhance memories with locally-run AI
- **Title Generation**: Auto-generate meaningful titles
- **Summary Creation**: Create concise summaries for better overview

#### Search & Filters
- **Complex Queries**: Use AND/OR operators for advanced search
- **Date Ranges**: Filter memories by creation date
- **Priority Levels**: Focus on high-priority items
- **Project Organization**: Group memories by project

#### Analytics Dashboard
- View memory statistics
- Track task completion rates
- Monitor memory usage patterns
- Identify knowledge gaps

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Ctrl/Cmd + N` | New memory |
| `Ctrl/Cmd + T` | New task |
| `Esc` | Close dialogs |

## Real-time Updates

The dashboard uses WebSocket connections to show real-time updates when:
- Memories are created via MCP tools
- Tasks are updated
- Files are modified externally

## Data Organization

### Projects
Memories and tasks are organized by project. Use consistent project names for better organization.

### Categories
- **personal**: Personal notes and reminders
- **work**: Work-related information
- **code**: Code snippets and technical details
- **research**: Research findings and references
- **conversations**: Important discussion points
- **preferences**: User preferences and settings

### Complexity Levels
- **L1**: Simple, straightforward information
- **L2**: Moderate complexity with some context
- **L3**: Complex topics requiring detailed explanation
- **L4**: Highly complex, interconnected information

## Tips for Effective Use

1. **Consistent Tagging**: Use consistent tags for easier retrieval
2. **Project Names**: Keep project names short and descriptive
3. **Regular Review**: Periodically review and clean up old memories
4. **Task Tracking**: Update task status as you work
5. **Memory Linking**: Connect related memories for better context

## Troubleshooting

### Dashboard won't load
- Check if API server is running on port 3001
- Verify no firewall blocking
- Clear browser cache

### Search not working
- Rebuild search index by restarting the server
- Check for corrupted memory files

### WebSocket disconnected
- Refresh the page
- Check network connectivity
- Restart the API server

For more help, visit our [GitHub repository](https://github.com/endlessblink/Like-I-Said-memory-mcp-server).