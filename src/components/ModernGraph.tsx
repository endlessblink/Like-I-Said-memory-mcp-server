import React, { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import { Card } from '@/components/ui/card'
import * as d3 from 'd3'

interface GraphNode {
  id: string
  label: string
  title: string
  summary: string
  tags: string[]
  size: number
  color: string
  val: number
  content: string
  timestamp: string
  category: string
  connectionCount: number
  x?: number
  y?: number
}

interface GraphLink {
  source: string
  target: string
  value: number
  color: string
  weight: number
}

interface ModernGraphProps {
  memories: any[]
  selectedNode: string | null
  onNodeClick: (nodeId: string | null) => void
  graphType: 'galaxy' | 'clusters' | 'timeline'
  tagFilter: string
  extractTitle: (content: string, memory?: any) => string
  generateSummary: (content: string, memory?: any) => string
  extractTags: (memory: any) => string[]
  getTagColor: (tag: string) => { bg: string; text: string; border: string }
}

export function ModernGraph({
  memories,
  selectedNode,
  onNodeClick,
  graphType,
  tagFilter,
  extractTitle,
  generateSummary,
  extractTags,
  getTagColor
}: ModernGraphProps) {
  const graphRef = useRef<any>()
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('modern-graph-container')
      if (container) {
        setDimensions({
          width: container.offsetWidth,
          height: container.offsetHeight
        })
      }
    }
    
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // Generate graph data from memories with proper connections
  useEffect(() => {
    try {
      const filteredMemories = memories.filter(memory => {
        if (tagFilter === 'all') return true
        const tags = extractTags(memory)
        return tags.includes(tagFilter)
      })

      // First pass: create links to calculate connection counts
      const links: GraphLink[] = []
      const linkMap = new Map()
      const connectionCounts = new Map()

      // Initialize connection counts
      filteredMemories.forEach(memory => {
        connectionCounts.set(memory.id, 0)
      })

      // Create links based on shared tags
      filteredMemories.forEach((memory1, i) => {
        const tags1 = extractTags(memory1)
        filteredMemories.forEach((memory2, j) => {
          if (i < j) { // Avoid duplicate links
            const tags2 = extractTags(memory2)
            const sharedTags = tags1.filter(tag => tags2.includes(tag))
            
            if (sharedTags.length > 0) {
              const linkId = `${memory1.id}-${memory2.id}`
              if (!linkMap.has(linkId)) {
                const weight = sharedTags.length / Math.max(tags1.length, tags2.length)
                links.push({
                  source: memory1.id,
                  target: memory2.id,
                  value: sharedTags.length,
                  weight: weight,
                  color: `rgba(139, 92, 246, ${0.2 + weight * 0.5})`
                })
                linkMap.set(linkId, true)
                
                // Update connection counts
                connectionCounts.set(memory1.id, (connectionCounts.get(memory1.id) || 0) + 1)
                connectionCounts.set(memory2.id, (connectionCounts.get(memory2.id) || 0) + 1)
              }
            }
          }
        })
      })

      // Second pass: create nodes with connection-based sizing
      const nodes: GraphNode[] = filteredMemories.map((memory, index) => {
        const tags = extractTags(memory)
        const title = extractTitle(memory.content, memory)
        const summary = generateSummary(memory.content, memory)
        const primaryTag = tags[0] || 'general'
        const color = getTagColor(primaryTag)
        const connectionCount = connectionCounts.get(memory.id) || 0
        
        return {
          id: memory.id || `memory-${index}`,
          label: title.substring(0, 20) + (title.length > 20 ? '...' : ''),
          title: title || 'Untitled',
          summary: summary || 'No summary available',
          tags: tags || [],
          category: primaryTag,
          connectionCount,
          // Dynamic sizing based on connections and content
          size: Math.max(12, 12 + (connectionCount * 3) + Math.min((memory.content?.length || 0) / 100, 15)),
          color: color.bg || '#8b5cf6',
          val: Math.max(5, connectionCount * 5 + 10),
          content: memory.content || '',
          timestamp: memory.timestamp || new Date().toISOString()
        }
      })

      setGraphData({ nodes, links })
    } catch (error) {
      console.error('Error generating graph data:', error)
      setGraphData({ nodes: [], links: [] })
    }
  }, [memories, tagFilter, extractTitle, generateSummary, extractTags, getTagColor])

  // Configure forces after graph data changes - SIMPLIFIED APPROACH
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      const graph = graphRef.current
      
      // Wait for graph to be ready
      setTimeout(() => {
        // VERY STRONG repulsion to spread nodes apart
        graph.d3Force('charge', d3.forceManyBody().strength(-2000))
        
        // MUCH longer link distances
        graph.d3Force('link', d3.forceLink()
          .id((d: any) => d.id)
          .distance(300)
          .strength(0.1)
        )
        
        // Large collision detection
        graph.d3Force('collide', d3.forceCollide()
          .radius(50)
          .strength(1.0)
        )
        
        // Weak center force
        graph.d3Force('center', d3.forceCenter().strength(0.1))
        
        // Restart simulation
        graph.d3ReheatSimulation()
      }, 100)
    }
  }, [graphData])

  // Text wrapping utility function
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ')
    const lines = []
    let currentLine = words[0]

    for (let i = 1; i < words.length; i++) {
      const word = words[i]
      const width = ctx.measureText(currentLine + ' ' + word).width
      if (width < maxWidth) {
        currentLine += ' ' + word
      } else {
        lines.push(currentLine)
        currentLine = word
      }
    }
    lines.push(currentLine)
    return lines
  }

  // Enhanced node rendering with rounded rectangles and better text handling
  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Validate node position and properties
    if (!node || typeof node.x !== 'number' || typeof node.y !== 'number' || !ctx) {
      return
    }
    
    const label = node.label || 'Untitled'
    const x = node.x || 0
    const y = node.y || 0
    
    // Enhanced font sizing - better visibility at all zoom levels
    const baseFontSize = 14
    const minFontSize = 10
    const maxFontSize = 20
    const fontSize = Math.max(minFontSize, Math.min(maxFontSize, baseFontSize / Math.max(globalScale * 0.7, 0.5)))
    
    ctx.save()
    ctx.font = `${fontSize}px Inter, Arial, sans-serif`
    
    // Calculate text dimensions for proper node sizing
    const maxTextWidth = 120
    const lines = wrapText(ctx, label, maxTextWidth)
    const lineHeight = fontSize * 1.2
    const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width))
    const textHeight = lines.length * lineHeight
    
    // Dynamic node sizing based on content
    const padding = 12
    const nodeWidth = Math.max(80, textWidth + padding * 2)
    const nodeHeight = Math.max(40, textHeight + padding * 2)
    const cornerRadius = 8
    
    // Enhanced color scheme with better visibility
    const nodeColor = node.color || '#8b5cf6'
    const safeColor = nodeColor.match(/^#[0-9A-F]{6}$/i) ? nodeColor : '#8b5cf6'
    
    // Create gradient for depth
    const gradient = ctx.createLinearGradient(x - nodeWidth/2, y - nodeHeight/2, x + nodeWidth/2, y + nodeHeight/2)
    gradient.addColorStop(0, safeColor)
    gradient.addColorStop(1, safeColor + 'DD') // Add transparency for gradient effect
    
    // Draw shadow for depth (only at reasonable zoom levels)
    if (globalScale > 0.3) {
      const shadowOffset = 4
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      ctx.beginPath()
      ctx.roundRect(x - nodeWidth/2 + shadowOffset, y - nodeHeight/2 + shadowOffset, nodeWidth, nodeHeight, cornerRadius)
      ctx.fill()
    }
    
    // Draw main rounded rectangle node
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.roundRect(x - nodeWidth/2, y - nodeHeight/2, nodeWidth, nodeHeight, cornerRadius)
    ctx.fill()
    
    // Enhanced border with proper scaling
    const borderWidth = Math.max(1, 2 / globalScale)
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = borderWidth
    ctx.stroke()
    
    // Hover/Selection effect with glow
    if (hoveredNode === node.id || selectedNode === node.id) {
      const glowColor = hoveredNode === node.id ? '#fbbf24' : '#22d3ee'
      ctx.shadowColor = glowColor
      ctx.shadowBlur = 15
      ctx.strokeStyle = glowColor
      ctx.lineWidth = Math.max(2, 4 / globalScale)
      ctx.stroke()
      ctx.shadowBlur = 0
    }
    
    // Enhanced text rendering with outline for better readability
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    // Text outline for better contrast
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)'
    ctx.lineWidth = Math.max(1, 3 / globalScale)
    
    // Draw each line of wrapped text
    const startY = y - (lines.length - 1) * lineHeight / 2
    lines.forEach((line, index) => {
      const lineY = startY + index * lineHeight
      // Draw text outline
      ctx.strokeText(line, x, lineY)
      // Draw text fill
      ctx.fillStyle = '#ffffff'
      ctx.fillText(line, x, lineY)
    })
    
    // Enhanced tags badge with better visibility
    if (node.tags && node.tags.length > 0 && globalScale > 0.4) {
      const badgeSize = Math.max(16, 20 / globalScale)
      const badgeX = x + nodeWidth/2 - badgeSize/2 - 4
      const badgeY = y - nodeHeight/2 + badgeSize/2 + 4
      
      // Badge background
      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(badgeX, badgeY, badgeSize/2, 0, 2 * Math.PI)
      ctx.fill()
      
      // Badge border
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(1, 2 / globalScale)
      ctx.stroke()
      
      // Badge text
      const badgeFontSize = Math.max(8, Math.min(12, 10 / globalScale))
      ctx.font = `bold ${badgeFontSize}px Inter, Arial`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.tags.length.toString(), badgeX, badgeY)
    }
    
    ctx.restore()
  }, [hoveredNode, selectedNode])

  // Enhanced link rendering with custom canvas object
  const linkCanvasObject = useCallback((link: GraphLink, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!link.source || !link.target || typeof link.source.x !== 'number' || typeof link.source.y !== 'number' || 
        typeof link.target.x !== 'number' || typeof link.target.y !== 'number') {
      return
    }

    const sourceX = link.source.x
    const sourceY = link.source.y
    const targetX = link.target.x
    const targetY = link.target.y
    
    const dx = targetX - sourceX
    const dy = targetY - sourceY
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance < 1) return // Skip if nodes are too close
    
    ctx.save()
    
    // Enhanced link styling based on relationship strength
    const baseWidth = Math.max(1, (link.weight || 1) * 2)
    const lineWidth = Math.max(0.5, baseWidth / Math.max(globalScale, 0.5))
    
    // Dynamic color based on link type or weight
    const linkColor = link.color || '#6366f1'
    const isHighlighted = hoveredNode && (link.source.id === hoveredNode || link.target.id === hoveredNode)
    
    // Helper function to ensure valid hex color
    const ensureHexColor = (color: string) => {
      if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
        return color
      }
      return '#6366f1' // fallback color
    }
    
    const validLinkColor = ensureHexColor(linkColor)
    
    // Enhanced gradient for depth and direction
    const gradient = ctx.createLinearGradient(sourceX, sourceY, targetX, targetY)
    if (isHighlighted) {
      gradient.addColorStop(0, '#fbbf24')
      gradient.addColorStop(1, '#f59e0b')
      ctx.shadowColor = '#fbbf24'
      ctx.shadowBlur = 8
    } else {
      gradient.addColorStop(0, validLinkColor + 'AA')
      gradient.addColorStop(0.5, validLinkColor)
      gradient.addColorStop(1, validLinkColor + 'AA')
    }
    
    ctx.strokeStyle = gradient
    ctx.lineWidth = lineWidth
    ctx.lineCap = 'round'
    
    // Draw curved link for better visual flow
    const curvature = 0.2
    const midX = (sourceX + targetX) / 2
    const midY = (sourceY + targetY) / 2
    const controlX = midX + dy * curvature
    const controlY = midY - dx * curvature
    
    ctx.beginPath()
    ctx.moveTo(sourceX, sourceY)
    ctx.quadraticCurveTo(controlX, controlY, targetX, targetY)
    ctx.stroke()
    
    // Draw arrowhead for direction
    if (globalScale > 0.3) {
      const arrowSize = Math.max(4, 8 / globalScale)
      const angle = Math.atan2(dy, dx)
      
      // Calculate arrow position (slightly before the target node)
      const arrowDistance = Math.max(30, 40 / globalScale) // Distance from target node
      const arrowX = targetX - Math.cos(angle) * arrowDistance
      const arrowY = targetY - Math.sin(angle) * arrowDistance
      
      ctx.fillStyle = isHighlighted ? '#fbbf24' : linkColor
      ctx.beginPath()
      ctx.moveTo(arrowX, arrowY)
      ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle - Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        arrowX - arrowSize * Math.cos(angle + Math.PI / 6),
        arrowY - arrowSize * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()
    }
    
    ctx.shadowBlur = 0
    ctx.restore()
  }, [hoveredNode])

  // Handle node interactions
  const handleNodeClick = useCallback((node: GraphNode) => {
    onNodeClick(node.id)
  }, [onNodeClick])

  const handleNodeHover = useCallback((node: GraphNode | null) => {
    setHoveredNode(node?.id || null)
    document.body.style.cursor = node ? 'pointer' : 'default'
  }, [])

  // Add zoom to fit functionality
  const handleEngineStop = useCallback(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      // Auto-zoom to fit all nodes with padding
      setTimeout(() => {
        graphRef.current.zoomToFit(400, 100)
      }, 500)
    }
  }, [graphData.nodes.length])

  // Handle zoom-to-fit on demand
  const zoomToFit = useCallback(() => {
    if (graphRef.current) {
      graphRef.current.zoomToFit(400, 100)
    }
  }, [])

  // Enhanced physics config
  const getSimulationConfig = () => {
    switch (graphType) {
      case 'galaxy':
        return { warmupTicks: 100, cooldownTime: 2000 }
      case 'clusters':
        return { warmupTicks: 150, cooldownTime: 3000 }
      case 'timeline':
        return { warmupTicks: 80, cooldownTime: 1500 }
      default:
        return { warmupTicks: 100, cooldownTime: 2000 }
    }
  }

  const simConfig = getSimulationConfig()

  return (
    <div id="modern-graph-container" className="w-full h-full relative">
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 z-50 flex flex-col gap-2">
        <button
          onClick={zoomToFit}
          className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 transition-colors"
        >
          🔍 Fit View
        </button>
      </div>
      
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeId="id"
        nodeLabel=""
        nodeVal="val"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode={() => 'replace'}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        onEngineStop={handleEngineStop}
        // Enhanced link configuration with custom rendering
        linkCanvasObject={linkCanvasObject}
        linkCanvasObjectMode={() => 'replace'}
        linkColor={() => 'transparent'} // Use transparent since we're custom rendering
        linkWidth={0} // Use 0 since we're custom rendering
        linkOpacity={0} // Use 0 since we're custom rendering
        // Canvas configuration
        backgroundColor="transparent"
        width={dimensions.width}
        height={dimensions.height}
        // Simulation configuration - SIMPLIFIED
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.4}
        nodeRelSize={8}
        warmupTicks={500}
        cooldownTime={10000}
        // Interaction configuration
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
        enablePointerInteraction={true}
        // Initial zoom
        onEngineStart={() => {
          // Set initial zoom level
          if (graphRef.current) {
            graphRef.current.zoom(0.8, 0)
          }
        }}
      />
      
      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl max-w-sm pointer-events-none z-50">
          {(() => {
            const node = graphData.nodes.find((n: GraphNode) => n.id === hoveredNode)
            if (!node) return null
            
            return (
              <>
                <h4 className="text-white font-semibold text-sm mb-2">{node.title}</h4>
                <p className="text-gray-400 text-xs mb-2 line-clamp-3">{node.summary}</p>
                <div className="flex flex-wrap gap-1">
                  {node.tags.slice(0, 3).map((tag, i) => {
                    const colors = getTagColor(tag)
                    return (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded text-xs font-medium"
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text
                        }}
                      >
                        {tag}
                      </span>
                    )
                  })}
                  {node.tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{node.tags.length - 3}</span>
                  )}
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}