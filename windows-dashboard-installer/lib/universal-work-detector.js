/**
 * Universal Work Pattern Detection System
 * Automatically detects and captures significant work across all domains
 */

export class UniversalWorkDetector {
  constructor() {
    this.activeSessions = new Map();
    this.globalContext = {
      currentDomain: 'unknown',
      workType: 'general',
      complexity: 'low',
      importance: 'medium'
    };
    
    // Universal work patterns that apply across all domains
    this.universalPatterns = {
      problemSolving: {
        indicators: ['error', 'failed', 'not working', 'issue', 'problem', 'broken', 'trouble', 'debug'],
        sequence: ['search', 'try', 'test', 'retry', 'success', 'fix', 'resolve'],
        threshold: 3, // 3+ attempts indicates significant work
        importance: 'high'
      },
      implementation: {
        indicators: ['create', 'build', 'implement', 'develop', 'write', 'code', 'setup', 'configure'],
        sequence: ['plan', 'code', 'test', 'deploy', 'verify', 'document'],
        threshold: 2, // 2+ files or significant changes
        importance: 'high'
      },
      configuration: {
        indicators: ['setup', 'configure', 'install', 'settings', 'auth', 'deploy', 'environment'],
        sequence: ['install', 'configure', 'test', 'troubleshoot', 'working'],
        threshold: 1, // Any working configuration is significant
        importance: 'medium'
      },
      research: {
        indicators: ['how to', 'what is', 'best way', 'compare', 'evaluate', 'learn', 'understand'],
        sequence: ['search', 'read', 'test', 'compare', 'conclude', 'decide'],
        threshold: 5, // 5+ searches indicates research session
        importance: 'medium'
      },
      workflow: {
        indicators: ['automate', 'script', 'process', 'workflow', 'pipeline', 'batch', 'schedule'],
        sequence: ['design', 'implement', 'test', 'deploy', 'monitor'],
        threshold: 2, // 2+ automation steps
        importance: 'high'
      }
    };
    
    // Multi-domain detection
    this.domains = {
      'software-development': {
        keywords: ['code', 'programming', 'development', 'software', 'app', 'api', 'framework'],
        tools: ['git', 'npm', 'pip', 'docker', 'kubernetes', 'node', 'python', 'javascript'],
        patterns: ['build', 'test', 'deploy', 'debug', 'refactor', 'optimize']
      },
      'system-administration': {
        keywords: ['server', 'network', 'database', 'security', 'backup', 'infrastructure'],
        tools: ['ssh', 'nginx', 'apache', 'mysql', 'postgres', 'redis', 'linux'],
        patterns: ['configure', 'monitor', 'troubleshoot', 'optimize', 'secure', 'backup']
      },
      'data-science': {
        keywords: ['data', 'analysis', 'machine learning', 'ai', 'model', 'dataset', 'training'],
        tools: ['python', 'jupyter', 'pandas', 'tensorflow', 'pytorch', 'sklearn', 'numpy'],
        patterns: ['analyze', 'train', 'evaluate', 'visualize', 'predict', 'clean']
      },
      'content-creation': {
        keywords: ['content', 'writing', 'design', 'media', 'documentation', 'blog', 'article'],
        tools: ['markdown', 'html', 'css', 'photoshop', 'video', 'audio', 'cms'],
        patterns: ['create', 'edit', 'publish', 'review', 'optimize', 'distribute']
      },
      'devops': {
        keywords: ['deployment', 'ci/cd', 'automation', 'infrastructure', 'monitoring', 'scaling'],
        tools: ['docker', 'kubernetes', 'jenkins', 'github-actions', 'terraform', 'ansible'],
        patterns: ['deploy', 'automate', 'monitor', 'scale', 'secure', 'optimize']
      },
      'ai-ml': {
        keywords: ['artificial intelligence', 'machine learning', 'neural network', 'deep learning', 'nlp'],
        tools: ['comfyui', 'stable-diffusion', 'flux', 'pytorch', 'tensorflow', 'huggingface'],
        patterns: ['train', 'fine-tune', 'generate', 'inference', 'optimize', 'deploy']
      }
    };
    
    // Time thresholds for different work types
    this.timeThresholds = {
      quickTask: 5 * 60 * 1000,      // 5 minutes - simple operations
      significantWork: 15 * 60 * 1000, // 15 minutes - worth capturing
      majorSession: 30 * 60 * 1000,    // 30 minutes - definitely capture
      extended: 60 * 60 * 1000         // 1 hour - create detailed summary
    };
    
    // Content analysis patterns
    this.contentPatterns = {
      technical: /\b(error|exception|failed|config|setup|install|debug|fix|solution|implement|build|deploy)\b/i,
      success: /\b(working|success|fixed|solved|completed|done|resolved|finished|implemented|deployed)\b/i,
      frustration: /\b(still|again|why|how|can't|won't|not working|failed again|keeps failing)\b/i,
      discovery: /\b(found|discovered|realized|learned|turns out|figured out|breakthrough|solution)\b/i,
      complexity: /\b(complex|complicated|difficult|challenging|multiple|various|several|many)\b/i
    };
  }
  
