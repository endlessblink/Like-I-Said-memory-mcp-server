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
    
    // Enhanced universal work patterns with real-time detection
    this.universalPatterns = {
      problemSolving: {
        indicators: ['error', 'failed', 'not working', 'issue', 'problem', 'broken', 'trouble', 'debug', 'crash', 'bug', 'exception', 'timeout', 'undefined', 'null'],
        sequence: ['search', 'try', 'test', 'retry', 'success', 'fix', 'resolve', 'workaround', 'patch'],
        threshold: 2, // Lowered for faster detection
        importance: 'high',
        realTimeSignals: ['multiple attempts', 'error resolution', 'stack trace analysis']
      },
      implementation: {
        indicators: ['create', 'build', 'implement', 'develop', 'write', 'code', 'setup', 'configure', 'add', 'feature', 'function', 'component', 'module', 'class'],
        sequence: ['plan', 'code', 'test', 'deploy', 'verify', 'document', 'commit', 'push'],
        threshold: 1, // Capture even single implementations
        importance: 'high',
        realTimeSignals: ['file creation', 'code blocks', 'git operations']
      },
      configuration: {
        indicators: ['setup', 'configure', 'install', 'settings', 'auth', 'deploy', 'environment', 'env', 'config', 'yml', 'json', 'ini', 'toml', 'dotenv'],
        sequence: ['install', 'configure', 'test', 'troubleshoot', 'working', 'validate'],
        threshold: 1, // Any working configuration is significant
        importance: 'high', // Elevated importance
        realTimeSignals: ['config file edits', 'environment variables', 'successful connection']
      },
      research: {
        indicators: ['how to', 'what is', 'best way', 'compare', 'evaluate', 'learn', 'understand', 'why', 'when', 'should', 'could', 'would', 'difference between'],
        sequence: ['search', 'read', 'test', 'compare', 'conclude', 'decide', 'document'],
        threshold: 3, // Lowered for better capture
        importance: 'medium',
        realTimeSignals: ['multiple searches', 'documentation reading', 'comparison analysis']
      },
      workflow: {
        indicators: ['automate', 'script', 'process', 'workflow', 'pipeline', 'batch', 'schedule', 'cron', 'task', 'job', 'trigger', 'webhook'],
        sequence: ['design', 'implement', 'test', 'deploy', 'monitor', 'optimize'],
        threshold: 1, // Capture automation early
        importance: 'high',
        realTimeSignals: ['script creation', 'automation testing', 'scheduled execution']
      },
      optimization: {
        indicators: ['optimize', 'performance', 'speed', 'slow', 'fast', 'improve', 'enhance', 'refactor', 'reduce', 'bundle', 'cache', 'lazy', 'async'],
        sequence: ['profile', 'analyze', 'optimize', 'test', 'measure', 'deploy'],
        threshold: 1,
        importance: 'high',
        realTimeSignals: ['performance metrics', 'before/after comparison', 'bundle size reduction']
      },
      testing: {
        indicators: ['test', 'jest', 'mocha', 'cypress', 'unit', 'integration', 'e2e', 'coverage', 'assert', 'expect', 'should', 'mock', 'stub'],
        sequence: ['write test', 'run', 'debug', 'fix', 'pass', 'coverage'],
        threshold: 1,
        importance: 'high',
        realTimeSignals: ['test file creation', 'test execution', 'coverage reports']
      },
      documentation: {
        indicators: ['document', 'readme', 'docs', 'comment', 'explain', 'describe', 'guide', 'tutorial', 'api', 'reference'],
        sequence: ['outline', 'write', 'review', 'publish', 'update'],
        threshold: 1,
        importance: 'medium',
        realTimeSignals: ['markdown editing', 'comment blocks', 'readme updates']
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
    
    // Time thresholds for different work types (ENHANCED: More aggressive capture)
    this.timeThresholds = {
      quickTask: 2 * 60 * 1000,       // 2 minutes - reduced from 5 for faster capture
      significantWork: 5 * 60 * 1000,  // 5 minutes - reduced from 15 for proactive capture
      majorSession: 15 * 60 * 1000,    // 15 minutes - reduced from 30 for task creation
      extended: 30 * 60 * 1000,        // 30 minutes - reduced from 60 for detailed summary
      taskCreationThreshold: 3 * 60 * 1000 // 3 minutes - new: create tasks for sustained work
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
   * Main detection method - analyzes any activity for work patterns (ENHANCED: with task creation)
   */
  detectWorkPattern(activity) {
    // Classify the activity
    const classification = this.classifyActivity(activity);
    
    // Get or create session for this work pattern
    const session = this.getOrCreateSession(classification);
    
    // Add activity to session
    session.addActivity(activity, classification);
    
    // Real-time signal detection
    this.detectRealTimeSignals(session, activity, classification);
    
    // Enhanced return object to support both memory and task creation
    const detectionResult = {
      memory: null,
      task: null,
      sessionInfo: {
        duration: Date.now() - session.startTime,
        activityCount: session.activities.length,
        complexity: session.getComplexity(),
        momentum: session.getMomentum(),
        signals: Array.from(session.realTimeSignals)
      }
    };
    
    // Check if we should capture this session as memory
    if (this.shouldCapture(session)) {
      detectionResult.memory = this.createUniversalMemory(session);
    }
    
    // ENHANCED: Check if we should create a task for multi-step work
    if (this.shouldCreateTask(session)) {
      detectionResult.task = this.createUniversalTask(session);
    }
    
    // Return memory or task or both
    if (detectionResult.memory || detectionResult.task) {
      return detectionResult;
    }
    
    return null;
  }
  
  /**
   * Detect real-time signals that indicate significant work
   */
  detectRealTimeSignals(session, activity, classification) {
    const signals = [];
    
    // Check for pattern-specific real-time signals
    const pattern = this.universalPatterns[classification.workType];
    if (pattern?.realTimeSignals) {
      for (const signal of pattern.realTimeSignals) {
        if (this.matchesRealTimeSignal(activity, signal)) {
          signals.push(signal);
          session.addRealTimeSignal(signal);
        }
      }
    }
    
    // Detect activity bursts (multiple activities in short time)
    if (session.activities.length > 1) {
      const lastActivity = session.activities[session.activities.length - 2];
      const timeDiff = Date.now() - lastActivity.timestamp;
      if (timeDiff < 30000) { // Within 30 seconds
        signals.push('rapid-activity');
        session.addRealTimeSignal('rapid-activity');
      }
    }
    
    // Detect context switches (changing work types)
    if (session.previousWorkType && session.previousWorkType !== classification.workType) {
      signals.push('context-switch');
      session.addRealTimeSignal('context-switch');
    }
    session.previousWorkType = classification.workType;
    
    // Detect breakthrough moments (error → success pattern)
    if (classification.indicators.includes('success') && session.hasErrorHistory) {
      signals.push('breakthrough');
      session.addRealTimeSignal('breakthrough');
      session.importance = 'high'; // Elevate importance
    }
    
    // Track error history for breakthrough detection
    if (classification.indicators.includes('frustration') || classification.indicators.includes('technical')) {
      session.hasErrorHistory = true;
    }
    
    return signals;
  }
  
  /**
   * Check if activity matches a real-time signal pattern
   */
  matchesRealTimeSignal(activity, signal) {
    const activityStr = JSON.stringify(activity).toLowerCase();
    const signalLower = signal.toLowerCase();
    
    // Direct match
    if (activityStr.includes(signalLower)) {
      return true;
    }
    
    // Specific signal patterns
    switch(signal) {
      case 'file creation':
        return activity.tool === 'Write' || activity.tool === 'MultiEdit';
      case 'code blocks':
        return activityStr.includes('```') || activityStr.includes('function') || activityStr.includes('class');
      case 'git operations':
        return activity.tool === 'Bash' && activityStr.includes('git');
      case 'test execution':
        return activityStr.includes('test') || activityStr.includes('jest') || activityStr.includes('npm test');
      case 'error resolution':
        return activityStr.includes('fixed') || activityStr.includes('resolved') || activityStr.includes('working');
      case 'successful connection':
        return activityStr.includes('connected') || activityStr.includes('authenticated') || activityStr.includes('success');
      default:
        return false;
    }
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
   * Determine if session should be captured (ENHANCED: More aggressive thresholds)
   */
  shouldCapture(session) {
    const duration = Date.now() - session.startTime;
    const activityCount = session.activities.length;
    const hasSuccess = session.hasSuccessIndicators();
    const complexity = session.getComplexity();
    const momentum = session.getMomentum();
    const signalCount = session.realTimeSignals.size;
    
    // ENHANCED: Immediate high priority captures (more aggressive)
    if (session.breakthroughs > 0) return true; // Always capture breakthroughs
    if (session.importance === 'high' && hasSuccess) return true;
    if (momentum >= 6 && activityCount >= 2) return true; // Lowered from 8 to 6
    
    // ENHANCED: More aggressive real-time signal based captures
    if (signalCount >= 2 && activityCount >= 2) return true; // Lowered from 3 to 2 signals
    if (session.realTimeSignals.has('breakthrough')) return true;
    if (session.realTimeSignals.has('error resolution') && hasSuccess) return true;
    
    // ENHANCED: Faster traditional duration-based captures
    if (duration > this.timeThresholds.significantWork && activityCount >= 2) return true; // Lowered from 3 to 2
    if (duration > this.timeThresholds.significantWork && momentum >= 3) return true; // Lowered from 5 to 3
    
    // ENHANCED: Capture complex work even faster
    if (complexity === 'high' && activityCount >= 1) return true; // Lowered from 2 to 1
    if (complexity === 'medium' && activityCount >= 2 && momentum >= 4) return true; // New: medium complexity
    if (complexity === 'high' && momentum >= 2) return true; // Lowered from 3 to 2
    
    // ENHANCED: Much more aggressive sustained work capture
    if (duration > this.timeThresholds.quickTask && signalCount >= 1 && momentum >= 3) return true; // Lowered thresholds
    if (duration > this.timeThresholds.quickTask && activityCount >= 3) return true; // New: time + activity only
    
    // ENHANCED: Single activity captures for important patterns
    if (activityCount === 1 && session.importance === 'high') return true; // New: single high-importance
    if (activityCount === 1 && hasSuccess && complexity === 'high') return true; // New: single success
    
    // Extended sessions always captured (unchanged)
    if (duration > this.timeThresholds.extended) return true;
    
    // ENHANCED: More aggressive rapid activity detection
    if (session.realTimeSignals.has('rapid-activity') && activityCount >= 2) return true; // Lowered from 3 to 2
    if (session.realTimeSignals.has('file creation') && activityCount >= 1) return true; // New: file creation
    if (session.realTimeSignals.has('successful connection') && activityCount >= 1) return true; // New: connections
    
    return false;
  }

  /**
   * NEW: Determine if session should trigger task creation
   */
  shouldCreateTask(session) {
    const duration = Date.now() - session.startTime;
    const activityCount = session.activities.length;
    const complexity = session.getComplexity();
    const momentum = session.getMomentum();
    
    // Task creation triggers (multi-step work detection)
    if (duration > this.timeThresholds.taskCreationThreshold && activityCount >= 2) return true;
    if (complexity === 'high' && activityCount >= 2) return true;
    if (momentum >= 5 && activityCount >= 3) return true;
    if (session.contextSwitches >= 2) return true; // Multiple context switches = complex work
    if (session.realTimeSignals.has('multiple attempts') && activityCount >= 2) return true;
    
    // Domain-specific task triggers
    if (session.domain === 'software-development' && activityCount >= 3) return true;
    if (session.workType === 'implementation' && activityCount >= 2) return true;
    if (session.workType === 'problemSolving' && duration > this.timeThresholds.quickTask) return true;
    
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
        patterns: session.getPatterns(),
        realTimeSignals: Array.from(session.realTimeSignals),
        momentum: session.getMomentum(),
        breakthroughs: session.breakthroughs,
        contextSwitches: session.contextSwitches,
        signalCount: session.realTimeSignals.size
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
    const momentum = session.getMomentum();
    const signals = Array.from(session.realTimeSignals);
    
    return `## ${session.workType} Session Summary

**Domain**: ${session.domain}
**Duration**: ${duration} minutes
**Complexity**: ${session.getComplexity()}
**Outcome**: ${session.getOutcome()}
**Momentum**: ${momentum}${session.breakthroughs > 0 ? ` (${session.breakthroughs} breakthroughs!)` : ''}

### Activities
${activities}

### Real-Time Signals Detected
${signals.length > 0 ? signals.map(s => `- ${s}`).join('\n') : 'No specific signals detected'}

### Key Insights
${session.getKeyInsights()}

### Tools Used
${session.getToolsUsed().join(', ')}

### Patterns Detected
${session.getPatterns().join(', ')}

### Session Quality Metrics
- **Activity Count**: ${session.activities.length}
- **Context Switches**: ${session.contextSwitches}
- **Signal Diversity**: ${session.realTimeSignals.size}
- **Work Momentum**: ${momentum}/10
${session.breakthroughs > 0 ? `- **Breakthroughs**: ${session.breakthroughs}` : ''}
`;
  }
  
  /**
   * NEW: Create universal task from session for multi-step work
   */
  createUniversalTask(session) {
    const task = {
      title: this.generateTaskTitle(session),
      description: this.formatTaskDescription(session),
      project: session.domain,
      category: this.mapCategoryFromDomain(session.domain),
      priority: this.mapTaskPriority(session),
      status: 'in_progress', // Tasks start as in-progress since work is ongoing
      tags: this.generateTaskTags(session),
      metadata: {
        domain: session.domain,
        workType: session.workType,
        complexity: session.getComplexity(),
        estimatedDuration: this.estimateTaskDuration(session),
        activityCount: session.activities.length,
        toolsUsed: session.getToolsUsed(),
        patterns: session.getPatterns(),
        realTimeSignals: Array.from(session.realTimeSignals),
        momentum: session.getMomentum(),
        breakthroughs: session.breakthroughs,
        contextSwitches: session.contextSwitches,
        createdFrom: 'universal-work-detector',
        sessionStartTime: session.startTime,
        detectionReason: this.getTaskCreationReason(session)
      }
    };
    
    return task;
  }
  
  /**
   * Generate task title based on work pattern
   */
  generateTaskTitle(session) {
    const domain = session.domain.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    const workType = session.workType.replace(/([A-Z])/g, ' $1').toLowerCase();
    const complexity = session.getComplexity();
    const isOngoing = session.activities.length > 2 ? 'Multi-Step' : '';
    
    return `${isOngoing} ${domain} ${workType}${complexity === 'high' ? ' (Complex)' : ''}`.trim();
  }
  
  /**
   * Format task description with session context
   */
  formatTaskDescription(session) {
    const duration = Math.round((Date.now() - session.startTime) / 1000 / 60);
    const activities = session.activities.slice(-3).map(a => `- ${a.summary}`).join('\n'); // Last 3 activities
    
    return `## Multi-Step ${session.workType} Task

**Detected Pattern**: ${session.workType} work in ${session.domain} domain
**Duration So Far**: ${duration} minutes
**Complexity**: ${session.getComplexity()}
**Current Status**: Work in progress

### Recent Activities
${activities}

### Work Context
- **Tools Being Used**: ${session.getToolsUsed().join(', ')}
- **Detected Patterns**: ${session.getPatterns().join(', ')}
- **Work Momentum**: ${session.getMomentum()}/10
- **Signals**: ${Array.from(session.realTimeSignals).join(', ')}

### Next Steps
This task was automatically created because sustained work patterns were detected. Continue the work and the system will update progress automatically.

*Auto-generated by Universal Work Detector*`;
  }
  
  /**
   * Map session priority to task priority
   */
  mapTaskPriority(session) {
    if (session.breakthroughs > 0) return 'high';
    if (session.importance === 'high') return 'high';
    if (session.getComplexity() === 'high') return 'medium';
    if (session.getMomentum() >= 7) return 'medium';
    return 'low';
  }
  
  /**
   * Generate task-specific tags
   */
  generateTaskTags(session) {
    const tags = [
      'auto-generated',
      'multi-step',
      session.domain,
      session.workType,
      session.getComplexity()
    ];
    
    // Add pattern-specific tags
    if (session.getPatterns().length > 0) {
      tags.push(...session.getPatterns().slice(0, 2)); // Add up to 2 patterns
    }
    
    // Add signal-based tags
    if (session.realTimeSignals.has('breakthrough')) tags.push('breakthrough');
    if (session.realTimeSignals.has('rapid-activity')) tags.push('intense-work');
    if (session.contextSwitches > 1) tags.push('context-switching');
    
    return tags.filter(Boolean);
  }
  
  /**
   * Estimate task duration based on session patterns
   */
  estimateTaskDuration(session) {
    const currentDuration = Date.now() - session.startTime;
    const momentum = session.getMomentum();
    const complexity = session.getComplexity();
    
    // Estimate based on patterns
    let multiplier = 2; // Assume work will continue for 2x current duration
    
    if (complexity === 'high') multiplier = 3;
    if (momentum >= 8) multiplier = 1.5; // High momentum = faster completion
    if (session.contextSwitches > 2) multiplier = 2.5; // Context switches slow things down
    
    return Math.round((currentDuration * multiplier) / 1000 / 60); // Return in minutes
  }
  
  /**
   * Get reason why task was created (for debugging/transparency)
   */
  getTaskCreationReason(session) {
    const reasons = [];
    const duration = Date.now() - session.startTime;
    
    if (duration > this.timeThresholds.taskCreationThreshold) {
      reasons.push(`sustained work (${Math.round(duration/60000)}+ min)`);
    }
    if (session.getComplexity() === 'high') {
      reasons.push('high complexity detected');
    }
    if (session.getMomentum() >= 5) {
      reasons.push(`high work momentum (${session.getMomentum()}/10)`);
    }
    if (session.contextSwitches >= 2) {
      reasons.push('multiple context switches');
    }
    
    return reasons.join(', ') || 'multi-step work pattern detected';
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
    this.realTimeSignals = new Set();
    this.signalHistory = [];
    this.hasErrorHistory = false;
    this.previousWorkType = null;
    this.key = `${classification.domain}-${classification.workType}`;
    
    // Session quality metrics
    this.momentum = 0; // Tracks sustained work
    this.breakthroughs = 0; // Counts major discoveries
    this.contextSwitches = 0; // Tracks focus changes
  }
  
  /**
   * Add a real-time signal to the session
   */
  addRealTimeSignal(signal) {
    this.realTimeSignals.add(signal);
    this.signalHistory.push({
      signal,
      timestamp: Date.now(),
      activityCount: this.activities.length
    });
    
    // Update session metrics based on signals
    switch(signal) {
      case 'breakthrough':
        this.breakthroughs++;
        this.momentum += 5;
        break;
      case 'rapid-activity':
        this.momentum += 2;
        break;
      case 'context-switch':
        this.contextSwitches++;
        this.momentum = Math.max(0, this.momentum - 1); // Slight penalty
        break;
      case 'successful connection':
      case 'error resolution':
        this.momentum += 3;
        break;
    }
  }
  
  /**
   * Get session momentum score
   */
  getMomentum() {
    // Decay momentum over time
    const ageMinutes = (Date.now() - this.startTime) / (1000 * 60);
    const decayFactor = Math.max(0.1, 1 - (ageMinutes / 60)); // Decay over 1 hour
    return Math.round(this.momentum * decayFactor * 10) / 10;
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