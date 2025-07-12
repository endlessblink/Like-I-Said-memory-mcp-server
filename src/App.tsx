import { useEffect, useState, useRef, useCallback } from "react"
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import Editor from '@monaco-editor/react'
import { MemoryCard } from '@/components/MemoryCard'
import { AdvancedSearch } from '@/components/AdvancedSearch'
import { ProjectTabs } from '@/components/ProjectTabs'
import { SortControls } from '@/components/SortControls'
import { ExportImport } from '@/components/ExportImport'
import { StatisticsDashboard } from '@/components/StatisticsDashboard'
import { AIEnhancement } from '@/components/AIEnhancement'
import { MemoryRelationships } from '@/components/MemoryRelationships'
import { TaskManagement } from '@/components/TaskManagement'
import { MemoryTreeView } from '@/components/MemoryTreeView'
import { KeyboardShortcutsHelp } from '@/components/KeyboardShortcutsHelp'
import { TemplateSelector } from '@/components/TemplateSelector'
import { GlobalSearch } from '@/components/GlobalSearch'
import { CategorySuggestions } from '@/components/CategorySuggestions'
import { SearchPresets } from '@/components/SearchPresets'
import { TutorialLauncher } from '@/components/OnboardingTutorial'
import { ToastProvider, useToast, toastHelpers } from '@/components/ToastNotifications'
import { ProgressProvider, useOperationProgress } from '@/components/ProgressIndicators'
import { 
  PageLoadingSpinner, 
  RefreshSpinner, 
  ButtonSpinner, 
  MemoryCardsGridSkeleton, 
  MemoryTableSkeleton,
  EmptyState 
} from '@/components/LoadingStates'
import { Memory, MemoryCategory, ViewMode, AdvancedFilters, SortOptions } from '@/types'
import { searchMemories, sortMemories } from '@/utils/helpers'

// === HELPER FUNCTIONS ===
function extractTags(memory: Memory): string[] {
  if (memory.tags && Array.isArray(memory.tags)) {
    return memory.tags
  }
  return []
}

function extractVisibleTags(memory: Memory): string[] {
  if (memory.tags && Array.isArray(memory.tags)) {
    // Filter out title: and summary: tags from visible display
    return memory.tags.filter(tag => 
      !tag.startsWith('title:') && !tag.startsWith('summary:')
    )
  }
  return []
}

function extractTitle(content: string, memory?: Memory): string {
  // Check for LLM-generated title first
  if (memory) {
    const tags = extractTags(memory)
    const titleTag = tags.find(tag => tag.startsWith('title:'))
    if (titleTag) {
      return titleTag.substring(6) // Remove 'title:' prefix
    }
  }
  
  // Enhanced title extraction
  const lines = content.split('\\n').filter(line => line.trim())
  
  // Look for markdown headers
  const headerMatch = content.match(/^#{1,6}\\s+(.+)$/m)
  if (headerMatch) {
    return headerMatch[1].trim()
  }
  
  // Look for structured patterns
  const structuredPatterns = [
    /^(.+?):\\s*[\\r\\n]/m,  // "Title: content"
    /^"(.+?)"/m,          // Quoted titles
    /^\\*\\*(.+?)\\*\\*/m,     // Bold markdown
    /^__(.+?)__/m,        // Bold underscore
    /^\\[(.+?)\\]/m,        // Bracketed content
  ]
  
  for (const pattern of structuredPatterns) {
    const match = content.match(pattern)
    if (match && match[1].length < 60 && match[1].length > 5) {
      return match[1].trim()
    }
  }
  
  // Development patterns
  const devPatterns = [
    /(?:Phase|Step|Task)\\s+(\\d+)[:\\s]+(.+?)(?:[\\r\\n]|$)/i,
    /(?:Feature|Bug|Fix)[:\\s]+(.+?)(?:[\\r\\n]|$)/i,
    /(?:TODO|DONE|WIP)[:\\s]+(.+?)(?:[\\r\\n]|$)/i,
    /^\\d+[.)\\s]+(.+?)(?:[\\r\\n]|$)/m, // Numbered lists
  ]
  
  for (const pattern of devPatterns) {
    const match = content.match(pattern)
    if (match) {
      const title = (match[2] || match[1]).trim()
      if (title.length < 60 && title.length > 5) {
        return title
      }
    }
  }
  
  // Extract key phrases from content
  const sentences = content.split(/[.!?\\n]+/).filter(s => s.trim().length > 10)
  for (const sentence of sentences.slice(0, 3)) {
    const cleaned = sentence.trim()
    // Skip generic patterns
    if (!cleaned.match(/^(project location|current|status|update|working|running)/i) &&
        cleaned.length > 15 && cleaned.length < 80) {
      return cleaned
    }
  }
  
  // Use meaningful keywords
  const keywords = content.toLowerCase().match(/\\b(dashboard|api|component|feature|bug|fix|update|implement|create|add)\\b/g)
  if (keywords && keywords.length > 0) {
    const firstSentence = sentences[0]?.trim()
    if (firstSentence && firstSentence.length < 100) {
      return firstSentence
    }
  }
  
  // Fallback to first meaningful sentence
  const fallback = sentences[0]?.trim()
  if (fallback && fallback.length < 100) {
    return fallback
  }
  
  return content.substring(0, 50) + (content.length > 50 ? '...' : '')
}

function generateSummary(content: string, memory?: Memory): string {
  // Check for LLM-generated summary first
  if (memory) {
    const tags = extractTags(memory)
    const summaryTag = tags.find(tag => tag.startsWith('summary:'))
    if (summaryTag) {
      return summaryTag.substring(8) // Remove 'summary:' prefix
    }
  }
  
  // Extract first few sentences for summary
  const sentences = content.split(/[.!?\\n]+/).filter(s => s.trim().length > 10)
  const summary = sentences.slice(0, 2).join('. ').trim()
  
  if (summary.length > 0) {
    return summary.length > 200 ? summary.substring(0, 197) + '...' : summary
  }
  
  return content.substring(0, 150) + (content.length > 150 ? '...' : '')
}

function getTagColor(tag: string): { bg: string; text: string; border: string } {
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const hue = Math.abs(hash) % 360
  const saturation = 60 + (Math.abs(hash) % 30) // 60-90%
  const lightness = 25 + (Math.abs(hash) % 15)  // 25-40% for dark backgrounds
  
  return {
    bg: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    text: `hsl(${hue}, ${Math.max(saturation - 10, 50)}%, 85%)`, // Light text for dark bg
    border: `hsl(${hue}, ${saturation}%, ${lightness + 15}%)`
  }
}