  /**
   * Main detection method - analyzes any activity for work patterns
   */
  detectWorkPattern(activity) {
    // Classify the activity
    const classification = this.classifyActivity(activity);
    
    // Get or create session for this work pattern
    const session = this.getOrCreateSession(classification);
    
    // Add activity to session
    session.addActivity(activity, classification);
    
    // Check if we should capture this session
    if (this.shouldCapture(session)) {
      return this.createUniversalMemory(session);
    }
    
    return null;
  }
  
  /**
   * Classify any activity to determine work pattern and domain
   */
  classifyActivity(activity) {
    const content = this.extractContent(activity);
    const domain = this.detectDomain(content);
    const workType = this.detectWorkType(content);
    const complexity = this.assessComplexity(content);
    const importance = this.calculateImportance(content, workType);
    
    return {
      domain,
      workType,
      complexity,
      importance,
      content,
      timestamp: Date.now(),
      indicators: this.extractIndicators(content)
    };
  }
  
  /**
   * Extract meaningful content from activity
   */
  extractContent(activity) {
    if (typeof activity === 'string') {
      return activity;
    }
    
    if (activity.input) {
      return JSON.stringify(activity.input);
    }
    
    if (activity.args) {
      return JSON.stringify(activity.args);
    }
    
    return activity.toString();
  }
  
  /**
   * Detect domain based on content analysis
   */
  detectDomain(content) {
    const scores = {};
    
    // Score each domain based on keyword matches
    for (const [domain, config] of Object.entries(this.domains)) {
      scores[domain] = 0;
      
      // Check keywords
      for (const keyword of config.keywords) {
        if (content.toLowerCase().includes(keyword)) {
          scores[domain] += 2;
        }
      }
      
      // Check tools
      for (const tool of config.tools) {
        if (content.toLowerCase().includes(tool)) {
          scores[domain] += 3;
        }
      }
      
      // Check patterns
      for (const pattern of config.patterns) {
        if (content.toLowerCase().includes(pattern)) {
          scores[domain] += 1;
        }
      }
    }
    
    // Return domain with highest score
    const sortedDomains = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);
    
