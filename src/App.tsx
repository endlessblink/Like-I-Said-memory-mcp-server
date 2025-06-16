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
import { MemoryGraph } from "@/components/MemoryGraph"

// Extract tags helper function
function extractTags(memory: any) {
  if (memory.tags && Array.isArray(memory.tags)) {
    return memory.tags
  }
  if (memory.context?.tags && Array.isArray(memory.context.tags)) {
    return memory.context.tags
  }
  return []
}

interface Memory {
  key: string
  content: string
  metadata: {
    id: string
    title: string
    created: string
    updated: string
    scope: string
    project: string
    tags: string[]
    links: string[]
    backlinks?: string[]
  }
  path: string
}

export default function App() {
  const [memories, setMemories] = useState<Memory[]>([])
  const [search, setSearch] = useState("")
  const [tagFilter, setTagFilter] = useState("all")
  const [scopeFilter, setScopeFilter] = useState("all")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [newTags, setNewTags] = useState("")
  const [newLinks, setNewLinks] = useState("")
  const [newScope, setNewScope] = useState("project")
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null)
  const [editingValue, setEditingValue] = useState("")
  const [editingTitle, setEditingTitle] = useState("")
  const [editingTags, setEditingTags] = useState("")
  const [editingLinks, setEditingLinks] = useState("")
  const [editingScope, setEditingScope] = useState("project")
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [currentTab, setCurrentTab] = useState<"dashboard" | "memories" | "graph">("memories")
  const [projects, setProjects] = useState<string[]>([])
  const [currentProject, setCurrentProject] = useState<string>("")

  useEffect(() => {
    loadMemories()
    loadProjects()
  }, [])

  const loadMemories = async () => {
    const data = await fetch(`/api/memories?scope=${scopeFilter}`).then(res => res.json())
    setMemories(Array.isArray(data) ? data : [])
  }

  const loadProjects = async () => {
    const data = await fetch("/api/projects").then(res => res.json())
    setProjects(data.projects || [])
    setCurrentProject(data.current || "")
  }

  const addMemory = async () => {
    if (!newKey || !newValue) return
    
    const context = {
      scope: newScope,
      title: newTitle || newKey,
      tags: newTags ? newTags.split(',').map(t => t.trim()).filter(Boolean) : [],
      links: newLinks ? newLinks.split(',').map(l => l.trim()).filter(Boolean) : []
    }
    
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: newKey, value: newValue, context })
    })
    setShowAddDialog(false)
    setNewKey(""); setNewValue(""); setNewTitle(""); setNewTags(""); setNewLinks("")
    loadMemories()
  }

  const handleEdit = (key: string) => {
    setEditingKey(key)
    setEditingValue(memories[key].value)
    setEditingContext(JSON.stringify(memories[key].context, null, 2))
    setShowEditDialog(true)
  }

  const saveEdit = async () => {
    if (!editingKey) return
    let context = {}
    if (editingContext) {
      try { context = JSON.parse(editingContext) }
      catch { alert("Invalid JSON in context"); return }
    }
    await fetch(`/api/memories/${editingKey}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: editingValue, context })
    })
    setShowEditDialog(false)
    setEditingKey(null)
    loadMemories()
  }

  const deleteMemory = async (key: string) => {
    if (!confirm(`Delete memory "${key}"?`)) return
    await fetch(`/api/memories/${key}`, { method: "DELETE" })
    loadMemories()
  }

  const allTags = Array.from(
    new Set(
      Object.values(memories)
        .flatMap(extractTags)
        .filter(Boolean)
    )
  )

  const filtered = Object.entries(memories).filter(([key, memory]) => {
    const tags = extractTags(memory)
    const matchesSearch =
      key.toLowerCase().includes(search.toLowerCase()) ||
      memory.value.toLowerCase().includes(search.toLowerCase()) ||
      tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
    const matchesTag = tagFilter === "all" || tags.includes(tagFilter)
    return matchesSearch && matchesTag
  })

  // Stats
  const memoryEntries = Object.entries(memories)
  const total = memoryEntries.length
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const recent = memoryEntries.filter(([_, memory]) =>
    new Date(memory.timestamp) > yesterday
  ).length
  const avgSize = total > 0
    ? Math.round(memoryEntries.reduce((sum, [_, memory]) => sum + memory.value.length, 0) / total)
    : 0

  return (
    <div className="min-h-screen bg-[#18181b] text-gray-100">
      {/* Top Nav */}
      <nav className="w-full bg-[#232329] border-b border-[#35353b] px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-bold text-xl tracking-tight text-white flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-pink-400 inline-block"></span>
            Like-I-said-mcp
          </span>
          <div className="flex gap-2 ml-8">
            <button
              onClick={() => setCurrentTab("dashboard")}
              className={`px-4 py-1 rounded font-semibold ${
                currentTab === "dashboard"
                  ? "text-white bg-[#232329] border-b-2 border-violet-500"
                  : "text-gray-300 bg-[#232329]"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setCurrentTab("memories")}
              className={`px-4 py-1 rounded font-semibold ${
                currentTab === "memories"
                  ? "text-white bg-[#232329] border-b-2 border-violet-500"
                  : "text-gray-300 bg-[#232329]"
              }`}
            >
              Memories
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={loadMemories} className="bg-[#232329] text-gray-300 border-[#35353b]">
            Refresh
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="bg-violet-600 hover:bg-violet-700 text-white font-bold">
                + Create Memory
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#232329] border-[#35353b] text-white">
              <DialogHeader>
                <DialogTitle>Create New Memory</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  placeholder="Key"
                  className="bg-[#2a2a30] border-[#35353b] text-white"
                />
                <Textarea
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="Value"
                  className="bg-[#2a2a30] border-[#35353b] text-white min-h-[80px]"
                />
                <Textarea
                  value={newContext}
                  onChange={e => setNewContext(e.target.value)}
                  placeholder='Context (JSON) e.g. {"tags": ["project", "ai"]}'
                  className="bg-[#2a2a30] border-[#35353b] text-white min-h-[60px]"
                />
                <div className="flex justify-end">
                  <Button onClick={addMemory} className="bg-violet-600 hover:bg-violet-700">
                    Create
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto mt-8 px-4">
        {currentTab === "dashboard" && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-[#232329] rounded-lg p-6 text-center border border-[#35353b]">
                <div className="text-3xl font-bold text-blue-400 mb-2">{total}</div>
                <div className="text-gray-400">Total Memories</div>
              </div>
              <div className="bg-[#232329] rounded-lg p-6 text-center border border-[#35353b]">
                <div className="text-3xl font-bold text-green-400 mb-2">{recent}</div>
                <div className="text-gray-400">Recent (24h)</div>
              </div>
              <div className="bg-[#232329] rounded-lg p-6 text-center border border-[#35353b]">
                <div className="text-3xl font-bold text-purple-400 mb-2">{avgSize}</div>
                <div className="text-gray-400">Avg Size (chars)</div>
              </div>
            </div>
            {/* Recent Memories */}
            <div className="bg-[#232329] rounded-lg p-6 border border-[#35353b]">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Memories</h3>
              <div className="space-y-3">
                {memoryEntries.slice(0, 5).map(([key, memory]) => (
                  <div key={key} className="flex justify-between items-center p-3 bg-[#2a2a30] rounded-lg">
                    <div className="flex-1">
                      <div className="font-mono text-blue-400 text-sm">{key}</div>
                      <div className="text-gray-300 text-sm truncate max-w-md">{memory.value}</div>
                    </div>
                    <div className="text-gray-500 text-xs">
                      {new Date(memory.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {currentTab === "memories" && (
          <>
            {/* Search and Tag Filter */}
            <div className="flex gap-4 mb-6">
              <Input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search Memories"
                className="bg-[#232329] border-[#35353b] text-white placeholder-gray-400 text-lg py-3"
              />
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-48 bg-[#232329] border-[#35353b] text-white">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent className="bg-[#232329] border-[#35353b]">
                  <SelectItem value="all" className="text-white">All Tags</SelectItem>
                  {allTags.map(tag => (
                    <SelectItem key={tag} value={tag} className="text-white">{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="bg-[#232329] rounded-xl shadow-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-[#35353b]">
                    <TableHead className="text-gray-400 font-semibold p-4">Key</TableHead>
                    <TableHead className="text-gray-400 font-semibold p-4">Value</TableHead>
                    <TableHead className="text-gray-400 font-semibold p-4">Tags</TableHead>
                    <TableHead className="text-gray-400 font-semibold p-4">Timestamp</TableHead>
                    <TableHead className="text-gray-400 font-semibold p-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(([key, memory]) => (
                    <TableRow key={key} className="border-b border-[#2a2a30] hover:bg-[#2a2a30] transition-colors">
                      <TableCell className="p-4 font-mono text-blue-400">{key}</TableCell>
                      <TableCell className="p-4 max-w-lg">
                        <div className="truncate text-gray-200">{memory.value}</div>
                      </TableCell>
                      <TableCell className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {extractTags(memory).map((tag, i) => (
                            <Badge key={`${tag}-${i}`} className="bg-violet-700 text-white text-xs px-2 py-1">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="p-4 text-gray-400 text-sm">
                        {new Date(memory.timestamp).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(key)}
                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                          >
                            ✏️
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMemory(key)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          >
                            🗑️
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No memories found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="bg-[#232329] border-[#35353b] text-white">
            <DialogHeader>
              <DialogTitle>Edit Memory</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Textarea
                value={editingValue}
                onChange={e => setEditingValue(e.target.value)}
                placeholder="Value"
                className="bg-[#2a2a30] border-[#35353b] text-white min-h-[80px]"
              />
              <Textarea
                value={editingContext}
                onChange={e => setEditingContext(e.target.value)}
                placeholder='Context (JSON) e.g. {"tags": ["project", "ai"]}'
                className="bg-[#2a2a30] border-[#35353b] text-white min-h-[60px]"
              />
              <div className="flex justify-end">
                <Button onClick={saveEdit} className="bg-violet-600 hover:bg-violet-700">
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
