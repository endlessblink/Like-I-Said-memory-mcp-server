/**
 * Fuzzy Matching Integration for Like-I-Said Memory System
 * Uses Fuse.js for approximate string matching and typo tolerance
 */

import Fuse from 'fuse.js';

export class FuzzyMatcher {
  constructor() {
    // Configuration for different search scenarios
    this.configs = {
      // For memory content search - balanced precision/recall
      memory: {
        includeScore: true,
        threshold: 0.6, // Lower = more exact matches
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        minMatchCharLength: 2,
        keys: [
          { name: 'content', weight: 0.7 },
          { name: 'title', weight: 0.2 },
          { name: 'tags', weight: 0.1 }
        ]
      },
      
      // For exact term matching - higher precision
      exact: {
        includeScore: true,
        threshold: 0.3, // More strict for exact matches
        location: 0,
        distance: 50,
        maxPatternLength: 32,
        minMatchCharLength: 3,
        keys: [
          { name: 'content', weight: 0.8 },
          { name: 'searchableText', weight: 0.2 }
        ]
      },
      
      // For typo-tolerant search - higher recall
      typo: {
        includeScore: true,
        threshold: 0.8, // More lenient for typos
        location: 0,
        distance: 200,
        maxPatternLength: 32,
        minMatchCharLength: 2,
        ignoreLocation: true,
        keys: [
          { name: 'content', weight: 0.6 },
          { name: 'title', weight: 0.2 },
          { name: 'tags', weight: 0.1 },
          { name: 'searchableText', weight: 0.1 }
        ]
      }
    };
  }
  
  /**
   * Determine if fuzzy matching should be used based on current results
   */
  shouldUseFuzzyMatching(query, currentResultCount) {
    // Use fuzzy matching if:
    // 1. No results found with exact/expanded search
    // 2. Query has potential typos (less than 5 results)
    // 3. Query is longer than 3 characters (avoid too broad matches)
    return query.length > 3 && currentResultCount < 5;
  }
  
  /**
   * Search memories with fuzzy matching
   */
  searchMemories(memories, query, mode = 'memory') {
    if (!memories || memories.length === 0) return [];
    
    const config = this.configs[mode] || this.configs.memory;
    const fuse = new Fuse(memories, config);
    
    // Perform fuzzy search
    const results = fuse.search(query);
    
    // Transform results to include both item and fuzzy score
    return results.map(result => ({
      ...result.item,
      fuzzyScore: 1 - result.score, // Convert to similarity score (higher = better)
      fuzzyDistance: result.score,
      searchMode: mode
    }));
  }
  
  /**
   * Multi-mode fuzzy search combining different strategies
   */
  multiModeSearch(memories, query) {
    const results = {
      exact: this.searchMemories(memories, query, 'exact'),
      memory: this.searchMemories(memories, query, 'memory'),
      typo: this.searchMemories(memories, query, 'typo')
    };
    
    // Combine and deduplicate results
    const combined = this.combineAndRankResults(results, query);
    return combined;
  }
  
  /**
   * Combine results from different modes and rank by relevance
   */
  combineAndRankResults(results, query) {
    const seenIds = new Set();
    const combined = [];
    
    // Priority order: exact > memory > typo
    const modeWeights = {
      exact: 1.2,
      memory: 1.0,
      typo: 0.8
    };
    
    for (const [mode, modeResults] of Object.entries(results)) {
      for (const result of modeResults) {
        if (!seenIds.has(result.id)) {
          seenIds.add(result.id);
          
          // Apply mode weight to fuzzy score
          const weightedScore = result.fuzzyScore * modeWeights[mode];
          
          combined.push({
            ...result,
            combinedScore: weightedScore,
            searchMode: mode,
            fuzzyRank: modeResults.indexOf(result) + 1
          });
        }
      }
    }
    
    // Sort by combined score (highest first)
    return combined.sort((a, b) => b.combinedScore - a.combinedScore);
  }
  
