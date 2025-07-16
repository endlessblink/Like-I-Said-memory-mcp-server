/**
 * Claude-Historian Inspired Features
 * Adapts patterns from claude-historian for enhanced search and analysis
 */

export class QueryAnalyzer {
  constructor() {
    // Intent patterns adapted from claude-historian
    this.intentPatterns = {
      error: [
        /\b(?:error|exception|fail|crash|bug|issue|problem|broken)\b/i,
        /\b(?:not working|doesn't work|won't work)\b/i,
        /\b(?:troubleshoot|debug|fix)\b/i
      ],
      feature: [
        /\b(?:feature|functionality|implement|add|create)\b/i,
        /\b(?:how to|how do|can I|is it possible)\b/i,
        /\b(?:new|enhancement|improvement)\b/i
      ],
      fix: [
        /\b(?:fix|solve|resolve|repair|correct)\b/i,
        /\b(?:solution|workaround|patch)\b/i,
        /\b(?:working|fixed|resolved|solved)\b/i
      ],
      documentation: [
        /\b(?:document|docs|documentation|readme)\b/i,
        /\b(?:explain|understand|clarify|meaning)\b/i,
        /\b(?:what is|what does|purpose of)\b/i
      ],
      configuration: [
        /\b(?:config|configuration|setup|install|deploy)\b/i,
        /\b(?:settings|options|parameters)\b/i,
        /\b(?:environment|env|variables)\b/i
      ],
      performance: [
        /\b(?:performance|speed|slow|fast|optimize)\b/i,
        /\b(?:memory|cpu|load|latency)\b/i,
        /\b(?:efficiency|benchmark|profile)\b/i
      ],
      testing: [
        /\b(?:test|testing|spec|unit|integration)\b/i,
        /\b(?:verify|validate|check|ensure)\b/i,
        /\b(?:mock|stub|assertion)\b/i
      ],
      deployment: [
        /\b(?:deploy|deployment|production|staging)\b/i,
        /\b(?:build|compile|package|release)\b/i,
        /\b(?:server|hosting|cloud|container)\b/i
      ]
    };
    
    // Common words to filter out from keyword extraction
    this.stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was',
      'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
      'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what',
      'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
      'some', 'any', 'many', 'much', 'more', 'most', 'other', 'another', 'such',
      'no', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just',
      'but', 'for', 'with', 'about', 'from', 'into', 'through', 'during',
      'before', 'after', 'above', 'below', 'up', 'down', 'out', 'off', 'over',
      'under', 'again', 'further', 'then', 'once'
    ]);
  }
  
  /**
   * Analyze query intent (adapted from claude-historian)
   */
  analyzeQueryIntent(query) {
    const lowerQuery = query.toLowerCase();
    const detectedIntents = [];
    const keywords = this.extractKeywords(query);
    
    // Check each intent pattern
    for (const [intent, patterns] of Object.entries(this.intentPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerQuery)) {
          detectedIntents.push(intent);
          break; // Only count each intent once
        }
      }
    }
    
    // Primary intent is the first detected, or 'general' if none
    const primaryIntent = detectedIntents[0] || 'general';
    
    return {
      intent: primaryIntent,
      allIntents: detectedIntents,
      keywords,
      needsExpansion: this.shouldExpandQuery(lowerQuery, detectedIntents),
      confidence: this.calculateIntentConfidence(detectedIntents, keywords)
    };
  }
  
  /**
   * Extract meaningful keywords from query
   */
  extractKeywords(query) {
    // Split and clean
    const words = query.toLowerCase()
      .replace(/[^\w\s-]/g, ' ') // Remove punctuation except hyphens
      .split(/\s+/)
      .filter(word => word.length > 2)
      .filter(word => !this.stopWords.has(word));
    
    // Extract technical terms (CamelCase, acronyms, etc.)
    const technicalTerms = query.match(/\b[A-Z][a-zA-Z]*(?:[A-Z][a-z]*)*\b/g) || [];
    const acronyms = query.match(/\b[A-Z]{2,}\b/g) || [];
    
    // Combine and dedupe
    const allKeywords = [...words, ...technicalTerms.map(t => t.toLowerCase()), ...acronyms.map(a => a.toLowerCase())];
    return [...new Set(allKeywords)].slice(0, 10); // Limit to top 10
  }
  
  /**
   * Determine if query should be expanded
   */
  shouldExpandQuery(query, intents) {
    // Expand if:
    // - Query is very short (< 3 words)
    // - Has clear intent but limited keywords
    // - Contains technical terms that might have synonyms
    
    const wordCount = query.split(/\s+/).length;
    const hasTechnicalTerms = /\b(?:api|sdk|cli|gui|ui|db|sql|json|xml|html|css|js|ts|py|java|go|rust)\b/i.test(query);
    
    return wordCount < 3 || (intents.length > 0 && wordCount < 5) || hasTechnicalTerms;
  }
  
  /**
   * Calculate confidence in intent detection
   */
  calculateIntentConfidence(intents, keywords) {
    if (intents.length === 0) return 0.1;
    if (intents.length === 1 && keywords.length >= 2) return 0.8;
    if (intents.length === 1) return 0.6;
    if (intents.length === 2) return 0.7;
    return 0.5; // Multiple intents = less confidence
  }
  
  /**
   * Expand query intelligently (adapted from claude-historian)
   * Only adds ONE highly relevant term to avoid search dilution
   */
  expandQueryIntelligently(originalQuery, analysis) {
    const { intent, keywords } = analysis;
    
    // Intent-specific expansions
    const expansions = {
      error: ['issue', 'problem', 'debugging', 'troubleshooting'],
      fix: ['solution', 'workaround', 'resolved', 'working'],
      feature: ['implementation', 'functionality', 'capability'],
      documentation: ['guide', 'tutorial', 'explanation', 'reference'],
      configuration: ['setup', 'settings', 'installation', 'deployment'],
      performance: ['optimization', 'speed', 'efficiency', 'benchmark'],
      testing: ['validation', 'verification', 'quality', 'assertion'],
      deployment: ['production', 'release', 'distribution', 'packaging']
    };
    
    const possibleExpansions = expansions[intent] || [];
    
    // Find expansion term that's not already in the query
    const lowerQuery = originalQuery.toLowerCase();
    const newTerm = possibleExpansions.find(term => 
      !lowerQuery.includes(term) && 
      !keywords.some(keyword => keyword.includes(term) || term.includes(keyword))
    );
    
    // Only add ONE term to avoid query dilution
    if (newTerm) {
      return `${originalQuery} ${newTerm}`;
    }
    
    return originalQuery;
  }
}

