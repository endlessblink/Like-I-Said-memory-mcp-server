import React, { useRef, useEffect, useState } from 'react'
import * as d3 from 'd3'

interface GraphNode {
  id: string
  label: string
  title: string
  summary: string
  tags: string[]
  size: number
  color: string
  connectionCount: number
  content: string
  timestamp: string
  category: string
  x?: number
  y?: number
  fx?: number | null
  fy?: number | null
}

interface GraphLink {
  source: string | GraphNode
  target: string | GraphNode
  value: number
  color: string
  weight: number
}

interface SimpleD3GraphProps {
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

export function SimpleD3Graph({
  memories,
  selectedNode,
  onNodeClick,
  graphType,
  tagFilter,
  extractTitle,
  generateSummary,
  extractTags,
  getTagColor
}: SimpleD3GraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 })
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      const container = svgRef.current?.parentElement
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

  useEffect(() => {
    if (!svgRef.current || memories.length === 0) return

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
    const { width, height } = dimensions

    // Filter memories
    const filteredMemories = memories.filter(memory => {
      if (tagFilter === 'all') return true
      const tags = extractTags(memory)
      return tags.includes(tagFilter)
    })

    if (filteredMemories.length === 0) return

    // Create graph data
    const nodes: GraphNode[] = filteredMemories.map((memory, index) => {
      const tags = extractTags(memory)
      const title = extractTitle(memory.content, memory)
      const summary = generateSummary(memory.content, memory)
      const primaryTag = tags[0] || 'general'
      const color = getTagColor(primaryTag)
      
      return {
        id: memory.id || `memory-${index}`,
        label: title.substring(0, 20) + (title.length > 20 ? '...' : ''),
        title: title || 'Untitled',
        summary: summary || 'No summary available',
        tags: tags || [],
        category: primaryTag,
        connectionCount: 0,
        size: Math.max(8, Math.min((memory.content?.length || 0) / 50, 20)),
        color: color.bg || '#8b5cf6',
        content: memory.content || '',
        timestamp: memory.timestamp || new Date().toISOString()
      }
    })

    // Create links based on shared tags
    const links: GraphLink[] = []
    const connectionCounts = new Map()

    // Initialize connection counts
    nodes.forEach(node => {
      connectionCounts.set(node.id, 0)
    })

    // Create links
    nodes.forEach((node1, i) => {
      const tags1 = node1.tags
      nodes.forEach((node2, j) => {
        if (i < j) {
          const tags2 = node2.tags
          const sharedTags = tags1.filter(tag => tags2.includes(tag))
          
          if (sharedTags.length > 0) {
            const weight = sharedTags.length / Math.max(tags1.length, tags2.length)
            links.push({
              source: node1.id,
              target: node2.id,
              value: sharedTags.length,
              weight: weight,
              color: `rgba(139, 92, 246, ${0.2 + weight * 0.5})`
            })
            
            connectionCounts.set(node1.id, (connectionCounts.get(node1.id) || 0) + 1)
            connectionCounts.set(node2.id, (connectionCounts.get(node2.id) || 0) + 1)
          }
        }
      })
    })

    // Update connection counts and sizes
    nodes.forEach(node => {
      node.connectionCount = connectionCounts.get(node.id) || 0
      node.size = Math.max(12, 12 + (node.connectionCount * 3))
    })

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        container.attr('transform', event.transform)
      })

    svg.call(zoom)

    // Create container for all elements
    const container = svg.append('g')

    // Create simulation
    const simulation = d3.forceSimulation(nodes as any)
      .force('link', d3.forceLink(links).id((d: any) => d.id).distance(100).strength(0.1))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d: any) => d.size + 5))

    // Create links
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => Math.max(1, d.weight * 3))
      .attr('stroke-opacity', 0.6)

    // Create nodes
    const node = container.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag<SVGCircleElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          d.fx = null
          d.fy = null
        }))

    // Add labels
    const labels = container.append('g')
      .selectAll('text')
      .data(nodes)
      .join('text')
      .text(d => d.label)
      .attr('font-size', 10)
      .attr('font-family', 'Arial, sans-serif')
      .attr('fill', '#333')
      .attr('text-anchor', 'middle')
      .attr('dy', 4)
      .style('pointer-events', 'none')

    // Add interaction handlers
    node
      .on('click', (event, d) => {
        onNodeClick(d.id)
      })
      .on('mouseover', (event, d) => {
        setHoveredNode(d.id)
        // Highlight connected nodes and links
        node.style('opacity', n => n.id === d.id || links.some(l => 
          (l.source as any).id === d.id && (l.target as any).id === n.id ||
          (l.target as any).id === d.id && (l.source as any).id === n.id
        ) ? 1 : 0.3)
        
        link.style('opacity', l => 
          (l.source as any).id === d.id || (l.target as any).id === d.id ? 0.8 : 0.1
        )
      })
      .on('mouseout', () => {
        setHoveredNode(null)
        node.style('opacity', 1)
        link.style('opacity', 0.6)
      })

    // Highlight selected node
    useEffect(() => {
      node.attr('stroke', d => d.id === selectedNode ? '#22d3ee' : '#fff')
        .attr('stroke-width', d => d.id === selectedNode ? 4 : 2)
    }, [selectedNode])

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y)

      node
        .attr('cx', d => d.x!)
        .attr('cy', d => d.y!)

      labels
        .attr('x', d => d.x!)
        .attr('y', d => d.y!)
    })

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [memories, dimensions, tagFilter, selectedNode, extractTitle, generateSummary, extractTags, getTagColor, onNodeClick])

  return (
    <div className="w-full h-full relative">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <button
          onClick={() => {
            const svg = d3.select(svgRef.current)
            svg.transition().duration(750).call(
              d3.zoom<SVGSVGElement, unknown>().transform,
              d3.zoomIdentity
            )
          }}
          className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm border border-gray-600 transition-colors"
        >
          🔍 Reset View
        </button>
      </div>

      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        className="border border-gray-200 rounded-lg"
      />

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute top-4 left-4 bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-xl max-w-sm pointer-events-none z-10">
          {(() => {
            const memory = memories.find(m => m.id === hoveredNode)
            if (!memory) return null
            
            const title = extractTitle(memory.content, memory)
            const summary = generateSummary(memory.content, memory)
            const tags = extractTags(memory)
            
            return (
              <>
                <h4 className="text-white font-semibold text-sm mb-2">{title}</h4>
                <p className="text-gray-400 text-xs mb-2 line-clamp-3">{summary}</p>
                <div className="flex flex-wrap gap-1">
                  {tags.slice(0, 3).map((tag, i) => {
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
                  {tags.length > 3 && (
                    <span className="text-xs text-gray-500">+{tags.length - 3}</span>
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