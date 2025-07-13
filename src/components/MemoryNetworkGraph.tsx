import React, { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Memory, MemoryCategory } from '@/types'
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Move, 
  Search,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'

interface NetworkNode {
  id: string
  label: string
  category: MemoryCategory | 'unknown'
  size: number
  connections: number
  timestamp: string
  memory: Memory
}

interface NetworkEdge {
  id: string
  source: string
  target: string
  weight: number
  type: 'direct' | 'tag' | 'content' | 'temporal'
  label?: string
}

interface NetworkData {
  nodes: NetworkNode[]
  edges: NetworkEdge[]
}

interface MemoryNetworkGraphProps {
  memories: Memory[]
  onMemorySelect?: (memory: Memory) => void
  extractTitle?: (content: string, memory?: Memory) => string
  extractTags?: (memory: Memory) => string[]
  className?: string
}

const categoryColors: Record<MemoryCategory | 'unknown', string> = {
  personal: '#3B82F6',
  work: '#10B981',
  code: '#8B5CF6',
  research: '#F59E0B',
  conversations: '#EF4444',
  preferences: '#6B7280',
  unknown: '#9CA3AF'
}

export function MemoryNetworkGraph({
  memories,
  onMemorySelect,
  extractTitle = (content: string) => content.substring(0, 30) + '...',
  extractTags = (memory: Memory) => memory.tags || [],
  className = ''
}: MemoryNetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [networkData, setNetworkData] = useState<NetworkData>({ nodes: [], edges: [] })
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<NetworkNode | null>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 })
  const [zoom, setZoom] = useState(1)
  const [showLabels, setShowLabels] = useState(true)
  const [filterCategory, setFilterCategory] = useState<MemoryCategory | 'all'>('all')
  const [minConnections, setMinConnections] = useState(0)

  // Build network data from memories
  useEffect(() => {
    const nodes: NetworkNode[] = memories.map(memory => ({
      id: memory.id,
      label: extractTitle(memory.content, memory),
      category: memory.category || 'unknown',
      size: Math.max(8, Math.min(20, memory.content.length / 100)), // Size based on content length
      connections: 0, // Will be calculated below
      timestamp: memory.timestamp,
      memory
    }))

    const edges: NetworkEdge[] = []
    const connectionCounts = new Map<string, number>()

    // Build edges based on relationships
    memories.forEach(memory => {
      const memoryTags = extractTags(memory)
      const sourceId = memory.id

      // Direct relationships (related_memories)
      if (memory.metadata?.related_memories && Array.isArray(memory.metadata.related_memories)) {
        memory.metadata.related_memories.forEach(targetId => {
          if (memories.find(m => m.id === targetId)) {
            edges.push({
              id: `${sourceId}-${targetId}-direct`,
              source: sourceId,
              target: targetId,
              weight: 3,
              type: 'direct',
              label: 'related'
            })
            connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 1)
            connectionCounts.set(targetId, (connectionCounts.get(targetId) || 0) + 1)
          }
        })
      }

      // Tag-based connections
      if (memoryTags.length > 0) {
        memories.forEach(otherMemory => {
          if (otherMemory.id === memory.id) return
          
          const otherTags = extractTags(otherMemory)
          const sharedTags = memoryTags.filter(tag => otherTags.includes(tag))
          
          if (sharedTags.length > 0) {
            const weight = sharedTags.length
            const existingEdge = edges.find(e => 
              (e.source === sourceId && e.target === otherMemory.id) ||
              (e.source === otherMemory.id && e.target === sourceId)
            )
            
            if (!existingEdge && weight >= 1) {
              edges.push({
                id: `${sourceId}-${otherMemory.id}-tag`,
                source: sourceId,
                target: otherMemory.id,
                weight,
                type: 'tag',
                label: sharedTags.slice(0, 2).join(', ')
              })
              connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 1)
              connectionCounts.set(otherMemory.id, (connectionCounts.get(otherMemory.id) || 0) + 1)
            }
          }
        })
      }

      // Content similarity (basic keyword matching)
      const sourceWords = memory.content.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 3 && !['this', 'that', 'with', 'from', 'have'].includes(word))
        .slice(0, 20)

      memories.forEach(otherMemory => {
        if (otherMemory.id === memory.id) return
        
        const targetWords = otherMemory.content.toLowerCase()
          .split(/\W+/)
          .filter(word => word.length > 3)

        const sharedWords = sourceWords.filter(word => targetWords.includes(word))
        const similarity = sharedWords.length / Math.max(sourceWords.length, 1)
        
        if (similarity > 0.15 && sharedWords.length > 2) {
          const existingEdge = edges.find(e => 
            (e.source === sourceId && e.target === otherMemory.id) ||
            (e.source === otherMemory.id && e.target === sourceId)
          )
          
          if (!existingEdge) {
            edges.push({
              id: `${sourceId}-${otherMemory.id}-content`,
              source: sourceId,
              target: otherMemory.id,
              weight: Math.round(similarity * 10),
              type: 'content',
              label: `${Math.round(similarity * 100)}% similar`
            })
            connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 0.5)
            connectionCounts.set(otherMemory.id, (connectionCounts.get(otherMemory.id) || 0) + 0.5)
          }
        }
      })

      // Temporal connections (memories created close in time)
      const memoryTime = new Date(memory.timestamp).getTime()
      memories.forEach(otherMemory => {
        if (otherMemory.id === memory.id) return
        
        const otherTime = new Date(otherMemory.timestamp).getTime()
        const timeDiff = Math.abs(memoryTime - otherTime)
        const hoursDiff = timeDiff / (1000 * 60 * 60)
        
        if (hoursDiff < 2 && hoursDiff > 0) { // Within 2 hours
          const existingEdge = edges.find(e => 
            (e.source === sourceId && e.target === otherMemory.id) ||
            (e.source === otherMemory.id && e.target === sourceId)
          )
          
          if (!existingEdge) {
            edges.push({
              id: `${sourceId}-${otherMemory.id}-temporal`,
              source: sourceId,
              target: otherMemory.id,
              weight: 1,
              type: 'temporal',
              label: 'created nearby'
            })
          }
        }
      })
    })

    // Update connection counts
    nodes.forEach(node => {
      node.connections = Math.round(connectionCounts.get(node.id) || 0)
    })

    setNetworkData({ nodes, edges })
  }, [memories, extractTitle, extractTags])

  // Simple force-directed layout calculation
  const calculateLayout = (nodes: NetworkNode[], edges: NetworkEdge[]) => {
    const width = 800
    const height = 600
    const centerX = width / 2
    const centerY = height / 2

    // Initialize positions randomly in a circle
    const positions = new Map<string, { x: number; y: number }>()
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI
      const radius = Math.min(width, height) * 0.3
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 100,
        y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 100
      })
    })

    // Simple force simulation (very basic)
    for (let iteration = 0; iteration < 50; iteration++) {
      const forces = new Map<string, { x: number; y: number }>()
      
      // Initialize forces
      nodes.forEach(node => {
        forces.set(node.id, { x: 0, y: 0 })
      })

      // Repulsion between all nodes
      nodes.forEach(node1 => {
        nodes.forEach(node2 => {
          if (node1.id === node2.id) return
          
          const pos1 = positions.get(node1.id)!
          const pos2 = positions.get(node2.id)!
          const dx = pos1.x - pos2.x
          const dy = pos1.y - pos2.y
          const distance = Math.sqrt(dx * dx + dy * dy) || 1
          
          const repulsion = 1000 / (distance * distance)
          const force1 = forces.get(node1.id)!
          force1.x += (dx / distance) * repulsion
          force1.y += (dy / distance) * repulsion
        })
      })

      // Attraction along edges
      edges.forEach(edge => {
        const pos1 = positions.get(edge.source)
        const pos2 = positions.get(edge.target)
        if (!pos1 || !pos2) return

        const dx = pos2.x - pos1.x
        const dy = pos2.y - pos1.y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1
        
        const attraction = distance * 0.01 * edge.weight
        const force1 = forces.get(edge.source)!
        const force2 = forces.get(edge.target)!
        
        force1.x += (dx / distance) * attraction
        force1.y += (dy / distance) * attraction
        force2.x -= (dx / distance) * attraction
        force2.y -= (dy / distance) * attraction
      })

      // Apply forces
      nodes.forEach(node => {
        const pos = positions.get(node.id)!
        const force = forces.get(node.id)!
        
        pos.x += force.x * 0.1
        pos.y += force.y * 0.1
        
        // Keep within bounds
        pos.x = Math.max(50, Math.min(width - 50, pos.x))
        pos.y = Math.max(50, Math.min(height - 50, pos.y))
      })
    }

    return positions
  }

  const layout = calculateLayout(networkData.nodes, networkData.edges)

  // Filter data based on current filters
  const filteredNodes = networkData.nodes.filter(node => {
    if (filterCategory !== 'all' && node.category !== filterCategory) return false
    if (node.connections < minConnections) return false
    return true
  })

  const filteredNodeIds = new Set(filteredNodes.map(n => n.id))
  const filteredEdges = networkData.edges.filter(edge => 
    filteredNodeIds.has(edge.source) && filteredNodeIds.has(edge.target)
  )

  const handleNodeClick = (node: NetworkNode) => {
    setSelectedNode(node)
    onMemorySelect?.(node.memory)
  }

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 3))
  }

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.3))
  }

  const handleReset = () => {
    setViewBox({ x: 0, y: 0, width: 800, height: 600 })
    setZoom(1)
    setSelectedNode(null)
  }

  const getEdgeColor = (type: NetworkEdge['type']) => {
    switch (type) {
      case 'direct': return '#8B5CF6'
      case 'tag': return '#10B981'
      case 'content': return '#F59E0B'
      case 'temporal': return '#6B7280'
      default: return '#9CA3AF'
    }
  }

  const getEdgeStrokeWidth = (weight: number) => {
    return Math.max(1, Math.min(4, weight))
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowLabels(!showLabels)}
          >
            {showLabels ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">Filter:</span>
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="bg-gray-700 border-gray-600 text-white rounded px-2 py-1"
          >
            <option value="all">All Categories</option>
            <option value="personal">Personal</option>
            <option value="work">Work</option>
            <option value="code">Code</option>
            <option value="research">Research</option>
            <option value="conversations">Conversations</option>
            <option value="preferences">Preferences</option>
          </select>
          
          <span className="text-gray-400">Min connections:</span>
          <input
            type="range"
            min="0"
            max="10"
            value={minConnections}
            onChange={(e) => setMinConnections(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-white">{minConnections}</span>
        </div>
      </div>

      {/* Network Visualization */}
      <div className="relative">
        <Card className="bg-gray-800 border-gray-600">
          <CardContent className="p-4">
            <div ref={containerRef} className="relative overflow-hidden rounded-lg bg-gray-900">
              <svg
                ref={svgRef}
                width="100%"
                height="600"
                viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width / zoom} ${viewBox.height / zoom}`}
                className="w-full h-[600px]"
              >
                {/* Edges */}
                <g>
                  {filteredEdges.map(edge => {
                    const sourcePos = layout.get(edge.source)
                    const targetPos = layout.get(edge.target)
                    if (!sourcePos || !targetPos) return null

                    return (
                      <line
                        key={edge.id}
                        x1={sourcePos.x}
                        y1={sourcePos.y}
                        x2={targetPos.x}
                        y2={targetPos.y}
                        stroke={getEdgeColor(edge.type)}
                        strokeWidth={getEdgeStrokeWidth(edge.weight)}
                        strokeOpacity={0.6}
                        strokeDasharray={edge.type === 'temporal' ? '5,5' : ''}
                      />
                    )
                  })}
                </g>

                {/* Nodes */}
                <g>
                  {filteredNodes.map(node => {
                    const pos = layout.get(node.id)
                    if (!pos) return null

                    const isSelected = selectedNode?.id === node.id
                    const isHovered = hoveredNode?.id === node.id

                    return (
                      <g key={node.id}>
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={node.size + (isSelected ? 4 : isHovered ? 2 : 0)}
                          fill={categoryColors[node.category]}
                          stroke={isSelected ? '#FFFFFF' : categoryColors[node.category]}
                          strokeWidth={isSelected ? 3 : 1}
                          opacity={isSelected || isHovered ? 1 : 0.8}
                          className="cursor-pointer transition-all"
                          onClick={() => handleNodeClick(node)}
                          onMouseEnter={() => setHoveredNode(node)}
                          onMouseLeave={() => setHoveredNode(null)}
                        />
                        
                        {showLabels && (isSelected || isHovered || node.connections > 3) && (
                          <text
                            x={pos.x}
                            y={pos.y + node.size + 15}
                            textAnchor="middle"
                            fill="white"
                            fontSize="12"
                            className="pointer-events-none"
                          >
                            {node.label.length > 20 ? node.label.substring(0, 20) + '...' : node.label}
                          </text>
                        )}
                      </g>
                    )
                  })}
                </g>
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-white">{filteredNodes.length}</div>
              <div className="text-sm text-gray-400">Memories</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-white">{filteredEdges.length}</div>
              <div className="text-sm text-gray-400">Connections</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {filteredNodes.length > 0 ? Math.round(filteredEdges.length / filteredNodes.length * 10) / 10 : 0}
              </div>
              <div className="text-sm text-gray-400">Avg Connections</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {new Set(filteredNodes.map(n => n.category)).size}
              </div>
              <div className="text-sm text-gray-400">Categories</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <Card className="bg-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: categoryColors[selectedNode.category] }}
              />
              {selectedNode.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Category:</span>
                <span className="ml-2 text-white capitalize">{selectedNode.category}</span>
              </div>
              <div>
                <span className="text-gray-400">Connections:</span>
                <span className="ml-2 text-white">{selectedNode.connections}</span>
              </div>
              <div>
                <span className="text-gray-400">Size:</span>
                <span className="ml-2 text-white">{selectedNode.memory.content.length} chars</span>
              </div>
              <div>
                <span className="text-gray-400">Created:</span>
                <span className="ml-2 text-white">{new Date(selectedNode.timestamp).toLocaleDateString()}</span>
              </div>
            </div>
            
            {extractTags(selectedNode.memory).length > 0 && (
              <div>
                <span className="text-gray-400 text-sm">Tags:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {extractTags(selectedNode.memory).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Legend */}
      <Card className="bg-gray-800 border-gray-600">
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-white mb-2">Node Colors:</div>
              {Object.entries(categoryColors).map(([category, color]) => (
                <div key={category} className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-gray-300 capitalize">{category}</span>
                </div>
              ))}
            </div>
            
            <div>
              <div className="font-medium text-white mb-2">Edge Types:</div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-px bg-purple-500" />
                  <span className="text-gray-300">Direct relation</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-px bg-green-500" />
                  <span className="text-gray-300">Shared tags</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-px bg-yellow-500" />
                  <span className="text-gray-300">Content similarity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-px bg-gray-500" style={{ strokeDasharray: '2,2' }} />
                  <span className="text-gray-300">Time proximity</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}