import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Memory } from "@/types"
import { Plus, Folder, FolderOpen, Settings, X } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

interface ProjectTabsProps {
  memories: Memory[]
  currentProject: string
  onProjectChange: (projectId: string) => void
  onCreateProject?: (name: string) => void
  onDeleteProject?: (projectId: string) => void
  onMoveMemories?: (memoryIds: string[], projectId: string) => void
  className?: string
}

interface ProjectInfo {
  id: string
  name: string
  count: number
  lastUpdated: Date
  description?: string
}

export function ProjectTabs({
  memories,
  currentProject,
  onProjectChange,
  onCreateProject,
  onDeleteProject,
  onMoveMemories,
  className = ""
}: ProjectTabsProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [showManageDialog, setShowManageDialog] = useState(false)

  // Extract projects from memories
  const projects: ProjectInfo[] = [
    {
      id: "all",
      name: "All Projects",
      count: memories.length,
      lastUpdated: new Date(Math.max(...memories.map(m => new Date(m.timestamp || 0).getTime()))),
      description: "All memories across all projects"
    },
    {
      id: "default",
      name: "General",
      count: memories.filter(m => !m.project || m.project === "default").length,
      lastUpdated: new Date(Math.max(...memories.filter(m => !m.project || m.project === "default").map(m => new Date(m.timestamp || 0).getTime()))),
      description: "Memories not assigned to any specific project"
    }
  ]

  // Add user-defined projects
  const userProjects = Array.from(new Set(memories.map(m => m.project).filter(p => p && p !== "default")))
  userProjects.forEach(projectId => {
    const projectMemories = memories.filter(m => m.project === projectId)
    projects.push({
      id: projectId,
      name: projectId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      count: projectMemories.length,
      lastUpdated: new Date(Math.max(...projectMemories.map(m => new Date(m.timestamp || 0).getTime()))),
      description: `Project with ${projectMemories.length} memories`
    })
  })

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return
    
    const projectId = newProjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    if (onCreateProject) {
      onCreateProject(projectId)
    }
    
    setNewProjectName("")
    setNewProjectDescription("")
    setShowCreateDialog(false)
    onProjectChange(projectId)
  }

  const handleDeleteProject = (projectId: string) => {
    if (projectId === "all" || projectId === "default") return
    
    if (confirm(`Delete project "${projectId}" and move all memories to General?`)) {
      if (onDeleteProject) {
        onDeleteProject(projectId)
      }
      if (currentProject === projectId) {
        onProjectChange("default")
      }
    }
  }

  const formatLastUpdated = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return "Today"
    if (diffDays === 1) return "Yesterday"
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    return `${Math.floor(diffDays / 30)} months ago`
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Project Tabs Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Projects</h3>
        <div className="flex items-center gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project Name</label>
                  <Input
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter project name..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreateProject()
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description (Optional)</label>
                  <Input
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Project description..."
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
                    Create Project
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="sm" onClick={() => setShowManageDialog(true)}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Project Tabs */}
      <div className="flex flex-wrap gap-2">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onProjectChange(project.id)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
              ${currentProject === project.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }
            `}
          >
            {currentProject === project.id ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <Folder className="h-4 w-4" />
            )}
            <span>{project.name}</span>
            <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
              {project.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Current Project Info */}
      {currentProject !== "all" && (
        <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-white">
                {projects.find(p => p.id === currentProject)?.name}
              </h4>
              <p className="text-sm text-gray-400">
                {projects.find(p => p.id === currentProject)?.count} memories • 
                Last updated {formatLastUpdated(projects.find(p => p.id === currentProject)?.lastUpdated || new Date())}
              </p>
            </div>
            {currentProject !== "default" && currentProject !== "all" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteProject(currentProject)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Delete project</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Project Management Dialog */}
      <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Projects</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid gap-4">
              {projects.filter(p => p.id !== "all").map((project) => (
                <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Folder className="h-5 w-5 text-gray-500" />
                    <div>
                      <h4 className="font-medium">{project.name}</h4>
                      <p className="text-sm text-gray-600">
                        {project.count} memories • {formatLastUpdated(project.lastUpdated)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onProjectChange(project.id)}>
                      View
                    </Button>
                    {project.id !== "default" && (
                      <Button
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteProject(project.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}