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

// === TYPES ===
interface Memory {
  id: string
  content: string
  tags?: string[]
  timestamp: string
}

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
  const [tagFilter, setTagFilter] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newValue, setNewValue] = useState("")
  const [newTags, setNewTags] = useState("")
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [editingTags, setEditingTags] = useState("")
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [currentTab, setCurrentTab] = useState<"dashboard" | "memories" | "graph">("memories")
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

    const memory = {
      content: newValue,
      tags: newTags.split(',').map(tag => tag.trim()).filter(Boolean)
    }

    try {
      await fetch('/api/memories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(memory)
      })
      
      setNewValue("")
      setNewTags("")
      setShowAddDialog(false)
      loadMemories()
    } catch (error) {
      console.error('Failed to add memory:', error)
    }
  }

  const updateMemory = async () => {
    if (!editingMemory) return

    const updatedMemory = {
      content: editingValue,
      tags: editingTags.split(',').map(tag => tag.trim()).filter(Boolean)
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
      setShowEditDialog(true)
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

  const filtered = memories.filter(memory => {
    const tags = extractTags(memory)
    
    // Category filter
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
    
    const matchesSearch =
      (memory.id || "").toLowerCase().includes(search.toLowerCase()) ||
      (memory.content || "").toLowerCase().includes(search.toLowerCase()) ||
      tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    const matchesTag = tagFilter === "all" || tags.includes(tagFilter)
    
    return matchesSearch && matchesTag && matchesCategory
  })

  const graphFiltered = memories.filter(memory => {
    const tags = extractTags(memory)
    return graphTagFilter === "all" || tags.includes(graphTagFilter)
  })

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
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🧠</span>
                </div>
                <h1 className="text-xl font-bold text-white">Like I Said</h1>
              </div>
              
              <div className="flex items-center gap-1 bg-gray-700 rounded-lg p-1">
                {[
                  { id: "dashboard", label: "📊 Dashboard", icon: "📊" },
                  { id: "memories", label: "🧠 Memories", icon: "🧠" },
                  { id: "graph", label: "🕸️ Graph", icon: "🕸️" }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setCurrentTab(tab.id as any)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      currentTab === tab.id
                        ? "bg-violet-600 text-white shadow-lg"
                        : "text-gray-300 hover:text-white hover:bg-gray-600"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                {memories.length} memories
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettingsDialog(true)}
                className="text-gray-400 hover:text-white"
              >
                ⚙️ LLM Settings
              </Button>
              {llmProvider !== "none" && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={enhanceAllMemories}
                  disabled={isEnhancing}
                  className="text-green-400 hover:text-green-300"
                >
                  {isEnhancing ? "🔄 Enhancing..." : "✨ Enhance All"}
                </Button>
              )}
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-violet-600 hover:bg-violet-700 text-white">
                    ➕ Add Memory
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-800 border border-gray-600 max-w-2xl">
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
                    <div className="flex gap-2">
                      <Button onClick={addMemory} className="bg-violet-600 hover:bg-violet-700">
                        Add Memory
                      </Button>
                      <Button variant="outline" onClick={() => setShowAddDialog(false)} className="border-gray-600 text-gray-300">
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

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* Categories */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Categories</h2>
            <div className="space-y-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === category.id
                      ? "bg-violet-600 text-white"
                      : "text-gray-300 hover:bg-gray-700 hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                  </div>
                  <span className="text-xs bg-gray-600 px-2 py-1 rounded-full">
                    {category.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Search & Filters */}
          <div className="p-6 border-t border-gray-700">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-2 block">Search</label>
                <Input
                  type="text"
                  placeholder="Search memories..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>
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
        <div className="flex-1 flex flex-col">
          {/* View Controls */}
          <div className="p-6 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">
                {currentTab === "dashboard" && "📊 Dashboard"}
                {currentTab === "memories" && "🧠 Memories"}
                {currentTab === "graph" && "🕸️ Graph Visualization"}
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
          <div className="flex-1 p-6 overflow-auto">
            {currentTab === "dashboard" && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold text-white mb-2">Dashboard</h3>
                <p className="text-gray-400">Analytics and insights coming soon...</p>
              </div>
            )}

            {currentTab === "memories" && (
              <>
                {/* Cards View */}
                {viewMode === "cards" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((memory) => {
                      const memoryTags = extractVisibleTags(memory)
                      const title = extractTitle(memory.content, memory)
                      const summary = generateSummary(memory.content, memory)
                      
                      return (
                        <div key={memory.id} className="bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-violet-500 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-white text-lg leading-tight flex-1">
                              {title}
                            </h3>
                            <div className="flex gap-2 ml-3">
                              {llmProvider !== "none" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => enhanceMemoryWithLLM(memory)}
                                  disabled={enhancingMemories.has(memory.id)}
                                  className="text-green-400 hover:text-green-300 p-1"
                                >
                                  {enhancingMemories.has(memory.id) ? "🔄" : "✨"}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(memory.id)}
                                className="text-gray-400 hover:text-white p-1"
                              >
                                ✏️
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMemory(memory.id)}
                                className="text-gray-400 hover:text-red-400 p-1"
                              >
                                🗑️
                              </Button>
                            </div>
                          </div>
                          
                          <p className="text-gray-400 text-sm leading-relaxed mb-4">
                            {summary}
                          </p>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            {memoryTags.map((tag, i) => {
                              const colors = getTagColor(tag)
                              return (
                                <span
                                  key={i}
                                  className="px-2 py-1 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: colors.bg,
                                    color: colors.text
                                  }}
                                >
                                  {tag}
                                </span>
                              )
                            })}
                          </div>
                          
                          <div className="text-xs text-gray-500">
                            {new Date(memory.timestamp).toLocaleString()}
                          </div>
                        </div>
                      )
                    })}
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

            {currentTab === "graph" && (
              <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden h-full">
                <ModernGraph
                  memories={memories}
                  selectedNode={selectedNode}
                  onNodeClick={setSelectedNode}
                  graphType={graphViewType}
                  tagFilter={graphTagFilter}
                  extractTitle={extractTitle}
                  generateSummary={generateSummary}
                  extractTags={extractTags}
                  getTagColor={getTagColor}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-800 border border-gray-600 max-w-2xl">
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

      {/* Settings Dialog */}
      <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
        <DialogContent className="bg-gray-800 border border-gray-600">
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