import { useState, useEffect, useCallback } from 'react'
import { Memory } from '@/types'

// Singleton cache for quality standards to prevent multiple fetches
let cachedStandards: QualityStandards | null = null
let fetchPromise: Promise<QualityStandards> | null = null
let wsConnection: WebSocket | null = null
let wsListeners: Set<() => void> = new Set()

interface QualityStandards {
  titleMinLength: number
  titleMaxLength: number
  descriptionMinLength: number
  descriptionMaxLength: number
  forbiddenPatterns: string[]
  weakWords: string[]
  strongActions: string[]
  qualityThresholds: {
    excellent: number
    good: number
    fair: number
    poor: number
    critical: number
    passing: number
  }
}

interface QualityValidation {
  score: number
  level: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  issues: string[]
  suggestions: string[]
  meetsStandards: boolean
}

export function useQualityStandards() {
  // Enable quality validation - using real implementation
  
  const [standards, setStandards] = useState<QualityStandards | null>(cachedStandards)
  const [loading, setLoading] = useState(!cachedStandards)
  const [error, setError] = useState<string | null>(null)

  // Fetch standards from API with singleton pattern
  const fetchStandards = useCallback(async () => {
    // If already fetching, wait for existing promise
    if (fetchPromise) {
      try {
        const data = await fetchPromise
        setStandards(data)
        setError(null)
        return
      } catch (err) {
        console.error('Error waiting for standards fetch:', err)
      }
    }

    // Start new fetch
    fetchPromise = fetch('/api/quality/standards')
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch standards')
        return response.json()
      })
      .then(data => {
        cachedStandards = data
        fetchPromise = null
        return data
      })

    try {
      const data = await fetchPromise
      setStandards(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching quality standards:', err)
      setError(err.message)
      fetchPromise = null
      // Use default standards as fallback
      const defaultStandards = {
        titleMinLength: 15,
        titleMaxLength: 80,
        descriptionMinLength: 50,
        descriptionMaxLength: 300,
        forbiddenPatterns: [
          'dashboard improvements',
          'session\\s*\\(',
          '\\(\\s*\\w+\\s+\\d{1,2},?\\s+\\d{4}\\s*\\)',
          'major|complete|comprehensive',
          'status|update|progress'
        ],
        weakWords: ['improvements', 'session', 'update', 'status', 'changes', 'modifications'],
        strongActions: ['implement', 'fix', 'add', 'create', 'configure', 'optimize', 'refactor'],
        qualityThresholds: {
          excellent: 90,
          good: 70,
          fair: 60,
          poor: 40,
          critical: 0,
          passing: 70
        }
      }
      cachedStandards = defaultStandards
      setStandards(defaultStandards)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Only fetch if no cached standards
    if (!cachedStandards) {
      fetchStandards()
    }

    // WebSocket disabled to prevent duplicate connections - using main App.tsx WebSocket instead
    // Quality validation works fine without WebSocket for now
    return
    
    // Temporarily disable WebSocket in useQualityStandards to prevent duplicate connections
    // Set up shared WebSocket connection
    if (false && !wsConnection || 
        (wsConnection?.readyState !== WebSocket.OPEN && 
         wsConnection?.readyState !== WebSocket.CONNECTING)) {
      try {
        // Only create new connection if not already connecting
        if (!wsConnection || wsConnection.readyState === WebSocket.CLOSED) {
          const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
          const wsUrl = `${protocol}//${window.location.hostname}:3001`
          wsConnection = new WebSocket(wsUrl)
          
          wsConnection.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data)
              if (data.type === 'standards-update') {
                // Clear cache and notify all listeners
                cachedStandards = null
                wsListeners.forEach(listener => listener())
              }
            } catch (error) {
              console.error('Error parsing WebSocket message:', error)
            }
          }

          wsConnection.onerror = (error) => {
            // Only log error if it's not a connection refused error during page load
            if (wsConnection && wsConnection.readyState !== WebSocket.CLOSED) {
              console.error('WebSocket error in quality standards:', error)
            }
          }

          wsConnection.onclose = () => {
            // Mark connection as null only if it's truly closed
            if (wsConnection?.readyState === WebSocket.CLOSED) {
              wsConnection = null
            }
          }
        }
      } catch (error) {
        console.error('Failed to create WebSocket:', error)
      }
    }

    // Add listener for this component
    const updateListener = () => {
      fetchStandards()
    }
    wsListeners.add(updateListener)

    return () => {
      wsListeners.delete(updateListener)
      // Only close WebSocket if no more listeners
      if (wsListeners.size === 0 && wsConnection) {
        wsConnection.close()
        wsConnection = null
      }
    }
  }, [fetchStandards])

  // Validate memory quality
  const validateMemory = useCallback((memory: Memory): QualityValidation => {
    if (!standards) {
      return {
        score: 0,
        level: 'critical',
        issues: ['Standards not loaded'],
        suggestions: [],
        meetsStandards: false
      }
    }

    const issues: string[] = []
    const suggestions: string[] = []
    let score = 100

    // Extract title from content
    const titleMatch = memory.content.match(/^#+\s+(.+)$/m) || memory.content.match(/^(.+?)[\r\n]/)
    const title = titleMatch ? titleMatch[1].trim() : ''

    // Title validation
    if (title.length < standards.titleMinLength) {
      issues.push(`Title too short (${title.length}/${standards.titleMinLength} chars)`)
      suggestions.push('Expand title with more specific details')
      score -= 20
    }

    if (title.length > standards.titleMaxLength) {
      issues.push(`Title too long (${title.length}/${standards.titleMaxLength} chars)`)
      suggestions.push('Shorten title to essential information')
      score -= 10
    }

    // Check forbidden patterns
    standards.forbiddenPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'i')
      if (regex.test(title)) {
        issues.push(`Title contains forbidden pattern: ${pattern}`)
        suggestions.push('Remove generic terms and be more specific')
        score -= 15
      }
    })

    // Check weak words
    const titleWords = title.toLowerCase().split(/\s+/)
    const weakWordsFound = standards.weakWords.filter(word => 
      titleWords.includes(word.toLowerCase())
    )
    if (weakWordsFound.length > 0) {
      issues.push(`Title contains weak words: ${weakWordsFound.join(', ')}`)
      suggestions.push('Replace with stronger action words')
      score -= 10 * weakWordsFound.length
    }

    // Check for strong action words
    const hasStrongAction = standards.strongActions.some(action => 
      title.toLowerCase().includes(action.toLowerCase())
    )
    if (!hasStrongAction) {
      issues.push('Title lacks strong action word')
      suggestions.push(`Start with action words like: ${standards.strongActions.slice(0, 3).join(', ')}`)
      score -= 15
    }

    // Description validation (content without title)
    const description = memory.content.replace(/^#+\s+.+$/m, '').trim()
    
    if (description.length < standards.descriptionMinLength) {
      issues.push(`Description too short (${description.length}/${standards.descriptionMinLength} chars)`)
      suggestions.push('Add more technical details and context')
      score -= 20
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score))

    // Determine quality level
    let level: QualityValidation['level'] = 'critical'
    if (score >= standards.qualityThresholds.excellent) level = 'excellent'
    else if (score >= standards.qualityThresholds.good) level = 'good'
    else if (score >= standards.qualityThresholds.fair) level = 'fair'
    else if (score >= standards.qualityThresholds.poor) level = 'poor'

    return {
      score,
      level,
      issues,
      suggestions,
      meetsStandards: score >= standards.qualityThresholds.passing
    }
  }, [standards])

  // Generate improved title
  const suggestImprovedTitle = useCallback((currentTitle: string): string => {
    if (!standards) return currentTitle

    let improved = currentTitle

    // Remove forbidden patterns
    standards.forbiddenPatterns.forEach(pattern => {
      const regex = new RegExp(pattern, 'gi')
      improved = improved.replace(regex, '')
    })

    // Remove weak words
    standards.weakWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi')
      improved = improved.replace(regex, '')
    })

    // Clean up extra spaces
    improved = improved.replace(/\s+/g, ' ').trim()

    // Add action word if missing
    const hasAction = standards.strongActions.some(action => 
      improved.toLowerCase().includes(action.toLowerCase())
    )
    if (!hasAction && standards.strongActions.length > 0) {
      improved = `${standards.strongActions[0]} ${improved}`
    }

    // Ensure proper length
    if (improved.length > standards.titleMaxLength) {
      improved = improved.substring(0, standards.titleMaxLength - 3) + '...'
    }

    return improved
  }, [standards])

  return {
    standards,
    loading,
    error,
    validateMemory,
    suggestImprovedTitle,
    refetch: fetchStandards
  }
}