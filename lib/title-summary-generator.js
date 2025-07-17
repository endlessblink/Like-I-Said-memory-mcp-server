/**
 * Title and Summary Generator for Memory Cards
 * Generates concise, card-optimized titles and summaries for memories
 */

import { MemoryFormat } from './memory-format.js';
import { OllamaClient } from './ollama-client.js';

export class TitleSummaryGenerator {
  static ollamaClient = null;
  
  /**
   * Initialize Ollama client for local AI processing
   */
  static async initializeOllama(options = {}) {
    this.ollamaClient = new OllamaClient('http://localhost:11434', {
      model: options.model || 'llama3.1:8b',
      temperature: 0.1,
      batchSize: options.batchSize || 5,
      ...options
    });
    
    const available = await this.ollamaClient.isAvailable();
    if (!available) {
      console.warn('🤖 Ollama server not available - falling back to rule-based generation');
      this.ollamaClient = null;
      return false;
    }
    
    console.error(`🤖 Ollama client initialized with model: ${this.ollamaClient.options.model}`);
    return true;
  }
  
  /**
   * Enhance memory with local AI (Ollama)
   */
  static async enhanceWithOllama(content, metadata = {}) {
    if (!this.ollamaClient) {
      await this.initializeOllama();
    }
    
    if (!this.ollamaClient) {
      throw new Error('Ollama not available');
    }
    
    try {
      const enhancement = await this.ollamaClient.enhanceMemory(content, metadata);
      return enhancement;
    } catch (error) {
      console.error('Ollama enhancement failed:', error);
      throw error;
    }
  }
  
  /**
   * Batch enhance multiple memories with Ollama
   */
  static async batchEnhanceWithOllama(memories, onProgress = null) {
    if (!this.ollamaClient) {
      await this.initializeOllama();
    }
    
    if (!this.ollamaClient) {
      throw new Error('Ollama not available');
    }
    
    return await this.ollamaClient.enhanceMemoriesBatch(memories, onProgress);
  }

  /**
   * Generate a concise title for memory card display
   * @param {string} content - The memory content
   * @param {Object} metadata - Memory metadata (category, tags, etc.)
   * @param {boolean} useOllama - Whether to use local AI (default: false)
   * @returns {string} - Title (max 60 chars)
   */
  static async generateTitle(content, metadata = {}, useOllama = false) {
    // Parse content if it's in markdown format
    let parsedContent = content;
    let parsedMetadata = metadata;
    
    try {
      const parsed = MemoryFormat.parseMarkdown(content);
      if (parsed && parsed.metadata) {
        parsedContent = parsed.content;
        parsedMetadata = { ...parsed.metadata, ...metadata };
      }
    } catch (e) {
      // Not markdown format, use as-is
    }

    // Check for existing title in tags
    if (parsedMetadata.tags && Array.isArray(parsedMetadata.tags)) {
      const titleTag = parsedMetadata.tags.find(tag => tag.startsWith('title:'));
      if (titleTag) {
        return titleTag.substring(6).trim();
      }
    }

    // Try Ollama enhancement if requested
    if (useOllama) {
      try {
        const enhancement = await this.enhanceWithOllama(parsedContent, parsedMetadata);
        return enhancement.title;
      } catch (error) {
        console.warn('Ollama title generation failed, falling back to rule-based:', error.message);
      }
    }

    // Generate title based on content type (fallback)
    const category = parsedMetadata.category || this.detectCategory(parsedContent);
    return this.generateTitleByCategory(parsedContent, category);
  }

  /**
   * Generate a concise summary for memory card display
   * @param {string} content - The memory content
   * @param {Object} metadata - Memory metadata
   * @returns {string} - Summary (max 150 chars)
   */
  static generateSummary(content, metadata = {}) {
    // Parse content if it's in markdown format
    let parsedContent = content;
    let parsedMetadata = metadata;
    
    try {
      const parsed = MemoryFormat.parseMarkdown(content);
      if (parsed && parsed.metadata) {
        parsedContent = parsed.content;
        parsedMetadata = { ...parsed.metadata, ...metadata };
      }
    } catch (e) {
      // Not markdown format, use as-is
    }

    // Check for existing summary in tags
    if (parsedMetadata.tags && Array.isArray(parsedMetadata.tags)) {
      const summaryTag = parsedMetadata.tags.find(tag => tag.startsWith('summary:'));
      if (summaryTag) {
        return summaryTag.substring(8).trim();
      }
    }

    // Generate summary based on content type
    const category = parsedMetadata.category || this.detectCategory(parsedContent);
    return this.generateSummaryByCategory(parsedContent, category);
  }

