// === CORE TYPES ===
export interface Memory {
  id: string
  content: string
  tags?: string[]
  timestamp: string
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
export type TabType = "dashboard" | "memories" | "graph"