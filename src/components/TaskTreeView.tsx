import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Circle, CheckCircle2, Clock, XCircle, Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Task {
  id: string
  title: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  project: string
  parent?: string
  children?: string[]
  memory_connections?: any[]
  level?: number
}

interface TaskTreeViewProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
}

export function TaskTreeView({ tasks, onTaskClick }: TaskTreeViewProps) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  // Group tasks by project
  const tasksByProject = tasks.reduce((acc, task) => {
    const project = task.project || 'default'
    if (!acc[project]) acc[project] = []
    acc[project].push(task)
    return acc
  }, {} as Record<string, Task[]>)

  // Build parent-child relationships
  const taskMap = new Map(tasks.map(t => [t.id, t]))
  const rootTasks = tasks.filter(t => !t.parent)

  const getChildren = (taskId: string): Task[] => {
    return tasks.filter(t => t.parent === taskId)
  }

  const toggleTask = (taskId: string) => {
    const newExpanded = new Set(expandedTasks)
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId)
    } else {
      newExpanded.add(taskId)
    }
    setExpandedTasks(newExpanded)
  }

  const toggleProject = (project: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(project)) {
      newExpanded.delete(project)
    } else {
      newExpanded.add(project)
    }
    setExpandedProjects(newExpanded)
  }

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'todo': return <Circle className="w-4 h-4 text-gray-400" />
      case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />
      case 'done': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'blocked': return <XCircle className="w-4 h-4 text-red-500" />
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent': return 'text-red-400 bg-red-500/20 border-red-500/30'
      case 'high': return 'text-orange-400 bg-orange-500/20 border-orange-500/30'
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30'
      case 'low': return 'text-green-400 bg-green-500/20 border-green-500/30'
    }
  }

  const renderTask = (task: Task, level: number = 0) => {
    const children = getChildren(task.id)
    const hasChildren = children.length > 0
    const isExpanded = expandedTasks.has(task.id)
    const memoryCount = task.memory_connections?.length || 0

    return (
      <div>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors
            ${level > 0 ? 'ml-' + (level * 6) : ''}
          `}
          onClick={() => onTaskClick?.(task)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleTask(task.id)
              }}
              className="p-0.5 hover:bg-gray-600 rounded text-gray-300"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-5" />}
          
          {getStatusIcon(task.status)}
          
          <span className="flex-1 text-sm text-white">{task.title}</span>
          
          {memoryCount > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Brain className="w-3 h-3" />
              <span>{memoryCount}</span>
            </div>
          )}
          
          <Badge 
            variant="outline" 
            className={`text-xs ${getPriorityColor(task.priority)}`}
          >
            {task.priority}
          </Badge>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {children.map(child => (
              <React.Fragment key={child.id}>
                {renderTask(child, level + 1)}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(tasksByProject).map(([project, projectTasks]) => {
        const isProjectExpanded = expandedProjects.has(project) ?? true
        const rootProjectTasks = projectTasks.filter(t => !t.parent)
        
        return (
          <div key={project} className="bg-gray-800/50 rounded-lg border border-gray-700 shadow-sm">
            <button
              onClick={() => toggleProject(project)}
              className="w-full px-4 py-3 flex items-center gap-2 hover:bg-gray-700/50 border-b border-gray-700 text-white"
            >
              {isProjectExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-300" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-300" />
              )}
              <span className="font-medium text-lg flex-1 text-left">
                {project === 'default' ? 'Uncategorized' : project}
              </span>
              <span className="text-sm text-gray-400">
                {projectTasks.length} tasks
              </span>
            </button>
            
            {isProjectExpanded && (
              <div className="p-2">
                {rootProjectTasks.map(task => (
                  <React.Fragment key={task.id}>
                    {renderTask(task)}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}