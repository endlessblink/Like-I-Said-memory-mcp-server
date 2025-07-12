import React, { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface QuickCaptureProps {
  onCreateMemory: (content: string, tags: string[], category?: string, project?: string) => Promise<void>
  onCreateTask: (title: string, description: string, category: string, priority: string, project?: string, tags?: string[]) => Promise<void>
  availableProjects: string[]
  className?: string
}

export function QuickCapture({ 
  onCreateMemory, 
  onCreateTask, 
  availableProjects, 
  className = '' 
}: QuickCaptureProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showFullDialog, setShowFullDialog] = useState(false)
  const [captureMode, setCaptureMode] = useState<'memory' | 'task'>('memory')
  const [quickText, setQuickText] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Full dialog state
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    category: 'personal' as const,
    priority: 'medium' as const,
    project: '',
    tags: ''
  })

  const quickInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && quickInputRef.current) {
      quickInputRef.current.focus()
    }
  }, [isExpanded])

  // Focus textarea when dialog opens
  useEffect(() => {
    if (showFullDialog && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [showFullDialog])

  // Handle click outside to collapse
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isExpanded && !target.closest('.quick-capture-container')) {
        setIsExpanded(false)
        setQuickText('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isExpanded])

  const handleQuickSubmit = async () => {
    if (!quickText.trim()) return

    setIsCreating(true)
    try {
      if (captureMode === 'memory') {
        // Extract tags from text (look for #hashtags)
        const tagMatches = quickText.match(/#\w+/g) || []
        const tags = tagMatches.map(tag => tag.substring(1))
        const contentWithoutTags = quickText.replace(/#\w+/g, '').trim()
        
        await onCreateMemory(contentWithoutTags, tags)
      } else {
        // For tasks, treat the text as title, with basic categorization
        const category = guessTaskCategory(quickText)
        await onCreateTask(quickText, '', category, 'medium')
      }
      
      setQuickText('')
      setIsExpanded(false)
    } catch (error) {
      console.error('Failed to create:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleFullSubmit = async () => {
    if (captureMode === 'memory' && !formData.content.trim()) return
    if (captureMode === 'task' && !formData.title.trim()) return

    setIsCreating(true)
    try {
      if (captureMode === 'memory') {
        const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        await onCreateMemory(
          formData.content, 
          tags, 
          formData.category, 
          formData.project || undefined
        )
      } else {
        const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        await onCreateTask(
          formData.title,
          formData.description,
          formData.category,
          formData.priority,
          formData.project || undefined,
          tags
        )
      }
      
      setFormData({
        title: '',
        content: '',
        description: '',
        category: 'personal',
        priority: 'medium',
        project: '',
        tags: ''
      })
      setShowFullDialog(false)
    } catch (error) {
      console.error('Failed to create:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const guessTaskCategory = (text: string): string => {
    const lowerText = text.toLowerCase()
    if (lowerText.includes('bug') || lowerText.includes('fix') || lowerText.includes('error')) return 'code'
    if (lowerText.includes('meeting') || lowerText.includes('call') || lowerText.includes('client')) return 'work'
    if (lowerText.includes('research') || lowerText.includes('study') || lowerText.includes('learn')) return 'research'
    return 'personal'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleQuickSubmit()
    } else if (e.key === 'Escape') {
      setIsExpanded(false)
      setQuickText('')
    }
  }

  return (
    <>
      <div className={`quick-capture-container fixed bottom-6 right-6 z-50 ${className}`}>
        {!isExpanded ? (
          /* Floating Action Button */
          <Button
            onClick={() => setIsExpanded(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 border border-white/10"
            title="Quick Capture (Ctrl+Q)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
        ) : (
          /* Expanded Quick Capture */
          <div className="bg-gray-800/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-600/50 p-4 w-80 max-w-[90vw]">
            {/* Mode Toggle */}
            <div className="flex items-center gap-1 mb-3 p-1 bg-gray-700/50 rounded-lg">
              <Button
                variant={captureMode === 'memory' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCaptureMode('memory')}
                className={`flex-1 text-xs ${captureMode === 'memory' ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
              >
                🧠 Memory
              </Button>
              <Button
                variant={captureMode === 'task' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setCaptureMode('task')}
                className={`flex-1 text-xs ${captureMode === 'task' ? 'bg-violet-600 hover:bg-violet-700' : ''}`}
              >
                📋 Task
              </Button>
            </div>

            {/* Quick Input */}
            <div className="space-y-3">
              <Input
                ref={quickInputRef}
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  captureMode === 'memory' 
                    ? 'Quick memory... (use #tags)'
                    : 'Quick task title...'
                }
                className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                disabled={isCreating}
              />

              <div className="flex items-center gap-2">
                <Button
                  onClick={handleQuickSubmit}
                  disabled={!quickText.trim() || isCreating}
                  size="sm"
                  className="bg-violet-600 hover:bg-violet-700 flex-1"
                >
                  {isCreating ? (
                    <>
                      <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Creating...
                    </>
                  ) : (
                    `Add ${captureMode === 'memory' ? 'Memory' : 'Task'}`
                  )}
                </Button>
                
                <Button
                  onClick={() => setShowFullDialog(true)}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300"
                  title="Full editor"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                </Button>
              </div>

              {/* Quick Tips */}
              <div className="text-xs text-gray-400 space-y-1">
                <p>💡 <strong>Tips:</strong></p>
                {captureMode === 'memory' ? (
                  <p>• Use #hashtags for auto-tagging</p>
                ) : (
                  <p>• Use keywords: bug, meeting, research for auto-categorization</p>
                )}
                <p>• Press Enter to create, Escape to close</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Full Editor Dialog */}
      <Dialog open={showFullDialog} onOpenChange={setShowFullDialog}>
        <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{captureMode === 'memory' ? '🧠' : '📋'}</span>
              Quick {captureMode === 'memory' ? 'Memory' : 'Task'} - Full Editor
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {captureMode === 'task' && (
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Title</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Task title..."
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                {captureMode === 'memory' ? 'Content' : 'Description'}
              </label>
              <Textarea
                ref={textareaRef}
                value={captureMode === 'memory' ? formData.content : formData.description}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  [captureMode === 'memory' ? 'content' : 'description']: e.target.value 
                })}
                placeholder={captureMode === 'memory' ? 'Memory content...' : 'Task description...'}
                className="bg-gray-700 border-gray-600 text-white min-h-[120px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Category</label>
                <Select value={formData.category} onValueChange={(value: any) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    {captureMode === 'memory' && (
                      <>
                        <SelectItem value="conversations">Conversations</SelectItem>
                        <SelectItem value="preferences">Preferences</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {captureMode === 'task' && (
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Priority</label>
                  <Select value={formData.priority} onValueChange={(value: any) => setFormData({ ...formData, priority: value })}>
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
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Project</label>
                <Select value={formData.project} onValueChange={(value) => setFormData({ ...formData, project: value === 'none' ? '' : value })}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {availableProjects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Tags</label>
                <Input
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="tag1, tag2, tag3..."
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowFullDialog(false)}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleFullSubmit}
                disabled={
                  (captureMode === 'memory' && !formData.content.trim()) ||
                  (captureMode === 'task' && !formData.title.trim()) ||
                  isCreating
                }
                className="bg-violet-600 hover:bg-violet-700"
              >
                {isCreating ? (
                  <>
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  `Create ${captureMode === 'memory' ? 'Memory' : 'Task'}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}