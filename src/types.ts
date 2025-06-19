// === CORE TYPES ===
export interface Memory {
  id: string
  content: string
  tags?: string[]
  timestamp: string
  project?: string
  category?: 'personal' | 'work' | 'code' | 'research' | 'conversations' | 'preferences'
  metadata: {
    created: string
    modified: string
    lastAccessed: string
    accessCount: number
    clients: string[] // Which MCP clients accessed this memory
    contentType: 'text' | 'code' | 'structured'
    size: number
  }
}

// === SORTING TYPES ===
export type SortField = 'date' | 'title' | 'length' | 'tags' | 'project' | 'category'
export type SortDirection = 'asc' | 'desc'

export interface SortOptions {
  field: SortField
  direction: SortDirection
}

export interface GraphNode {
  id: string
  label: string
  title: string
  summary: string
  tags: string[]
  size: number
  color: string
  val: number
  content: string
  timestamp: string
}

export interface GraphLink {
  source: string
  target: string
  value: number
  color: string
}

export interface TagColor {
  bg: string
  text: string
  border: string
}

export interface Category {
  id: string
  name: string
  icon: string
  count: number
}

// === UI TYPES ===
export type ViewMode = "cards" | "table" | "graph"
export type GraphViewType = "galaxy" | "clusters" | "timeline"
export type LLMProvider = "openai" | "anthropic" | "none"
export type TabType = "dashboard" | "memories" | "projects" | "settings" | "graph"
export type MemoryCategory = 'personal' | 'work' | 'code' | 'research' | 'conversations' | 'preferences'
export type ContentType = 'text' | 'code' | 'structured'

// === ADVANCED SEARCH TYPES ===
export interface AdvancedFilters {
  text?: string
  tags?: string[]
  project?: string
  category?: MemoryCategory
  contentType?: ContentType
  dateRange?: { start: string; end: string }
  clients?: string[]
  // Logical operators
  AND?: AdvancedFilters[]
  OR?: AdvancedFilters[]
  NOT?: AdvancedFilters
}

export interface SearchState {
  query: string
  filters: AdvancedFilters
  results: Memory[]
  loading: boolean
}

// === BULK OPERATIONS ===
export interface BulkOperation {
  type: 'delete' | 'export' | 'tag' | 'move-to-project'
  memoryIds: string[]
  params?: Record<string, any>
}

// === ACCESS CONTROL ===
export interface ClientConnection {
  id: string
  name: string
  lastSeen: string
  operations: number
  status: 'connected' | 'disconnected'
  permissions: string[]
}

export interface AccessLogEntry {
  timestamp: string
  client: string
  operation: 'read' | 'write' | 'delete'
  memoryId: string
  success: boolean
}

// === PROJECT ORGANIZATION ===
export interface Project {
  id: string
  name: string
  description?: string
  memories: Memory[]
  stats: {
    total: number
    recent: number
    categories: Record<MemoryCategory, number>
  }
  created: string
  modified: string
}