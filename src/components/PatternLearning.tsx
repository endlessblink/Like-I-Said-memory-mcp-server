import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Settings, 
  Trash2, 
  Edit3, 
  Plus, 
  TrendingUp, 
  TrendingDown,
  Eye,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { 
  LearnedPattern, 
  PatternThreshold, 
  ReflectionData 
} from '@/types'

interface PatternLearningProps {
  className?: string
}

interface PatternFormData {
  type: LearnedPattern['type']
  description: string
  indicators: string[]
  confidence: number
}

export function PatternLearning({ className }: PatternLearningProps) {
  const [reflectionData, setReflectionData] = useState<ReflectionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [editingPattern, setEditingPattern] = useState<LearnedPattern | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [patternForm, setPatternForm] = useState<PatternFormData>({
    type: 'work_detection',
    description: '',
    indicators: [''],
    confidence: 0.5
  })
  const [expandedPattern, setExpandedPattern] = useState<string | null>(null)
  const [thresholdAdjustments, setThresholdAdjustments] = useState<Record<string, number>>({})

  const fetchReflectionData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/reflection/data')
      if (response.ok) {
        const data = await response.json()
        setReflectionData(data)
        // Initialize threshold adjustments
        const adjustments: Record<string, number> = {}
        Object.entries(data.thresholds || {}).forEach(([key, threshold]: [string, any]) => {
          adjustments[key] = threshold.current
        })
        setThresholdAdjustments(adjustments)
      }
    } catch (error) {
      console.error('Failed to fetch reflection data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReflectionData()
  }, [])

  const handleCreatePattern = async () => {
    try {
      const response = await fetch('/api/reflection/patterns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...patternForm,
          indicators: patternForm.indicators.filter(i => i.trim())
        })
      })
      
      if (response.ok) {
        await fetchReflectionData()
        setIsCreateDialogOpen(false)
        setPatternForm({
          type: 'work_detection',
          description: '',
          indicators: [''],
          confidence: 0.5
        })
      }
    } catch (error) {
      console.error('Failed to create pattern:', error)
    }
  }

  const handleDeletePattern = async (patternId: string) => {
    try {
      const response = await fetch(`/api/reflection/patterns/${patternId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await fetchReflectionData()
      }
    } catch (error) {
      console.error('Failed to delete pattern:', error)
    }
  }

  const handleUpdateThreshold = async (key: string, value: number) => {
    try {
      const response = await fetch('/api/reflection/thresholds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      })
      
      if (response.ok) {
        await fetchReflectionData()
      }
    } catch (error) {
      console.error('Failed to update threshold:', error)
    }
  }

  const handleProvideFeedback = async (patternId: string, feedback: 'positive' | 'negative') => {
    try {
      const response = await fetch('/api/reflection/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patternId, feedback })
      })
      
      if (response.ok) {
        await fetchReflectionData()
      }
    } catch (error) {
      console.error('Failed to provide feedback:', error)
    }
  }

  const updatePatternFormIndicator = (index: number, value: string) => {
    const newIndicators = [...patternForm.indicators]
    newIndicators[index] = value
    setPatternForm({ ...patternForm, indicators: newIndicators })
  }

  const addPatternIndicator = () => {
    setPatternForm({ 
      ...patternForm, 
      indicators: [...patternForm.indicators, ''] 
    })
  }

  const removePatternIndicator = (index: number) => {
    if (patternForm.indicators.length > 1) {
      const newIndicators = patternForm.indicators.filter((_, i) => i !== index)
      setPatternForm({ ...patternForm, indicators: newIndicators })
    }
  }

  const getPatternTypeColor = (type: LearnedPattern['type']) => {
    switch (type) {
      case 'problem_solving': return 'bg-blue-100 text-blue-800'
      case 'work_detection': return 'bg-green-100 text-green-800'
      case 'memory_search': return 'bg-purple-100 text-purple-800'
      case 'task_creation': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (confidence >= 0.6) return <CheckCircle className="h-4 w-4 text-yellow-500" />
    return <AlertTriangle className="h-4 w-4 text-red-500" />
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading pattern learning data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Brain className="h-6 w-6 text-purple-600" />
          <h2 className="text-2xl font-bold">Pattern Learning</h2>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Pattern
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Learning Pattern</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pattern-type">Pattern Type</Label>
                  <select
                    id="pattern-type"
                    className="w-full mt-1 p-2 border rounded-md"
                    value={patternForm.type}
                    onChange={(e) => setPatternForm({ 
                      ...patternForm, 
                      type: e.target.value as LearnedPattern['type'] 
                    })}
                  >
                    <option value="work_detection">Work Detection</option>
                    <option value="problem_solving">Problem Solving</option>
                    <option value="memory_search">Memory Search</option>
                    <option value="task_creation">Task Creation</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what this pattern detects..."
                    value={patternForm.description}
                    onChange={(e) => setPatternForm({ 
                      ...patternForm, 
                      description: e.target.value 
                    })}
                  />
                </div>

                <div>
                  <Label>Key Indicators</Label>
                  <div className="space-y-2 mt-1">
                    {patternForm.indicators.map((indicator, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          placeholder="Pattern indicator..."
                          value={indicator}
                          onChange={(e) => updatePatternFormIndicator(index, e.target.value)}
                        />
                        {patternForm.indicators.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removePatternIndicator(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addPatternIndicator}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Indicator
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confidence">Initial Confidence: {patternForm.confidence.toFixed(2)}</Label>
                  <input
                    id="confidence"
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={patternForm.confidence}
                    onChange={(e) => setPatternForm({ 
                      ...patternForm, 
                      confidence: parseFloat(e.target.value) 
                    })}
                    className="w-full mt-1"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreatePattern}>
                  Create Pattern
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={fetchReflectionData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns">Active Patterns</TabsTrigger>
          <TabsTrigger value="thresholds">Thresholds</TabsTrigger>
          <TabsTrigger value="insights">Learning Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          {/* Active Patterns */}
          <div className="space-y-4">
            {reflectionData?.patterns.map((pattern) => (
              <Card key={pattern.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getConfidenceIcon(pattern.confidence)}
                      <div>
                        <CardTitle className="text-lg">{pattern.description}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getPatternTypeColor(pattern.type)}>
                            {pattern.type.replace('_', ' ')}
                          </Badge>
                          <Badge variant="outline">
                            {(pattern.confidence * 100).toFixed(1)}% confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setExpandedPattern(
                          expandedPattern === pattern.id ? null : pattern.id
                        )}
                      >
                        {expandedPattern === pattern.id ? 
                          <EyeOff className="h-4 w-4" /> : 
                          <Eye className="h-4 w-4" />
                        }
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePattern(pattern.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {expandedPattern === pattern.id && (
                  <CardContent>
                    <div className="space-y-4">
                      {/* Pattern Statistics */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Success Rate</p>
                          <p className="text-lg font-semibold">
                            {(pattern.successRate * 100).toFixed(1)}%
                          </p>
                          <Progress value={pattern.successRate * 100} className="mt-1" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Times Triggered</p>
                          <p className="text-lg font-semibold">{pattern.timesTriggered}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Created</p>
                          <p className="text-sm">{new Date(pattern.created).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Last Triggered</p>
                          <p className="text-sm">{new Date(pattern.lastTriggered).toLocaleDateString()}</p>
                        </div>
                      </div>

                      {/* Pattern Indicators */}
                      <div>
                        <p className="text-sm font-medium mb-2">Key Indicators:</p>
                        <div className="flex flex-wrap gap-2">
                          {pattern.indicators.map((indicator, index) => (
                            <Badge key={index} variant="secondary">
                              {indicator}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Feedback Controls */}
                      <div className="flex items-center space-x-2 pt-2 border-t">
                        <p className="text-sm text-muted-foreground">Pattern accuracy:</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProvideFeedback(pattern.id, 'positive')}
                        >
                          <ArrowUp className="h-4 w-4 mr-1" />
                          Helpful
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleProvideFeedback(pattern.id, 'negative')}
                        >
                          <ArrowDown className="h-4 w-4 mr-1" />
                          Not Helpful
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}

            {(!reflectionData?.patterns || reflectionData.patterns.length === 0) && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Patterns Learned Yet</h3>
                  <p className="text-muted-foreground">
                    The system will automatically learn patterns from your usage.
                    You can also create custom patterns to improve detection.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="thresholds" className="space-y-4">
          {/* Pattern Thresholds */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                Detection Thresholds
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(reflectionData?.thresholds || {}).map(([key, threshold]: [string, any]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="capitalize">{key.replace('_', ' ')}</Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          Current: {threshold.current}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          (Baseline: {threshold.baseline})
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min={threshold.min}
                        max={threshold.max}
                        step="0.1"
                        value={thresholdAdjustments[key] || threshold.current}
                        onChange={(e) => setThresholdAdjustments({
                          ...thresholdAdjustments,
                          [key]: parseFloat(e.target.value)
                        })}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleUpdateThreshold(key, thresholdAdjustments[key])}
                        disabled={thresholdAdjustments[key] === threshold.current}
                      >
                        Update
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last adjusted: {new Date(threshold.lastAdjusted).toLocaleDateString()}
                      {threshold.adjustmentReason && ` - ${threshold.adjustmentReason}`}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {/* Learning Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Learning Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Confidence by Category</h4>
                  <div className="space-y-3">
                    {Object.entries(reflectionData?.confidence.byCategory || {}).map(([category, confidence]: [string, any]) => (
                      <div key={category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="capitalize">{category.replace('_', ' ')}</span>
                          <span>{(confidence * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={confidence * 100} />
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">System Overview</h4>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Overall Confidence</p>
                      <div className="text-2xl font-bold">
                        {((reflectionData?.confidence.overall || 0) * 100).toFixed(1)}%
                      </div>
                      <Progress value={(reflectionData?.confidence.overall || 0) * 100} />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Active Patterns</p>
                      <p className="text-lg font-semibold">{reflectionData?.patterns.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Last Learning Update</p>
                      <p className="text-sm">
                        {reflectionData?.lastLearning 
                          ? new Date(reflectionData.lastLearning).toLocaleDateString()
                          : 'No data'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}