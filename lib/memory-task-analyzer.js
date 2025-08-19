/**
 * MemoryTaskAnalyzer - Analyzes memory content to determine task-related actions
 * 
 * This module is responsible for:
 * - Pattern detection in memory content
 * - Extracting task-related information
 * - Determining appropriate task actions
 * - Calculating confidence scores
 */

class MemoryTaskAnalyzer {
  constructor() {
    // Task creation patterns with their confidence weights
    this.creationPatterns = [
      { pattern: /\b(i need to|need to)\s+(.+)/i, weight: 0.9, captureGroup: 2 },
      { pattern: /\b(todo|task):\s*(.+)/i, weight: 0.95, captureGroup: 2 },
      { pattern: /\b(should|must|have to)\s+(.+)/i, weight: 0.8, captureGroup: 2 },
      { pattern: /\b(plan to|planning to)\s+(.+)/i, weight: 0.85, captureGroup: 2 },
      { pattern: /\b(bug|fix|issue):\s*(.+)/i, weight: 0.9, captureGroup: 2 },
      { pattern: /\b(feature|implement|add):\s*(.+)/i, weight: 0.9, captureGroup: 2 },
      { pattern: /\b(investigate|research|explore)\s+(.+)/i, weight: 0.85, captureGroup: 2 },
      { pattern: /\b(reminder|remember to)\s+(.+)/i, weight: 0.8, captureGroup: 2 }
    ];

    // Task update patterns
    this.updatePatterns = [
      { pattern: /\b(working on|started|implementing)\s+(.+)/i, status: 'in_progress', weight: 0.9 },
      { pattern: /\b(made progress on|partially completed)\s+(.+)/i, status: 'in_progress', weight: 0.85 },
      { pattern: /\b(continuing|resumed)\s+(.+)/i, status: 'in_progress', weight: 0.8 },
      { pattern: /\b(debugging|fixing|troubleshooting)\s+(.+)/i, status: 'in_progress', weight: 0.85 },
      { pattern: /\b(testing|reviewing)\s+(.+)/i, status: 'in_progress', weight: 0.8 }
    ];

    // Task completion patterns
    this.completionPatterns = [
      { pattern: /\b(completed|finished|done with)\s+(.+)/i, weight: 0.95 },
      { pattern: /\b(successfully|resolved|fixed)\s+(.+)/i, weight: 0.9 },
      { pattern: /\b(deployed|released|shipped)\s+(.+)/i, weight: 0.95 },
      { pattern: /\b(closed|merged)\s+(.+)/i, weight: 0.85 },
      { pattern: /\b(task|todo).*\s+(done|complete)/i, weight: 0.9 }
    ];

    // Task blocking patterns
    this.blockingPatterns = [
      { pattern: /\b(blocked by|waiting for)\s+(.+)/i, weight: 0.9, reasonGroup: 2 },
      { pattern: /\b(can't proceed|stuck on)\s+(.+)/i, weight: 0.85, reasonGroup: 2 },
      { pattern: /\b(need help with|requires)\s+(.+)/i, weight: 0.8, reasonGroup: 2 },
      { pattern: /\b(dependent on|depends on)\s+(.+)/i, weight: 0.85, reasonGroup: 2 }
    ];

    // Priority indicators
    this.priorityIndicators = {
      urgent: [/\b(urgent|asap|critical|immediately|emergency)\b/i, /\b(high priority|top priority)\b/i],
      high: [/\b(important|priority|must have|essential)\b/i, /\b(deadline|due date)\b/i],
      medium: [/\b(should|would be nice|moderate)\b/i, /\b(normal|standard)\b/i],
      low: [/\b(nice to have|eventually|someday|minor)\b/i, /\b(low priority|backlog)\b/i]
    };

    // Category inference patterns
    this.categoryPatterns = {
      code: [/\b(code|implement|function|class|api|endpoint|refactor|debug|test)\b/i],
      bug: [/\b(bug|fix|error|issue|problem|crash|broken)\b/i],
      feature: [/\b(feature|enhancement|improve|add|new functionality)\b/i],
      documentation: [/\b(document|docs|readme|wiki|comment|explain)\b/i],
      research: [/\b(research|investigate|explore|analyze|study|understand)\b/i],
      design: [/\b(design|ui|ux|interface|layout|mockup|wireframe)\b/i],
      infrastructure: [/\b(deploy|server|database|infrastructure|devops|ci\/cd)\b/i]
    };
  }

  /**
   * Main analysis method - analyzes memory content for task-related patterns
   * @param {Object} memory - The memory object to analyze
   * @returns {Object} Analysis result with action, confidence, and extracted data
   */
  async analyzeContent(memory) {
    const content = memory.content.toLowerCase();
    const results = [];

    // Check for task creation patterns
    for (const pattern of this.creationPatterns) {
      const match = content.match(pattern.pattern);
      if (match) {
        const title = this.cleanExtractedText(match[pattern.captureGroup]);
        results.push({
          action: 'create',
          confidence: pattern.weight,
          extractedData: {
            title,
            description: this.extractDescription(memory.content, title),
            priority: this.inferPriority(memory.content),
            category: this.inferCategory(memory.content),
            status: 'todo'
          }
        });
      }
    }

    // Check for task update patterns
    for (const pattern of this.updatePatterns) {
      const match = content.match(pattern.pattern);
      if (match) {
        results.push({
          action: 'update',
          confidence: pattern.weight,
          extractedData: {
            status: pattern.status,
            progressNote: match[0]
          }
        });
      }
    }

    // Check for task completion patterns
    for (const pattern of this.completionPatterns) {
      const match = content.match(pattern.pattern);
      if (match) {
        results.push({
          action: 'complete',
          confidence: pattern.weight,
          extractedData: {
            completionNote: match[0]
          }
        });
      }
    }

    // Check for task blocking patterns
    for (const pattern of this.blockingPatterns) {
      const match = content.match(pattern.pattern);
      if (match) {
        results.push({
          action: 'block',
          confidence: pattern.weight,
          extractedData: {
            status: 'blocked',
            blockingReason: match[pattern.reasonGroup] || match[0]
          }
        });
      }
    }

    // Return the highest confidence result
    if (results.length === 0) {
      return { action: null, confidence: 0, extractedData: {} };
    }

    return results.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
  }

  /**
   * Extract task context from memory
   * @param {Object} memory - The memory object
   * @returns {Object} Task context including project, tags, etc.
   */
  extractTaskContext(memory) {
    return {
      project: memory.project || 'default',
      category: this.inferTaskCategory(memory),
      tags: this.extractTaskTags(memory),
      deadline: this.extractDeadline(memory.content),
      relatedMemories: [memory.id]
    };
  }

  /**
   * Clean extracted text to create a proper task title
   * @param {string} text - Raw extracted text
   * @returns {string} Cleaned task title
   */
  cleanExtractedText(text) {
    return text
      .trim()
      .replace(/[.!?]+$/, '') // Remove trailing punctuation
      .replace(/^(to|that|the)\s+/i, '') // Remove common starting words
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 200); // Limit length
  }

  /**
   * Extract a more detailed description from the memory content
   * @param {string} content - Full memory content
   * @param {string} title - Extracted task title
   * @returns {string} Task description
   */
  extractDescription(content, title) {
    // Find sentences around the title mention
    const sentences = content.split(/[.!?]+/);
    const relevantSentences = sentences.filter(s => 
      s.toLowerCase().includes(title.toLowerCase().substring(0, 20))
    );
    
    return relevantSentences.join('. ').trim() || title;
  }

  /**
   * Infer task priority from memory content
   * @param {string} content - Memory content
   * @returns {string} Priority level
   */
  inferPriority(content) {
    const lowerContent = content.toLowerCase();
    
    for (const [priority, patterns] of Object.entries(this.priorityIndicators)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerContent)) {
          return priority;
        }
      }
    }
    
    return 'medium'; // Default priority
  }

  /**
   * Infer task category from memory content
   * @param {string} content - Memory content
   * @returns {string} Task category
   */
  inferCategory(content) {
    const lowerContent = content.toLowerCase();
    const scores = {};
    
    for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
      scores[category] = 0;
      for (const pattern of patterns) {
        if (pattern.test(lowerContent)) {
          scores[category]++;
        }
      }
    }
    
    // Return category with highest score
    const bestCategory = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)[0];
    
    return bestCategory[1] > 0 ? bestCategory[0] : 'general';
  }

  /**
   * Infer task category from memory object
   * @param {Object} memory - Memory object
   * @returns {string} Task category
   */
  inferTaskCategory(memory) {
    // First check memory's own category
    if (memory.category && memory.category !== 'general') {
      return memory.category;
    }
    
    // Then infer from content
    return this.inferCategory(memory.content);
  }

  /**
   * Extract task-relevant tags from memory
   * @param {Object} memory - Memory object
   * @returns {Array} Task tags
   */
  extractTaskTags(memory) {
    const tags = [...(memory.tags || [])];
    const content = memory.content.toLowerCase();
    
    // Add tags based on content patterns
    if (/\b(bug|fix|error)\b/i.test(content)) tags.push('bug');
    if (/\b(feature|enhancement)\b/i.test(content)) tags.push('feature');
    if (/\b(test|testing)\b/i.test(content)) tags.push('testing');
    if (/\b(urgent|asap|critical)\b/i.test(content)) tags.push('urgent');
    
    // Remove duplicates
    return [...new Set(tags)];
  }

  /**
   * Extract deadline from memory content
   * @param {string} content - Memory content
   * @returns {string|null} ISO date string or null
   */
  extractDeadline(content) {
    // Common deadline patterns
    const patterns = [
      /\b(due|deadline|by|before)\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\b/i,
      /\b(due|deadline|by|before)\s+(tomorrow|today|next week|next month)\b/i,
      /\b(end of|by end of)\s+(day|week|month|year)\b/i
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        return this.parseDeadlineText(match[2] || match[0]);
      }
    }
    
    return null;
  }

  /**
   * Parse deadline text into ISO date
   * @param {string} text - Deadline text
   * @returns {string|null} ISO date string or null
   */
  parseDeadlineText(text) {
    const now = new Date();
    const lower = text.toLowerCase();
    
    // Handle relative dates
    if (lower.includes('today')) {
      return now.toISOString();
    } else if (lower.includes('tomorrow')) {
      now.setDate(now.getDate() + 1);
      return now.toISOString();
    } else if (lower.includes('next week')) {
      now.setDate(now.getDate() + 7);
      return now.toISOString();
    } else if (lower.includes('next month')) {
      now.setMonth(now.getMonth() + 1);
      return now.toISOString();
    } else if (lower.includes('end of day')) {
      now.setHours(23, 59, 59);
      return now.toISOString();
    } else if (lower.includes('end of week')) {
      const daysUntilSunday = 7 - now.getDay();
      now.setDate(now.getDate() + daysUntilSunday);
      return now.toISOString();
    }
    
    // Try to parse as date
    try {
      const date = new Date(text);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    } catch (e) {
      // Invalid date
    }
    
    return null;
  }

  /**
   * Calculate overall confidence for the analysis
   * @param {Object} analysis - Analysis result
   * @param {Object} memory - Memory object
   * @returns {number} Adjusted confidence score
   */
  calculateConfidence(analysis, memory) {
    let confidence = analysis.confidence || 0;
    
    // Boost confidence based on memory metadata
    if (memory.category === 'work' || memory.category === 'code') {
      confidence *= 1.1;
    }
    
    if (memory.priority === 'high' || memory.priority === 'urgent') {
      confidence *= 1.05;
    }
    
    // Reduce confidence for very short content
    if (memory.content.length < 50) {
      confidence *= 0.8;
    }
    
    // Cap at 1.0
    return Math.min(confidence, 1.0);
  }
}

export default MemoryTaskAnalyzer;