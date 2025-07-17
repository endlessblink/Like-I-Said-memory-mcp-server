/**
 * Conversation Monitor - System-level automatic memory detection
 * 
 * This module monitors all MCP conversations and automatically creates memories
 * when important patterns are detected, regardless of which client is used.
 */

import { EventEmitter } from 'events';

export class ConversationMonitor extends EventEmitter {
  constructor(storage, vectorStorage) {
    super();
    this.storage = storage;
    this.vectorStorage = vectorStorage;
    this.conversationBuffer = [];
    this.bufferMaxSize = 10; // Keep last 10 exchanges for context
    
    // Pattern definitions for important information
    this.importancePatterns = {
      solutions: [
        /(?:the )?(?:solution|answer|fix|workaround) (?:is|was|turned out to be)/i,
        /(?:finally )?(?:got|made) (?:it|this|that) (?:to )?work/i,
        /works? (?:perfectly|correctly|fine|now|with)/i,
        /fixed (?:by|with|using)/i,
        /solved (?:by|with|using)/i,
        /discovered (?:that|how)/i,
        /turns? out/i,
        /aha!|eureka!|got it!/i,
        /critical (?:difference|insight|discovery)/i,
        /key (?:was|is|finding|insight)/i,
        /important:?/i,
        /note:?/i,
        /remember:?/i,
        /fyi:?/i,
        /for future reference/i
      ],
      
      // Enhanced patterns for structured discoveries
      discoveries: [
        /🔍.*(?:critical|discovery|finding|insight)/i,
        /🎯.*(?:fix|solution|answer)/i,
        /💡.*(?:key|important|insight)/i,
        /⚠️.*(?:warning|issue|problem)/i,
        /(?:what.*reveals?|analysis shows?|looking at)/i,
        /(?:the real issue|root cause|key finding)/i,
        /(?:why it shows?|what's happening)/i,
        /(?:the fix|solution|next steps?)/i,
        /based on this analysis/i,
        /this (?:discovery|finding) changes everything/i,
        /(?:reveals?|shows?|indicates?) that/i
      ],
      
      configurations: [
        /(?:working|correct|proper) (?:configuration|config|setup)/i,
        /configured? (?:with|using|as)/i,
        /settings? (?:that work|should be)/i,
        /(?:use|using) .+ instead of/i,
        /did (?:not|NOT) (?:use|need)/i,
        /(?:simple|basic|direct) .+ (?:works?|implementation)/i
      ],
      
      errors: [
        /error (?:was|is) (?:caused by|due to)/i,
        /(?:fails?|failing) (?:because|when|with)/i,
        /(?:problem|issue) (?:was|is)/i,
        /root cause/i,
        /debugging (?:revealed|showed)/i
      ],
      
      technical: [
        /json-?rpc/i,
        /(?:fast)?mcp/i,
        /dxt/i,
        /std(?:in|out|io)/i,
        /(?:works?|working) (?:implementation|approach|method)/i,
        /(?:doesn't|does not|won't|will not) (?:work|handle)/i
      ]
    };
    
    // Scoring thresholds
    this.scoreThreshold = 3; // Minimum score to trigger memory creation
  }
  
  /**
   * Process a message exchange (user message + assistant response)
   */
  async processExchange(userMessage, assistantResponse, toolCalls = []) {
    // Add to conversation buffer
    this.conversationBuffer.push({
      timestamp: new Date(),
      user: userMessage,
      assistant: assistantResponse,
      tools: toolCalls
    });
    
    // Keep buffer size limited
    if (this.conversationBuffer.length > this.bufferMaxSize) {
      this.conversationBuffer.shift();
    }
    
    // Check if this exchange contains important information
    const importance = this.calculateImportance(userMessage, assistantResponse);
    
    if (importance.score >= this.scoreThreshold) {
      // Check if similar memory already exists
      const existingMemory = await this.checkForExistingMemory(importance.keywords);
      
      if (!existingMemory) {
        // Create memory automatically
        await this.createAutomaticMemory(userMessage, assistantResponse, importance);
      }
    }
  }
  
  /**
   * Calculate importance score for an exchange
   */
  calculateImportance(userMessage, assistantResponse) {
    let score = 0;
    const matchedPatterns = [];
    const keywords = new Set();
    
    const combinedText = `${userMessage} ${assistantResponse}`;
    
    // Check each pattern category with weighted scoring
    for (const [category, patterns] of Object.entries(this.importancePatterns)) {
      for (const pattern of patterns) {
        const matches = combinedText.match(pattern);
        if (matches) {
          // Weight scoring by category and number of matches
          const categoryWeight = {
            'discoveries': 4,    // Highest weight for structured discoveries
            'solutions': 3,      // High weight for solutions
            'configurations': 2, // Medium weight for configs
            'errors': 2,         // Medium weight for errors
            'technical': 1       // Lower weight for technical terms
          }[category] || 1;
          
          score += categoryWeight * matches.length;
          matchedPatterns.push({ 
            category, 
            pattern: pattern.source, 
            matches: matches.length,
            weight: categoryWeight 
          });
          
          // Extract keywords from matches
          matches.forEach(match => {
            if (match && match.length > 3) {
              keywords.add(match.toLowerCase());
            }
          });
        }
      }
    }
    
    // Enhanced content analysis
    if (combinedText.includes('```')) score += 2; // Contains code
    if (combinedText.match(/\d+\.\s+/g)) score += 1; // Contains numbered list
    if (combinedText.length > 500) score += 1; // Substantial content
    if (combinedText.length > 1500) score += 2; // Very detailed content
    
    // Emoji importance indicators
    const emojiIndicators = combinedText.match(/[🔍🎯💡⚠️✅❌]/g);
    if (emojiIndicators) {
      score += emojiIndicators.length; // Each emoji adds 1 point
    }
    
    // Structured analysis indicators
    if (combinedText.match(/(?:✅|❌).*(?:works?|fails?)/gi)) {
      score += 2; // Structured success/failure analysis
    }
    
    // Extract technical terms and acronyms
    const technicalTerms = combinedText.match(/\b[A-Z][a-zA-Z]*(?:[A-Z][a-z]*)*\b/g) || [];
    const acronyms = combinedText.match(/\b[A-Z]{2,}\b/g) || [];
    [...technicalTerms, ...acronyms].forEach(term => keywords.add(term.toLowerCase()));
    
    return {
      score,
      matchedPatterns,
      keywords: Array.from(keywords),
      category: this.determineCategory(matchedPatterns),
      analysis: {
        hasEmojis: emojiIndicators?.length || 0,
        hasCode: combinedText.includes('```'),
        isStructured: matchedPatterns.some(p => p.category === 'discoveries'),
        contentLength: combinedText.length
      }
    };
  }
  
  /**
   * Determine the most appropriate category for the memory
   */
  determineCategory(matchedPatterns) {
    const categoryCounts = {};
    
    matchedPatterns.forEach(({ category }) => {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    // Map pattern categories to memory categories
    const categoryMap = {
      solutions: 'code',
      configurations: 'code',
      errors: 'code',
      technical: 'research'
    };
    
    const topCategory = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    return categoryMap[topCategory] || 'work';
  }
  
  /**
   * Check if a similar memory already exists
   */
  async checkForExistingMemory(keywords) {
    try {
      // Search for memories with similar keywords
      for (const keyword of keywords.slice(0, 3)) { // Check top 3 keywords
        const results = await this.storage.searchMemories(keyword);
        if (results.length > 0) {
          // Check similarity with vector search if available
          if (this.vectorStorage && this.vectorStorage.initialized) {
            const similar = await this.vectorStorage.searchSimilar(
              keywords.join(' '), 
              'memory', 
              1
            );
            if (similar.length > 0 && similar[0].score < 0.3) {
              return true; // Very similar memory exists
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking for existing memory:', error);
    }
    
    return false;
  }
  
  /**
   * Create a memory automatically based on detected importance
   */
  async createAutomaticMemory(userMessage, assistantResponse, importance) {
    try {
      // Build memory content
      const content = this.buildMemoryContent(userMessage, assistantResponse, importance);
      
      // Determine project from context
      const project = this.extractProjectFromContext();
      
      // Create memory
      const memory = await this.storage.addMemory({
        content,
        category: importance.category,
        tags: [...importance.keywords.slice(0, 5), 'auto-captured'],
        priority: importance.score >= 5 ? 'high' : 'medium',
        project,
        metadata: {
          auto_created: true,
          importance_score: importance.score,
          patterns_matched: importance.matchedPatterns.length
        }
      });
      
      // Add to vector storage if available
      if (this.vectorStorage) {
        await this.vectorStorage.addMemory(memory);
      }
      
      // Emit event for logging/notification
      this.emit('memory-created', {
        memory,
        reason: 'Automatic capture of important information',
        patterns: importance.matchedPatterns
      });
      
      return memory;
    } catch (error) {
      console.error('Error creating automatic memory:', error);
      this.emit('error', error);
    }
  }
  
  /**
   * Build formatted memory content from conversation
   */
  buildMemoryContent(userMessage, assistantResponse, importance) {
    const timestamp = new Date().toISOString();
    const title = this.generateTitle(userMessage, assistantResponse, importance);
    
    let content = `## ${title}\n\n`;
    content += `*Auto-captured on ${timestamp}*\n\n`;
    
    // Add context from user message if relevant
    if (userMessage.length > 50) {
      content += `### Context\n${userMessage}\n\n`;
    }
    
    // Add the important information
    content += `### Key Information\n${assistantResponse}\n\n`;
    
    // Add pattern matches for transparency
    if (importance.matchedPatterns.length > 0) {
      content += `### Why This Was Saved\n`;
      content += `Detected patterns: ${importance.matchedPatterns.map(p => p.category).join(', ')}\n`;
      content += `Importance score: ${importance.score}\n`;
    }
    
    return content;
  }
  
  /**
   * Generate a concise title for the memory
   */
  generateTitle(userMessage, assistantResponse, importance) {
    // Try to extract a meaningful title from the content
    const combinedText = `${userMessage} ${assistantResponse}`;
    
    // Look for solution statements
    const solutionMatch = combinedText.match(/(?:solution|answer|fix) (?:is|was) ([^.!?]+)/i);
    if (solutionMatch) {
      return `Solution: ${solutionMatch[1].slice(0, 50)}`;
    }
    
    // Look for working configurations
    const workingMatch = combinedText.match(/(\w+) (?:works?|working) (?:with|when|using) ([^.!?]+)/i);
    if (workingMatch) {
      return `${workingMatch[1]} Working Configuration`;
    }
    
    // Look for error discoveries
    const errorMatch = combinedText.match(/(?:error|problem|issue) (?:was|is) ([^.!?]+)/i);
    if (errorMatch) {
      return `Issue: ${errorMatch[1].slice(0, 50)}`;
    }
    
    // Default: use keywords
    return `Discovery: ${importance.keywords.slice(0, 3).join(', ')}`;
  }
  
  /**
   * Extract project context from recent conversation
   */
  extractProjectFromContext() {
    // Look through recent buffer for project mentions
    for (let i = this.conversationBuffer.length - 1; i >= 0; i--) {
      const exchange = this.conversationBuffer[i];
      
      // Check tool calls for project parameters
      for (const tool of exchange.tools || []) {
        if (tool.args?.project) {
          return tool.args.project;
        }
      }
      
      // Check for project mentions in text
      const projectMatch = exchange.user.match(/project[:\s]+([a-zA-Z0-9-_]+)/i) ||
                          exchange.assistant.match(/project[:\s]+([a-zA-Z0-9-_]+)/i);
      if (projectMatch) {
        return projectMatch[1];
      }
    }
    
    return 'default';
  }
  
  /**
   * Process search results to suggest memory creation
   */
  async processSearchResults(query, results, project) {
    if (results.length === 0) {
      // Check if the query seems important
      const importance = this.calculateImportance(query, '');
      
      if (importance.score >= 2 || query.split(' ').length >= 3) {
        // Return suggestion to create memory
        return {
          suggestion: true,
          message: `No memories found for "${query}". This seems like it might be important information. Would you like to save it as a memory?`,
          proposedMemory: {
            content: query,
            tags: importance.keywords,
            category: importance.category || 'research',
            project: project || 'default'
          }
        };
      }
    }
    
    return { suggestion: false };
  }
}

export default ConversationMonitor;