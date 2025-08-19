import React, { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MemoryCard } from '@/components/MemoryCard'
import { Memory, MemoryCategory } from '@/types'
import { 
  Layers, 
  Users, 
  Clock, 
  Hash, 
  Brain,
  ChevronDown,
  ChevronRight,
  Shuffle,
  Grid,
  List
} from 'lucide-react'

interface MemoryCluster {
  id: string
  name: string
  type: 'category' | 'tag' | 'temporal' | 'content' | 'project'
  memories: Memory[]
  keywords: string[]
  strength: number // 0-1 indicating cluster cohesion
  color: string
}

interface MemoryClusterViewProps {
  memories: Memory[]
  onMemoryClick?: (memory: Memory) => void
  extractTitle?: (content: string, memory?: Memory) => string
  extractTags?: (memory: Memory) => string[]
  extractSummary?: (content: string, memory?: Memory) => string
  className?: string
}

const clusterColors = [
  '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', 
  '#F97316', '#EC4899', '#06B6D4', '#84CC16', '#A855F7'
]

export function MemoryClusterView({
  memories,
  onMemoryClick,
  extractTitle = (content: string) => content.substring(0, 50) + '...',
  extractTags = (memory: Memory) => memory.tags || [],
  extractSummary = (content: string) => content.substring(0, 100) + '...',
  className = ''
}: MemoryClusterViewProps) {
  const [clusteringMethod, setClusteringMethod] = useState<'category' | 'tag' | 'temporal' | 'content' | 'smart'>('smart')
  const [expandedClusters, setExpandedClusters] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [minClusterSize, setMinClusterSize] = useState(2)

  // Generate clusters based on selected method
  const clusters = useMemo(() => {
    const generateClusters = (): MemoryCluster[] => {
      switch (clusteringMethod) {
        case 'category':
          return clusterByCategory(memories)
        case 'tag':
          return clusterByTags(memories)
        case 'temporal':
          return clusterByTime(memories)
        case 'content':
          return clusterByContent(memories)
        case 'smart':
          return smartClustering(memories)
        default:
          return []
      }
    }

    return generateClusters()
      .filter(cluster => cluster.memories.length >= minClusterSize)
      .sort((a, b) => b.memories.length - a.memories.length)
  }, [memories, clusteringMethod, minClusterSize])

  // Category-based clustering
  function clusterByCategory(memories: Memory[]): MemoryCluster[] {
    const categoryGroups = memories.reduce((acc, memory) => {
      const category = memory.category || 'uncategorized'
      if (!acc[category]) acc[category] = []
      acc[category].push(memory)
      return acc
    }, {} as Record<string, Memory[]>)

    return Object.entries(categoryGroups).map(([category, mems], index) => ({
      id: `category-${category}`,
      name: category.charAt(0).toUpperCase() + category.slice(1),
      type: 'category' as const,
      memories: mems,
      keywords: [category],
      strength: 1.0,
      color: clusterColors[index % clusterColors.length]
    }))
  }

  // Tag-based clustering
  function clusterByTags(memories: Memory[]): MemoryCluster[] {
    const tagClusters = new Map<string, Memory[]>()

    memories.forEach(memory => {
      const tags = extractTags(memory)
      if (tags.length === 0) {
        // Add to untagged cluster
        if (!tagClusters.has('untagged')) {
          tagClusters.set('untagged', [])
        }
        tagClusters.get('untagged')!.push(memory)
      } else {
        tags.forEach(tag => {
          if (!tagClusters.has(tag)) {
            tagClusters.set(tag, [])
          }
          tagClusters.get(tag)!.push(memory)
        })
      }
    })

    return Array.from(tagClusters.entries()).map(([tag, mems], index) => ({
      id: `tag-${tag}`,
      name: `#${tag}`,
      type: 'tag' as const,
      memories: mems,
      keywords: [tag],
      strength: calculateTagStrength(tag, memories),
      color: clusterColors[index % clusterColors.length]
    }))
  }

  // Temporal clustering
  function clusterByTime(memories: Memory[]): MemoryCluster[] {
    const sortedMemories = [...memories].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )

    const clusters: MemoryCluster[] = []
    const timeWindows = [
      { name: 'Today', hours: 24 },
      { name: 'This Week', hours: 24 * 7 },
      { name: 'This Month', hours: 24 * 30 },
      { name: 'Earlier', hours: Infinity }
    ]

    const now = new Date().getTime()
    let remainingMemories = [...sortedMemories]

    timeWindows.forEach((window, index) => {
      const windowStart = now - (window.hours * 60 * 60 * 1000)
      const windowMemories = remainingMemories.filter(memory => {
        const memoryTime = new Date(memory.timestamp).getTime()
        return window.hours === Infinity ? true : memoryTime >= windowStart
      })

      if (windowMemories.length > 0) {
        clusters.push({
          id: `time-${window.name.toLowerCase().replace(' ', '-')}`,
          name: window.name,
          type: 'temporal',
          memories: windowMemories,
          keywords: [window.name.toLowerCase()],
          strength: 0.8,
          color: clusterColors[index % clusterColors.length]
        })

        // Remove processed memories
        remainingMemories = remainingMemories.filter(memory => 
          !windowMemories.includes(memory)
        )
      }
    })

    return clusters
  }

  // Content-based clustering
  function clusterByContent(memories: Memory[]): MemoryCluster[] {
    const clusters: MemoryCluster[] = []
    const processed = new Set<string>()

    memories.forEach((memory, index) => {
      if (processed.has(memory.id)) return

      const similarMemories = findSimilarMemories(memory, memories, 0.3)
      if (similarMemories.length >= minClusterSize) {
        const keywords = extractKeywords(similarMemories.map(m => m.content).join(' '))
        
        clusters.push({
          id: `content-${index}`,
          name: keywords.slice(0, 2).join(' + ') || 'Content Cluster',
          type: 'content',
          memories: similarMemories,
          keywords,
          strength: calculateContentSimilarity(similarMemories),
          color: clusterColors[clusters.length % clusterColors.length]
        })

        similarMemories.forEach(m => processed.add(m.id))
      }
    })

    return clusters
  }

  // Smart clustering (hybrid approach)
  function smartClustering(memories: Memory[]): MemoryCluster[] {
    const allClusters: MemoryCluster[] = []
    
    // Start with category clusters as base
    const categoryClusters = clusterByCategory(memories)
    
    // For each category, try to find sub-clusters based on tags and content
    categoryClusters.forEach((categoryCluster, catIndex) => {
      if (categoryCluster.memories.length < 4) {
        // Small categories don't need sub-clustering
        allClusters.push(categoryCluster)
        return
      }

      // Try tag-based sub-clustering within category
      const tagSubClusters = clusterByTags(categoryCluster.memories)
        .filter(cluster => cluster.memories.length >= 2)

      if (tagSubClusters.length > 1) {
        // Use tag sub-clusters
        tagSubClusters.forEach((tagCluster, tagIndex) => {
          allClusters.push({
            ...tagCluster,
            id: `smart-${catIndex}-${tagIndex}`,
            name: `${categoryCluster.name} - ${tagCluster.name}`,
            color: categoryCluster.color
          })
        })
      } else {
        // Try content-based clustering
        const contentClusters = clusterByContent(categoryCluster.memories)
        if (contentClusters.length > 1) {
          contentClusters.forEach((contentCluster, contentIndex) => {
            allClusters.push({
              ...contentCluster,
              id: `smart-content-${catIndex}-${contentIndex}`,
              name: `${categoryCluster.name} - ${contentCluster.name}`,
              color: categoryCluster.color
            })
          })
        } else {
          // Keep as single category cluster
          allClusters.push(categoryCluster)
        }
      }
    })

    return allClusters
  }

  // Helper functions
  function findSimilarMemories(target: Memory, allMemories: Memory[], threshold: number): Memory[] {
    const targetWords = target.content.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .slice(0, 20)

    return allMemories.filter(memory => {
      if (memory.id === target.id) return true

      const memoryWords = memory.content.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 3)

      const sharedWords = targetWords.filter(word => memoryWords.includes(word))
      const similarity = sharedWords.length / Math.max(targetWords.length, 1)

      return similarity >= threshold
    })
  }

  function extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'have', 'will', 'been', 'they', 'there'].includes(word))

    const wordCounts = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(wordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([word]) => word)
  }

  function calculateTagStrength(tag: string, memories: Memory[]): number {
    const taggedMemories = memories.filter(m => extractTags(m).includes(tag))
    return Math.min(1.0, taggedMemories.length / memories.length * 10)
  }

  function calculateContentSimilarity(memories: Memory[]): number {
    // Simple heuristic based on shared keywords
    if (memories.length < 2) return 0
    
    const allWords = memories.flatMap(m => 
      m.content.toLowerCase().split(/\W+/).filter(w => w.length > 3)
    )
    const uniqueWords = new Set(allWords)
    
    return Math.min(1.0, (allWords.length - uniqueWords.size) / allWords.length * 5)
  }

  const toggleCluster = (clusterId: string) => {
    const newExpanded = new Set(expandedClusters)
    if (newExpanded.has(clusterId)) {
      newExpanded.delete(clusterId)
    } else {
      newExpanded.add(clusterId)
    }
    setExpandedClusters(newExpanded)
  }

  const getClusterIcon = (type: MemoryCluster['type']) => {
    switch (type) {
      case 'category': return <Layers className="h-4 w-4" />
      case 'tag': return <Hash className="h-4 w-4" />
      case 'temporal': return <Clock className="h-4 w-4" />
      case 'content': return <Brain className="h-4 w-4" />
      case 'project': return <Users className="h-4 w-4" />
      default: return <Grid className="h-4 w-4" />
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Cluster by:</span>
          <select
            value={clusteringMethod}
            onChange={(e) => setClusteringMethod(e.target.value as any)}
            className="bg-gray-700 border-gray-600 text-white rounded px-3 py-1 text-sm"
          >
            <option value="smart">Smart Clustering</option>
            <option value="category">Category</option>
            <option value="tag">Tags</option>
            <option value="temporal">Time</option>
            <option value="content">Content Similarity</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Min size:</span>
          <input
            type="range"
            min="1"
            max="10"
            value={minClusterSize}
            onChange={(e) => setMinClusterSize(Number(e.target.value))}
            className="w-20"
          />
          <span className="text-sm text-white w-8">{minClusterSize}</span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="ml-4"
          >
            {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Cluster Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gray-800 border-gray-600">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-white">{clusters.length}</div>
            <div className="text-sm text-gray-400">Clusters</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-600">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-white">{memories.length}</div>
            <div className="text-sm text-gray-400">Total Memories</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-600">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-white">
              {clusters.length > 0 ? Math.round(memories.length / clusters.length) : 0}
            </div>
            <div className="text-sm text-gray-400">Avg per Cluster</div>
          </CardContent>
        </Card>
        
        <Card className="bg-gray-800 border-gray-600">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-white">
              {Math.round((clusters.reduce((sum, c) => sum + c.strength, 0) / clusters.length) * 100) || 0}%
            </div>
            <div className="text-sm text-gray-400">Avg Cohesion</div>
          </CardContent>
        </Card>
      </div>

      {/* Clusters */}
      <div className="space-y-4">
        {clusters.map((cluster) => {
          const isExpanded = expandedClusters.has(cluster.id)
          
          return (
            <Card key={cluster.id} className="bg-gray-800 border-gray-600">
              <CardHeader 
                className="cursor-pointer hover:bg-gray-700/50 transition-colors"
                onClick={() => toggleCluster(cluster.id)}
              >
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: cluster.color + '20', color: cluster.color }}
                      >
                        {getClusterIcon(cluster.type)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white">{cluster.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {cluster.memories.length} memories
                        </Badge>
                      </div>
                      
                      {cluster.keywords.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-gray-400">Keywords:</span>
                          {cluster.keywords.slice(0, 3).map(keyword => (
                            <Badge key={keyword} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Cohesion</div>
                      <div className="text-sm font-medium" style={{ color: cluster.color }}>
                        {Math.round(cluster.strength * 100)}%
                      </div>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <div className={`
                    ${viewMode === 'grid' 
                      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' 
                      : 'space-y-3'
                    } max-h-none overflow-visible
                  `}>
                    {cluster.memories.map((memory) => (
                      <div key={memory.id}>
                        {viewMode === 'grid' ? (
                          <MemoryCard
                            memory={memory}
                            onClick={() => onMemoryClick?.(memory)}
                            extractTitle={extractTitle}
                            extractTags={extractTags}
                            extractSummary={extractSummary}
                            compact
                          />
                        ) : (
                          <div 
                            className="flex items-start gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
                            onClick={() => onMemoryClick?.(memory)}
                          >
                            <div 
                              className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                              style={{ backgroundColor: cluster.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white font-medium break-words mb-1">
                                {extractTitle(memory.content, memory)}
                              </div>
                              <div className="text-xs text-gray-400 break-words line-clamp-2">
                                {extractSummary(memory.content, memory)}
                              </div>
                              <div className="flex items-center gap-2 mt-2 flex-wrap">
                                {extractTags(memory).slice(0, 3).map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    #{tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {clusters.length === 0 && (
        <Card className="bg-gray-800 border-gray-600">
          <CardContent className="p-8 text-center">
            <Shuffle className="w-12 h-12 mx-auto mb-4 text-gray-500" />
            <h3 className="text-lg font-medium text-white mb-2">No Clusters Found</h3>
            <p className="text-gray-400 mb-4">
              Try adjusting the minimum cluster size or switching to a different clustering method.
            </p>
            <Button 
              variant="outline" 
              onClick={() => setMinClusterSize(1)}
              className="border-gray-600"
            >
              Reset Filters
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}