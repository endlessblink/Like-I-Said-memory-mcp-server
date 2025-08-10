import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
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
import { TaskStatusButtonGroup as ImprovedTaskStatusButtonGroup, TaskStatusIndicator } from './TaskStatusButtonImproved'
import { TemplateSelector } from './TemplateSelector'
import { StatusIcon, getStatusIcon, getStatusColor } from './StatusIcon'
import { MemoryViewModal } from './MemoryViewModal'
import EnhancedTaskDetailDialog from './EnhancedTaskDetailDialog'
import { Memory } from '@/types'
import { Clock, Edit, FileText, Users, Eye, Loader2, Trash2, Plus, Minus } from 'lucide-react'
import { formatDistanceToNow } from '@/utils/helpers'

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
  tasks: Task[]
  isLoading: boolean
  currentProject?: string
  onTasksChange?: () => void
}

export function TaskManagement({ tasks: propTasks, isLoading: propIsLoading, currentProject, onTasksChange }: TaskManagementProps) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [taskContext, setTaskContext] = useState<TaskContext | null>(null)
  const [useEnhancedDialog, setUseEnhancedDialog] = useState(true) // Toggle for enhanced vs basic dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [allProjects, setAllProjects] = useState<string[]>([])
  const [filter, setFilter] = useState<{
    status?: string
    project?: string
    priority?: string
  }>({
    project: currentProject || 'all'
  })
  
  // Task creation states
  const [isCreatingTask, setIsCreatingTask] = useState(false)
  const [taskCreationResult, setTaskCreationResult] = useState<{
    success: boolean
    taskTitle?: string
    linkedCount?: number
    message: string
  } | null>(null)
  
  // Bulk operations state
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [bulkAction, setBulkAction] = useState<'status' | 'priority' | 'project' | 'delete'>('status')
  const [bulkValue, setBulkValue] = useState('')
  
  // Archive view state
  const [hideCompleted, setHideCompleted] = useState(() => {
    const saved = localStorage.getItem('hideCompletedTasks')
    return saved ? saved === 'true' : false
  })
  
  // Memory view modal state
  const [memoryViewModal, setMemoryViewModal] = useState<{
    isOpen: boolean
    memory: Memory | null
  }>({
    isOpen: false,
    memory: null
  })
  
  // Handle memory save from view modal
  const handleSaveMemory = async (updatedMemory: Memory): Promise<void> => {
    try {
      const response = await fetch(`/api/memories/${updatedMemory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: updatedMemory.content,
          category: updatedMemory.category,
          priority: updatedMemory.priority,
          tags: updatedMemory.tags,
          project: updatedMemory.project
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to update memory')
      }
      
      // Update the memory in the modal state to reflect changes
      setMemoryViewModal(prev => ({
        ...prev,
        memory: updatedMemory
      }))
      
      // Optionally refresh task context if needed
      if (selectedTask) {
        getTaskContext(selectedTask.id)
      }
    } catch (error) {
      console.error('Failed to save memory:', error)
      throw error
    }
  }
  
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
  const [suggestedMemories, setSuggestedMemories] = useState([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  // Filter tasks based on current filter settings using useMemo
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filter.status && task.status !== filter.status) return false
      if (filter.priority && task.priority !== filter.priority) return false
      return true
    })
  }, [tasks, filter.status, filter.priority])
  
  // Filter out completed tasks if hideCompleted is true
  const visibleTasks = useMemo(() => {
    if (hideCompleted) {
      return filteredTasks.filter(task => task.status !== 'done')
    }
    return filteredTasks
  }, [filteredTasks, hideCompleted])
  
  // Get only completed tasks for archive view
  const archivedTasks = useMemo(() => {
    return filteredTasks.filter(task => task.status === 'done')
  }, [filteredTasks])

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

  // Preview memory suggestions
  const previewMemorySuggestions = async () => {
    if (!newTask.title.trim() || !newTask.autoLinkMemories) {
      setSuggestedMemories([])
      return
    }

    setIsLoadingSuggestions(true)
    try {
      const response = await fetch('/api/memories/suggest-for-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description,
          project: newTask.project || currentProject || 'default',
          category: newTask.category,
          tags: newTask.tags.split(',').map(t => t.trim()).filter(Boolean)
        })
      })

      if (response.ok) {
        const suggestions = await response.json()
        setSuggestedMemories(suggestions.slice(0, 3)) // Show top 3 suggestions
      } else {
        setSuggestedMemories([])
      }
    } catch (error) {
      console.error('Failed to get memory suggestions:', error)
      setSuggestedMemories([])
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  // Create task
  const createTask = async () => {
    if (!newTask.title.trim()) return

    setIsCreatingTask(true)
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
        const result = await response.json()
        
        // Parse the response to extract linking information
        const responseText = result.content?.[0]?.text || ''
        const memoryConnectionsMatch = responseText.match(/Auto-linked: (\d+) memories/)
        const linkedCount = memoryConnectionsMatch ? parseInt(memoryConnectionsMatch[1]) : 0
        
        // Show success message with linking results
        if (newTask.autoLinkMemories && linkedCount > 0) {
          setTaskCreationResult({
            success: true,
            taskTitle: newTask.title,
            linkedCount,
            message: `Task created successfully! 🧠 Automatically linked ${linkedCount} relevant ${linkedCount === 1 ? 'memory' : 'memories'}.`
          })
        } else if (newTask.autoLinkMemories && linkedCount === 0) {
          setTaskCreationResult({
            success: true,
            taskTitle: newTask.title,
            linkedCount: 0,
            message: `Task created successfully! No relevant memories found for automatic linking.`
          })
        } else {
          setTaskCreationResult({
            success: true,
            taskTitle: newTask.title,
            linkedCount: 0,
            message: `Task created successfully!`
          })
        }

        setNewTask({
          title: '',
          description: '',
          project: currentProject || '',
          category: 'code',
          priority: 'medium',
          tags: '',
          autoLinkMemories: true
        })
        setSuggestedMemories([])
        setShowCreateDialog(false)
        
        // Auto-dismiss success message after 4 seconds
        setTimeout(() => setTaskCreationResult(null), 4000)
        
        if (onTasksChange) {
          await onTasksChange()
        } else {
          await loadTasks()
        }
      } else {
        const error = await response.text()
        setTaskCreationResult({
          success: false,
          message: `Failed to create task: ${error}`
        })
        setTimeout(() => setTaskCreationResult(null), 5000)
      }
    } catch (error) {
      console.error('Task creation failed:', error)
      setTaskCreationResult({
        success: false,
        message: `Failed to create task: ${error.message}`
      })
      setTimeout(() => setTaskCreationResult(null), 5000)
    } finally {
      setIsCreatingTask(false)
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
        if (onTasksChange) {
          await onTasksChange()
        } else {
          if (onTasksChange) {
        await onTasksChange()
      } else {
        await loadTasks()
      }
        }
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
        if (onTasksChange) {
          await onTasksChange()
        } else {
          if (onTasksChange) {
        await onTasksChange()
      } else {
        await loadTasks()
      }
        }
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
  const handleTaskSelect = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(taskId)) {
        newSet.delete(taskId)
      } else {
        newSet.add(taskId)
      }
      return newSet
    })
  }, [])

  const selectAllTasks = useCallback(() => {
    const visibleTaskIds = filteredTasks.map(t => t.id)
    setSelectedTasks(new Set(visibleTaskIds))
  }, [filteredTasks])

  const clearTaskSelection = useCallback(() => {
    setSelectedTasks(new Set())
  }, [])

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
      if (onTasksChange) {
        await onTasksChange()
      } else {
        await loadTasks()
      }
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

  // Sync with prop tasks
  useEffect(() => {
    setTasks(propTasks || [])
    setIsLoading(propIsLoading)
  }, [propTasks, propIsLoading])

  useEffect(() => {
    // Only load tasks if not using prop tasks
    if (!propTasks || propTasks.length === 0) {
      loadTasks()
    }
  }, [filter, currentProject])

  // Auto-preview memory suggestions when task details change
  useEffect(() => {
    const timer = setTimeout(() => {
      previewMemorySuggestions()
    }, 500) // Debounce for 500ms
    
    return () => clearTimeout(timer)
  }, [newTask.title, newTask.description, newTask.project, newTask.category, newTask.tags, newTask.autoLinkMemories])

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
        getTaskContext(task.id)
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
  }, [selectAllTasks, clearTaskSelection])

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

  // Group tasks by project first, then by status within each project
  const tasksByProject = useMemo(() => {
    return visibleTasks.reduce((acc, task) => {
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
  }, [visibleTasks])

  // Legacy grouping for backward compatibility
  const tasksByStatus = useMemo(() => {
    return {
      todo: filteredTasks.filter(t => t.status === 'todo'),
      in_progress: filteredTasks.filter(t => t.status === 'in_progress'),
      done: filteredTasks.filter(t => t.status === 'done'),
      blocked: filteredTasks.filter(t => t.status === 'blocked')
    }
  }, [filteredTasks])

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
          {archivedTasks.length > 0 && hideCompleted && (
            <Badge variant="secondary" className="bg-green-500/20 text-green-300">
              {archivedTasks.length} archived
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          {/* Hide Completed Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="hide-completed"
              checked={hideCompleted}
              onCheckedChange={(checked) => {
                setHideCompleted(checked)
                localStorage.setItem('hideCompletedTasks', checked.toString())
              }}
            />
            <Label htmlFor="hide-completed" className="text-sm text-gray-300 cursor-pointer">
              Hide completed
            </Label>
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
                
                {/* Memory Link Preview */}
                {newTask.autoLinkMemories && (newTask.title.trim() || newTask.description.trim()) && (
                  <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      <span className="text-sm font-medium text-gray-300">Memory Link Preview</span>
                      {isLoadingSuggestions && (
                        <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                      )}
                    </div>
                    
                    {suggestedMemories.length > 0 ? (
                      <div className="space-y-2">
                        {suggestedMemories.map((memory, index) => (
                          <div key={memory.id} className="flex items-start gap-2 p-2 bg-gray-900/50 rounded border border-gray-600">
                            <div className="w-2 h-2 rounded-full bg-violet-400 mt-2 flex-shrink-0"></div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-200 line-clamp-1">
                                {memory.title || memory.content?.substring(0, 60) + '...'}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Relevance: {Math.round((memory.relevance || 0.5) * 100)}% • {memory.connection_type || 'related'}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div className="text-xs text-gray-500 mt-2">
                          These memories will be automatically linked when the task is created.
                        </div>
                      </div>
                    ) : !isLoadingSuggestions ? (
                      <div className="text-sm text-gray-500">
                        No related memories found. The task will be created without automatic links.
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowTaskTemplateSelector(true)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  📋 Templates
                </Button>
                <Button variant="outline" onClick={() => {
                  setSuggestedMemories([])
                  setShowCreateDialog(false)
                }}>
                  Cancel
                </Button>
                <Button 
                  onClick={createTask} 
                  disabled={!newTask.title.trim() || isCreatingTask}
                  className="min-w-[120px]"
                >
                  {isCreatingTask ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </div>
                  ) : (
                    'Create Task'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
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

        <Button variant="outline" onClick={onTasksChange || loadTasks} className="text-gray-300">
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

      {/* Task Creation Result Notification */}
      {taskCreationResult && (
        <div className={`p-4 rounded-lg border transition-all duration-300 ${
          taskCreationResult.success 
            ? 'bg-green-900/30 border-green-600/50 text-green-300' 
            : 'bg-red-900/30 border-red-600/50 text-red-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`text-xl ${taskCreationResult.success ? 'text-green-400' : 'text-red-400'}`}>
                {taskCreationResult.success ? '✅' : '❌'}
              </div>
              <div>
                <div className="font-medium">{taskCreationResult.message}</div>
                {taskCreationResult.taskTitle && (
                  <div className="text-sm opacity-80 mt-1">
                    Task: "{taskCreationResult.taskTitle}"
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTaskCreationResult(null)}
              className="text-gray-400 hover:text-gray-200"
            >
              ✕
            </Button>
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
          <TabsTrigger value="archive" className="text-gray-300 data-[state=active]:text-white">
            📦 Archive ({archivedTasks.length})
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                        
                        <div className="space-y-3">
                          {statusTasks.map((task) => (
                            <div
                              key={task.id}
                              className={`
                                card-glass ${getPriorityClass(task.priority)} group cursor-pointer overflow-hidden
                                ${selectedTasks.has(task.id) ? 'ring-2 ring-blue-500 border-blue-400' : ''}
                                w-full h-[260px] flex flex-col
                                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900
                              `}
                              onClick={() => handleTaskClick(task)}
                              tabIndex={0}
                              role="article"
                              aria-label={`Task: ${task.title} - ${task.status}`}
                            >
                              {/* Selection Checkbox - Top Row */}
                              <div className="absolute top-3 left-3 z-10">
                                <input
                                  type="checkbox"
                                  checked={selectedTasks.has(task.id)}
                                  onChange={() => handleTaskSelect(task.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-5 h-5 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 backdrop-blur-sm cursor-pointer touch-manipulation"
                                  aria-label={`Select task: ${task.title}`}
                                />
                              </div>

                              {/* Card Content */}
                              <div className="flex flex-col h-full p-4 relative">
                                {/* Header with badges */}
                                <div className="flex items-start justify-between mb-3 flex-shrink-0 ml-6 -mt-1">
                                  <div className="flex items-start flex-wrap gap-1.5 flex-1 min-w-0">
                                    {/* Status Badge */}
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 text-2xs font-semibold rounded-md ${getStatusColor(task.status)}`}>
                                      <StatusIcon status={task.status} showTooltip={false} size="sm" />
                                      {task.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                    
                                    {/* Priority Badge */}
                                    <span className={`inline-flex items-center px-2 py-1 text-2xs font-semibold rounded-md ${
                                      task.priority === 'urgent' ? 'bg-red-700/50 text-red-300' :
                                      task.priority === 'high' ? 'bg-orange-700/50 text-orange-300' :
                                      task.priority === 'medium' ? 'bg-yellow-700/50 text-yellow-300' :
                                      'bg-gray-700/50 text-gray-300'
                                    }`}>
                                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                    </span>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleTaskClick(task)
                                      }}
                                      className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-300 transition-colors rounded-lg flex items-center justify-center touch-manipulation"
                                      aria-label={`Edit task: ${task.title}`}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
                                          deleteTask(task.id)
                                        }
                                      }}
                                      className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-300 transition-colors rounded-lg flex items-center justify-center touch-manipulation"
                                      aria-label={`Delete task: ${task.title}`}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Title */}
                                <div className="flex-shrink-0 mb-2">
                                  <h3 className="text-base font-semibold leading-tight text-white">
                                    <div className="line-clamp-2 break-words">
                                      {task.title}
                                    </div>
                                  </h3>
                                </div>

                                {/* Description - Fixed height container */}
                                <div className="flex-1 mb-4 min-h-0 relative z-10">
                                  <div className="text-sm text-gray-300 leading-relaxed overflow-hidden" style={{ maxHeight: '4.5rem' }}>
                                    <div className="line-clamp-3 break-words">
                                      {task.description || 'No description provided'}
                                    </div>
                                  </div>
                                </div>

                                {/* Tags - Fixed position */}
                                {task.tags && task.tags.length > 0 && (
                                  <div className="flex-shrink-0 mb-3 h-6 overflow-hidden relative z-20">
                                    <div className="flex items-center gap-1 h-full">
                                      {task.tags.slice(0, 3).map((tag, index) => (
                                        <span 
                                          key={`${tag}-${index}`} 
                                          className="inline-flex items-center text-2xs bg-gray-700/90 text-gray-200 px-2 py-0.5 rounded-sm font-medium whitespace-nowrap max-w-[80px] truncate z-20" 
                                          title={`#${tag}`}
                                        >
                                          #{tag.length > 10 ? tag.substring(0, 10) + '...' : tag}
                                        </span>
                                      ))}
                                      {task.tags.length > 3 && (
                                        <span 
                                          className="inline-flex items-center text-2xs bg-gray-600/90 text-gray-300 px-1.5 py-0.5 rounded-sm font-medium whitespace-nowrap z-20" 
                                          title={`${task.tags.length - 3} more tags: ${task.tags.slice(3).join(', ')}`}
                                        >
                                          +{task.tags.length - 3}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Footer */}
                                <div className="flex items-center justify-between pt-2 border-t border-gray-600/30 flex-shrink-0 h-8">
                                  <div className="flex items-center gap-2 text-2xs text-gray-500 min-w-0 flex-1">
                                    {/* Last Modified */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <Clock className="h-3 w-3" />
                                      <span className="whitespace-nowrap">{formatDistanceToNow(new Date(task.updated))}</span>
                                    </div>
                                    
                                    {/* Memory Connections */}
                                    {task.memory_connections && task.memory_connections.length > 0 && (
                                      <div className="flex items-center gap-1 flex-shrink-0" title={`${task.memory_connections.length} linked ${task.memory_connections.length === 1 ? 'memory' : 'memories'}`}>
                                        <FileText className="h-3 w-3 text-purple-400" />
                                        <span className="text-purple-400 font-medium">{task.memory_connections.length}</span>
                                        {task.memory_connections.length > 3 && (
                                          <span className="text-xs text-purple-300">🔗</span>
                                        )}
                                      </div>
                                    )}
                                    
                                    {/* Subtasks */}
                                    {task.subtasks && task.subtasks.length > 0 && (
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                        <Users className="h-3 w-3 text-blue-400" />
                                        <span>{task.subtasks.length}</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Serial Number */}
                                  <div className="text-2xs text-gray-500 font-mono flex-shrink-0">
                                    {task.serial}
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
                        <span className={`flex items-center gap-1 ${
                          task.memory_connections && task.memory_connections.length > 0 
                            ? 'text-purple-400 font-medium' 
                            : ''
                        }`} title={`${task.memory_connections?.length || 0} linked ${(task.memory_connections?.length || 0) === 1 ? 'memory' : 'memories'}`}>
                          🧠 {task.memory_connections?.length || 0}
                          {task.memory_connections && task.memory_connections.length > 3 && (
                            <span className="text-xs">🔗</span>
                          )}
                        </span>
                        <span>📁 {task.project}</span>
                        <span>{new Date(task.created).toLocaleDateString()}</span>
                        
                        {/* Action Buttons for List View */}
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTaskClick(task)
                            }}
                            className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-300 transition-colors rounded-lg flex items-center justify-center touch-manipulation"
                            aria-label={`Edit task: ${task.title}`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm(`Are you sure you want to delete "${task.title}"?`)) {
                                deleteTask(task.id)
                              }
                            }}
                            className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-300 transition-colors rounded-lg flex items-center justify-center touch-manipulation"
                            aria-label={`Delete task: ${task.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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

        <TabsContent value="archive" className="space-y-4">
          {archivedTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">📦 No archived tasks</div>
              <div className="text-gray-500 text-sm">Completed tasks will appear here when you have any</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  Archived Tasks ({archivedTasks.length})
                </h3>
                <div className="text-sm text-gray-400">
                  Showing all completed tasks
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`card-glass ${getPriorityClass(task.priority)} group cursor-pointer overflow-hidden w-full min-h-[240px] h-auto flex ${selectedTasks.has(task.id) ? 'ring-2 ring-green-500 border-green-400' : ''}`}
                    onClick={() => handleTaskClick(task)}
                  >
                    {/* Selection Checkbox */}
                    <div className="flex-shrink-0 p-4 flex items-start">
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => handleTaskSelect(task.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 mt-0.5 text-green-600 bg-white/10 border-white/20 rounded focus:ring-green-500 focus:ring-2 backdrop-blur-sm cursor-pointer"
                      />
                    </div>

                    <div className="flex-1 flex flex-col h-full pr-4 py-4 gap-3" style={{ minHeight: 0, maxHeight: '100%' }}>
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2 flex-shrink-0">
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
                          
                          {/* Completed Badge */}
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-green-500/20 text-green-300 border border-green-500/30">
                            <StatusIcon status="done" showTooltip={true} size="sm" className="inline" /> Completed
                          </span>
                          
                          {/* Priority Badge */}
                          <span className={getPriorityBadge(task.priority)}>
                            {task.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="font-medium text-white task-card-title mb-2 line-clamp-3 group-hover:text-blue-200 transition-colors duration-200">
                        {task.title}
                      </h4>

                      {/* Description */}
                      {task.description && (
                        <p className="text-gray-400 text-sm task-card-description line-clamp-3 mb-2 flex-1">
                          {task.description}
                        </p>
                      )}

                      {/* Footer */}
                      <div className="mt-auto pt-3 border-t border-white/10">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>Completed {formatRelativeTime(task.completed || task.updated)}</span>
                          </div>
                          
                          {/* Task connections */}
                          <div className="flex items-center gap-2">
                            {task.memory_connections && task.memory_connections.length > 0 && (
                              <span className="text-violet-400 text-xs" title={`${task.memory_connections.length} memory connections`}>
                                🧠 {task.memory_connections.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Enhanced Task Detail Dialog */}
      <EnhancedTaskDetailDialog
        task={selectedTask}
        isOpen={!!selectedTask && useEnhancedDialog}
        onClose={() => setSelectedTask(null)}
        onUpdateTask={async (taskId: string, updates: Partial<Task>) => {
          // For now, just handle status updates - can be expanded later
          if (updates.status) {
            await updateTaskStatus(taskId, updates.status)
          }
        }}
        onDeleteTask={async (taskId: string) => {
          await deleteTask(taskId)
        }}
        taskContext={taskContext}
        getTaskContext={getTaskContext}
        formatRelativeTime={formatRelativeTime}
      />

      {/* Basic Dialog (Fallback) */}
      {selectedTask && !useEnhancedDialog && (
        <Dialog open={!!selectedTask} onOpenChange={() => setSelectedTask(null)}>
          <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedTask.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="text-gray-300">
                {selectedTask.description || 'No description'}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setUseEnhancedDialog(true)}
                >
                  Use Enhanced View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedTask(null)}
                >
                  Close
                </Button>
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

      {/* Memory View Modal */}
      <MemoryViewModal
        memory={memoryViewModal.memory}
        isOpen={memoryViewModal.isOpen}
        onClose={() => setMemoryViewModal({ isOpen: false, memory: null })}
        onSave={handleSaveMemory}
      />
    </div>
  )
}