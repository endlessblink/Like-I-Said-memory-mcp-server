import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Clock,
  Activity
} from 'lucide-react'

interface OfflineDetectorState {
  isOnline: boolean
  lastOnlineTime?: Date
  offlineDuration: number
  retryCount: number
  isRetrying: boolean
  connectionQuality: 'good' | 'poor' | 'offline'
  apiStatus: 'connected' | 'disconnected' | 'checking'
}

interface OfflineDetectorProps {
  children: React.ReactNode
  apiEndpoint?: string
  checkInterval?: number
  onConnectionChange?: (isOnline: boolean) => void
}

export function OfflineDetector({ 
  children, 
  apiEndpoint = '/api/status',
  checkInterval = 30000,
  onConnectionChange 
}: OfflineDetectorProps) {
  const [state, setState] = useState<OfflineDetectorState>({
    isOnline: navigator.onLine,
    offlineDuration: 0,
    retryCount: 0,
    isRetrying: false,
    connectionQuality: navigator.onLine ? 'good' : 'offline',
    apiStatus: 'checking'
  })

  const [showOfflineCard, setShowOfflineCard] = useState(false)
  const [offlineActions, setOfflineActions] = useState<Array<{
    id: string
    action: string
    timestamp: Date
    data: any
  }>>([])

  // Monitor browser online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('🟢 Browser reports: ONLINE')
      setState(prev => ({
        ...prev,
        isOnline: true,
        connectionQuality: 'good',
        retryCount: 0,
        lastOnlineTime: new Date()
      }))
      onConnectionChange?.(true)
      setShowOfflineCard(false)
      
      // Process offline actions when coming back online
      if (offlineActions.length > 0) {
        processOfflineActions()
      }
    }

    const handleOffline = () => {
      console.log('🔴 Browser reports: OFFLINE')
      setState(prev => ({
        ...prev,
        isOnline: false,
        connectionQuality: 'offline',
        lastOnlineTime: prev.lastOnlineTime || new Date()
      }))
      onConnectionChange?.(false)
      setShowOfflineCard(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [onConnectionChange, offlineActions])

  // Monitor offline duration
  useEffect(() => {
    if (!state.isOnline && state.lastOnlineTime) {
      const interval = setInterval(() => {
        setState(prev => ({
          ...prev,
          offlineDuration: Date.now() - (prev.lastOnlineTime?.getTime() || Date.now())
        }))
      }, 1000)

      return () => clearInterval(interval)
    }
  }, [state.isOnline, state.lastOnlineTime])

  // Periodic API connectivity check
  useEffect(() => {
    const checkApiConnection = async () => {
      if (!state.isOnline) return

      setState(prev => ({ ...prev, apiStatus: 'checking' }))

      try {
        const startTime = Date.now()
        const response = await fetch(apiEndpoint, {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(5000)
        })
        const responseTime = Date.now() - startTime

        if (response.ok) {
          setState(prev => ({
            ...prev,
            apiStatus: 'connected',
            connectionQuality: responseTime > 2000 ? 'poor' : 'good'
          }))
        } else {
          throw new Error(`API returned ${response.status}`)
        }
      } catch (error) {
        console.warn('🔶 API connectivity check failed:', error)
        setState(prev => ({
          ...prev,
          apiStatus: 'disconnected',
          connectionQuality: 'poor'
        }))
      }
    }

    const interval = setInterval(checkApiConnection, checkInterval)
    checkApiConnection() // Initial check

    return () => clearInterval(interval)
  }, [apiEndpoint, checkInterval, state.isOnline])

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const handleRetryConnection = async () => {
    setState(prev => ({ ...prev, isRetrying: true, retryCount: prev.retryCount + 1 }))

    try {
      const response = await fetch(apiEndpoint, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(10000)
      })

      if (response.ok) {
        setState(prev => ({
          ...prev,
          isOnline: true,
          connectionQuality: 'good',
          apiStatus: 'connected',
          isRetrying: false
        }))
        setShowOfflineCard(false)
        onConnectionChange?.(true)
      } else {
        throw new Error('API not responding')
      }
    } catch (error) {
      console.warn('🔄 Retry failed:', error)
      setState(prev => ({ ...prev, isRetrying: false }))
    }
  }

  const queueOfflineAction = (action: string, data: any) => {
    const offlineAction = {
      id: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      timestamp: new Date(),
      data
    }

    setOfflineActions(prev => [...prev, offlineAction])
    console.log('📝 Queued offline action:', offlineAction)
  }

  const processOfflineActions = async () => {
    console.log('⚡ Processing offline actions:', offlineActions.length)
    
    for (const action of offlineActions) {
      try {
        // Process each offline action based on type
        console.log(`Processing offline action: ${action.action}`)
        // Implementation would depend on specific action types
      } catch (error) {
        console.error('❌ Failed to process offline action:', action, error)
      }
    }

    setOfflineActions([])
  }

  const getConnectionStatusColor = () => {
    if (!state.isOnline) return 'text-red-400 border-red-400'
    if (state.apiStatus === 'disconnected') return 'text-orange-400 border-orange-400'
    if (state.connectionQuality === 'poor') return 'text-yellow-400 border-yellow-400'
    return 'text-green-400 border-green-400'
  }

  const getConnectionIcon = () => {
    if (!state.isOnline || state.apiStatus === 'disconnected') return <WifiOff className="h-4 w-4" />
    return <Wifi className="h-4 w-4" />
  }

  const getConnectionText = () => {
    if (!state.isOnline) return 'Offline'
    if (state.apiStatus === 'disconnected') return 'API Disconnected'
    if (state.apiStatus === 'checking') return 'Checking...'
    if (state.connectionQuality === 'poor') return 'Poor Connection'
    return 'Connected'
  }

  return (
    <>
      {/* Connection Status Badge - Always visible in corner */}
      <div className="fixed top-4 right-4 z-50">
        <Badge 
          variant="outline" 
          className={`flex items-center gap-2 ${getConnectionStatusColor()} bg-gray-900 bg-opacity-90 backdrop-blur-sm`}
        >
          {getConnectionIcon()}
          <span className="text-xs">{getConnectionText()}</span>
          {state.apiStatus === 'checking' && (
            <RefreshCw className="h-3 w-3 animate-spin" />
          )}
        </Badge>
      </div>

      {/* Offline Card - Shows when offline */}
      {showOfflineCard && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4">
          <Card className="max-w-md w-full border-orange-500/20 bg-orange-950/10">
            <CardContent className="p-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-3 bg-orange-500/20 rounded-full">
                  <WifiOff className="h-8 w-8 text-orange-400" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-orange-400 mb-2">
                  You're Offline
                </h3>
                <p className="text-gray-300 text-sm mb-1">
                  Your internet connection has been lost.
                </p>
                <p className="text-gray-400 text-xs">
                  Offline for: {formatDuration(state.offlineDuration)}
                </p>
              </div>

              {offlineActions.length > 0 && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-400 text-sm">
                    <Clock className="h-4 w-4" />
                    {offlineActions.length} action(s) queued for when you're back online
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Button 
                  onClick={handleRetryConnection}
                  disabled={state.isRetrying}
                  className="w-full"
                >
                  {state.isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Retrying... ({state.retryCount})
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Reconnecting
                    </>
                  )}
                </Button>

                <Button 
                  onClick={() => setShowOfflineCard(false)}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  Continue Offline
                </Button>
              </div>

              <div className="text-xs text-gray-500">
                Some features may be unavailable while offline
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      {children}
    </>
  )
}

// Hook for components to use offline functionality
export function useOfflineSupport() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineQueue, setOfflineQueue] = useState<any[]>([])

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const queueAction = (action: any) => {
    if (!isOnline) {
      setOfflineQueue(prev => [...prev, action])
      return false // Action was queued
    }
    return true // Action can be executed immediately
  }

  const processQueue = async () => {
    if (isOnline && offlineQueue.length > 0) {
      console.log('Processing offline queue:', offlineQueue.length, 'items')
      // Process queue items here
      setOfflineQueue([])
    }
  }

  return {
    isOnline,
    queueAction,
    processQueue,
    queueSize: offlineQueue.length
  }
}