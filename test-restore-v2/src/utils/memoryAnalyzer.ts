// Smart Memory Content Analyzer

export interface ContentAnalysis {
  contentType: 'text' | 'code' | 'structured'
  suggestedCategory: string | null
  suggestedTags: string[]
  suggestedPriority: 'low' | 'medium' | 'high'
  title: string | null
  summary: string | null
  language?: string // for code content
  confidence: number // 0-1 score
}

export interface CategoryPattern {
  category: string
  keywords: string[]
  patterns: RegExp[]
  weight: number
}

export interface TagPattern {
  tag: string
  patterns: RegExp[]
  weight: number
}

// Category detection patterns
const CATEGORY_PATTERNS: CategoryPattern[] = [
  {
    category: 'work',
    keywords: ['meeting', 'client', 'project', 'deadline', 'sprint', 'standup', 'review', 'business'],
    patterns: [
      /\b(meeting|attendees|action items?|agenda|client|deadline|sprint|standup|scrum)\b/i,
      /\b(quarterly|q[1-4]|revenue|budget|roi|kpi|metrics)\b/i
    ],
    weight: 1.0
  },
  {
    category: 'code',
    keywords: ['function', 'class', 'bug', 'fix', 'error', 'debug', 'api', 'database'],
    patterns: [
      /\b(function|class|const|let|var|import|export|if|else|for|while)\b/,
      /\b(bug|error|exception|debug|fix|issue|patch)\b/i,
      /\b(api|endpoint|database|query|schema|migration)\b/i,
      /```[\s\S]*?```/,
      /`[^`]+`/
    ],
    weight: 1.2
  },
  {
    category: 'research',
    keywords: ['study', 'research', 'analysis', 'findings', 'hypothesis', 'experiment'],
    patterns: [
      /\b(research|study|analysis|findings|hypothesis|experiment|survey|data)\b/i,
      /\b(conclusion|methodology|results|abstract|references?)\b/i,
      /\b(according to|studies show|research indicates)\b/i
    ],
    weight: 1.0
  },
  {
    category: 'personal',
    keywords: ['personal', 'reminder', 'todo', 'note', 'idea', 'thought'],
    patterns: [
      /\b(personal|private|reminder|todo|note|idea|thought|journal)\b/i,
      /\b(remember to|don't forget|need to)\b/i
    ],
    weight: 0.8
  },
  {
    category: 'conversations',
    keywords: ['conversation', 'discussion', 'chat', 'call', 'talk'],
    patterns: [
      /\b(conversation|discussion|chat|call|talk|spoke with|talked to)\b/i,
      /\b(said|mentioned|suggested|agreed|disagreed)\b/i,
      /^[A-Za-z\s]+:\s/m // Speaker format "John: Hello"
    ],
    weight: 1.0
  }
]

// Tag detection patterns
const TAG_PATTERNS: TagPattern[] = [
  { tag: 'urgent', patterns: [/\b(urgent|asap|critical|emergency|immediate)\b/i], weight: 1.0 },
  { tag: 'important', patterns: [/\b(important|crucial|vital|key|essential)\b/i], weight: 0.8 },
  { tag: 'todo', patterns: [/\b(todo|task|action item|need to|should)\b/i, /- \[ \]/], weight: 0.9 },
  { tag: 'meeting', patterns: [/\b(meeting|standup|scrum|review|sync)\b/i], weight: 1.0 },
  { tag: 'bug', patterns: [/\b(bug|error|issue|problem|broken)\b/i], weight: 1.0 },
  { tag: 'feature', patterns: [/\b(feature|enhancement|improvement|new)\b/i], weight: 0.8 },
  { tag: 'api', patterns: [/\b(api|endpoint|rest|graphql|webhook)\b/i], weight: 1.0 },
  { tag: 'database', patterns: [/\b(database|db|sql|query|table|schema)\b/i], weight: 1.0 },
  { tag: 'frontend', patterns: [/\b(frontend|ui|ux|react|vue|angular|css|html)\b/i], weight: 0.9 },
  { tag: 'backend', patterns: [/\b(backend|server|node|python|java|api)\b/i], weight: 0.9 },
  { tag: 'documentation', patterns: [/\b(docs|documentation|readme|guide|tutorial)\b/i], weight: 0.8 },
  { tag: 'security', patterns: [/\b(security|auth|authentication|authorization|vulnerability)\b/i], weight: 1.0 },
  { tag: 'performance', patterns: [/\b(performance|optimization|speed|slow|fast|cache)\b/i], weight: 0.9 },
  { tag: 'testing', patterns: [/\b(test|testing|spec|unit|integration|e2e)\b/i], weight: 0.9 }
]

// Programming language detection
const LANGUAGE_PATTERNS: { [key: string]: RegExp[] } = {
  javascript: [
    /\b(const|let|var|function|=>|import|export|require)\b/,
    /\.(js|jsx|ts|tsx)$/,
    /console\.log|document\.|window\./
  ],
  python: [
    /\b(def|class|import|from|if __name__|print\()\b/,
    /\.py$/,
    /^\s*(def|class|import|from)\s/m
  ],
  java: [
    /\b(public|private|class|interface|extends|implements)\b/,
    /\.java$/,
    /System\.out\.println/
  ],
  go: [
    /\b(func|package|import|var|const|type|interface)\b/,
    /\.go$/,
    /fmt\.Print/
  ],
  rust: [
    /\b(fn|let|mut|struct|enum|impl|trait)\b/,
    /\.rs$/,
    /println!/
  ],
  sql: [
    /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i,
    /\.sql$/,
    /FROM|WHERE|JOIN|GROUP BY|ORDER BY/i
  ]
}

export function analyzeContent(content: string): ContentAnalysis {
  const text = content.trim()
  if (!text) {
    return {
      contentType: 'text',
      suggestedCategory: null,
      suggestedTags: [],
      suggestedPriority: 'medium',
      title: null,
      summary: null,
      confidence: 0
    }
  }

  const analysis: ContentAnalysis = {
    contentType: detectContentType(text),
    suggestedCategory: detectCategory(text),
    suggestedTags: detectTags(text),
    suggestedPriority: detectPriority(text),
    title: extractTitle(text),
    summary: extractSummary(text),
    confidence: 0
  }

  // Detect programming language for code content
  if (analysis.contentType === 'code') {
    analysis.language = detectLanguage(text)
  }

  // Calculate confidence score
  analysis.confidence = calculateConfidence(text, analysis)

  return analysis
}

function detectContentType(text: string): 'text' | 'code' | 'structured' {
  // Check for code blocks
  if (text.includes('```') || text.match(/^```/m)) {
    return 'code'
  }

  // Check for inline code
  const inlineCodeCount = (text.match(/`[^`]+`/g) || []).length
  if (inlineCodeCount > 2) {
    return 'code'
  }

  // Check for programming keywords
  const codeKeywords = ['function', 'const', 'let', 'var', 'class', 'import', 'export', 'def', 'public', 'private']
  const codeKeywordCount = codeKeywords.filter(keyword => 
    new RegExp(`\\b${keyword}\\b`, 'i').test(text)
  ).length

  if (codeKeywordCount > 2) {
    return 'code'
  }

  // Check for structured content
  const structuredIndicators = [
    /^#{1,6}\s/m, // Markdown headers
    /^[-*+]\s/m, // Lists
    /^(\d+\.)\s/m, // Numbered lists
    /^- \[[ x]\]/m, // Checkboxes
    /^\|.*\|/m, // Tables
    /^>.*$/m, // Blockquotes
  ]

  const structuredCount = structuredIndicators.filter(pattern => pattern.test(text)).length
  if (structuredCount > 1) {
    return 'structured'
  }

  // Check for multiple sections/paragraphs
  const paragraphs = text.split('\n\n').filter(p => p.trim().length > 20)
  if (paragraphs.length > 2 && text.includes('\n\n')) {
    return 'structured'
  }

  return 'text'
}

function detectCategory(text: string): string | null {
  const scores: { [category: string]: number } = {}
  const lowerText = text.toLowerCase()

  for (const pattern of CATEGORY_PATTERNS) {
    let score = 0

    // Check keywords
    for (const keyword of pattern.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = lowerText.match(regex) || []
      score += matches.length * 0.5
    }

    // Check patterns
    for (const regex of pattern.patterns) {
      const matches = text.match(regex) || []
      score += matches.length * 1.0
    }

    // Apply category weight
    score *= pattern.weight

    if (score > 0) {
      scores[pattern.category] = (scores[pattern.category] || 0) + score
    }
  }

  // Return category with highest score, if above threshold
  const entries = Object.entries(scores).sort(([,a], [,b]) => b - a)
  const topScore = entries[0]?.[1] || 0
  
  return topScore > 1.0 ? entries[0][0] : null
}

function detectTags(text: string): string[] {
  const tags = new Set<string>()
  const lowerText = text.toLowerCase()

  // Extract hashtags
  const hashtagMatches = text.match(/#(\w+)/g) || []
  hashtagMatches.forEach(match => tags.add(match.substring(1).toLowerCase()))

  // Pattern-based tag detection
  for (const tagPattern of TAG_PATTERNS) {
    let score = 0
    
    for (const pattern of tagPattern.patterns) {
      const matches = text.match(pattern) || []
      score += matches.length * tagPattern.weight
    }

    if (score >= 1.0) {
      tags.add(tagPattern.tag)
    }
  }

  // Content-specific tags
  if (text.includes('TODO') || text.includes('FIXME')) {
    tags.add('todo')
  }

  if (text.match(/\b(note|reminder|remember)\b/i)) {
    tags.add('note')
  }

  // Priority indicators
  if (text.match(/\b(urgent|asap|critical)\b/i)) {
    tags.add('urgent')
  }

  return Array.from(tags).slice(0, 8) // Limit to 8 tags
}

function detectPriority(text: string): 'low' | 'medium' | 'high' {
  const lowerText = text.toLowerCase()

  // High priority indicators
  if (lowerText.match(/\b(urgent|asap|critical|emergency|immediate|deadline|tomorrow)\b/)) {
    return 'high'
  }

  // Low priority indicators  
  if (lowerText.match(/\b(someday|maybe|nice to have|optional|when time permits)\b/)) {
    return 'low'
  }

  // Medium priority indicators or default
  return 'medium'
}

function detectLanguage(text: string): string | undefined {
  for (const [language, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    let score = 0
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        score++
      }
    }
    if (score >= 2) {
      return language
    }
  }
  return undefined
}

function extractTitle(text: string): string | null {
  const lines = text.split('\n').filter(line => line.trim())
  
  // Check for markdown headers
  const headerMatch = text.match(/^#{1,6}\s+(.+)$/m)
  if (headerMatch) {
    return headerMatch[1].trim()
  }

  // Check for first non-empty line
  const firstLine = lines[0]?.trim()
  if (firstLine && firstLine.length > 5 && firstLine.length < 100) {
    // Avoid using lines that look like code or have special formatting
    if (!firstLine.match(/^[\[\{]/) && !firstLine.includes('()') && !firstLine.startsWith('//')) {
      return firstLine
    }
  }

  return null
}

function extractSummary(text: string): string | null {
  // Remove markdown headers and code blocks
  const cleanText = text
    .replace(/^#{1,6}\s+.*$/gm, '') // Headers
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/`[^`]+`/g, '') // Inline code
    .trim()

  if (!cleanText) return null

  // Get first few sentences
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 10)
  if (sentences.length === 0) return null

  const summary = sentences.slice(0, 2).join('. ').trim()
  
  if (summary.length < 20) {
    // If too short, take more content
    const words = cleanText.split(/\s+/).slice(0, 25)
    return words.join(' ') + (cleanText.split(/\s+/).length > 25 ? '...' : '')
  }

  return summary.length > 150 ? summary.substring(0, 147) + '...' : summary
}

function calculateConfidence(text: string, analysis: ContentAnalysis): number {
  let confidence = 0.5 // Base confidence

  // Content type confidence
  if (analysis.contentType === 'code' && (text.includes('```') || text.includes('function'))) {
    confidence += 0.2
  } else if (analysis.contentType === 'structured' && text.includes('#')) {
    confidence += 0.15
  }

  // Category confidence
  if (analysis.suggestedCategory) {
    confidence += 0.15
  }

  // Tags confidence
  if (analysis.suggestedTags.length > 0) {
    confidence += Math.min(analysis.suggestedTags.length * 0.05, 0.2)
  }

  // Title extraction confidence
  if (analysis.title) {
    confidence += 0.1
  }

  return Math.min(confidence, 1.0)
}

// Utility function for template variable replacement
export function applyTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`
    result = result.replaceAll(placeholder, value)
  }

  // Replace any remaining placeholders with defaults
  result = result.replace(/{{(\w+)}}/g, (match, key) => {
    const defaults: Record<string, string> = {
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      title: 'Title',
      topic: 'Topic',
      language: 'javascript'
    }
    return defaults[key] || match
  })

  return result
}