import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Memory } from '@/types'
import { formatDistanceToNow } from '@/utils/helpers'

interface StatisticsDashboardProps {
  memories: Memory[]
}

interface MemoryStats {
  total: number
  categories: Record<string, number>
  projects: Record<string, number>
  tags: Record<string, number>
  contentTypes: Record<string, number>
  complexityLevels: Record<number, number>
  recentActivity: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  averageSize: number
  largestMemory: Memory | null
  mostActiveProject: string | null
  trendingTags: string[]
  memoryGrowth: { date: string; count: number }[]
}

export function StatisticsDashboard({ memories }: StatisticsDashboardProps) {
  const [stats, setStats] = useState<MemoryStats | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    if (memories.length === 0) {
      setStats(null)
      return
    }

    const calculateStats = (): MemoryStats => {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const thisMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      // Filter memories by time range
      let filteredMemories = memories
      if (selectedTimeRange !== 'all') {
        const days = selectedTimeRange === '7d' ? 7 : selectedTimeRange === '30d' ? 30 : 90
        const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
        filteredMemories = memories.filter(m => new Date(m.timestamp) >= cutoff)
      }

      // Calculate categories
      const categories: Record<string, number> = {}
      filteredMemories.forEach(memory => {
        const category = memory.category || 'uncategorized'
        categories[category] = (categories[category] || 0) + 1
      })

      // Calculate projects
      const projects: Record<string, number> = {}
      filteredMemories.forEach(memory => {
        const project = memory.project || 'general'
        projects[project] = (projects[project] || 0) + 1
      })

      // Calculate tags
      const tags: Record<string, number> = {}
      filteredMemories.forEach(memory => {
        if (memory.tags && Array.isArray(memory.tags)) {
          memory.tags.forEach(tag => {
            // Skip title: and summary: metadata tags
            if (!tag.startsWith('title:') && !tag.startsWith('summary:')) {
              tags[tag] = (tags[tag] || 0) + 1
            }
          })
        }
      })

      // Calculate content types
      const contentTypes: Record<string, number> = {}
      filteredMemories.forEach(memory => {
        const contentType = memory.metadata?.contentType || 'text'
        contentTypes[contentType] = (contentTypes[contentType] || 0) + 1
      })

      // Calculate complexity levels
      const complexityLevels: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
      filteredMemories.forEach(memory => {
        const complexity = (memory as any).complexity || 1
        complexityLevels[complexity] = (complexityLevels[complexity] || 0) + 1
      })

      // Calculate recent activity
      const recentActivity = {
        today: filteredMemories.filter(m => new Date(m.timestamp) >= today).length,
        thisWeek: filteredMemories.filter(m => new Date(m.timestamp) >= thisWeek).length,
        thisMonth: filteredMemories.filter(m => new Date(m.timestamp) >= thisMonth).length
      }

      // Calculate average size
      const totalSize = filteredMemories.reduce((sum, memory) => sum + memory.content.length, 0)
      const averageSize = filteredMemories.length > 0 ? Math.round(totalSize / filteredMemories.length) : 0

      // Find largest memory
      const largestMemory = filteredMemories.reduce((largest, memory) => 
        !largest || memory.content.length > largest.content.length ? memory : largest
      , null as Memory | null)

      // Find most active project
      const mostActiveProject = Object.entries(projects).reduce((most, [project, count]) => 
        !most || count > most[1] ? [project, count] : most
      , null as [string, number] | null)?.[0] || null

      // Calculate trending tags (top 10 by frequency)
      const trendingTags = Object.entries(tags)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([tag]) => tag)

      // Calculate memory growth over time
      const memoryGrowth: { date: string; count: number }[] = []
      const groupedByDate = filteredMemories.reduce((acc, memory) => {
        const date = new Date(memory.timestamp).toISOString().split('T')[0]
        acc[date] = (acc[date] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Create time series data
      const sortedDates = Object.keys(groupedByDate).sort()
      let cumulativeCount = 0
      sortedDates.forEach(date => {
        cumulativeCount += groupedByDate[date]
        memoryGrowth.push({ date, count: cumulativeCount })
      })

      return {
        total: filteredMemories.length,
        categories,
        projects,
        tags,
        contentTypes,
        complexityLevels,
        recentActivity,
        averageSize,
        largestMemory,
        mostActiveProject,
        trendingTags,
        memoryGrowth
      }
    }

    setStats(calculateStats())
  }, [memories, selectedTimeRange])

  if (!stats || memories.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📊</div>
        <h3 className="text-xl font-semibold text-white mb-2">No Data Yet</h3>
        <p className="text-gray-400">Start adding memories to see analytics and insights!</p>
      </div>
    )
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      personal: '👤',
      work: '💼',
      code: '💻',
      research: '🔬',
      conversations: '💬',
      preferences: '⚙️',
      uncategorized: '📄'
    }
    return icons[category] || '📄'
  }

  const getComplexityIcon = (level: number) => {
    const icons = ['🟢', '🟡', '🟠', '🔴']
    return icons[level - 1] || '⚪'
  }

  return (
    <div className="space-y-6">
      {/* Time Range Filter */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">🎉 SHADCN UI ENHANCED - Analytics Dashboard</h2>
        <Tabs value={selectedTimeRange} onValueChange={(value) => setSelectedTimeRange(value as any)} className="w-auto">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">90 Days</TabsTrigger>
            <TabsTrigger value="all">All Time</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Memories</CardTitle>
            <span className="text-2xl">🧠</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Across {Object.keys(stats.projects).length} projects
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent Activity</CardTitle>
            <span className="text-2xl">⚡</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.recentActivity.thisWeek}</div>
            <p className="text-sm text-muted-foreground mt-2">
              This week ({stats.recentActivity.today} today)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Size</CardTitle>
            <span className="text-2xl">📏</span>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.averageSize}</div>
            <p className="text-sm text-muted-foreground mt-2">characters per memory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Project</CardTitle>
            <span className="text-2xl">🎯</span>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">
              {stats.mostActiveProject?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'General'}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {stats.projects[stats.mostActiveProject || 'general'] || 0} memories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categories and Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categories Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📂</span> Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.categories)
              .sort(([,a], [,b]) => b - a)
              .map(([category, count]) => {
                const percentage = Math.round((count / stats.total) * 100)
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getCategoryIcon(category)}</span>
                        <span className="text-sm font-medium capitalize">
                          {category.replace(/-/g, ' ')}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
          </CardContent>
        </Card>

        {/* Projects Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📁</span> Projects
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.projects)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 8)
              .map(([project, count]) => {
                const percentage = Math.round((count / stats.total) * 100)
                return (
                  <div key={project} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📁</span>
                        <span className="text-sm font-medium capitalize truncate">
                          {project.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
          </CardContent>
        </Card>
      </div>

      {/* Complexity Levels and Content Types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Complexity Levels */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🎯</span> Complexity Levels
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.complexityLevels)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([level, count]) => {
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                const labels = ['Simple', 'Enhanced', 'Project', 'Advanced']
                return (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getComplexityIcon(Number(level))}</span>
                        <span className="text-sm font-medium">
                          Level {level}: {labels[Number(level) - 1]}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
          </CardContent>
        </Card>

        {/* Content Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📄</span> Content Types
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(stats.contentTypes)
              .sort(([,a], [,b]) => b - a)
              .map(([type, count]) => {
                const percentage = Math.round((count / stats.total) * 100)
                const icons: Record<string, string> = {
                  text: '📝',
                  code: '💻',
                  structured: '🗂️'
                }
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{icons[type] || '📄'}</span>
                        <span className="text-sm font-medium capitalize">{type}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                )
              })}
          </CardContent>
        </Card>
      </div>

      {/* Trending Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🏷️</span> Trending Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.trendingTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {stats.trendingTags.map((tag, index) => (
                <Badge
                  key={tag}
                  variant={index < 3 ? "default" : index < 6 ? "secondary" : "outline"}
                  className="px-3 py-1"
                >
                  #{tag} ({stats.tags[tag]})
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No tags found in selected time range</p>
          )}
        </CardContent>
      </Card>

      {/* Insights */}
      {stats.largestMemory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>💡</span> Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4 p-4 rounded-lg border bg-muted/50">
              <span className="text-2xl">📝</span>
              <div className="flex-1">
                <h4 className="font-medium">Largest Memory</h4>
                <p className="text-sm text-muted-foreground">
                  {stats.largestMemory.content.substring(0, 100)}...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.largestMemory.content.length} characters • {formatDistanceToNow(stats.largestMemory.timestamp)}
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <span className="text-xl">📈</span>
                <div>
                  <div className="font-medium">Growth Rate</div>
                  <div className="text-sm text-muted-foreground">
                    {stats.memoryGrowth.length > 1 
                      ? `${Math.round((stats.recentActivity.thisWeek / 7) * 10) / 10} memories/day`
                      : 'Not enough data'
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <span className="text-xl">🎯</span>
                <div>
                  <div className="font-medium">Tag Diversity</div>
                  <div className="text-sm text-muted-foreground">
                    {Object.keys(stats.tags).length} unique tags
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}