  /**
   * Generate title based on category
   */
  static generateTitleByCategory(content, category) {
    const maxLength = 60;
    
    // First try to extract a smart title from markdown structure
    const smartTitle = this.extractSmartTitle(content, maxLength);
    if (smartTitle) {
      return smartTitle;
    }
    
    switch (category) {
      case 'code':
        return this.generateCodeTitle(content, maxLength);
      case 'work':
        return this.generateWorkTitle(content, maxLength);
      case 'research':
        return this.generateResearchTitle(content, maxLength);
      case 'conversations':
        return this.generateConversationTitle(content, maxLength);
      case 'personal':
        return this.generatePersonalTitle(content, maxLength);
      default:
        return this.generateGenericTitle(content, maxLength);
    }
  }

  /**
   * Extract smart title from markdown content
   */
  static extractSmartTitle(content, maxLength) {
    // Remove common markdown formatting
    const cleanContent = content.replace(/[#*_`]/g, '').trim();
    
    // Look for markdown headers and extract meaningful parts
    const headerMatch = content.match(/^#{1,6}\s+(.+)$/m);
    if (headerMatch) {
      let title = headerMatch[1].trim();
      
      // Handle long titles by extracting key words
      if (title.length > maxLength) {
        title = this.extractKeyWordsFromTitle(title, maxLength);
      }
      
      return this.truncate(title, maxLength);
    }
    
    // Look for structured patterns (improved)
    const structuredPatterns = [
      /^(.+?):\s*[#\n]/m,          // "Title: content" or "Title: #"
      /^"(.+?)"/m,                 // Quoted titles
      /^\*\*(.+?)\*\*/m,           // Bold markdown
      /^__(.+?)__/m,               // Bold underscore
      /^\[(.+?)\]/m,               // Bracketed content
      /^(\d+\.?\s*[A-Z][^.!?]*)/m, // Numbered items
    ];
    
    for (const pattern of structuredPatterns) {
      const match = content.match(pattern);
      if (match && match[1].length > 5) {
        let title = match[1].trim();
        
        // Handle long titles
        if (title.length > maxLength) {
          title = this.extractKeyWordsFromTitle(title, maxLength);
        }
        
        return this.truncate(title, maxLength);
      }
    }
    
    // Extract from first meaningful sentence
    const sentences = cleanContent.split(/[.!?\n]+/).filter(s => s.trim().length > 10);
    for (const sentence of sentences.slice(0, 3)) {
      const cleaned = sentence.trim();
      
      // Skip generic patterns
      if (!cleaned.match(/^(project location|current|status|update|working|running|command|please|this|that|the|a|an)/i)) {
        if (cleaned.length > maxLength) {
          const keyWords = this.extractKeyWordsFromTitle(cleaned, maxLength);
          return this.truncate(keyWords, maxLength);
        }
        
        if (cleaned.length > 15 && cleaned.length <= maxLength) {
          return cleaned;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract key words from long titles
   */
  static extractKeyWordsFromTitle(title, maxLength) {
    // Remove common words and extract key terms
    const stopWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'shall'];
    
    const words = title.toLowerCase().split(/\s+/);
    const keyWords = words.filter(word => 
      word.length > 2 && 
      !stopWords.includes(word) &&
      /^[a-z0-9]+$/i.test(word)
    );
    
    // Build title from key words
    let result = '';
    for (const word of keyWords) {
      const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
      if ((result + ' ' + capitalized).length > maxLength - 3) {
        break;
      }
      result += (result ? ' ' : '') + capitalized;
    }
    
    // If we couldn't extract enough key words, try a different approach
    if (result.length < 20) {
      // Take first few words of the original title
      const firstWords = title.split(/\s+/).slice(0, 6);
      result = firstWords.join(' ');
    }
    
    return result;
  }

  /**
   * Generate summary based on category
   */
  static generateSummaryByCategory(content, category) {
    const maxLength = 150;
    
    // First try to extract a smart summary from markdown structure
    const smartSummary = this.extractSmartSummary(content, maxLength);
    if (smartSummary) {
      return smartSummary;
    }
    
    switch (category) {
      case 'code':
        return this.generateCodeSummary(content, maxLength);
      case 'work':
        return this.generateWorkSummary(content, maxLength);
      case 'research':
        return this.generateResearchSummary(content, maxLength);
      case 'conversations':
        return this.generateConversationSummary(content, maxLength);
      case 'personal':
        return this.generatePersonalSummary(content, maxLength);
      default:
        return this.generateGenericSummary(content, maxLength);
    }
  }

  /**
   * Extract smart summary from markdown content
   */
  static extractSmartSummary(content, maxLength) {
    // Remove markdown formatting for better text extraction
    const cleanContent = content.replace(/[#*_`]/g, '').trim();
    
    // Look for summary patterns in markdown
    const summaryPatterns = [
      /^#{1,6}\s+.+?\n+(.+?)(?:\n#{1,6}|\n\n|$)/m,  // Text after first header
      /^(.+?)\n+#{1,6}/m,                            // Text before first header
      /^>(.+?)(?:\n|$)/m,                            // Blockquote
      /^\*\*(.+?)\*\*(.+?)(?:\n|$)/m,               // Bold text with description
    ];
    
    for (const pattern of summaryPatterns) {
      const match = content.match(pattern);
      if (match) {
        let summary = (match[1] || match[0]).trim();
        
        // Clean up the summary
        summary = summary.replace(/[#*_`]/g, '').trim();
        
        // Skip if too short or looks like a title
        if (summary.length > 20 && summary.length <= maxLength) {
          return summary;
        } else if (summary.length > maxLength) {
          return this.truncate(summary, maxLength);
        }
      }
    }
    
    // Extract meaningful sentences
    const sentences = cleanContent.split(/[.!?\n]+/).filter(s => s.trim().length > 15);
    
    // Skip header-like sentences and get description
    const meaningfulSentences = sentences.filter(sentence => {
      const cleaned = sentence.trim();
      return !cleaned.match(/^(#{1,6}|command|please|this is|here is|ultimate|comprehensive)/i) &&
             cleaned.length > 20 &&
             cleaned.length < 200;
    });
    
    if (meaningfulSentences.length > 0) {
      let summary = meaningfulSentences.slice(0, 2).join('. ').trim();
      
      // Ensure proper sentence ending
      if (summary && !summary.match(/[.!?]$/)) {
        summary += '.';
      }
      
      return this.truncate(summary, maxLength);
    }
    
    // Fallback: use first decent sentence
    for (const sentence of sentences.slice(0, 3)) {
      const cleaned = sentence.trim();
      if (cleaned.length > 30 && cleaned.length <= maxLength) {
        return cleaned.endsWith('.') ? cleaned : cleaned + '.';
      }
    }
    
    return null;
  }

  /**
   * Code-specific title generation
   */
  static generateCodeTitle(content, maxLength) {
    // Look for function/class names
    const functionMatch = content.match(/(?:function|const|let|var)\s+(\w+)/);
    if (functionMatch) {
      return this.truncate(`Function: ${functionMatch[1]}`, maxLength);
    }

    const classMatch = content.match(/class\s+(\w+)/);
    if (classMatch) {
      return this.truncate(`Class: ${classMatch[1]}`, maxLength);
    }

    // Look for imports/requires
    const importMatch = content.match(/(?:import|require)\s+.*?from\s+['"](.+?)['"]/);
    if (importMatch) {
      const moduleName = importMatch[1].split('/').pop();
      return this.truncate(`Code using ${moduleName}`, maxLength);
    }

    // Look for language hints
    const langMatch = content.match(/```(\w+)/);
    if (langMatch) {
      return this.truncate(`${langMatch[1]} code snippet`, maxLength);
    }

    return this.truncate('Code snippet', maxLength);
  }

  /**
   * Work-specific title generation
   */
  static generateWorkTitle(content, maxLength) {
    // Look for meeting patterns
    if (content.toLowerCase().includes('meeting')) {
      const dateMatch = content.match(/\d{1,2}[/-]\d{1,2}[/-]\d{2,4}/);
      if (dateMatch) {
        return this.truncate(`Meeting notes - ${dateMatch[0]}`, maxLength);
      }
      return this.truncate('Meeting notes', maxLength);
    }

    // Look for project mentions
    const projectMatch = content.match(/project[:\s]+([^.\n]+)/i);
    if (projectMatch) {
      return this.truncate(`Project: ${projectMatch[1].trim()}`, maxLength);
    }

    // Look for task patterns
    const taskMatch = content.match(/(?:task|todo|action)[:\s]+([^.\n]+)/i);
    if (taskMatch) {
      return this.truncate(`Task: ${taskMatch[1].trim()}`, maxLength);
    }

    return this.extractFirstMeaningfulPhrase(content, maxLength, 'Work note');
  }

  /**
   * Research-specific title generation
   */
  static generateResearchTitle(content, maxLength) {
    // Look for research topics
    const topicMatch = content.match(/(?:research|study|analysis)\s+(?:on|of|about)\s+([^.\n]+)/i);
    if (topicMatch) {
      return this.truncate(`Research: ${topicMatch[1].trim()}`, maxLength);
    }

    // Look for findings
    const findingMatch = content.match(/(?:found|discovered|concluded)\s+(?:that\s+)?([^.\n]+)/i);
    if (findingMatch) {
      return this.truncate(`Finding: ${findingMatch[1].trim()}`, maxLength);
    }

    return this.extractFirstMeaningfulPhrase(content, maxLength, 'Research note');
  }

  /**
   * Conversation-specific title generation
   */
  static generateConversationTitle(content, maxLength) {
    // Look for participants
    const withMatch = content.match(/(?:with|call with|talked to)\s+([^.\n,]+)/i);
    if (withMatch) {
      return this.truncate(`Conversation with ${withMatch[1].trim()}`, maxLength);
    }

    // Look for topics discussed
    const aboutMatch = content.match(/(?:discussed|talked about)\s+([^.\n]+)/i);
    if (aboutMatch) {
      return this.truncate(`Discussion: ${aboutMatch[1].trim()}`, maxLength);
    }

    return this.extractFirstMeaningfulPhrase(content, maxLength, 'Conversation');
  }

  /**
   * Personal-specific title generation
   */
  static generatePersonalTitle(content, maxLength) {
    // Look for personal patterns
    const feelingMatch = content.match(/(?:feel|feeling|felt)\s+([^.\n]+)/i);
    if (feelingMatch) {
      return this.truncate(`Feeling: ${feelingMatch[1].trim()}`, maxLength);
    }

    const thoughtMatch = content.match(/(?:think|thought|believe)\s+([^.\n]+)/i);
    if (thoughtMatch) {
      return this.truncate(`Thought: ${thoughtMatch[1].trim()}`, maxLength);
    }

    return this.extractFirstMeaningfulPhrase(content, maxLength, 'Personal note');
  }

  /**
   * Generic title generation
   */
  static generateGenericTitle(content, maxLength) {
    return this.extractFirstMeaningfulPhrase(content, maxLength, 'Memory');
  }

  /**
   * Code-specific summary generation
   */
  static generateCodeSummary(content, maxLength) {
    const parts = [];

    // Language
    const langMatch = content.match(/```(\w+)/);
    if (langMatch) {
      parts.push(langMatch[1]);
    }

    // Function/class names
    const functionMatches = content.match(/(?:function|const|let|var)\s+(\w+)/g);
    if (functionMatches && functionMatches.length > 0) {
      parts.push(`${functionMatches.length} function${functionMatches.length > 1 ? 's' : ''}`);
    }

    const classMatches = content.match(/class\s+(\w+)/g);
    if (classMatches && classMatches.length > 0) {
      parts.push(`${classMatches.length} class${classMatches.length > 1 ? 'es' : ''}`);
    }

    // Key operations
    if (content.includes('import') || content.includes('require')) {
      parts.push('with imports');
    }

    if (parts.length > 0) {
      return this.truncate(parts.join(', '), maxLength);
    }

    return this.truncate(this.getFirstSentences(content, 2), maxLength);
  }

  /**
   * Work-specific summary generation
   */
  static generateWorkSummary(content, maxLength) {
    const keyPoints = [];

    // Extract action items
    const actionMatches = content.match(/(?:todo|action|task)[:\s]+([^.\n]+)/gi);
    if (actionMatches) {
      keyPoints.push(`${actionMatches.length} action item${actionMatches.length > 1 ? 's' : ''}`);
    }

    // Extract decisions
    const decisionMatches = content.match(/(?:decided|agreed|concluded)[:\s]+([^.\n]+)/gi);
    if (decisionMatches) {
      keyPoints.push(`${decisionMatches.length} decision${decisionMatches.length > 1 ? 's' : ''}`);
    }

    if (keyPoints.length > 0) {
      const summary = this.getFirstSentences(content, 1) + '. ' + keyPoints.join(', ');
      return this.truncate(summary, maxLength);
    }

    return this.truncate(this.getFirstSentences(content, 2), maxLength);
  }

  /**
   * Research-specific summary generation
   */
  static generateResearchSummary(content, maxLength) {
    // Look for key findings or conclusions
    const conclusionMatch = content.match(/(?:conclusion|finding|result)[:\s]+([^.\n]+)/i);
    if (conclusionMatch) {
      return this.truncate(`Key finding: ${conclusionMatch[1].trim()}`, maxLength);
    }

    return this.truncate(this.getFirstSentences(content, 2), maxLength);
  }

  /**
   * Conversation-specific summary generation
   */
  static generateConversationSummary(content, maxLength) {
    const topics = [];

    // Extract topics
    const topicMatches = content.match(/(?:discussed|talked about|mentioned)\s+([^.\n,]+)/gi);
    if (topicMatches) {
      topics.push(...topicMatches.slice(0, 2).map(m => m.replace(/discussed|talked about|mentioned/i, '').trim()));
    }

    if (topics.length > 0) {
      return this.truncate(`Topics: ${topics.join(', ')}`, maxLength);
    }

    return this.truncate(this.getFirstSentences(content, 2), maxLength);
  }

  /**
   * Personal-specific summary generation
   */
  static generatePersonalSummary(content, maxLength) {
    return this.truncate(this.getFirstSentences(content, 2), maxLength);
  }

  /**
   * Generic summary generation
   */
  static generateGenericSummary(content, maxLength) {
    return this.truncate(this.getFirstSentences(content, 2), maxLength);
  }

  /**
   * Helper: Extract first meaningful phrase
   */
  static extractFirstMeaningfulPhrase(content, maxLength, fallback) {
    const lines = content.split('\n').filter(line => line.trim().length > 10);
    
    for (const line of lines) {
      // Skip generic starters
      if (line.match(/^(the|this|that|it|there|here)/i)) {
        continue;
      }
      
      // Remove markdown formatting
      const cleaned = line.replace(/[#*_`]/g, '').trim();
      
      if (cleaned.length > 15) {
        return this.truncate(cleaned, maxLength);
      }
    }
    
    return fallback;
  }

  /**
   * Helper: Get first N sentences
   */
  static getFirstSentences(content, count) {
    const sentences = content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
    
    return sentences.slice(0, count).join('. ');
  }

  /**
   * Helper: Truncate text with ellipsis
   */
  static truncate(text, maxLength) {
    if (!text) return '';
    
    const cleaned = text.trim();
    if (cleaned.length <= maxLength) {
      return cleaned;
    }
    
    return cleaned.substring(0, maxLength - 3) + '...';
  }

  /**
   * Helper: Detect category from content
   */
  static detectCategory(content) {
    const lowerContent = content.toLowerCase();
    
    // Code detection
    if (content.includes('```') || 
        content.includes('function') || 
        content.includes('const ') ||
        content.includes('import ') ||
        /\b(bug|fix|debug|error|exception)\b/.test(lowerContent)) {
      return 'code';
    }
    
    // Work detection
    if (/\b(meeting|deadline|project|team|client|business)\b/.test(lowerContent)) {
      return 'work';
    }
    
    // Research detection
    if (/\b(research|study|analysis|investigation|findings)\b/.test(lowerContent)) {
      return 'research';
    }
    
    // Conversation detection
    if (/\b(conversation|discussed|talked|said|mentioned)\b/.test(lowerContent) ||
        content.includes('"')) {
      return 'conversations';
    }
    
    // Personal detection
    if (/\b(my|I|me|myself|personal|feel|think)\b/.test(lowerContent)) {
      return 'personal';
    }
    
    return 'general';
  }

  /**
   * Generate prompts for LLM-based title/summary generation
   */
  static generateTitlePrompt(content, category) {
    const categoryDescriptions = {
      code: 'code snippet or technical content',
      work: 'work-related note or meeting',
      research: 'research or analysis',
      conversations: 'conversation or discussion',
      personal: 'personal note or thought',
      general: 'general content'
    };

    const categoryDesc = categoryDescriptions[category] || categoryDescriptions.general;

    return `Generate a concise, descriptive title (max 60 characters) for this ${categoryDesc}.
The title should clearly indicate what this memory is about and be optimized for display on a card interface.

Content: ${content.substring(0, 1000)}${content.length > 1000 ? '...' : ''}

Respond with ONLY the title, no quotes or additional text.`;
  }

  static generateSummaryPrompt(content, category) {
    const categoryInstructions = {
      code: 'Focus on what the code does, key functions/classes, and technologies used.',
      work: 'Highlight key decisions, action items, or outcomes.',
      research: 'Emphasize findings, conclusions, or key insights.',
      conversations: 'Mention participants and main topics discussed.',
      personal: 'Capture the main thought or feeling expressed.',
      general: 'Summarize the main points or purpose.'
    };

    const instruction = categoryInstructions[category] || categoryInstructions.general;

    return `Generate a brief summary (max 150 characters) for this memory.
${instruction}
The summary should give a clear overview for card display.

Content: ${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}

Respond with ONLY the summary, no quotes or additional text.`;
  }
}