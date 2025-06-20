import type { Memory, TagColor, SortField, SortDirection, SortOptions } from '../types'

/**
 * Extract tags from a memory object
 */
export function extractTags(memory: Memory): string[] {
  if (memory.tags && Array.isArray(memory.tags)) {
    return memory.tags
  }
  return []
}

/**
 * Generate a color scheme for a tag based on its content
 */
export function getTagColor(tag: string): TagColor {
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

/**
 * Extract a meaningful title from memory content
 */
export function extractTitle(content: string, memory?: Memory): string {
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

/**
 * Generate a summary from memory content
 */
export function generateSummary(content: string, memory?: Memory): string {
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

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string | Date): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

/**
 * Format date for display
 */
export function formatDate(timestamp: string | Date): string {
  const date = new Date(timestamp)
  return date.toLocaleDateString()
}

/**
 * Calculate days since a timestamp
 */
export function daysSince(timestamp: string | Date): number {
  const date = new Date(timestamp)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Format a date string to show relative time (e.g., "2 hours ago")
 */
export function formatDistanceToNow(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  
  const minute = 60 * 1000
  const hour = minute * 60
  const day = hour * 24
  const week = day * 7
  const month = day * 30
  const year = day * 365
  
  if (diffInMs < minute) {
    return "just now"
  } else if (diffInMs < hour) {
    const minutes = Math.floor(diffInMs / minute)
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`
  } else if (diffInMs < day) {
    const hours = Math.floor(diffInMs / hour)
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  } else if (diffInMs < week) {
    const days = Math.floor(diffInMs / day)
    return `${days} day${days !== 1 ? 's' : ''} ago`
  } else if (diffInMs < month) {
    const weeks = Math.floor(diffInMs / week)
    return `${weeks} week${weeks !== 1 ? 's' : ''} ago`
  } else if (diffInMs < year) {
    const months = Math.floor(diffInMs / month)
    return `${months} month${months !== 1 ? 's' : ''} ago`
  } else {
    const years = Math.floor(diffInMs / year)
    return `${years} year${years !== 1 ? 's' : ''} ago`
  }
}

/**
 * Truncate text to specified length with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + "..."
}

/**
 * Generate a random UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * Calculate content size in bytes
 */
export function calculateContentSize(content: string): number {
  return new Blob([content]).size
}

/**
 * Detect content type based on content
 */
export function detectContentType(content: string): 'text' | 'code' | 'structured' {
  // Check for code patterns
  const codePatterns = [
    /```[\s\S]*```/,  // Code blocks
    /function\s+\w+\s*\(/,  // Function declarations
    /class\s+\w+/,  // Class declarations
    /import\s+.*from/,  // Import statements
    /export\s+(default\s+)?/,  // Export statements
    /<\w+[^>]*>/,  // HTML tags
    /\{\s*"[\w"]+\s*:/  // JSON-like patterns
  ]
  
  if (codePatterns.some(pattern => pattern.test(content))) {
    return 'code'
  }
  
  // Check for structured data
  try {
    JSON.parse(content)
    return 'structured'
  } catch {
    // Not JSON
  }
  
  // Check for YAML-like patterns
  if (/^[\w\-]+:\s*/.test(content) || content.includes('---\n')) {
    return 'structured'
  }
  
  return 'text'
}

/**
 * Search memories with advanced filters
 */
export function searchMemories(memories: Memory[], query: string, filters?: any): Memory[] {
  let results = memories
  
  // Text search
  if (query.trim()) {
    const searchTerm = query.toLowerCase()
    results = results.filter(memory => 
      memory.content.toLowerCase().includes(searchTerm) ||
      (memory.tags && memory.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm))) ||
      (memory.project && memory.project.toLowerCase().includes(searchTerm))
    )
  }
  
  // Apply filters
  if (filters) {
    if (filters.category) {
      results = results.filter(memory => memory.category === filters.category)
    }
    
    if (filters.project) {
      results = results.filter(memory => memory.project === filters.project)
    }
    
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(memory => 
        memory.tags && filters.tags.some((tag: string) => memory.tags.includes(tag))
      )
    }
    
    if (filters.contentType) {
      results = results.filter(memory => 
        memory.metadata?.contentType === filters.contentType
      )
    }
    
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start)
      const endDate = new Date(filters.dateRange.end)
      results = results.filter(memory => {
        const memoryDate = new Date(memory.metadata?.created || memory.timestamp)
        return memoryDate >= startDate && memoryDate <= endDate
      })
    }
  }
  
  return results
}

/**
 * Sort memories by various criteria with performance optimization
 */
export function sortMemories(memories: Memory[], sortOptions: SortOptions): Memory[] {
  if (!memories.length) return memories
  
  const { field, direction } = sortOptions
  
  return [...memories].sort((a, b) => {
    let comparison = 0
    
    switch (field) {
      case 'date':
        // Use timestamp as primary, metadata.created as fallback
        const timestampA = a.timestamp || a.metadata?.created || a.metadata?.modified || '1970-01-01'
        const timestampB = b.timestamp || b.metadata?.created || b.metadata?.modified || '1970-01-01'
        const dateA = new Date(timestampA).getTime()
        const dateB = new Date(timestampB).getTime()
        comparison = dateA - dateB
        break
        
      case 'title':
        const titleA = extractTitle(a.content, a).toLowerCase()
        const titleB = extractTitle(b.content, b).toLowerCase()
        comparison = titleA.localeCompare(titleB)
        // If same title, secondary sort by timestamp
        if (comparison === 0) {
          const tsA = new Date(a.timestamp || '1970-01-01').getTime()
          const tsB = new Date(b.timestamp || '1970-01-01').getTime()
          comparison = tsA - tsB
        }
        break
        
      case 'length':
        comparison = a.content.length - b.content.length
        // If same length, secondary sort by timestamp
        if (comparison === 0) {
          const tsA = new Date(a.timestamp || '1970-01-01').getTime()
          const tsB = new Date(b.timestamp || '1970-01-01').getTime()
          comparison = tsA - tsB
        }
        break
        
      case 'tags':
        const tagsA = extractTags(a).length
        const tagsB = extractTags(b).length
        comparison = tagsA - tagsB
        // If same number of tags, secondary sort by timestamp
        if (comparison === 0) {
          const tsA = new Date(a.timestamp || '1970-01-01').getTime()
          const tsB = new Date(b.timestamp || '1970-01-01').getTime()
          comparison = tsA - tsB
        }
        break
        
      case 'project':
        const projectA = (a.project || 'default').toLowerCase()
        const projectB = (b.project || 'default').toLowerCase()
        comparison = projectA.localeCompare(projectB)
        // If same project, secondary sort by timestamp
        if (comparison === 0) {
          const tsA = new Date(a.timestamp || '1970-01-01').getTime()
          const tsB = new Date(b.timestamp || '1970-01-01').getTime()
          comparison = tsA - tsB
        }
        break
        
      case 'category':
        const categoryA = (a.category || 'personal').toLowerCase()
        const categoryB = (b.category || 'personal').toLowerCase()
        comparison = categoryA.localeCompare(categoryB)
        // If same category, secondary sort by timestamp
        if (comparison === 0) {
          const tsA = new Date(a.timestamp || '1970-01-01').getTime()
          const tsB = new Date(b.timestamp || '1970-01-01').getTime()
          comparison = tsA - tsB
        }
        break
        
      default:
        return 0
    }
    
    // Apply sort direction
    return direction === 'asc' ? comparison : -comparison
  })
}

/**
 * Get display info for sort fields (used in UI)
 */
export function getSortFieldInfo(field: SortField): { label: string; icon: string; description: string } {
  const sortFieldMap = {
    date: { label: 'Date Created', icon: '📅', description: 'When memory was created' },
    title: { label: 'Title', icon: '📝', description: 'Alphabetical by title' },
    length: { label: 'Content Length', icon: '📏', description: 'By amount of content' },
    tags: { label: 'Tag Count', icon: '🏷️', description: 'By number of tags' },
    project: { label: 'Project', icon: '📁', description: 'Alphabetical by project' },
    category: { label: 'Category', icon: '📂', description: 'By memory category' }
  }
  
  return sortFieldMap[field] || sortFieldMap.date
}