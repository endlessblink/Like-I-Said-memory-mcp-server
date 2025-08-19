import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EnhancementLogs } from './EnhancementLogs'
import { 
  Bot, 
  Zap, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Server, 
  Cpu,
  Memory,
  Settings,
  Play,
  Pause,
  RotateCcw,
  HardDrive
} from 'lucide-react'

interface OllamaModel {
  name: string
  description: string
  size?: string
  modified_at?: string
}

interface OllamaStatus {
  available: boolean
  server_url: string
  models: OllamaModel[]
}

interface ProcessingStats {
  total: number
  processed: number
  successful: number
  failed: number
  currentMemory?: string
  estimatedTimeRemaining?: string
}

interface OllamaEnhancementProps {
  currentProject?: string
  onEnhancementComplete?: () => void
  websocket?: WebSocket
  mode?: 'memories' | 'tasks'
}

const MODEL_RECOMMENDATIONS = {
  lightweight: [
    { name: 'llama3.1:8b', description: 'Fast, good quality (4GB RAM)', category: 'balanced' },
    { name: 'llama3.2:3b', description: 'Very fast, decent quality (2GB RAM)', category: 'lightweight' },
    { name: 'phi3:mini', description: 'Ultra-fast, basic quality (1GB RAM)', category: 'lightweight' }
  ],
  balanced: [
    { name: 'llama3.1:8b', description: 'Best all-around choice (4GB RAM)', category: 'balanced' },
    { name: 'mistral:7b', description: 'Good alternative (4GB RAM)', category: 'balanced' },
    { name: 'codellama:7b', description: 'Better for code content (4GB RAM)', category: 'balanced' }
  ],
  quality: [
    { name: 'llama3.1:70b', description: 'Highest quality (40GB+ RAM)', category: 'quality' },
    { name: 'mixtral:8x7b', description: 'Excellent quality (26GB RAM)', category: 'quality' },
    { name: 'llama3.1:13b', description: 'High quality (8GB RAM)', category: 'quality' }
  ]
}

