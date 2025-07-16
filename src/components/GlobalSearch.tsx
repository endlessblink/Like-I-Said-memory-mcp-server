import React, { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusIcon } from '@/components/StatusIcon'

interface Memory {
  id: string
  content: string
  timestamp: string
  category?: string
  project?: string
  tags?: string[]
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done' | 'blocked'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  project: string
  category?: string
  tags?: string[]
}

interface SearchResult {
  type: 'memory' | 'task'
  item: Memory | Task
  relevanceScore: number
  matchedFields: string[]
  snippet?: string
}

interface GlobalSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memories: Memory[]
  tasks: Task[]
  onSelectMemory?: (memory: Memory) => void
  onSelectTask?: (task: Task) => void
}

export function GlobalSearch({ 
  open, 
  onOpenChange, 
  memories, 
  tasks, 
  onSelectMemory, 
  onSelectTask 
}: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Focus search input when dialog opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [open])

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [open])

  // Perform search when query changes
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsSearching(true)
    const searchResults = performGlobalSearch(query, memories, tasks)
    setResults(searchResults)
    setSelectedIndex(0)
    setIsSearching(false)
  }, [query, memories, tasks])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Enter':
          e.preventDefault()
          if (results[selectedIndex]) {
            handleSelectResult(results[selectedIndex])
          }
          break
        case 'Escape':
          e.preventDefault()
          onOpenChange(false)
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, results, selectedIndex, onOpenChange])

  const performGlobalSearch = (searchQuery: string, memories: Memory[], tasks: Task[]): SearchResult[] => {
    const query = searchQuery.toLowerCase().trim()
    const results: SearchResult[] = []

    // Search memories
    memories.forEach(memory => {
      const score = calculateMemoryRelevance(memory, query)
      if (score > 0) {
        results.push({
          type: 'memory',
          item: memory,
          relevanceScore: score,
          matchedFields: getMatchedFields(memory, query, 'memory'),
          snippet: extractSnippet(memory.content, query)
        })
      }
    })

    // Search tasks
    tasks.forEach(task => {
      const score = calculateTaskRelevance(task, query)
      if (score > 0) {
        results.push({
          type: 'task',
          item: task,
          relevanceScore: score,
          matchedFields: getMatchedFields(task, query, 'task'),
          snippet: extractSnippet(task.description || task.title, query)
        })
      }
    })

    // Sort by relevance score
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  const calculateMemoryRelevance = (memory: Memory, query: string): number => {
    let score = 0
    const content = memory.content.toLowerCase()
    const tags = (memory.tags || []).join(' ').toLowerCase()
    const category = (memory.category || '').toLowerCase()
    const project = (memory.project || '').toLowerCase()

    // Content matches (highest weight)
    const contentMatches = (content.match(new RegExp(query, 'g')) || []).length
    score += contentMatches * 10

    // Tag matches (high weight)
    const tagMatches = (tags.match(new RegExp(query, 'g')) || []).length
    score += tagMatches * 15

    // Category matches (medium weight)
    if (category.includes(query)) score += 8

    // Project matches (medium weight)
    if (project.includes(query)) score += 8

    // Exact phrase bonus
    if (content.includes(query)) score += 5

    // Title/header extraction bonus
    const firstLine = content.split('\n')[0].toLowerCase()
    if (firstLine.includes(query)) score += 12

    return score
  }

  const calculateTaskRelevance = (task: Task, query: string): number => {
    let score = 0
    const title = task.title.toLowerCase()
    const description = (task.description || '').toLowerCase()
    const tags = (task.tags || []).join(' ').toLowerCase()
    const category = (task.category || '').toLowerCase()
    const project = task.project.toLowerCase()
    const status = task.status.toLowerCase()
    const priority = task.priority.toLowerCase()

    // Title matches (highest weight)
    const titleMatches = (title.match(new RegExp(query, 'g')) || []).length
    score += titleMatches * 20

    // Description matches (high weight)
    const descMatches = (description.match(new RegExp(query, 'g')) || []).length
    score += descMatches * 10

    // Tag matches (high weight)
    const tagMatches = (tags.match(new RegExp(query, 'g')) || []).length
    score += tagMatches * 15

    // Status/priority matches
    if (status.includes(query)) score += 12
    if (priority.includes(query)) score += 10

    // Category matches (medium weight)
    if (category.includes(query)) score += 8

    // Project matches (medium weight)
    if (project.includes(query)) score += 8

    // Exact phrase bonus
    if (title.includes(query) || description.includes(query)) score += 5

    return score
  }

  const getMatchedFields = (item: Memory | Task, query: string, type: 'memory' | 'task'): string[] => {
    const fields: string[] = []

    if (type === 'memory') {
      const memory = item as Memory
      if (memory.content.toLowerCase().includes(query)) fields.push('content')
      if ((memory.tags || []).some(tag => tag.toLowerCase().includes(query))) fields.push('tags')
      if (memory.category?.toLowerCase().includes(query)) fields.push('category')
      if (memory.project?.toLowerCase().includes(query)) fields.push('project')
    } else {
      const task = item as Task
      if (task.title.toLowerCase().includes(query)) fields.push('title')
      if (task.description?.toLowerCase().includes(query)) fields.push('description')
      if ((task.tags || []).some(tag => tag.toLowerCase().includes(query))) fields.push('tags')
      if (task.category?.toLowerCase().includes(query)) fields.push('category')
      if (task.project.toLowerCase().includes(query)) fields.push('project')
      if (task.status.toLowerCase().includes(query)) fields.push('status')
      if (task.priority.toLowerCase().includes(query)) fields.push('priority')
    }

    return fields
  }

  const extractSnippet = (text: string, query: string, maxLength = 150): string => {
    const lowerText = text.toLowerCase()
    const lowerQuery = query.toLowerCase()
    const index = lowerText.indexOf(lowerQuery)
    
    if (index === -1) {
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '')
    }

    const start = Math.max(0, index - 50)
    const end = Math.min(text.length, index + query.length + 50)
    const snippet = text.substring(start, end)
    
    return (start > 0 ? '...' : '') + snippet + (end < text.length ? '...' : '')
  }

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === 'memory' && onSelectMemory) {
      onSelectMemory(result.item as Memory)
    } else if (result.type === 'task' && onSelectTask) {
      onSelectTask(result.item as Task)
    }
    onOpenChange(false)
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      todo: '⏳',
      in_progress: '🔄',
      done: '✅',
      blocked: '🚫'
    }
    return icons[status as keyof typeof icons] || '📋'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      urgent: 'bg-red-500/20 text-red-400 border-red-500/30'
    }
    return colors[priority as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
  }

  const extractTitle = (content: string): string => {
    // Try to extract title from memory content
    const lines = content.split('\n').filter(line => line.trim())
    const headerMatch = content.match(/^#{1,6}\s+(.+)$/m)
    if (headerMatch) return headerMatch[1].trim()
    
    const firstLine = lines[0]?.trim() || ''
    return firstLine.length > 60 ? firstLine.substring(0, 57) + '...' : firstLine
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-800 border border-gray-600 text-white max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <span>🔍</span>
            Global Search
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-4">
          <Input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all memories and tasks..."
            className="bg-gray-700 border-gray-600 text-white text-lg py-3"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {query && (
            <div className="text-sm text-gray-400 mb-4">
              {isSearching ? 'Searching...' : `${results.length} results found`}
            </div>
          )}

          <div className="space-y-2">
            {results.map((result, index) => (
              <div
                key={`${result.type}-${(result.item as any).id}`}
                onClick={() => handleSelectResult(result)}
                className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  index === selectedIndex
                    ? 'bg-violet-500/20 border-violet-500/50'
                    : 'bg-gray-900/50 border-gray-700 hover:bg-gray-900/70 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          result.type === 'memory' 
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                            : 'bg-green-500/20 text-green-400 border-green-500/30'
                        }`}
                      >
                        {result.type === 'memory' ? '🧠 Memory' : '📋 Task'}
                      </Badge>
                      
                      {result.type === 'task' && (
                        <>
                          <Badge variant="outline" className="text-xs text-gray-500 flex items-center gap-1">
                            <StatusIcon status={(result.item as Task).status} showTooltip={true} size="sm" className="inline" />
                            {(result.item as Task).status.replace('_', ' ')}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getPriorityColor((result.item as Task).priority)}`}
                          >
                            {(result.item as Task).priority}
                          </Badge>
                        </>
                      )}
                      
                      <Badge variant="outline" className="text-xs text-gray-500">
                        Score: {result.relevanceScore}
                      </Badge>
                    </div>

                    <h3 className="font-semibold text-white mb-1">
                      {result.type === 'memory' 
                        ? extractTitle((result.item as Memory).content)
                        : (result.item as Task).title
                      }
                    </h3>

                    {result.snippet && (
                      <p className="text-sm text-gray-300 mb-2">
                        {result.snippet}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1 mb-2">
                      {result.matchedFields.map((field) => (
                        <Badge key={field} variant="outline" className="text-xs text-violet-400 border-violet-500/30">
                          {field}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {(result.item as any).project && (
                        <span>📁 {(result.item as any).project}</span>
                      )}
                      {(result.item as any).category && (
                        <span>🏷️ {(result.item as any).category}</span>
                      )}
                      {result.type === 'memory' && (
                        <span>📅 {new Date((result.item as Memory).timestamp).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {query && results.length === 0 && !isSearching && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">No results found</h3>
              <p className="text-gray-500">Try different keywords or check your spelling</p>
            </div>
          )}

          {!query && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚡</div>
              <h3 className="text-lg font-semibold text-gray-300 mb-2">Global Search</h3>
              <p className="text-gray-500 mb-4">Search across all your memories and tasks simultaneously</p>
              <div className="text-sm text-gray-400 space-y-1">
                <p>💡 <strong>Tips:</strong></p>
                <p>• Use ↑↓ arrows to navigate results</p>
                <p>• Press Enter to select</p>
                <p>• Search by content, tags, projects, or categories</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}