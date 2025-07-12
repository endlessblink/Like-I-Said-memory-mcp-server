import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MemoryCategory } from '@/types'

interface CategorySuggestion {
  category: MemoryCategory
  confidence: number
  reasons: string[]
  icon: string
}

interface CategorySuggestionsProps {
  content: string
  tags: string[]
  currentCategory?: MemoryCategory
  onSelectCategory: (category: MemoryCategory) => void
  className?: string
}

export function CategorySuggestions({ 
  content, 
  tags, 
  currentCategory, 
  onSelectCategory,
  className = '' 
}: CategorySuggestionsProps) {
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

  const suggestions = analyzeCategoryOptions(content, tags)
  
  // Don't show suggestions if content is too short or if there are no suggestions
  if (!content.trim() || content.trim().length < 20 || suggestions.length === 0) {
    return null
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-300">🎯 Suggested Categories</span>
        <Badge variant="outline" className="text-xs text-blue-400 border-blue-500/30">
          AI Analysis
        </Badge>
      </div>
      
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div 
            key={suggestion.category}
            className="flex items-center justify-between p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:bg-gray-800/70 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{suggestion.icon}</span>
                <span className="font-medium text-white capitalize">{suggestion.category}</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    suggestion.confidence >= 70 
                      ? 'text-green-400 border-green-500/30' 
                      : suggestion.confidence >= 40
                      ? 'text-yellow-400 border-yellow-500/30'
                      : 'text-orange-400 border-orange-500/30'
                  }`}
                >
                  {suggestion.confidence}% confidence
                </Badge>
                {currentCategory === suggestion.category && (
                  <Badge variant="outline" className="text-xs text-violet-400 border-violet-500/30">
                    Current
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-400">
                {suggestion.reasons.slice(0, 2).join(', ')}
                {suggestion.reasons.length > 2 && ` +${suggestion.reasons.length - 2} more`}
              </div>
            </div>
            
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSelectCategory(suggestion.category)}
              disabled={currentCategory === suggestion.category}
              className="ml-3 text-xs"
            >
              {currentCategory === suggestion.category ? 'Selected' : 'Apply'}
            </Button>
          </div>
        ))}
      </div>
      
      {suggestions.length > 0 && (
        <div className="text-xs text-gray-500">
          💡 Suggestions are based on content analysis and existing tags. Click "Apply" to use a suggestion.
        </div>
      )}
    </div>
  )
}