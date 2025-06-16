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
        console.log('Configuring graph forces...')
        
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
        
        console.log('Forces configured!')
      }, 100)
    }
  }, [graphData])

  // Custom node rendering with modern card design
  const nodeCanvasObject = useCallback((node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    // Validate node position and properties
    if (!node || typeof node.x !== 'number' || typeof node.y !== 'number' || !ctx) {
      return
    }
    
    const label = node.label || 'Untitled'
    const fontSize = Math.max(8, 12 / globalScale)
    const nodeSize = Math.max(5, (node.val || 20) * globalScale)
    
    // Draw modern card-style node
    ctx.save()
    
    // Simplified rendering without shadow effects
    const x = node.x || 0
    const y = node.y || 0
    const nodeColor = node.color || '#8b5cf6'
    
    // Validate color before using
    const safeColor = nodeColor.match(/^#[0-9A-F]{6}$/i) ? nodeColor : '#8b5cf6'
    
    // Main node circle
    ctx.beginPath()
    ctx.arc(x, y, nodeSize, 0, 2 * Math.PI, false)
    ctx.fillStyle = safeColor
    ctx.fill()
    
    // Border
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = Math.max(1, 3 * globalScale)
    ctx.stroke()
    
    // Hover effect
    if (hoveredNode === node.id || selectedNode === node.id) {
      ctx.beginPath()
      ctx.arc(x, y, nodeSize, 0, 2 * Math.PI, false)
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = Math.max(2, 5 * globalScale)
      ctx.stroke()
    }
    
    ctx.restore()
    
    // Simplified text rendering
    const safeFontSize = Math.max(8, Math.min(fontSize, 20))
    ctx.font = `${safeFontSize}px Arial, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(label, x, y)
    
    // Simplified tags count badge (optional - can be removed to avoid issues)
    if (node.tags && node.tags.length > 0 && globalScale > 0.5) {
      const badgeX = x + nodeSize * 0.7
      const badgeY = y - nodeSize * 0.7
      const badgeRadius = Math.max(4, 8 * globalScale)
      
      ctx.beginPath()
      ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI)
      ctx.fillStyle = '#8b5cf6'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(1, 2 * globalScale)
      ctx.stroke()
      
      const badgeFontSize = Math.max(6, Math.min(10, 10 / globalScale))
      ctx.font = `${badgeFontSize}px Arial`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.tags.length.toString(), badgeX, badgeY)
    }
  }, [hoveredNode, selectedNode])

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
        // Link configuration
        linkColor="color"
        linkWidth={(link: GraphLink) => Math.max(1, link.weight * 4)}
        linkOpacity={0.7}
        linkCurvature={0.1}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleWidth={2}
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