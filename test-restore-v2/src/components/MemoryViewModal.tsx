import React, { useState, useEffect } from 'react'
import { Memory, MemoryCategory } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Scroll, Calendar, Tag, User, Clock, Edit, Save, X, Loader2, Plus } from "lucide-react"

interface MemoryViewModalProps {
  memory: Memory | null
  isOpen: boolean
  onClose: () => void
  onSave?: (updatedMemory: Memory) => Promise<void>
}

const MEMORY_CATEGORIES: MemoryCategory[] = [
  'personal',
  'work', 
  'code',
  'research',
  'conversations',
  'preferences'
]

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    return date.toLocaleString()
  } catch (error) {
    return timestamp
  }
}

function extractTitle(content: string, memory?: Memory): string {
  // Check for LLM-generated title first
  if (memory?.tags) {
    const titleTag = memory.tags.find(tag => tag.startsWith('title:'))
    if (titleTag) {
      return titleTag.substring(6) // Remove 'title:' prefix
    }
  }
  
  // Look for markdown headers
  const headerMatch = content.match(/^#{1,6}\s+(.+)$/m)
  if (headerMatch) {
    return headerMatch[1].trim()
  }
  
  // Extract from first meaningful line
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length > 0) {
    const firstLine = lines[0].trim()
    if (firstLine.length > 5 && firstLine.length < 100) {
      return firstLine
    }
  }
  
  return content.substring(0, 50) + (content.length > 50 ? '...' : '')
}

