# Perplexity Query: Cytoscape.js React Integration Debugging

## Context
I have a React 18 + TypeScript application with a Cytoscape.js component that gets stuck on "Building professional knowledge graph..." and never renders. The D3.js graph works fine, but Cytoscape.js fails silently. Console shows WebSocket connection errors.

## Current Implementation Issues

### 1. Cytoscape.js Component Stuck Loading
- Shows loading spinner indefinitely with "Building professional knowledge graph..."
- `setIsLoading(false)` never gets called
- No visible errors in component, but graph never renders
- Playwright test shows 0 canvas/div elements for Professional tab vs 1 canvas for Enhanced tab

### 2. WebSocket Connection Errors
```
🔌 WebSocket disconnected - Attempting to reconnect...
Uncaught TypeError: CanvasRenderingContext2D.createRadialGradient...
```

### 3. Current Tech Stack
- React 18.2.0 + TypeScript
- Cytoscape.js 3.32.0 + cytoscape-fcose 2.2.0
- Vite 4.4.9 build system
- 115+ memory nodes being processed (limited to 50 for performance)

### 4. Component Structure
```typescript
const CytoscapeGraph: React.FC<CytoscapeGraphProps> = ({ memories, onNodeClick, height = 600 }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initCytoscape = async () => {
      setIsLoading(true)
      try {
        const elements = generateCytoscapeData() // Creates nodes and edges
        const cy = cytoscape({
          container: containerRef.current,
          elements,
          layout: { name: 'fcose', /* fCoSE params */ }
        })
        cyRef.current = cy
        setIsLoading(false) // Never reached
      } catch (err) {
        setError(err.message)
      }
    }
    initCytoscape()
  }, [memories])
}
```

## Query for Perplexity

**How do I debug and fix Cytoscape.js React integration issues where the component gets stuck loading indefinitely? Specifically:**

1. **Silent Failures**: What are common reasons Cytoscape.js initialization silently fails in React without throwing errors? How to add proper debugging?

2. **Container Issues**: What container setup requirements does Cytoscape.js have in React? Does it need specific CSS styles, dimensions, or DOM readiness checks?

3. **Memory/Performance**: With 50+ nodes and complex layouts, what are Cytoscape.js performance best practices? Should I implement progressive loading or chunking?

4. **fCoSE Layout Debugging**: How to debug fCoSE layout algorithm issues? Are there layout events I should listen to for completion?

5. **React 18 Compatibility**: Are there known React 18 Strict Mode or concurrent rendering issues with Cytoscape.js? Should I use specific useEffect patterns?

6. **WebSocket Integration**: How do WebSocket connection issues affect Cytoscape.js rendering? Should graph initialization wait for WebSocket connection?

7. **Error Boundaries**: What error boundary patterns work best for Cytoscape.js components to catch initialization failures?

**Please provide specific debugging steps, common gotchas, and working React + TypeScript + Cytoscape.js patterns for complex graph applications.**