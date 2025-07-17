import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Memory } from '@/types'
import { Shield, WifiOff, Tabs } from 'lucide-react'

interface AIEnhancementProps {
  memories: Memory[]
  onEnhanceMemory: (memory: Memory) => Promise<void>
  onEnhanceAll: () => Promise<void>
  enhancingMemories: Set<string>
  isEnhancing: boolean
  llmProvider: "openai" | "anthropic" | "ollama" | "none"
  llmApiKey: string
  onProviderChange: (provider: "openai" | "anthropic" | "ollama" | "none") => void
  onApiKeyChange: (key: string) => void
  onSaveSettings: () => void
  websocket?: WebSocket
  enhancementDisabled?: boolean
  enhancementFailures?: number
}

interface EnhancementProgress {
  completed: number
  total: number
  currentMemoryId?: string
  stage: 'analyzing' | 'generating' | 'completing' | 'idle'
  errors: Array<{ memoryId: string; error: string }>
  startTime?: Date
  estimatedTimeRemaining?: number
}

interface AIInsight {
  type: 'categorization' | 'tagging' | 'relationship' | 'summary' | 'quality'
  title: string
  description: string
  memories: Memory[]
  action?: string
}

export function AIEnhancement({
  memories,
  onEnhanceMemory,
  onEnhanceAll,
  enhancingMemories,
  isEnhancing,
  llmProvider,
  llmApiKey,
  onProviderChange,
  onApiKeyChange,
  onSaveSettings,
  websocket,
  enhancementDisabled = false,
  enhancementFailures = 0
}: AIEnhancementProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null)
  const [enhancementProgress, setEnhancementProgress] = useState<EnhancementProgress>({
    completed: 0,
    total: 0,
    stage: 'idle',
    errors: []
  })
  const [showProgressDetails, setShowProgressDetails] = useState(false)

  // Generate AI insights about the memory collection
  const generateInsights = (): AIInsight[] => {
    const insights: AIInsight[] = []

    // Find untagged memories
    const untagged = memories.filter(m => !m.tags || m.tags.length === 0)
    if (untagged.length > 0) {
      insights.push({
        type: 'tagging',
        title: 'Untagged Memories',
        description: `${untagged.length} memories could benefit from AI-generated tags for better organization.`,
        memories: untagged,
        action: 'Generate Tags'
      })
    }

    // Find uncategorized memories
    const uncategorized = memories.filter(m => !m.category)
    if (uncategorized.length > 0) {
      insights.push({
        type: 'categorization',
        title: 'Uncategorized Memories',
        description: `${uncategorized.length} memories need category assignment for better organization.`,
        memories: uncategorized,
        action: 'Auto-Categorize'
      })
    }

    // Find memories without AI enhancement
    const unenhanced = memories.filter(m => {
      const tags = m.tags || []
      return !tags.some(tag => tag.startsWith('title:'))
    })
    if (unenhanced.length > 0) {
      insights.push({
        type: 'summary',
        title: 'Enhancement Opportunities',
        description: `${unenhanced.length} memories could get AI-generated titles and summaries.`,
        memories: unenhanced,
        action: 'Enhance All'
      })
    }

    // Find potential relationships
    const tagGroups = new Map<string, Memory[]>()
    memories.forEach(memory => {
      const tags = memory.tags || []
      tags.forEach(tag => {
        if (!tag.startsWith('title:') && !tag.startsWith('summary:')) {
          if (!tagGroups.has(tag)) tagGroups.set(tag, [])
          tagGroups.get(tag)!.push(memory)
        }
      })
    })

    const relatedMemories = Array.from(tagGroups.entries())
      .filter(([, memories]) => memories.length > 1)
      .flatMap(([, memories]) => memories)
      .filter((memory, index, self) => self.findIndex(m => m.id === memory.id) === index)

    if (relatedMemories.length > 0) {
      insights.push({
        type: 'relationship',
        title: 'Related Memories',
        description: `${relatedMemories.length} memories share common tags and could be linked together.`,
        memories: relatedMemories,
        action: 'Create Links'
      })
    }

    // Find low-quality memories (very short or no content)
    const lowQuality = memories.filter(m => 
      m.content.trim().length < 20 || 
      m.content.trim().split(' ').length < 5
    )
    if (lowQuality.length > 0) {
      insights.push({
        type: 'quality',
        title: 'Quality Improvements',
        description: `${lowQuality.length} memories are very short and might need expansion.`,
        memories: lowQuality,
        action: 'Suggest Improvements'
      })
    }

    return insights
  }

  const insights = generateInsights()

  // Update progress tracking when enhancing memories changes
  React.useEffect(() => {
    if (isEnhancing && enhancingMemories.size > 0) {
      const totalToEnhance = enhancementProgress.total || enhancingMemories.size
      const completed = totalToEnhance - enhancingMemories.size
      
      setEnhancementProgress(prev => ({
        ...prev,
        completed,
        total: totalToEnhance,
        stage: enhancingMemories.size > 0 ? 'generating' : 'completing',
        currentMemoryId: Array.from(enhancingMemories)[0],
        estimatedTimeRemaining: enhancingMemories.size * 3 // 3 seconds per memory estimate
      }))
    } else if (!isEnhancing && enhancementProgress.stage !== 'idle') {
      setEnhancementProgress(prev => ({
        ...prev,
        stage: 'idle',
        currentMemoryId: undefined,
        estimatedTimeRemaining: undefined
      }))
    }
  }, [isEnhancing, enhancingMemories, enhancementProgress.total])

  // Calculate enhancement statistics
  const enhancementStats = React.useMemo(() => {
    const enhanced = memories.filter(m => (m.tags || []).some(tag => tag.startsWith('title:')))
    const tagged = memories.filter(m => m.tags && m.tags.length > 0)
    const categorized = memories.filter(m => m.category)
    const withSummary = memories.filter(m => (m.tags || []).some(tag => tag.startsWith('summary:')))
    
    return {
      enhanced: { count: enhanced.length, percentage: (enhanced.length / memories.length) * 100 },
      tagged: { count: tagged.length, percentage: (tagged.length / memories.length) * 100 },
      categorized: { count: categorized.length, percentage: (categorized.length / memories.length) * 100 },
      withSummary: { count: withSummary.length, percentage: (withSummary.length / memories.length) * 100 },
      total: memories.length
    }
  }, [memories])

  const formatTimeRemaining = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }
  
  const getInsightIcon = (type: string) => {
    const icons = {
      categorization: '📂',
      tagging: '🏷️',
      relationship: '🔗',
      summary: '✨',
      quality: '⭐'
    }
    return icons[type as keyof typeof icons] || '💡'
  }

  const getInsightColor = (type: string) => {
    const colors = {
      categorization: 'bg-blue-600',
      tagging: 'bg-green-600',
      relationship: 'bg-purple-600',
      summary: 'bg-yellow-600',
      quality: 'bg-red-600'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-600'
  }

  const handleBulkAction = async (insight: AIInsight) => {
    if (insight.type === 'summary' && insight.action === 'Enhance All') {
      await onEnhanceAll()
    } else if (insight.type === 'tagging' && insight.action === 'Generate Tags') {
      for (const memory of insight.memories) {
        if (!enhancingMemories.has(memory.id)) {
          await onEnhanceMemory(memory)
        }
      }
    } else if (insight.type === 'categorization' && insight.action === 'Auto-Categorize') {
      // This would require backend support for auto-categorization
      alert('Auto-categorization coming soon!')
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Settings */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">🤖 AI Enhancement</h3>
          <p className="text-sm text-gray-400">
            {llmProvider === 'none' 
              ? 'Configure AI to enhance your memories with titles, summaries, and insights'
              : llmProvider === 'ollama'
                ? 'Using Ollama Local AI for privacy-focused memory enhancement'
                : `Using ${llmProvider === 'openai' ? 'OpenAI GPT' : 'Anthropic Claude'} for memory enhancement`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showSettings} onOpenChange={setShowSettings}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="border-gray-600 text-gray-300">
                ⚙️ Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border border-gray-600">
              <DialogHeader>
                <DialogTitle className="text-white">AI Enhancement Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">AI Provider</label>
                  <Select value={llmProvider} onValueChange={onProviderChange}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 text-white">
                      <SelectItem value="none">None (Disabled)</SelectItem>
                      <SelectItem value="ollama">🦙 Ollama (Local AI)</SelectItem>
                      <SelectItem value="openai">OpenAI (GPT-3.5/4)</SelectItem>
                      <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {llmProvider === "ollama" && (
                  <div className="space-y-4">
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-300 mb-2">
                        <Shield className="h-4 w-4" />
                        <span className="font-medium">Privacy-Focused Local AI</span>
                      </div>
                      <div className="text-sm text-green-200">
                        <p>• No data sent to external servers</p>
                        <p>• Unlimited processing with no API costs</p>
                        <p>• Requires Ollama running locally</p>
                      </div>
                    </div>
                    <div className="text-sm text-gray-400">
                      <p>📖 Setup: Install Ollama and run <code className="bg-gray-700 px-2 py-1 rounded">ollama pull llama3.1:8b</code></p>
                    </div>
                  </div>
                )}
                {llmProvider !== "none" && llmProvider !== "ollama" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">API Key</label>
                    <Input
                      type="password"
                      value={llmApiKey}
                      onChange={e => onApiKeyChange(e.target.value)}
                      placeholder="Enter your API key"
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={() => {
                    onSaveSettings()
                    setShowSettings(false)
                  }} className="bg-violet-600 hover:bg-violet-700">
                    Save Settings
                  </Button>
                  <Button variant="outline" onClick={() => setShowSettings(false)} 
                          className="border-gray-600 text-gray-300">
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {llmProvider !== "none" && (
            <Button
              onClick={onEnhanceAll}
              disabled={isEnhancing}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isEnhancing ? "🔄 Enhancing..." : "✨ Enhance All"}
            </Button>
          )}
        </div>
      </div>

      {/* Enhancement Disabled Warning */}
      {enhancementDisabled && llmProvider === 'ollama' && (
        <Alert className="bg-yellow-500/10 border-yellow-500/50">
          <AlertDescription className="text-yellow-300">
            <strong>Ollama Enhancement Disabled</strong><br />
            Enhancement has been temporarily disabled after {enhancementFailures} failed attempts. 
            Please ensure Ollama is running and click "Save Settings" to re-enable enhancement.
          </AlertDescription>
        </Alert>
      )}

      {/* AI Insights */}
      {llmProvider !== 'none' && insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>💡</span> AI Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {insights.map((insight, index) => (
                <Card
                  key={index}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedInsight(insight)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 ${getInsightColor(insight.type)} rounded-lg flex items-center justify-center text-white text-sm`}>
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{insight.title}</h5>
                        <p className="text-muted-foreground text-xs mt-1">{insight.description}</p>
                        {insight.action && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs p-0 h-auto mt-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBulkAction(insight)
                            }}
                          >
                            {insight.action} →
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Progress Tracking */}
      {(isEnhancing || enhancingMemories.size > 0) && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <div className="animate-spin">🔄</div>
                Enhancement Progress
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowProgressDetails(!showProgressDetails)}
                className="text-gray-400 hover:text-white"
              >
                {showProgressDetails ? 'Hide Details' : 'Show Details'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-300">
                  {enhancementProgress.completed} of {enhancementProgress.total} memories processed
                </span>
                <span className="text-gray-400">
                  {enhancementProgress.total > 0 ? Math.round((enhancementProgress.completed / enhancementProgress.total) * 100) : 0}%
                </span>
              </div>
              <Progress 
                value={enhancementProgress.total > 0 ? (enhancementProgress.completed / enhancementProgress.total) * 100 : 0}
                className="h-2"
              />
            </div>

            {/* Current Status */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-gray-300">
                  {enhancementProgress.stage === 'analyzing' && 'Analyzing memory content...'}
                  {enhancementProgress.stage === 'generating' && 'Generating AI enhancements...'}
                  {enhancementProgress.stage === 'completing' && 'Finalizing enhancements...'}
                  {enhancementProgress.stage === 'idle' && 'Enhancement complete'}
                </span>
              </div>
              {enhancementProgress.estimatedTimeRemaining && (
                <span className="text-gray-400">
                  ~{formatTimeRemaining(enhancementProgress.estimatedTimeRemaining)} remaining
                </span>
              )}
            </div>

            {/* Detailed Progress */}
            {showProgressDetails && (
              <div className="space-y-3 p-3 bg-gray-700/50 rounded-lg">
                <div className="text-sm text-gray-300 font-medium">Processing Details</div>
                
                {/* Currently Processing */}
                {enhancementProgress.currentMemoryId && (
                  <div className="text-xs text-gray-400">
                    <span className="font-medium">Current memory:</span> {enhancementProgress.currentMemoryId}
                  </div>
                )}

                {/* Queue Status */}
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="text-center">
                    <div className="text-green-400 font-bold">{enhancementProgress.completed}</div>
                    <div className="text-gray-500">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-blue-400 font-bold">{enhancingMemories.size}</div>
                    <div className="text-gray-500">In Progress</div>
                  </div>
                  <div className="text-center">
                    <div className="text-gray-400 font-bold">
                      {enhancementProgress.total - enhancementProgress.completed - enhancingMemories.size}
                    </div>
                    <div className="text-gray-500">Pending</div>
                  </div>
                </div>

                {/* Error Summary */}
                {enhancementProgress.errors.length > 0 && (
                  <div className="text-xs">
                    <div className="text-red-400 font-medium mb-1">
                      {enhancementProgress.errors.length} error(s) encountered
                    </div>
                    <div className="max-h-20 overflow-y-auto space-y-1">
                      {enhancementProgress.errors.slice(0, 3).map((error, index) => (
                        <div key={index} className="text-red-300/70">
                          Memory {error.memoryId}: {error.error}
                        </div>
                      ))}
                      {enhancementProgress.errors.length > 3 && (
                        <div className="text-gray-500">
                          And {enhancementProgress.errors.length - 3} more errors...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Performance Stats */}
                {enhancementProgress.startTime && (
                  <div className="text-xs text-gray-500">
                    Started: {enhancementProgress.startTime.toLocaleTimeString()}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Enhanced Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div className="flex-1">
                <div className="font-medium">AI Enhanced</div>
                <div className="text-sm text-muted-foreground">
                  {enhancementStats.enhanced.count} / {enhancementStats.total}
                </div>
                <Progress 
                  value={enhancementStats.enhanced.percentage} 
                  className="h-1 mt-2" 
                />
                <div className="text-xs text-gray-500 mt-1">
                  {enhancementStats.enhanced.percentage.toFixed(1)}% complete
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏷️</span>
              <div className="flex-1">
                <div className="font-medium">Tagged</div>
                <div className="text-sm text-muted-foreground">
                  {enhancementStats.tagged.count} / {enhancementStats.total}
                </div>
                <Progress 
                  value={enhancementStats.tagged.percentage} 
                  className="h-1 mt-2" 
                />
                <div className="text-xs text-gray-500 mt-1">
                  {enhancementStats.tagged.percentage.toFixed(1)}% tagged
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📂</span>
              <div className="flex-1">
                <div className="font-medium">Categorized</div>
                <div className="text-sm text-muted-foreground">
                  {enhancementStats.categorized.count} / {enhancementStats.total}
                </div>
                <Progress 
                  value={enhancementStats.categorized.percentage} 
                  className="h-1 mt-2" 
                />
                <div className="text-xs text-gray-500 mt-1">
                  {enhancementStats.categorized.percentage.toFixed(1)}% categorized
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <div className="flex-1">
                <div className="font-medium">Summarized</div>
                <div className="text-sm text-muted-foreground">
                  {enhancementStats.withSummary.count} / {enhancementStats.total}
                </div>
                <Progress 
                  value={enhancementStats.withSummary.percentage} 
                  className="h-1 mt-2" 
                />
                <div className="text-xs text-gray-500 mt-1">
                  {enhancementStats.withSummary.percentage.toFixed(1)}% summarized
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress Summary */}
      {enhancementStats.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overall Enhancement Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {Math.round((enhancementStats.enhanced.percentage + enhancementStats.tagged.percentage + enhancementStats.categorized.percentage) / 3)}%
                </div>
                <div className="text-sm text-gray-400">Average completion across all enhancement categories</div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
                <div>
                  <div className="text-blue-400 font-semibold">{enhancementStats.enhanced.count}</div>
                  <div className="text-gray-500">Enhanced</div>
                </div>
                <div>
                  <div className="text-green-400 font-semibold">{enhancementStats.tagged.count}</div>
                  <div className="text-gray-500">Tagged</div>
                </div>
                <div>
                  <div className="text-purple-400 font-semibold">{enhancementStats.categorized.count}</div>
                  <div className="text-gray-500">Categorized</div>
                </div>
                <div>
                  <div className="text-yellow-400 font-semibold">{enhancementStats.withSummary.count}</div>
                  <div className="text-gray-500">Summarized</div>
                </div>
              </div>

              {/* Quality Score */}
              <div className="pt-4 border-t border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Memory Collection Quality Score</span>
                  <Badge variant={
                    enhancementStats.enhanced.percentage > 80 ? 'default' :
                    enhancementStats.enhanced.percentage > 50 ? 'secondary' : 
                    'outline'
                  }>
                    {enhancementStats.enhanced.percentage > 80 ? 'Excellent' :
                     enhancementStats.enhanced.percentage > 50 ? 'Good' : 
                     'Needs Improvement'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insight Detail Modal */}
      {selectedInsight && (
        <Dialog open={!!selectedInsight} onOpenChange={() => setSelectedInsight(null)}>
          <DialogContent className="bg-gray-800 border border-gray-600 max-w-3xl">
            <DialogHeader>
              <DialogTitle className="text-white flex items-center gap-2">
                <span className="text-xl">{getInsightIcon(selectedInsight.type)}</span>
                {selectedInsight.title}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-300">{selectedInsight.description}</p>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {selectedInsight.memories.slice(0, 10).map((memory) => (
                  <div key={memory.id} className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-white text-sm font-medium truncate">
                      {memory.content.substring(0, 100)}...
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {memory.tags && memory.tags.length > 0 && (
                        <div className="flex gap-1">
                          {memory.tags.slice(0, 3).map((tag, i) => (
                            <Badge key={i} className="text-xs bg-gray-600 text-gray-300">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEnhanceMemory(memory)}
                        disabled={enhancingMemories.has(memory.id)}
                        className="text-violet-400 hover:text-violet-300 text-xs"
                      >
                        {enhancingMemories.has(memory.id) ? "Enhancing..." : "Enhance"}
                      </Button>
                    </div>
                  </div>
                ))}
                {selectedInsight.memories.length > 10 && (
                  <div className="text-center text-gray-400 text-sm">
                    And {selectedInsight.memories.length - 10} more memories...
                  </div>
                )}
              </div>

              {selectedInsight.action && (
                <Button
                  onClick={() => {
                    handleBulkAction(selectedInsight)
                    setSelectedInsight(null)
                  }}
                  className="bg-violet-600 hover:bg-violet-700 w-full"
                >
                  {selectedInsight.action}
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}