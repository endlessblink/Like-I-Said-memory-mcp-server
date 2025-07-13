import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MemoryTreeView } from '@/components/MemoryTreeView'
import { MemoryNetworkGraph } from '@/components/MemoryNetworkGraph'
import { MemoryClusterView } from '@/components/MemoryClusterView'
import { Memory, MemoryCategory } from '@/types'
import { 
  TreePine, 
  Network, 
  Layers, 
  BarChart3, 
  Eye, 
  Filter,
  Download,
  Share,
  Settings,
  RefreshCw,
  Info
} from 'lucide-react'

interface MemoryVisualizationDashboardProps {
  memories: Memory[]
  onMemorySelect?: (memory: Memory) => void
  extractTitle?: (content: string, memory?: Memory) => string
  extractTags?: (memory: Memory) => string[]
  extractSummary?: (content: string, memory?: Memory) => string
  className?: string
}

interface VisualizationMetrics {
  totalMemories: number
  totalConnections: number
  categories: number
  avgConnectionsPerMemory: number
  mostConnectedMemory: Memory | null
  largestCluster: number
  memoryDistribution: Record<MemoryCategory, number>
}

export function MemoryVisualizationDashboard({
  memories,
  onMemorySelect,
  extractTitle = (content: string) => content.substring(0, 50) + '...',
  extractTags = (memory: Memory) => memory.tags || [],
  extractSummary = (content: string) => content.substring(0, 100) + '...',
  className = ''
}: MemoryVisualizationDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null)
  const [showMetrics, setShowMetrics] = useState(true)
  const [filterCategory, setFilterCategory] = useState<MemoryCategory | 'all'>('all')

  // Calculate visualization metrics
  const metrics: VisualizationMetrics = React.useMemo(() => {
    const connections = new Map<string, number>()
    let totalConnections = 0

    memories.forEach(memory => {
      const memoryTags = extractTags(memory)
      let memoryConnections = 0

      // Count direct relationships
      if (memory.metadata?.related_memories && Array.isArray(memory.metadata.related_memories)) {
        memoryConnections += memory.metadata.related_memories.length
        totalConnections += memory.metadata.related_memories.length
      }

      // Count tag-based connections
      if (memoryTags.length > 0) {
        memories.forEach(otherMemory => {
          if (otherMemory.id === memory.id) return
          const otherTags = extractTags(otherMemory)
          const sharedTags = memoryTags.filter(tag => otherTags.includes(tag))
          if (sharedTags.length > 0) {
            memoryConnections += 0.5 // Half weight for tag connections
          }
        })
      }

      connections.set(memory.id, memoryConnections)
    })

    const mostConnected = Array.from(connections.entries())
      .sort(([,a], [,b]) => b - a)[0]

    const memoryDistribution = memories.reduce((acc, memory) => {
      const category = memory.category || 'personal'
      acc[category] = (acc[category] || 0) + 1
      return acc
    }, {} as Record<MemoryCategory, number>)

    return {
      totalMemories: memories.length,
      totalConnections: Math.round(totalConnections),
      categories: new Set(memories.map(m => m.category || 'personal')).size,
      avgConnectionsPerMemory: memories.length > 0 ? Math.round((Array.from(connections.values()).reduce((a, b) => a + b, 0) / memories.length) * 10) / 10 : 0,
      mostConnectedMemory: mostConnected ? memories.find(m => m.id === mostConnected[0]) || null : null,
      largestCluster: Math.max(...Object.values(memoryDistribution), 0),
      memoryDistribution
    }
  }, [memories, extractTags])

  // Filter memories based on category
  const filteredMemories = React.useMemo(() => {
    if (filterCategory === 'all') return memories
    return memories.filter(memory => memory.category === filterCategory)
  }, [memories, filterCategory])

  const handleMemorySelect = (memory: Memory) => {
    setSelectedMemory(memory)
    onMemorySelect?.(memory)
  }

  const exportVisualization = () => {
    const data = {
      timestamp: new Date().toISOString(),
      metrics,
      memories: filteredMemories.length,
      filters: { category: filterCategory }
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `memory-visualization-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getCategoryColor = (category: MemoryCategory): string => {
    const colors: Record<MemoryCategory, string> = {
      personal: '#3B82F6',
      work: '#10B981',
      code: '#8B5CF6',
      research: '#F59E0B',
      conversations: '#EF4444',
      preferences: '#6B7280'
    }
    return colors[category] || '#9CA3AF'
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Memory Visualization</h2>
          <p className="text-gray-400">
            Explore connections and patterns in your memory collection
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowMetrics(!showMetrics)}>
            <BarChart3 className="h-4 w-4 mr-2" />
            {showMetrics ? 'Hide' : 'Show'} Metrics
          </Button>
          
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="bg-gray-700 border-gray-600 text-white rounded px-3 py-1"
          >
            <option value="all">All Categories</option>
            <option value="personal">Personal</option>
            <option value="work">Work</option>
            <option value="code">Code</option>
            <option value="research">Research</option>
            <option value="conversations">Conversations</option>
            <option value="preferences">Preferences</option>
          </select>
          
          <Button variant="outline" size="sm" onClick={exportVisualization}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      {showMetrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{metrics.totalMemories}</div>
              <div className="text-sm text-gray-400">Total Memories</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{metrics.totalConnections}</div>
              <div className="text-sm text-gray-400">Connections</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{metrics.categories}</div>
              <div className="text-sm text-gray-400">Categories</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{metrics.avgConnectionsPerMemory}</div>
              <div className="text-sm text-gray-400">Avg Connections</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">{metrics.largestCluster}</div>
              <div className="text-sm text-gray-400">Largest Group</div>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {filteredMemories.length !== memories.length ? filteredMemories.length : 'All'}
              </div>
              <div className="text-sm text-gray-400">Filtered</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Distribution */}
      {showMetrics && Object.keys(metrics.memoryDistribution).length > 1 && (
        <Card className="bg-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className="text-sm">Memory Distribution by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(metrics.memoryDistribution)
                .sort(([,a], [,b]) => b - a)
                .map(([category, count]) => {
                  const percentage = Math.round((count / metrics.totalMemories) * 100)
                  return (
                    <div key={category} className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: getCategoryColor(category as MemoryCategory) }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white capitalize">{category}</span>
                          <span className="text-sm text-gray-400">{count} ({percentage}%)</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              width: `${percentage}%`,
                              backgroundColor: getCategoryColor(category as MemoryCategory)
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Visualization Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tree" className="flex items-center gap-2">
            <TreePine className="h-4 w-4" />
            Tree View
          </TabsTrigger>
          <TabsTrigger value="network" className="flex items-center gap-2">
            <Network className="h-4 w-4" />
            Network
          </TabsTrigger>
          <TabsTrigger value="clusters" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Clusters
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle>Memory Collection Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-white mb-3">Key Insights</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Most connected memory:</span>
                      <span className="text-white">
                        {metrics.mostConnectedMemory 
                          ? extractTitle(metrics.mostConnectedMemory.content, metrics.mostConnectedMemory)
                          : 'None'
                        }
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Network density:</span>
                      <span className="text-white">
                        {metrics.totalMemories > 1 
                          ? Math.round((metrics.totalConnections / (metrics.totalMemories * (metrics.totalMemories - 1) / 2)) * 100)
                          : 0
                        }%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Most common category:</span>
                      <span className="text-white capitalize">
                        {Object.entries(metrics.memoryDistribution)
                          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'None'
                        }
                      </span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-white mb-3">Recommendations</h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    {metrics.avgConnectionsPerMemory < 1 && (
                      <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded">
                        💡 Consider adding more tags to increase memory connections
                      </div>
                    )}
                    {metrics.categories < 3 && (
                      <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded">
                        📂 Try categorizing memories for better organization
                      </div>
                    )}
                    {metrics.totalMemories > 50 && metrics.totalConnections < 10 && (
                      <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded">
                        🔗 Use related_memories field to create explicit connections
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle>Recent Memories</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {memories
                  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                  .slice(0, 5)
                  .map(memory => (
                    <div 
                      key={memory.id}
                      className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
                      onClick={() => handleMemorySelect(memory)}
                    >
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getCategoryColor(memory.category || 'personal') }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">
                          {extractTitle(memory.content, memory)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(memory.timestamp).toLocaleDateString()} • {memory.category || 'personal'}
                        </div>
                      </div>
                      {extractTags(memory).length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {extractTags(memory).length} tags
                        </Badge>
                      )}
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tree">
          <MemoryTreeView
            memories={filteredMemories}
            onMemoryClick={handleMemorySelect}
            extractTitle={extractTitle}
            extractTags={extractTags}
          />
        </TabsContent>

        <TabsContent value="network">
          <MemoryNetworkGraph
            memories={filteredMemories}
            onMemorySelect={handleMemorySelect}
            extractTitle={extractTitle}
            extractTags={extractTags}
          />
        </TabsContent>

        <TabsContent value="clusters">
          <MemoryClusterView
            memories={filteredMemories}
            onMemoryClick={handleMemorySelect}
            extractTitle={extractTitle}
            extractTags={extractTags}
            extractSummary={extractSummary}
          />
        </TabsContent>
      </Tabs>

      {/* Selected Memory Details */}
      {selectedMemory && (
        <Card className="bg-gray-800 border-gray-600">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Selected Memory</span>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedMemory(null)}
              >
                ✕
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-white mb-1">
                  {extractTitle(selectedMemory.content, selectedMemory)}
                </h4>
                <p className="text-sm text-gray-400">
                  {extractSummary(selectedMemory.content, selectedMemory)}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Category:</span>
                  <span className="ml-2 text-white capitalize">{selectedMemory.category || 'personal'}</span>
                </div>
                <div>
                  <span className="text-gray-400">Created:</span>
                  <span className="ml-2 text-white">{new Date(selectedMemory.timestamp).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-gray-400">Size:</span>
                  <span className="ml-2 text-white">{selectedMemory.content.length} characters</span>
                </div>
                <div>
                  <span className="text-gray-400">Project:</span>
                  <span className="ml-2 text-white">{selectedMemory.project || 'None'}</span>
                </div>
              </div>
              
              {extractTags(selectedMemory).length > 0 && (
                <div>
                  <span className="text-gray-400 text-sm">Tags:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {extractTags(selectedMemory).map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}