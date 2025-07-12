import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Sparkles, 
  Settings, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Target,
  ListTodo,
  Zap,
  Brain,
  TrendingUp,
  FileText,
  Tag,
  Calendar,
  Users,
  Shield,
  WifiOff
} from 'lucide-react'

interface Task {
  id: string
  serial: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  project: string
  category?: string
  created: string
  updated: string
  tags?: string[]
  memory_connections?: Array<{
    memory_id: string
    memory_serial: string
    connection_type: string
    relevance: number
  }>
}

interface TaskEnhancementProps {
  tasks: Task[]
  currentProject?: string
  onTasksChange: () => void
}

interface EnhancementProgress {
  completed: number
  total: number
  currentTaskId?: string
  stage: 'analyzing' | 'generating' | 'completing' | 'idle'
  errors: Array<{ taskId: string; error: string }>
  startTime?: Date
  estimatedTimeRemaining?: number
}

interface TaskInsight {
  type: 'quality' | 'completion' | 'organization' | 'metadata' | 'relationships'
  title: string
  description: string
  tasks: Task[]
  action?: string
  severity: 'low' | 'medium' | 'high'
}

interface TaskQualityMetrics {
  hasGoodTitle: boolean
  hasDescription: boolean
  hasTags: boolean
  hasMemoryConnections: boolean
  isWellCategorized: boolean
  overallScore: number
}

