/**
 * Query Intelligence System
 * Inspired by claude-historian's approach to smart query classification
 * Classifies queries to optimize search strategy and improve result relevance
 */

export class QueryIntelligence {
  constructor() {
    // Query type patterns for classification (claude-historian inspired)
    this.patterns = {
      error: {
        keywords: ['error', 'bug', 'issue', 'problem', 'fail', 'failed', 'exception', 'crash', 'broken', 'fix', 'fixed'],
        patterns: [/error\s*:/i, /exception\s*:/i, /failed\s+to/i, /cannot\s+\w+/i, /undefined\s+is\s+not/i],
        weight: 1.5
      },
      code: {
        keywords: ['function', 'class', 'method', 'variable', 'import', 'export', 'const', 'let', 'var', 'async', 'await'],
        patterns: [/\w+\(\)/, /\w+\.\w+/, /import\s+.*\s+from/, /class\s+\w+/, /function\s+\w+/],
        weight: 1.3
      },
      file: {
        keywords: ['file', 'path', 'directory', 'folder', '.js', '.ts', '.tsx', '.json', '.md'],
        patterns: [/\w+\.\w+$/, /\/\w+\//, /\\\w+\\/, /src\//, /lib\//, /components\//],
        weight: 1.2
      },
      concept: {
        keywords: ['how', 'what', 'why', 'when', 'where', 'concept', 'explain', 'understand', 'implement', 'approach'],
        patterns: [/how\s+to/i, /what\s+is/i, /why\s+does/i, /when\s+should/i],
        weight: 1.0
      },
      recent: {
        keywords: ['recent', 'latest', 'last', 'today', 'yesterday', 'previous', 'just', 'now'],
        patterns: [/last\s+\d+/, /recent\s+\w+/, /latest\s+\w+/],
        weight: 1.4
      },
      command: {
        keywords: ['npm', 'yarn', 'git', 'bash', 'run', 'build', 'test', 'install', 'deploy'],
        patterns: [/npm\s+\w+/, /yarn\s+\w+/, /git\s+\w+/, /\$\s*\w+/],
        weight: 1.1
      }
    };

    // Boost factors for different scenarios
    this.boostFactors = {
      questionMark: 1.2,
      quoted: 1.3,
      multipleKeywords: 1.4,
      exact: 2.0
    };
    
    // Domain-specific synonyms and related terms
    this.synonymMap = {
      // MCP/Development terms
      'mcp': ['model context protocol', 'mcp server', 'mcp client'],
      'stdio': ['stdin stdout', 'standard io', 'standard input output'],
      'jsonrpc': ['json-rpc', 'json rpc', 'jsonrpc2', 'json-rpc 2.0'],
      'fastmcp': ['fast mcp', 'fast-mcp', 'fastmcp framework'],
      
      // Common programming terms
      'config': ['configuration', 'settings', 'setup', 'conf'],
      'repo': ['repository', 'git repo', 'codebase'],
      'env': ['environment', 'environment variable', 'env var'],
      'auth': ['authentication', 'authorization', 'login'],
      'db': ['database', 'data store', 'storage'],
      'api': ['endpoint', 'rest api', 'service'],
      'ui': ['user interface', 'frontend', 'gui', 'interface'],
      'bug': ['error', 'issue', 'problem', 'defect'],
      'fix': ['solution', 'resolve', 'patch', 'workaround'],
      
      // Action terms
      'working': ['works', 'functional', 'successful', 'functioning'],
      'broken': ['failing', 'not working', 'error', 'failed'],
      'debug': ['troubleshoot', 'investigate', 'diagnose'],
      'implement': ['build', 'create', 'develop', 'code'],
      
      // State terms
      'disconnected': ['connection lost', 'not connected', 'connection error'],
      'connected': ['connection established', 'online', 'linked'],
      'crashed': ['segfault', 'core dump', 'terminated', 'died'],
      'hanging': ['frozen', 'stuck', 'unresponsive', 'deadlock']
    };
    
    // Common acronyms and their expansions
    this.acronyms = {
      'api': 'application programming interface',
      'cli': 'command line interface',
      'gui': 'graphical user interface',
      'sdk': 'software development kit',
      'ide': 'integrated development environment',
      'ci': 'continuous integration',
      'cd': 'continuous deployment',
      'pr': 'pull request',
      'poc': 'proof of concept',
      'mvp': 'minimum viable product',
      'orm': 'object relational mapping',
      'crud': 'create read update delete',
      'rest': 'representational state transfer',
      'jwt': 'json web token',
      'oauth': 'open authorization',
      'ssl': 'secure sockets layer',
      'tls': 'transport layer security',
      'npm': 'node package manager',
      'pip': 'pip installs packages'
    };
    
    // Common typos and corrections
    this.typoCorrections = {
      'disconneted': 'disconnected',
      'conection': 'connection',
      'recieve': 'receive',
      'seperate': 'separate',
      'occured': 'occurred',
      'successfull': 'successful',
      'paramter': 'parameter',
      'arguement': 'argument',
      'fucntion': 'function',
      'retrun': 'return',
      'flase': 'false',
      'ture': 'true',
      'cosnt': 'const',
      'lgo': 'log',
      'consoel': 'console',
      'proint': 'print',
      'debgu': 'debug',
      'eroor': 'error',
      'mehtod': 'method',
      'clinet': 'client',
      'sever': 'server',
      'josn': 'json',
      'pythno': 'python',
      'javscript': 'javascript'
    };
    
    // Contextual expansions (phrases that should be expanded)
    this.contextualExpansions = {
      'not working': ['broken', 'failing', 'error', 'issue'],
      'works now': ['fixed', 'resolved', 'solution', 'working'],
      'found solution': ['solved', 'fixed', 'resolved', 'workaround'],
      'still broken': ['not fixed', 'ongoing issue', 'unresolved'],
      'works with': ['compatible', 'functions with', 'successful using']
    };
  }
  
  /**
   * Expand a query with synonyms, related terms, and corrections
   */
  expandQuery(query) {
    const originalTerms = this.tokenize(query);
    const expandedTerms = new Set(originalTerms);
    
    // Add original query
    expandedTerms.add(query.toLowerCase());
    
    // Process each term
    originalTerms.forEach(term => {
      const lowerTerm = term.toLowerCase();
      
      // Add typo corrections
      if (this.typoCorrections[lowerTerm]) {
        expandedTerms.add(this.typoCorrections[lowerTerm]);
      }
      
      // Add synonyms
      if (this.synonymMap[lowerTerm]) {
        this.synonymMap[lowerTerm].forEach(synonym => expandedTerms.add(synonym));
      }
      
      // Check if term is in any synonym list (reverse lookup)
      Object.entries(this.synonymMap).forEach(([key, synonyms]) => {
        if (synonyms.includes(lowerTerm)) {
          expandedTerms.add(key);
          synonyms.forEach(s => expandedTerms.add(s));
        }
      });
      
      // Expand acronyms
      if (this.acronyms[lowerTerm]) {
        expandedTerms.add(this.acronyms[lowerTerm]);
      }
      
      // Check if term is an expansion of an acronym
      Object.entries(this.acronyms).forEach(([acronym, expansion]) => {
        if (expansion.includes(lowerTerm)) {
          expandedTerms.add(acronym);
        }
      });
    });
    
    // Check for contextual phrases
    Object.entries(this.contextualExpansions).forEach(([phrase, expansions]) => {
      if (query.toLowerCase().includes(phrase)) {
        expansions.forEach(expansion => expandedTerms.add(expansion));
      }
    });
    
    // Generate variations
    this.generateVariations(query).forEach(variation => expandedTerms.add(variation));
    
    return Array.from(expandedTerms);
  }
  
  /**
   * Tokenize query into meaningful terms
   */
  tokenize(query) {
    // Split by spaces and common delimiters, filter out small words
    return query.toLowerCase()
      .split(/[\s\-_.,;:!?()[\]{}'"]+/)
      .filter(term => term.length > 2 || ['ui', 'ci', 'cd', 'pr', 'db'].includes(term));
  }
  
  /**
   * Generate variations of the query
   */
  generateVariations(query) {
    const variations = [];
    const lower = query.toLowerCase();
    
    // Hyphenated vs non-hyphenated
    if (lower.includes('-')) {
      variations.push(lower.replace(/-/g, ' '));
      variations.push(lower.replace(/-/g, ''));
    } else if (lower.includes(' ')) {
      variations.push(lower.replace(/ /g, '-'));
      variations.push(lower.replace(/ /g, ''));
    }
    
    // Underscore variations
    if (lower.includes('_')) {
      variations.push(lower.replace(/_/g, ' '));
      variations.push(lower.replace(/_/g, '-'));
    }
    
    // CamelCase to space separated
    const camelCaseWords = query.match(/[A-Z][a-z]+/g);
    if (camelCaseWords && camelCaseWords.length > 1) {
      variations.push(camelCaseWords.join(' ').toLowerCase());
      variations.push(camelCaseWords.join('-').toLowerCase());
    }
    
    return variations;
  }
  
  /**
   * Calculate similarity between two strings (for fuzzy matching)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * Levenshtein distance for fuzzy matching
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1 // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Get search suggestions based on query
   */
  getSuggestions(query, availableTerms = []) {
    const suggestions = new Set();
    const queryLower = query.toLowerCase();
    
    // Direct matches from available terms
    availableTerms.forEach(term => {
      if (term.toLowerCase().includes(queryLower) || 
          this.calculateSimilarity(term.toLowerCase(), queryLower) > 0.8) {
        suggestions.add(term);
      }
    });
    
    // Add corrections
    if (this.typoCorrections[queryLower]) {
      suggestions.add(this.typoCorrections[queryLower]);
    }
    
    // Add synonym suggestions
    if (this.synonymMap[queryLower]) {
      this.synonymMap[queryLower].forEach(s => suggestions.add(s));
    }
    
    return Array.from(suggestions).slice(0, 5); // Top 5 suggestions
  }
  
  /**
   * Analyze query intent
   */
  analyzeIntent(query) {
    const lower = query.toLowerCase();
    
    // Determine if looking for problems or solutions
    const problemIndicators = ['error', 'failing', 'broken', 'issue', 'problem', 'crash', 'not working'];
    const solutionIndicators = ['working', 'fixed', 'solution', 'resolved', 'successful', 'works'];
    
    const isProblemSearch = problemIndicators.some(indicator => lower.includes(indicator));
    const isSolutionSearch = solutionIndicators.some(indicator => lower.includes(indicator));
    
    // Determine technical context
    const contexts = [];
    if (lower.includes('dxt') || lower.includes('desktop')) contexts.push('dxt');
    if (lower.includes('mcp') || lower.includes('protocol')) contexts.push('mcp');
    if (lower.includes('json') || lower.includes('rpc')) contexts.push('jsonrpc');
    if (lower.includes('python') || lower.includes('py')) contexts.push('python');
    if (lower.includes('node') || lower.includes('npm')) contexts.push('nodejs');
    
    return {
      type: isProblemSearch ? 'problem' : isSolutionSearch ? 'solution' : 'general',
      contexts,
      confidence: (isProblemSearch || isSolutionSearch) ? 0.8 : 0.5
    };
  }
  
  /**
   * Rank search results based on query relevance
   */
  rankResults(results, originalQuery, expandedQueries) {
    return results.map(result => {
      let score = 0;
      const content = result.content.toLowerCase();
      
      // Exact match bonus
      if (content.includes(originalQuery.toLowerCase())) {
        score += 10;
      }
      
      // Expanded query matches
      expandedQueries.forEach(expanded => {
        if (content.includes(expanded.toLowerCase())) {
          score += 5;
        }
      });
      
      // Title/summary match bonus
      if (result.title && result.title.toLowerCase().includes(originalQuery.toLowerCase())) {
        score += 8;
      }
      
      // Recent items bonus
      const daysSinceCreated = (Date.now() - new Date(result.created).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) score += 3;
      if (daysSinceCreated < 30) score += 1;
      
      // High priority bonus
      if (result.priority === 'high') score += 2;
      
      return { ...result, relevanceScore: score };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Classify a query into one or more types with confidence scores
   * Claude-historian inspired classification system
   */
  classify(query) {
    if (!query || typeof query !== 'string') {
      return {
        types: ['general'],
        primary: 'general',
        confidence: 0.5,
        features: {}
      };
    }

    const normalizedQuery = query.toLowerCase();
    const scores = {};
    const features = this.extractQueryFeatures(query);

    // Score each query type
    for (const [type, config] of Object.entries(this.patterns)) {
      scores[type] = this.scoreQueryType(normalizedQuery, config, features);
    }

    // Normalize scores
    const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
    const normalizedScores = {};
    
    for (const [type, score] of Object.entries(scores)) {
      normalizedScores[type] = totalScore > 0 ? score / totalScore : 0;
    }

    // Get primary type and confidence
    const sortedTypes = Object.entries(normalizedScores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0.1);

    const primary = sortedTypes[0]?.[0] || 'general';
    const confidence = sortedTypes[0]?.[1] || 0.5;

    return {
      types: sortedTypes.map(([type]) => type),
      primary,
      confidence,
      scores: normalizedScores,
      features,
      suggestions: this.generateSearchSuggestions(primary, features),
      searchParameters: this.getSearchParameters(primary)
    };
  }

  /**
   * Extract features from the query for classification
   */
  extractQueryFeatures(query) {
    return {
      hasQuestionMark: query.includes('?'),
      hasQuotes: /"[^"]*"|'[^']*'/.test(query),
      isCommand: query.startsWith('$') || query.startsWith('>'),
      wordCount: query.split(/\s+/).length,
      hasPath: /[\/\\]/.test(query),
      hasFileExtension: /\.\w{2,4}($|\s)/.test(query),
      hasErrorIndicator: /error|exception|fail/i.test(query),
      isRecent: /recent|latest|last|today|yesterday/i.test(query)
    };
  }

  /**
   * Score a query for a specific type
   */
  scoreQueryType(query, config, features) {
    let score = 0;

    // Check keywords
    for (const keyword of config.keywords) {
      if (query.includes(keyword)) {
        score += config.weight;
      }
    }

    // Check patterns
    for (const pattern of config.patterns) {
      if (pattern.test(query)) {
        score += config.weight * 1.5; // Patterns are stronger indicators
      }
    }

    // Apply feature boosts
    if (features.hasQuestionMark && ['concept', 'error'].includes(config.type)) {
      score *= this.boostFactors.questionMark;
    }

    if (features.hasQuotes) {
      score *= this.boostFactors.quoted;
    }

    return score;
  }

  /**
   * Generate search suggestions based on query classification
   */
  generateSearchSuggestions(primaryType, features) {
    const suggestions = {
      filters: [],
      sortBy: 'relevance',
      includeRelated: true,
      searchStrategy: 'standard'
    };

    // Use features to enhance suggestions
    if (features.hasQuotes) {
      suggestions.exactMatch = true;
    }
    if (features.isRecent) {
      suggestions.sortBy = 'timestamp';
    }

    switch (primaryType) {
      case 'error':
        suggestions.filters.push({ field: 'category', value: 'code' });
        suggestions.filters.push({ field: 'content', contains: 'solution' });
        suggestions.sortBy = 'relevance';
        suggestions.searchStrategy = 'problem-solution';
        break;

      case 'recent':
        suggestions.sortBy = 'timestamp';
        suggestions.filters.push({ field: 'timestamp', range: 'last7days' });
        suggestions.searchStrategy = 'chronological';
        break;

      case 'code':
        suggestions.filters.push({ field: 'content_type', value: 'code' });
        suggestions.includeRelated = true;
        suggestions.searchStrategy = 'technical';
        break;

      case 'file':
        suggestions.filters.push({ field: 'content', pattern: 'path' });
        suggestions.searchStrategy = 'exact-match';
        break;

      case 'concept':
        suggestions.includeRelated = true;
        suggestions.searchStrategy = 'semantic';
        break;
    }

    return suggestions;
  }

  /**
   * Get search parameters optimized for the query type
   */
  getSearchParameters(primaryType) {
    const params = {
      limit: 20,
      offset: 0,
      includeMetadata: true,
      scoreThreshold: 0.3
    };

    // Adjust parameters based on query type
    switch (primaryType) {
      case 'error':
        params.limit = 10; // Fewer but more relevant results
        params.scoreThreshold = 0.5; // Higher threshold for relevance
        break;

      case 'recent':
        params.limit = 30; // More results for browsing
        params.scoreThreshold = 0.2; // Lower threshold to include more
        break;

      case 'code':
        params.includeCodeContext = true;
        params.limit = 15;
        break;
    }

    return params;
  }
}

export default QueryIntelligence;