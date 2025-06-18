import { useEffect, useState } from "react"
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
import Editor from '@monaco-editor/react'
import { ModernGraph } from '@/components/ModernGraph'
import { ModernGraphTest } from '@/components/ModernGraphTest'
import { SimpleGraph } from '@/components/SimpleGraph'
import { MemoryCard } from '@/components/MemoryCard'
import { AdvancedSearch } from '@/components/AdvancedSearch'
import { ProjectTabs } from '@/components/ProjectTabs'
import { ExportImport } from '@/components/ExportImport'
import { StatisticsDashboard } from '@/components/StatisticsDashboard'
import { AIEnhancement } from '@/components/AIEnhancement'
import { MemoryRelationships } from '@/components/MemoryRelationships'
import { Memory, MemoryCategory, ViewMode, AdvancedFilters } from '@/types'
import { searchMemories } from '@/utils/helpers'

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
export default function App() {
  // === STATE ===
  const [memories, setMemories] = useState<Memory[]>([])
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
  const [currentTab, setCurrentTab] = useState<"dashboard" | "memories" | "relationships" | "ai">("memories")
  const [useAdvancedEditor, setUseAdvancedEditor] = useState(false)
  const [useAdvancedEditorCreate, setUseAdvancedEditorCreate] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [viewMode, setViewMode] = useState<"cards" | "table" | "graph">("cards")
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [graphTagFilter, setGraphTagFilter] = useState<string>("all")
  const [graphViewType, setGraphViewType] = useState<"galaxy" | "clusters" | "timeline">("galaxy")
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [llmProvider, setLlmProvider] = useState<"openai" | "anthropic" | "none">("none")
  const [llmApiKey, setLlmApiKey] = useState("")
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [enhancingMemories, setEnhancingMemories] = useState<Set<string>>(new Set())
  const [currentProject, setCurrentProject] = useState("all")
  const [selectedMemories, setSelectedMemories] = useState<Set<string>>(new Set())
  const [showBulkTagDialog, setShowBulkTagDialog] = useState(false)
  const [bulkTagInput, setBulkTagInput] = useState("")
  const [bulkTagAction, setBulkTagAction] = useState<"add" | "remove">("add")
  const [newCategory, setNewCategory] = useState<MemoryCategory | undefined>(undefined)
  const [newProject, setNewProject] = useState("")
  const [editingCategory, setEditingCategory] = useState<MemoryCategory | undefined>(undefined)
  const [editingProject, setEditingProject] = useState("")

  // === EFFECTS ===
  useEffect(() => {
    loadMemories()
    loadSettings()
  }, [])

  // === SETTINGS MANAGEMENT ===
  const loadSettings = () => {
    const savedProvider = localStorage.getItem('llm-provider') as "openai" | "anthropic" | "none"
    const savedApiKey = localStorage.getItem('llm-api-key')
    if (savedProvider) setLlmProvider(savedProvider)
    if (savedApiKey) setLlmApiKey(savedApiKey)
  }

  const saveSettings = () => {
    localStorage.setItem('llm-provider', llmProvider)
    localStorage.setItem('llm-api-key', llmApiKey)
    setShowSettingsDialog(false)
  }

  // === DATA MANAGEMENT ===
  const loadMemories = async () => {
    try {
      const data = await fetch('/api/memories').then(res => res.json())
      setMemories(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load memories:', error)
      setMemories([])
    }
  }

  const addMemory = async () => {
    if (!newValue.trim()) return

    const tags = newTags.split(',').map(tag => tag.trim()).filter(Boolean)
    const category = newCategory || autoAssignCategory(newValue, tags)

    const memory = {
      content: newValue,
      tags: tags,
      category: category,
      project: newProject.trim() || undefined
    }

    try {
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
      loadMemories()
    } catch (error) {
      console.error('Failed to add memory:', error)
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
    } catch (error) {
      console.error('Failed to update memory:', error)
    }
  }

  const deleteMemory = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return

    try {
      await fetch(`/api/memories/${memoryId}`, { method: 'DELETE' })
      loadMemories()
    } catch (error) {
      console.error('Failed to delete memory:', error)
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
    } catch (error) {
      console.error('Failed to update memory project:', error)
    }
  }

  const moveSelectedMemoriesToProject = async (projectId: string) => {
    for (const memoryId of selectedMemories) {
      await updateMemoryProject(memoryId, projectId)
    }
    setSelectedMemories(new Set())
  }

  const bulkUpdateCategory = async (category: MemoryCategory) => {
    try {
      for (const memoryId of selectedMemories) {
        const memory = memories.find(m => m.id === memoryId)
        if (!memory) continue

        await fetch(`/api/memories/${memoryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...memory,
            category
          })
        })
      }
      loadMemories()
      setSelectedMemories(new Set())
    } catch (error) {
      console.error('Failed to bulk update category:', error)
    }
  }

  const bulkAddTags = async (tagsToAdd: string[]) => {
    try {
      for (const memoryId of selectedMemories) {
        const memory = memories.find(m => m.id === memoryId)
        if (!memory) continue

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
      }
      loadMemories()
      setSelectedMemories(new Set())
    } catch (error) {
      console.error('Failed to bulk add tags:', error)
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
    } catch (error) {
      console.error('Failed to bulk remove tags:', error)
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

  const handleImportMemories = async (newMemories: Memory[]) => {
    try {
      for (const memory of newMemories) {
        await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(memory)
        })
      }
      loadMemories()
    } catch (error) {
      console.error('Failed to import memories:', error)
      throw error
    }
  }

  // === LLM ENHANCEMENT ===
  const enhanceMemoryWithLLM = async (memory: Memory) => {
    if (llmProvider === "none" || !llmApiKey) return

    setEnhancingMemories(prev => new Set([...prev, memory.id]))

    try {
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
      alert(`Failed to enhance memory: ${error.message}`)
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
    if (llmProvider === "none" || !llmApiKey) {
      alert("Please configure LLM settings first")
      return
    }

    if (!confirm(`Enhance all ${memories.length} memories with AI-generated titles and summaries?`)) {
      return
    }

    setIsEnhancing(true)
    
    for (const memory of memories) {
      const currentTags = extractTags(memory)
      const hasEnhancement = currentTags.some(tag => tag.startsWith('title:'))
      
      if (!hasEnhancement) {
        await enhanceMemoryWithLLM(memory)
        await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limiting
      }
    }
    
    setIsEnhancing(false)
  }

  // === DATA PROCESSING ===
  const allTags = Array.from(new Set(
    memories.flatMap(memory => extractTags(memory))
  )).sort()

  const categories = [
    {
      id: "all",
      name: "All Memories",
      icon: "📚",
      count: memories.length
    },
    {
      id: "personal",
      name: "Personal",
      icon: "👤",
      count: memories.filter(memory => {
        const tags = extractTags(memory)
        return tags.some(tag => ["personal", "me", "my", "self", "private"].includes(tag.toLowerCase())) ||
          memory.content.toLowerCase().includes("my ")
      }).length
    },
    {
      id: "work",
      name: "Work & Business",
      icon: "💼",
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
      icon: "💻",
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
      icon: "💡",
      count: memories.filter(memory => {
        const tags = extractTags(memory)
        return tags.some(tag => ["idea", "brainstorm", "concept", "inspiration", "plan", "roadmap", "todo"].includes(tag.toLowerCase())) ||
          memory.content.toLowerCase().includes("idea") ||
          memory.content.toLowerCase().includes("plan")
      }).length
    },
    {
      id: "connections",
      name: "Connected",
      icon: "🔗",
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
      icon: "🏷️",
      count: memories.filter(memory => extractTags(memory).length === 0).length
    }
  ]

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

  const graphFiltered = memories.filter(memory => {
    const tags = extractTags(memory)
    return graphTagFilter === "all" || tags.includes(graphTagFilter)
  })

  // Extract available tags and projects for search filters
  const availableTags = Array.from(new Set(memories.flatMap(memory => extractTags(memory))))
  const availableProjects = Array.from(new Set(memories.map(memory => memory.project).filter(Boolean)))

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
      <nav className="glass-effect border-b border-gray-700/50 shadow-xl sticky top-0 z-50">
        <div className="space-container">
          <div className="flex items-center h-25 py-3" style={{paddingLeft: '0px', paddingRight: '16px'}}>
            {/* Slick Logo Section - Far Left Edge */}
            <div className="absolute left-0 top-0 h-full flex items-center gap-4 z-10" style={{paddingLeft: '22px'}}>
              {/* MOVED LOGO - SHOULD BE VISIBLE */}
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center shadow-lg border border-white/10">
                  <div className="w-8 h-8 bg-white/90 rounded-sm flex items-center justify-center">
                    <span className="text-indigo-600 font-black text-lg">L</span>
                  </div>
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-gray-900"></div>
              </div>
              {/* MOVED TYPOGRAPHY */}
              <div className="flex flex-col justify-center">
                <h1 className="text-2xl font-black text-white tracking-tight leading-none" style={{fontFamily: 'Inter, system-ui, sans-serif'}}>
                  LIKE I SAID
                </h1>
                <div className="text-sm text-gray-300 font-medium tracking-widest mt-0.5" style={{fontFamily: 'Inter, system-ui, sans-serif'}}>
                  MEMORY
                </div>
              </div>
            </div>
            
            {/* Navigation Section - Center with flex-grow */}
            <div className="flex-1 flex justify-center">
              <div className="hidden md:flex items-center gap-4 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 shadow-lg">
                {[
                  { id: "dashboard", label: "📊 Dashboard", icon: "📊" },
                  { id: "memories", label: "🧠 Memories", icon: "🧠" },
                  { id: "relationships", label: "🔗 Relationships", icon: "🔗" },
                  { id: "ai", label: "🤖 AI Enhancement", icon: "🤖" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id as any)}
                    className={`px-6 py-3 rounded-lg text-base font-semibold transition-all duration-200 ${
                      currentTab === tab.id
                        ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg transform scale-105"
                        : "text-gray-300 hover:text-white hover:bg-gray-700/50"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Right Section - Settings & Controls */}
            <div className="flex items-center gap-2 lg:gap-3 ml-8">
              <div className="hidden lg:block">
                <ExportImport
                  memories={memories}
                  onImportMemories={handleImportMemories}
                />
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 backdrop-blur-sm rounded-lg border border-gray-700/50">
                <div className="relative">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <span className="text-sm font-semibold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  {memories.length}
                </span>
                <span className="text-xs lg:text-sm text-gray-300 font-medium">
                  {memories.length === 1 ? 'memory' : 'memories'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsDialog(true)}
                className="text-gray-400 hover:text-white hover:bg-gray-700/50 text-xs lg:text-sm transition-colors rounded-lg"
              >
                <span className="lg:hidden">⚙️</span>
                <span className="hidden lg:inline">⚙️ LLM Settings</span>
              </Button>
              {llmProvider !== "none" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={enhanceAllMemories}
                  disabled={isEnhancing}
                  className="text-green-400 hover:text-green-300 hover:bg-green-500/10 text-xs lg:text-sm transition-colors rounded-lg"
                >
                  <span className="lg:hidden">{isEnhancing ? "🔄" : "✨"}</span>
                  <span className="hidden lg:inline">{isEnhancing ? "🔄 Enhancing..." : "✨ Enhance All"}</span>
                </Button>
              )}
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="btn-primary text-xs lg:text-sm px-4 py-2 rounded-lg font-semibold">
                    <span className="lg:hidden text-lg">+</span>
                    <span className="hidden lg:inline font-bold">+ Add Memory</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 border border-gray-600 max-w-2xl text-white">
                  <DialogHeader>
                    <DialogTitle className="text-white">Add New Memory</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
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
                        {newValue && !newCategory && (
                          <div className="text-xs text-blue-400">
                            Suggested: {autoAssignCategory(newValue, newTags.split(',').map(t => t.trim()).filter(Boolean)) || 'None'}
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
                              {availableProjects.map((project) => (
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
                      <Button onClick={addMemory} className="bg-violet-600 hover:bg-violet-700">
                        Add Memory
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
      <div className="md:hidden bg-gray-800/90 backdrop-blur-sm border-b border-gray-700/50 overflow-x-auto">
        <div className="flex gap-2 p-3">
          {[
            { id: "dashboard", label: "📊 Dashboard", icon: "📊" },
            { id: "memories", label: "🧠 Memories", icon: "🧠" },
            { id: "relationships", label: "🔗 Relationships", icon: "🔗" },
            { id: "ai", label: "🤖 AI Enhancement", icon: "🤖" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                currentTab === tab.id
                  ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg transform scale-105"
                  : "text-gray-300 hover:text-white hover:bg-gray-700/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-[calc(100vh-10rem)] md:min-h-[calc(100vh-5rem)] bg-gray-900">
        {/* Sidebar */}
        <div className="hidden lg:flex w-80 bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/50 flex-col">
          {/* Search First */}
          <div className="space-card">
            <h2 className="text-heading-3 text-white mb-4">Search</h2>
            <Input
              type="text"
              placeholder="Search memories..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-modern focus-ring text-white placeholder-gray-400"
            />
          </div>

          {/* Categories */}
          <div className="space-card border-t border-gray-700/50">
            <h2 className="text-heading-3 text-white mb-4">Categories</h2>
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
                    selectedCategory === category.id
                      ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg transform scale-[1.02]"
                      : "text-gray-300 hover:bg-gray-700/50 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{category.icon}</span>
                    <span className="font-semibold">{category.name}</span>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold min-w-[2rem] text-center ${
                    selectedCategory === category.id 
                      ? "bg-white/20 text-white" 
                      : "bg-gray-600/50 text-gray-300"
                  }`}>
                    {category.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Projects */}
          <div className="p-6 border-t border-gray-700">
            <ProjectTabs
              memories={memories}
              currentProject={currentProject}
              onProjectChange={setCurrentProject}
              onCreateProject={createProject}
              onDeleteProject={deleteProject}
              onMoveMemories={moveSelectedMemoriesToProject}
            />
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
                  {allTags.map(tag => (
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
                <span className="text-white">{total}</span>
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
                {currentTab === "dashboard" && "📊 Dashboard"}
                {currentTab === "memories" && "🧠 Memories"}
                {currentTab === "relationships" && "🔗 Relationships"}
                {currentTab === "ai" && "🤖 AI Enhancement"}
              </h2>
              {currentTab === "memories" && (
                <div className="flex items-center gap-2">
                  <div className="flex bg-gray-700 rounded-lg p-1">
                    {[
                      { id: "cards", label: "Cards", icon: "🃏" },
                      { id: "table", label: "Table", icon: "📋" }
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setViewMode(mode.id as any)}
                        className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                          viewMode === mode.id
                            ? "bg-violet-600 text-white shadow-lg"
                            : "text-gray-300 hover:text-white hover:bg-gray-600"
                        }`}
                      >
                        {mode.icon} {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900/50 to-gray-800/50">
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

            {currentTab === "ai" && (
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
              />
            )}

            {currentTab === "memories" && (
              <>
                {/* Advanced Search */}
                {/* Bulk Operations Toolbar */}
                {selectedMemories.size > 0 && (
                  <div className="mb-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-300 font-medium">
                          {selectedMemories.size} memory{selectedMemories.size !== 1 ? 'ies' : ''} selected
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMemories(new Set())}
                          className="text-gray-400 hover:text-white"
                        >
                          Clear Selection
                        </Button>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Move to Project */}
                        <Select onValueChange={moveSelectedMemoriesToProject}>
                          <SelectTrigger className="w-40 bg-gray-700 border-gray-600 text-white">
                            <SelectValue placeholder="Move to project..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">General</SelectItem>
                            {availableProjects.map((project) => (
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Delete ${selectedMemories.size} selected memories?`)) {
                              selectedMemories.forEach(id => deleteMemory(id))
                              setSelectedMemories(new Set())
                            }
                          }}
                          className="border-red-600 text-red-300 hover:bg-red-900/20"
                        >
                          🗑️ Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mb-6">
                  <AdvancedSearch
                    query={search}
                    filters={searchFilters}
                    onQueryChange={setSearch}
                    onFiltersChange={setSearchFilters}
                    availableTags={availableTags}
                    availableProjects={availableProjects}
                  />
                </div>

                {/* Cards View */}
                {viewMode === "cards" && (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 auto-rows-auto">
                    {filtered.map((memory, index) => (
                      <div 
                        key={memory.id} 
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <MemoryCard
                          memory={memory}
                          selected={selectedMemories.has(memory.id)}
                          onSelect={handleMemorySelect}
                          onEdit={() => handleEdit(memory.id)}
                          onDelete={deleteMemory}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Table View */}
                {viewMode === "table" && (
                  <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
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
                        {filtered.map((memory) => {
                          const memoryTags = extractVisibleTags(memory)
                          const title = extractTitle(memory.content, memory)
                          const summary = generateSummary(memory.content, memory)
                          
                          return (
                            <TableRow key={memory.id} className="border-gray-700 hover:bg-gray-750">
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
                                        key={i}
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
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteMemory(memory.id)}
                                    className="text-gray-400 hover:text-red-400"
                                  >
                                    🗑️
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
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
                {editingValue && !editingCategory && (
                  <div className="text-xs text-blue-400">
                    Suggested: {autoAssignCategory(editingValue, editingTags.split(',').map(t => t.trim()).filter(Boolean)) || 'None'}
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

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="bg-gray-800 border border-gray-600 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">LLM Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">LLM Provider</label>
              <Select value={llmProvider} onValueChange={setLlmProvider}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 text-white">
                  <SelectItem value="none" className="hover:bg-gray-600 focus:bg-gray-600 text-white">None</SelectItem>
                  <SelectItem value="openai" className="hover:bg-gray-600 focus:bg-gray-600 text-white">OpenAI</SelectItem>
                  <SelectItem value="anthropic" className="hover:bg-gray-600 focus:bg-gray-600 text-white">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {llmProvider !== "none" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">API Key</label>
                <Input
                  type="password"
                  value={llmApiKey}
                  onChange={e => setLlmApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={saveSettings} className="bg-violet-600 hover:bg-violet-700">
                Save Settings
              </Button>
              <Button variant="outline" onClick={() => setShowSettingsDialog(false)} className="border-gray-600 text-gray-300">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}