    return sortedDomains[0]?.[0] || 'general';
  }
  
  /**
   * Detect work type based on universal patterns
   */
  detectWorkType(content) {
    const scores = {};
    
    for (const [type, config] of Object.entries(this.universalPatterns)) {
      scores[type] = 0;
      
      // Check indicators
      for (const indicator of config.indicators) {
        if (content.toLowerCase().includes(indicator)) {
          scores[type] += 2;
        }
      }
      
      // Check sequence patterns
      for (const step of config.sequence) {
        if (content.toLowerCase().includes(step)) {
          scores[type] += 1;
        }
      }
    }
    
    // Return type with highest score
    const sortedTypes = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .filter(([, score]) => score > 0);
    
    return sortedTypes[0]?.[0] || 'general';
  }
  
  /**
   * Assess complexity based on content patterns
   */
  assessComplexity(content) {
    let complexityScore = 0;
    
    // Check for complexity indicators
    if (this.contentPatterns.complexity.test(content)) {
      complexityScore += 2;
    }
    
    // Check for technical terms
    if (this.contentPatterns.technical.test(content)) {
      complexityScore += 1;
    }
    
    // Check for frustration (indicates difficulty)
    if (this.contentPatterns.frustration.test(content)) {
      complexityScore += 2;
    }
    
    // Length-based complexity
    if (content.length > 500) complexityScore += 1;
    if (content.length > 1000) complexityScore += 1;
    
    // Map to complexity levels
    if (complexityScore >= 4) return 'high';
    if (complexityScore >= 2) return 'medium';
    return 'low';
  }
  
  /**
   * Calculate importance based on work type and content
   */
  calculateImportance(content, workType) {
    let importance = this.universalPatterns[workType]?.importance || 'medium';
    
    // Boost importance for success indicators
    if (this.contentPatterns.success.test(content)) {
      importance = 'high';
    }
    
    // Boost importance for discoveries
    if (this.contentPatterns.discovery.test(content)) {
      importance = 'high';
    }
    
    return importance;
  }
  
  /**
   * Extract key indicators from content
   */
  extractIndicators(content) {
    const indicators = [];
    
    for (const [pattern, regex] of Object.entries(this.contentPatterns)) {
      if (regex.test(content)) {
        indicators.push(pattern);
      }
    }
    
    return indicators;
  }
  
  /**
   * Get or create session for work pattern
   */
  getOrCreateSession(classification) {
    const sessionKey = `${classification.domain}-${classification.workType}`;
    
    if (!this.activeSessions.has(sessionKey)) {
      this.activeSessions.set(sessionKey, new WorkSession(classification));
    }
    
    return this.activeSessions.get(sessionKey);
  }
  
  /**
   * Determine if session should be captured
   */
  shouldCapture(session) {
    const duration = Date.now() - session.startTime;
    const activityCount = session.activities.length;
    const hasSuccess = session.hasSuccessIndicators();
    const complexity = session.getComplexity();
    
    // Always capture high-importance successful work
    if (session.importance === 'high' && hasSuccess) {
      return true;
    }
    
    // Capture based on duration thresholds
    if (duration > this.timeThresholds.significantWork && activityCount >= 3) {
      return true;
    }
    
    // Capture complex work faster
    if (complexity === 'high' && activityCount >= 2) {
      return true;
    }
    
    // Capture extended sessions regardless
    if (duration > this.timeThresholds.extended) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Create universal memory from session
   */
  createUniversalMemory(session) {
    const memory = {
      title: this.generateTitle(session),
      content: this.formatContent(session),
      category: this.mapCategoryFromDomain(session.domain),
      tags: this.generateTags(session),
      priority: session.importance,
      metadata: {
        domain: session.domain,
        workType: session.workType,
        complexity: session.getComplexity(),
        duration: Date.now() - session.startTime,
        activityCount: session.activities.length,
        outcome: session.getOutcome(),
        toolsUsed: session.getToolsUsed(),
        patterns: session.getPatterns()
      }
    };
    
    // Remove session after capturing
    this.activeSessions.delete(session.key);
    
    return memory;
  }
  
  /**
   * Generate descriptive title for session
   */
  generateTitle(session) {
    const domain = session.domain.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const workType = session.workType.replace(/([A-Z])/g, ' $1').toLowerCase();
    const outcome = session.getOutcome();
    
    return `${domain}: ${workType} ${outcome}`;
  }
  
  /**
   * Format session content for memory
   */
  formatContent(session) {
    const activities = session.activities.map(a => `- ${a.summary}`).join('\n');
    const duration = Math.round((Date.now() - session.startTime) / 1000 / 60);
    
    return `## ${session.workType} Session Summary

**Domain**: ${session.domain}
**Duration**: ${duration} minutes
**Complexity**: ${session.getComplexity()}
**Outcome**: ${session.getOutcome()}

### Activities
${activities}

### Key Insights
${session.getKeyInsights()}

### Tools Used
${session.getToolsUsed().join(', ')}

### Patterns Detected
${session.getPatterns().join(', ')}
`;
  }
  
  /**
   * Generate tags for session
   */
  generateTags(session) {
    const tags = [
      session.domain,
      session.workType,
      session.getComplexity(),
      session.getOutcome()
    ];
    
    // Add domain-specific tags
    if (this.domains[session.domain]) {
      tags.push(...this.domains[session.domain].tools.filter(tool => 
        session.activities.some(a => a.content.includes(tool))
      ).slice(0, 3));
    }
    
    return tags.filter(Boolean);
  }
  
  /**
   * Map domain to memory category
   */
  mapCategoryFromDomain(domain) {
    const mapping = {
      'software-development': 'code',
      'system-administration': 'work',
      'data-science': 'research',
      'content-creation': 'personal',
      'devops': 'code',
      'ai-ml': 'research'
    };
    
    return mapping[domain] || 'work';
  }
}

