import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Filter,
  ArrowRight 
} from 'lucide-react'

interface EnhancementLog {
  id: string
  timestamp: string
  memoryId: string
  status: 'success' | 'failed' | 'skipped'
  model: string
  processingTime: number
  before: {
    title: string | null
    summary: string | null
    content: string
  }
  after: {
    title: string
    summary: string
  } | null
  error?: string
}

interface EnhancementLogsProps {
  websocket?: WebSocket
}

export function EnhancementLogs({ websocket }: EnhancementLogsProps) {
  const [logs, setLogs] = useState<EnhancementLog[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  // Load logs from API
  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/enhancement-logs?limit=100')
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Failed to load enhancement logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Clear all logs
  const clearLogs = async () => {
    try {
      await fetch('/api/enhancement-logs', { method: 'DELETE' })
      setLogs([])
    } catch (error) {
      console.error('Failed to clear logs:', error)
    }
  }

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (websocket) {
      const handleMessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data)
        
        if (message.type === 'enhancementLog') {
          setLogs(prevLogs => [message.data, ...prevLogs.slice(0, 99)])
        } else if (message.type === 'enhancementLogsCleared') {
          setLogs([])
        }
      }

      websocket.addEventListener('message', handleMessage)
      return () => websocket.removeEventListener('message', handleMessage)
    }
  }, [websocket])

  // Load logs on mount
  useEffect(() => {
    if (isExpanded) {
      loadLogs()
    }
  }, [isExpanded])

  // Toggle log expansion
  const toggleLogExpansion = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(logId)) {
        newSet.delete(logId)
      } else {
        newSet.add(logId)
      }
      return newSet
    })
  }

  // Filter logs by status
  const filteredLogs = logs.filter(log => 
    statusFilter === 'all' || log.status === statusFilter
  )

  // Status badge colors
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Success</Badge>
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700 mt-6">
      <CardHeader className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-400" />
            Enhancement Logs
            <Badge variant="outline" className="ml-2">
              {logs.length}
            </Badge>
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </CardTitle>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Controls */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-gray-700 border-gray-600 text-white rounded px-2 py-1 text-sm"
              >
                <option value="all">All Status</option>
                <option value="success">Success Only</option>
                <option value="failed">Failed Only</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={loadLogs}
                disabled={isLoading}
              >
                Refresh
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearLogs}
                disabled={logs.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>

          {/* Log entries */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-4 text-gray-400">Loading logs...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                {logs.length === 0 ? 'No enhancement logs yet' : 'No logs match the current filter'}
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className="bg-gray-900/50 rounded-lg p-3 border border-gray-700">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                      <span className="text-sm text-gray-400">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.model}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {log.processingTime.toFixed(1)}s
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleLogExpansion(log.id)}
                      className="text-gray-400 hover:text-white"
                    >
                      {expandedLogs.has(log.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Compact view */}
                  {!expandedLogs.has(log.id) && (
                    <div className="text-sm text-gray-300">
                      <span className="font-mono text-xs text-gray-500">
                        {log.memoryId}
                      </span>
                      {log.status === 'success' && log.after && (
                        <div className="mt-1 flex items-center gap-2">
                          <span className="text-gray-400">
                            {log.before.title ? `"${log.before.title}"` : 'No title'}
                          </span>
                          <ArrowRight className="h-3 w-3 text-gray-500" />
                          <span className="text-green-300">
                            "{log.after.title}"
                          </span>
                        </div>
                      )}
                      {log.status === 'failed' && (
                        <div className="text-red-300 text-xs mt-1">
                          Error: {log.error || 'Unknown error'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expanded view */}
                  {expandedLogs.has(log.id) && (
                    <div className="space-y-3">
                      <div className="text-xs text-gray-500 font-mono">
                        Memory ID: {log.memoryId}
                      </div>

                      {/* Before/After comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Before */}
                        <div className="bg-gray-800/50 rounded p-3">
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Before</h4>
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs text-gray-500">Title:</span>
                              <div className="text-sm text-gray-300">
                                {log.before.title || <span className="italic text-gray-500">No title</span>}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Summary:</span>
                              <div className="text-sm text-gray-300">
                                {log.before.summary || <span className="italic text-gray-500">No summary</span>}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs text-gray-500">Content:</span>
                              <div className="text-xs text-gray-400 font-mono">
                                {log.before.content}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* After */}
                        <div className="bg-gray-800/50 rounded p-3">
                          <h4 className="text-sm font-medium text-gray-300 mb-2">After</h4>
                          {log.status === 'success' && log.after ? (
                            <div className="space-y-2">
                              <div>
                                <span className="text-xs text-gray-500">Title:</span>
                                <div className="text-sm text-green-300">
                                  {log.after.title}
                                </div>
                              </div>
                              <div>
                                <span className="text-xs text-gray-500">Summary:</span>
                                <div className="text-sm text-green-300">
                                  {log.after.summary}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="text-red-300 text-sm">
                              <div className="text-xs text-gray-500 mb-1">Error:</div>
                              {log.error || 'Enhancement failed'}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}