  /**
   * Search with automatic query enhancement for better fuzzy matching
   */
  enhancedFuzzySearch(memories, query, options = {}) {
    const enhancedQueries = this.generateQueryVariations(query);
    const allResults = [];
    
    // Add semantic expansion if requested
    if (options.semanticExpansion) {
      enhancedQueries.push(...this.generateSemanticVariations(query));
    }
    
    // Add typo correction variations
    if (options.typoCorrection) {
      enhancedQueries.push(...this.generateTypoCorrectionVariations(query));
    }
    
    // Add context-aware variations
    if (options.contextHints) {
      enhancedQueries.push(...this.generateContextAwareVariations(query, options.contextHints));
    }
    
    // Search with each query variation
    for (const enhancedQuery of enhancedQueries) {
      const results = this.multiModeSearch(memories, enhancedQuery.query);
      
      // Add variation info to results
      results.forEach(result => {
        result.queryVariation = enhancedQuery.type;
        result.originalQuery = query;
        result.queryWeight = enhancedQuery.weight || 1.0;
        result.enhancedScore = result.combinedScore * result.queryWeight;
        allResults.push(result);
      });
    }
    
    // Deduplicate and rank
    return this.deduplicateResults(allResults);
  }
  
  /**
   * Generate query variations for better matching
   */
  generateQueryVariations(query) {
    const variations = [
      { query, type: 'original', weight: 1.0 }
    ];
    
    // Add variations without special characters
    const cleaned = query.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned !== query) {
      variations.push({ query: cleaned, type: 'cleaned', weight: 0.9 });
    }
    
    // Add individual words for partial matching
    const words = query.split(/\s+/).filter(word => word.length > 2);
    if (words.length > 1) {
      words.forEach(word => {
        variations.push({ query: word, type: 'word', weight: 0.7 });
      });
    }
    
    // Add acronym expansion (if query looks like an acronym)
    if (/^[A-Z]{2,}$/.test(query)) {
      const expanded = query.split('').join(' ');
      variations.push({ query: expanded, type: 'acronym', weight: 0.8 });
    }
    
