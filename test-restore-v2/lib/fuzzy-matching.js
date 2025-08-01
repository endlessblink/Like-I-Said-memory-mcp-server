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
  enhancedFuzzySearch(memories, query) {
    const enhancedQueries = this.generateQueryVariations(query);
    const allResults = [];
    
    // Search with each query variation
    for (const enhancedQuery of enhancedQueries) {
      const results = this.multiModeSearch(memories, enhancedQuery.query);
      
      // Add variation info to results
      results.forEach(result => {
        result.queryVariation = enhancedQuery.type;
        result.originalQuery = query;
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
   * Remove duplicate results and maintain best scores
   */
  deduplicateResults(results) {
    const bestResults = new Map();
    
    for (const result of results) {
      const existing = bestResults.get(result.id);
      
      if (!existing || result.combinedScore > existing.combinedScore) {
        bestResults.set(result.id, result);
      }
    }
    
    return Array.from(bestResults.values())
      .sort((a, b) => b.combinedScore - a.combinedScore);
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
}

export default FuzzyMatcher;