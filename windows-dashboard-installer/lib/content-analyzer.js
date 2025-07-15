/**
 * Content Analyzer for Auto-Categorization
 * Analyzes text content to suggest appropriate categories based on keywords, patterns, and existing data
 */

class ContentAnalyzer {
  constructor() {
    this.categoryPatterns = {
      code: {
        keywords: [
          'function', 'class', 'const', 'let', 'var', 'import', 'export', 'async', 'await',
          'react', 'node', 'javascript', 'typescript', 'python', 'java', 'rust', 'go',
          'api', 'database', 'sql', 'query', 'component', 'hook', 'props', 'state',
          'git', 'commit', 'branch', 'merge', 'pull request', 'repository',
          'bug', 'fix', 'error', 'debug', 'test', 'unit test', 'integration',
          'frontend', 'backend', 'fullstack', 'framework', 'library', 'npm', 'yarn',
          'docker', 'kubernetes', 'deployment', 'ci/cd', 'github', 'gitlab'
        ],
        patterns: [
          /```[\s\S]*?```/g, // Code blocks
          /`[^`]+`/g, // Inline code
          /\b[A-Z][a-zA-Z]*\(\)/g, // Function calls
          /\b(class|function|const|let|var|import|export)\s+\w+/g,
          /\.(js|ts|jsx|tsx|py|java|rs|go|cpp|c|h)$/g,
          /https?:\/\/github\.com/g,
          /\b\d+\.\d+\.\d+\b/g // Version numbers
        ],
        weight: 1.0
      },
      work: {
        keywords: [
          'project', 'meeting', 'deadline', 'milestone', 'sprint', 'scrum', 'agile',
          'client', 'customer', 'stakeholder', 'team', 'manager', 'lead',
          'requirements', 'specification', 'proposal', 'budget', 'timeline',
          'deliverable', 'task', 'assignment', 'responsibility', 'role',
          'presentation', 'report', 'documentation', 'planning', 'strategy',
          'review', 'feedback', 'approval', 'decision', 'action item',
          'email', 'slack', 'teams', 'zoom', 'calendar', 'schedule'
        ],
        patterns: [
          /\b(Q[1-4]|quarter|fiscal year)\b/gi,
          /\b(monday|tuesday|wednesday|thursday|friday|weekend)\b/gi,
          /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, // Dates
          /\b\d{1,2}:\d{2}\s*(AM|PM)\b/gi, // Times
          /\$\d+[,\d]*(\.\d{2})?\b/g, // Money amounts
          /@\w+/g // Email mentions or handles
        ],
        weight: 0.9
      },
      research: {
        keywords: [
          'study', 'research', 'analysis', 'data', 'findings', 'results',
          'hypothesis', 'theory', 'method', 'methodology', 'experiment',
          'survey', 'interview', 'observation', 'case study', 'literature review',
          'paper', 'article', 'journal', 'publication', 'citation',
          'statistics', 'correlation', 'significance', 'trend', 'pattern',
          'conclusion', 'recommendation', 'insight', 'discovery',
          'academic', 'university', 'professor', 'phd', 'thesis'
        ],
        patterns: [
          /\b\d+%\b/g, // Percentages
          /\bp\s*<\s*0\.\d+/gi, // P-values
          /\b(figure|table|chart)\s+\d+/gi,
          /\b(et al\.|ibid\.)\b/gi,
          /\[\d+\]/g, // Citation numbers
          /\b\d{4}\b/g // Years
        ],
        weight: 0.8
      },
      conversations: {
        keywords: [
          'said', 'told', 'asked', 'replied', 'responded', 'mentioned',
          'discussed', 'talked', 'spoke', 'conversation', 'chat', 'call',
          'meeting', 'interview', 'feedback', 'opinion', 'thought',
          'agreed', 'disagreed', 'decided', 'concluded', 'suggested',
          'recommended', 'advised', 'warned', 'explained', 'clarified'
        ],
        patterns: [
          /"[^"]*"/g, // Quoted text
          /\b(he|she|they|I|we)\s+(said|told|asked|replied)/gi,
          /\b(according to|as per|mentioned by)\b/gi,
          /\b(yesterday|today|tomorrow|last week|next week)\b/gi
        ],
        weight: 0.7
      },
      personal: {
        keywords: [
          'personal', 'private', 'family', 'friend', 'hobby', 'interest',
          'goal', 'plan', 'idea', 'thought', 'feeling', 'emotion',
          'health', 'fitness', 'diet', 'exercise', 'travel', 'vacation',
          'book', 'movie', 'music', 'game', 'sport', 'recipe',
          'shopping', 'purchase', 'buy', 'learn', 'skill', 'habit'
        ],
        patterns: [
          /\b(I|my|me|myself)\b/gi,
          /\b(want|need|like|love|hate|enjoy)\b/gi,
          /\b(birthday|anniversary|holiday)\b/gi
        ],
        weight: 0.6
      },
      preferences: {
        keywords: [
          'prefer', 'like', 'dislike', 'favorite', 'choice', 'option',
          'setting', 'configuration', 'default', 'custom', 'personalized',
          'theme', 'color', 'font', 'layout', 'style', 'format',
          'shortcut', 'hotkey', 'workflow', 'process', 'routine'
        ],
        patterns: [
          /\b(always|never|usually|typically|often|rarely)\b/gi,
          /\b(I prefer|I like|I use|I set)\b/gi,
          /\b(default|custom|setting|config)\b/gi
        ],
        weight: 0.5
      }
    };

    this.categoryDescriptions = {
      code: 'Programming, development, technical implementation, and software engineering',
      work: 'Professional tasks, meetings, projects, and business-related activities',
      research: 'Studies, analysis, data collection, academic work, and investigative content',
      conversations: 'Discussions, meetings, interviews, and interpersonal communications',
      personal: 'Individual activities, hobbies, personal goals, and private matters',
      preferences: 'User settings, choices, customizations, and personal workflows'
    };
  }

  /**
   * Analyze content and suggest categories with confidence scores
   * @param {string} content - Text content to analyze
   * @param {Object} options - Analysis options
   * @returns {Array} Array of category suggestions with scores
   */
  suggestCategories(content, options = {}) {
    if (!content || typeof content !== 'string') {
      return [];
    }

    const { maxSuggestions = 3, minConfidence = 0.1 } = options;
    const scores = {};

    // Initialize scores
    Object.keys(this.categoryPatterns).forEach(category => {
      scores[category] = 0;
    });

    const contentLower = content.toLowerCase();
    const words = this.tokenizeContent(content);

    // Score based on keywords
    for (const [category, config] of Object.entries(this.categoryPatterns)) {
      let keywordScore = 0;
      
      // Check keywords
      config.keywords.forEach(keyword => {
        const occurrences = this.countOccurrences(contentLower, keyword.toLowerCase());
        keywordScore += occurrences * 0.1;
      });

      // Check patterns
      config.patterns.forEach(pattern => {
        const matches = content.match(pattern) || [];
        keywordScore += matches.length * 0.2;
      });

      // Apply category weight
      scores[category] = keywordScore * config.weight;
    }

    // Apply content-specific scoring rules
    this.applyContentSpecificRules(content, words, scores);

    // Convert to suggestions array
    const suggestions = Object.entries(scores)
      .map(([category, score]) => ({
        category,
        confidence: Math.min(score, 1.0), // Cap at 1.0
        description: this.categoryDescriptions[category],
        reasons: this.generateReasons(category, content, score)
      }))
      .filter(suggestion => suggestion.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);

    return suggestions;
  }

  /**
   * Apply content-specific scoring rules
   */
  applyContentSpecificRules(content, words, scores) {
    const contentLength = content.length;
    const wordCount = words.length;

    // Code detection rules
    if (this.hasCodeCharacteristics(content)) {
      scores.code += 0.3;
    }

    // Technical documentation patterns
    if (this.hasTechnicalDocumentationPatterns(content)) {
      scores.code += 0.2;
    }

    // Meeting/work patterns
    if (this.hasMeetingPatterns(content)) {
      scores.work += 0.3;
      scores.conversations += 0.2;
    }

    // Research patterns
    if (this.hasResearchPatterns(content)) {
      scores.research += 0.3;
    }

    // Personal indicators
    if (this.hasPersonalIndicators(content)) {
      scores.personal += 0.2;
    }

    // Preference indicators
    if (this.hasPreferenceIndicators(content)) {
      scores.preferences += 0.3;
    }

    // Length-based adjustments
    if (contentLength > 2000) {
      scores.research += 0.1; // Longer content often research
      scores.code += 0.1; // Or detailed code
    }

    if (wordCount < 20) {
      scores.preferences += 0.1; // Short content often preferences
    }
  }

  /**
   * Detect code characteristics
   */
  hasCodeCharacteristics(content) {
    const codeIndicators = [
      /```[\s\S]*?```/g, // Code blocks
      /\b(function|class|const|let|var|if|else|for|while|return)\s*[\(\{]/g,
      /[{}();]/g, // Code punctuation
      /\b\w+\.\w+\(/g, // Method calls
      /\/\/.*$/gm, // Comments
      /\/\*[\s\S]*?\*\//g // Block comments
    ];

    return codeIndicators.some(pattern => pattern.test(content));
  }

  /**
   * Detect technical documentation patterns
   */
  hasTechnicalDocumentationPatterns(content) {
    const techDocPatterns = [
      /\b(API|SDK|CLI|GUI|URL|HTTP|JSON|XML|SQL)\b/gi,
      /\b(install|configure|setup|deploy|build|run)\b/gi,
      /\b(version|v\d+\.\d+|\d+\.\d+\.\d+)\b/gi,
      /\b(documentation|docs|readme|guide|tutorial)\b/gi
    ];

    return techDocPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect meeting/work patterns
   */
  hasMeetingPatterns(content) {
    const meetingPatterns = [
      /\b(meeting|call|standup|retrospective|planning)\b/gi,
      /\b(agenda|action items?|follow[- ]?up|next steps?)\b/gi,
      /\b(attendees?|participants?|stakeholders?)\b/gi,
      /\b\d{1,2}:\d{2}\s*(AM|PM)\b/gi // Time mentions
    ];

    return meetingPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect research patterns
   */
  hasResearchPatterns(content) {
    const researchPatterns = [
      /\b(hypothesis|methodology|analysis|findings|conclusions?)\b/gi,
      /\b(study|research|investigation|survey|experiment)\b/gi,
      /\b(data|statistics|metrics|results|insights?)\b/gi,
      /\b\d+%|\bp\s*[<>=]\s*0\.\d+/gi // Statistics
    ];

    return researchPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect personal indicators
   */
  hasPersonalIndicators(content) {
    const personalPatterns = [
      /\b(I|my|me|myself|personally)\b/gi,
      /\b(family|friend|hobby|interest|goal|plan)\b/gi,
      /\b(weekend|vacation|birthday|anniversary)\b/gi
    ];

    return personalPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Detect preference indicators
   */
  hasPreferenceIndicators(content) {
    const preferencePatterns = [
      /\b(prefer|like|dislike|favorite|choice)\b/gi,
      /\b(setting|config|configuration|default|custom)\b/gi,
      /\b(always|never|usually|typically)\b/gi,
      /\b(theme|color|font|layout|style)\b/gi
    ];

    return preferencePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Generate reasons for category suggestion
   */
  generateReasons(category, content, score) {
    const reasons = [];
    const config = this.categoryPatterns[category];

    // Check which keywords were found
    const foundKeywords = config.keywords.filter(keyword => 
      content.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (foundKeywords.length > 0) {
      const keywordsList = foundKeywords.slice(0, 3).join(', ');
      reasons.push(`Contains ${category}-related keywords: ${keywordsList}`);
    }

    // Check which patterns matched
    const matchedPatterns = config.patterns.filter(pattern => 
      pattern.test(content)
    );
    
    if (matchedPatterns.length > 0) {
      reasons.push(`Matches ${category} content patterns`);
    }

    // Add confidence indicator
    if (score > 0.7) {
      reasons.push('High confidence match');
    } else if (score > 0.4) {
      reasons.push('Moderate confidence match');
    } else {
      reasons.push('Low confidence match');
    }

    return reasons;
  }

  /**
   * Tokenize content into words
   */
  tokenizeContent(content) {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  /**
   * Count occurrences of a term in content
   */
  countOccurrences(content, term) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = content.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Learn from existing categorized content to improve suggestions
   * @param {Array} memories - Array of existing memories with categories
   */
  learnFromExistingData(memories) {
    const categoryStats = {};
    
    memories.forEach(memory => {
      if (!memory.category || !memory.content) return;
      
      if (!categoryStats[memory.category]) {
        categoryStats[memory.category] = {
          count: 0,
          commonWords: {},
          patterns: []
        };
      }
      
      categoryStats[memory.category].count++;
      
      // Extract common words for this category
      const words = this.tokenizeContent(memory.content);
      words.forEach(word => {
        if (word.length > 3) { // Only meaningful words
          categoryStats[memory.category].commonWords[word] = 
            (categoryStats[memory.category].commonWords[word] || 0) + 1;
        }
      });
    });

    // Update keyword weights based on learned data
    Object.entries(categoryStats).forEach(([category, stats]) => {
      if (stats.count < 3) return; // Need minimum examples
      
      const topWords = Object.entries(stats.commonWords)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([word]) => word);
      
      // Add high-frequency words as learned keywords
      if (this.categoryPatterns[category]) {
        topWords.forEach(word => {
          if (!this.categoryPatterns[category].keywords.includes(word)) {
            this.categoryPatterns[category].keywords.push(word);
          }
        });
      }
    });

    return categoryStats;
  }

  /**
   * Get category statistics
   */
  getCategoryStats() {
    return {
      categories: Object.keys(this.categoryPatterns).map(category => ({
        name: category,
        description: this.categoryDescriptions[category],
        keywordCount: this.categoryPatterns[category].keywords.length,
        patternCount: this.categoryPatterns[category].patterns.length,
        weight: this.categoryPatterns[category].weight
      }))
    };
  }
}

export { ContentAnalyzer };