// === MAIN COMPONENT ===
function AppContent() {
  const toast = useToast()
  const progress = useOperationProgress()
  // === STATE ===
  const [memories, setMemories] = useState<Memory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [searchFilters, setSearchFilters] = useState<AdvancedFilters>({})
  const [tagFilter, setTagFilter] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newValue, setNewValue] = useState("")
  const [newTags, setNewTags] = useState("")
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [editingTags, setEditingTags] = useState("")
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [currentTab, setCurrentTab] = useState<"dashboard" | "memories" | "tasks" | "relationships" | "ai">("memories")
  const [aiMode, setAiMode] = useState<'memories' | 'tasks'>('memories')
  const [useAdvancedEditor, setUseAdvancedEditor] = useState(false)
  const [useAdvancedEditorCreate, setUseAdvancedEditorCreate] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [viewMode, setViewMode] = useState<"cards" | "table" | "tree">("cards")
  const [llmProvider, setLlmProvider] = useState<"openai" | "anthropic" | "ollama" | "none">("none")
  const [llmApiKey, setLlmApiKey] = useState("")
  const [apiKeyEditMode, setApiKeyEditMode] = useState(false)
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancingMemories, setEnhancingMemories] = useState<Set<string>>(new Set())
  const [currentProject, setCurrentProject] = useState("all")
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set())
  const [showBulkTagDialog, setShowBulkTagDialog] = useState(false)
  const [bulkTagInput, setBulkTagInput] = useState("")
  const [sortOptions, setSortOptions] = useState<SortOptions>({ field: 'date', direction: 'desc' })
  const [bulkTagAction, setBulkTagAction] = useState<"add" | "remove">("add")
  const [newCategory, setNewCategory] = useState<MemoryCategory | undefined>(undefined)
  const [newProject, setNewProject] = useState("")
  const [editingCategory, setEditingCategory] = useState<MemoryCategory | undefined>(undefined)
  const [editingProject, setEditingProject] = useState("")
  const [showScrollToTop, setShowScrollToTop] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [showMemoryTemplateSelector, setShowMemoryTemplateSelector] = useState(false)
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)

  // === TASK STATE ===
  const [tasks, setTasks] = useState<any[]>([])
  const [isLoadingTasks, setIsLoadingTasks] = useState(false)

  // === WEBSOCKET STATE ===
  const [wsConnected, setWsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // === REFS ===
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  // Keep ref in sync with memories state to avoid stale closure
  const memoriesRef = useRef(memories);
  useEffect(() => {
    memoriesRef.current = memories;
  }, [memories]);
  
  // Create a ref to hold the loadMemories function
  const loadMemoriesRef = useRef<(isRefresh?: boolean) => Promise<void>>();

  // === DATA MANAGEMENT ===
  const loadMemories = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      
      // Load all memories by fetching all pages
      let allMemories = []
      let page = 1
      let hasMore = true
      
      while (hasMore) {
        const response = await fetch(`/api/memories?page=${page}&limit=100`)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const text = await response.text()
        if (!text.trim()) {
          break
        }
        
        const data = JSON.parse(text)
        
        // Handle both old array format and new paginated format
        if (Array.isArray(data)) {
          allMemories = [...allMemories, ...data]
          hasMore = false // Old format doesn't have pagination
        } else if (data.data && Array.isArray(data.data)) {
          allMemories = [...allMemories, ...data.data]
          hasMore = data.pagination ? data.pagination.hasNext : false
          page++
        } else {
          hasMore = false
        }
      }
      
      setMemories(allMemories)
    } catch (error) {
      console.error('Failed to load memories:', error)
      toast.error('Failed to load memories', 'Please check your connection and try again')
      setMemories([])
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }
  
  // Update the ref when loadMemories changes
  useEffect(() => {
    loadMemoriesRef.current = loadMemories;
  }, [loadMemories]);

  // === TASK MANAGEMENT ===
  const loadTasks = async () => {
    try {
      setIsLoadingTasks(true)
      
      // Load all tasks by fetching all pages
      let allTasks = []
      let page = 1
      let hasMore = true
      
      while (hasMore) {
        const response = await fetch(`/api/tasks?page=${page}&limit=100`)
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
    } catch (error) {
      console.warn('Failed to load tasks:', error)
      setTasks([])
    } finally {
      setIsLoadingTasks(false)
    }
  }

  // === WEBSOCKET SETUP ===
  const setupWebSocket = useCallback(() => {
    // Prevent creating multiple connections
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    // Close existing connection if it exists
    if (wsRef.current) {
      wsRef.current.onclose = null // Prevent triggering reconnect
      wsRef.current.close()
      wsRef.current = null
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    // Always connect directly to the API server on port 3001
    const wsUrl = `${protocol}//${window.location.hostname}:3001`
    
    try {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
    
      ws.onopen = () => {
        console.log('🔌 WebSocket connected - Real-time updates enabled')
        setWsConnected(true)
        // Clear any pending reconnect timeout on successful connection
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          console.log('📡 WebSocket message:', message)
          
          if (message.type === 'file_change') {
            console.log(`📄 Memory file ${message.data.action}: ${message.data.file}`)
            console.log('Current memories count before refresh:', memoriesRef.current.length)
            // Refresh memories when files change
            loadMemoriesRef.current?.(true)
          }
        } catch (error) {
          console.warn('Failed to parse WebSocket message:', error)
        }
      }
      
      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected - Will reconnect in 5 seconds...')
        setWsConnected(false)
        wsRef.current = null
        
        // Only attempt to reconnect if not a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          // Shorter reconnect delay for better user experience
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
              setupWebSocket()
            }
          }, 5000) // 5 seconds instead of 30
        }
      }
      
      ws.onerror = (error) => {
        // Only log error if it's not a connection refused error during page load
        if (ws.readyState !== WebSocket.CLOSED) {
          console.error('WebSocket error:', error)
        }
        setWsConnected(false)
        // Don't trigger immediate reconnect on error, let onclose handle it
      }
      
      return ws
    } catch (error) {
      console.error('Failed to create WebSocket:', error)
      setWsConnected(false)
      // Retry connection after longer delay
      reconnectTimeoutRef.current = setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
          setupWebSocket()
        }
      }, 30000) // 30 seconds
      return null
    }
  }, [])

  // === EFFECTS ===
  useEffect(() => {
    loadMemories()
    loadTasks()
    loadSettings()
    // Temporarily disable WebSocket to stop connection flood
    // Set up WebSocket for real-time updates with slight delay to ensure server is ready
    // const wsTimeout = setTimeout(() => {
    //   setupWebSocket()
    // }, 1000)
    
    // Cleanup function to close WebSocket on unmount
    return () => {
      // clearTimeout(wsTimeout)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset selected category when switching tabs
  useEffect(() => {
    setSelectedCategory("all")
  }, [currentTab])

  // === SETTINGS MANAGEMENT ===
  const loadSettings = () => {
    const savedProvider = localStorage.getItem('llm-provider') as "openai" | "anthropic" | "none"
    const savedApiKey = localStorage.getItem('llm-api-key')
    const savedSortOptions = localStorage.getItem('sort-options')
    
    if (savedProvider) setLlmProvider(savedProvider)
    if (savedApiKey) setLlmApiKey(savedApiKey)
    if (savedSortOptions) {
      try {
        const parsed = JSON.parse(savedSortOptions) as SortOptions
        setSortOptions(parsed)
      } catch (e) {
        // Invalid JSON, use defaults
        console.warn('Invalid sort options in localStorage, using defaults')
      }
    }
  }

  const saveSettings = () => {
    localStorage.setItem('llm-provider', llmProvider)
    localStorage.setItem('llm-api-key', llmApiKey)
  }

  const clearApiKey = () => {
    setLlmApiKey("")
    localStorage.removeItem('llm-api-key')
  }

  const handleSortChange = (newSortOptions: SortOptions) => {
    setSortOptions(newSortOptions)
    localStorage.setItem('sort-options', JSON.stringify(newSortOptions))
  }

  const addMemory = async () => {
    if (!newValue.trim() || isCreating) return

    const tags = newTags.split(',').map(tag => tag.trim()).filter(Boolean)
    const category = newCategory || autoAssignCategory(newValue, tags)

    const memory = {
      content: newValue,
      tags: tags,
      category: category,
      project: newProject.trim() || undefined
    }

    try {
      setIsCreating(true)
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memory)
      })
      
      setNewValue("")
      setNewTags("")
      setNewCategory(undefined)
      setNewProject("")
      setShowAddDialog(false)
      loadMemories(true) // Refresh instead of full reload
      toast.success('Memory created successfully', 'Your memory has been saved and is ready to use')
    } catch (error) {
      console.error('Failed to add memory:', error)
      toast.error('Failed to create memory', 'Please try again or check your connection')
    } finally {
      setIsCreating(false)
    }
  }

  const updateMemory = async () => {
    if (!editingMemory) return

    const tags = editingTags.split(',').map(tag => tag.trim()).filter(Boolean)
    const category = editingCategory || autoAssignCategory(editingValue, tags)

    const updatedMemory = {
      content: editingValue,
      tags: tags,
      category: category,
      project: editingProject.trim() || undefined
    }

    try {
      await fetch(`/api/memories/${editingMemory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedMemory)
      })
      
      setShowEditDialog(false)
      setEditingMemory(null)
      loadMemories()
      toast.success('Memory updated', 'Your changes have been saved')
    } catch (error) {
      console.error('Failed to update memory:', error)
      toast.error('Failed to update memory', 'Please try again or check your connection')
    }
  }

  const deleteMemory = async (memoryId: string) => {
    if (isDeleting.has(memoryId)) return

    // Show confirmation toast
    toast.warning('Delete memory?', 'This action cannot be undone', {
      action: {
        label: 'Delete',
        onClick: () => performDelete(memoryId)
      },
      duration: 8000
    })
  }

  const performDelete = async (memoryId: string) => {
    try {
      setIsDeleting(prev => new Set([...prev, memoryId]))
      await fetch(`/api/memories/${memoryId}`, { method: 'DELETE' })
      loadMemories(true) // Refresh instead of full reload
      toast.success('Memory deleted', 'The memory has been permanently removed')
    } catch (error) {
      console.error('Failed to delete memory:', error)
      toast.error('Failed to delete memory', 'Please try again or check your connection')
    } finally {
      setIsDeleting(prev => {
        const newSet = new Set(prev)
        newSet.delete(memoryId)
        return newSet
      })
    }
  }

  const handleEdit = (memoryId: string) => {
    const memory = memories.find(m => m.id === memoryId)
    if (memory) {
      setEditingMemory(memory)
      setEditingValue(memory.content)
      setEditingTags(extractTags(memory).join(', '))
      setEditingCategory(memory.category)
      setEditingProject(memory.project || "")
      setShowEditDialog(true)
    }
  }

  // === CATEGORIZATION ===
  const suggestCategory = (content: string, tags: string[]): MemoryCategory | undefined => {
    const lowerContent = content.toLowerCase()
    const lowerTags = tags.map(tag => tag.toLowerCase())
    
    // Check for code-related content
    if (
      lowerTags.some(tag => ["code", "programming", "dev", "tech", "javascript", "typescript", "python", "react", "node", "api", "database", "sql"].includes(tag)) ||
      content.includes("```") ||
      content.includes("function") ||
      content.includes("npm ") ||
      content.includes("git ") ||
      content.includes("const ") ||
      content.includes("import ") ||
      content.includes("export ") ||
      /\b(bug|fix|debug|error|exception|variable|method|class)\b/i.test(content)
    ) {
      return 'code'
    }
    
    // Check for work-related content
    if (
      lowerTags.some(tag => ["work", "business", "meeting", "client", "job", "project", "team", "office", "deadline", "task"].includes(tag)) ||
      /\b(meeting|deadline|project|team|client|business|work|office|manager|boss|colleague)\b/i.test(content)
    ) {
      return 'work'
    }
    
    // Check for research-related content
    if (
      lowerTags.some(tag => ["research", "study", "analysis", "data", "investigation", "paper", "academic", "science"].includes(tag)) ||
      /\b(research|study|analysis|investigation|findings|hypothesis|methodology|paper|academic)\b/i.test(content)
    ) {
      return 'research'
    }
    
    // Check for conversation-related content
    if (
      lowerTags.some(tag => ["conversation", "chat", "discussion", "call", "meeting", "talk"].includes(tag)) ||
      /\b(conversation|discussed|talked|said|mentioned|asked|told|chat|call)\b/i.test(content) ||
      content.includes('"') ||
      content.includes("'")
    ) {
      return 'conversations'
    }
    
    // Check for personal content
    if (
      lowerTags.some(tag => ["personal", "me", "my", "self", "private", "family", "friend", "home"].includes(tag)) ||
      /\b(my |I |me |myself|personal|family|friend|home|feel|think|believe|remember)\b/i.test(content)
    ) {
      return 'personal'
    }
    
    // Default to undefined (no category)
    return undefined
  }

  const autoAssignCategory = (content: string, tags: string[]) => {
    return suggestCategory(content, tags)
  }

  // === TEMPLATE HANDLING ===
  const handleMemoryTemplate = (template: any, variables: Record<string, string>) => {
    // Replace variables in template content
    let content = template.content
    for (const [key, value] of Object.entries(variables)) {
      content = content.replace(new RegExp(`{{${key}}}`, 'g'), value)
    }
    
    // Populate form fields
    setNewValue(content)
    setNewTags([...template.tags].join(', '))
    setNewCategory(template.category)
    
    // Close template selector and open add dialog
    setShowMemoryTemplateSelector(false)
    setShowAddDialog(true)
  }

  // === GLOBAL SEARCH HANDLING ===
  const handleGlobalSearchSelectMemory = (memory: Memory) => {
    // Switch to memories tab and focus on the selected memory
    setCurrentTab('memories')
    setEditingMemory(memory)
    setEditingValue(memory.content)
    setEditingTags((memory.tags || []).join(', '))
    setEditingCategory(memory.category)
    setEditingProject(memory.project || '')
    setShowEditDialog(true)
  }

  const handleGlobalSearchSelectTask = (task: any) => {
    // Switch to tasks tab - the TaskManagement component will handle task selection
    setCurrentTab('tasks')
    // We could emit a custom event for the TaskManagement component to handle
    setTimeout(() => {
      document.dispatchEvent(new CustomEvent('selectTask', { detail: task }))
    }, 100)
  }

  // === PROJECT MANAGEMENT ===
  const createProject = async (projectId: string) => {
    // Projects are created dynamically when memories are assigned to them
  }

  const deleteProject = async (projectId: string) => {
    if (projectId === "all" || projectId === "default") return
    
    // Move all memories from this project to default
    const projectMemories = memories.filter(m => m.project === projectId)
    for (const memory of projectMemories) {
      await updateMemoryProject(memory.id, "default")
    }
  }

  const updateMemoryProject = async (memoryId: string, projectId: string) => {
    const memory = memories.find(m => m.id === memoryId)
    if (!memory) return

    try {
      await fetch(`/api/memories/${memoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...memory,
          project: projectId === "default" ? undefined : projectId
        })
      })
      loadMemories()
      toast.success('Project updated', 'Memory has been moved to the new project')
    } catch (error) {
      console.error('Failed to update memory project:', error)
      toast.error('Failed to update project', 'Please try again or check your connection')
    }
  }

  const moveSelectedMemoriesToProject = async (projectId: string) => {
    for (const memoryId of selectedMemories) {
      await updateMemoryProject(memoryId, projectId)
    }
    setSelectedMemories(new Set())
  }

  const bulkUpdateCategory = async (category: MemoryCategory) => {
    const memoryIds = Array.from(selectedMemories)
    
    const progressId = progress.startBulkOperation(
      'Updating Categories',
      memoryIds,
      `Changing category to "${category}" for ${memoryIds.length} memories`
    )

    let completed = 0
    try {
      for (const memoryId of memoryIds) {
        const memory = memories.find(m => m.id === memoryId)
        if (!memory) continue

        progress.updateOperation(progressId, { 
          completed,
          description: `Updating "${memory.content.substring(0, 40)}..."`
        })

        await fetch(`/api/memories/${memoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...memory,
            category
          })
        })
        completed++
        progress.updateOperation(progressId, { completed })
      }
      loadMemories()
      setSelectedMemories(new Set())
      progress.completeOperation(progressId, true)
      toast.success('Categories updated', `Updated ${completed} memories`)
    } catch (error) {
      console.error('Failed to bulk update category:', error)
      progress.completeOperation(progressId, false, `Failed after updating ${completed} memories`)
      toast.error('Failed to update categories', 'Please try again or check your connection')
    }
  }

  const bulkAddTags = async (tagsToAdd: string[]) => {
    const memoryIds = Array.from(selectedMemories)
    
    const progressId = progress.startBulkOperation(
      'Adding Tags',
      memoryIds,
      `Adding "${tagsToAdd.join(', ')}" to ${memoryIds.length} memories`
    )

    let completed = 0
    try {
      for (const memoryId of memoryIds) {
        const memory = memories.find(m => m.id === memoryId)
        if (!memory) continue

        progress.updateOperation(progressId, { 
          completed,
          description: `Adding tags to "${memory.content.substring(0, 40)}..."`
        })

        const currentTags = memory.tags || []
        const newTags = [...new Set([...currentTags, ...tagsToAdd])] // Remove duplicates

        await fetch(`/api/memories/${memoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...memory,
            tags: newTags
          })
        })
        completed++
        progress.updateOperation(progressId, { completed })
      }
      loadMemories()
      setSelectedMemories(new Set())
      progress.completeOperation(progressId, true)
      toast.success('Tags added', `Added tags to ${completed} memories`)
    } catch (error) {
      console.error('Failed to bulk add tags:', error)
      progress.completeOperation(progressId, false, `Failed after updating ${completed} memories`)
      toast.error('Failed to add tags', 'Please try again or check your connection')
    }
  }

  const bulkRemoveTags = async (tagsToRemove: string[]) => {
    try {
      for (const memoryId of selectedMemories) {
        const memory = memories.find(m => m.id === memoryId)
        if (!memory) continue

        const currentTags = memory.tags || []
        const newTags = currentTags.filter(tag => !tagsToRemove.includes(tag))

        await fetch(`/api/memories/${memoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...memory,
            tags: newTags
          })
        })
      }
      loadMemories()
      setSelectedMemories(new Set())
      toast.success('Tags removed', `Removed tags from ${selectedMemories.size} memories`)
    } catch (error) {
      console.error('Failed to bulk remove tags:', error)
      toast.error('Failed to remove tags', 'Please try again or check your connection')
    }
  }

  const handleMemorySelect = (memoryId: string) => {
    setSelectedMemories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(memoryId)) {
        newSet.delete(memoryId)
      } else {
        newSet.add(memoryId)
      }
      return newSet
    })
  }

  // === KEYBOARD SHORTCUTS ===
  useKeyboardShortcuts({
    'Ctrl+N': () => setShowAddDialog(true),
    'Ctrl+Shift+N': () => {
      if (currentTab === 'tasks') {
        // Trigger new task creation - we'll need to communicate with TaskManagement component
        document.dispatchEvent(new CustomEvent('createNewTask'))
      }
    },
    'Ctrl+K': () => {
      setShowGlobalSearch(true)
    },
    'Ctrl+Shift+K': () => {
      searchInputRef.current?.focus()
      searchInputRef.current?.select()
    },
    'Ctrl+R': () => loadMemories(true),
    'Escape': () => {
      setShowAddDialog(false)
      setShowEditDialog(false)
      setShowBulkTagDialog(false)
      setSelectedMemories(new Set())
      setShowKeyboardHelp(false)
      setShowGlobalSearch(false)
      setShowMemoryTemplateSelector(false)
    },
    'Ctrl+/': () => setShowKeyboardHelp(true),
    'Ctrl+1': () => setCurrentTab('memories'),
    'Ctrl+2': () => setCurrentTab('tasks'),
    'Ctrl+3': () => setCurrentTab('relationships'),
    'Ctrl+4': () => setCurrentTab('ai'),
    'Ctrl+5': () => setCurrentTab('dashboard'),
    'Ctrl+Shift+C': () => setViewMode('cards'),
    'Ctrl+Shift+T': () => setViewMode('table'),
    'Ctrl+Shift+R': () => setViewMode('tree'),
    'Ctrl+A': () => {
      if (currentTab === 'memories') {
        const visibleMemoryIds = filteredMemories.map(m => m.id)
        setSelectedMemories(new Set(visibleMemoryIds))
      } else if (currentTab === 'tasks') {
        // Trigger select all for tasks
        document.dispatchEvent(new CustomEvent('selectAllTasks'))
      }
    },
    'Ctrl+D': () => {
      setSelectedMemories(new Set())
      if (currentTab === 'tasks') {
        // Trigger clear selection for tasks
        document.dispatchEvent(new CustomEvent('clearTaskSelection'))
      }
    },
    'Delete': () => {
      if (selectedMemories.size > 0) {
        toast.warning(`Delete ${selectedMemories.size} memories?`, 'This action cannot be undone', {
          action: {
            label: 'Delete All',
            onClick: () => {
              selectedMemories.forEach(id => performDelete(id))
              setSelectedMemories(new Set())
            }
          },
          duration: 8000
        })
      }
    }
  })

  const handleImportMemories = async (newMemories: Memory[]) => {
    const progressId = progress.startBulkOperation(
      'Importing Memories',
      newMemories,
      `Importing ${newMemories.length} memories from file`
    )

    let completed = 0
    try {
      for (const memory of newMemories) {
        progress.updateOperation(progressId, { 
          completed,
          description: `Importing "${memory.content.substring(0, 50)}..."`
        })

        await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(memory)
        })
        completed++
        progress.updateOperation(progressId, { completed })
      }
      loadMemories()
      progress.completeOperation(progressId, true)
      toast.success('Data imported successfully', `${completed} memories have been imported`)
    } catch (error) {
      console.error('Failed to import memories:', error)
      progress.completeOperation(progressId, false, `Failed after importing ${completed} memories`)
      toast.error('Failed to import data', 'Please check the file format and try again')
      throw error
    }
  }

  // === LLM ENHANCEMENT ===
  const enhanceMemoryWithLLM = async (memory: Memory) => {
    if (llmProvider === "none") return
    if (llmProvider !== "ollama" && !llmApiKey) return

    setEnhancingMemories(prev => new Set([...prev, memory.id]))

    try {
      if (llmProvider === "ollama") {
        // Use Ollama local AI processing
        const { OllamaClient } = await import('./lib/ollama-client.js')
        const ollama = new OllamaClient()
        
        // Check if Ollama is available
        if (!(await ollama.isAvailable())) {
          throw new Error('Ollama server is not running. Please start Ollama and ensure a model is installed.')
        }
        
        // Enhance memory using Ollama
        const result = await ollama.enhanceMemory(memory.content, {
          category: memory.category,
          project: memory.project,
          tags: memory.tags
        })
        
        await updateMemoryMetadata(memory.id, result.title, result.summary)
        return
      }

      // External API processing (OpenAI/Anthropic)
      const prompt = `Please analyze this memory content and provide a concise title (max 50 chars) and summary (max 150 chars).

Content: ${memory.content}

Respond with JSON format:
{
  "title": "your title here",
  "summary": "your summary here"
}`

      let response
      if (llmProvider === "openai") {
        response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${llmApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 0.3
          })
        })
      } else if (llmProvider === "anthropic") {
        response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': llmApiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 200,
            messages: [{ role: 'user', content: prompt }]
          })
        })
      }

      if (!response?.ok) {
        throw new Error(`API request failed: ${response?.status}`)
      }

      const data = await response.json()
      let content

      if (llmProvider === "openai") {
        content = data.choices[0]?.message?.content
      } else if (llmProvider === "anthropic") {
        content = data.content[0]?.text
      }

      if (content) {
        try {
          // Clean the content for JSON parsing
          const cleanContent = content
            .replace(/\\/g, '\\\\')  // Escape backslashes
            .replace(/"/g, '\\"')    // Escape quotes
            .replace(/\n/g, '\\n')   // Escape newlines
            .replace(/\r/g, '\\r')   // Escape carriage returns
            .replace(/\t/g, '\\t')   // Escape tabs
          
          const parsed = JSON.parse(cleanContent)
          await updateMemoryMetadata(memory.id, parsed.title, parsed.summary)
        } catch (parseError) {
          // Fallback: try to extract title and summary with regex
          const titleMatch = content.match(/"title":\s*"([^"]+)"/);
          const summaryMatch = content.match(/"summary":\s*"([^"]+)"/);
          
          if (titleMatch && summaryMatch) {
            await updateMemoryMetadata(memory.id, titleMatch[1], summaryMatch[1])
          } else {
            throw new Error('Invalid JSON format and could not extract title/summary')
          }
        }
      }

      loadMemories()
      
    } catch (error) {
      console.error('LLM enhancement error:', error)
      toast.error('Failed to enhance memory', `${error.message}`)
    } finally {
      setEnhancingMemories(prev => {
        const newSet = new Set(prev)
        newSet.delete(memory.id)
        return newSet
      })
    }
  }

  const updateMemoryMetadata = async (memoryId: string, title: string, summary: string) => {
    const memory = memories.find(m => m.id === memoryId)
    if (!memory) return

    const currentTags = extractTags(memory)
    // Remove old title/summary tags to prevent duplication
    const cleanedTags = currentTags.filter(tag => 
      !tag.startsWith('title:') && !tag.startsWith('summary:')
    )
    
    // Add new title/summary as tags for internal processing
    const newTags = [
      ...cleanedTags,
      `title:${title}`,
      `summary:${summary}`
    ]

    await fetch(`/api/memories/${memoryId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        content: memory.content, 
        tags: newTags
      })
    })
  }

  const enhanceAllMemories = async () => {
    if (llmProvider === "none") {
      toast.warning("LLM configuration required", "Please configure LLM settings first")
      return
    }
    
    if (llmProvider !== "ollama" && !llmApiKey) {
      toast.warning("API key required", "Please configure your API key first")
      return
    }

    // Show confirmation toast
    toast.warning(`Enhance all ${memories.length} memories?`, 'Add AI-generated titles and summaries', {
      action: {
        label: 'Enhance All',
        onClick: () => performEnhanceAll()
      },
      duration: 10000
    })
  }

  const performEnhanceAll = async () => {
    const memoriesToEnhance = memories.filter(memory => {
      const currentTags = extractTags(memory)
      return !currentTags.some(tag => tag.startsWith('title:'))
    })

    if (memoriesToEnhance.length === 0) {
      toast.info('All memories already enhanced', 'No memories need AI enhancement')
      return
    }

    const progressId = progress.startBulkOperation(
      'Enhancing Memories',
      memoriesToEnhance,
      `Adding AI-generated titles and summaries to ${memoriesToEnhance.length} memories`
    )

    setIsEnhancing(true)
    let completed = 0
    
    try {
      for (const memory of memoriesToEnhance) {
        progress.updateOperation(progressId, { 
          completed,
          description: `Enhancing "${memory.content.substring(0, 50)}..."`
        })
        
        await enhanceMemoryWithLLM(memory)
        completed++
        
        progress.updateOperation(progressId, { completed })
        await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limiting
      }
      
      progress.completeOperation(progressId, true)
      toast.success('Enhancement complete!', `Enhanced ${completed} memories with AI-generated content`)
    } catch (error) {
      progress.completeOperation(progressId, false, `Failed after enhancing ${completed} memories`)
      toast.error('Enhancement failed', `Completed ${completed} of ${memoriesToEnhance.length} memories`)
    } finally {
      setIsEnhancing(false)
    }
  }

  // === DATA PROCESSING ===
  const allTags = Array.from(new Set(
    memories.flatMap(memory => extractTags(memory))
  )).sort()

  // Generate categories based on current tab
  const getCategories = () => {
    if (currentTab === "memories") {
      return [
        {
          id: "all",
          name: "All Memories",
          icon: null,
          count: memories.length
        },
        {
          id: "personal",
          name: "Personal",
          icon: null,
          count: memories.filter(memory => {
            const tags = extractTags(memory)
            return tags.some(tag => ["personal", "me", "my", "self", "private"].includes(tag.toLowerCase())) ||
              memory.content.toLowerCase().includes("my ")
          }).length
        },
        {
          id: "work",
          name: "Work & Business",
          icon: null,
          count: memories.filter(memory => {
            const tags = extractTags(memory)
            return tags.some(tag => ["work", "business", "meeting", "client", "job"].includes(tag.toLowerCase())) ||
              memory.content.toLowerCase().includes("work") ||
              memory.content.toLowerCase().includes("meeting")
          }).length
        },
        {
          id: "code",
          name: "Code & Tech",
          icon: null,
          count: memories.filter(memory => {
            const tags = extractTags(memory)
            return tags.some(tag => ["code", "programming", "dev", "tech", "javascript", "typescript", "python", "react", "node"].includes(tag.toLowerCase())) || 
              memory.content.includes("```") ||
              memory.content.includes("npm ") ||
              memory.content.includes("function")
          }).length
        },
        {
          id: "ideas",
          name: "Ideas & Plans",
          icon: null,
          count: memories.filter(memory => {
            const tags = extractTags(memory)
            return tags.some(tag => ["idea", "brainstorm", "concept", "inspiration", "plan", "roadmap", "todo"].includes(tag.toLowerCase())) ||
              memory.content.toLowerCase().includes("idea") ||
              memory.content.toLowerCase().includes("plan")
          }).length
        },
        {
          id: "conversations",
          name: "Conversations",
          icon: null,
          count: memories.filter(memory => {
            const tags = extractTags(memory)
            return tags.some(tag => ["conversation", "chat", "discussion", "call", "meeting", "talk"].includes(tag.toLowerCase())) ||
              memory.content.toLowerCase().includes("conversation") ||
              memory.content.toLowerCase().includes("discussed")
          }).length
        },
        {
          id: "connections",
          name: "Connected",
          icon: null,
          count: memories.filter(memory => {
            const tags = extractTags(memory)
            return tags.length > 0 && memories.some(other => 
              other.id !== memory.id && extractTags(other).some(tag => tags.includes(tag))
            )
          }).length
        },
        {
          id: "untagged",
          name: "Untagged",
          icon: null,
          count: memories.filter(memory => extractTags(memory).length === 0).length
        }
      ]
    } else if (currentTab === "tasks") {
      return [
        {
          id: "all",
          name: "All Tasks",
          icon: "📋",
          count: tasks.length
        },
        {
          id: "personal",
          name: "Personal",
          icon: "👤",
          count: tasks.filter(task => task.category === "personal").length
        },
        {
          id: "work",
          name: "Work",
          icon: "💼",
          count: tasks.filter(task => task.category === "work").length
        },
        {
          id: "code",
          name: "Code",
          icon: "💻",
          count: tasks.filter(task => task.category === "code").length
        },
        {
          id: "research",
          name: "Research",
          icon: "🔬",
          count: tasks.filter(task => task.category === "research").length
        },
        {
          id: "todo",
          name: "To Do",
          icon: "⏳",
          count: tasks.filter(task => task.status === "todo").length
        },
        {
          id: "in_progress",
          name: "In Progress",
          icon: "🔄",
          count: tasks.filter(task => task.status === "in_progress").length
        },
        {
          id: "done",
          name: "Done",
          icon: "✅",
          count: tasks.filter(task => task.status === "done").length
        },
        {
          id: "blocked",
          name: "Blocked",
          icon: "🚫",
          count: tasks.filter(task => task.status === "blocked").length
        }
      ]
    }
    // Default to empty array for other tabs
    return []
  }

  const categories = getCategories()

  // Combined filtering using new search function and legacy category filter
  const filtered = searchMemories(memories, search, searchFilters).filter(memory => {
    const tags = extractTags(memory)
    
    // Project filter
    let matchesProject = true
    if (currentProject !== "all") {
      if (currentProject === "default") {
        matchesProject = !memory.project || memory.project === "default"
      } else {
        matchesProject = memory.project === currentProject
      }
    }
    
    // Legacy category filter (until we fully migrate to new categories)
    let matchesCategory = true
    if (selectedCategory !== "all") {
      if (selectedCategory === "personal") {
        matchesCategory = tags.some(tag => ["personal", "me", "my", "self", "private"].includes(tag.toLowerCase())) ||
          memory.content.toLowerCase().includes("my ")
      } else if (selectedCategory === "work") {
        matchesCategory = tags.some(tag => ["work", "business", "meeting", "client", "job"].includes(tag.toLowerCase())) ||
          memory.content.toLowerCase().includes("work") ||
          memory.content.toLowerCase().includes("meeting")
      } else if (selectedCategory === "code") {
        matchesCategory = tags.some(tag => ["code", "programming", "dev", "tech", "javascript", "typescript", "python", "react", "node"].includes(tag.toLowerCase())) || 
          memory.content.includes("```") ||
          memory.content.includes("npm ") ||
          memory.content.includes("function")
      } else if (selectedCategory === "ideas") {
        matchesCategory = tags.some(tag => ["idea", "brainstorm", "concept", "inspiration", "plan", "roadmap", "todo"].includes(tag.toLowerCase())) ||
          memory.content.toLowerCase().includes("idea") ||
          memory.content.toLowerCase().includes("plan")
      } else if (selectedCategory === "connections") {
        matchesCategory = tags.length > 0 && memories.some(other => 
          other.id !== memory.id && extractTags(other).some(tag => tags.includes(tag))
        )
      } else if (selectedCategory === "untagged") {
        matchesCategory = tags.length === 0
      }
    }
    
    const matchesTag = tagFilter === "all" || tags.includes(tagFilter)
    return matchesTag && matchesCategory && matchesProject
  })

  // Apply sorting to filtered results  
  const sortedAndFiltered = sortMemories(filtered, sortOptions)


  // Extract available tags and projects for search filters
  const availableTags = Array.from(new Set(memories.flatMap(memory => extractTags(memory))))
  const availableProjects = Array.from(new Set(memories.map(memory => memory.project).filter(project => project && project.trim() !== "")))

  // Stats
  const total = memories.length
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const recent = memories.filter(memory =>
    new Date(memory.timestamp || Date.now()) > yesterday
  ).length
  const avgSize = total > 0
    ? Math.round(memories.reduce((sum, memory) => sum + memory.content.length, 0) / total)
    : 0

  // === RENDER ===
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      {/* Navigation */}
      <nav className="glass-effect border-b border-gray-700/50 shadow-xl sticky top-0 z-50" style={{ minHeight: '80px' }}>
        <div className="max-w-screen-2xl mx-auto px-8 md:px-10 lg:px-12 h-full">
          <div className="flex items-center justify-between h-full py-4">
            {/* Logo and Title Section */}
            <div className="flex items-center gap-6 flex-shrink-0 min-w-0">
              {/* Logo */}
              <div className="relative">
                <div className="w-10 h-10 md:w-11 md:h-11 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg border border-white/10 transform hover:scale-105 transition-transform">
                  <div className="w-7 h-7 md:w-8 md:h-8 bg-white/90 rounded-md flex items-center justify-center">
                    <span className="text-indigo-600 font-black text-base md:text-lg">L</span>
                  </div>
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-gray-900 animate-pulse"></div>
              </div>
              {/* Typography */}
              <div className="hidden sm:flex flex-col justify-center">
                <h1 className="text-lg md:text-xl font-black text-white tracking-tight leading-none bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  LIKE I SAID
                </h1>
                <div className="text-2xs text-gray-500 font-medium tracking-[0.2em] uppercase">
                  Memory System
                </div>
              </div>
            </div>
            
            {/* Navigation Section */}
            <div className="flex-1 flex justify-center px-8 md:px-12">
              <div className="hidden md:flex items-center gap-3 bg-gray-800/40 backdrop-blur-md rounded-xl p-3 border border-gray-700/30">
                {[
                  { id: "dashboard", label: "Dashboard" },
                  { id: "memories", label: "Memories" },
                  { id: "tasks", label: "Tasks" },
                  { id: "relationships", label: "Relationships" },
                  { id: "ai", label: "AI Enhancement" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id as any)}
                    data-tab={tab.id}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 min-w-[90px] ${
                      currentTab === tab.id
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md"
                        : "text-gray-400 hover:text-white hover:bg-gray-700/40"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Right Section - Settings & Controls */}
            <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
              <div className="hidden 2xl:block">
                <ExportImport
                  memories={memories}
                  onImportMemories={handleImportMemories}
                />
              </div>
              <div className="hidden md:flex items-center gap-2 px-2 py-1 bg-gray-800/40 backdrop-blur-md rounded-lg border border-gray-700/30">
                <div className="flex items-center gap-2">
                  <div className="relative" title={wsConnected ? 'Real-time updates active' : 'WebSocket disconnected'}>
                    <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-yellow-400'}`}></div>
                    {wsConnected && <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75"></div>}
                  </div>
                  <span className="text-xs text-gray-500 font-medium hidden lg:inline">Live</span>
                </div>
                
                {/* Separator */}
                <div className="w-px h-6 bg-gray-700"></div>
                
                {/* Memory Counter */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-white">
                      {memories.length}
                    </span>
                    <span className="text-xs text-gray-500 font-medium -mt-1 hidden xl:block">
                      Memories
                    </span>
                  </div>
                </div>
                
                {/* Separator */}
                <div className="w-px h-6 bg-gray-700"></div>
                
                {/* Task Counter */}
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-bold text-white">
                      {tasks.length}
                  </span>
                  <span className="text-xs text-gray-500 font-medium -mt-1 hidden xl:block">
                    Tasks
                  </span>
                  </div>
                </div>
              </div>
              {llmProvider !== "none" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={enhanceAllMemories}
                  disabled={isEnhancing}
                  className="text-green-400 hover:text-green-300 hover:bg-green-500/10 text-2xs px-2 py-1 h-auto transition-colors rounded-md"
                >
                  <span className="text-base mr-1">{isEnhancing ? "🔄" : "✨"}</span>
                  <span className="hidden lg:inline">{isEnhancing ? "Enhancing..." : "Enhance All"}</span>
                </Button>
              )}
              
              {/* Global Search Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowGlobalSearch(true)}
                className="text-violet-400 hover:text-violet-300 hover:bg-violet-500/10 text-2xs px-2 py-1 h-auto transition-colors rounded-md hidden xl:flex"
                title="Global Search (Ctrl+K)"
              >
                <span className="text-base mr-1">🔍</span>
                <span className="hidden xl:inline">Global Search</span>
              </Button>
              
              {/* Tutorial Launcher */}
              <TutorialLauncher className="hidden 2xl:block" />
              
              {/* Help Button */}
              <button
                onClick={() => setShowKeyboardHelp(true)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/40 rounded-lg transition-all duration-200 hidden xl:block"
                title="Keyboard Shortcuts (Ctrl+/)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="btn-primary text-xs px-3 py-1.5 h-auto rounded-lg font-semibold" data-tutorial="add-memory">
                    <span className="text-sm mr-0.5">+</span>
                    <span className="hidden sm:inline">Add Memory</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 border border-gray-600 max-w-2xl text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white text-lg">Add New Memory</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Content</label>
                      {useAdvancedEditorCreate ? (
                        <div className="rounded-lg overflow-hidden border border-gray-600">
                          <Editor
                            height="200px"
                            defaultLanguage="markdown"
                            value={newValue}
                            onChange={(value) => setNewValue(value || "")}
                            theme="vs-dark"
                            options={{
                              minimap: { enabled: false },
                              wordWrap: 'on',
                              fontSize: 14,
                              lineNumbers: 'on',
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                              padding: { top: 16, bottom: 16 }
                            }}
                          />
                        </div>
                      ) : (
                        <Textarea
                          value={newValue}
                          onChange={e => setNewValue(e.target.value)}
                          placeholder="Memory content..."
                          className="bg-gray-700 border-gray-600 text-white min-h-[120px] placeholder-gray-400"
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUseAdvancedEditorCreate(!useAdvancedEditorCreate)}
                        className="text-violet-400 hover:text-violet-300"
                      >
                        {useAdvancedEditorCreate ? "Simple Editor" : "Advanced Editor"}
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">Tags (comma-separated)</label>
                      <Input
                        value={newTags}
                        onChange={e => setNewTags(e.target.value)}
                        placeholder="tag1, tag2, tag3"
                        className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Category</label>
                        <Select value={newCategory || "auto"} onValueChange={(value) => setNewCategory(value === "auto" ? undefined : value as MemoryCategory)}>
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Auto-detect or select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto-detect</SelectItem>
                            <SelectItem value="personal">Personal</SelectItem>
                            <SelectItem value="work">Work</SelectItem>
                            <SelectItem value="code">Code</SelectItem>
                            <SelectItem value="research">Research</SelectItem>
                            <SelectItem value="conversations">Conversations</SelectItem>
                            <SelectItem value="preferences">Preferences</SelectItem>
                          </SelectContent>
                        </Select>
                        {/* Category Suggestions Component */}
                        {newValue && newValue.trim().length >= 20 && (
                          <div className="mt-3">
                            <CategorySuggestions
                              content={newValue}
                              tags={newTags.split(',').map(t => t.trim()).filter(Boolean)}
                              currentCategory={newCategory}
                              onSelectCategory={(category) => setNewCategory(category)}
                            />
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300">Project</label>
                        <div className="flex gap-2">
                          <Select value={newProject || "general"} onValueChange={(value) => setNewProject(value === "general" ? "" : value)}>
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                              <SelectValue placeholder="Select or create..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              {availableProjects.filter(p => p && p.trim() !== "").map((project) => (
                                <SelectItem key={project} value={project}>
                                  {project.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={newProject}
                            onChange={e => setNewProject(e.target.value)}
                            placeholder="Or type new project..."
                            className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 flex-1"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowMemoryTemplateSelector(true)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                      >
                        📋 Templates
                      </Button>
                      <Button onClick={addMemory} disabled={isCreating} className="bg-violet-600 hover:bg-violet-700 disabled:opacity-50">
                        {isCreating ? (
                          <div className="flex items-center gap-2">
                            <ButtonSpinner />
                            Creating...
                          </div>
                        ) : (
                          "Add Memory"
                        )}
                      </Button>
                      <Button variant="outline" onClick={() => {
                        setShowAddDialog(false)
                        setNewValue("")
                        setNewTags("")
                        setNewCategory(undefined)
                        setNewProject("")
                      }} className="border-gray-600 text-gray-300">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50">
        <div className="flex items-center justify-between px-3 py-2">
          {/* Mobile Tab Selector */}
          <select 
            value={currentTab}
            onChange={(e) => setCurrentTab(e.target.value as any)}
            className="flex-1 bg-gray-700/50 border border-gray-600 text-white rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="dashboard">Dashboard</option>
            <option value="memories">Memories</option>
            <option value="tasks">Tasks</option>
            <option value="relationships">Relationships</option>
            <option value="ai">AI Enhancement</option>
          </select>
          
          {/* Mobile Stats */}
          <div className="flex items-center gap-3 ml-3">
            <div className="flex items-center gap-1 text-xs">
              <span className="font-bold text-white">{memories.length}</span>
              <span className="text-gray-500">M</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className="font-bold text-white">{tasks.length}</span>
              <span className="text-gray-500">T</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-var(--nav-height-mobile)-2rem)] md:min-h-[calc(100vh-var(--nav-height))] bg-gray-900">
        {/* Sidebar */}
        <div className="hidden lg:flex w-80 bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/50 flex-col sticky top-[120px] h-[calc(100vh-120px)] overflow-y-auto">
          {/* Search First */}
          <div className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Search</h2>
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="Search memories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-700 border-gray-600 text-white placeholder-gray-400 text-sm sm:text-base"
            />
          </div>

          {/* Categories - Only show for memories and tasks tabs */}
          {(currentTab === "memories" || currentTab === "tasks") && (
            <div className="p-4 sm:p-6 border-t border-gray-700">
              <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Categories</h2>
              <div className="space-y-1">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                      selectedCategory === category.id
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                        : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedCategory === category.id
                          ? "bg-violet-400"
                          : "bg-gray-500"
                      }`}></div>
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-lg font-medium ${
                      selectedCategory === category.id 
                        ? "bg-violet-600/20 text-violet-300" 
                        : "bg-gray-700/50 text-gray-400"
                    }`}>
                      {category.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Projects */}
          <div className="p-6 border-t border-gray-700">
            <div data-tutorial="projects">
              <ProjectTabs
                memories={memories}
                currentProject={currentProject}
                onProjectChange={setCurrentProject}
                onCreateProject={createProject}
                onDeleteProject={deleteProject}
                onMoveMemories={moveSelectedMemoriesToProject}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-t border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">Filters</h2>
            <div>
              <label className="text-sm font-medium text-gray-300 mb-2 block">Filter by Tag</label>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 text-white">
                  <SelectItem value="all" className="hover:bg-gray-600 focus:bg-gray-600 text-white">All tags</SelectItem>
                  {allTags.filter(tag => tag && tag.trim() !== "").map(tag => (
                    <SelectItem key={tag} value={tag} className="hover:bg-gray-600 focus:bg-gray-600 text-white">{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Stats */}
          <div className="p-6 border-t border-gray-700 mt-auto">
            <h3 className="text-sm font-medium text-gray-300 mb-3">Statistics</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Total memories:</span>
                <div className="flex items-center gap-2">
                  <span className="text-white">{total}</span>
                  <button
                    onClick={() => loadMemories(true)}
                    disabled={isRefreshing}
                    className="text-gray-400 hover:text-violet-400 transition-colors disabled:opacity-50"
                    title="Refresh memories"
                  >
                    {isRefreshing ? <RefreshSpinner className="h-3 w-3" /> : "🔄"}
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Recent (24h):</span>
                <span className="text-white">{recent}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Avg. size:</span>
                <span className="text-white">{avgSize} chars</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col bg-gray-900">
          {/* View Controls */}
          <div className="p-4 lg:p-6 border-b border-gray-700/50 bg-gray-800/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg lg:text-xl font-semibold text-white">
                {currentTab === "dashboard" && "Dashboard"}
                {currentTab === "memories" && "Memories"}
                {currentTab === "tasks" && "Tasks"}
                {currentTab === "relationships" && "Relationships"}
                {currentTab === "ai" && "AI Enhancement"}
              </h2>
              {currentTab === "memories" && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-wrap">
                  <div className="flex bg-gray-700/50 backdrop-blur-sm rounded-xl p-1 w-full sm:w-auto border border-gray-600/50">
                    {[
                      { id: "cards", label: "Cards" },
                      { id: "table", label: "Table" },
                      { id: "tree", label: "Tree" }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setViewMode(mode.id as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          viewMode === mode.id
                            ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                            : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                  <SortControls 
                    sortOptions={sortOptions}
                    onSortChange={handleSortChange}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div 
            className="flex-1 overflow-auto bg-gradient-to-br from-gray-900/50 to-gray-800/50"
            onScroll={(e) => {
              const scrollTop = e.currentTarget.scrollTop
              setShowScrollToTop(scrollTop > 400)
            }}
            ref={(el) => {
              if (el) {
                el.scrollTo = (options) => {
                  el.scrollTo(options)
                }
              }
            }}
            id="main-content-area"
          >
            <div className="space-section min-h-full pb-8">
            {currentTab === "dashboard" && (
              <StatisticsDashboard memories={memories} />
            )}

            {currentTab === "relationships" && (
              <MemoryRelationships
                memories={memories}
                extractTitle={extractTitle}
                generateSummary={generateSummary}
                extractTags={extractTags}
                getTagColor={getTagColor}
                onMemoryEdit={handleEdit}
              />
            )}

            {currentTab === "tasks" && (
              <TaskManagement
                currentProject={currentProject}
              />
            )}

            {currentTab === "ai" && (
              <div className="space-y-6">
                <div className="flex justify-center mb-6">
                  <div className="flex bg-gray-700/50 backdrop-blur-sm rounded-xl p-1 border border-gray-600/50">
                    {[
                      { id: "memories", label: "Memory Enhancement" },
                      { id: "tasks", label: "Task Enhancement" }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setAiMode(mode.id as 'memories' | 'tasks')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          aiMode === mode.id
                            ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg"
                            : "text-gray-300 hover:text-white hover:bg-gray-600/50"
                        }`}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>

                {aiMode === 'memories' ? (
                  <AIEnhancement
                    memories={memories}
                    onEnhanceMemory={enhanceMemoryWithLLM}
                    onEnhanceAll={enhanceAllMemories}
                    enhancingMemories={enhancingMemories}
                    isEnhancing={isEnhancing}
                    llmProvider={llmProvider}
                    llmApiKey={llmApiKey}
                    onProviderChange={setLlmProvider}
                    onApiKeyChange={setLlmApiKey}
                    onSaveSettings={saveSettings}
                    websocket={wsRef.current || undefined}
                  />
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🚀</div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">Task Enhancement</h3>
                    <p className="text-gray-500">Task AI enhancement coming soon!</p>
                  </div>
                )}
              </div>
            )}


            {currentTab === "memories" && (
              <>
                {/* Advanced Search */}
                {/* Bulk Operations Toolbar */}
                {selectedMemories.size > 0 && (
                  <div className="mb-4 p-3 sm:p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <div className="flex flex-col gap-3 sm:gap-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <span className="text-blue-300 font-medium text-sm sm:text-base">
                          {selectedMemories.size} memory{selectedMemories.size !== 1 ? 'ies' : ''} selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMemories(new Set())}
                          className="text-gray-400 hover:text-white text-xs sm:text-sm"
                        >
                          Clear Selection
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        {/* Move to Project */}
                        <Select onValueChange={moveSelectedMemoriesToProject}>
                          <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Move to project..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">General</SelectItem>
                            {availableProjects.filter(p => p && p.trim() !== "").map((project) => (
                              <SelectItem key={project} value={project}>
                                {project.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Change Category */}
                        <Select onValueChange={(value) => bulkUpdateCategory(value as MemoryCategory)}>
                          <SelectTrigger className="w-36 bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Set category..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="personal">Personal</SelectItem>
                            <SelectItem value="work">Work</SelectItem>
                            <SelectItem value="code">Code</SelectItem>
                            <SelectItem value="research">Research</SelectItem>
                            <SelectItem value="conversations">Conversations</SelectItem>
                            <SelectItem value="preferences">Preferences</SelectItem>
                          </SelectContent>
                        </Select>

                        {/* Tag Operations */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowBulkTagDialog(true)}
                          className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                        >
                          🏷️ Manage Tags
                        </Button>

                        {/* Export Selected */}
                        <ExportImport
                          memories={memories}
                          selectedMemories={selectedMemories}
                          onImportMemories={handleImportMemories}
                        />

                        {/* Delete Selected */}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  toast.warning(`Delete ${selectedMemories.size} memories?`, 'This action cannot be undone', {
                                    action: {
                                      label: 'Delete All',
                                      onClick: () => {
                                        selectedMemories.forEach(id => performDelete(id))
                                        setSelectedMemories(new Set())
                                      }
                                    },
                                    duration: 8000
                                  })
                                }}
                                className="border-red-600 text-red-300 hover:bg-red-900/20"
                              >
                                🗑️ Delete
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Delete {selectedMemories.size} selected memories permanently</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1" data-tutorial="search">
                      <AdvancedSearch
                        query={search}
                        filters={searchFilters}
                        onQueryChange={setSearch}
                        onFiltersChange={setSearchFilters}
                        availableTags={availableTags}
                        availableProjects={availableProjects}
                      />
                    </div>
                    <div data-tutorial="presets">
                      <SearchPresets
                        currentQuery={search}
                        currentFilters={searchFilters}
                        currentCategory={selectedCategory}
                        currentProject={currentProject}
                        currentSortBy={sortOptions.field}
                        currentSortOrder={sortOptions.order}
                        onApplyPreset={(preset) => {
                          setSearch(preset.query)
                          setSearchFilters(preset.filters)
                          setSelectedCategory(preset.category)
                          setCurrentProject(preset.project)
                          setSortOptions({ field: preset.sortBy as any, order: preset.sortOrder })
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Cards View */}
                {viewMode === "cards" && (
                  <>
                    {isLoading ? (
                      <MemoryCardsGridSkeleton count={6} />
                    ) : sortedAndFiltered.length === 0 ? (
                      <EmptyState 
                        title="No memories found"
                        description={search || Object.keys(searchFilters).length > 0 ? "Try adjusting your search or filters" : "Create your first memory to get started"}
                        icon="🧠"
                      />
                    ) : (
                      <div className="grid-responsive">
                        {sortedAndFiltered.map((memory, index) => (
                          <div 
                            key={`card-${memory.id}-${index}`} 
                            className="animate-fade-in"
                            style={{ animationDelay: `${index * 0.05}s` }}
                          >
                            <MemoryCard
                              memory={memory}
                              selected={selectedMemories.has(memory.id)}
                              onSelect={handleMemorySelect}
                              onEdit={() => handleEdit(memory.id)}
                              onDelete={deleteMemory}
                              isDeleting={isDeleting.has(memory.id)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Table View */}
                {viewMode === "table" && (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                    {isLoading ? (
                      <div className="p-6">
                        <MemoryTableSkeleton count={8} />
                      </div>
                    ) : sortedAndFiltered.length === 0 ? (
                      <div className="p-8">
                        <EmptyState 
                          title="No memories found"
                          description={search || Object.keys(searchFilters).length > 0 ? "Try adjusting your search or filters" : "Create your first memory to get started"}
                          icon="🧠"
                        />
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-700">
                            <TableHead className="text-gray-300">Title</TableHead>
                            <TableHead className="text-gray-300">Content</TableHead>
                            <TableHead className="text-gray-300">Tags</TableHead>
                            <TableHead className="text-gray-300">Created</TableHead>
                            <TableHead className="text-gray-300">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sortedAndFiltered.map((memory) => {
                          const memoryTags = extractVisibleTags(memory)
                          const title = extractTitle(memory.content, memory)
                          const summary = generateSummary(memory.content, memory)
                          
                          return (
                            <TableRow key={`table-${memory.id}`} className="border-gray-700 hover:bg-gray-750">
                              <TableCell className="text-white font-medium max-w-48">
                                <div className="truncate">{title}</div>
                              </TableCell>
                              <TableCell className="text-gray-400 max-w-96">
                                <div className="truncate">{summary}</div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {memoryTags.slice(0, 3).map((tag, i) => {
                                    const colors = getTagColor(tag)
                                    return (
                                      <Badge
                                        key={`${memory.id}-tag-${tag}-${i}`}
                                        className="text-xs"
                                        style={{
                                          backgroundColor: colors.bg,
                                          color: colors.text
                                        }}
                                      >
                                        {tag}
                                      </Badge>
                                    )
                                  })}
                                  {memoryTags.length > 3 && (
                                    <span className="text-xs text-gray-500">+{memoryTags.length - 3}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-gray-400 text-sm">
                                {new Date(memory.timestamp).toLocaleDateString()}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(memory.id)}
                                    className="text-gray-400 hover:text-white"
                                  >
                                    ✏️
                                  </Button>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => deleteMemory(memory.id)}
                                          disabled={isDeleting.has(memory.id)}
                                          className="text-gray-400 hover:text-red-400 disabled:opacity-50"
                                        >
                                          {isDeleting.has(memory.id) ? <ButtonSpinner size="sm" /> : "🗑️"}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{isDeleting.has(memory.id) ? 'Deleting memory...' : 'Delete memory permanently'}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                )}

                {/* Tree View */}
                {viewMode === "tree" && (
                  <>
                    {isLoading ? (
                      <div className="p-6">
                        <div className="animate-pulse space-y-4">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-gray-800 rounded-lg p-4">
                              <div className="flex items-center space-x-4">
                                <div className="w-6 h-6 bg-gray-700 rounded"></div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                                  <div className="h-3 bg-gray-700 rounded w-1/2"></div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : sortedAndFiltered.length === 0 ? (
                      <EmptyState 
                        title="No memories found"
                        description={search || Object.keys(searchFilters).length > 0 ? "Try adjusting your search or filters" : "Create your first memory to get started"}
                        icon="🧠"
                      />
                    ) : (
                      <MemoryTreeView
                        memories={sortedAndFiltered}
                        onMemoryClick={handleEdit}
                        extractTitle={extractTitle}
                        extractTags={extractTags}
                        getTagColor={getTagColor}
                      />
                    )}
                  </>
                )}

              </>
            )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-800 border border-gray-600 max-w-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Memory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Content</label>
              {useAdvancedEditor ? (
                <div className="rounded-lg overflow-hidden border border-gray-600">
                  <Editor
                    height="200px"
                    defaultLanguage="markdown"
                    value={editingValue}
                    onChange={(value) => setEditingValue(value || "")}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      wordWrap: 'on',
                      fontSize: 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      padding: { top: 16, bottom: 16 }
                    }}
                  />
                </div>
              ) : (
                <Textarea
                  value={editingValue}
                  onChange={e => setEditingValue(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white min-h-[120px]"
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUseAdvancedEditor(!useAdvancedEditor)}
                className="text-violet-400 hover:text-violet-300"
              >
                {useAdvancedEditor ? "Simple Editor" : "Advanced Editor"}
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Tags (comma-separated)</label>
              <Input
                value={editingTags}
                onChange={e => setEditingTags(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Category</label>
                <Select value={editingCategory || "auto"} onValueChange={(value) => setEditingCategory(value === "auto" ? undefined : value as MemoryCategory)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Auto-detect or select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                    <SelectItem value="research">Research</SelectItem>
                    <SelectItem value="conversations">Conversations</SelectItem>
                    <SelectItem value="preferences">Preferences</SelectItem>
                  </SelectContent>
                </Select>
                {/* Category Suggestions Component for Edit */}
                {editingValue && editingValue.trim().length >= 20 && (
                  <div className="mt-3">
                    <CategorySuggestions
                      content={editingValue}
                      tags={editingTags.split(',').map(t => t.trim()).filter(Boolean)}
                      currentCategory={editingCategory}
                      onSelectCategory={(category) => setEditingCategory(category)}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Project</label>
                <div className="flex gap-2">
                  <Select value={editingProject || "general"} onValueChange={(value) => setEditingProject(value === "general" ? "" : value)}>
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select or create..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      {availableProjects.map((project) => (
                        <SelectItem key={project} value={project}>
                          {project.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={editingProject}
                    onChange={e => setEditingProject(e.target.value)}
                    placeholder="Or type new project..."
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={updateMemory} className="bg-violet-600 hover:bg-violet-700">
                Update Memory
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="border-gray-600 text-gray-300">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Tag Management Dialog */}
      <Dialog open={showBulkTagDialog} onOpenChange={setShowBulkTagDialog}>
        <DialogContent className="bg-gray-800 border border-gray-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Manage Tags for Selected Memories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-400">
              Managing tags for {selectedMemories.size} selected memories
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Action</label>
              <Select value={bulkTagAction} onValueChange={(value) => setBulkTagAction(value as "add" | "remove")}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Tags</SelectItem>
                  <SelectItem value="remove">Remove Tags</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">
                Tags (comma-separated)
              </label>
              <Input
                value={bulkTagInput}
                onChange={(e) => setBulkTagInput(e.target.value)}
                placeholder={bulkTagAction === "add" ? "tag1, tag2, tag3" : "tag1, tag2, tag3"}
                className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const tags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean)
                    if (tags.length > 0) {
                      if (bulkTagAction === "add") {
                        bulkAddTags(tags)
                      } else {
                        bulkRemoveTags(tags)
                      }
                      setBulkTagInput("")
                      setShowBulkTagDialog(false)
                    }
                  }
                }}
              />
            </div>

            {/* Quick tag suggestions */}
            {availableTags.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Quick select:</label>
                <div className="flex flex-wrap gap-1">
                  {availableTags.slice(0, 15).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-600 text-xs text-gray-300 border-gray-600"
                      onClick={() => {
                        const currentTags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean)
                        if (!currentTags.includes(tag)) {
                          setBulkTagInput(currentTags.length > 0 ? `${bulkTagInput}, ${tag}` : tag)
                        }
                      }}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  const tags = bulkTagInput.split(',').map(t => t.trim()).filter(Boolean)
                  if (tags.length > 0) {
                    if (bulkTagAction === "add") {
                      bulkAddTags(tags)
                    } else {
                      bulkRemoveTags(tags)
                    }
                    setBulkTagInput("")
                    setShowBulkTagDialog(false)
                  }
                }}
                disabled={!bulkTagInput.trim()}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {bulkTagAction === "add" ? "Add Tags" : "Remove Tags"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkTagDialog(false)
                  setBulkTagInput("")
                }}
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      
      {/* Navigation Spacing Adjuster */}
      
      {/* Scroll to Top Button */}
      {showScrollToTop && (
        <button
          onClick={() => {
            const contentArea = document.getElementById('main-content-area')
            if (contentArea) {
              contentArea.scrollTo({ top: 0, behavior: 'smooth' })
            }
          }}
          className="fixed bottom-8 right-8 w-12 h-12 bg-violet-600 hover:bg-violet-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 z-50"
          aria-label="Scroll to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}

      {/* Memory Template Selector */}
      <TemplateSelector
        open={showMemoryTemplateSelector}
        onOpenChange={setShowMemoryTemplateSelector}
        type="memory"
        onSelectTemplate={handleMemoryTemplate}
      />

      {/* Global Search */}
      <GlobalSearch
        open={showGlobalSearch}
        onOpenChange={setShowGlobalSearch}
        memories={memories}
        tasks={tasks}
        onSelectMemory={handleGlobalSearchSelectMemory}
        onSelectTask={handleGlobalSearchSelectTask}
      />

      {/* Keyboard Shortcuts Help */}
      <KeyboardShortcutsHelp 
        open={showKeyboardHelp} 
        onOpenChange={setShowKeyboardHelp} 
      />
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <ProgressProvider>
        <AppContent />
      </ProgressProvider>
    </ToastProvider>
  )
}