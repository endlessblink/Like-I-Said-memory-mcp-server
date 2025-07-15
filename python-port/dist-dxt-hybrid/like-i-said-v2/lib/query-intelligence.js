/**
 * Query Intelligence System
 * Enhances search queries with expansion, synonyms, and intelligent matching
 */

export class QueryIntelligence {
  constructor() {
    // Domain-specific synonyms and related terms
    this.synonymMap = {
      // MCP/Development terms
      'mcp': ['model context protocol', 'mcp server', 'mcp client'],
      'dxt': ['desktop extension', 'claude desktop extension', '.dxt'],
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
}

export default QueryIntelligence;