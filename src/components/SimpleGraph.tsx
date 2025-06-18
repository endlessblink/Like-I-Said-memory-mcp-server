import React, { useRef, useCallback, useEffect, useState } from 'react'
import ForceGraph2D from 'react-force-graph-2d'

interface GraphNode {
  id: string
  label: string
  title: string
  tags: string[]
  color: string
  val: number
  content: string
}

interface GraphLink {
  source: string
  target: string
  value: number
}

interface SimpleGraphProps {
  memories: any[]
  selectedNode: string | null
  onNodeClick: (nodeId: string | null) => void
  onEditClick: (memory: any) => void // Add edit callback
  extractTitle: (content: string, memory?: any) => string
  extractTags: (memory: any) => string[]
  getTagColor: (tag: string) => { bg: string; text: string; border: string }
}

export function SimpleGraph({
  memories,
  selectedNode,
  onNodeClick,
  onEditClick,
  extractTitle,
  extractTags,
  getTagColor
}: SimpleGraphProps) {
  const graphRef = useRef<any>()
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null)
  const [tooltip, setTooltip] = useState<{content: string, x: number, y: number} | null>(null)

  // Text wrapping helper function
  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
    const words = text.split(' ')
    const lines = []
    let currentLine = words[0] || ''

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

  // Generate simple graph data
  useEffect(() => {
    const nodes = memories.map((memory, index) => {
      const tags = extractTags(memory)
      const title = extractTitle(memory.content, memory)
      const primaryTag = tags[0] || 'general'
      const color = getTagColor(primaryTag)
      
      return {
        id: memory.id || `memory-${index}`,
        label: title.substring(0, 15) + (title.length > 15 ? '...' : ''),
        title: title || 'Untitled',
        tags: tags || [],
        color: color.bg || '#8b5cf6',
        val: 25, // Slightly larger nodes
        content: memory.content || '',
        memory: memory // Store full memory object for edit
      }
    })

    // Create some links based on shared tags
    const links: any[] = []
    memories.forEach((memory1, i) => {
      const tags1 = extractTags(memory1)
      memories.forEach((memory2, j) => {
        if (i < j) {
          const tags2 = extractTags(memory2)
          const sharedTags = tags1.filter(tag => tags2.includes(tag))
          
          if (sharedTags.length > 0) {
            links.push({
              source: memory1.id,
              target: memory2.id,
              value: sharedTags.length
            })
          }
        }
      })
    })

    setGraphData({ nodes, links })
  }, [memories, extractTitle, extractTags, getTagColor])

  // Simple force configuration to spread nodes
  useEffect(() => {
    if (graphRef.current && graphData.nodes.length > 0) {
      setTimeout(() => {
        const graph = graphRef.current
        
        // Very strong repulsion
        graph.d3Force('charge').strength(-1000)
        
        // Longer link distances  
        graph.d3Force('link').distance(200)
        
        // Weak center force
        graph.d3Force('center').strength(0.05)
        
        // Restart simulation
        graph.d3ReheatSimulation()
      }, 100)
    }
  }, [graphData])

  // Custom node canvas rendering with readable text and adaptive shapes
  const nodeCanvasObject = useCallback((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
    if (!node || typeof node.x !== 'number' || typeof node.y !== 'number') return

    // FIXED LARGE FONT SIZE that doesn't scale down too much
    const baseFontSize = 16
    const minFontSize = 12
    const fontSize = Math.max(minFontSize, baseFontSize / Math.max(globalScale * 0.5, 0.5))
    
    const isSelected = selectedNode === node.id

    // Measure text to determine node size
    ctx.font = `bold ${fontSize}px Arial, sans-serif`
    
    // Prepare text lines
    const maxCharsPerLine = Math.max(8, Math.floor(120 / fontSize))
    const lines = wrapText(ctx, node.title, maxCharsPerLine * fontSize)
    const displayLines = lines.slice(0, 2) // Max 2 lines
    
    if (lines.length > 2) {
      displayLines[1] = displayLines[1].substring(0, maxCharsPerLine - 3) + '...'
    }

    // Calculate text dimensions
    const textWidths = displayLines.map(line => ctx.measureText(line).width)
    const maxTextWidth = Math.max(...textWidths, 80)
    const lineHeight = fontSize * 1.2
    const textHeight = displayLines.length * lineHeight

    // Node dimensions with padding
    const padding = 12
    const nodeWidth = maxTextWidth + (padding * 2)
    const nodeHeight = textHeight + (padding * 2)

    // Draw rounded rectangle background
    const cornerRadius = 8
    ctx.beginPath()
    ctx.roundRect(
      node.x - nodeWidth / 2,
      node.y - nodeHeight / 2,
      nodeWidth,
      nodeHeight,
      cornerRadius
    )
    ctx.fillStyle = isSelected ? '#fbbf24' : (node.color || '#8b5cf6')
    ctx.fill()
    
    // Draw border
    ctx.strokeStyle = isSelected ? '#f59e0b' : '#ffffff'
    ctx.lineWidth = isSelected ? 3 : 2
    ctx.stroke()

    // Set up text rendering with high contrast
    ctx.fillStyle = '#ffffff'
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = Math.max(2, fontSize / 8)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    // Draw text lines centered in the rectangle
    const startY = node.y - (textHeight / 2) + (lineHeight / 2)
    displayLines.forEach((line, idx) => {
      const yPos = startY + (idx * lineHeight)
      // Draw black stroke outline for readability
      ctx.strokeText(line, node.x, yPos)
      // Draw white fill text on top
      ctx.fillText(line, node.x, yPos)
    })

    // Draw connection count badge positioned on the rectangle
    if (node.tags && node.tags.length > 0) {
      const badgeX = node.x + nodeWidth / 2 - 8
      const badgeY = node.y - nodeHeight / 2 + 8
      const badgeRadius = 8

      ctx.beginPath()
      ctx.arc(badgeX, badgeY, badgeRadius, 0, 2 * Math.PI)
      ctx.fillStyle = '#ef4444'
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.font = `${Math.max(8, 10)}px Sans-Serif`
      ctx.fillStyle = '#ffffff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(node.tags.length.toString(), badgeX, badgeY)
    }
  }, [selectedNode, wrapText])

  // Handle click vs drag distinction
  const handleNodeDragStart = useCallback((node: any, event: any) => {
    setDragStartPos({ x: event.clientX, y: event.clientY })
  }, [])

  const handleNodeDragEnd = useCallback((node: any, event: any) => {
    if (dragStartPos) {
      const distance = Math.hypot(
        event.clientX - dragStartPos.x,
        event.clientY - dragStartPos.y
      )
      
      // If mouse moved less than 5 pixels, consider it a click
      if (distance < 5) {
        onEditClick(node.memory) // Open edit dialog
      }
    }
    setDragStartPos(null)
  }, [dragStartPos, onEditClick])

  const handleNodeClick = useCallback((node: any) => {
    if (!dragStartPos) {
      onNodeClick(node.id) // Select node
    }
  }, [onNodeClick, dragStartPos])

  // Handle tooltips
  const handleNodeHover = useCallback((node: any, prevNode: any) => {
    if (node) {
      setTooltip({
        content: node.content,
        x: 0, // Will be positioned via CSS
        y: 0
      })
    } else {
      setTooltip(null)
    }
  }, [])

  return (
    <div className="w-full h-full relative">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeId="id"
        nodeLabel=""
        nodeVal="val"
        nodeCanvasObject={nodeCanvasObject}
        nodeCanvasObjectMode="replace"
        onNodeClick={handleNodeClick}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragEnd={handleNodeDragEnd}
        onNodeHover={handleNodeHover}
        linkColor={() => 'rgba(139, 92, 246, 0.5)'}
        linkWidth={() => 2}
        backgroundColor="transparent"
        width={800}
        height={600}
        nodeRelSize={6}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
        warmupTicks={100}
        cooldownTime={3000}
      />
      
      {/* Tooltip */}
      {tooltip && (
        <div className="absolute top-4 left-4 bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl max-w-xs pointer-events-none z-50">
          <p className="text-white text-sm leading-relaxed">
            {tooltip.content.substring(0, 200)}
            {tooltip.content.length > 200 ? '...' : ''}
          </p>
        </div>
      )}
    </div>
  )
}