function renderFormattedContent(content: string): React.ReactNode {
  // Split content into sections for better readability
  const sections = content.split(/\n\s*\n/).filter(section => section.trim())
  
  return (
    <div className="space-y-4">
      {sections.map((section, index) => {
        const trimmed = section.trim()
        
        // Handle headers
        if (trimmed.match(/^#{1,6}\s/)) {
          const level = (trimmed.match(/^#+/) || [''])[0].length
          const text = trimmed.replace(/^#+\s*/, '')
          const HeaderTag = `h${Math.min(level, 6)}` as keyof JSX.IntrinsicElements
          
          return (
            <HeaderTag 
              key={index}
              className={`font-semibold ${
                level === 1 ? 'text-lg' : 
                level === 2 ? 'text-base' : 
                'text-sm'
              } text-white`}
            >
              {text}
            </HeaderTag>
          )
        }
        
        // Handle code blocks
        if (trimmed.startsWith('```')) {
          const codeContent = trimmed.replace(/^```[\w]*\n?/, '').replace(/```$/, '')
          return (
            <pre key={index} className="bg-gray-800 p-3 rounded-lg overflow-x-auto text-sm">
              <code className="text-green-400">{codeContent}</code>
            </pre>
          )
        }
        
        // Handle bullet points
        if (trimmed.match(/^[-*+]\s/)) {
          const items = trimmed.split('\n').map(line => line.trim()).filter(Boolean)
          return (
            <ul key={index} className="list-disc list-inside space-y-1 text-gray-300">
              {items.map((item, itemIndex) => (
                <li key={itemIndex}>{item.replace(/^[-*+]\s/, '')}</li>
              ))}
            </ul>
          )
        }
        
        // Handle numbered lists
        if (trimmed.match(/^\d+\.\s/)) {
          const items = trimmed.split('\n').map(line => line.trim()).filter(Boolean)
          return (
            <ol key={index} className="list-decimal list-inside space-y-1 text-gray-300">
              {items.map((item, itemIndex) => (
                <li key={itemIndex}>{item.replace(/^\d+\.\s/, '')}</li>
              ))}
            </ol>
          )
        }
        
        // Handle regular paragraphs
        return (
          <p key={index} className="text-gray-300 leading-relaxed">
            {trimmed}
          </p>
        )
      })}
    </div>
  )
}

export function MemoryViewModal({ memory, isOpen, onClose, onSave }: MemoryViewModalProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editedMemory, setEditedMemory] = useState<Memory | null>(null)
  const [newTag, setNewTag] = useState('')

  useEffect(() => {
    if (memory) {
      setEditedMemory({ ...memory })
    }
    setIsEditMode(false)
  }, [memory])

  if (!memory || !editedMemory) return null

  const title = extractTitle(memory.content, memory)
  const visibleTags = (isEditMode ? editedMemory.tags : memory.tags)?.filter(tag => 
    !tag.startsWith('title:') && !tag.startsWith('summary:')
  ) || []

  const handleSave = async () => {
    if (!onSave || !editedMemory) return
    
    setIsSaving(true)
    try {
      await onSave(editedMemory)
      setIsEditMode(false)
    } catch (error) {
      console.error('Failed to save memory:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setEditedMemory({ ...memory })
    setIsEditMode(false)
    setNewTag('')
  }

  const handleAddTag = () => {
    if (newTag.trim() && editedMemory) {
      const updatedTags = [...(editedMemory.tags || []), newTag.trim()]
      setEditedMemory({ ...editedMemory, tags: updatedTags })
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    if (editedMemory) {
      const updatedTags = (editedMemory.tags || []).filter(tag => tag !== tagToRemove)
      setEditedMemory({ ...editedMemory, tags: updatedTags })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Scroll className="h-5 w-5 text-violet-400" />
              {title}
            </DialogTitle>
            {onSave && !isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>
        
        {/* Memory Metadata - View Mode */}
        {!isEditMode && (
          <div className="flex-shrink-0 flex flex-wrap items-center gap-3 pb-4 border-b border-gray-600">
          {/* Category */}
          {memory.category && (
            <Badge variant="secondary" className="bg-violet-500/20 text-violet-300">
              <Tag className="h-3 w-3 mr-1" />
              {memory.category}
            </Badge>
          )}
          
          {/* Priority */}
          {memory.priority && (
            <Badge 
              variant="secondary" 
              className={`${
                memory.priority === 'high' ? 'bg-red-500/20 text-red-300' :
                memory.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                'bg-green-500/20 text-green-300'
              }`}
            >
              {memory.priority}
            </Badge>
          )}
          
          {/* Project */}
          {memory.project && (
            <Badge variant="outline" className="text-blue-300 border-blue-300/30">
              <User className="h-3 w-3 mr-1" />
              {memory.project}
            </Badge>
          )}
          
          {/* Timestamp */}
          <Badge variant="outline" className="text-gray-300 border-gray-300/30">
            <Calendar className="h-3 w-3 mr-1" />
            {formatTimestamp(memory.timestamp)}
          </Badge>
          
          {/* Complexity */}
          {memory.complexity && (
            <Badge variant="outline" className="text-gray-300 border-gray-300/30">
              L{memory.complexity}
            </Badge>
          )}
          </div>
        )}
        
        {/* Edit Form - Edit Mode */}
        {isEditMode && (
          <div className="flex-shrink-0 space-y-4 pb-4 border-b border-gray-600">
            {/* Category and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={editedMemory.category || ''}
                  onValueChange={(value) => setEditedMemory({ ...editedMemory, category: value as MemoryCategory })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEMORY_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={editedMemory.priority || 'medium'}
                  onValueChange={(value) => setEditedMemory({ ...editedMemory, priority: value as 'low' | 'medium' | 'high' })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Project */}
            <div>
              <Label htmlFor="project">Project</Label>
              <Input
                id="project"
                value={editedMemory.project || ''}
                onChange={(e) => setEditedMemory({ ...editedMemory, project: e.target.value })}
                placeholder="Enter project name"
              />
            </div>
          </div>
        )}
        
        {/* Tags - View Mode */}
        {!isEditMode && visibleTags.length > 0 && (
          <div className="flex-shrink-0 flex flex-wrap gap-1 pb-4">
            {visibleTags.map((tag, index) => (
              <span 
                key={index}
                className="inline-flex items-center text-xs bg-gray-700/90 text-gray-200 px-2 py-1 rounded-md"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Tags - Edit Mode */}
        {isEditMode && (
          <div className="flex-shrink-0 space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {visibleTags.map((tag, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2">
          {isEditMode ? (
            <div>
              <Label htmlFor="content">Content</Label>
              <Textarea
                id="content"
                value={editedMemory.content}
                onChange={(e) => setEditedMemory({ ...editedMemory, content: e.target.value })}
                className="min-h-[300px] mt-2 font-mono text-sm"
                placeholder="Enter memory content..."
              />
            </div>
          ) : (
            <div className="space-y-4">
              {renderFormattedContent(memory.content)}
            </div>
          )}
        </div>
        
        {/* Footer with metadata */}
        {memory.metadata && (
          <div className="flex-shrink-0 pt-4 border-t border-gray-600">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-4">
                {memory.metadata.size && (
                  <span className="flex items-center gap-1">
                    <Scroll className="h-3 w-3" />
                    {(memory.metadata.size / 1024).toFixed(1)}KB
                  </span>
                )}
                {memory.metadata.accessCount && memory.metadata.accessCount > 0 && (
                  <span className="flex items-center gap-1">
                    👁️ {memory.metadata.accessCount} views
                  </span>
                )}
              </div>
              {memory.metadata.modified && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Modified: {formatTimestamp(memory.metadata.modified)}
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Edit Mode Footer */}
        {isEditMode && (
          <DialogFooter className="flex-shrink-0 pt-4 border-t border-gray-600">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}