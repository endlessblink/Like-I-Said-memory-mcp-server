import { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit2, Save, X, CheckSquare, Square, Clock, AlertCircle } from 'lucide-react'

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

export function MinimalApp() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTab, setActiveTab] = useState<'memories' | 'tasks'>('memories')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [newItemContent, setNewItemContent] = useState('')
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
    setLoading(true)
    try {
      // Load memories
      const memoryResponse = await fetch('/api/memories')
      const memoryData = await memoryResponse.json()
      setMemories(Array.isArray(memoryData) ? memoryData : [])

      // Load tasks  
      const taskResponse = await fetch('/api/tasks')
      const taskData = await taskResponse.json()
      setTasks(Array.isArray(taskData) ? taskData : [])

    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filter data
  const filteredMemories = memories.filter(memory => {
    const matchesSearch = searchTerm === '' || 
      memory.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      memory.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesProject = selectedProject === 'all' || memory.project === selectedProject
    return matchesSearch && matchesProject
  })

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = searchTerm === '' ||
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesProject = selectedProject === 'all' || task.project === selectedProject
    return matchesSearch && matchesProject
  })

  // Inline editing
  const startEditing = (id: string, content: string) => {
    setEditingId(id)
    setEditingContent(content)
  }

  const saveEdit = async () => {
    if (!editingId) return

    try {
      if (activeTab === 'memories') {
        await fetch(`/api/memories/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: editingContent })
        })
        setMemories(prev => prev.map(m => 
          m.id === editingId ? { ...m, content: editingContent } : m
        ))
      } else {
        await fetch(`/api/tasks/${editingId}`, {
          method: 'PUT', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editingContent })
        })
        setTasks(prev => prev.map(t =>
          t.id === editingId ? { ...t, title: editingContent } : t
        ))
      }
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
      if (activeTab === 'memories') {
        const response = await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: newItemContent,
            project: selectedProject === 'all' ? 'default' : selectedProject
          })
        })
        const newMemory = await response.json()
        setMemories(prev => [newMemory, ...prev])
      } else {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: newItemContent,
            project: selectedProject === 'all' ? 'default' : selectedProject,
            status: 'todo',
            priority: 'medium'
          })
        })
        const newTask = await response.json()
        setTasks(prev => [newTask, ...prev])
      }
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
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ))
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Simple Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Like I Said</h1>
          
          {/* Tab Navigation */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'memories' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('memories')}
            >
              Memories ({filteredMemories.length})
            </Button>
            <Button
              variant={activeTab === 'tasks' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('tasks')}
            >
              Tasks ({filteredTasks.length})
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {projects.length > 0 && (
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white"
            >
              <option value="all">All Projects</option>
              {projects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
          )}
        </div>

        {/* Add New Item */}
        <div className="flex gap-2 mt-4">
          <Input
            placeholder={`Add new ${activeTab.slice(0, -1)}...`}
            value={newItemContent}
            onChange={(e) => setNewItemContent(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addNewItem()}
            className="flex-1"
          />
          <Button onClick={addNewItem} size="sm">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Content Area */}
      <main className="px-6 py-6">
        {activeTab === 'memories' && (
          <div className="space-y-4">
            {filteredMemories.map(memory => (
              <div key={memory.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {editingId === memory.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="min-h-[100px]"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button onClick={saveEdit} size="sm">
                            <Save className="w-4 h-4 mr-1" />
                            Save
                          </Button>
                          <Button onClick={cancelEdit} variant="outline" size="sm">
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div 
                        onClick={() => startEditing(memory.id, memory.content)}
                        className="cursor-pointer group"
                      >
                        <div className="prose prose-sm max-w-none">
                          <p className="text-gray-900 whitespace-pre-wrap group-hover:text-blue-600 transition-colors">
                            {memory.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="outline" className="text-xs">
                            {new Date(memory.timestamp).toLocaleDateString()}
                          </Badge>
                          {memory.project && (
                            <Badge variant="secondary" className="text-xs">
                              {memory.project}
                            </Badge>
                          )}
                          {memory.tags?.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          <Edit2 className="w-3 h-3 text-gray-400 ml-auto group-hover:text-blue-600 transition-colors" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {filteredMemories.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? 'No memories found matching your search.' : 'No memories yet. Add one above!'}
              </div>
            )}
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-4">
            {filteredTasks.map(task => (
              <div key={task.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <button 
                      onClick={() => {
                        const nextStatus = task.status === 'todo' ? 'in_progress' : 
                                         task.status === 'in_progress' ? 'done' : 'todo'
                        changeTaskStatus(task.id, nextStatus)
                      }}
                      className="mt-1"
                    >
                      <StatusIcon status={task.status} />
                    </button>

                    <div className="flex-1">
                      {editingId === task.id ? (
                        <div className="space-y-3">
                          <Input
                            value={editingContent}
                            onChange={(e) => setEditingContent(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button onClick={saveEdit} size="sm">
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button onClick={cancelEdit} variant="outline" size="sm">
                              <X className="w-4 h-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          onClick={() => startEditing(task.id, task.title)}
                          className="cursor-pointer group"
                        >
                          <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-3">
                            <Badge className={`text-xs ${StatusColors[task.status]}`}>
                              {task.status.replace('_', ' ')}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {task.priority}
                            </Badge>
                            {task.project && (
                              <Badge variant="secondary" className="text-xs">
                                {task.project}
                              </Badge>
                            )}
                            <Edit2 className="w-3 h-3 text-gray-400 ml-auto group-hover:text-blue-600 transition-colors" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredTasks.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? 'No tasks found matching your search.' : 'No tasks yet. Add one above!'}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}