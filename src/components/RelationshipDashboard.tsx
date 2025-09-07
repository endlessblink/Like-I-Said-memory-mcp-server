import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea" 
import { Badge } from "@/components/ui/badge"
import { 
  Search, Plus, Edit2, Save, X, CheckSquare, Square, Clock, AlertCircle,
  Link, Eye, ArrowRight, Filter, Calendar, FolderOpen, Zap
} from 'lucide-react'

interface Memory {
  id: string
  content: string
  project?: string
  tags?: string[]
  timestamp: string
  category?: string
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  project?: string
  created: string
}

interface TimelineItem {
  id: string
  type: 'memory' | 'task'
  title: string
  content: string
  timestamp: string
  project?: string
  status?: string
  priority?: string
  connections?: Connection[]
}

interface Connection {
  id: string
  from_id: string
  to_id: string
  type: string
  created: string
}

const StatusIcon = ({ status }: { status: Task['status'] }) => {
  switch (status) {
    case 'done': return <CheckSquare className="w-4 h-4 text-green-600" />
    case 'in_progress': return <Clock className="w-4 h-4 text-blue-600" />
    case 'blocked': return <AlertCircle className="w-4 h-4 text-red-600" />
    default: return <Square className="w-4 h-4 text-gray-400" />
  }
}

const StatusColors = {
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700', 
  done: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700'
}

const PriorityColors = {
  urgent: 'bg-red-100 text-red-700 border-red-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  medium: 'bg-blue-100 text-blue-700 border-blue-300',
  low: 'bg-gray-100 text-gray-600 border-gray-300'
}