export function TaskEnhancement({ 
  tasks, 
  currentProject = 'all',
  onTasksChange 
}: TaskEnhancementProps) {
  const [enhancementProgress, setEnhancementProgress] = useState<EnhancementProgress>({
    completed: 0,
    total: 0,
    stage: 'idle',
    errors: []
  })
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [showProgressDetails, setShowProgressDetails] = useState(false)
  const [selectedInsight, setSelectedInsight] = useState<TaskInsight | null>(null)
  const [enhancementSettings, setEnhancementSettings] = useState({
    model: 'llama3.1:8b',
    batchSize: 5,
    skipExisting: true,
    enhanceDescriptions: true,
    generateTags: true,
    improveCategories: true
  })
  const [ollamaStatus, setOllamaStatus] = useState<{
    available: boolean
    models: string[]
    checking: boolean
  }>({
    available: false,
    models: [],
    checking: false
  })

  // Filter tasks based on current project
  const filteredTasks = currentProject === 'all' 
    ? tasks 
    : tasks.filter(task => task.project === currentProject)

  // Check Ollama status on component mount
  useEffect(() => {
    checkOllamaStatus()
  }, [])

  const checkOllamaStatus = async () => {
    setOllamaStatus(prev => ({ ...prev, checking: true }))
    try {
      const response = await fetch('/api/ollama/status')
      if (response.ok) {
        const data = await response.json()
        setOllamaStatus({
          available: data.available,
          models: data.models || [],
          checking: false
        })
      } else {
        setOllamaStatus({
          available: false,
          models: [],
          checking: false
        })
      }
    } catch (error) {
      console.error('Failed to check Ollama status:', error)
      setOllamaStatus({
        available: false,
        models: [],
        checking: false
      })
    }
  }

  // Calculate task quality metrics
  const calculateTaskQuality = (task: Task): TaskQualityMetrics => {
    const hasGoodTitle = task.title && task.title.length > 10 && !task.title.includes('undefined')
    const hasDescription = Boolean(task.description && task.description.length > 20)
    const hasTags = Boolean(task.tags && task.tags.length > 0)
    const hasMemoryConnections = Boolean(task.memory_connections && task.memory_connections.length > 0)
    const isWellCategorized = Boolean(task.category)

    const qualityFactors = [hasGoodTitle, hasDescription, hasTags, hasMemoryConnections, isWellCategorized]
    const overallScore = Math.round((qualityFactors.filter(Boolean).length / qualityFactors.length) * 100)

    return {
      hasGoodTitle,
      hasDescription,
      hasTags,
      hasMemoryConnections,
      isWellCategorized,
      overallScore
    }
  }

  // Generate insights about task collection
  const generateInsights = (): TaskInsight[] => {
    const insights: TaskInsight[] = []

    // Find tasks that need better titles
    const poorTitles = filteredTasks.filter(task => {
      const quality = calculateTaskQuality(task)
      return !quality.hasGoodTitle
    })
    if (poorTitles.length > 0) {
      insights.push({
        type: 'quality',
        title: 'Poor Task Titles',
        description: `${poorTitles.length} tasks have titles that could be improved with AI enhancement.`,
        tasks: poorTitles,
        action: 'Enhance Titles',
        severity: 'medium'
      })
    }

    // Find tasks without descriptions
    const noDescriptions = filteredTasks.filter(task => {
      const quality = calculateTaskQuality(task)
      return !quality.hasDescription
    })
    if (noDescriptions.length > 0) {
      insights.push({
        type: 'metadata',
        title: 'Missing Descriptions',
        description: `${noDescriptions.length} tasks lack detailed descriptions.`,
        tasks: noDescriptions,
        action: 'Generate Descriptions',
        severity: 'low'
      })
    }

    // Find untagged tasks
    const untagged = filteredTasks.filter(task => {
      const quality = calculateTaskQuality(task)
      return !quality.hasTags
    })
    if (untagged.length > 0) {
      insights.push({
        type: 'organization',
        title: 'Untagged Tasks',
        description: `${untagged.length} tasks could benefit from AI-generated tags.`,
        tasks: untagged,
        action: 'Generate Tags',
        severity: 'low'
      })
    }

    // Find tasks without memory connections
    const disconnected = filteredTasks.filter(task => {
      const quality = calculateTaskQuality(task)
      return !quality.hasMemoryConnections
    })
    if (disconnected.length > 0) {
      insights.push({
        type: 'relationships',
        title: 'Disconnected Tasks',
        description: `${disconnected.length} tasks have no memory connections.`,
        tasks: disconnected,
        action: 'Link Memories',
        severity: 'medium'
      })
    }

    // Find low-quality tasks (overall score < 60%)
    const lowQuality = filteredTasks.filter(task => {
      const quality = calculateTaskQuality(task)
      return quality.overallScore < 60
    })
    if (lowQuality.length > 0) {
      insights.push({
        type: 'quality',
        title: 'Low Quality Tasks',
        description: `${lowQuality.length} tasks have an overall quality score below 60%.`,
        tasks: lowQuality,
        action: 'Enhance All',
        severity: 'high'
      })
    }

    return insights.sort((a, b) => {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      return severityOrder[b.severity] - severityOrder[a.severity]
    })
  }

  // Calculate overall statistics
  const getTaskStatistics = () => {
    const total = filteredTasks.length
    const qualityScores = filteredTasks.map(task => calculateTaskQuality(task).overallScore)
    const averageQuality = qualityScores.length > 0 
      ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length)
      : 0

    const statusCounts = filteredTasks.reduce((counts, task) => {
      counts[task.status] = (counts[task.status] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    const needsEnhancement = filteredTasks.filter(task => 
      calculateTaskQuality(task).overallScore < 80
    ).length

    return {
      total,
      averageQuality,
      statusCounts,
      needsEnhancement,
      enhancementPercentage: total > 0 ? Math.round(((total - needsEnhancement) / total) * 100) : 0
    }
  }

  // Start batch enhancement
  const startBatchEnhancement = async (insight?: TaskInsight) => {
    if (!ollamaStatus.available) {
      alert('Ollama is not available. Please ensure Ollama is running and try again.')
      return
    }

    const tasksToEnhance = insight ? insight.tasks : filteredTasks.filter(task => 
      calculateTaskQuality(task).overallScore < 80
    )

    if (tasksToEnhance.length === 0) {
      alert('No tasks need enhancement.')
      return
    }

    setIsEnhancing(true)
    setEnhancementProgress({
      completed: 0,
      total: tasksToEnhance.length,
      stage: 'analyzing',
      errors: [],
      startTime: new Date()
    })

    try {
      const response = await fetch('/api/mcp/batch_enhance_tasks_ollama', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project: currentProject === 'all' ? undefined : currentProject,
          limit: tasksToEnhance.length,
          model: enhancementSettings.model,
          batchSize: enhancementSettings.batchSize,
          skipExisting: enhancementSettings.skipExisting
        })
      })

      if (response.ok) {
        setEnhancementProgress(prev => ({ ...prev, stage: 'completing' }))
        onTasksChange() // Refresh tasks
        
        // Simulate progress completion
        setTimeout(() => {
          setEnhancementProgress(prev => ({ 
            ...prev, 
            completed: prev.total,
            stage: 'idle'
          }))
          setIsEnhancing(false)
        }, 1000)
      } else {
        throw new Error('Enhancement request failed')
      }
    } catch (error) {
      console.error('Enhancement failed:', error)
      setEnhancementProgress(prev => ({
        ...prev,
        errors: [...prev.errors, { taskId: 'batch', error: error.message }],
        stage: 'idle'
      }))
      setIsEnhancing(false)
    }
  }

  const insights = generateInsights()
  const statistics = getTaskStatistics()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-400" />
            Task Enhancement
          </h2>
          <p className="text-gray-400 mt-1">
            AI-powered task optimization and quality improvement
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={checkOllamaStatus}
          disabled={ollamaStatus.checking}
          className="flex items-center gap-2"
        >
          {ollamaStatus.checking ? (
            <>
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Checking...
            </>
          ) : ollamaStatus.available ? (
            <>
              <Shield className="w-4 h-4 text-green-400" />
              Ollama Connected
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-400" />
              Ollama Offline
            </>
          )}
        </Button>
      </div>

      {/* Ollama Status Alert */}
      {!ollamaStatus.available && !ollamaStatus.checking && (
        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertCircle className="w-4 h-4 text-orange-400" />
          <AlertDescription className="text-orange-300">
            Ollama is not available. Task enhancement requires a local Ollama installation.
            <br />
            Please install and start Ollama, then click "Check Status" to reconnect.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="batch">Batch Operations</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <ListTodo className="w-4 h-4" />
                  Total Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-100">{statistics.total}</div>
                <p className="text-xs text-gray-400 mt-1">
                  {currentProject === 'all' ? 'All projects' : currentProject}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Quality Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-100">{statistics.averageQuality}%</div>
                <Progress 
                  value={statistics.averageQuality} 
                  className="mt-2 h-2"
                />
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Enhancement Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-100">{statistics.enhancementPercentage}%</div>
                <p className="text-xs text-gray-400 mt-1">
                  {statistics.total - statistics.needsEnhancement} of {statistics.total} enhanced
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Needs Enhancement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-400">{statistics.needsEnhancement}</div>
                <Button 
                  size="sm" 
                  className="mt-2 w-full"
                  onClick={() => startBatchEnhancement()}
                  disabled={!ollamaStatus.available || isEnhancing || statistics.needsEnhancement === 0}
                >
                  {isEnhancing ? 'Enhancing...' : 'Enhance All'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Progress Display */}
          {isEnhancing && (
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardHeader>
                <CardTitle className="text-blue-300 flex items-center gap-2">
                  <Brain className="w-5 h-5 animate-pulse" />
                  Enhancement in Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    Stage: <span className="capitalize text-blue-300">{enhancementProgress.stage}</span>
                  </span>
                  <span className="text-gray-300">
                    {enhancementProgress.completed} / {enhancementProgress.total}
                  </span>
                </div>
                <Progress 
                  value={(enhancementProgress.completed / enhancementProgress.total) * 100} 
                  className="h-2"
                />
                {enhancementProgress.errors.length > 0 && (
                  <div className="text-sm text-red-400">
                    {enhancementProgress.errors.length} errors occurred
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {insights.length === 0 ? (
            <Card className="bg-green-500/10 border-green-500/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-300 mb-2">
                    All Tasks Look Great!
                  </h3>
                  <p className="text-green-200">
                    Your tasks are well-organized and don't need immediate enhancement.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <Card 
                  key={index} 
                  className={`bg-gray-800/50 border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer ${
                    insight.severity === 'high' ? 'border-red-500/30' :
                    insight.severity === 'medium' ? 'border-orange-500/30' :
                    'border-gray-700'
                  }`}
                  onClick={() => setSelectedInsight(insight)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-gray-100 flex items-center gap-2">
                        {insight.type === 'quality' && <Target className="w-5 h-5 text-red-400" />}
                        {insight.type === 'metadata' && <FileText className="w-5 h-5 text-blue-400" />}
                        {insight.type === 'organization' && <Tag className="w-5 h-5 text-purple-400" />}
                        {insight.type === 'relationships' && <Users className="w-5 h-5 text-green-400" />}
                        {insight.title}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={insight.severity === 'high' ? 'destructive' : 'outline'}
                          className={
                            insight.severity === 'high' ? 'bg-red-500/20 text-red-300 border-red-500/30' :
                            insight.severity === 'medium' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
                            'bg-gray-500/20 text-gray-300 border-gray-500/30'
                          }
                        >
                          {insight.severity}
                        </Badge>
                        <Badge variant="outline" className="text-blue-300 border-blue-500/30">
                          {insight.tasks.length} tasks
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 mb-3">{insight.description}</p>
                    {insight.action && (
                      <Button 
                        size="sm" 
                        onClick={(e) => {
                          e.stopPropagation()
                          startBatchEnhancement(insight)
                        }}
                        disabled={!ollamaStatus.available || isEnhancing}
                        className="flex items-center gap-2"
                      >
                        <Sparkles className="w-4 h-4" />
                        {insight.action}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="batch" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-100">Batch Enhancement Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button
                  onClick={() => startBatchEnhancement()}
                  disabled={!ollamaStatus.available || isEnhancing}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <Sparkles className="w-6 h-6" />
                  <span>Enhance All Tasks</span>
                  <span className="text-xs opacity-75">
                    Improve {statistics.needsEnhancement} tasks
                  </span>
                </Button>

                <Button
                  variant="outline"
                  onClick={() => {/* TODO: Implement specific enhancements */}}
                  disabled={!ollamaStatus.available || isEnhancing}
                  className="h-20 flex flex-col items-center justify-center gap-2"
                >
                  <Tag className="w-6 h-6" />
                  <span>Generate Tags Only</span>
                  <span className="text-xs opacity-75">
                    Add tags to untagged tasks
                  </span>
                </Button>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Enhancement Options</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input 
                      type="checkbox" 
                      checked={enhancementSettings.enhanceDescriptions}
                      onChange={(e) => setEnhancementSettings(prev => ({
                        ...prev,
                        enhanceDescriptions: e.target.checked
                      }))}
                      className="rounded border-gray-600"
                    />
                    Improve task descriptions
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input 
                      type="checkbox" 
                      checked={enhancementSettings.generateTags}
                      onChange={(e) => setEnhancementSettings(prev => ({
                        ...prev,
                        generateTags: e.target.checked
                      }))}
                      className="rounded border-gray-600"
                    />
                    Generate relevant tags
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300">
                    <input 
                      type="checkbox" 
                      checked={enhancementSettings.improveCategories}
                      onChange={(e) => setEnhancementSettings(prev => ({
                        ...prev,
                        improveCategories: e.target.checked
                      }))}
                      className="rounded border-gray-600"
                    />
                    Optimize categories
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-100">Enhancement Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Ollama Model
                </label>
                <Select 
                  value={enhancementSettings.model} 
                  onValueChange={(value) => setEnhancementSettings(prev => ({
                    ...prev,
                    model: value
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ollamaStatus.models.map(model => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                    {ollamaStatus.models.length === 0 && (
                      <SelectItem value="llama3.1:8b">llama3.1:8b (default)</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">
                  Batch Size: {enhancementSettings.batchSize}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={enhancementSettings.batchSize}
                  onChange={(e) => setEnhancementSettings(prev => ({
                    ...prev,
                    batchSize: parseInt(e.target.value)
                  }))}
                  className="w-full"
                />
                <div className="text-xs text-gray-400 mt-1">
                  Number of tasks to process simultaneously
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm text-gray-300">
                  <input 
                    type="checkbox" 
                    checked={enhancementSettings.skipExisting}
                    onChange={(e) => setEnhancementSettings(prev => ({
                      ...prev,
                      skipExisting: e.target.checked
                    }))}
                    className="rounded border-gray-600"
                  />
                  Skip already enhanced tasks
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}