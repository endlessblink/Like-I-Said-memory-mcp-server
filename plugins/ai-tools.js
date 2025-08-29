/**
 * AI Tools Plugin (Optional)
 * Provides AI-enhanced features - only loaded when enabled
 * This demonstrates lazy loading of heavy dependencies
 */

export default {
  name: 'ai-tools',
  version: '1.0.0',
  description: 'Optional AI enhancement tools',
  
  /**
   * Lazy initialization - only load heavy deps when plugin is activated
   */
  async initialize(serviceRegistry) {
    this.serviceRegistry = serviceRegistry;
    this.ollamaClient = null;
    this.summaryGenerator = null;
    this.initialized = false;
  },

  /**
   * Lazy load AI dependencies
   */
  async ensureInitialized() {
    if (this.initialized) return;
    
    try {
      // Only import heavy modules when actually needed
      console.error('Loading AI modules (this may take a moment)...');
      
      // Check if Ollama is available
      const ollamaAvailable = await this.checkOllamaAvailable();
      if (ollamaAvailable) {
        const { OllamaClient } = await import('../lib/ollama-client.js');
        this.ollamaClient = new OllamaClient();
        console.error('Ollama client loaded');
      }
      
      // Load other AI modules only if needed
      const { TitleSummaryGenerator } = await import('../lib/title-summary-generator.js');
      this.summaryGenerator = new TitleSummaryGenerator();
      
      this.initialized = true;
      console.error('AI tools initialized');
    } catch (error) {
      console.error('Failed to initialize AI tools:', error.message);
      // AI tools will work in degraded mode
    }
  },

  /**
   * Check if Ollama server is available
   */
  async checkOllamaAvailable() {
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Plugin tools definitions
   */
  tools: {
    generate_summary: {
      schema: {
        description: 'Generate a summary of text using AI',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Content to summarize'
            },
            max_length: {
              type: 'number',
              description: 'Maximum summary length in words',
              default: 100
            }
          },
          required: ['content']
        }
      },
      async handler(args) {
        await this.ensureInitialized();
        
        if (!this.ollamaClient) {
          // Fallback to simple extraction
          const words = args.content.split(/\s+/);
          const maxWords = args.max_length || 100;
          return {
            summary: words.slice(0, maxWords).join(' ') + (words.length > maxWords ? '...' : ''),
            method: 'truncation',
            warning: 'AI not available, using simple truncation'
          };
        }
        
        try {
          const summary = await this.ollamaClient.generateSummary(args.content, args.max_length);
          return {
            summary,
            method: 'ai',
            model: 'ollama'
          };
        } catch (error) {
          return {
            summary: args.content.substring(0, 500) + '...',
            method: 'fallback',
            error: error.message
          };
        }
      }
    },

    analyze_content: {
      schema: {
        description: 'Analyze content for categories, tags, and complexity',
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'Content to analyze'
            }
          },
          required: ['content']
        }
      },
      async handler(args) {
        await this.ensureInitialized();
        
        // Simple analysis without AI
        const analysis = {
          word_count: args.content.split(/\s+/).length,
          character_count: args.content.length,
          complexity: this.detectComplexity(args.content),
          category: this.detectCategory(args.content),
          suggested_tags: this.extractKeywords(args.content)
        };
        
        // Enhance with AI if available
        if (this.ollamaClient) {
          try {
            const aiAnalysis = await this.ollamaClient.analyzeContent(args.content);
            return { ...analysis, ...aiAnalysis, ai_enhanced: true };
          } catch (error) {
            analysis.ai_error = error.message;
          }
        }
        
        return analysis;
      }
    },

    enrich_memory: {
      schema: {
        description: 'Enrich a memory with AI-generated metadata',
        inputSchema: {
          type: 'object',
          properties: {
            memory_id: {
              type: 'string',
              description: 'Memory ID to enrich'
            }
          },
          required: ['memory_id']
        }
      },
      async handler(args) {
        await this.ensureInitialized();
        
        // Get memory from storage
        const storage = await this.serviceRegistry.get('storage');
        if (!storage) {
          throw new Error('Storage service not available');
        }
        
        const memory = await storage.getMemory(args.memory_id);
        if (!memory) {
          throw new Error(`Memory not found: ${args.memory_id}`);
        }
        
        const enrichments = {
          original_id: memory.id,
          enriched_at: new Date().toISOString()
        };
        
        // Add AI enrichments if available
        if (this.ollamaClient) {
          try {
            enrichments.ai_summary = await this.ollamaClient.generateSummary(memory.content, 50);
            enrichments.ai_tags = await this.ollamaClient.extractTags(memory.content);
            enrichments.ai_category = await this.ollamaClient.categorizeContent(memory.content);
          } catch (error) {
            enrichments.ai_error = error.message;
          }
        }
        
        // Add simple enrichments
        enrichments.keywords = this.extractKeywords(memory.content);
        enrichments.complexity = this.detectComplexity(memory.content);
        
        return enrichments;
      }
    }
  },

  /**
   * Helper methods
   */
  detectComplexity(content) {
    const length = content.length;
    const words = content.split(/\s+/).length;
    const avgWordLength = content.replace(/\s+/g, '').length / words;
    
    if (length > 2000 || avgWordLength > 7) return 'high';
    if (length > 1000 || avgWordLength > 6) return 'medium';
    return 'low';
  },

  detectCategory(content) {
    const lower = content.toLowerCase();
    const categories = {
      code: ['function', 'class', 'const', 'let', 'var', 'import', 'export', 'async', 'await'],
      task: ['todo', 'task', 'complete', 'done', 'pending', 'blocked'],
      research: ['analysis', 'research', 'study', 'investigation', 'findings'],
      documentation: ['document', 'readme', 'guide', 'tutorial', 'explain'],
      bug: ['bug', 'error', 'fix', 'issue', 'problem', 'crash'],
      feature: ['feature', 'enhancement', 'improvement', 'add', 'implement']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lower.includes(keyword))) {
        return category;
      }
    }
    
    return 'general';
  },

  extractKeywords(content) {
    // Simple keyword extraction
    const words = content.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 4);
    
    const wordFreq = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  },

  /**
   * Cleanup on shutdown
   */
  async shutdown() {
    if (this.ollamaClient && this.ollamaClient.disconnect) {
      await this.ollamaClient.disconnect();
    }
    console.error('AI tools plugin shutting down');
  }
};