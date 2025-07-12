# Perplexity Query: Cytoscape.js Performance & UI Optimization

## Context
I have a working React + TypeScript Cytoscape.js knowledge graph with 115+ nodes, but experiencing critical performance and UI issues that need optimization. The graph uses fCoSE layout algorithm for Neo4j Browser-quality visualization.

## Current Performance Issues

### 1. Graph Constantly Resets/Re-renders
- Graph restarts layout animation frequently 
- Loses user position/zoom state on every re-render
- React re-renders causing Cytoscape destruction/recreation
- WebSocket updates (every few seconds) triggering full reinitialization

### 2. Extremely Slow Zoom Performance
- Zoom in/out operations are sluggish and unresponsive
- Panning performance is poor with 115+ nodes
- Mouse wheel sensitivity issues making zoom unusable
- Frame rate drops during zoom/pan interactions

### 3. Text Rendering Problems
- Node labels overflow outside node boundaries
- Text becomes unreadable at different zoom levels
- Font sizing doesn't scale properly with zoom
- Node labels cut off or overlap with neighboring nodes

## Current Technical Implementation

### React Component Structure
```typescript
const CytoscapeGraph: React.FC = ({ memories, onNodeClick, height = 600 }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Re-runs on every memories change (115+ nodes)
    // Destroys and recreates entire graph
    let cy: cytoscape.Core | null = null
    
    const initCytoscape = async () => {
      if (cyRef.current) {
        cyRef.current.destroy() // Full destruction!
        cyRef.current = null
      }
      
      cy = cytoscape({
        container: containerRef.current,
        elements: [], // Start empty
        layout: { name: 'preset' },
        wheelSensitivity: 0.2, // Current setting
        maxZoom: 3,
        minZoom: 0.1
      })
      
      cy.add(elements) // 120+ elements added at once
      
      const layout = cy.layout({
        name: 'fcose',
        idealEdgeLength: 100,
        nodeOverlap: 10,
        nodeRepulsion: 4500,
        animate: true,
        animationDuration: 1000 // Slow animation
      })
      
      layout.run() // Triggers every time
    }
  }, [memories, generateCytoscapeData, onNodeClick]) // Dependencies cause frequent re-runs
}
```

### Current Styling Configuration
```typescript
style: [
  {
    selector: 'node',
    style: {
      'background-color': 'data(color)',
      'width': 'data(size)', // Fixed size: 25px
      'height': 'data(size)',
      'label': 'data(label)', // 12+ character labels
      'font-size': '12px', // Fixed font size
      'font-weight': 'bold',
      'text-valign': 'center',
      'text-halign': 'center',
      'color': '#fff',
      'text-outline-color': '#000',
      'text-outline-width': 2
    }
  }
]
```

## Query for Perplexity

**How do I optimize Cytoscape.js performance and UI rendering for a React knowledge graph with 115+ nodes? Specifically:**

### Performance Optimization
1. **Prevent Re-initialization**: How to avoid full graph destruction/recreation on React re-renders? Should I use `useMemo`, `useCallback`, or different dependency management?

2. **Incremental Updates**: Best practices for updating graph data without full re-layout? How to add/remove/update nodes without `layout.run()` triggering complete repositioning?

3. **WebSocket Integration**: How to handle real-time data updates without causing graph resets? Should updates be batched or throttled?

4. **Memory Management**: Optimal strategies for handling 100+ nodes without memory leaks or performance degradation?

### Zoom & Pan Performance
5. **Smooth Zoom**: What Cytoscape.js settings optimize zoom/pan performance? Are there specific renderer optimizations or wheel sensitivity configurations?

6. **Viewport Optimization**: How to implement efficient viewport culling or level-of-detail for large graphs? Should I hide nodes outside viewport?

7. **Animation Performance**: Best practices for fCoSE layout animation duration and easing for responsive UX?

### Text Rendering & Scaling
8. **Dynamic Font Sizing**: How to implement zoom-responsive font sizing that scales properly? Should font size change based on zoom level?

9. **Text Overflow Prevention**: Techniques to prevent node labels from overflowing node boundaries? Should I truncate text or resize nodes dynamically?

10. **Multi-line Labels**: How to implement proper text wrapping for longer node labels without performance impact?

### Advanced Optimizations
11. **Layout Persistence**: How to save/restore node positions to avoid re-layout on page refresh or component remount?

12. **Debounced Updates**: Best patterns for debouncing React state updates that affect Cytoscape rendering?

13. **Production Performance**: Are there specific Cytoscape.js production build optimizations or renderer settings for large graphs?

**Please provide specific code examples, configuration settings, and React integration patterns for building a high-performance, responsive knowledge graph interface.**