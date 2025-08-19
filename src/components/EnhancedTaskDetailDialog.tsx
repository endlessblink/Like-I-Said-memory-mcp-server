import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Progress } from './ui/progress'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { 
  FileText, Users, Clock, Calendar, Tags, CheckCircle2, AlertCircle, 
  Eye, Plus, Edit3, Save, X, History, GitBranch, Activity, 
  Timer, Target, Layers3, TrendingUp, Brain, Link2,
  MessageSquare, Bookmark, ExternalLink, Download, Share2,
  Filter, Search, SortAsc, MoreHorizontal, MapPin, Flag
} from 'lucide-react'
import { Memory } from '../types'

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
  completed?: string
  parent_task?: string
  subtasks?: string[]
  tags?: string[]
  memory_connections?: Array<{
    memory_id: string
    memory_serial: string
    connection_type: string
    relevance: number
    matched_terms?: string[]
  }>
}

interface EnhancedTaskDetailDialogProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onUpdateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  onDeleteTask: (taskId: string) => Promise<void>
  taskContext?: any
  getTaskContext: (taskId: string) => Promise<void>
  formatRelativeTime: (date: string) => string
}

const EnhancedTaskDetailDialog: React.FC<EnhancedTaskDetailDialogProps> = ({
  task,
  isOpen,
  onClose,
  onUpdateTask,
  onDeleteTask,
  taskContext,
  getTaskContext,
  formatRelativeTime
}) => {
  const [activeTab, setActiveTab] = useState('overview')
  const [isEditing, setIsEditing] = useState(false)
  const [editedTask, setEditedTask] = useState<Partial<Task>>({})
  const [taskHistory, setTaskHistory] = useState<any[]>([])
  const [relatedTasks, setRelatedTasks] = useState<Task[]>([])
  const [taskAnalytics, setTaskAnalytics] = useState<any>({})
  const [memoryFilter, setMemoryFilter] = useState('')
  const [showAllMemories, setShowAllMemories] = useState(false)

  useEffect(() => {
    if (task && isOpen) {
      setEditedTask(task)
      getTaskContext(task.id)
      loadTaskHistory()
      loadRelatedTasks()
      loadTaskAnalytics()
    }
  }, [task, isOpen])

  const loadTaskHistory = async () => {
    if (!task) return
    try {
      const response = await fetch(`/api/tasks/${task.id}/history`)
      if (response.ok) {
        const history = await response.json()
        setTaskHistory(history || [])
      }
    } catch (error) {
      console.error('Failed to load task history:', error)
    }
  }

  const loadRelatedTasks = async () => {
    if (!task) return
    try {
      const response = await fetch(`/api/tasks/related/${task.id}`)
      if (response.ok) {
        const related = await response.json()
        setRelatedTasks(related || [])
      }
    } catch (error) {
      console.error('Failed to load related tasks:', error)
    }
  }

  const loadTaskAnalytics = async () => {
    if (!task) return
    try {
      const response = await fetch(`/api/tasks/${task.id}/analytics`)
      if (response.ok) {
        const analytics = await response.json()
        setTaskAnalytics(analytics || {})
      }
    } catch (error) {
      console.error('Failed to load task analytics:', error)
    }
  }

  const handleSaveTask = async () => {
    if (!task) return
    try {
      await onUpdateTask(task.id, editedTask)
      setIsEditing(false)
    } catch (error) {
      console.error('Failed to save task:', error)
    }
  }

  const handleDeleteTask = async () => {
    if (!task) return
    if (confirm(`Are you sure you want to delete "${task.title}"? This action cannot be undone.`)) {
      try {
        await onDeleteTask(task.id)
        onClose()
      } catch (error) {
        console.error('Failed to delete task:', error)
      }
    }
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      todo: <AlertCircle className="w-4 h-4 text-blue-400" />,
      in_progress: <Timer className="w-4 h-4 text-yellow-400" />,
      done: <CheckCircle2 className="w-4 h-4 text-green-400" />,
      blocked: <X className="w-4 h-4 text-red-400" />
    }
    return icons[status as keyof typeof icons] || icons.todo
  }

  const getPriorityIcon = (priority: string) => {
    const icons = {
      low: <Flag className="w-4 h-4 text-gray-400" />,
      medium: <Flag className="w-4 h-4 text-blue-400" />,
      high: <Flag className="w-4 h-4 text-orange-400" />,
      urgent: <Flag className="w-4 h-4 text-red-400" />
    }
    return icons[priority as keyof typeof icons] || icons.low
  }

  const calculateTaskProgress = () => {
    if (!task) return 0
    if (task.status === 'done') return 100
    if (task.status === 'in_progress') return 50
    if (task.status === 'blocked') return 25
    return 0
  }

  const getEstimatedTimeToCompletion = () => {
    if (!task || !taskAnalytics.averageCompletionTime) return null
    
    const avgTime = taskAnalytics.averageCompletionTime
    const elapsed = Date.now() - new Date(task.created).getTime()
    const remaining = Math.max(0, avgTime - elapsed)
    
    if (remaining === 0) return 'Overdue'
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24))
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}d ${hours}h remaining`
    return `${hours}h remaining`
  }

  const filteredMemories = taskContext?.direct_memories?.filter((memory: Memory) =>
    !memoryFilter || 
    memory.content.toLowerCase().includes(memoryFilter.toLowerCase()) ||
    memory.tags?.some((tag: string) => tag.toLowerCase().includes(memoryFilter.toLowerCase()))
  ) || []

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b border-gray-700 flex-shrink-0">
          <DialogTitle className="sr-only">Enhanced Task Details: {task.title}</DialogTitle>
          
          {/* Enhanced Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                {getStatusIcon(task.status)}
                {isEditing ? (
                  <Input
                    value={editedTask.title || ''}
                    onChange={(e) => setEditedTask({...editedTask, title: e.target.value})}
                    className="text-lg font-semibold bg-gray-700 border-gray-600"
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-white truncate">
                    {task.title}
                  </h2>
                )}
                <Badge variant="outline" className="text-xs font-mono">
                  {task.serial}
                </Badge>
              </div>
              
              {/* Status Bar with Progress */}
              <div className="flex items-center gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span>Progress:</span>
                  <div className="w-20 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${calculateTaskProgress()}%` }}
                    />
                  </div>
                  <span className="text-xs">{calculateTaskProgress()}%</span>
                </div>
                {getEstimatedTimeToCompletion() && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span className="text-xs">{getEstimatedTimeToCompletion()}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSaveTask} className="bg-green-600 hover:bg-green-700"><Save className="w-4 h-4 mr-1" />Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}><Edit3 className="w-4 h-4 mr-1" />Edit</Button>
                  <Button size="sm" variant="outline" onClick={handleDeleteTask} className="text-red-400 hover:text-red-300">
                    <X className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                  <Button size="sm" variant="outline"><Share2 className="w-4 h-4 mr-1" />Share</Button>
                  <Button size="sm" variant="outline">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Quick Info Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge className={`px-3 py-1 text-xs font-medium ${task.priority === 'urgent' ? 'bg-red-600 text-red-100' : 
              task.priority === 'high' ? 'bg-orange-600 text-orange-100' :
              task.priority === 'medium' ? 'bg-blue-600 text-blue-100' : 'bg-gray-600 text-gray-100'}`}>
              {getPriorityIcon(task.priority)}
              <span className="ml-1">{task.priority.toUpperCase()}</span>
            </Badge>
            
            {task.category && (
              <Badge variant="outline" className="px-3 py-1 text-xs">
                <Layers3 className="w-3 h-3 mr-1" />
                {task.category}
              </Badge>
            )}
            
            <Badge variant="outline" className="px-3 py-1 text-xs">
              <MapPin className="w-3 h-3 mr-1" />
              {task.project || 'No Project'}
            </Badge>
            
            <Badge variant="outline" className="px-3 py-1 text-xs">
              <Calendar className="w-3 h-3 mr-1" />
              Created {formatRelativeTime(task.created)}
            </Badge>
            
            {task.memory_connections && task.memory_connections.length > 0 && (
              <Badge variant="outline" className="px-3 py-1 text-xs text-purple-400 border-purple-600">
                <Brain className="w-3 h-3 mr-1" />
                {task.memory_connections.length} memories
              </Badge>
            )}
          </div>
        </DialogHeader>
        
        {/* Enhanced Tabbed Content */}
        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-6 bg-gray-900/50 p-1 mb-4">
              <TabsTrigger value="overview" className="text-xs"><FileText className="w-4 h-4 mr-1" />Overview</TabsTrigger>
              <TabsTrigger value="memories" className="text-xs"><Brain className="w-4 h-4 mr-1" />Memories</TabsTrigger>
              <TabsTrigger value="activity" className="text-xs"><Activity className="w-4 h-4 mr-1" />Activity</TabsTrigger>
              <TabsTrigger value="related" className="text-xs"><GitBranch className="w-4 h-4 mr-1" />Related</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs"><TrendingUp className="w-4 h-4 mr-1" />Analytics</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs"><History className="w-4 h-4 mr-1" />Timeline</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6 mt-0">
                {/* Task Description */}
                <div className="bg-gray-900/30 p-5 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Task Description
                  </h4>
                  
                  {isEditing ? (
                    <Textarea
                      value={editedTask.description || ''}
                      onChange={(e) => setEditedTask({...editedTask, description: e.target.value})}
                      placeholder="Add a detailed description of this task..."
                      className="min-h-[120px] bg-gray-700 border-gray-600 text-white resize-none"
                    />
                  ) : task.description ? (
                    <div className="prose prose-sm max-w-none">
                      <div className="text-gray-300 bg-gray-900/50 p-4 rounded-lg border border-gray-600 leading-relaxed whitespace-pre-wrap">
                        {task.description}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 italic bg-gray-900/30 p-4 rounded-lg border border-gray-600 text-center">
                      No description provided for this task.
                      {isEditing && <div className="text-xs mt-2">Click above to add one</div>}
                    </div>
                  )}
                </div>

                {/* Task Properties Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column - Core Properties */}
                  <div className="space-y-4">
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                      <h5 className="font-medium text-white mb-3">Core Properties</h5>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Status</span>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(task.status)}
                            <span className="text-white capitalize">{task.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Priority</span>
                          <div className="flex items-center gap-2">
                            {getPriorityIcon(task.priority)}
                            <span className="text-white capitalize">{task.priority}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Category</span>
                          <Badge variant="outline" className="text-xs">
                            {task.category || 'None'}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Project</span>
                          <span className="text-white text-sm">{task.project || 'No project'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Time Tracking */}
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                      <h5 className="font-medium text-white mb-3">Time Information</h5>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400 text-sm">Created</span>
                          <span className="text-white text-sm">{formatRelativeTime(task.created)}</span>
                        </div>
                        {task.updated && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Last Updated</span>
                            <span className="text-white text-sm">{formatRelativeTime(task.updated)}</span>
                          </div>
                        )}
                        {task.completed && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Completed</span>
                            <span className="text-green-400 text-sm">{formatRelativeTime(task.completed)}</span>
                          </div>
                        )}
                        {taskAnalytics.timeSpent && (
                          <div className="flex items-center justify-between">
                            <span className="text-gray-400 text-sm">Time Spent</span>
                            <span className="text-white text-sm">{taskAnalytics.timeSpent}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column - Tags and Connections */}
                  <div className="space-y-4">
                    {/* Tags */}
                    {task.tags && task.tags.length > 0 && (
                      <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                        <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                          <Tags className="w-4 h-4" />
                          Tags ({task.tags.length})
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag, i) => (
                            <Badge key={i} variant="outline" className="text-xs hover:bg-gray-700 transition-colors">
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Stats */}
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                      <h5 className="font-medium text-white mb-3">Quick Stats</h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-400">
                            {task.memory_connections?.length || 0}
                          </div>
                          <div className="text-xs text-gray-400">Connected Memories</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-400">
                            {task.subtasks?.length || 0}
                          </div>
                          <div className="text-xs text-gray-400">Subtasks</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-400">
                            {relatedTasks.length}
                          </div>
                          <div className="text-xs text-gray-400">Related Tasks</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-yellow-400">
                            {taskHistory.length}
                          </div>
                          <div className="text-xs text-gray-400">Updates</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Memories Tab */}
              <TabsContent value="memories" className="space-y-4 mt-0">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-white flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-400" />
                    Connected Memories ({task.memory_connections?.length || 0})
                  </h4>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input placeholder="Filter memories..." value={memoryFilter} onChange={(e) => setMemoryFilter(e.target.value)} className="pl-10 w-64 bg-gray-700 border-gray-600" />
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setShowAllMemories(!showAllMemories)}>
                      <Filter className="w-4 h-4 mr-1" />
                      {showAllMemories ? 'Show Less' : 'Show All'}
                    </Button>
                  </div>
                </div>

                {filteredMemories.length > 0 ? (
                  <div className="space-y-3">
                    {(showAllMemories ? filteredMemories : filteredMemories.slice(0, 10)).map((memory: Memory, index: number) => (
                      <div key={`${memory.id}-${index}`} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-purple-400"></div>
                            <span className="text-xs font-mono text-gray-400">
                              {memory.id?.substring(0, 8)}...
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {memory.category || 'general'}
                            </Badge>
                            {memory.connection?.relevance && (
                              <Badge variant="outline" className="text-xs text-green-400">
                                {Math.round(memory.connection.relevance * 100)}% match
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                              <Link2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="text-sm text-gray-300 line-clamp-3 mb-2">
                          {memory.content?.substring(0, 200)}...
                        </div>
                        
                        {memory.tags && memory.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {memory.tags.slice(0, 3).map((tag: string, tagIndex: number) => (
                              <Badge key={tagIndex} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                            {memory.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{memory.tags.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        {memory.connection?.matched_terms && (
                          <div className="text-xs text-gray-500">
                            Matched: {memory.connection.matched_terms.join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {!showAllMemories && filteredMemories.length > 10 && (
                      <div className="text-center py-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowAllMemories(true)}
                        >
                          Show {filteredMemories.length - 10} more memories
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-900/30 rounded-lg border border-gray-700">
                    <Brain className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <div className="text-gray-400 text-sm">
                      {memoryFilter ? 'No memories match your filter' : 'No memories linked to this task'}
                    </div>
                    <Button size="sm" variant="outline" className="mt-3">
                      <Plus className="w-4 h-4 mr-1" />
                      Link Memories
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="space-y-4 mt-0">
                <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Activity
                  </h4>
                  
                  {taskHistory.length > 0 ? (
                    <div className="space-y-3">
                      {taskHistory.map((event, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                          <div className="flex-1">
                            <div className="text-sm text-gray-300">{event.description}</div>
                            <div className="text-xs text-gray-500 mt-1">{formatRelativeTime(event.timestamp)}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No activity history available
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Related Tasks Tab */}
              <TabsContent value="related" className="space-y-4 mt-0">
                <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <GitBranch className="w-5 h-5" />
                    Related Tasks ({relatedTasks.length})
                  </h4>
                  
                  {relatedTasks.length > 0 ? (
                    <div className="space-y-3">
                      {relatedTasks.map((relatedTask, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-600 hover:border-gray-500 transition-colors cursor-pointer">
                          {getStatusIcon(relatedTask.status)}
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-300">{relatedTask.title}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{relatedTask.priority}</Badge>
                              <span className="text-xs text-gray-500">{relatedTask.project}</span>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      No related tasks found
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="space-y-4 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                    <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Performance Metrics
                    </h5>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Completion Rate</span>
                        <span className="text-white">{taskAnalytics.completionRate || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Average Time</span>
                        <span className="text-white">{taskAnalytics.averageTime || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Memory Connections</span>
                        <span className="text-purple-400">{task.memory_connections?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                    <h5 className="font-medium text-white mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      Insights
                    </h5>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div>• Task created {formatRelativeTime(task.created)}</div>
                      {task.memory_connections && task.memory_connections.length > 3 && (
                        <div>• High memory connectivity indicates complex task</div>
                      )}
                      {task.priority === 'urgent' && (
                        <div className="text-red-400">• Urgent priority - consider immediate action</div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Timeline Tab */}
              <TabsContent value="timeline" className="space-y-4 mt-0">
                <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                  <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Task Timeline
                  </h4>
                  
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-600"></div>
                    
                    <div className="space-y-6">
                      {/* Task Creation */}
                      <div className="flex items-start gap-4">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                          <Plus className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-300">Task Created</div>
                          <div className="text-xs text-gray-500">{formatRelativeTime(task.created)}</div>
                        </div>
                      </div>
                      
                      {/* Memory Connections */}
                      {task.memory_connections && task.memory_connections.length > 0 && (
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                            <Brain className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-300">
                              {task.memory_connections.length} memories auto-linked
                            </div>
                            <div className="text-xs text-gray-500">{formatRelativeTime(task.created)}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Status Updates */}
                      {taskHistory.filter(h => h.type === 'status_change').map((change, index) => (
                        <div key={index} className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-yellow-600 flex items-center justify-center flex-shrink-0">
                            <Activity className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-300">{change.description}</div>
                            <div className="text-xs text-gray-500">{formatRelativeTime(change.timestamp)}</div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Completion */}
                      {task.completed && (
                        <div className="flex items-start gap-4">
                          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-300">Task Completed</div>
                            <div className="text-xs text-gray-500">{formatRelativeTime(task.completed)}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default EnhancedTaskDetailDialog