/**
 * Work Session class to track related activities
 */
class WorkSession {
  constructor(classification) {
    this.domain = classification.domain;
    this.workType = classification.workType;
    this.importance = classification.importance;
    this.startTime = Date.now();
    this.activities = [];
    this.indicators = new Set();
    this.tools = new Set();
    this.patterns = new Set();
  }
  
  addActivity(activity, classification) {
    this.activities.push({
      activity,
      classification,
      timestamp: Date.now(),
      summary: this.extractSummary(activity),
      content: classification.content
    });
    
    // Update session indicators
    classification.indicators.forEach(i => this.indicators.add(i));
    
    // Extract tools and patterns
    this.extractToolsAndPatterns(classification.content);
  }
  
  extractSummary(activity) {
    if (typeof activity === 'string') {
      return activity.length > 100 ? activity.substring(0, 100) + '...' : activity;
    }
    
    if (activity.tool) {
      return `Used ${activity.tool}`;
    }
    
    return 'Activity performed';
  }
  
  extractToolsAndPatterns(content) {
    // Extract tools mentioned
    for (const [domain, config] of Object.entries(this.domains || {})) {
      for (const tool of config.tools) {
        if (content.toLowerCase().includes(tool)) {
          this.tools.add(tool);
        }
      }
    }
    
    // Extract patterns
    for (const [pattern, regex] of Object.entries({
      success: /\b(working|success|fixed|solved|completed)\b/i,
      problem: /\b(error|failed|issue|problem|broken)\b/i,
      implementation: /\b(create|build|implement|develop)\b/i,
      configuration: /\b(setup|configure|install|settings)\b/i
    })) {
      if (regex.test(content)) {
        this.patterns.add(pattern);
      }
    }
  }
  
  hasSuccessIndicators() {
    return this.indicators.has('success') || this.indicators.has('discovery');
  }
  
  getComplexity() {
    const complexityScores = this.activities.map(a => a.classification.complexity);
    const highCount = complexityScores.filter(c => c === 'high').length;
    const mediumCount = complexityScores.filter(c => c === 'medium').length;
    
    if (highCount > 0) return 'high';
    if (mediumCount > 0) return 'medium';
    return 'low';
  }
  
  getOutcome() {
    if (this.hasSuccessIndicators()) return 'successful';
    if (this.indicators.has('frustration')) return 'challenging';
    return 'in-progress';
  }
  
  getToolsUsed() {
    return Array.from(this.tools);
  }
  
  getPatterns() {
    return Array.from(this.patterns);
  }
  
  getKeyInsights() {
    const insights = [];
    
    if (this.hasSuccessIndicators()) {
      insights.push('Successfully completed objectives');
    }
    
    if (this.indicators.has('discovery')) {
      insights.push('Made important discoveries');
    }
    
    if (this.getComplexity() === 'high') {
      insights.push('Complex work requiring multiple steps');
    }
    
    return insights.join(', ') || 'Work completed';
  }
}

export default UniversalWorkDetector;