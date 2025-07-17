import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MemoryCategory } from '@/types'
import { Lightbulb, Check, X, ChevronDown, ChevronUp, Info, Loader2 } from 'lucide-react'

interface CategorySuggestion {
  category: MemoryCategory
  confidence: number
  reasons: string[]
  description?: string
  icon: string
}

interface CategorySuggestionsProps {
  content: string
  tags: string[]
  currentCategory?: MemoryCategory
  onSelectCategory: (category: MemoryCategory) => void
  onSuggestionAccept?: (suggestion: CategorySuggestion) => void
  onSuggestionReject?: (suggestion: CategorySuggestion) => void
  className?: string
  disabled?: boolean
  useAdvancedAnalysis?: boolean
}

export function CategorySuggestions({ 
  content, 
  tags, 
  currentCategory, 
  onSelectCategory,
  onSuggestionAccept,
  onSuggestionReject,
  className = '',
  disabled = false,
  useAdvancedAnalysis = true
}: CategorySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)
  const [showAnalysis, setShowAnalysis] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Debounce content analysis
  useEffect(() => {
    if (!content || content.trim().length < 10 || disabled) {
      setSuggestions([])
      return
    }

    const timeoutId = setTimeout(() => {
      if (useAdvancedAnalysis) {
        analyzeWithAPI(content, tags)
      } else {
        analyzeLocally(content, tags)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [content, tags, disabled, useAdvancedAnalysis])

  // Advanced API-based analysis
  const analyzeWithAPI = async (text: string, tags: string[]) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/analyze/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: text,
          tags,
          maxSuggestions: 3,
          minConfidence: 0.15
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const apiSuggestions = data.suggestions?.map((s: any) => ({
          ...s,
          confidence: Math.round(s.confidence * 100),
          icon: getCategoryIcon(s.category)
        })) || []
        
        setSuggestions(apiSuggestions)
      } else {
        console.warn('API analysis failed, falling back to local analysis')
        analyzeLocally(text, tags)
      }
    } catch (error) {
      console.error('Category analysis error:', error)
      setError('Analysis temporarily unavailable')
      analyzeLocally(text, tags)
    } finally {
      setLoading(false)
    }
  }

  // Local fallback analysis
  const analyzeLocally = (text: string, tags: string[]) => {
    setLoading(true)
    setTimeout(() => {
      const localSuggestions = analyzeCategoryOptions(text, tags)
      setSuggestions(localSuggestions)
      setLoading(false)
    }, 200) // Small delay to show loading state
  }

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      code: '💻',
      work: '💼', 
      research: '📊',
      conversations: '💬',
      personal: '👤',
      preferences: '⚙️'
    }
    return icons[category] || '📝'
  }

  const handleAcceptSuggestion = (suggestion: CategorySuggestion) => {
    onSelectCategory(suggestion.category)
    onSuggestionAccept?.(suggestion)
    
    // Send feedback to improve future suggestions
    sendFeedback(suggestion, 'accept')
  }

  const handleRejectSuggestion = (suggestion: CategorySuggestion) => {
    onSuggestionReject?.(suggestion)
    
    // Send feedback to improve future suggestions
    sendFeedback(suggestion, 'reject')
    
    // Remove from current suggestions
    setSuggestions(prev => prev.filter(s => s.category !== suggestion.category))
  }

  const sendFeedback = async (suggestion: CategorySuggestion, action: 'accept' | 'reject') => {
    try {
      await fetch('/api/analyze/categories/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestion,
          action,
          content: content.substring(0, 500),
          tags,
          userCategory: currentCategory
        }),
      })
    } catch (error) {
      console.error('Failed to send feedback:', error)
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 70) return 'text-green-400 border-green-500/30'
    if (confidence >= 40) return 'text-yellow-400 border-yellow-500/30'
    return 'text-orange-400 border-orange-500/30'
  }

  const analyzeCategoryOptions = (content: string, tags: string[]): CategorySuggestion[] => {
    const lowerContent = content.toLowerCase()
    const lowerTags = tags.map(tag => tag.toLowerCase())
    const suggestions: CategorySuggestion[] = []

    // Code category analysis
    const codeKeywords = ["code", "programming", "dev", "tech", "javascript", "typescript", "python", "react", "node", "api", "database", "sql"]
    const codePatterns = [
      { pattern: /```/, reason: "contains code blocks" },
      { pattern: /\bfunction\b/, reason: "mentions functions" },
      { pattern: /\bnpm\s/, reason: "references npm commands" },
      { pattern: /\bgit\s/, reason: "contains git commands" },
      { pattern: /\bconst\s/, reason: "uses JavaScript syntax" },
      { pattern: /\bimport\s/, reason: "has import statements" },
      { pattern: /\bexport\s/, reason: "has export statements" },
      { pattern: /\b(bug|fix|debug|error|exception|variable|method|class)\b/i, reason: "discusses programming concepts" }
    ]
    
    let codeConfidence = 0
    const codeReasons: string[] = []
    
    // Check tags
    const codeTagMatches = lowerTags.filter(tag => codeKeywords.includes(tag))
    if (codeTagMatches.length > 0) {
      codeConfidence += codeTagMatches.length * 15
      codeReasons.push(`tagged with: ${codeTagMatches.join(', ')}`)
    }
    
    // Check patterns
    codePatterns.forEach(({ pattern, reason }) => {
      if (pattern.test(content)) {
        codeConfidence += 10
        codeReasons.push(reason)
      }
    })
    
    if (codeConfidence > 0) {
      suggestions.push({
        category: 'code',
        confidence: Math.min(codeConfidence, 100),
        reasons: codeReasons,
        icon: '💻'
      })
    }

    // Work category analysis
    const workKeywords = ["work", "business", "meeting", "client", "job", "project", "team", "office", "deadline", "task"]
    const workPatterns = [
      { pattern: /\b(meeting|deadline|project|team|client|business|work|office|manager|boss|colleague)\b/i, reason: "contains work-related terms" }
    ]
    
    let workConfidence = 0
    const workReasons: string[] = []
    
    const workTagMatches = lowerTags.filter(tag => workKeywords.includes(tag))
    if (workTagMatches.length > 0) {
      workConfidence += workTagMatches.length * 15
      workReasons.push(`tagged with: ${workTagMatches.join(', ')}`)
    }
    
    workPatterns.forEach(({ pattern, reason }) => {
      if (pattern.test(content)) {
        workConfidence += 10
        workReasons.push(reason)
      }
    })
    
    if (workConfidence > 0) {
      suggestions.push({
        category: 'work',
        confidence: Math.min(workConfidence, 100),
        reasons: workReasons,
        icon: '💼'
      })
    }

    // Research category analysis
    const researchKeywords = ["research", "study", "analysis", "data", "investigation", "paper", "academic", "science"]
    const researchPatterns = [
      { pattern: /\b(research|study|analysis|investigation|findings|hypothesis|methodology|paper|academic)\b/i, reason: "contains research terminology" }
    ]
    
    let researchConfidence = 0
    const researchReasons: string[] = []
    
    const researchTagMatches = lowerTags.filter(tag => researchKeywords.includes(tag))
    if (researchTagMatches.length > 0) {
      researchConfidence += researchTagMatches.length * 15
      researchReasons.push(`tagged with: ${researchTagMatches.join(', ')}`)
    }
    
    researchPatterns.forEach(({ pattern, reason }) => {
      if (pattern.test(content)) {
        researchConfidence += 10
        researchReasons.push(reason)
      }
    })
    
    if (researchConfidence > 0) {
      suggestions.push({
        category: 'research',
        confidence: Math.min(researchConfidence, 100),
        reasons: researchReasons,
        icon: '📊'
      })
    }

    // Conversations category analysis
    const conversationKeywords = ["conversation", "chat", "discussion", "call", "meeting", "talk"]
    const conversationPatterns = [
      { pattern: /\b(conversation|discussed|talked|said|mentioned|asked|told|chat|call)\b/i, reason: "describes conversations" },
      { pattern: /"[^"]*"/, reason: "contains quoted speech" },
      { pattern: /'[^']*'/, reason: "contains quoted text" }
    ]
    
    let conversationConfidence = 0
    const conversationReasons: string[] = []
    
    const conversationTagMatches = lowerTags.filter(tag => conversationKeywords.includes(tag))
    if (conversationTagMatches.length > 0) {
      conversationConfidence += conversationTagMatches.length * 15
      conversationReasons.push(`tagged with: ${conversationTagMatches.join(', ')}`)
    }
    
    conversationPatterns.forEach(({ pattern, reason }) => {
      if (pattern.test(content)) {
        conversationConfidence += 10
        conversationReasons.push(reason)
      }
    })
    
    if (conversationConfidence > 0) {
      suggestions.push({
        category: 'conversations',
        confidence: Math.min(conversationConfidence, 100),
        reasons: conversationReasons,
        icon: '💬'
      })
    }

    // Personal category analysis
    const personalKeywords = ["personal", "me", "my", "self", "private", "family", "friend", "home"]
    const personalPatterns = [
      { pattern: /\b(my |I |me |myself|personal|family|friend|home|feel|think|believe|remember)\b/i, reason: "uses personal language" }
    ]
    
    let personalConfidence = 0
    const personalReasons: string[] = []
    
    const personalTagMatches = lowerTags.filter(tag => personalKeywords.includes(tag))
    if (personalTagMatches.length > 0) {
      personalConfidence += personalTagMatches.length * 15
      personalReasons.push(`tagged with: ${personalTagMatches.join(', ')}`)
    }
    
    personalPatterns.forEach(({ pattern, reason }) => {
      if (pattern.test(content)) {
        personalConfidence += 10
        personalReasons.push(reason)
      }
    })
    
    if (personalConfidence > 0) {
      suggestions.push({
        category: 'personal',
        confidence: Math.min(personalConfidence, 100),
        reasons: personalReasons,
        icon: '👤'
      })
    }

    // Preferences category analysis  
    const preferencesPatterns = [
      { pattern: /\b(prefer|like|dislike|favorite|setting|config|option|choice)\b/i, reason: "describes preferences or settings" }
    ]
    
    let preferencesConfidence = 0
    const preferencesReasons: string[] = []
    
    preferencesPatterns.forEach(({ pattern, reason }) => {
      if (pattern.test(content)) {
        preferencesConfidence += 10
        preferencesReasons.push(reason)
      }
    })
    
    if (preferencesConfidence > 0) {
      suggestions.push({
        category: 'preferences',
        confidence: Math.min(preferencesConfidence, 100),
        reasons: preferencesReasons,
        icon: '⚙️'
      })
    }

    // Sort by confidence (highest first) and take top 3
    return suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
  }

  // Use either API suggestions or local analysis fallback
  const displaySuggestions = suggestions.length > 0 ? suggestions : analyzeCategoryOptions(content, tags)
  
  // Don't show suggestions if disabled or no meaningful content
  if (disabled || (!loading && displaySuggestions.length === 0 && !error)) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Lightbulb className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-gray-300">Category Suggestions</span>
        {loading && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
        <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
          {useAdvancedAnalysis ? 'AI Analysis' : 'Local Analysis'}
        </Badge>
        {displaySuggestions.length > 0 && (
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className="ml-auto text-xs text-gray-400 hover:text-gray-300 flex items-center gap-1"
          >
            <Info className="w-3 h-3" />
            {showAnalysis ? 'Hide' : 'Show'} Details
          </button>
        )}
      </div>

      {error && (
        <div className="text-sm text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-lg p-2">
          {error} - Using local analysis instead
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 italic">
          Analyzing content for category suggestions...
        </div>
      ) : displaySuggestions.length > 0 ? (
        <div className="space-y-2">
          {displaySuggestions.map((suggestion) => (
            <div 
              key={suggestion.category}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-800/70 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-lg">{suggestion.icon}</span>
                  <span className="font-medium text-white capitalize">{suggestion.category}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
                  >
                    {suggestion.confidence}% confidence
                  </Badge>
                  {currentCategory === suggestion.category && (
                    <Badge variant="outline" className="text-xs text-violet-400 border-violet-500/30">
                      Current
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setExpandedSuggestion(
                      expandedSuggestion === suggestion.category ? null : suggestion.category
                    )}
                    className="p-1 text-gray-400 hover:text-gray-300 rounded"
                    title="Show details"
                  >
                    {expandedSuggestion === suggestion.category ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  
                  {currentCategory !== suggestion.category && useAdvancedAnalysis && (
                    <>
                      <button
                        onClick={() => handleAcceptSuggestion(suggestion)}
                        className="p-1 text-green-400 hover:text-green-300 rounded"
                        title="Accept suggestion"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRejectSuggestion(suggestion)}
                        className="p-1 text-red-400 hover:text-red-300 rounded"
                        title="Reject suggestion"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  
                  {currentCategory !== suggestion.category && !useAdvancedAnalysis && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSelectCategory(suggestion.category)}
                      className="text-xs"
                    >
                      Apply
                    </Button>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-400 mt-1">
                {suggestion.description || 
                 `${suggestion.reasons.slice(0, 2).join(', ')}${suggestion.reasons.length > 2 ? ` +${suggestion.reasons.length - 2} more` : ''}`}
              </div>

              {expandedSuggestion === suggestion.category && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-xs text-gray-300 font-medium mb-2">
                    Why this category was suggested:
                  </div>
                  <ul className="text-xs text-gray-400 space-y-1">
                    {suggestion.reasons.map((reason, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-blue-400 mt-0.5">•</span>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-400 italic">
          No category suggestions available for this content.
        </div>
      )}

      {showAnalysis && displaySuggestions.length > 0 && (
        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700">
          <div className="text-xs font-medium text-gray-300 mb-2">
            Content Analysis Summary
          </div>
          <div className="text-xs text-gray-400 space-y-1">
            <div>Content length: {content.length} characters</div>
            <div>Word count: {content.split(/\s+/).filter(w => w.length > 0).length}</div>
            <div>Tags: {tags.length > 0 ? tags.join(', ') : 'None'}</div>
            <div>Top suggestion: {displaySuggestions[0]?.category} ({displaySuggestions[0]?.confidence}% confidence)</div>
            <div>Analysis method: {useAdvancedAnalysis ? 'API-based' : 'Local'}</div>
          </div>
        </div>
      )}
      
      {displaySuggestions.length > 0 && (
        <div className="text-xs text-gray-500">
          💡 Suggestions are based on content analysis{tags.length > 0 ? ' and tags' : ''}. 
          {useAdvancedAnalysis ? ' Feedback helps improve future suggestions.' : ' Click "Apply" to use a suggestion.'}
        </div>
      )}
    </div>
  )
}