import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Memory } from '@/types'

interface AIEnhancementProps {
  memories: Memory[]
  onEnhanceMemory: (memory: Memory) => Promise<void>
  onEnhanceAll: () => Promise<void>
  enhancingMemories: Set<string>
  isEnhancing: boolean
  llmProvider: "openai" | "anthropic" | "none"
  llmApiKey: string
  onProviderChange: (provider: "openai" | "anthropic" | "none") => void
  onApiKeyChange: (key: string) => void
  onSaveSettings: () => void
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
  onSaveSettings
}: AIEnhancementProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<AIInsight | null>(null)

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
                      <SelectItem value="openai">OpenAI (GPT-3.5/4)</SelectItem>
                      <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {llmProvider !== "none" && (
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

      {/* Enhancement Status */}
      {enhancingMemories.size > 0 && (
        <Alert>
          <div className="animate-spin">🔄</div>
          <AlertDescription>
            <div className="font-medium">
              Enhancing {enhancingMemories.size} memory{enhancingMemories.size !== 1 ? 'ies' : ''}...
            </div>
            <div className="text-sm text-muted-foreground">
              AI is generating titles, summaries, and tags for your memories
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Enhancement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <div className="font-medium">Enhanced Memories</div>
                <div className="text-sm text-muted-foreground">
                  {memories.filter(m => (m.tags || []).some(tag => tag.startsWith('title:'))).length} / {memories.length}
                </div>
                <Progress 
                  value={(memories.filter(m => (m.tags || []).some(tag => tag.startsWith('title:'))).length / memories.length) * 100} 
                  className="h-1 mt-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏷️</span>
              <div>
                <div className="font-medium">Auto-Tagged</div>
                <div className="text-sm text-muted-foreground">
                  {memories.filter(m => m.tags && m.tags.length > 0).length} / {memories.length}
                </div>
                <Progress 
                  value={(memories.filter(m => m.tags && m.tags.length > 0).length / memories.length) * 100} 
                  className="h-1 mt-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📂</span>
              <div>
                <div className="font-medium">Categorized</div>
                <div className="text-sm text-muted-foreground">
                  {memories.filter(m => m.category).length} / {memories.length}
                </div>
                <Progress 
                  value={(memories.filter(m => m.category).length / memories.length) * 100} 
                  className="h-1 mt-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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