export class RelevanceScorer {
  constructor() {
    // Time decay factors (adapted from claude-historian)
    this.timeDecayFactors = {
      today: 5,      // Last 24 hours
      week: 3,       // Last 7 days  
      month: 2,      // Last 30 days
      older: 1       // Older than 30 days
    };
  }
  
  /**
   * Calculate time-weighted relevance score
   */
  calculateTimeDecay(timestamp) {
    const now = Date.now();
    const ageMs = now - new Date(timestamp).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    if (ageDays <= 1) return this.timeDecayFactors.today;
    if (ageDays <= 7) return this.timeDecayFactors.week;
    if (ageDays <= 30) return this.timeDecayFactors.month;
    return this.timeDecayFactors.older;
  }
  
  /**
   * Calculate content richness score
   */
  calculateContentScore(memory, query) {
    let score = 0;
    const content = memory.content.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    // Exact query match bonus
    if (content.includes(queryLower)) {
      score += 10;
    }
    
    // Word overlap scoring
    const matchedWords = queryWords.filter(word => content.includes(word));
    score += matchedWords.length * 2;
    
    // Content type bonuses
    if (memory.metadata?.hasCode) score += 3;
    if (memory.metadata?.hasFiles) score += 2;
    if (memory.metadata?.hasTools) score += 2;
    if (memory.metadata?.hasErrors && /error|fix|debug/.test(queryLower)) score += 4;
    
    // Priority bonus
    if (memory.priority === 'high') score += 3;
    if (memory.priority === 'medium') score += 1;
    
    // Category relevance
    if (memory.category && queryLower.includes(memory.category)) score += 2;
    
    // Tag relevance
    if (memory.tags) {
      const tagMatches = memory.tags.filter(tag => 
        queryWords.some(word => tag.toLowerCase().includes(word))
      );
      score += tagMatches.length;
    }
    
    return score;
  }
  
