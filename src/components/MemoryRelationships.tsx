import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { Memory } from '@/types'

interface MemoryRelationshipsProps {
  memories: Memory[]
  extractTitle: (content: string, memory?: Memory) => string
  generateSummary: (content: string, memory?: Memory) => string
  extractTags: (memory: Memory) => string[]
  getTagColor: (tag: string) => { bg: string; text: string; border: string }
  onMemoryEdit: (memoryId: string) => void
}

interface RelationshipCluster {
  id: string
  name: string
  memories: Memory[]
  sharedTags: string[]
  strength: number
}

interface MemoryConnection {
  memory1: Memory
  memory2: Memory
  sharedTags: string[]
  strength: number
  type: 'tag-based' | 'content-similarity' | 'project-based' | 'temporal'
}

export function MemoryRelationships({
  memories,
  extractTitle,
  generateSummary,
  extractTags,
  getTagColor,
  onMemoryEdit
}: MemoryRelationshipsProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'clusters' | 'connections'>('clusters')

  // Handle node click to open edit dialog
  const handleNodeClick = (nodeId: string | null) => {
    if (nodeId) {
      onMemoryEdit(nodeId)
    }
    setSelectedNode(nodeId)
  }
  const [clusters, setClusters] = useState<RelationshipCluster[]>([])
  const [connections, setConnections] = useState<MemoryConnection[]>([])

  useEffect(() => {
    // Calculate memory relationships and clusters
    const calculateRelationships = () => {
      const newConnections: MemoryConnection[] = []
      const newClusters: RelationshipCluster[] = []

      // Find tag-based connections
      for (let i = 0; i < memories.length; i++) {
        for (let j = i + 1; j < memories.length; j++) {
          const memory1 = memories[i]
          const memory2 = memories[j]
          const tags1 = extractTags(memory1)
          const tags2 = extractTags(memory2)
          
          // Filter out title/summary metadata tags
          const meaningfulTags1 = tags1.filter(tag => !tag.startsWith('title:') && !tag.startsWith('summary:'))
          const meaningfulTags2 = tags2.filter(tag => !tag.startsWith('title:') && !tag.startsWith('summary:'))
          
          const sharedTags = meaningfulTags1.filter(tag => meaningfulTags2.includes(tag))
          
          if (sharedTags.length > 0) {
            const strength = Math.min(sharedTags.length / Math.max(meaningfulTags1.length, meaningfulTags2.length), 1)
            newConnections.push({
              memory1,
              memory2,
              sharedTags,
              strength,
              type: 'tag-based'
            })
          }

          // Find project-based connections
          if (memory1.project && memory2.project && memory1.project === memory2.project) {
            newConnections.push({
              memory1,
              memory2,
              sharedTags: [`project:${memory1.project}`],
              strength: 0.7,
              type: 'project-based'
            })
          }

          // Find temporal connections (created within 24 hours)
          const time1 = new Date(memory1.timestamp).getTime()
          const time2 = new Date(memory2.timestamp).getTime()
          const timeDiff = Math.abs(time1 - time2)
          const oneDayMs = 24 * 60 * 60 * 1000
          
          if (timeDiff < oneDayMs) {
            newConnections.push({
              memory1,
              memory2,
              sharedTags: ['temporal-proximity'],
              strength: 0.3 * (1 - timeDiff / oneDayMs),
              type: 'temporal'
            })
          }
        }
      }

      // Group memories into clusters based on shared tags
      const tagGroups = new Map<string, Memory[]>()
      memories.forEach(memory => {
        const tags = extractTags(memory).filter(tag => !tag.startsWith('title:') && !tag.startsWith('summary:'))
        tags.forEach(tag => {
          if (!tagGroups.has(tag)) {
            tagGroups.set(tag, [])
          }
          tagGroups.get(tag)!.push(memory)
        })
      })

      // Create clusters for tags with multiple memories
      Array.from(tagGroups.entries())
        .filter(([_, memories]) => memories.length > 1)
        .forEach(([tag, clusterMemories], index) => {
          const uniqueMemories = clusterMemories.filter((memory, i, self) => 
            self.findIndex(m => m.id === memory.id) === i
          )
          
          if (uniqueMemories.length > 1) {
            newClusters.push({
              id: `cluster-${index}`,
              name: tag,
              memories: uniqueMemories,
              sharedTags: [tag],
              strength: uniqueMemories.length / memories.length
            })
          }
        })

      // Sort clusters by size
      newClusters.sort((a, b) => b.memories.length - a.memories.length)

      setConnections(newConnections)
      setClusters(newClusters)
    }

    calculateRelationships()
  }, [memories, extractTags])

  const getConnectionTypeColor = (type: MemoryConnection['type']) => {
    const colors = {
      'tag-based': 'bg-blue-600',
      'content-similarity': 'bg-green-600',
      'project-based': 'bg-purple-600',
      'temporal': 'bg-yellow-600'
    }
    return colors[type] || 'bg-gray-600'
  }

  const getConnectionTypeIcon = (type: MemoryConnection['type']) => {
    const icons = {
      'tag-based': '🏷️',
      'content-similarity': '📄',
      'project-based': '📁',
      'temporal': '⏰'
    }
    return icons[type] || '🔗'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>🔗</span> Memory Relationships
        </h3>
        <p className="text-sm text-muted-foreground">
          Discover connections between your memories through tags, projects, and patterns
        </p>
      </div>

      <Tabs value={viewMode} onValueChange={(value: any) => setViewMode(value)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="clusters">📊 Clusters</TabsTrigger>
          <TabsTrigger value="connections">🔍 Connections</TabsTrigger>
        </TabsList>



        <TabsContent value="clusters" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Found {clusters.length} memory clusters
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.map((cluster) => (
              <Card key={cluster.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <span>🏷️</span> {cluster.name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {cluster.memories.length} memories
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {cluster.memories.map((memory) => (
                        <div key={memory.id} className="rounded-lg border bg-muted/50 p-2">
                          <div className="text-sm font-medium truncate">
                            {extractTitle(memory.content, memory)}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {generateSummary(memory.content, memory)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(memory.timestamp).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Cluster strength</span>
                      <span>{Math.round(cluster.strength * 100)}%</span>
                    </div>
                    <Progress value={cluster.strength * 100} className="h-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="connections" className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Found {connections.length} connections between memories
          </div>
          
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {connections
                .sort((a, b) => b.strength - a.strength)
                .slice(0, 50)
                .map((connection, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="rounded-lg border bg-muted/50 p-3">
                            <div className="font-medium text-sm truncate">
                              {extractTitle(connection.memory1.content, connection.memory1)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {generateSummary(connection.memory1.content, connection.memory1)}
                            </div>
                          </div>
                          
                          <div className="rounded-lg border bg-muted/50 p-3">
                            <div className="font-medium text-sm truncate">
                              {extractTitle(connection.memory2.content, connection.memory2)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {generateSummary(connection.memory2.content, connection.memory2)}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 ${getConnectionTypeColor(connection.type)} rounded-full flex items-center justify-center text-xs`}>
                              {getConnectionTypeIcon(connection.type)}
                            </div>
                            <span className="text-sm capitalize">
                              {connection.type.replace('-', ' ')}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">
                              {connection.sharedTags.slice(0, 3).map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {connection.sharedTags.length > 3 && (
                                <span className="text-xs text-muted-foreground">+{connection.sharedTags.length - 3}</span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {Math.round(connection.strength * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Relationship Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔗</span>
              <div>
                <div className="font-medium">Total Connections</div>
                <div className="text-sm text-muted-foreground">{connections.length}</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏷️</span>
              <div>
                <div className="font-medium">Tag-based</div>
                <div className="text-sm text-muted-foreground">
                  {connections.filter(c => c.type === 'tag-based').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📁</span>
              <div>
                <div className="font-medium">Project-based</div>
                <div className="text-sm text-muted-foreground">
                  {connections.filter(c => c.type === 'project-based').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏰</span>
              <div>
                <div className="font-medium">Temporal</div>
                <div className="text-sm text-muted-foreground">
                  {connections.filter(c => c.type === 'temporal').length}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}