# Developer Guide

This guide covers the technical architecture and development workflow for Like-I-Said v2.

## Architecture Overview

### Core Components

1. **MCP Server** (`server-markdown.js`)
   - Implements Model Context Protocol
   - Provides 23 tools for memory and task management
   - File-based storage using markdown with YAML frontmatter

2. **Dashboard API** (`dashboard-server-bridge.js`)
   - Express.js REST API server
   - WebSocket support for real-time updates
   - Bridges MCP functionality to web interface

3. **React Dashboard** (`src/App.tsx`)
   - Modern React + TypeScript frontend
   - Real-time updates via WebSocket
   - Component-based architecture

## Development Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### Getting Started
```bash
# Clone the repository
git clone https://github.com/endlessblink/Like-I-Said-memory-mcp-server.git
cd Like-I-Said-memory-mcp-server

# Install dependencies
npm install

# Start development environment
npm run dev:full
```

## Project Structure

```
like-i-said-mcp-server-v2/
├── server-markdown.js        # Main MCP server
├── dashboard-server-bridge.js # API bridge server
├── cli.js                    # NPX installer
├── lib/                      # Core libraries
│   ├── memory-storage-wrapper.js
│   ├── task-storage.js
│   ├── task-memory-linker.js
│   └── ...
├── src/                      # React dashboard
│   ├── App.tsx
│   ├── components/
│   ├── types.ts
│   └── ...
├── memories/                 # Memory storage
└── tasks/                    # Task storage
```

## Key Libraries

### Storage Layer
- `memory-storage-wrapper.js` - Memory CRUD operations
- `task-storage.js` - Task management with indexing
- `memory-format.js` - Markdown/YAML parsing

### Intelligence Layer
- `task-memory-linker.js` - Auto-linking memories and tasks
- `vector-storage.js` - Semantic search capabilities
- `content-analyzer.js` - Content type detection

### System Protection
- `system-safeguards.js` - Data integrity protection
- `connection-protection.cjs` - Concurrent access control
- `file-system-monitor.js` - Real-time file watching

## Adding New Features

### Creating a New MCP Tool

1. Add tool definition in `server-markdown.js`:
```javascript
{
  name: "my_new_tool",
  description: "Description of what the tool does",
  inputSchema: {
    type: "object",
    properties: {
      param1: { type: "string", description: "Parameter description" }
    },
    required: ["param1"]
  }
}
```

2. Implement the handler:
```javascript
async function handleMyNewTool(params) {
  // Tool implementation
  return { success: true, result: "..." };
}
```

### Adding Dashboard Components

1. Create component in `src/components/`:
```typescript
export const MyComponent: React.FC<Props> = ({ data }) => {
  return <div>{/* Component JSX */}</div>;
};
```

2. Add to main App.tsx or relevant parent component

3. Update types in `src/types.ts` if needed

### Adding API Endpoints

1. Add endpoint in `dashboard-server-bridge.js`:
```javascript
app.get('/api/my-endpoint', async (req, res) => {
  try {
    const result = await myFunction();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Test MCP server
npm run test:mcp
```

### Writing Tests
- Place test files in `__tests__/` or next to source files
- Use Jest for unit tests
- Test both success and error cases

## Building for Production

```bash
# Build React dashboard
npm run build

# Package for npm
npm pack

# Create DXT package (for Claude Desktop)
# See build scripts in project root
```

## Code Style Guidelines

### JavaScript/TypeScript
- Use ES6+ features
- Async/await over promises
- Meaningful variable names
- Comment complex logic

### React Components
- Functional components with hooks
- TypeScript for type safety
- Prop validation
- Memoization where appropriate

### File Organization
- One component per file
- Related utilities in same directory
- Shared types in types.ts

## Debugging

### MCP Server
- Add console.error for debugging
- Check stderr output
- Use test_tool for connection testing

### Dashboard
- Browser DevTools for React
- Network tab for API calls
- WebSocket messages in console

### Common Issues
- Port conflicts (3001, 5173)
- File permissions
- Node version compatibility

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

See [CONTRIBUTING.md](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/blob/main/CONTRIBUTING.md) for details.

## Resources

- [MCP Documentation](https://modelcontextprotocol.io)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Project Issues](https://github.com/endlessblink/Like-I-Said-memory-mcp-server/issues)