    return variations;
  }
  
  /**
   * Generate semantic variations using domain knowledge
   */
  generateSemanticVariations(query) {
    const variations = [];
    
    // Technical term expansions
    const technicalExpansions = {
      'api': ['application programming interface', 'endpoint', 'rest', 'graphql'],
      'db': ['database', 'sql', 'mysql', 'postgres', 'mongodb'],
      'js': ['javascript', 'node', 'nodejs', 'es6', 'typescript'],
      'css': ['stylesheet', 'style', 'sass', 'scss', 'bootstrap'],
      'cli': ['command line', 'terminal', 'bash', 'shell'],
      'ci': ['continuous integration', 'pipeline', 'build', 'deploy'],
      'ui': ['user interface', 'frontend', 'component', 'react'],
      'ux': ['user experience', 'design', 'usability', 'interaction'],
      'mcp': ['model context protocol', 'claude', 'anthropic', 'ai'],
      'dxt': ['distribution executable', 'binary', 'package'],
      'npm': ['node package manager', 'package', 'module', 'dependency'],
      'git': ['version control', 'repository', 'commit', 'branch']
    };
    
    const lowerQuery = query.toLowerCase();
    
    for (const [term, expansions] of Object.entries(technicalExpansions)) {
      if (lowerQuery.includes(term)) {
        for (const expansion of expansions) {
          variations.push({
            query: query.replace(new RegExp(term, 'gi'), expansion),
            type: 'semantic-expansion',
            weight: 0.8,
            originalTerm: term,
            expansion
          });
        }
      }
    }
    
    // Common misspellings and abbreviations
    const commonVariations = {
      'config': ['configuration', 'setup', 'settings'],
      'auth': ['authentication', 'login', 'credentials'],
      'repo': ['repository', 'git repository'],
      'docs': ['documentation', 'readme', 'guide'],
      'env': ['environment', 'variables', 'settings'],
      'func': ['function', 'method'],
      'lib': ['library', 'package', 'module'],
      'impl': ['implementation', 'implement'],
      'spec': ['specification', 'test', 'requirement'],
      'perf': ['performance', 'optimization', 'speed']
    };
    
    for (const [abbrev, expansions] of Object.entries(commonVariations)) {
      const regex = new RegExp(`\\b${abbrev}\\b`, 'gi');
      if (regex.test(query)) {
        for (const expansion of expansions) {
          variations.push({
            query: query.replace(regex, expansion),
            type: 'abbreviation-expansion',
            weight: 0.85,
            originalAbbrev: abbrev,
            expansion
          });
        }
      }
    }
    
    return variations.slice(0, 5); // Limit to avoid query explosion
  }
  
  /**
   * Generate typo correction variations
   */
  generateTypoCorrectionVariations(query) {
    const variations = [];
    
    // Common programming typos
    const commonTypos = {
      'fucntion': 'function',
      'fucntion': 'function',
      'lenght': 'length',
      'widht': 'width',
      'heigth': 'height',
      'postion': 'position',
      'colum': 'column',
      'indext': 'index',
      'requrie': 'require',
      'improt': 'import',
      'exoprt': 'export',
      'conifg': 'config',
      'seeting': 'setting',
      'conection': 'connection',
      'authetication': 'authentication',
      'permision': 'permission',
      'databse': 'database',
      'respone': 'response',
      'reqest': 'request',
      'handeler': 'handler',
      'listner': 'listener',
      'compnent': 'component',
      'compoent': 'component'
    };
    
    const words = query.toLowerCase().split(/\s+/);
    let hasCorrection = false;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (commonTypos[word]) {
        const correctedWords = [...words];
        correctedWords[i] = commonTypos[word];
        variations.push({
          query: correctedWords.join(' '),
          type: 'typo-correction',
          weight: 0.9,
          originalWord: word,
          correction: commonTypos[word]
        });
        hasCorrection = true;
      }
    }
    
    // Character-level typo patterns (common keyboard mistakes)
    if (!hasCorrection) {
      const keyboardAdjacent = {
        'a': ['s', 'q', 'w'],
        's': ['a', 'd', 'w', 'e'],
        'd': ['s', 'f', 'e', 'r'],
        'f': ['d', 'g', 'r', 't'],
        'g': ['f', 'h', 't', 'y'],
        'h': ['g', 'j', 'y', 'u'],
        'j': ['h', 'k', 'u', 'i'],
        'k': ['j', 'l', 'i', 'o'],
        'l': ['k', 'o', 'p']
      };
      
      // Generate single-character substitutions for short queries
      if (query.length >= 3 && query.length <= 10) {
        const chars = query.toLowerCase().split('');
        for (let i = 0; i < chars.length; i++) {
          const adjacentChars = keyboardAdjacent[chars[i]] || [];
          for (const adjacent of adjacentChars.slice(0, 2)) { // Limit variations
            const corrected = [...chars];
            corrected[i] = adjacent;
            variations.push({
              query: corrected.join(''),
              type: 'keyboard-typo',
              weight: 0.7,
              position: i,
              original: chars[i],
              substitution: adjacent
            });
          }
        }
      }
    }
    
    return variations.slice(0, 3); // Limit to most likely corrections
  }
  
  /**
   * Generate context-aware variations based on hints
   */
  generateContextAwareVariations(query, contextHints) {
    const variations = [];
    
    if (!contextHints) return variations;
    
    // Domain-specific expansions
    if (contextHints.domain) {
      const domainTerms = {
        'development': ['code', 'programming', 'software', 'development'],
        'testing': ['test', 'spec', 'validation', 'quality'],
        'deployment': ['deploy', 'production', 'release', 'build'],
        'documentation': ['docs', 'readme', 'guide', 'manual'],
        'configuration': ['config', 'setup', 'settings', 'environment']
      };
      
      const terms = domainTerms[contextHints.domain] || [];
      for (const term of terms) {
        if (!query.toLowerCase().includes(term)) {
          variations.push({
            query: `${query} ${term}`,
            type: 'domain-context',
            weight: 0.8,
            domain: contextHints.domain,
            addedTerm: term
          });
        }
      }
    }
    
    // Recent activity context
    if (contextHints.recentActivity) {
      for (const activity of contextHints.recentActivity) {
        if (activity.includes(query)) {
          // Extract context words around the query
          const index = activity.toLowerCase().indexOf(query.toLowerCase());
          if (index !== -1) {
            const beforeWords = activity.substring(0, index).split(/\s+/).slice(-2);
            const afterWords = activity.substring(index + query.length).split(/\s+/).slice(0, 2);
            
            if (beforeWords.length > 0) {
              variations.push({
                query: `${beforeWords.join(' ')} ${query}`,
                type: 'context-before',
                weight: 0.75
              });
            }
            
            if (afterWords.length > 0) {
              variations.push({
                query: `${query} ${afterWords.join(' ')}`,
                type: 'context-after',
                weight: 0.75
              });
            }
          }
        }
      }
    }
    
    // Time-based context
    if (contextHints.timeframe) {
      const timeTerms = {
        'recent': ['today', 'latest', 'new', 'current'],
        'past': ['old', 'previous', 'earlier', 'before'],
        'urgent': ['urgent', 'critical', 'important', 'priority']
      };
      
      const terms = timeTerms[contextHints.timeframe] || [];
      for (const term of terms) {
        variations.push({
          query: `${term} ${query}`,
          type: 'time-context',
          weight: 0.7,
          timeframe: contextHints.timeframe,
          modifier: term
        });
      }
    }
    
    return variations.slice(0, 3); // Limit context variations
  }
  
  /**
   * Remove duplicate results and maintain best scores (enhanced)
   */
  deduplicateResults(results) {
    const bestResults = new Map();
    
    for (const result of results) {
      const existing = bestResults.get(result.id);
      
      // Use enhanced score if available, fallback to combined score
      const currentScore = result.enhancedScore || result.combinedScore;
      const existingScore = existing ? (existing.enhancedScore || existing.combinedScore) : 0;
      
      if (!existing || currentScore > existingScore) {
        // Merge multiple query variations into result metadata
        if (existing && existing.queryVariations) {
          result.queryVariations = [...existing.queryVariations, result.queryVariation];
        } else {
          result.queryVariations = [result.queryVariation];
        }
        
        bestResults.set(result.id, result);
      } else if (existing) {
        // Add this variation to the existing result
        if (!existing.queryVariations) {
          existing.queryVariations = [existing.queryVariation];
        }
        if (!existing.queryVariations.includes(result.queryVariation)) {
          existing.queryVariations.push(result.queryVariation);
        }
      }
    }
    
    return Array.from(bestResults.values())
      .sort((a, b) => {
        const scoreA = a.enhancedScore || a.combinedScore;
        const scoreB = b.enhancedScore || b.combinedScore;
        return scoreB - scoreA;
      });
  }
  
  /**
   * Check if a query would benefit from fuzzy matching
   */
  shouldUseFuzzyMatching(query, exactMatches = 0) {
    // Use fuzzy matching if:
    // 1. No exact matches found
    // 2. Query contains potential typos
    // 3. Query is short (might be abbreviated)
    // 4. Query contains technical terms
    
    if (exactMatches === 0) return true;
    
    const hasTypos = this.detectPotentialTypos(query);
    const isShort = query.length < 10;
    const hasTechnicalTerms = /\b(?:api|sdk|cli|json|xml|sql|dxt|mcp|rpc)\b/i.test(query);
    
    return hasTypos || isShort || hasTechnicalTerms;
  }
  
  /**
   * Detect potential typos in query
   */
  detectPotentialTypos(query) {
    // Simple heuristics for typo detection
    const indicators = [
      /\b\w*[bcdfghjklmnpqrstvwxyz]{3,}\w*\b/i, // Consonant clusters
      /\b\w*[aeiou]{3,}\w*\b/i, // Vowel clusters
      /\b\w{2,}\d+\w*\b/, // Mixed letters and numbers
      /\b[a-z]+[A-Z][a-z]*\b/ // Mixed case (but not camelCase)
    ];
    
    return indicators.some(pattern => pattern.test(query));
  }
  
  /**
   * Get fuzzy matching statistics for query analysis
   */
  getMatchingStats(memories, query) {
    const exactResults = this.searchMemories(memories, query, 'exact');
    const memoryResults = this.searchMemories(memories, query, 'memory');
    const typoResults = this.searchMemories(memories, query, 'typo');
    
    return {
      exactMatches: exactResults.length,
      memoryMatches: memoryResults.length,
      typoMatches: typoResults.length,
      totalMemories: memories.length,
      averageScores: {
        exact: exactResults.reduce((sum, r) => sum + r.fuzzyScore, 0) / exactResults.length || 0,
        memory: memoryResults.reduce((sum, r) => sum + r.fuzzyScore, 0) / memoryResults.length || 0,
        typo: typoResults.reduce((sum, r) => sum + r.fuzzyScore, 0) / typoResults.length || 0
      },
      shouldUseFuzzy: this.shouldUseFuzzyMatching(query, exactResults.length)
    };
  }
  
  /**
   * Format fuzzy search results for display
   */
  formatResults(results, query) {
    return results.map(result => {
      // Determine result icon based on search mode and score
      let icon = '🔤'; // Default keyword
      if (result.searchMode === 'exact' && result.fuzzyScore > 0.8) icon = '🎯';
      else if (result.searchMode === 'typo') icon = '🔧';
      else if (result.fuzzyScore > 0.9) icon = '⭐';
      
      return {
        ...result,
        displayIcon: icon,
        scoreDisplay: `${Math.round(result.fuzzyScore * 100)}%`,
        matchQuality: this.getMatchQuality(result.fuzzyScore),
        fuzzyInfo: {
          mode: result.searchMode,
          score: result.fuzzyScore,
          distance: result.fuzzyDistance,
          rank: result.fuzzyRank
        }
      };
    });
  }
  
  /**
   * Get human-readable match quality
   */
  getMatchQuality(score) {
    if (score >= 0.9) return 'excellent';
    if (score >= 0.8) return 'very good';
    if (score >= 0.7) return 'good';
    if (score >= 0.6) return 'fair';
    return 'poor';
  }
  
  /**
   * Claude Historian-inspired intelligent search
   * Combines fuzzy matching with context awareness and learning
   */
  intelligentSearch(memories, query, options = {}) {
    // Phase 1: Basic fuzzy search
    const basicResults = this.enhancedFuzzySearch(memories, query, {
      semanticExpansion: true,
      typoCorrection: true,
      contextHints: options.contextHints
    });
    
    // Phase 2: Apply Claude Historian patterns
    const historianEnhanced = this.applyHistorianPatterns(basicResults, query, options);
    
    // Phase 3: Learning and adaptation
    const adaptiveResults = this.applyAdaptiveLearning(historianEnhanced, query, options);
    
    // Phase 4: Final ranking and presentation
    return this.finalRankingAndFormatting(adaptiveResults, query, options);
  }
  
  /**
   * Apply Claude Historian-inspired patterns to improve results
   */
  applyHistorianPatterns(results, query, options = {}) {
    return results.map(result => {
      let historianScore = result.enhancedScore || result.combinedScore;
      
      // Pattern 1: Intent-based boosting
      const intent = this.detectQueryIntent(query);
      if (this.resultMatchesIntent(result, intent)) {
        historianScore *= 1.3;
      }
      
      // Pattern 2: Recency bias for certain query types
      if (this.shouldBoostRecent(query, intent)) {
        const recencyBoost = this.calculateRecencyBoost(result);
        historianScore *= recencyBoost;
      }
      
      // Pattern 3: Content type matching
      const preferredContentType = this.detectPreferredContentType(query);
      if (result.metadata?.content_type === preferredContentType) {
        historianScore *= 1.2;
      }
      
      // Pattern 4: Complexity matching
      const queryComplexity = this.assessQueryComplexity(query);
      if (result.complexity === queryComplexity) {
        historianScore *= 1.15;
      }
      
      // Pattern 5: Project context matching
      if (options.currentProject && result.project === options.currentProject) {
        historianScore *= 1.4;
      }
      
      return {
        ...result,
        historianScore,
        historianFactors: {
          intentMatch: this.resultMatchesIntent(result, intent),
          recencyBoost: this.shouldBoostRecent(query, intent),
          contentTypeMatch: result.metadata?.content_type === preferredContentType,
          complexityMatch: result.complexity === queryComplexity,
          projectMatch: options.currentProject && result.project === options.currentProject
        }
      };
    });
  }
  
  /**
   * Detect query intent using simple heuristics
   */
  detectQueryIntent(query) {
    const lowerQuery = query.toLowerCase();
    
    if (/\b(error|bug|fix|debug|issue|problem)\b/.test(lowerQuery)) return 'debug';
    if (/\b(how to|tutorial|guide|learn|example)\b/.test(lowerQuery)) return 'learn';
    if (/\b(config|setup|install|deploy)\b/.test(lowerQuery)) return 'configure';
    if (/\b(test|spec|validate|check)\b/.test(lowerQuery)) return 'test';
    if (/\b(api|endpoint|interface|service)\b/.test(lowerQuery)) return 'integrate';
    if (/\b(optimize|improve|performance|speed)\b/.test(lowerQuery)) return 'optimize';
    
    return 'general';
  }
  
  /**
   * Check if result matches detected intent
   */
  resultMatchesIntent(result, intent) {
    const content = (result.content || '').toLowerCase();
    
    const intentPatterns = {
      debug: /\b(error|exception|fix|debug|solution|resolved)\b/,
      learn: /\b(tutorial|guide|example|how to|step|instructions)\b/,
      configure: /\b(config|setup|install|deploy|settings|environment)\b/,
      test: /\b(test|spec|assert|validate|verification|coverage)\b/,
      integrate: /\b(api|endpoint|integration|service|connect|call)\b/,
      optimize: /\b(optimize|performance|improve|speed|efficient|fast)\b/
    };
    
    return intentPatterns[intent]?.test(content) || false;
  }
  
  /**
   * Determine if query should boost recent results
   */
  shouldBoostRecent(query, intent) {
    const recentKeywords = /\b(recent|latest|new|current|today|now|updated)\b/i;
    const debugIntent = intent === 'debug' || intent === 'configure';
    
    return recentKeywords.test(query) || debugIntent;
  }
  
  /**
   * Calculate recency boost factor
   */
  calculateRecencyBoost(result) {
    const now = Date.now();
    const resultTime = new Date(result.created || result.timestamp || now).getTime();
    const ageMs = now - resultTime;
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    
    // Boost recent content, especially for last 7 days
    if (ageDays <= 1) return 1.5;
    if (ageDays <= 7) return 1.3;
    if (ageDays <= 30) return 1.1;
    return 1.0;
  }
  
  /**
   * Detect preferred content type based on query
   */
  detectPreferredContentType(query) {
    const lowerQuery = query.toLowerCase();
    
    if (/\b(function|class|method|code|```)\b/.test(lowerQuery)) return 'code';
    if (/\b(structure|format|json|xml|yaml|data)\b/.test(lowerQuery)) return 'structured';
    return 'text';
  }
  
  /**
   * Assess query complexity
   */
  assessQueryComplexity(query) {
    const words = query.split(/\s+/).length;
    const hasComplexTerms = /\b(complex|advanced|detailed|comprehensive|multiple|various)\b/i.test(query);
    const hasTechnicalTerms = /\b(api|database|configuration|authentication|deployment|integration)\b/i.test(query);
    
    if (words > 8 || hasComplexTerms || hasTechnicalTerms) return 'high';
    if (words > 4 || hasTechnicalTerms) return 'medium';
    return 'low';
  }
  
  /**
   * Apply adaptive learning based on historical patterns
   */
  applyAdaptiveLearning(results, query, options = {}) {
    // Simulate learning from past successful searches
    // In a real implementation, this would use actual usage patterns
    
    return results.map(result => {
      let adaptiveScore = result.historianScore || result.enhancedScore || result.combinedScore;
      
      // Boost results from categories that have been useful before
      const successfulCategories = options.learningData?.successfulCategories || ['code', 'work'];
      if (successfulCategories.includes(result.category)) {
        adaptiveScore *= 1.1;
      }
      
      // Boost results with similar tags to previously successful searches
      const successfulTags = options.learningData?.successfulTags || [];
      const tagOverlap = (result.tags || []).filter(tag => successfulTags.includes(tag)).length;
      if (tagOverlap > 0) {
        adaptiveScore *= (1 + tagOverlap * 0.1);
      }
      
      // Penalize results that were previously ignored (low click-through)
      const ignoredIds = options.learningData?.ignoredResults || [];
      if (ignoredIds.includes(result.id)) {
        adaptiveScore *= 0.9;
      }
      
      return {
        ...result,
        adaptiveScore,
        adaptiveFactors: {
          categoryBoost: successfulCategories.includes(result.category),
          tagOverlap,
          previouslyIgnored: ignoredIds.includes(result.id)
        }
      };
    });
  }
  
  /**
   * Final ranking and formatting with enhanced metadata
   */
  finalRankingAndFormatting(results, query, options = {}) {
    // Sort by final adaptive score
    const sortedResults = results.sort((a, b) => {
      const scoreA = a.adaptiveScore || a.historianScore || a.enhancedScore || a.combinedScore;
      const scoreB = b.adaptiveScore || b.historianScore || b.enhancedScore || b.combinedScore;
      return scoreB - scoreA;
    });
    
    // Add search metadata and ranking info
    return sortedResults.map((result, index) => ({
      ...result,
      searchRank: index + 1,
      finalScore: result.adaptiveScore || result.historianScore || result.enhancedScore || result.combinedScore,
      searchMetadata: {
        originalQuery: query,
        matchedVariations: result.queryVariations || [result.queryVariation],
        searchMethod: 'intelligent-fuzzy',
        confidence: this.calculateConfidence(result),
        explanation: this.generateExplanation(result, query)
      }
    }));
  }
  
  /**
   * Calculate overall confidence in search result
   */
  calculateConfidence(result) {
    const baseScore = result.fuzzyScore || 0.5;
    const hasHistorianBoost = result.historianScore > (result.enhancedScore || result.combinedScore);
    const hasAdaptiveBoost = result.adaptiveScore > (result.historianScore || result.enhancedScore);
    
    let confidence = baseScore;
    if (hasHistorianBoost) confidence += 0.1;
    if (hasAdaptiveBoost) confidence += 0.1;
    if (result.searchMode === 'exact') confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * Generate human-readable explanation of why result was selected
   */
  generateExplanation(result, query) {
    const explanations = [];
    
    if (result.searchMode === 'exact') {
      explanations.push('Exact match found');
    } else if (result.fuzzyScore > 0.8) {
      explanations.push('Strong fuzzy match');
    } else {
      explanations.push('Partial match');
    }
    
    if (result.historianFactors?.intentMatch) {
      explanations.push('Matches query intent');
    }
    
    if (result.historianFactors?.projectMatch) {
      explanations.push('From current project');
    }
    
    if (result.historianFactors?.recencyBoost) {
      explanations.push('Recent content');
    }
    
    if (result.adaptiveFactors?.categoryBoost) {
      explanations.push('Relevant category');
    }
    
    if (result.queryVariations && result.queryVariations.length > 1) {
      explanations.push('Multiple query variations matched');
    }
    
    return explanations.join(', ') || 'Basic fuzzy match';
  }
}

export default FuzzyMatcher;