export function OllamaEnhancement({ currentProject, onEnhancementComplete, websocket, mode = 'memories' }: OllamaEnhancementProps) {
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null)
  const [isCheckingStatus, setIsCheckingStatus] = useState(false)
  const [selectedModel, setSelectedModel] = useState('llama3.1:8b')
  const [batchSize, setBatchSize] = useState(5)
  const [limit, setLimit] = useState(50)
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [skipExisting, setSkipExisting] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStats, setProcessingStats] = useState<ProcessingStats | null>(null)
  const [processingLog, setProcessingLog] = useState<string[]>([])
  const [lastError, setLastError] = useState<string | null>(null)

  // Check Ollama status on component mount and periodically
  useEffect(() => {
    checkOllamaStatus()
    // Check status every 10 seconds
    const interval = setInterval(checkOllamaStatus, 10000)
    return () => clearInterval(interval)
  }, [])

  const checkOllamaStatus = async () => {
    setIsCheckingStatus(true)
    setLastError(null)
    
    try {
      const response = await fetch('/api/mcp-tools/check_ollama_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ show_models: true })
      })
      
      const result = await response.json()
      
      if (result.content) {
        // Parse the response text to extract status
        const content = result.content
        const isAvailable = content.includes('✅ Ollama server is running')
        
        if (isAvailable) {
          // Extract models from response
          const models: OllamaModel[] = []
          const modelLines = content.split('\n').filter((line: string) => line.includes('→'))
          
          for (const line of modelLines) {
            const match = line.match(/→\s*(.+?)\s*\((.+?)\)/)
            if (match) {
              models.push({
                name: match[1].trim(),
                description: match[2].trim()
              })
            }
          }
          
          setOllamaStatus({
            available: true,
            server_url: 'http://localhost:11434',
            models
          })
        } else {
          setOllamaStatus({
            available: false,
            server_url: 'http://localhost:11434',
            models: []
          })
        }
      }
    } catch (error) {
      // Only log if it's not a network error (Ollama not running is expected)
      if (!(error instanceof TypeError && error.message.includes('NetworkError'))) {
        console.warn('Ollama not available:', error)
      }
      setLastError('Ollama not available')
      setOllamaStatus({
        available: false,
        server_url: 'http://localhost:11434',
        models: []
      })
    } finally {
      setIsCheckingStatus(false)
    }
  }

  const startBatchProcessing = async () => {
    setIsProcessing(true)
    setProcessingStats(null)
    setProcessingLog([])
    setLastError(null)
    
    try {
      const params = {
        limit,
        model: selectedModel,
        batch_size: batchSize,
        skip_existing: skipExisting,
        ...(currentProject && { project: currentProject }),
        ...(category !== 'all' && { category }),
        ...(mode === 'tasks' && status !== 'all' && { status })
      }
      
      setProcessingLog(prev => [...prev, `🚀 Starting batch processing with ${selectedModel}...`])
      
      // Add proper timeout and better error handling
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout
      
      const endpoint = mode === 'tasks' ? 
        '/api/mcp-tools/batch_enhance_tasks_ollama' : 
        '/api/mcp-tools/batch_enhance_memories_ollama'
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (result.content) {
        const content = result.content
        setProcessingLog(prev => [...prev, content])
        
        // Parse results for stats
        const successMatch = content.match(/✅ Successfully enhanced: (\d+)/)
        const failedMatch = content.match(/❌ Failed to enhance: (\d+)/)
        const totalMatch = content.match(/📊 Total processed: (\d+)/)
        
        if (successMatch && failedMatch && totalMatch) {
          const total = parseInt(totalMatch[1])
          const successful = parseInt(successMatch[1])
          const failed = parseInt(failedMatch[1])
          
          setProcessingStats({
            total,
            processed: total,
            successful,
            failed
          })
        }
        
        onEnhancementComplete?.()
      } else if (result.error) {
        throw new Error(result.error)
      }
    } catch (error) {
      let errorMessage = `Ollama ${mode} batch processing failed`
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out - batch processing took too long'
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Network error - server may be unavailable'
      } else {
        errorMessage = error.message || errorMessage
      }
      
      console.error('Batch processing error:', error)
      setLastError(errorMessage)
      setProcessingLog(prev => [...prev, `❌ Error: ${errorMessage}`])
    } finally {
      setIsProcessing(false)
    }
  }

  const getModelCategory = (modelName: string) => {
    const allModels = [
      ...MODEL_RECOMMENDATIONS.lightweight,
      ...MODEL_RECOMMENDATIONS.balanced,
      ...MODEL_RECOMMENDATIONS.quality
    ]
    
    const model = allModels.find(m => m.name === modelName)
    return model?.category || 'balanced'
  }

  const getModelBadgeColor = (category: string) => {
    switch (category) {
      case 'lightweight': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'balanced': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'quality': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const estimateProcessingTime = (itemCount: number, model: string) => {
    const timePerItem: Record<string, number> = {
      'phi3:mini': 2,
      'llama3.2:3b': 3,
      'llama3.1:8b': 5,
      'mistral:7b': 6,
      'llama3.1:13b': 8,
      'mixtral:8x7b': 15,
      'llama3.1:70b': 30
    }
    
    const baseTime = timePerItem[model] || 5
    const totalSeconds = itemCount * baseTime
    const minutes = Math.ceil(totalSeconds / 60)
    
    return minutes < 2 ? `~${totalSeconds} seconds` : `~${minutes} minutes`
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Bot className="h-5 w-5 text-violet-400" />
            Ollama Local AI Status
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={checkOllamaStatus}
              disabled={isCheckingStatus}
              className="ml-auto"
            >
              {isCheckingStatus ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Indicator */}
          <div className="flex items-center gap-3">
            {ollamaStatus?.available ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <span className="text-green-300 font-medium">Connected</span>
                </div>
                <Badge variant="outline" className="text-green-300 border-green-500/30">
                  {ollamaStatus.server_url}
                </Badge>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <span className="text-red-300 font-medium">Not Available</span>
                </div>
                <Badge variant="outline" className="text-red-300 border-red-500/30">
                  Check Setup
                </Badge>
              </>
            )}
          </div>

          {/* Models Info */}
          {ollamaStatus?.available && ollamaStatus.models.length > 0 && (
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                <Server className="h-4 w-4" />
                Available Models ({ollamaStatus.models.length})
              </h4>
              <div className="space-y-2">
                {ollamaStatus.models.slice(0, 3).map((model) => (
                  <div key={model.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">{model.name}</span>
                      <Badge 
                        variant="outline" 
                        className={getModelBadgeColor(getModelCategory(model.name))}
                      >
                        {getModelCategory(model.name)}
                      </Badge>
                    </div>
                    {model.description && (
                      <span className="text-gray-400 text-xs">{model.description}</span>
                    )}
                  </div>
                ))}
                {ollamaStatus.models.length > 3 && (
                  <div className="text-xs text-gray-400 text-center">
                    +{ollamaStatus.models.length - 3} more models
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Setup Instructions */}
          {!ollamaStatus?.available && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <h4 className="text-yellow-300 font-medium mb-2">Setup Required</h4>
              <div className="text-sm text-yellow-200 space-y-1">
                <div>1. Install Ollama: <code className="bg-gray-800 px-2 py-1 rounded">curl -fsSL https://ollama.ai/install.sh | sh</code></div>
                <div>2. Start server: <code className="bg-gray-800 px-2 py-1 rounded">ollama serve</code></div>
                <div>3. Pull model: <code className="bg-gray-800 px-2 py-1 rounded">ollama pull llama3.1:8b</code></div>
              </div>
            </div>
          )}

          {lastError && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="text-red-300 text-sm">{lastError}</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhancement Controls */}
      {ollamaStatus?.available && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Settings className="h-5 w-5 text-blue-400" />
              {mode === 'tasks' ? 'Task Enhancement Controls' : 'Memory Enhancement Controls'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Model Selection */}
            <div className="space-y-2">
              <Label className="text-gray-300">AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ollamaStatus.models.map((model) => (
                    <SelectItem key={model.name} value={model.name}>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">{model.name}</span>
                        <Badge 
                          variant="outline" 
                          className={getModelBadgeColor(getModelCategory(model.name))}
                        >
                          {getModelCategory(model.name)}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-gray-400">
                Estimated time for {limit} {mode}: {estimateProcessingTime(limit, selectedModel)}
              </div>
            </div>

            {/* Processing Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">{mode === 'tasks' ? 'Task Limit' : 'Memory Limit'}</Label>
                <Input
                  type="number"
                  value={limit}
                  onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                  className="bg-gray-700 border-gray-600 text-white"
                  min="1"
                  max="500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Batch Size</Label>
                <Input
                  type="number"
                  value={batchSize}
                  onChange={(e) => setBatchSize(parseInt(e.target.value) || 5)}
                  className="bg-gray-700 border-gray-600 text-white"
                  min="1"
                  max="10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Category Filter</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    {mode === 'memories' && (
                      <>
                        <SelectItem value="conversations">Conversations</SelectItem>
                        <SelectItem value="preferences">Preferences</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              {mode === 'tasks' ? (
                <div className="space-y-2">
                  <Label className="text-gray-300">Status Filter</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="todo">Todo</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-gray-300">Skip Existing</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      checked={skipExisting}
                      onChange={(e) => setSkipExisting(e.target.checked)}
                      className="w-4 h-4 text-violet-600 bg-gray-700 border-gray-600 rounded focus:ring-violet-500"
                    />
                    <span className="text-sm text-gray-300">Skip memories with existing titles</span>
                  </div>
                </div>
              )}
            </div>

            {mode === 'tasks' && (
              <div className="space-y-2">
                <Label className="text-gray-300">Skip Existing</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    checked={skipExisting}
                    onChange={(e) => setSkipExisting(e.target.checked)}
                    className="w-4 h-4 text-violet-600 bg-gray-700 border-gray-600 rounded focus:ring-violet-500"
                  />
                  <span className="text-sm text-gray-300">Skip tasks with existing titles/descriptions</span>
                </div>
              </div>
            )}

            {/* Processing Button */}
            <Button
              onClick={startBatchProcessing}
              disabled={isProcessing || !ollamaStatus?.available}
              className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
            >
              {isProcessing ? (
                <div className="flex items-center gap-2">
                  <Pause className="h-4 w-4 animate-pulse" />
                  Processing...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  Enhance {limit} {mode === 'tasks' ? 'Tasks' : 'Memories'}
                </div>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Processing Progress */}
      {(isProcessing || processingStats) && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="h-5 w-5 text-yellow-400" />
              Processing Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {processingStats && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Progress</span>
                    <span className="text-white">{processingStats.processed}/{processingStats.total}</span>
                  </div>
                  <Progress 
                    value={(processingStats.processed / processingStats.total) * 100} 
                    className="h-2"
                  />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-lg font-semibold text-green-400">{processingStats.successful}</div>
                    <div className="text-xs text-gray-400">Successful</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-lg font-semibold text-red-400">{processingStats.failed}</div>
                    <div className="text-xs text-gray-400">Failed</div>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-3">
                    <div className="text-lg font-semibold text-blue-400">{processingStats.total}</div>
                    <div className="text-xs text-gray-400">Total</div>
                  </div>
                </div>
              </>
            )}

            {processingLog.length > 0 && (
              <div className="bg-gray-900/50 rounded-lg p-4 max-h-32 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-300 mb-2">Processing Log</h4>
                <div className="space-y-1">
                  {processingLog.slice(-5).map((log, i) => (
                    <div key={i} className="text-xs text-gray-400 font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Enhancement Logs */}
      <EnhancementLogs websocket={websocket} />
    </div>
  )
}