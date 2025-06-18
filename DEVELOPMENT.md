# Development Guide

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development servers
npm run dev:full

# Access the dashboard
open http://localhost:5173
```

## 📁 Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   └── ModernGraph.tsx # Main graph visualization
│   ├── services/           # API and external services
│   ├── utils/              # Helper functions
│   ├── types.ts            # TypeScript definitions
│   └── App.tsx             # Main application
├── dashboard-server.js     # Express API server
├── server.js              # MCP server
└── memories.json          # Data storage
```

## 🛠️ Development Commands

### Core Development
- `npm run dev:full` - Start both API server and React frontend
- `npm run dev` - Start React frontend only (port 5173)
- `npm run dashboard` - Start API server only (port 3001)

### Production
- `npm run build` - Build React frontend for production
- `npm run preview` - Preview production build
- `npm start` - Start MCP server (production mode)

### Process Management
- `npm run pm2:start` - Start with PM2 process manager
- `npm run pm2:stop` - Stop PM2 process
- `npm run pm2:status` - Check PM2 status

## 🏗️ Architecture

### Frontend (React + TypeScript + Vite)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Graph Visualization**: React-Force-Graph (WebGL-accelerated)
- **Code Editor**: Monaco Editor (VS Code engine)
- **State Management**: React hooks (useState, useEffect)

### Backend (Node.js + Express)
- **API Server**: Express.js REST API on port 3001
- **MCP Server**: Model Context Protocol server using stdio transport
- **Data Storage**: JSON file (`memories.json`)
- **Endpoints**: CRUD operations for memory management

### Key Features
- **Modern Graph Visualization**: WebGL-powered with 3D physics
- **Multiple View Modes**: Cards, Table, and Graph views
- **LLM Integration**: OpenAI/Anthropic for smart titles and summaries
- **Advanced Editor**: Monaco Editor with syntax highlighting
- **Smart Categories**: Automatic content categorization
- **Real-time Search**: Instant filtering and search

## 🎨 UI Components

### Component Hierarchy
```
App
├── Navigation (tabs, settings, add button)
├── Sidebar (categories, search, stats)
└── MainContent
    ├── ViewControls (mode switcher)
    └── ContentArea
        ├── CardsView (grid layout)
        ├── TableView (data table)
        └── GraphView (ModernGraph)
```

### ModernGraph Component
- **3D Force-Directed Layout**: Physics-based node positioning
- **Custom Node Rendering**: Canvas-based with gradients and shadows
- **Interactive Features**: Hover tooltips, click selection, drag & drop
- **Multiple Layout Types**: Galaxy, Clusters, Timeline views
- **Performance Optimizations**: WebGL rendering, LOD, clustering

## 🔧 Development Tips

### Adding New Features
1. **Define Types**: Add interfaces to `src/types.ts`
2. **Create Utilities**: Add helpers to `src/utils/`
3. **Update API**: Modify `src/services/api.ts` if needed
4. **Build Components**: Use shadcn/ui components when possible
5. **Test Integration**: Ensure both frontend and backend work

### State Management
- Use `useState` for local component state
- Use `useEffect` for side effects and data loading
- Pass data down through props, use callbacks for updates
- Consider context for deeply nested state (if needed)

### Styling Guidelines
- Use Tailwind CSS classes for styling
- Follow dark theme color scheme (gray-900, gray-800, gray-700)
- Use violet accent colors for primary actions
- Ensure proper contrast for accessibility

### Performance Considerations
- **Graph Rendering**: Limit to 1000+ nodes for optimal performance
- **Memory Usage**: Efficient data structures for large datasets
- **Network Requests**: Batch API calls when possible
- **Re-renders**: Use React.memo and useCallback for expensive operations

## 🐛 Debugging

### Common Issues
1. **Port Conflicts**: Check if ports 3001/5173 are in use
2. **Build Errors**: Clear node_modules and reinstall
3. **Graph Not Loading**: Check browser console for WebGL errors
4. **API Errors**: Verify dashboard-server.js is running

### Debugging Tools
- **React DevTools**: Browser extension for component inspection
- **Network Tab**: Monitor API requests and responses
- **Console Logs**: Enable verbose logging for graph components
- **File Watcher**: Check memories.json for data persistence

### Performance Monitoring
```javascript
// Add to components for performance tracking
console.time('component-render')
// component logic
console.timeEnd('component-render')
```

## 📝 Code Style

### TypeScript
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use proper typing for function parameters and returns
- Avoid `any` type, use specific types or generics

### React
- Functional components with hooks
- Descriptive component and prop names
- Extract custom hooks for reusable logic
- Use proper dependency arrays in useEffect

### Naming Conventions
- **Files**: kebab-case for components, camelCase for utilities
- **Components**: PascalCase
- **Functions**: camelCase with descriptive verbs
- **Constants**: UPPER_SNAKE_CASE
- **Types**: PascalCase with descriptive names

## 🚢 Deployment

### Production Build
```bash
npm run build
npm run preview  # Test production build locally
```

### NPM Package
- Package name: `@endlessblink/like-i-said-v2`
- Current version: 2.0.2
- Update version: `npm version patch|minor|major`
- Publish: `npm publish --access public`

### Environment Setup
- Node.js 18+ required
- Windows/Linux/macOS supported
- NPX installation: `npx @endlessblink/like-i-said-v2 install`

## 🔮 Future Enhancements

### Planned Features
- **Advanced Analytics**: Memory usage patterns and insights
- **Export/Import**: Backup and restore memory collections
- **Collaboration**: Multi-user support with real-time sync
- **Mobile App**: React Native implementation
- **Cloud Storage**: Optional cloud backup integration

### Technical Improvements
- **Database Migration**: Move from JSON to SQLite/PostgreSQL
- **Real-time Updates**: WebSocket for live data sync
- **Plugin System**: Extensible architecture for custom features
- **Testing Suite**: Comprehensive unit and integration tests
- **CI/CD Pipeline**: Automated testing and deployment

---

## 📚 Resources

- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [React-Force-Graph](https://github.com/vasturiano/react-force-graph)
- [Monaco Editor](https://github.com/microsoft/monaco-editor)
- [Model Context Protocol](https://modelcontextprotocol.io/)

---

**Happy Coding! 🎉**