  /**
   * Calculate final relevance score combining content and time
   */
  calculateFinalScore(memory, query) {
    const contentScore = this.calculateContentScore(memory, query);
    const timeDecay = this.calculateTimeDecay(memory.created || memory.timestamp);
    
    // Combine scores with time weighting
    return Math.round(contentScore * timeDecay * 10) / 10; // Round to 1 decimal
  }
  
  /**
   * Rank memories by relevance
   */
  rankMemories(memories, query) {
    return memories
      .map(memory => ({
        ...memory,
        relevanceScore: this.calculateFinalScore(memory, query),
        timeDecay: this.calculateTimeDecay(memory.created || memory.timestamp)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }
}

export class ContentClassifier {
  constructor() {
    // Content detection patterns
    this.patterns = {
      files: /(?:\/[\w\/\-_.]+\.\w+|\w+\.\w+(?:\s|$))/g,
      tools: /\b(?:add_memory|search_memories|create_task|list_tasks|get_memory)\b/g,
      errors: /\b(?:error|exception|failed?|crash|bug|issue)\b/i,
      code: /```[\s\S]*?```|`[^`]+`/g,
      urls: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g,
      commands: /(?:npm|git|node|python|pip|curl|wget)\s+[\w\-]+/g
    };
  }
  
  /**
   * Classify memory content (adapted from claude-historian)
   */
  classifyContent(content) {
    const classification = {
      hasFiles: false,
      hasTools: false,
      hasErrors: false,
      hasCode: false,
      hasUrls: false,
      hasCommands: false,
      contentLength: content.length,
      extractedFiles: [],
      extractedTools: [],
      extractedUrls: [],
      extractedCommands: []
    };
    
    // Extract and classify content
    const fileMatches = content.match(this.patterns.files) || [];
    const toolMatches = content.match(this.patterns.tools) || [];
    const urlMatches = content.match(this.patterns.urls) || [];
    const commandMatches = content.match(this.patterns.commands) || [];
    
    classification.hasFiles = fileMatches.length > 0;
    classification.hasTools = toolMatches.length > 0;
    classification.hasErrors = this.patterns.errors.test(content);
    classification.hasCode = this.patterns.code.test(content);
    classification.hasUrls = urlMatches.length > 0;
    classification.hasCommands = commandMatches.length > 0;
    
    classification.extractedFiles = [...new Set(fileMatches)].slice(0, 10);
    classification.extractedTools = [...new Set(toolMatches)];
    classification.extractedUrls = [...new Set(urlMatches)].slice(0, 5);
    classification.extractedCommands = [...new Set(commandMatches)].slice(0, 5);
    
    return classification;
  }
}

export class CircuitBreaker {
  constructor(options = {}) {
    this.timeLimit = options.timeLimit || 30000; // 30 seconds
    this.memoryLimit = options.memoryLimit || 50000; // 50k items
    this.sizeLimit = options.sizeLimit || 100 * 1024; // 100KB per item
  }
  
  /**
   * Check if operation should be stopped
   */
  shouldBreak(startTime, itemCount, itemSize) {
    const elapsed = Date.now() - startTime;
    
    if (elapsed > this.timeLimit) {
      return { break: true, reason: 'Time limit exceeded' };
    }
    
    if (itemCount > this.memoryLimit) {
      return { break: true, reason: 'Memory limit exceeded' };
    }
    
    if (itemSize > this.sizeLimit) {
      return { break: true, reason: 'Item size limit exceeded' };
    }
    
    return { break: false };
  }
  
  /**
   * Execute operation with circuit breaker protection
   */
  async execute(operation, items = []) {
    const startTime = Date.now();
    const results = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemSize = JSON.stringify(item).length;
      
      // Check circuit breaker
      const breakCheck = this.shouldBreak(startTime, i, itemSize);
      if (breakCheck.break) {
        console.warn(`Circuit breaker triggered: ${breakCheck.reason}`);
        break;
      }
      
      try {
        const result = await operation(item);
        results.push(result);
      } catch (error) {
        console.error(`Operation failed for item ${i}:`, error);
        // Continue processing other items
      }
    }
    
    return results;
  }
}

export default {
  QueryAnalyzer,
  RelevanceScorer,
  ContentClassifier,
  CircuitBreaker
};