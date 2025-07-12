import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TaskTreeView } from './TaskTreeView'
import { TaskStatusButton, TaskStatusButtonGroup } from './TaskStatusButton'
import { TemplateSelector } from './TemplateSelector'
import { StatusIcon, getStatusIcon, getStatusColor } from './StatusIcon'

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

interface TaskContext {
  task: Task
  direct_memories: Array<{
    id: string
    content: string
    connection: {
      type: string
      relevance: number
    }
  }>
  related_tasks: Task[]
  related_memories: Array<{
    id: string
    content: string
  }>
}

interface TaskManagementProps {
  currentProject?: string
}

export function TaskManagement({ currentProject }: TaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskContext, setTaskContext] = useState<TaskContext | null>(null)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [allProjects, setAllProjects] = useState<string[]>([])
  const [filter, setFilter] = useState<{
    status?: string
    project?: string
    priority?: string
  }>({
    project: currentProject || 'all'
  })
  
  // Bulk operations state
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkAction, setBulkAction] = useState<'status' | 'priority' | 'project' | 'delete'>('status')
  const [bulkValue, setBulkValue] = useState('')
  
  // Create task form state
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    project: currentProject || '',
    category: 'code' as const,
    priority: 'medium' as const,
    tags: '',
    autoLinkMemories: true
  })
  const [showTaskTemplateSelector, setShowTaskTemplateSelector] = useState(false)

  // Template handling
  const handleTaskTemplate = (template: any, variables: Record<string, string>) => {
    // Replace variables in template content
    let content = template.content
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    
    // Populate form fields
    setNewTask(prev => ({
      ...prev,
      title: variables.title || variables.feature_name || variables.bug_title || variables.research_topic || variables.project_name || template.name,
      description: content,
      category: template.category,
      tags: [...template.tags].join(', ')
    }))
    
    // Close template selector and open create dialog
    setShowTaskTemplateSelector(false)
    setShowCreateDialog(true)
  }

  // Load tasks
  const loadTasks = async () => {
    try {
      setIsLoading(true)
      
      // Load all tasks by fetching all pages
      let allTasks = []
      let page = 1
      let hasMore = true
      
      while (hasMore) {
        // Use direct API endpoint instead of MCP bridge
        const params = new URLSearchParams()
        params.append('page', page.toString())
        params.append('limit', '100')
        if (filter.project && filter.project !== 'all') {
          params.append('project', filter.project)
        }
        if (filter.status && filter.status !== 'all') {
          params.append('status', filter.status)
        }
        
        const response = await fetch(`/api/tasks?${params}`)
        
        if (!response.ok) {
          break
        }
        
        const tasksData = await response.json()
        
        // Handle both old array format and new paginated format
        if (Array.isArray(tasksData)) {
          allTasks = [...allTasks, ...tasksData]
          hasMore = false // Old format doesn't have pagination
        } else if (tasksData.data && Array.isArray(tasksData.data)) {
          allTasks = [...allTasks, ...tasksData.data]
          hasMore = tasksData.pagination ? tasksData.pagination.hasNext : false
          page++
        } else {
          hasMore = false
        }
      }
      
      setTasks(allTasks)
      console.log('Loaded tasks:', allTasks.length, allTasks)
    } catch (error) {
      console.warn('Task system not fully integrated yet:', error)
      setTasks([])
    } finally {
      setIsLoading(false)
    }
  }

  // Create task
  const createTask = async () => {
    if (!newTask.title.trim()) return

    try {
      const response = await fetch('/api/mcp-tools/create_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          project: newTask.project || currentProject || 'default',
          category: newTask.category,
          priority: newTask.priority,
          tags: newTask.tags.split(',').map(t => t.trim()).filter(Boolean),
          auto_link: newTask.autoLinkMemories
        })
      })

      if (response.ok) {
        setNewTask({
          title: '',
          description: '',
          project: currentProject || '',
          category: 'code',
          priority: 'medium',
          tags: '',
          autoLinkMemories: true
        })
        setShowCreateDialog(false)
        await loadTasks()
      } else {
        console.warn('Task creation not available yet')
      }
    } catch (error) {
      console.warn('Task creation not available yet:', error)
    }
  }

  // Update task status
  const updateTaskStatus = async (taskId: string, status: Task['status']) => {
    try {
      const response = await fetch('/api/mcp-tools/update_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          status
        })
      })

      if (response.ok) {
        await loadTasks()
      }
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  // Delete task
  const deleteTask = async (taskId: string) => {
    try {
      const response = await fetch('/api/mcp-tools/delete_task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId
        })
      })

      if (response.ok) {
        await loadTasks()
        if (selectedTask?.id === taskId) {
          setSelectedTask(null)
          setTaskContext(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  // Bulk operations
  const handleTaskSelect = (taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }

  const selectAllTasks = () => {
    const visibleTaskIds = filteredTasks.map(t => t.id)
    setSelectedTasks(new Set(visibleTaskIds))
  }

  const clearTaskSelection = () => {
    setSelectedTasks(new Set())
  }

  const bulkDeleteTasks = async () => {
    if (confirm(`Delete ${selectedTasks.size} selected tasks?`)) {
      try {
        await Promise.all(Array.from(selectedTasks).map(id => deleteTask(id)))
        setSelectedTasks(new Set())
      } catch (error) {
        console.error('Failed to bulk delete tasks:', error)
      }
    }
  }

  const bulkUpdateTasks = async () => {
    try {
      for (const taskId of selectedTasks) {
        if (bulkAction === 'status') {
          await updateTaskStatus(taskId, bulkValue as any)
        } else if (bulkAction === 'priority') {
          const response = await fetch('/api/mcp-tools/update_task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_id: taskId,
              priority: bulkValue
            })
          })
          if (!response.ok) throw new Error('Update failed')
        } else if (bulkAction === 'project') {
          const response = await fetch('/api/mcp-tools/update_task', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              task_id: taskId,
              project: bulkValue
            })
          })
          if (!response.ok) throw new Error('Update failed')
        }
      }
      await loadTasks()
      setSelectedTasks(new Set())
      setShowBulkDialog(false)
      setBulkValue('')
    } catch (error) {
      console.error('Failed to bulk update tasks:', error)
    }
  }

  // Get task context
  const getTaskContext = async (taskId: string) => {
    try {
      const response = await fetch('/api/mcp-tools/get_task_context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          depth: 'direct'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTaskContext(data.context)
      }
    } catch (error) {
      console.error('Failed to get task context:', error)
    }
  }

  const handleTaskClick = async (task: Task) => {
    setSelectedTask(task)
    await getTaskContext(task.id)
  }

  useEffect(() => {
    loadTasks()
  }, [filter, currentProject])

  // Listen for global keyboard shortcuts
  useEffect(() => {
    const handleCreateNewTask = () => {
      setShowCreateDialog(true)
    }

    const handleSelectAllTasks = () => {
      selectAllTasks()
    }

    const handleClearTaskSelection = () => {
      clearTaskSelection()
    }

    const handleSelectTask = (event: any) => {
      const task = event.detail
      if (task) {
        setSelectedTask(task)
        loadTaskContext(task.id)
      }
    }

    document.addEventListener('createNewTask', handleCreateNewTask)
    document.addEventListener('selectAllTasks', handleSelectAllTasks)
    document.addEventListener('clearTaskSelection', handleClearTaskSelection)
    document.addEventListener('selectTask', handleSelectTask)
    
    return () => {
      document.removeEventListener('createNewTask', handleCreateNewTask)
      document.removeEventListener('selectAllTasks', handleSelectAllTasks)
      document.removeEventListener('clearTaskSelection', handleClearTaskSelection)
      document.removeEventListener('selectTask', handleSelectTask)
    }
  }, [filteredTasks])

  // Extract unique projects from tasks
  useEffect(() => {
    const projects = new Set<string>()
    tasks.forEach(task => {
      if (task.project) {
        projects.add(task.project)
      }
    })
    setAllProjects(Array.from(projects).sort())
  }, [tasks])

  // Removed getStatusIcon function - now using StatusIcon component

  const getPriorityClass = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'complexity-l4' // Red for urgent
      case 'high': return 'complexity-l3'   // Amber for high
      case 'medium': return 'complexity-l2' // Blue for medium
      case 'low': return 'complexity-l1'    // Emerald for low
      default: return 'complexity-l1'
    }
  }

  const getPriorityBadge = (priority: Task['priority']) => {
    const baseClasses = 'category-badge'
    switch (priority) {
      case 'urgent': return `${baseClasses} category-code text-xs`   // Red styling
      case 'high': return `${baseClasses} category-research text-xs` // Amber styling  
      case 'medium': return `${baseClasses} category-personal text-xs` // Blue styling
      case 'low': return `${baseClasses} category-work text-xs`     // Emerald styling
      default: return `${baseClasses} category-personal text-xs`
    }
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'todo': return 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
      case 'in_progress': return 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
      case 'done': return 'bg-green-500/20 text-green-300 border border-green-500/30'
      case 'blocked': return 'bg-red-500/20 text-red-300 border border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-amber-500'
      case 'medium': return 'bg-blue-500'
      case 'low': return 'bg-emerald-500'
      default: return 'bg-gray-500'
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getCategoryClass = (category: string) => {
    const baseClasses = 'category-badge'
    switch (category) {
      case 'personal': return `${baseClasses} category-personal`
      case 'work': return `${baseClasses} category-work`
      case 'code': return `${baseClasses} category-code`
      case 'research': return `${baseClasses} category-research`
      default: return `${baseClasses} category-personal`
    }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter.status && task.status !== filter.status) return false
    if (filter.priority && task.priority !== filter.priority) return false
    return true
  })

  // Group tasks by project first, then by status within each project
  const tasksByProject = filteredTasks.reduce((acc, task) => {
    const project = task.project || 'default'
    if (!acc[project]) {
      acc[project] = {
        todo: [],
        in_progress: [],
        done: [],
        blocked: []
      }
    }
    // Ensure the status exists in our predefined statuses, default to 'todo' if not
    const status = task.status in acc[project] ? task.status : 'todo'
    acc[project][status].push(task)
    return acc
  }, {} as Record<string, Record<Task['status'], Task[]>>)

  // Legacy grouping for backward compatibility
  const tasksByStatus = {
    todo: filteredTasks.filter(t => t.status === 'todo'),
    in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
    done: filteredTasks.filter(t => t.status === 'done'),
    blocked: filteredTasks.filter(t => t.status === 'blocked')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Task Management</h1>
          <Badge variant="outline" className="text-gray-300">
            {tasks.length} tasks
          </Badge>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
              <DialogDescription>
                Create a new task with optional memory linking and project organization.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Title</label>
                <Input
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="Task title..."
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Description</label>
                <Textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Task description..."
                  className="bg-gray-700 border-gray-600 text-white min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Project</label>
                  <Input
                    value={newTask.project}
                    onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
                    placeholder="Project name..."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Category</label>
                  <Select value={newTask.category} onValueChange={(value: any) => setNewTask({ ...newTask, category: value })}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="work">Work</SelectItem>
                      <SelectItem value="code">Code</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Priority</label>
                  <Select value={newTask.priority} onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Tags</label>
                  <Input
                    value={newTask.tags}
                    onChange={(e) => setNewTask({ ...newTask, tags: e.target.value })}
                    placeholder="tag1, tag2, tag3..."
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="border-t border-gray-700 pt-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTask.autoLinkMemories}
                    onChange={(e) => setNewTask({ ...newTask, autoLinkMemories: e.target.checked })}
                    className="w-4 h-4 text-violet-600 bg-gray-700 border-gray-600 rounded focus:ring-violet-500 focus:ring-2"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-300">Automatically link to related memories</div>
                    <div className="text-xs text-gray-500">The task will be connected to memories with similar content</div>
                  </div>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowTaskTemplateSelector(true)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  📋 Templates
                </Button>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createTask} disabled={!newTask.title.trim()}>
                  Create Task
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
        <Select 
          value={filter.project || 'all'} 
          onValueChange={(value) => setFilter({ ...filter, project: value === 'all' ? undefined : value })}
        >
          <SelectTrigger className="w-48 bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📁 All projects</SelectItem>
            {allProjects.map(project => (
              <SelectItem key={project} value={project}>
                📁 {project}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filter.status || 'all'} onValueChange={(value) => setFilter({ ...filter, status: value === 'all' ? undefined : value })}>
          <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="todo">⏳ To Do</SelectItem>
            <SelectItem value="in_progress">🔄 In Progress</SelectItem>
            <SelectItem value="done">✅ Done</SelectItem>
            <SelectItem value="blocked">🚫 Blocked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filter.priority || 'all'} onValueChange={(value) => setFilter({ ...filter, priority: value === 'all' ? undefined : value })}>
          <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
            <SelectValue placeholder="All priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">🔴 Urgent</SelectItem>
            <SelectItem value="high">🟠 High</SelectItem>
            <SelectItem value="medium">🟡 Medium</SelectItem>
            <SelectItem value="low">🟢 Low</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />
        
        <div className="text-sm text-gray-400">
          {filteredTasks.length} tasks
        </div>

        <Button variant="outline" onClick={loadTasks} className="text-gray-300">
          🔄 Refresh
        </Button>
      </div>

      {/* Bulk Operations Toolbar */}
      {selectedTasks.size > 0 && (
        <div className="mb-4 p-3 sm:p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-blue-300 font-medium text-sm sm:text-base">
                {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearTaskSelection}
                className="text-blue-300 hover:text-blue-200 hover:bg-blue-500/10 text-xs"
              >
                Clear Selection
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Select All */}
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllTasks}
                className="border-blue-600 text-blue-300 hover:bg-blue-900/20 text-xs"
              >
                Select All ({filteredTasks.length})
              </Button>

              {/* Bulk Update */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDialog(true)}
                className="border-green-600 text-green-300 hover:bg-green-900/20 text-xs"
              >
                Bulk Update
              </Button>

              {/* Delete Selected */}
              <Button
                variant="outline"
                size="sm"
                onClick={bulkDeleteTasks}
                className="border-red-600 text-red-300 hover:bg-red-900/20 text-xs"
              >
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks Board */}
      <Tabs defaultValue="board" className="w-full">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="board" className="text-gray-300 data-[state=active]:text-white">
            📋 Board View
          </TabsTrigger>
          <TabsTrigger value="list" className="text-gray-300 data-[state=active]:text-white">
            📄 List View
          </TabsTrigger>
          <TabsTrigger value="tree" className="text-gray-300 data-[state=active]:text-white">
            🌳 Tree View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="board" className="space-y-6">
          {/* Project-based task organization */}
          <div className="space-y-8">
            {Object.entries(tasksByProject).map(([projectName, projectTasks]) => {
              const totalTasks = Object.values(projectTasks).flat().length
              if (totalTasks === 0) return null
              
              return (
                <div key={projectName} className="space-y-4">
                  {/* Project Header */}
                  <div className="flex items-center justify-between bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        📂 {projectName === 'default' ? 'Default Project' : projectName}
                      </h2>
                      <Badge variant="outline" className="text-gray-300">
                        {totalTasks} tasks
                      </Badge>
                    </div>
                    <div className="flex gap-2 text-sm text-gray-400">
                      <span><StatusIcon status="done" showTooltip={true} size="sm" className="inline" /> {projectTasks.done.length}</span>
                      <span><StatusIcon status="in_progress" showTooltip={true} size="sm" className="inline" /> {projectTasks.in_progress.length}</span>
                      <span><StatusIcon status="todo" showTooltip={true} size="sm" className="inline" /> {projectTasks.todo.length}</span>
                      <span><StatusIcon status="blocked" showTooltip={true} size="sm" className="inline" /> {projectTasks.blocked.length}</span>
                    </div>
                  </div>

                  {/* Status columns for this project */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {Object.entries(projectTasks).map(([status, statusTasks]) => (
                      <div key={`${projectName}-${status}`} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-white flex items-center gap-2">
                            <StatusIcon status={status as Task['status']} showTooltip={true} size="md" />
                            {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h3>
                          <Badge variant="outline" className="text-gray-400">
                            {statusTasks.length}
                          </Badge>
                        </div>
                        
                        <div className="space-y-4 md:space-y-6">
                          {statusTasks.map((task) => (
                            <div
                              key={task.id}
                              className={`card-glass ${getPriorityClass(task.priority)} group cursor-pointer overflow-hidden w-full min-h-[200px] sm:min-h-[220px] h-auto flex ${selectedTasks.has(task.id) ? 'ring-2 ring-blue-500 border-blue-400' : ''}`}
                              onClick={() => handleTaskClick(task)}
                            >
                              {/* Selection Checkbox */}
                              <div className="flex-shrink-0 p-4 flex items-start">
                                <input
                                  type="checkbox"
                                  checked={selectedTasks.has(task.id)}
                                  onChange={() => handleTaskSelect(task.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-4 h-4 mt-0.5 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2 backdrop-blur-sm cursor-pointer"
                                />
                              </div>

                              <div className="flex-1 flex flex-col h-full pr-4 py-4">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3 flex-shrink-0">
                                  <div className="flex flex-wrap items-center gap-2 flex-1">
                                    {/* Category Badge */}
                                    {task.category && (
                                      <span className={getCategoryClass(task.category)}>
                                        {task.category}
                                      </span>
                                    )}
                                    
                                    {/* Project Tag */}
                                    {task.project && task.project !== 'default' && (
                                      <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1" title={`Project: ${task.project}`}>
                                        <span>📁</span>
                                        <span className="max-w-[80px] truncate">{task.project}</span>
                                      </span>
                                    )}
                                    
                                    {/* Status Badge */}
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
                                      <StatusIcon status={task.status} showTooltip={true} size="sm" className="inline" /> {task.status.replace('_', ' ')}
                                    </span>
                                    
                                    {/* Priority Badge */}
                                    <span className={getPriorityBadge(task.priority)}>
                                      {task.priority.toUpperCase()}
                                    </span>
                                  </div>

                                  {/* Action Buttons and Serial */}
                                  <div className="flex items-center gap-2">
                                    {/* Action buttons - visible on hover */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleTaskClick(task)
                                        }}
                                        className="p-1.5 hover:bg-blue-500/20 hover:text-blue-300 rounded transition-colors"
                                        title="Edit task"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (confirm(`Delete task "${task.title}"?`)) {
                                            deleteTask(task.id)
                                          }
                                        }}
                                        className="p-1.5 hover:bg-red-500/20 hover:text-red-300 rounded transition-colors"
                                        title="Delete task"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                    
                                    {/* Serial number */}
                                    <span className="text-xs text-gray-500 font-mono flex-shrink-0">
                                      {task.serial}
                                    </span>
                                  </div>
                                </div>

                                {/* Title and Description */}
                                <div className="flex-1 min-h-0 mb-3">
                                  <h3 className="text-card-title mb-2 leading-tight line-clamp-2">
                                    {task.title}
                                  </h3>
                                  
                                  {task.description && (
                                    <div className="text-card-description leading-relaxed line-clamp-2">
                                      {task.description}
                                    </div>
                                  )}
                                </div>
                                {/* Tags */}
                                {task.tags && task.tags.length > 0 && (
                                  <div className="mt-auto mb-3 flex-shrink-0">
                                    <div className="flex flex-wrap gap-1">
                                      {(() => {
                                        const maxVisibleTags = 4
                                        const displayTags = task.tags.slice(0, maxVisibleTags)
                                        const remainingCount = Math.max(0, task.tags.length - maxVisibleTags)
                                        
                                        return (
                                          <>
                                            {displayTags.map((tag, i) => (
                                              <span key={i} className="inline-flex items-center text-2xs bg-white/5 text-gray-300 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap" title={tag}>
                                                #{tag}
                                              </span>
                                            ))}
                                            {remainingCount > 0 && (
                                              <span className="inline-flex items-center text-2xs bg-white/10 text-gray-400 border border-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap" title={`${remainingCount} more tags: ${task.tags.slice(maxVisibleTags).join(', ')}`}>
                                                +{remainingCount}
                                              </span>
                                            )}
                                          </>
                                        )
                                      })()}
                                    </div>
                                  </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between text-card-meta mt-auto pt-2 border-t border-white/10 flex-shrink-0">
                                  <div className="flex items-center gap-3">
                                    {/* Memory connections */}
                                    {task.memory_connections && task.memory_connections.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-purple-400 text-xs">🧠</span>
                                        <span className="text-2xs">{task.memory_connections.length}</span>
                                      </div>
                                    )}
                                    
                                    {/* Subtasks */}
                                    {task.subtasks && task.subtasks.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        <span className="text-blue-400 text-xs">📋</span>
                                        <span className="text-2xs">{task.subtasks.length}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Time */}
                                  <div className="text-2xs text-gray-500">
                                    {formatRelativeTime(task.updated)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Show message if no tasks in filtered view */}
          {Object.keys(tasksByProject).length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg">No tasks found</div>
              <div className="text-gray-500 text-sm mt-2">Try adjusting your filters or create a new task</div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          <div className="space-y-2">
            {filteredTasks.map((task) => (
              <Card
                key={task.id}
                className="bg-gray-800/50 border-gray-700 hover:border-gray-600 cursor-pointer transition-all"
                onClick={() => handleTaskClick(task)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={task.status} showTooltip={true} size="lg" />
                        <div className={`w-2 h-2 rounded-full ${getPriorityColor(task.priority)}`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-semibold text-white">{task.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {task.serial}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-1 leading-relaxed">
                            {task.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>🧠 {task.memory_connections?.length || 0}</span>
                        <span>📁 {task.project}</span>
                        <span>{new Date(task.created).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="tree" className="space-y-4">
          <TaskTreeView 
            tasks={filteredTasks} 
            onTaskClick={handleTaskClick}
          />
        </TabsContent>
      </Tabs>

      {/* Task Detail Modal */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <StatusIcon status={selectedTask.status} showTooltip={true} size="md" />
                {selectedTask.title}
                <Badge variant="outline" className="text-xs">
                  {selectedTask.serial}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                View task details, linked memories, and update status.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Task Details Header */}
              <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                <h4 className="font-semibold text-white mb-3 text-lg">Task Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-medium w-16">Status:</span>
                      <div className="flex items-center gap-2">
                        <StatusIcon status={selectedTask.status} showTooltip={true} size="md" />
                        <span className="text-white capitalize">{selectedTask.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-medium w-16">Priority:</span>
                      <Badge className={getPriorityBadge(selectedTask.priority)}>
                        {selectedTask.priority.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-medium w-20">Project:</span>
                      <div className="flex items-center gap-2 text-white">
                        <span>📁</span>
                        <span>{selectedTask.project || 'No project'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 font-medium w-20">Category:</span>
                      <Badge className={getCategoryClass(selectedTask.category || 'personal')}>
                        {selectedTask.category || 'None'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Timestamps */}
                <div className="mt-4 pt-3 border-t border-gray-700 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Created:</span>
                    <span className="ml-2 text-gray-300">{formatRelativeTime(selectedTask.created)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Updated:</span>
                    <span className="ml-2 text-gray-300">{formatRelativeTime(selectedTask.updated)}</span>
                  </div>
                  {selectedTask.completed && (
                    <div className="col-span-2">
                      <span className="text-gray-400">Completed:</span>
                      <span className="ml-2 text-green-400">{formatRelativeTime(selectedTask.completed)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {selectedTask.description && (
                <div>
                  <h4 className="font-medium text-white mb-2">Description</h4>
                  <p className="text-gray-300 bg-gray-900/50 p-3 rounded-lg">
                    {selectedTask.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {selectedTask.tags && selectedTask.tags.length > 0 && (
                <div>
                  <h4 className="font-medium text-white mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Actions */}
              <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-700">
                <h4 className="font-semibold text-white mb-3">Update Status</h4>
                <TaskStatusButtonGroup 
                  currentStatus={selectedTask.status}
                  onStatusChange={(newStatus) => updateTaskStatus(selectedTask.id, newStatus)}
                />
              </div>

              {/* Connected Memories */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    🧠 Linked Memories
                    {taskContext && (
                      <Badge variant="outline" className="text-xs">
                        {taskContext.direct_memories.length + taskContext.related_memories.length} total
                      </Badge>
                    )}
                  </h4>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-xs"
                    onClick={() => {
                      console.log('View all memories for task:', selectedTask.id)
                      // TODO: Open memories tab with task filter
                    }}
                  >
                    🔍 View All Memories
                  </Button>
                </div>
                
                {(selectedTask.memory_connections && selectedTask.memory_connections.length > 0) || (taskContext && taskContext.direct_memories.length > 0) ? (
                  <div className="space-y-3">
                    {/* Show memory connections from task if available */}
                    {selectedTask.memory_connections && selectedTask.memory_connections.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">Memory Connections ({selectedTask.memory_connections.length})</h5>
                        {selectedTask.memory_connections.slice(0, 5).map((conn, i) => (
                          <div key={`${conn.memory_id}-${i}`} className="bg-gray-900/50 p-3 rounded-lg mb-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-400">
                                {conn.connection_type} • {Math.round(conn.relevance * 100)}% relevance
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">{conn.memory_serial || conn.memory_id}</span>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="text-xs p-1 h-6"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const response = await fetch(`/api/memories/${conn.memory_id}`);
                                      if (response.ok) {
                                        const memory = await response.json();
                                        alert(`Memory Content:\n\n${memory.content}`);
                                      }
                                    } catch (error) {
                                      console.error('Failed to fetch memory:', error);
                                    }
                                  }}
                                >
                                  👁️
                                </Button>
                              </div>
                            </div>
                            {conn.matched_terms && conn.matched_terms.length > 0 && (
                              <p className="text-xs text-gray-400 mb-1">
                                Matched: {conn.matched_terms.join(', ')}
                              </p>
                            )}
                          </div>
                        ))}
                        {selectedTask.memory_connections.length > 5 && (
                          <div className="text-center">
                            <Button size="sm" variant="ghost" className="text-xs text-gray-400">
                              +{selectedTask.memory_connections.length - 5} more connections
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Show direct memories from context if available */}
                    {taskContext && taskContext.direct_memories.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">Direct Connections ({taskContext.direct_memories.length})</h5>
                        {taskContext.direct_memories.slice(0, 3).map((memory, i) => (
                          <div key={`${memory.id}-${i}`} className="bg-gray-900/50 p-3 rounded-lg mb-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-400">
                                {memory.connection.type} • {Math.round(memory.connection.relevance * 100)}% relevance
                              </span>
                              <Button size="sm" variant="ghost" className="text-xs p-1 h-6">
                                👁️
                              </Button>
                            </div>
                            <p className="text-sm text-gray-300 line-clamp-2">
                              {memory.content.length > 200 ? memory.content.substring(0, 200) + '...' : memory.content}
                            </p>
                          </div>
                        ))}
                        {taskContext.direct_memories.length > 3 && (
                          <div className="text-center">
                            <Button size="sm" variant="ghost" className="text-xs text-gray-400">
                              +{taskContext.direct_memories.length - 3} more direct connections
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {taskContext && taskContext.related_memories.length > 0 && (
                      <div>
                        <h5 className="text-sm font-medium text-gray-300 mb-2">Related Memories ({taskContext.related_memories.length})</h5>
                        <div className="text-xs text-gray-400 bg-gray-900/30 p-2 rounded">
                          {taskContext.related_memories.slice(0, 2).map((memory, i) => (
                            <div key={`${memory.id}-${i}`} className="truncate mb-1">
                              📄 {memory.content.substring(0, 100)}...
                            </div>
                          ))}
                          {taskContext.related_memories.length > 2 && (
                            <div className="text-center mt-1">
                              <span className="text-gray-500">+{taskContext.related_memories.length - 2} more related</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-900/30 rounded-lg">
                    <div className="text-gray-400 text-sm">No memories linked to this task</div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="text-xs mt-2"
                      onClick={() => {
                        alert('Memory linking is handled automatically by the system. Memory connections are created when tasks are created or updated based on content similarity.')
                      }}
                    >
                      🔗 Link Memories
                    </Button>
                  </div>
                )}
              </div>

              {/* Subtasks */}
              {selectedTask.subtasks && selectedTask.subtasks.length > 0 && (
                <div>
                  <h4 className="font-medium text-white mb-2">Subtasks ({selectedTask.subtasks.length})</h4>
                  <div className="text-sm text-gray-400">
                    {selectedTask.subtasks.map((subtaskId, i) => (
                      <div key={`${subtaskId}-${i}`} className="py-1">
                        📝 {subtaskId}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update */}
              <div className="pt-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Change Status</h4>
                <TaskStatusButtonGroup
                  currentStatus={selectedTask.status}
                  onStatusChange={(status) => {
                    updateTaskStatus(selectedTask.id, status)
                    setSelectedTask(null)
                  }}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Update Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Update Tasks</DialogTitle>
            <DialogDescription>
              Update {selectedTasks.size} selected tasks
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Action</label>
              <Select value={bulkAction} onValueChange={(value) => setBulkAction(value as any)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status">Update Status</SelectItem>
                  <SelectItem value="priority">Update Priority</SelectItem>
                  <SelectItem value="project">Update Project</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Value</label>
              {bulkAction === 'status' && (
                <Select value={bulkValue} onValueChange={setBulkValue}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {bulkAction === 'priority' && (
                <Select value={bulkValue} onValueChange={setBulkValue}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              {bulkAction === 'project' && (
                <Input
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  placeholder="Enter project name"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={bulkUpdateTasks}
                disabled={!bulkValue.trim()}
                className="bg-green-600 hover:bg-green-700"
              >
                Update Tasks
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Template Selector */}
      <TemplateSelector
        open={showTaskTemplateSelector}
        onOpenChange={setShowTaskTemplateSelector}
        type="task"
        onSelectTemplate={handleTaskTemplate}
      />
    </div>
  )
}