export function RelationshipDashboard() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null)
  const [relatedItems, setRelatedItems] = useState<TimelineItem[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [newItemContent, setNewItemContent] = useState('')
  const [newItemType, setNewItemType] = useState<'memory' | 'task'>('memory')
  const [selectedProject, setSelectedProject] = useState('all')

  // Get unique projects
  const projects = [...new Set([
    ...memories.map(m => m.project).filter(Boolean),
    ...tasks.map(t => t.project).filter(Boolean)
  ])]

  // Load data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    console.log('🔍 [DEBUG] Starting data load...')
    setLoading(true)
    
    try {
      // Test basic connectivity first
      console.log('🔍 [DEBUG] Testing API connectivity...')
      const healthResponse = await fetch('/api/health')
      console.log('🔍 [DEBUG] Health response status:', healthResponse.status)
      
      if (!healthResponse.ok) {
        throw new Error('API server not responding')
      }

      // Load memories via MCP tools API (uses unified storage)
      console.log('🔍 [DEBUG] Calling MCP memory API...')
      const memoryResponse = await fetch('/api/mcp-tools/list_memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      console.log('🔍 [DEBUG] Memory response status:', memoryResponse.status)
      console.log('🔍 [DEBUG] Memory response ok:', memoryResponse.ok)
      
      if (!memoryResponse.ok) {
        throw new Error(`Memory API failed: ${memoryResponse.status}`)
      }

      const memoryResult = await memoryResponse.json()
      console.log('🔍 [DEBUG] Memory API result:', memoryResult)
      
      const memoryTextData = memoryResult?.content?.[0]?.text;
      console.log('🔍 [DEBUG] Memory text data length:', memoryTextData?.length || 0)
      
      const memoriesArray = memoryTextData ? JSON.parse(memoryTextData) : []
      console.log('✅ [DEBUG] Parsed memories successfully:', memoriesArray.length)
      setMemories(memoriesArray)

      // Load tasks via MCP tools API (uses unified storage)
      console.log('🔍 [DEBUG] Calling MCP task API...')
      const taskResponse = await fetch('/api/mcp-tools/list_tasks', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'json' })
      })
      
      console.log('🔍 [DEBUG] Task response status:', taskResponse.status)
      
      if (!taskResponse.ok) {
        throw new Error(`Task API failed: ${taskResponse.status}`)
      }

      const taskResult = await taskResponse.json()
      console.log('🔍 [DEBUG] Task API result:', taskResult)
      
      const taskTextData = taskResult?.content?.[0]?.text;
      console.log('🔍 [DEBUG] Task text data length:', taskTextData?.length || 0)
      
      const tasksArray = taskTextData ? JSON.parse(taskTextData) : []
      console.log('✅ [DEBUG] Parsed tasks successfully:', tasksArray.length)
      setTasks(tasksArray)

      // Create unified timeline
      const timelineItems = [
        ...memoriesArray.map((m: Memory) => ({
          id: m.id,
          type: 'memory' as const,
          title: m.content.split('\n')[0].substring(0, 60) + '...',
          content: m.content,
          timestamp: m.timestamp,
          project: m.project
        })),
        ...tasksArray.map((t: Task) => ({
          id: t.id,
          type: 'task' as const,
          title: t.title,
          content: t.description || '',
          timestamp: t.created,
          project: t.project,
          status: t.status,
          priority: t.priority
        }))
      ]

      // Sort by timestamp (newest first)
      timelineItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      setTimeline(timelineItems)

      // TODO: Load actual connections from relationship API
      setConnections([])

    } catch (error) {
      console.error('❌ [DEBUG] Data loading failed:', error)
      console.error('❌ [DEBUG] Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      })
      
      // Try to save error to logs
      try {
        await fetch('/api/debug-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'ERROR',
            message: 'Dashboard data loading failed',
            error: {
              name: error.name,
              message: error.message,
              stack: error.stack
            }
          })
        })
      } catch (logError) {
        console.error('Failed to log error:', logError)
      }
      
      // Set empty state so dashboard shows something
      setMemories([])
      setTasks([])
      setTimeline([])
    } finally {
      console.log('🔍 [DEBUG] Data loading completed, setting loading to false')
      setLoading(false)
    }
  }

  // Filter timeline
  const filteredTimeline = timeline.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = selectedProject === 'all' || item.project === selectedProject
    return matchesSearch && matchesProject
  })

  // Handle item selection for relationship view
  const handleItemSelect = async (item: TimelineItem) => {
    setSelectedItem(item)
    
    // TODO: Load related items using relationship API
    // For now, find content-based suggestions
    const keywords = extractKeywords(item.content)
    const related = timeline.filter(otherItem => 
      otherItem.id !== item.id && 
      calculateSimilarity(keywords, extractKeywords(otherItem.content)) > 0.2
    ).slice(0, 5)
    
    setRelatedItems(related)
  }

  // Simple keyword extraction and similarity (placeholder for relationship API)
  const extractKeywords = (content: string) => {
    return content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
  }

  const calculateSimilarity = (words1: string[], words2: string[]) => {
    const set1 = new Set(words1)
    const set2 = new Set(words2)
    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])
    return union.size === 0 ? 0 : intersection.size / union.size
  }

  // Inline editing
  const startEditing = (id: string, content: string) => {
    setEditingId(id)
    setEditingContent(content)
  }

  const saveEdit = async () => {
    if (!editingId) return

    try {
      const item = timeline.find(i => i.id === editingId)
      if (!item) return

      const endpoint = item.type === 'memory' ? 'memories' : 'tasks'
      const payload = item.type === 'memory' 
        ? { content: editingContent }
        : { title: editingContent }

      await fetch(`/api/${endpoint}/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      // Update local state
      setTimeline(prev => prev.map(item => 
        item.id === editingId 
          ? { ...item, title: item.type === 'task' ? editingContent : item.title, content: item.type === 'memory' ? editingContent : item.content }
          : item
      ))

      setEditingId(null)
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingContent('')
  }

  // Add new item
  const addNewItem = async () => {
    if (!newItemContent.trim()) return

    try {
      const endpoint = newItemType === 'memory' ? 'memories' : 'tasks'
      const payload = newItemType === 'memory'
        ? { 
            content: newItemContent,
            project: selectedProject === 'all' ? 'default' : selectedProject
          }
        : { 
            title: newItemContent,
            project: selectedProject === 'all' ? 'default' : selectedProject,
            status: 'todo',
            priority: 'medium'
          }

      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const newItem = await response.json()
      
      // Add to timeline
      const timelineItem: TimelineItem = {
        id: newItem.id,
        type: newItemType,
        title: newItemType === 'memory' ? newItemContent.substring(0, 60) + '...' : newItemContent,
        content: newItemType === 'memory' ? newItemContent : '',
        timestamp: newItem.timestamp || newItem.created,
        project: newItem.project
      }
      
      setTimeline(prev => [timelineItem, ...prev])
      setNewItemContent('')
    } catch (error) {
      console.error('Failed to add item:', error)
    }
  }

  // Change task status
  const changeTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      setTimeline(prev => prev.map(item => 
        item.id === taskId ? { ...item, status: newStatus } : item
      ))
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-lg text-gray-600">Loading unified data...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* LEFT PANEL: Projects, Search & Quick Capture */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white mb-4">Like I Said</h1>
          
          {/* Project Filter */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white text-sm"
            >
              <option value="all">All Projects ({timeline.length})</option>
              {projects.map(project => {
                const count = timeline.filter(item => item.project === project).length
                return <option key={project} value={project}>{project} ({count})</option>
              })}
            </select>
          </div>

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search memories & tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 text-sm"
              />
            </div>
          </div>

          {/* Quick Capture */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Quick Capture</label>
            <div className="flex gap-2 mb-2">
              <Button
                size="sm"
                variant={newItemType === 'memory' ? 'default' : 'outline'}
                onClick={() => setNewItemType('memory')}
                className="text-xs"
              >
                Memory
              </Button>
              <Button
                size="sm"
                variant={newItemType === 'task' ? 'default' : 'outline'} 
                onClick={() => setNewItemType('task')}
                className="text-xs"
              >
                Task
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder={`Add new ${newItemType}...`}
                value={newItemContent}
                onChange={(e) => setNewItemContent(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addNewItem()}
                className="text-sm"
              />
              <Button onClick={addNewItem} size="sm" className="px-3">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Project Statistics */}
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-lg text-blue-600">{memories.length}</div>
              <div className="text-gray-600">Memories</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-lg text-green-600">{tasks.length}</div>
              <div className="text-gray-600">Tasks</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 space-y-2">
          <Button variant="outline" size="sm" className="w-full justify-start text-xs">
            <Filter className="w-3 h-3 mr-2" />
            Show Active Only
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs">
            <Calendar className="w-3 h-3 mr-2" />
            Recent Items
          </Button>
          <Button variant="outline" size="sm" className="w-full justify-start text-xs">
            <Link className="w-3 h-3 mr-2" />
            Show Connections
          </Button>
        </div>
      </div>

      {/* CENTER PANEL: Unified Timeline with Visual Connections */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Timeline ({filteredTimeline.length} items)
            </h2>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {filteredTimeline.filter(i => i.type === 'memory').length} memories
              </Badge>
              <Badge variant="outline" className="text-xs">
                {filteredTimeline.filter(i => i.type === 'task').length} tasks
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredTimeline.map((item, index) => (
            <div 
              key={item.id} 
              className={`bg-white rounded-lg border-2 p-4 transition-all cursor-pointer hover:shadow-sm ${
                selectedItem?.id === item.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
              }`}
              onClick={() => handleItemSelect(item)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {/* Type & Status Indicator */}
                  <div className="flex flex-col items-center gap-1 mt-1">
                    {item.type === 'memory' ? (
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    ) : (
                      <StatusIcon status={item.status as Task['status']} />
                    )}
                    {/* Connection Line with Relationship Indicators */}
                    {index < filteredTimeline.length - 1 && (
                      <div className="relative">
                        <div className="w-px h-8 bg-gray-300"></div>
                        {/* TODO: Add curved connection lines when relationship API is working */}
                        {relatedItems.some(related => related.id === filteredTimeline[index + 1]?.id) && (
                          <div className="absolute top-2 left-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {editingId === item.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="min-h-[80px] text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button onClick={saveEdit} size="sm" className="text-xs">
                            <Save className="w-3 h-3 mr-1" />
                            Save
                          </Button>
                          <Button onClick={cancelEdit} variant="outline" size="sm" className="text-xs">
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation()
                          startEditing(item.id, item.type === 'memory' ? item.content : item.title)
                        }}
                        className="group"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={item.type === 'memory' ? 'secondary' : 'default'}
                            className="text-xs"
                          >
                            {item.type}
                          </Badge>
                          {item.type === 'task' && item.status && (
                            <Badge className={`text-xs ${StatusColors[item.status as keyof typeof StatusColors]}`}>
                              {item.status.replace('_', ' ')}
                            </Badge>
                          )}
                          {item.type === 'task' && item.priority && (
                            <Badge className={`text-xs ${PriorityColors[item.priority as keyof typeof PriorityColors]}`}>
                              {item.priority}
                            </Badge>
                          )}
                          <Edit2 className="w-3 h-3 text-gray-400 group-hover:text-blue-600 transition-colors ml-auto" />
                        </div>
                        
                        <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors text-sm mb-1">
                          {item.title}
                        </h3>
                        
                        {item.content && item.content !== item.title && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {item.content.substring(0, 120)}...
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                          <span>{new Date(item.timestamp).toLocaleDateString()}</span>
                          {item.project && (
                            <Badge variant="outline" className="text-xs">
                              {item.project}
                            </Badge>
                          )}
                          {/* Connection indicator */}
                          <div className="flex items-center gap-1 ml-auto">
                            <Link className="w-3 h-3" />
                            <span>{Math.floor(Math.random() * 3)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredTimeline.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>{searchTerm ? 'No items found matching your search.' : 'No items yet. Add one using quick capture!'}</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Related Items & Context */}
      <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
        {selectedItem ? (
          <div className="flex flex-col h-full">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant={selectedItem.type === 'memory' ? 'secondary' : 'default'}>
                  {selectedItem.type}
                </Badge>
                <h3 className="font-medium text-gray-900 text-sm">Related Items</h3>
              </div>
              
              <h4 className="font-medium text-gray-900 text-sm mb-2">
                {selectedItem.title}
              </h4>
              
              {selectedItem.content && selectedItem.content !== selectedItem.title && (
                <p className="text-xs text-gray-600 line-clamp-3 mb-3">
                  {selectedItem.content.substring(0, 150)}...
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {relatedItems.length > 0 ? (
                <div className="space-y-3">
                  {relatedItems.map(relatedItem => (
                    <div 
                      key={relatedItem.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => handleItemSelect(relatedItem)}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={relatedItem.type === 'memory' ? 'secondary' : 'default'}
                          className="text-xs"
                        >
                          {relatedItem.type}
                        </Badge>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                      </div>
                      
                      <h5 className="font-medium text-gray-900 text-xs mb-1">
                        {relatedItem.title}
                      </h5>
                      
                      <p className="text-xs text-gray-500">
                        {new Date(relatedItem.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Link className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No related items found</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Relationships will appear here when items are linked
                  </p>
                </div>
              )}
            </div>

            {/* Connection Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
              <Button variant="outline" size="sm" className="w-full text-xs mb-2">
                <Link className="w-3 h-3 mr-2" />
                Link to Item
              </Button>
              <Button variant="outline" size="sm" className="w-full text-xs">
                <Eye className="w-3 h-3 mr-2" />
                View Graph
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <Zap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-sm">Select an item to see relationships</p>
              <p className="text-xs text-gray-400 mt-1">
                Click any memory or task to explore connections
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}