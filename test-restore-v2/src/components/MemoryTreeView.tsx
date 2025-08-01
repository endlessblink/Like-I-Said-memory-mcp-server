import React, { useState } from 'react'
import { ChevronRight, ChevronDown, FileText, Clock, Users, Tag, Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Memory, MemoryCategory } from '@/types'

interface MemoryTreeViewProps {
  memories: Memory[]
  onMemoryClick?: (memory: Memory) => void
  extractTitle?: (content: string, memory?: Memory) => string
  extractTags?: (memory: Memory) => string[]
  getTagColor?: (tag: string) => { bg: string; text: string; border: string }
}

const categoryColors: Record<MemoryCategory, string> = {
  personal: "text-blue-400 bg-blue-500/20 border-blue-500/30",
  work: "text-green-400 bg-green-500/20 border-green-500/30", 
  code: "text-purple-400 bg-purple-500/20 border-purple-500/30",
  research: "text-orange-400 bg-orange-500/20 border-orange-500/30",
  conversations: "text-pink-400 bg-pink-500/20 border-pink-500/30",
  preferences: "text-gray-400 bg-gray-500/20 border-gray-500/30"
}

export function MemoryTreeView({ 
  memories, 
  onMemoryClick,
  extractTitle = (content: string) => content.substring(0, 50) + (content.length > 50 ? '...' : ''),
  extractTags = (memory: Memory) => memory.tags || [],
  getTagColor = (tag: string) => ({ bg: '#374151', text: '#9CA3AF', border: '#4B5563' })
}: MemoryTreeViewProps) {
  const [expandedMemories, setExpandedMemories] = useState<Set<string>>(new Set())
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())

  // Group memories by project
  const memoriesByProject = memories.reduce((acc, memory) => {
    const project = memory.project || 'default'
    if (!acc[project]) acc[project] = []
    acc[project].push(memory)
    return acc
  }, {} as Record<string, Memory[]>)

  // Build parent-child relationships using related_memories field
  const memoryMap = new Map(memories.map(m => [m.id, m]))
  
  // Helper function to get related memories
  const getRelatedMemories = (memoryId: string): Memory[] => {
    const memory = memoryMap.get(memoryId)
    if (!memory || !memory.metadata) return []
    
    // Check for related_memories in metadata or parse from tags
    const relatedIds = Array.isArray(memory.metadata.related_memories) ? memory.metadata.related_memories : []
    return relatedIds.map(id => memoryMap.get(id)).filter(Boolean) as Memory[]
  }

  // Helper function to get memories that reference this memory
  const getChildMemories = (memoryId: string): Memory[] => {
    return memories.filter(memory => {
      if (!memory.metadata) return false
      const relatedIds = Array.isArray(memory.metadata.related_memories) ? memory.metadata.related_memories : []
      return relatedIds.includes(memoryId)
    })
  }

  // Get root memories (those not referenced by others as related)
  const getRootMemories = (projectMemories: Memory[]): Memory[] => {
    const childIds = new Set<string>()
    
    projectMemories.forEach(memory => {
      if (memory.metadata?.related_memories && Array.isArray(memory.metadata.related_memories)) {
        memory.metadata.related_memories.forEach(id => childIds.add(id))
      }
    })
    
    return projectMemories.filter(memory => !childIds.has(memory.id))
  }

  // Find memories with shared tags as secondary connections
  const getTagConnections = (memory: Memory): Memory[] => {
    const memoryTags = extractTags(memory)
    if (memoryTags.length === 0) return []
    
    return memories.filter(other => {
      if (other.id === memory.id) return false
      const otherTags = extractTags(other)
      return memoryTags.some(tag => otherTags.includes(tag))
    }).slice(0, 3) // Limit to 3 connections to avoid clutter
  }

  const toggleMemory = (memoryId: string) => {
    const newExpanded = new Set(expandedMemories)
    if (newExpanded.has(memoryId)) {
      newExpanded.delete(memoryId)
    } else {
      newExpanded.add(memoryId)
    }
    setExpandedMemories(newExpanded)
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

  const getCategoryIcon = (category: MemoryCategory | undefined) => {
    switch (category) {
      case 'personal': return '👤'
      case 'work': return '💼'
      case 'code': return '💻'
      case 'research': return '🔬'
      case 'conversations': return '💬'
      case 'preferences': return '⚙️'
      default: return '📄'
    }
  }

  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp)
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

  const renderMemory = (memory: Memory, level: number = 0) => {
    const relatedMemories = getRelatedMemories(memory.id)
    const childMemories = getChildMemories(memory.id)
    const tagConnections = getTagConnections(memory)
    
    const allConnections = [...relatedMemories, ...childMemories]
    const hasConnections = allConnections.length > 0 || tagConnections.length > 0
    const isExpanded = expandedMemories.has(memory.id)
    
    const memoryTags = extractTags(memory)
    const title = extractTitle(memory.content, memory)

    return (
      <div key={memory.id}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors
            ${level > 0 ? 'ml-' + (level * 6) : ''}
          `}
          onClick={() => onMemoryClick?.(memory)}
        >
          {hasConnections && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleMemory(memory.id)
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
          {!hasConnections && <div className="w-5" />}
          
          <FileText className="w-4 h-4 text-violet-400" />
          
          <span className="flex-1 text-sm text-white font-medium truncate">{title}</span>
          
          {/* Category badge */}
          {memory.category && (
            <span className={`text-xs px-2 py-1 rounded-full ${categoryColors[memory.category]}`}>
              {getCategoryIcon(memory.category)}
            </span>
          )}
          
          {/* Tag count */}
          {memoryTags.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Tag className="w-3 h-3" />
              <span>{memoryTags.length}</span>
            </div>
          )}
          
          {/* Connections count */}
          {allConnections.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Brain className="w-3 h-3" />
              <span>{allConnections.length}</span>
            </div>
          )}
          
          {/* Time */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(memory.timestamp)}</span>
          </div>
        </div>
        
        {isExpanded && (
          <div className="ml-4 pl-4 border-l border-gray-700">
            {/* Direct related memories */}
            {relatedMemories.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-gray-400 mb-1 ml-2">🔗 Related</div>
                {relatedMemories.map(related => (
                  <React.Fragment key={`related-${related.id}`}>
                    {renderMemory(related, level + 1)}
                  </React.Fragment>
                ))}
              </div>
            )}
            
            {/* Child memories (those that reference this memory) */}
            {childMemories.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-gray-400 mb-1 ml-2">📎 References</div>
                {childMemories.map(child => (
                  <React.Fragment key={`child-${child.id}`}>
                    {renderMemory(child, level + 1)}
                  </React.Fragment>
                ))}
              </div>
            )}
            
            {/* Tag-based connections */}
            {tagConnections.length > 0 && (
              <div className="mb-2">
                <div className="text-xs text-gray-400 mb-1 ml-2">🏷️ Similar Tags</div>
                {tagConnections.map(connection => (
                  <div 
                    key={`tag-${connection.id}`}
                    className="flex items-center gap-2 px-3 py-1 ml-2 text-xs text-gray-400 hover:bg-gray-700/30 rounded cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      onMemoryClick?.(connection)
                    }}
                  >
                    <FileText className="w-3 h-3" />
                    <span className="flex-1 truncate">{extractTitle(connection.content, connection)}</span>
                    <div className="flex gap-1">
                      {extractTags(connection).slice(0, 2).map(tag => (
                        <span key={tag} className="text-xs bg-gray-600 px-1 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {Object.entries(memoriesByProject).map(([project, projectMemories]) => {
        const isProjectExpanded = expandedProjects.has(project) ?? true
        const rootMemories = getRootMemories(projectMemories)
        
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
                📁 {project === 'default' ? 'General' : project}
              </span>
              <span className="text-sm text-gray-400">
                {projectMemories.length} memories
              </span>
            </button>
            
            {isProjectExpanded && (
              <div className="p-2">
                {rootMemories.length > 0 ? (
                  rootMemories.map(memory => (
                    <React.Fragment key={memory.id}>
                      {renderMemory(memory)}
                    </React.Fragment>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No memories in this project</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}