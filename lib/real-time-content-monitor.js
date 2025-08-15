/**
 * Real-Time Content Monitoring Enhancement
 * Advanced activity tracking, session management, and work pattern recognition
 */

import { EventEmitter } from 'events';

export class RealTimeContentMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.config = {
      sessionTimeout: options.sessionTimeout || 15 * 60 * 1000, // 15 minutes
      activityThreshold: options.activityThreshold || 3, // Minimum activities for significance
      momentumDecayRate: options.momentumDecayRate || 0.1, // Momentum decay per minute
      signalWeights: options.signalWeights || {
        'file-change': 2,
        'code-execution': 3,
        'error-resolution': 5,
        'successful-test': 4,
        'deployment': 6,
        'discovery': 7
      },
      ...options
    };
    
    // Active monitoring state
    this.activeSessions = new Map();
    this.activityBuffer = [];
    this.contentPatterns = this.initializePatterns();
    this.sessionMetrics = new Map();
    this.globalStats = {
      totalSessions: 0,
      significantWork: 0,
      averageSessionLength: 0,
      topPatterns: new Map()
    };
    
    // Real-time monitoring intervals
    this.monitoringInterval = null;
    this.cleanupInterval = null;
    
    this.startMonitoring();
  }
  
  /**
   * Initialize enhanced content detection patterns
   */
  initializePatterns() {
    return {
      // File system changes
      fileOperations: {
        creation: /(?:write|create|new file|touch|mkdir)/i,
        modification: /(?:edit|update|modify|change|save)/i,
        deletion: /(?:delete|remove|rm|unlink)/i,
        movement: /(?:move|rename|mv|copy|cp)/i
      },
      
      // Code execution patterns
      codeExecution: {
        build: /(?:build|compile|webpack|rollup|vite build)/i,
        test: /(?:test|spec|jest|mocha|cypress|vitest)/i,
        run: /(?:run|execute|start|launch|node|python|npm)/i,
        debug: /(?:debug|breakpoint|console\.log|print\()/i
      },
      
      // Problem resolution patterns
      problemResolution: {
        errorDetection: /(?:error|exception|fail|crash|bug|issue)/i,
        debugging: /(?:debug|trace|log|inspect|troubleshoot)/i,
        solution: /(?:fix|solve|resolve|patch|workaround)/i,
        success: /(?:working|fixed|resolved|success|done|complete)/i
      },
      
      // Learning and discovery patterns
      discovery: {
        research: /(?:search|google|documentation|stack overflow)/i,
        learning: /(?:learn|understand|how to|tutorial|guide)/i,
        insight: /(?:discovered|found|realized|figured out|breakthrough)/i,
        documentation: /(?:document|comment|readme|wiki|notes)/i
      },
      
      // Collaboration patterns
      collaboration: {
        communication: /(?:chat|message|email|slack|discord)/i,
        sharing: /(?:share|send|publish|deploy|commit|push)/i,
        review: /(?:review|feedback|comment|approve|merge)/i,
        meeting: /(?:meeting|call|video|zoom|teams)/i
      },
      
      // Performance and optimization
      performance: {
        profiling: /(?:profile|benchmark|performance|timing)/i,
        optimization: /(?:optimize|improve|speed|fast|cache)/i,
        monitoring: /(?:monitor|metrics|analytics|logging)/i,
        scaling: /(?:scale|load|capacity|throughput)/i
      }
    };
  }
  
  /**
   * Track real-time activity with enhanced pattern detection
   */
  trackActivity(activity) {
    const timestamp = Date.now();
    const enrichedActivity = this.enrichActivity(activity, timestamp);
    
    // Add to buffer for pattern analysis
    this.activityBuffer.push(enrichedActivity);
    this.maintainBufferSize();
    
    // Update or create session
    const session = this.updateSession(enrichedActivity);
    
    // Emit real-time events
    this.emit('activity', enrichedActivity);
    this.emit('session-update', session);
    
    // Check for significant patterns
    const patterns = this.detectSignificantPatterns(session);
    if (patterns.length > 0) {
      this.emit('patterns-detected', { session, patterns });
    }
    
    return enrichedActivity;
  }
  
  /**
   * Enrich activity with metadata and analysis
   */
  enrichActivity(activity, timestamp) {
    const content = this.extractActivityContent(activity);
    const patterns = this.analyzeContentPatterns(content);
    const context = this.inferContext(activity, content);
    
    return {
      ...activity,
      timestamp,
      content,
      patterns,
      context,
      significance: this.calculateActivitySignificance(patterns, context),
      momentum: this.calculateMomentumContribution(patterns),
      id: `activity_${timestamp}_${Math.random().toString(36).substr(2, 9)}`
    };
  }
  
  /**
   * Extract meaningful content from various activity types
   */
  extractActivityContent(activity) {
    if (typeof activity === 'string') {
      return activity;
    }
    
    let content = '';
    
    // Tool usage
    if (activity.tool) {
      content += `Tool: ${activity.tool}`;
      if (activity.args) {
        content += ` Args: ${JSON.stringify(activity.args)}`;
      }
    }
    
    // File operations
    if (activity.file_path) {
      content += ` File: ${activity.file_path}`;
    }
    
    // Command execution
    if (activity.command) {
      content += ` Command: ${activity.command}`;
    }
    
    // Input/output content
    if (activity.input) {
      content += ` Input: ${activity.input}`;
    }
    
    if (activity.output) {
      content += ` Output: ${activity.output}`;
    }
    
    // Result content
    if (activity.result) {
      content += ` Result: ${JSON.stringify(activity.result).substring(0, 500)}`;
    }
    
    return content || activity.toString();
  }
  
  /**
   * Analyze content for pattern matches
   */
  analyzeContentPatterns(content) {
    const lowerContent = content.toLowerCase();
    const detectedPatterns = {};
    
    for (const [category, patterns] of Object.entries(this.contentPatterns)) {
      detectedPatterns[category] = {};
      
      for (const [subcategory, pattern] of Object.entries(patterns)) {
        if (pattern.test(lowerContent)) {
          detectedPatterns[category][subcategory] = true;
        }
      }
      
      // Remove empty categories
      if (Object.keys(detectedPatterns[category]).length === 0) {
        delete detectedPatterns[category];
      }
    }
    
    return detectedPatterns;
  }
  
  /**
   * Infer context from activity and content
   */
  inferContext(activity, content) {
    const context = {
      domain: 'general',
      intent: 'unknown',
      urgency: 'normal',
      complexity: 'low'
    };
    
    // Infer domain from tools and content
    if (activity.tool) {
      const tool = activity.tool.toLowerCase();
      if (['bash', 'edit', 'write', 'read'].includes(tool)) {
        context.domain = 'development';
      } else if (['webfetch', 'websearch'].includes(tool)) {
        context.domain = 'research';
      }
    }
    
    // Infer intent from content patterns
    const lowerContent = content.toLowerCase();
    if (/error|fix|debug/.test(lowerContent)) {
      context.intent = 'problem-solving';
      context.urgency = 'high';
    } else if (/create|build|implement/.test(lowerContent)) {
      context.intent = 'implementation';
    } else if (/test|verify|check/.test(lowerContent)) {
      context.intent = 'validation';
    }
    
    // Infer complexity
    const complexityIndicators = content.match(/\b(complex|difficult|challenging|multiple|various)\b/gi) || [];
    if (complexityIndicators.length > 2) context.complexity = 'high';
    else if (complexityIndicators.length > 0) context.complexity = 'medium';
    
    return context;
  }
  
  /**
   * Calculate significance score for activity
   */
  calculateActivitySignificance(patterns, context) {
    let score = 1; // Base score
    
    // Pattern-based scoring
    for (const category of Object.keys(patterns)) {
      switch(category) {
        case 'problemResolution':
          score += 3;
          break;
        case 'discovery':
          score += 2;
          break;
        case 'codeExecution':
          score += 2;
          break;
        case 'fileOperations':
          score += 1;
          break;
      }
    }
    
    // Context-based scoring
    if (context.intent === 'problem-solving') score += 2;
    if (context.urgency === 'high') score += 2;
    if (context.complexity === 'high') score += 1;
    
    return Math.min(score, 10); // Cap at 10
  }
  
  /**
   * Calculate momentum contribution
   */
  calculateMomentumContribution(patterns) {
    let momentum = 0;
    
    if (patterns.problemResolution?.success) momentum += 5;
    if (patterns.discovery?.insight) momentum += 4;
    if (patterns.codeExecution?.test) momentum += 3;
    if (patterns.fileOperations?.creation) momentum += 2;
    
    return momentum;
  }
  
  /**
   * Update or create session based on activity
   */
  updateSession(activity) {
    const sessionKey = this.determineSessionKey(activity);
    let session = this.activeSessions.get(sessionKey);
    
    if (!session) {
      session = this.createNewSession(sessionKey, activity);
      this.activeSessions.set(sessionKey, session);
    }
    
    // Add activity to session
    session.activities.push(activity);
    session.lastActivity = activity.timestamp;
    session.totalSignificance += activity.significance;
    session.momentum += activity.momentum;
    
    // Apply momentum decay
    this.applyMomentumDecay(session);
    
    // Update session patterns
    this.updateSessionPatterns(session, activity);
    
    return session;
  }
  
  /**
   * Determine session key for grouping related activities
   */
  determineSessionKey(activity) {
    // Group by domain and intent primarily
    const domain = activity.context.domain;
    const intent = activity.context.intent;
    const urgency = activity.context.urgency;
    
    // Create composite key for session grouping
    return `${domain}-${intent}-${urgency}`;
  }
  
  /**
   * Create a new monitoring session
   */
  createNewSession(key, initialActivity) {
    const session = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      startTime: initialActivity.timestamp,
      lastActivity: initialActivity.timestamp,
      activities: [],
      totalSignificance: 0,
      momentum: 0,
      patterns: new Set(),
      context: { ...initialActivity.context },
      metrics: {
        peakMomentum: 0,
        significanceSpread: 0,
        patternDiversity: 0,
        activityBursts: 0
      }
    };
    
    this.globalStats.totalSessions++;
    return session;
  }
  
  /**
   * Apply momentum decay over time
   */
  applyMomentumDecay(session) {
    const now = Date.now();
    const minutesSinceLastActivity = (now - session.lastActivity) / (1000 * 60);
    const decayFactor = Math.pow(1 - this.config.momentumDecayRate, minutesSinceLastActivity);
    
    session.momentum *= decayFactor;
    session.momentum = Math.max(0, session.momentum);
    
    // Track peak momentum
    session.metrics.peakMomentum = Math.max(session.metrics.peakMomentum, session.momentum);
  }
  
  /**
   * Update session patterns based on new activity
   */
  updateSessionPatterns(session, activity) {
    // Add detected patterns to session
    for (const category of Object.keys(activity.patterns)) {
      session.patterns.add(category);
    }
    
    // Update pattern diversity metric
    session.metrics.patternDiversity = session.patterns.size;
    
    // Detect activity bursts
    if (session.activities.length >= 2) {
      const lastActivity = session.activities[session.activities.length - 2];
      const timeDiff = activity.timestamp - lastActivity.timestamp;
      if (timeDiff < 30000) { // Within 30 seconds
        session.metrics.activityBursts++;
      }
    }
  }
  
  /**
   * Detect significant patterns across session activities
   */
  detectSignificantPatterns(session) {
    const patterns = [];
    
    // Pattern: Problem-solving breakthrough
    if (this.hasProblemSolvingBreakthrough(session)) {
      patterns.push({
        type: 'breakthrough',
        confidence: 0.9,
        description: 'Detected problem-solving breakthrough pattern',
        evidence: this.getBreakthroughEvidence(session)
      });
    }
    
    // Pattern: Sustained implementation
    if (this.hasSustainedImplementation(session)) {
      patterns.push({
        type: 'sustained-work',
        confidence: 0.8,
        description: 'Detected sustained implementation work',
        evidence: this.getImplementationEvidence(session)
      });
    }
    
    // Pattern: Learning and discovery
    if (this.hasLearningPattern(session)) {
      patterns.push({
        type: 'learning',
        confidence: 0.7,
        description: 'Detected learning and discovery pattern',
        evidence: this.getLearningEvidence(session)
      });
    }
    
    return patterns;
  }
  
  /**
   * Check for problem-solving breakthrough pattern
   */
  hasProblemSolvingBreakthrough(session) {
    const activities = session.activities;
    if (activities.length < 3) return false;
    
    // Look for error -> debugging -> success pattern
    let hasError = false, hasDebugging = false, hasSuccess = false;
    
    for (const activity of activities) {
      if (activity.patterns.problemResolution?.errorDetection) hasError = true;
      if (activity.patterns.problemResolution?.debugging) hasDebugging = true;
      if (activity.patterns.problemResolution?.success) hasSuccess = true;
    }
    
    return hasError && hasDebugging && hasSuccess;
  }
  
  /**
   * Check for sustained implementation pattern
   */
  hasSustainedImplementation(session) {
    const activities = session.activities;
    if (activities.length < 5) return false;
    
    // Check for consistent file operations and code execution
    const fileOpsCount = activities.filter(a => a.patterns.fileOperations).length;
    const codeExecCount = activities.filter(a => a.patterns.codeExecution).length;
    
    return fileOpsCount >= 3 && codeExecCount >= 2 && session.momentum > 5;
  }
  
  /**
   * Check for learning pattern
   */
  hasLearningPattern(session) {
    const activities = session.activities;
    if (activities.length < 2) return false;
    
    // Look for research -> insight pattern
    const hasResearch = activities.some(a => a.patterns.discovery?.research);
    const hasInsight = activities.some(a => a.patterns.discovery?.insight);
    
    return hasResearch && hasInsight;
  }
  
  /**
   * Get evidence for breakthrough pattern
   */
  getBreakthroughEvidence(session) {
    return {
      errorActivities: session.activities.filter(a => a.patterns.problemResolution?.errorDetection).length,
      debuggingActivities: session.activities.filter(a => a.patterns.problemResolution?.debugging).length,
      successActivities: session.activities.filter(a => a.patterns.problemResolution?.success).length,
      peakMomentum: session.metrics.peakMomentum
    };
  }
  
  /**
   * Get evidence for implementation pattern
   */
  getImplementationEvidence(session) {
    return {
      fileOperations: session.activities.filter(a => a.patterns.fileOperations).length,
      codeExecution: session.activities.filter(a => a.patterns.codeExecution).length,
      currentMomentum: session.momentum,
      sessionDuration: session.lastActivity - session.startTime
    };
  }
  
  /**
   * Get evidence for learning pattern
   */
  getLearningEvidence(session) {
    return {
      researchActivities: session.activities.filter(a => a.patterns.discovery?.research).length,
      insightActivities: session.activities.filter(a => a.patterns.discovery?.insight).length,
      documentationCreated: session.activities.filter(a => a.patterns.discovery?.documentation).length
    };
  }
  
  /**
   * Start real-time monitoring
   */
  startMonitoring() {
    // Monitor sessions every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.monitorActiveSessions();
    }, 30000);
    
    // Clean up old sessions every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 5 * 60 * 1000);
  }
  
  /**
   * Monitor active sessions for significant events
   */
  monitorActiveSessions() {
    for (const [key, session] of this.activeSessions.entries()) {
      // Check if session should be captured
      if (this.shouldCaptureSession(session)) {
        this.emit('session-capture', session);
      }
      
      // Update session metrics
      this.updateSessionMetrics(session);
    }
  }
  
  /**
   * Determine if session should be captured
   */
  shouldCaptureSession(session) {
    const duration = Date.now() - session.startTime;
    const activityCount = session.activities.length;
    const significance = session.totalSignificance / activityCount;
    
    return (
      activityCount >= this.config.activityThreshold &&
      (significance >= 3 || session.momentum >= 8 || duration > 10 * 60 * 1000)
    );
  }
  
  /**
   * Update session metrics
   */
  updateSessionMetrics(session) {
    const activities = session.activities;
    if (activities.length === 0) return;
    
    // Calculate significance spread
    const significanceValues = activities.map(a => a.significance);
    const mean = significanceValues.reduce((a, b) => a + b) / significanceValues.length;
    const variance = significanceValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / significanceValues.length;
    session.metrics.significanceSpread = Math.sqrt(variance);
  }
  
  /**
   * Clean up old sessions
   */
  cleanupOldSessions() {
    const now = Date.now();
    const sessionsToRemove = [];
    
    for (const [key, session] of this.activeSessions.entries()) {
      const timeSinceLastActivity = now - session.lastActivity;
      
      if (timeSinceLastActivity > this.config.sessionTimeout) {
        sessionsToRemove.push(key);
      }
    }
    
    // Remove old sessions
    for (const key of sessionsToRemove) {
      const session = this.activeSessions.get(key);
      this.emit('session-timeout', session);
      this.activeSessions.delete(key);
    }
  }
  
  /**
   * Maintain activity buffer size
   */
  maintainBufferSize() {
    const maxBufferSize = 1000;
    if (this.activityBuffer.length > maxBufferSize) {
      this.activityBuffer.splice(0, this.activityBuffer.length - maxBufferSize);
    }
  }
  
  /**
   * Get monitoring statistics
   */
  getMonitoringStats() {
    const activeSessions = this.activeSessions.size;
    const totalActivities = Array.from(this.activeSessions.values())
      .reduce((sum, session) => sum + session.activities.length, 0);
    
    return {
      activeSessions,
      totalActivities,
      globalStats: this.globalStats,
      averageSessionMomentum: this.getAverageSessionMomentum(),
      topPatterns: this.getTopPatterns()
    };
  }
  
  /**
   * Get average session momentum
   */
  getAverageSessionMomentum() {
    if (this.activeSessions.size === 0) return 0;
    
    const totalMomentum = Array.from(this.activeSessions.values())
      .reduce((sum, session) => sum + session.momentum, 0);
    
    return totalMomentum / this.activeSessions.size;
  }
  
  /**
   * Get top detected patterns
   */
  getTopPatterns() {
    const patternCounts = new Map();
    
    for (const session of this.activeSessions.values()) {
      for (const pattern of session.patterns) {
        patternCounts.set(pattern, (patternCounts.get(pattern) || 0) + 1);
      }
    }
    
    return Array.from(patternCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }
  
  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export default RealTimeContentMonitor;