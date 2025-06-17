import { Memory } from '@/types'

export interface ExportOptions {
  format: 'json' | 'csv' | 'markdown'
  includeMetadata?: boolean
  filename?: string
}

export interface ExportResult {
  data: string
  filename: string
  mimeType: string
}

export function exportMemories(memories: Memory[], options: ExportOptions): ExportResult {
  const { format, includeMetadata = true, filename } = options
  const timestamp = new Date().toISOString().split('T')[0]
  
  switch (format) {
    case 'json':
      return exportToJSON(memories, includeMetadata, filename || `memories-${timestamp}.json`)
    
    case 'csv':
      return exportToCSV(memories, includeMetadata, filename || `memories-${timestamp}.csv`)
    
    case 'markdown':
      return exportToMarkdown(memories, includeMetadata, filename || `memories-${timestamp}.md`)
    
    default:
      throw new Error(`Unsupported export format: ${format}`)
  }
}

function exportToJSON(memories: Memory[], includeMetadata: boolean, filename: string): ExportResult {
  const exportData = {
    exportDate: new Date().toISOString(),
    version: '2.0.2',
    count: memories.length,
    memories: includeMetadata ? memories : memories.map(({ id, content, tags, timestamp, category, project }) => ({
      id,
      content,
      tags,
      timestamp,
      category,
      project
    }))
  }

  return {
    data: JSON.stringify(exportData, null, 2),
    filename,
    mimeType: 'application/json'
  }
}

function exportToCSV(memories: Memory[], includeMetadata: boolean, filename: string): ExportResult {
  const headers = [
    'ID',
    'Content',
    'Tags',
    'Timestamp',
    'Category',
    'Project'
  ]

  if (includeMetadata) {
    headers.push(
      'Created',
      'Modified',
      'Last Accessed',
      'Access Count',
      'Clients',
      'Content Type',
      'Size'
    )
  }

  const csvRows = [headers.join(',')]

  memories.forEach(memory => {
    const row = [
      escapeCSVField(memory.id),
      escapeCSVField(memory.content),
      escapeCSVField(memory.tags?.join('; ') || ''),
      escapeCSVField(memory.timestamp),
      escapeCSVField(memory.category || ''),
      escapeCSVField(memory.project || '')
    ]

    if (includeMetadata && memory.metadata) {
      row.push(
        escapeCSVField(memory.metadata.created || memory.timestamp),
        escapeCSVField(memory.metadata.modified || memory.timestamp),
        escapeCSVField(memory.metadata.lastAccessed || memory.timestamp),
        memory.metadata.accessCount?.toString() || '0',
        escapeCSVField(memory.metadata.clients?.join('; ') || ''),
        escapeCSVField(memory.metadata.contentType || 'text'),
        memory.metadata.size?.toString() || '0'
      )
    }

    csvRows.push(row.join(','))
  })

  return {
    data: csvRows.join('\n'),
    filename,
    mimeType: 'text/csv'
  }
}

function exportToMarkdown(memories: Memory[], includeMetadata: boolean, filename: string): ExportResult {
  const lines = [
    '# Memory Export',
    '',
    `**Export Date:** ${new Date().toLocaleDateString()}`,
    `**Total Memories:** ${memories.length}`,
    '',
    '---',
    ''
  ]

  memories.forEach((memory, index) => {
    lines.push(`## Memory ${index + 1}`)
    lines.push('')

    // Basic info
    if (memory.category) {
      lines.push(`**Category:** ${memory.category}`)
    }
    if (memory.project) {
      lines.push(`**Project:** ${memory.project}`)
    }
    if (memory.tags && memory.tags.length > 0) {
      lines.push(`**Tags:** ${memory.tags.join(', ')}`)
    }
    lines.push(`**Created:** ${new Date(memory.timestamp).toLocaleString()}`)
    
    if (includeMetadata && memory.metadata) {
      lines.push(`**Modified:** ${new Date(memory.metadata.modified || memory.timestamp).toLocaleString()}`)
      lines.push(`**Access Count:** ${memory.metadata.accessCount || 0}`)
      if (memory.metadata.clients && memory.metadata.clients.length > 0) {
        lines.push(`**Accessed by:** ${memory.metadata.clients.join(', ')}`)
      }
    }

    lines.push('')
    
    // Content
    lines.push('### Content')
    lines.push('')
    
    // Handle code blocks and preserve formatting
    if (memory.content.includes('```')) {
      lines.push(memory.content)
    } else {
      // Regular content - escape markdown if needed
      const escapedContent = memory.content
        .replace(/\*/g, '\\*')
        .replace(/#/g, '\\#')
        .replace(/\[/g, '\\[')
        .replace(/\]/g, '\\]')
      lines.push(escapedContent)
    }
    
    lines.push('')
    lines.push('---')
    lines.push('')
  })

  return {
    data: lines.join('\n'),
    filename,
    mimeType: 'text/markdown'
  }
}

function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

// Import functionality
export function parseImportData(data: string, format: 'json' | 'csv'): Memory[] {
  switch (format) {
    case 'json':
      return parseJSONImport(data)
    case 'csv':
      return parseCSVImport(data)
    default:
      throw new Error(`Unsupported import format: ${format}`)
  }
}

function parseJSONImport(data: string): Memory[] {
  try {
    const parsed = JSON.parse(data)
    
    // Handle different JSON structures
    if (parsed.memories && Array.isArray(parsed.memories)) {
      return parsed.memories
    } else if (Array.isArray(parsed)) {
      return parsed
    } else {
      throw new Error('Invalid JSON structure')
    }
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function parseCSVImport(data: string): Memory[] {
  const lines = data.split('\n').filter(line => line.trim())
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row')
  }

  const headers = parseCSVRow(lines[0])
  const memories: Memory[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVRow(lines[i])
    if (values.length !== headers.length) {
      console.warn(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`)
      continue
    }

    const memory: Partial<Memory> = {}
    
    headers.forEach((header, index) => {
      const value = values[index]
      
      switch (header.toLowerCase()) {
        case 'id':
          memory.id = value
          break
        case 'content':
          memory.content = value
          break
        case 'tags':
          memory.tags = value ? value.split('; ').map(tag => tag.trim()).filter(Boolean) : []
          break
        case 'timestamp':
          memory.timestamp = value
          break
        case 'category':
          memory.category = value as any
          break
        case 'project':
          memory.project = value || undefined
          break
        // Handle metadata fields
        case 'created':
        case 'modified':
        case 'last accessed':
        case 'access count':
        case 'clients':
        case 'content type':
        case 'size':
          if (!memory.metadata) {
            memory.metadata = {
              created: memory.timestamp || new Date().toISOString(),
              modified: memory.timestamp || new Date().toISOString(),
              lastAccessed: memory.timestamp || new Date().toISOString(),
              accessCount: 0,
              clients: [],
              contentType: 'text',
              size: 0
            }
          }
          // Set specific metadata fields
          // This is a simplified implementation - in practice you'd want more robust parsing
          break
      }
    })

    if (memory.id && memory.content) {
      memories.push(memory as Memory)
    }
  }

  return memories
}

function parseCSVRow(row: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i]
    
    if (char === '"') {
      if (inQuotes && row[i + 1] === '"') {
        current += '"'
        i++ // Skip next quote
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current)
  return result
}

// Download utility for browser
export function downloadFile(data: string, filename: string, mimeType: string): void {
  const blob = new Blob([data], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}