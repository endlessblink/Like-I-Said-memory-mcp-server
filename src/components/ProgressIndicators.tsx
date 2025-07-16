import React, { useState, useEffect } from 'react'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Clock,
  X,
  Pause,
  Play,
  Square
} from 'lucide-react'

export interface ProgressOperation {
  id: string
  title: string
  description?: string
  total: number
  completed: number
  status: 'running' | 'paused' | 'completed' | 'error' | 'cancelled'
  error?: string
  startTime: number
  estimatedTimeRemaining?: number
  canCancel?: boolean
  canPause?: boolean
  onCancel?: () => void
  onPause?: () => void
  onResume?: () => void
}

interface ProgressManagerContextType {
  operations: ProgressOperation[]
  startOperation: (operation: Omit<ProgressOperation, 'id' | 'startTime' | 'status'>) => string
  updateOperation: (id: string, updates: Partial<ProgressOperation>) => void
  completeOperation: (id: string, success?: boolean, error?: string) => void
  cancelOperation: (id: string) => void
  pauseOperation: (id: string) => void
  resumeOperation: (id: string) => void
  removeOperation: (id: string) => void
}

const ProgressManagerContext = React.createContext<ProgressManagerContextType | undefined>(undefined)

export function useProgress() {
  const context = React.useContext(ProgressManagerContext)
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider')
  }
  return context
}

interface ProgressProviderProps {
  children: React.ReactNode
  maxOperations?: number
}

export function ProgressProvider({ children, maxOperations = 5 }: ProgressProviderProps) {
  const [operations, setOperations] = useState<ProgressOperation[]>([])

  const startOperation = (operation: Omit<ProgressOperation, 'id' | 'startTime' | 'status'>) => {
    const id = Math.random().toString(36).substring(2, 15)
    const newOperation: ProgressOperation = {
      ...operation,
      id,
      startTime: Date.now(),
      status: 'running',
      completed: 0
    }

    setOperations(prev => {
      const updated = [newOperation, ...prev]
      return updated.slice(0, maxOperations)
    })

    return id
  }

  const updateOperation = (id: string, updates: Partial<ProgressOperation>) => {
    setOperations(prev => prev.map(op => {
      if (op.id === id) {
        const updated = { ...op, ...updates }
        
        // Calculate estimated time remaining
        if (updated.completed > 0 && updated.total > 0 && updated.status === 'running') {
          const elapsed = Date.now() - op.startTime
          const rate = updated.completed / elapsed
          const remaining = (updated.total - updated.completed) / rate
          updated.estimatedTimeRemaining = remaining
        }
        
        return updated
      }
      return op
    }))
  }

  const completeOperation = (id: string, success = true, error?: string) => {
    updateOperation(id, {
      status: success ? 'completed' : 'error',
      completed: success ? operations.find(op => op.id === id)?.total || 0 : undefined,
      error: error
    })

    // Auto-remove completed operations after 5 seconds
    setTimeout(() => {
      removeOperation(id)
    }, 5000)
  }

  const cancelOperation = (id: string) => {
    const operation = operations.find(op => op.id === id)
    if (operation?.onCancel) {
      operation.onCancel()
    }
    updateOperation(id, { status: 'cancelled' })
    
    // Auto-remove cancelled operations after 3 seconds
    setTimeout(() => {
      removeOperation(id)
    }, 3000)
  }

  const pauseOperation = (id: string) => {
    const operation = operations.find(op => op.id === id)
    if (operation?.onPause) {
      operation.onPause()
    }
    updateOperation(id, { status: 'paused' })
  }

  const resumeOperation = (id: string) => {
    const operation = operations.find(op => op.id === id)
    if (operation?.onResume) {
      operation.onResume()
    }
    updateOperation(id, { status: 'running' })
  }

  const removeOperation = (id: string) => {
    setOperations(prev => prev.filter(op => op.id !== id))
  }

  const value: ProgressManagerContextType = {
    operations,
    startOperation,
    updateOperation,
    completeOperation,
    cancelOperation,
    pauseOperation,
    resumeOperation,
    removeOperation
  }

  return (
    <ProgressManagerContext.Provider value={value}>
      {children}
      <ProgressOverlay />
    </ProgressManagerContext.Provider>
  )
}

function ProgressOverlay() {
  const { operations } = useProgress()
  const activeOperations = operations.filter(op => 
    op.status === 'running' || op.status === 'paused' || 
    (op.status === 'completed' || op.status === 'error' || op.status === 'cancelled')
  )

  if (activeOperations.length === 0) {
    return null
  }

  return (
    <div className="fixed bottom-safe right-4 z-[9998] flex flex-col gap-2 pointer-events-none max-w-sm pb-4">
      {activeOperations.map((operation) => (
        <ProgressCard key={operation.id} operation={operation} />
      ))}
    </div>
  )
}

