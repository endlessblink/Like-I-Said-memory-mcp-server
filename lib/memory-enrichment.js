/**
 * Memory Enrichment Pipeline
 * Automatically extracts metadata, links, and context to make memories more discoverable
 */

export class MemoryEnrichment {
  constructor(storage, vectorStorage) {
    this.storage = storage;
    this.vectorStorage = vectorStorage;
    
    // Patterns for extraction
    this.patterns = {
      // Code-related patterns
      codeBlocks: /```(\w+)?\n([\s\S]*?)```/g,
      functions: /(?:function|const|let|var)\s+(\w+)\s*(?:=\s*)?(?:\([^)]*\)|\w+\s*=>)/g,
      classes: /class\s+(\w+)(?:\s+extends\s+\w+)?/g,
      imports: /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g,
      
      // File and path patterns  
      filePaths: /(?:[a-zA-Z]:)?(?:\/|\\)?(?:[\w.-]+(?:\/|\\))*[\w.-]+\.\w+/g,
      urls: /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g,
      
      // Command patterns
      shellCommands: /^\$\s+(.+)$/gm,
      npmCommands: /npm\s+(?:run\s+)?[\w:-]+/g,
      gitCommands: /git\s+[\w-]+(?:\s+[\w.-]+)*/g,
      
      // Error patterns
      errorMessages: /(?:Error|Exception|Failed|Cannot|Could not):\s*([^\n]+)/gi,
      stackTraces: /at\s+.+\s+\(.+:\d+:\d+\)/g,
      
      // Version patterns
      versions: /(?:v|version\s*)?(\d+\.\d+(?:\.\d+)?(?:-[\w.-]+)?)/gi,
      
      // Configuration patterns
      jsonConfig: /\{[\s\S]*?\}/g,
      yamlConfig: /^[\s-]*\w+:\s*.+$/gm,
      envVars: /\b[A-Z_]+(?:[A-Z0-9_]*)\b(?=\s*=)/g,
      
      // References
      issueRefs: /#(\d+)/g,
      prRefs: /(?:PR|pr)\s*#?(\d+)/g,
      commitRefs: /\b[0-9a-f]{7,40}\b/g
    };
    
