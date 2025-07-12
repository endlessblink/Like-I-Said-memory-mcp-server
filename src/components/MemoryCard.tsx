import React, { useEffect, useState } from 'react'
import { Memory, MemoryCategory } from "@/types"
import { formatDistanceToNow } from "@/utils/helpers"
import { Edit, Trash2, Eye, Clock, Users, FileText, Loader2 } from "lucide-react"
import { QualityBadge } from "./QualityBadge"
import { useQualityStandards } from "@/hooks/useQualityStandards"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface MemoryCardProps {
  memory: Memory
  selected?: boolean
  onSelect?: (id: string) => void
  onEdit: () => void
  onDelete: (id: string) => void
  onView?: (memory: Memory) => void
  isDeleting?: boolean
}

// Helper functions for title/summary extraction
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
  
  // Enhanced title extraction with better handling of long titles
  const lines = content.split('\n').filter(line => line.trim())
  
  // Look for markdown headers
  const headerMatch = content.match(/^#{1,6}\s+(.+)$/m)
  if (headerMatch) {
    let title = headerMatch[1].trim()
    
    // Clean up title by removing excessive formatting and duplicates
    title = title.replace(/[#*_`\(\)]/g, '').trim()
    
    // Remove duplicate text patterns (common in copy-paste scenarios)
    const words = title.split(/\s+/)
    const uniqueWords = []
    const seenWords = new Set()
    
    for (const word of words) {
      const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!seenWords.has(cleanWord) && cleanWord.length > 2) {
        uniqueWords.push(word)
        seenWords.add(cleanWord)
      }
    }
    
    title = uniqueWords.join(' ')
    
    // Special handling for technical patterns
    if (title.toLowerCase().includes('issue fixed') || title.toLowerCase().includes('bug fix')) {
      // Extract the main component/system name
      const techMatch = title.match(/([\w\-]+)\s+(?:issue|bug|error)\s+fixed/i)
      if (techMatch) {
        return `${techMatch[1]} Issue Fixed`
      }
      // Handle NPX/Bin specific patterns
      if (title.toLowerCase().includes('npx') && title.toLowerCase().includes('bin')) {
        return 'NPX Bin Issue Fixed'
      }
    }
    
    // Handle dashboard/UI improvement patterns
    if (title.toLowerCase().includes('dashboard') && title.toLowerCase().includes('improvements')) {
      return 'Dashboard Improvements'
    }
    
    // Handle very long titles by extracting key words more aggressively
    if (title.length > 35) {
      const words = title.split(/\s+/)
      // Much more comprehensive stop words list
      const stopWords = [
        'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are',
        'ultimate', 'comprehensive', 'enhanced', 'modern', 'enterprise', 'grade', 'complete', 'full',
        'production', 'quality', 'assurance', 'checks', 'analysis', 'audit', 'security', 'advanced',
        'professional', 'standard', 'total', 'using', 'implementation', 'development', 'management',
        'session', 'major', 'fixes', 'completed', 'improvements', 'issue', 'fixed', 'like', 'said'
      ]
      
      // More aggressive filtering for meaningful words
      const meaningfulWords = words.filter(word => {
        const cleaned = word.toLowerCase().replace(/[^a-z0-9]/g, '')
        return cleaned.length > 2 && 
               !stopWords.includes(cleaned) &&
               !/^(\d+|mcp|v\d|server|client)$/.test(cleaned) &&
               !/^\d{4}$/.test(word) && // Skip years like 2025
               !/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|june|july|august|september|october|november|december)$/i.test(cleaned) && // Skip months
               !word.includes('+') && !word.includes('&') && !word.includes('-')
      })
      
      // Take only the most important words (3-4 max)
      const keyWords = meaningfulWords.slice(0, 4)
      
      if (keyWords.length >= 2) {
        // Capitalize appropriately and join
        const formattedWords = keyWords.map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        title = formattedWords.join(' ')
      } else {
        // Fallback: take first 3 words and clean them
        const fallbackWords = words.slice(0, 3).filter(w => w.length > 2)
        title = fallbackWords.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
      }
      
      // Final safety check
      if (title.length > 45) {
        title = title.substring(0, 42) + '...'
      }
    }
    
    return title || 'Untitled'
  }
  
  // Look for structured patterns
  const structuredPatterns = [
    /^(.+?):\s*[\r\n]/m,  // "Title: content"
    /^"(.+?)"/m,          // Quoted titles
    /^\*\*(.+?)\*\*/m,    // Bold markdown
    /^__(.+?)__/m,        // Bold underscore
    /^\[(.+?)\]/m,        // Bracketed content
  ]
  
  for (const pattern of structuredPatterns) {
    const match = content.match(pattern)
    if (match && match[1].length < 60 && match[1].length > 5) {
      return match[1].trim()
    }
  }
  
  // Extract from first meaningful sentence
  const sentences = content.split(/[.!?\n]+/).filter(s => s.trim().length > 10)
  for (const sentence of sentences.slice(0, 3)) {
    const cleaned = sentence.trim()
    if (!cleaned.match(/^(project location|current|status|update|working|running)/i) &&
        cleaned.length > 15 && cleaned.length < 80) {
      return cleaned
    }
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
  
  // Extract meaningful summary
  const cleanContent = content.replace(/[#*_`]/g, '').trim()
  const sentences = cleanContent.split(/[.!?\n]+/).filter(s => s.trim().length > 15)
  
  // Skip header-like sentences and get description
  const meaningfulSentences = sentences.filter(sentence => {
    const cleaned = sentence.trim()
    return !cleaned.match(/^(command|please|this is|here is|ultimate|comprehensive|checklist|production|quality|enterprise|modern|enhanced|security|audit|refactoring|using|implementation)/i) &&
           !cleaned.match(/^#{1,6}/) && // Skip markdown headers
           !cleaned.match(/^\d+\./) && // Skip numbered lists
           !cleaned.match(/^[-*+]/) && // Skip bullet points
           cleaned.length > 25 &&
           cleaned.length < 180
  })
  
  if (meaningfulSentences.length > 0) {
    const summary = meaningfulSentences.slice(0, 2).join('. ').trim()
    return summary.length > 150 ? summary.substring(0, 147) + '...' : summary
  }
  
  // Fallback to first few sentences
  const summary = sentences.slice(0, 2).join('. ').trim()
  return summary.length > 150 ? summary.substring(0, 147) + '...' : summary
}

const getCategoryClass = (category: MemoryCategory) => {
  const baseClasses = 'category-badge'
  switch (category) {
    case 'personal': return `${baseClasses} category-personal`
    case 'work': return `${baseClasses} category-work`
    case 'code': return `${baseClasses} category-code`
    case 'research': return `${baseClasses} category-research`
    case 'conversations': return `${baseClasses} category-research` // Use research style
    case 'preferences': return `${baseClasses} category-personal` // Use personal style
    default: return `${baseClasses} category-personal`
  }
}

const getComplexityClass = (complexity: number) => {
  switch (complexity) {
    case 1: return 'complexity-l1'
    case 2: return 'complexity-l2'
    case 3: return 'complexity-l3'
    case 4: return 'complexity-l4'
    default: return 'complexity-l1'
  }
}

const getComplexityLabel = (complexity: number) => {
  switch (complexity) {
    case 1: return 'L1'
    case 2: return 'L2'
    case 3: return 'L3'
    case 4: return 'L4'
    default: return 'L1'
  }
}

export function MemoryCard({ 
  memory, 
  selected = false, 
  onSelect, 
  onEdit, 
  onDelete, 
  onView,
  isDeleting = false
}: MemoryCardProps) {
  // Temporarily disable quality validation to prevent WebSocket errors
  // const { validateMemory } = useQualityStandards()
  const validateMemory = () => ({ score: 0, issues: [] }) // Mock function
  const [qualityScore, setQualityScore] = useState<number | null>(null)
  
  // Ensure backward compatibility with existing memory format
  const metadata = memory.metadata || {
    created: memory.timestamp,
    modified: memory.timestamp,
    lastAccessed: memory.timestamp,
    accessCount: 0,
    clients: [],
    contentType: 'text',
    size: new Blob([memory.content]).size
  }
  
  // Calculate quality score on mount or when memory changes
  useEffect(() => {
    const validation = validateMemory(memory)
    setQualityScore(validation.score)
  }, [memory, validateMemory])
  
  return (
    <div className={`
      card-glass ${getComplexityClass(memory.complexity || 1)} group cursor-pointer overflow-hidden
      ${selected ? 'ring-2 ring-violet-500 border-violet-400' : ''}
      w-full min-h-[200px] sm:min-h-[220px] h-auto flex
    `}>
      {/* Selection Checkbox Column */}
      {onSelect && (
        <div className="flex-shrink-0 p-4 flex items-start">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(memory.id)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 mt-0.5 text-violet-600 bg-white/10 border-white/20 rounded focus-ring focus:ring-violet-500 backdrop-blur-sm cursor-pointer"
          />
        </div>
      )}

      {/* Card Content */}
      <div className={`flex-1 flex flex-col h-full ${onSelect ? 'pr-4 py-4' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3 flex-shrink-0 min-w-0">
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          
          {/* Category Badge */}
          {memory.category && (
            <span className={getCategoryClass(memory.category)}>
              {memory.category}
            </span>
          )}
          
          {/* Project Tag */}
          {memory.project && (
            <span className="text-xs text-gray-400 truncate max-w-[100px]" title={memory.project}>
              📁 {memory.project}
            </span>
          )}
          
          {/* Quality Badge */}
          {qualityScore !== null && (
            <div className="flex-shrink-0">
              <QualityBadge score={qualityScore} size="sm" />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0 ml-2">
          {onView && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onView(memory)}
                    className="h-8 w-8 p-0 hover:bg-violet-500/20 hover:text-violet-300 transition-colors rounded-md flex items-center justify-center"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View memory details</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onEdit}
                  className="h-8 w-8 p-0 hover:bg-blue-500/20 hover:text-blue-300 transition-colors rounded-md flex items-center justify-center"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit memory content</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onDelete(memory.id)}
                  disabled={isDeleting}
                  className="h-8 w-8 p-0 hover:bg-red-500/20 hover:text-red-300 transition-colors disabled:opacity-50 rounded-md flex items-center justify-center"
                >
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isDeleting ? 'Deleting memory...' : 'Delete memory permanently'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Title and Summary */}
      <div className="flex-1 min-h-0 mb-3">
        {/* Title */}
        <h3 className="text-card-title mb-2 leading-tight line-clamp-2">
          {extractTitle(memory.content, memory)}
        </h3>
        
        {/* Summary */}
        <div className="text-card-description leading-relaxed line-clamp-2">
          {generateSummary(memory.content, memory)}
        </div>
      </div>

      {/* Tags */}
      {(() => {
        const visibleTags = extractVisibleTags(memory)
        const maxVisibleTags = 4
        const displayTags = visibleTags.slice(0, maxVisibleTags)
        const remainingCount = Math.max(0, visibleTags.length - maxVisibleTags)
        
        return visibleTags.length > 0 && (
          <div className="mt-auto mb-3 flex-shrink-0">
            <div className="flex flex-wrap gap-1">
              {displayTags.map((tag) => (
                <span key={tag} className="inline-flex items-center text-2xs bg-white/5 text-gray-300 border border-white/10 px-2 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap" title={tag}>
                  #{tag}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="inline-flex items-center text-2xs bg-white/10 text-gray-400 border border-white/20 px-2 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap" title={`${remainingCount} more tags: ${visibleTags.slice(maxVisibleTags).join(', ')}`}>
                  +{remainingCount}
                </span>
              )}
            </div>
          </div>
        )
      })()}

      {/* Footer */}
      <div className="flex items-center justify-between text-card-meta mt-auto pt-2 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          {/* Last Modified */}
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-gray-500" />
            <span className="text-2xs">{formatDistanceToNow(metadata.modified)}</span>
          </div>
          
          {/* Access Count */}
          {metadata.accessCount > 0 && (
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-blue-400" />
              <span className="text-2xs">{metadata.accessCount}</span>
            </div>
          )}
        </div>

        {/* Size */}
        <div className="text-2xs text-gray-500">
          {(metadata.size / 1024).toFixed(1)}KB
        </div>
      </div>
      </div>
    </div>
  )
}