# Perplexity Query: Fix React Dashboard Real-time Updates & Sigma.js Graph Visualization

## Context
I have a React dashboard (Vite + TypeScript) that displays memories from a Node.js/Express backend. The dashboard has two critical issues:

1. **Real-time updates not working**: When new memory files are added to the filesystem, the dashboard stays at 115 memories instead of updating to show new ones (should be 117+)
2. **Sigma.js graph is empty**: The graph component loads but shows no nodes/edges despite having 115+ memories with tags

## Technical Stack
- Frontend: React 18, TypeScript, Vite, @react-sigma/core v4, graphology
- Backend: Node.js Express server (port 3001) with WebSocket support
- File watching: Chokidar watches `/memories/**/*.md` for changes

## Issue 1: Dashboard Not Updating in Real-time

### Current WebSocket Implementation
Backend broadcasts on file changes:
```javascript
// dashboard-server-bridge.js
broadcastChange(type, filePath) {
  const message = {
    type: 'file_change',
    data: { action: type, file: path.basename(filePath), ... }
  };
  this.clients.forEach(client => {
    if (client.readyState === 1) client.send(JSON.stringify(message));
  });
}
```

Frontend WebSocket handler:
```typescript
// App.tsx
ws.onmessage = (event) => {
  const message = JSON.parse(event.data)
  if (message.type === 'file_change') {
    loadMemories(true) // This should refresh the list
  }
}
```

**Problem**: Even though WebSocket messages are received (visible in console), the memory count stays at 115.

## Issue 2: Sigma.js Graph Shows Empty

### Current Implementation
Transform function:
```typescript
// dataTransformation.ts
transform(memories: Memory[], canvasWidth: number = 800, canvasHeight: number = 600, maxNodes: number = 100): Graph {
  const graph = new Graph();
  limitedMemories.forEach((memory, index) => {
    graph.addNode(memory.id, {
      label: this.extractTitle(memory),
      x: position.x,
      y: position.y,
      size: this.calculateNodeSize(title),
      color: this.nodeColors[category],
      nodeType: 'memory', // Changed from 'type' to avoid Sigma reserved property
      content: memory.content || '',
      originalData: memory
    });
  });
  return graph;
}
```

Graph component:
```tsx
// SigmaKnowledgeGraph.tsx
<SigmaContainer 
  style={{ height: `${height - 60}px`, width: '100%' }}
  settings={{
    allowInvalidContainer: true,
    renderEdgeLabels: true,
    renderLabels: true,
    defaultNodeType: "circle",
    defaultEdgeType: "line"
  }}
>
  <GraphLoader memories={memories} onNodeClick={onNodeClick} maxNodes={maxNodes} />
  <LayoutController nodeCount={Math.min(memories.length, maxNodes)} />
</SigmaContainer>
```

**Console logs show**:
- `GraphLoader: Initializing with memories: 115`
- `MemoryToSigmaTransformer: Starting transform with 115 memories`
- `GraphLoader: Graph created with: {nodes: 0, edges: 0}` ← PROBLEM

## Questions for Perplexity

1. **Why is `loadMemories(true)` not updating the React state?** 
   - Is there a React 18 batching issue?
   - Should we use `flushSync` or a different update pattern?
   - Is the WebSocket message being processed before the DOM updates?

2. **Why is the Sigma.js graph transform creating 0 nodes from 115 memories?**
   - Are we missing required properties for Sigma nodes?
   - Is there a graphology initialization issue?
   - Do we need to wait for the container to have dimensions before creating the graph?

3. **Best practices for React + Sigma.js v4 integration in 2024/2025?**
   - Proper way to handle dynamic graph updates
   - Container sizing and WebGL context management
   - Performance optimization for 100+ nodes

Please provide specific code fixes for both issues, focusing on:
- Ensuring React state updates when WebSocket messages arrive
- Making sure Sigma.js properly renders nodes from the memory data
- Any missing configuration or initialization steps for @react-sigma/core v4

Include any common pitfalls with Sigma.js v4 that might cause empty graphs despite having valid data.