interface ProgressCardProps {
  operation: ProgressOperation
}

function ProgressCard({ operation }: ProgressCardProps) {
  const { cancelOperation, pauseOperation, resumeOperation, removeOperation } = useProgress()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => removeOperation(operation.id), 300)
  }

  const getProgressPercentage = () => {
    if (operation.total === 0) return 0
    return Math.round((operation.completed / operation.total) * 100)
  }

  const getStatusIcon = () => {
    switch (operation.status) {
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
      case 'paused':
        return <Pause className="w-4 h-4 text-yellow-400" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'cancelled':
        return <Square className="w-4 h-4 text-gray-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    switch (operation.status) {
      case 'running':
        return 'border-blue-500/30'
      case 'paused':
        return 'border-yellow-500/30'
      case 'completed':
        return 'border-green-500/30'
      case 'error':
        return 'border-red-500/30'
      case 'cancelled':
        return 'border-gray-500/30'
      default:
        return 'border-gray-600/30'
    }
  }

  const formatTimeRemaining = (ms: number) => {
    const seconds = Math.round(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.round(seconds / 60)
    if (minutes < 60) return `${minutes}m`
    const hours = Math.round(minutes / 60)
    return `${hours}h`
  }

  return (
    <Card
      className={`pointer-events-auto relative overflow-hidden bg-gray-800/95 border backdrop-blur-sm transition-all duration-300 transform ${
        isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-full opacity-0 scale-95'
      } ${getStatusColor()}`}
    >
      <CardContent className="p-4 w-80">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {getStatusIcon()}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white text-sm truncate">
                {operation.title}
              </h4>
              <button
                onClick={handleDismiss}
                className="p-1 rounded-md hover:bg-gray-700/50 transition-colors flex-shrink-0"
              >
                <X className="w-3 h-3 text-gray-400 hover:text-white" />
              </button>
            </div>

            {/* Description */}
            {operation.description && (
              <p className="text-xs text-gray-300 mb-3">
                {operation.description}
              </p>
            )}

            {/* Progress Bar */}
            <div className="mb-3">
              <Progress 
                value={getProgressPercentage()} 
                className="h-2 mb-1"
              />
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>
                  {operation.completed} of {operation.total}
                  {operation.status === 'running' && operation.estimatedTimeRemaining && (
                    <span className="ml-2">
                      ({formatTimeRemaining(operation.estimatedTimeRemaining)} remaining)
                    </span>
                  )}
                </span>
                <span>{getProgressPercentage()}%</span>
              </div>
            </div>

            {/* Error Message */}
            {operation.status === 'error' && operation.error && (
              <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-xs text-red-300">
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span className="font-medium">Error:</span>
                </div>
                <div className="mt-1">{operation.error}</div>
              </div>
            )}

            {/* Status Message */}
            <div className="text-xs text-gray-400 mb-3">
              {operation.status === 'running' && 'In progress...'}
              {operation.status === 'paused' && 'Paused'}
              {operation.status === 'completed' && 'Completed successfully'}
              {operation.status === 'error' && 'Failed'}
              {operation.status === 'cancelled' && 'Cancelled'}
            </div>

            {/* Action Buttons */}
            {(operation.status === 'running' || operation.status === 'paused') && (
              <div className="flex gap-2">
                {operation.status === 'running' && operation.canPause && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => pauseOperation(operation.id)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs h-6 px-2"
                  >
                    <Pause className="w-3 h-3" />
                  </Button>
                )}
                
                {operation.status === 'paused' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resumeOperation(operation.id)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs h-6 px-2"
                  >
                    <Play className="w-3 h-3" />
                  </Button>
                )}
                
                {operation.canCancel && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelOperation(operation.id)}
                    className="border-red-600 text-red-300 hover:bg-red-900/20 text-xs h-6 px-2"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Hook for common progress operations
export function useOperationProgress() {
  const progress = useProgress()

  const startBulkOperation = (title: string, items: any[], description?: string) => {
    return progress.startOperation({
      title,
      description: description || `Processing ${items.length} items`,
      total: items.length,
      completed: 0,
      canCancel: true,
      canPause: false
    })
  }

  const startFileOperation = (title: string, description?: string) => {
    return progress.startOperation({
      title,
      description: description || 'Processing file...',
      total: 100,
      completed: 0,
      canCancel: true,
      canPause: false
    })
  }

  const startSyncOperation = (title: string, description?: string) => {
    return progress.startOperation({
      title,
      description: description || 'Synchronizing data...',
      total: 100,
      completed: 0,
      canCancel: false,
      canPause: false
    })
  }

  return {
    ...progress,
    startBulkOperation,
    startFileOperation,
    startSyncOperation
  }
}