    // Metadata extractors
    this.extractors = {
      codeLanguages: new Set(),
      referencedFiles: new Set(),
      externalLinks: new Set(),
      commands: new Set(),
      errorTypes: new Set(),
      technologies: new Set(),
      versions: new Map()
    };
  }
  
  /**
   * Enrich a memory with extracted metadata
   */
  async enrichMemory(memory) {
    try {
      // Reset extractors
      this.resetExtractors();
      
      // Extract all metadata
      const enrichedData = {
        codeSnippets: this.extractCodeSnippets(memory.content),
        referencedFiles: this.extractFilePaths(memory.content),
        externalLinks: this.extractUrls(memory.content),
        commands: this.extractCommands(memory.content),
        errors: this.extractErrors(memory.content),
        technologies: this.detectTechnologies(memory.content),
        structure: this.analyzeStructure(memory.content),
        keywords: this.extractKeywords(memory.content),
        entities: this.extractEntities(memory.content),
        crossReferences: await this.findCrossReferences(memory)
      };
      
      // Build enhanced metadata
      const enhancedMetadata = {
        ...memory.metadata,
        enriched: true,
        enrichedAt: new Date().toISOString(),
        codeLanguages: Array.from(this.extractors.codeLanguages),
        fileCount: enrichedData.referencedFiles.length,
        linkCount: enrichedData.externalLinks.length,
        commandCount: enrichedData.commands.length,
        errorCount: enrichedData.errors.length,
        hasCode: enrichedData.codeSnippets.length > 0,
        hasDiagram: memory.content.includes('```mermaid'),
        technologies: Array.from(this.extractors.technologies),
        structure: enrichedData.structure,
        searchableText: this.buildSearchableText(memory, enrichedData)
      };
      
      // Update memory with enhanced metadata
      const enrichedMemory = {
        ...memory,
        metadata: enhancedMetadata,
        enrichment: enrichedData
      };
      
      // Update in storage
      await this.storage.updateMemory(enrichedMemory);
      
      // Update vector embeddings with enriched content
      if (this.vectorStorage && this.vectorStorage.initialized) {
        await this.vectorStorage.updateMemory(enrichedMemory);
      }
      
      return enrichedMemory;
    } catch (error) {
      console.error('Error enriching memory:', error);
      return memory; // Return original if enrichment fails
    }
  }
  
  /**
   * Extract code snippets with language detection
   */
  extractCodeSnippets(content) {
    const snippets = [];
    let match;
    
    this.patterns.codeBlocks.lastIndex = 0;
    while ((match = this.patterns.codeBlocks.exec(content)) !== null) {
      const language = match[1] || this.detectLanguage(match[2]);
      if (language) {
        this.extractors.codeLanguages.add(language);
      }
      
      snippets.push({
        language,
        code: match[2].trim(),
        startPos: match.index,
        endPos: match.index + match[0].length
      });
    }
    
    return snippets;
  }
  
  /**
   * Detect programming language from code content
   */
  detectLanguage(code) {
    const indicators = {
      javascript: /(?:const|let|var|function|=>|require|import\s+.*from)/,
      typescript: /(?:interface|type\s+\w+\s*=|:\s*\w+(?:<|>|\[\])?)/,
      python: /(?:def\s+|class\s+|import\s+|from\s+\w+\s+import|if\s+__name__)/,
      java: /(?:public\s+class|private\s+|protected\s+|@\w+)/,
      cpp: /(?:#include|using\s+namespace|std::|->)/,
      go: /(?:func\s+|package\s+|import\s+\()/,
      rust: /(?:fn\s+|impl\s+|use\s+|pub\s+|let\s+mut)/,
      ruby: /(?:def\s+|class\s+|require\s+|attr_|end$)/m,
      shell: /(?:^\s*#!|^\s*\$\s+|\becho\b|\bexport\b)/m,
      yaml: /^[\s-]*\w+:\s*(?:\||\>|['"]|[\w-]+)/m,
      json: /^\s*\{[\s\S]*\}\s*$/
    };
    
    for (const [lang, pattern] of Object.entries(indicators)) {
      if (pattern.test(code)) {
        return lang;
      }
    }
    
    return null;
  }
  
  /**
   * Extract file paths
   */
  extractFilePaths(content) {
    const files = [];
    let match;
    
    this.patterns.filePaths.lastIndex = 0;
    while ((match = this.patterns.filePaths.exec(content)) !== null) {
      const filePath = match[0];
      // Filter out common false positives
      if (!filePath.includes('...') && filePath.includes('.')) {
        files.push({
          path: filePath,
          name: path.basename(filePath),
          extension: path.extname(filePath)
        });
        this.extractors.referencedFiles.add(filePath);
      }
    }
    
    return files;
  }
  
  /**
   * Extract URLs
   */
  extractUrls(content) {
    const urls = [];
    let match;
    
    this.patterns.urls.lastIndex = 0;
    while ((match = this.patterns.urls.exec(content)) !== null) {
      const url = match[0];
      try {
        const urlObj = new URL(url);
        urls.push({
          full: url,
          host: urlObj.hostname,
          path: urlObj.pathname,
          protocol: urlObj.protocol
        });
        this.extractors.externalLinks.add(url);
      } catch (e) {
        // Invalid URL, skip
      }
    }
    
    return urls;
  }
  
  /**
   * Extract commands
   */
  extractCommands(content) {
    const commands = [];
    
    // Shell commands
    let match;
    this.patterns.shellCommands.lastIndex = 0;
    while ((match = this.patterns.shellCommands.exec(content)) !== null) {
      commands.push({
        type: 'shell',
        command: match[1],
        full: match[0]
      });
      this.extractors.commands.add(match[1]);
    }
    
    // NPM commands
    this.patterns.npmCommands.lastIndex = 0;
    while ((match = this.patterns.npmCommands.exec(content)) !== null) {
      commands.push({
        type: 'npm',
        command: match[0]
      });
      this.extractors.commands.add(match[0]);
    }
    
    // Git commands
    this.patterns.gitCommands.lastIndex = 0;
    while ((match = this.patterns.gitCommands.exec(content)) !== null) {
      commands.push({
        type: 'git',
        command: match[0]
      });
      this.extractors.commands.add(match[0]);
    }
    
    return commands;
  }
  
  /**
   * Extract error information
   */
  extractErrors(content) {
    const errors = [];
    let match;
    
    this.patterns.errorMessages.lastIndex = 0;
    while ((match = this.patterns.errorMessages.exec(content)) !== null) {
      errors.push({
        type: match[0].split(':')[0],
        message: match[1].trim(),
        full: match[0]
      });
      this.extractors.errorTypes.add(match[0].split(':')[0].toLowerCase());
    }
    
    // Check for stack traces
    if (this.patterns.stackTraces.test(content)) {
      errors.push({
        type: 'stack_trace',
        message: 'Contains stack trace information'
      });
    }
    
    return errors;
  }
  
  /**
   * Detect technologies mentioned
   */
  detectTechnologies(content) {
    const technologies = new Map([
      // Languages
      ['javascript', /\b(?:javascript|js|node\.?js|nodejs)\b/i],
      ['typescript', /\b(?:typescript|ts)\b/i],
      ['python', /\bpython\b/i],
      ['java', /\bjava\b(?!script)/i],
      ['go', /\b(?:golang|go)\b/i],
      ['rust', /\brust\b/i],
      ['ruby', /\bruby\b/i],
      ['php', /\bphp\b/i],
      
      // Frameworks
      ['react', /\breact(?:\.?js)?\b/i],
      ['vue', /\bvue(?:\.?js)?\b/i],
      ['angular', /\bangular\b/i],
      ['express', /\bexpress(?:\.?js)?\b/i],
      ['django', /\bdjango\b/i],
      ['flask', /\bflask\b/i],
      ['rails', /\b(?:ruby on )?rails\b/i],
      
      // Tools
      ['docker', /\bdocker\b/i],
      ['kubernetes', /\b(?:kubernetes|k8s)\b/i],
      ['git', /\bgit\b/i],
      ['npm', /\bnpm\b/i],
      ['webpack', /\bwebpack\b/i],
      ['vite', /\bvite\b/i],
      
      // Databases
      ['mongodb', /\bmongodb?\b/i],
      ['postgresql', /\b(?:postgresql|postgres)\b/i],
      ['mysql', /\bmysql\b/i],
      ['redis', /\bredis\b/i],
      ['sqlite', /\bsqlite\b/i],
      
      // Cloud/Services
      ['aws', /\b(?:aws|amazon web services)\b/i],
      ['azure', /\bazure\b/i],
      ['gcp', /\b(?:gcp|google cloud)\b/i],
      ['firebase', /\bfirebase\b/i],
      
      // MCP specific
      ['mcp', /\b(?:mcp|model context protocol)\b/i],
      ['claude', /\bclaude\b/i],
      ['dxt', /\b(?:dxt|desktop extension)\b/i]
    ]);
    
    const detected = [];
    for (const [tech, pattern] of technologies) {
      if (pattern.test(content)) {
        detected.push(tech);
        this.extractors.technologies.add(tech);
      }
    }
    
    return detected;
  }
  
  /**
   * Analyze content structure
   */
  analyzeStructure(content) {
    const lines = content.split('\n');
    const structure = {
      totalLines: lines.length,
      headings: 0,
      lists: 0,
      codeBlocks: 0,
      paragraphs: 0,
      complexity: 'simple'
    };
    
    let inCodeBlock = false;
    let inList = false;
    
    lines.forEach(line => {
      if (line.match(/^```/)) {
        inCodeBlock = !inCodeBlock;
        if (!inCodeBlock) structure.codeBlocks++;
      } else if (!inCodeBlock) {
        if (line.match(/^#+\s+/)) structure.headings++;
        else if (line.match(/^[\s]*[-*+]\s+/) || line.match(/^[\s]*\d+\.\s+/)) {
          if (!inList) structure.lists++;
          inList = true;
        } else if (line.trim() === '') {
          inList = false;
        } else if (line.trim().length > 20) {
          structure.paragraphs++;
        }
      }
    });
    
    // Determine complexity
    const score = structure.headings + structure.lists + structure.codeBlocks;
    if (score > 10) structure.complexity = 'complex';
    else if (score > 5) structure.complexity = 'moderate';
    
    return structure;
  }
  
  /**
   * Extract keywords using TF-IDF-like approach
   */
  extractKeywords(content) {
    // Remove code blocks and special characters
    const cleanContent = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/[^\w\s-]/g, ' ')
      .toLowerCase();
    
    // Get word frequency
    const words = cleanContent.split(/\s+/)
      .filter(word => word.length > 3 && !this.isStopWord(word));
    
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    
    // Get top keywords
    return Object.entries(frequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word,]) => word);
  }
  
  /**
   * Extract named entities
   */
  extractEntities(content) {
    const entities = {
      functions: [],
      classes: [],
      files: [],
      urls: [],
      versions: []
    };
    
    // Extract function names
    let match;
    this.patterns.functions.lastIndex = 0;
    while ((match = this.patterns.functions.exec(content)) !== null) {
      if (match[1]) entities.functions.push(match[1]);
    }
    
    // Extract class names
    this.patterns.classes.lastIndex = 0;
    while ((match = this.patterns.classes.exec(content)) !== null) {
      if (match[1]) entities.classes.push(match[1]);
    }
    
    // Extract versions
    this.patterns.versions.lastIndex = 0;
    while ((match = this.patterns.versions.exec(content)) !== null) {
      entities.versions.push(match[1]);
    }
    
    // Use already extracted files and URLs
    entities.files = Array.from(this.extractors.referencedFiles);
    entities.urls = Array.from(this.extractors.externalLinks);
    
    return entities;
  }
  
  /**
   * Find cross-references to other memories
   */
  async findCrossReferences(memory) {
    const references = [];
    
    // Look for explicit memory ID references
    const idPattern = /\b([a-z0-9]{20,})\b/g;
    let match;
    
    while ((match = idPattern.exec(memory.content)) !== null) {
      try {
        const referencedMemory = await this.storage.getMemory(match[1]);
        if (referencedMemory && referencedMemory.id !== memory.id) {
          references.push({
            id: match[1],
            type: 'explicit',
            title: referencedMemory.title || 'Untitled'
          });
        }
      } catch (e) {
        // Not a valid memory ID
      }
    }
    
    // Look for issue/PR references
    this.patterns.issueRefs.lastIndex = 0;
    while ((match = this.patterns.issueRefs.exec(memory.content)) !== null) {
      references.push({
        type: 'issue',
        number: match[1],
        full: match[0]
      });
    }
    
    this.patterns.prRefs.lastIndex = 0;
    while ((match = this.patterns.prRefs.exec(memory.content)) !== null) {
      references.push({
        type: 'pr',
        number: match[1],
        full: match[0]
      });
    }
    
    return references;
  }
  
  /**
   * Build enhanced searchable text
   */
  buildSearchableText(memory, enrichedData) {
    const parts = [
      memory.content,
      memory.title || '',
      memory.summary || '',
      ...(memory.tags || []),
      ...enrichedData.keywords,
      ...enrichedData.technologies,
      ...Array.from(this.extractors.codeLanguages),
      ...enrichedData.entities.functions,
      ...enrichedData.entities.classes,
      ...enrichedData.referencedFiles.map(f => f.name),
      ...enrichedData.commands.map(c => c.command || c.full)
    ];
    
    return parts.filter(Boolean).join(' ').toLowerCase();
  }
  
  /**
   * Helper methods
   */
  
  resetExtractors() {
    this.extractors = {
      codeLanguages: new Set(),
      referencedFiles: new Set(),
      externalLinks: new Set(),
      commands: new Set(),
      errorTypes: new Set(),
      technologies: new Set(),
      versions: new Map()
    };
  }
  
  isStopWord(word) {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
      'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
      'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
      'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she',
      'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why',
      'how', 'all', 'each', 'every', 'some', 'any', 'many', 'much', 'more',
      'most', 'other', 'another', 'such', 'no', 'not', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 'just', 'but', 'for', 'with', 'about'
    ]);
    
    return stopWords.has(word);
  }
  
  /**
   * Batch enrich multiple memories
   */
  async batchEnrich(memories, options = {}) {
    const { parallel = 5, onProgress } = options;
    const enriched = [];
    
    // Process in batches
    for (let i = 0; i < memories.length; i += parallel) {
      const batch = memories.slice(i, i + parallel);
      const enrichedBatch = await Promise.all(
        batch.map(memory => this.enrichMemory(memory))
      );
      
      enriched.push(...enrichedBatch);
      
      if (onProgress) {
        onProgress({
          current: Math.min(i + parallel, memories.length),
          total: memories.length,
          percentage: Math.round((Math.min(i + parallel, memories.length) / memories.length) * 100)
        });
      }
    }
    
    return enriched;
  }
}

export default MemoryEnrichment;