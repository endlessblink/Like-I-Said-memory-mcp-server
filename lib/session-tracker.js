/**
 * Session Tracker
 * Monitors work sessions and creates contextual memories based on activity patterns
 */

import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';

export class SessionTracker extends EventEmitter {
  constructor(storage, options = {}) {
    super();
    this.storage = storage;
    
    // Configuration
    this.config = {
      sessionTimeout: options.sessionTimeout || 1800000, // 30 minutes
      minSessionDuration: options.minSessionDuration || 300000, // 5 minutes
      autoSaveInterval: options.autoSaveInterval || 300000, // 5 minutes
      maxBufferSize: options.maxBufferSize || 1000,
      dataPath: options.dataPath || 'data'
    };
    
    // Session state
    this.currentSession = null;
    this.sessionHistory = [];
    this.activityBuffer = [];
    
    // Activity tracking
    this.lastActivityTime = Date.now();
    this.sessionFile = path.join(this.config.dataPath, 'session-history.json');
    
    // Load previous sessions
    this.loadSessionHistory();
    
    // Start auto-save timer
    this.autoSaveTimer = setInterval(() => {
      this.checkSessionTimeout();
      this.saveSessionHistory();
    }, this.config.autoSaveInterval);
  }
  
  /**
   * Start a new session
   */
  startSession(metadata = {}) {
    // End previous session if exists
    if (this.currentSession) {
      this.endSession();
    }
    
    this.currentSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      metadata,
      activities: [],
      errors: [],
      solutions: [],
      discoveries: [],
      files: new Set(),
      searches: new Map(),
      tools: new Map(),
      keyMoments: [],
      context: {
        project: metadata.project || 'default',
        goal: metadata.goal || null,
        tags: metadata.tags || []
      }
    };
    
    this.emit('session-started', this.currentSession);
    return this.currentSession.id;
  }
  
  /**
   * End the current session and create summary
   */
  async endSession(reason = 'manual') {
    if (!this.currentSession) return null;
    
    const duration = Date.now() - this.currentSession.startTime;
    
    // Skip very short sessions
    if (duration < this.config.minSessionDuration && reason !== 'manual') {
      this.currentSession = null;
      return null;
    }
    
    // Generate session summary
    const summary = await this.generateSessionSummary();
    
    // Create session memory
    if (summary && summary.isSignificant) {
      const memory = await this.createSessionMemory(summary);
      this.currentSession.memoryId = memory.id;
    }
    
    // Save to history
    this.sessionHistory.push({
      ...this.currentSession,
      endTime: Date.now(),
      duration,
      summary,
      reason
    });
    
    // Emit event
    this.emit('session-ended', {
      session: this.currentSession,
      summary,
      reason
    });
    
    this.currentSession = null;
    this.saveSessionHistory();
    
    return summary;
  }
  
  /**
   * Track an activity
   */
  trackActivity(type, data) {
    this.lastActivityTime = Date.now();
    
    // Start session if needed
    if (!this.currentSession) {
      this.startSession({ autoStarted: true });
    }
    
    const activity = {
      type,
      timestamp: Date.now(),
      data: this.sanitizeData(data)
    };
    
    // Add to current session
    this.currentSession.activities.push(activity);
    
    // Add to buffer for pattern detection
    this.activityBuffer.push(activity);
    if (this.activityBuffer.length > this.config.maxBufferSize) {
      this.activityBuffer.shift();
    }
    
    // Process based on type
    switch (type) {
      case 'search':
        this.trackSearch(data);
        break;
      case 'tool_use':
        this.trackToolUse(data);
        break;
      case 'file_access':
        this.trackFileAccess(data);
        break;
      case 'error':
        this.trackError(data);
        break;
      case 'solution':
        this.trackSolution(data);
        break;
      case 'discovery':
        this.trackDiscovery(data);
        break;
    }
    
    // Check for patterns
    this.detectPatterns();
  }
  
  /**
   * Track search activity
   */
  trackSearch(data) {
    const { query, results, project } = data;
    const key = query.toLowerCase();
    
    if (!this.currentSession.searches.has(key)) {
      this.currentSession.searches.set(key, {
        query,
        count: 0,
        firstSeen: Date.now(),
        results: []
      });
    }
    
    const searchData = this.currentSession.searches.get(key);
    searchData.count++;
    searchData.lastSeen = Date.now();
    searchData.results.push({
      timestamp: Date.now(),
      resultCount: results
    });
    
    // Mark as key moment if searched multiple times
    if (searchData.count === 3) {
      this.addKeyMoment('repeated_search', {
        query,
        count: searchData.count,
        reason: 'Searched 3+ times - likely important'
      });
    }
  }
  
  /**
   * Track tool usage
   */
  trackToolUse(data) {
    const { tool, args, result } = data;
    
    if (!this.currentSession.tools.has(tool)) {
      this.currentSession.tools.set(tool, {
        count: 0,
        firstUsed: Date.now(),
        uses: []
      });
    }
    
    const toolData = this.currentSession.tools.get(tool);
    toolData.count++;
    toolData.lastUsed = Date.now();
    toolData.uses.push({
      timestamp: Date.now(),
      args: this.sanitizeData(args),
      success: !result?.error
    });
  }
  
  /**
   * Track file access
   */
  trackFileAccess(data) {
    const { file, action } = data;
    this.currentSession.files.add(file);
    
    // Detect focus areas based on file patterns
    if (this.currentSession.files.size === 1) {
      this.currentSession.context.focusFile = file;
    }
  }
  
  /**
   * Track errors
   */
  trackError(data) {
    const error = {
      timestamp: Date.now(),
      ...data,
      resolved: false
    };
    
    this.currentSession.errors.push(error);
    
    // Mark as key moment for significant errors
    if (data.severity === 'high' || this.currentSession.errors.length > 5) {
      this.addKeyMoment('error_spike', {
        errorCount: this.currentSession.errors.length,
        latestError: data.message
      });
    }
  }
  
  /**
   * Track solutions
   */
  trackSolution(data) {
    const solution = {
      timestamp: Date.now(),
      ...data
    };
    
    this.currentSession.solutions.push(solution);
    
    // Link to recent errors
    const recentErrors = this.currentSession.errors
      .filter(e => !e.resolved && Date.now() - e.timestamp < 600000); // 10 minutes
    
    if (recentErrors.length > 0) {
      solution.resolvedErrors = recentErrors.map(e => e.message);
      recentErrors.forEach(e => e.resolved = true);
      
      this.addKeyMoment('problem_solved', {
        solution: data.description,
        errorsResolved: solution.resolvedErrors
      });
    }
  }
  
  /**
   * Track discoveries
   */
  trackDiscovery(data) {
    const discovery = {
      timestamp: Date.now(),
      ...data
    };
    
    this.currentSession.discoveries.push(discovery);
    
    this.addKeyMoment('discovery', {
      description: data.description,
      impact: data.impact || 'unknown'
    });
  }
  
  /**
   * Add a key moment
   */
  addKeyMoment(type, data) {
    this.currentSession.keyMoments.push({
      type,
      timestamp: Date.now(),
      data
    });
  }
  
  /**
   * Detect patterns in activity
   */
  detectPatterns() {
    // Detect debugging pattern
    const recentActivities = this.activityBuffer.slice(-20);
    const errorCount = recentActivities.filter(a => a.type === 'error').length;
    const searchCount = recentActivities.filter(a => a.type === 'search').length;
    
    if (errorCount > 5 && searchCount > 10) {
      if (!this.currentSession.context.debuggingDetected) {
        this.currentSession.context.debuggingDetected = true;
        this.addKeyMoment('debugging_session', {
          errorCount,
          searchCount,
          duration: Date.now() - recentActivities[0].timestamp
        });
      }
    }
    
    // Detect exploration pattern
    const uniqueFiles = new Set(
      recentActivities
        .filter(a => a.type === 'file_access')
        .map(a => a.data.file)
    );
    
    if (uniqueFiles.size > 10) {
      if (!this.currentSession.context.explorationDetected) {
        this.currentSession.context.explorationDetected = true;
        this.addKeyMoment('exploration_session', {
          filesExplored: uniqueFiles.size,
          purpose: 'Understanding codebase structure'
        });
      }
    }
  }
  
  /**
   * Generate session summary
   */
  async generateSessionSummary() {
    if (!this.currentSession) return null;
    
    const duration = Date.now() - this.currentSession.startTime;
    const activities = this.currentSession.activities;
    
    // Calculate metrics
    const metrics = {
      duration,
      totalActivities: activities.length,
      searches: this.currentSession.searches.size,
      uniqueSearches: this.currentSession.searches.size,
      toolsUsed: this.currentSession.tools.size,
      filesAccessed: this.currentSession.files.size,
      errorsEncountered: this.currentSession.errors.length,
      errorsResolved: this.currentSession.errors.filter(e => e.resolved).length,
      solutionsFound: this.currentSession.solutions.length,
      discoveries: this.currentSession.discoveries.length,
      keyMoments: this.currentSession.keyMoments.length
    };
    
    // Determine session type
    const sessionType = this.determineSessionType(metrics);
    
    // Build narrative
    const narrative = this.buildSessionNarrative(metrics, sessionType);
    
    // Determine significance
    const isSignificant = this.isSessionSignificant(metrics, sessionType);
    
    return {
      metrics,
      sessionType,
      narrative,
      isSignificant,
      highlights: this.getSessionHighlights(),
      recommendations: this.getSessionRecommendations(metrics)
    };
  }
  
  /**
   * Determine session type based on activities
   */
  determineSessionType(metrics) {
    const types = [];
    
    if (metrics.errorsEncountered > 5 && metrics.solutionsFound > 0) {
      types.push('debugging');
    }
    
    if (metrics.filesAccessed > 20) {
      types.push('exploration');
    }
    
    if (metrics.discoveries > 0) {
      types.push('research');
    }
    
    if (metrics.toolsUsed > 5 && metrics.duration > 1800000) {
      types.push('development');
    }
    
    if (this.currentSession.context.goal) {
      types.push('focused');
    }
    
    return types.length > 0 ? types : ['general'];
  }
  
  /**
   * Build session narrative
   */
  buildSessionNarrative(metrics, sessionType) {
    const parts = [];
    
    // Opening
    parts.push(`${this.formatDuration(metrics.duration)} session with ${metrics.totalActivities} activities.`);
    
    // Main activities
    if (sessionType.includes('debugging')) {
      parts.push(`Debugging session: Encountered ${metrics.errorsEncountered} errors, resolved ${metrics.errorsResolved}.`);
    }
    
    if (sessionType.includes('exploration')) {
      parts.push(`Explored ${metrics.filesAccessed} files across the codebase.`);
    }
    
    if (metrics.discoveries > 0) {
      parts.push(`Made ${metrics.discoveries} important discoveries.`);
    }
    
    // Key moments
    const keyMomentTypes = this.currentSession.keyMoments.map(km => km.type);
    const uniqueTypes = [...new Set(keyMomentTypes)];
    if (uniqueTypes.length > 0) {
      parts.push(`Key moments: ${uniqueTypes.join(', ')}.`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Determine if session is significant
   */
  isSessionSignificant(metrics, sessionType) {
    // Significant if:
    // - Has discoveries or solutions
    // - Long duration with substantial activity
    // - Debugging session that resolved issues
    // - Has key moments
    
    return (
      metrics.discoveries > 0 ||
      metrics.solutionsFound > 0 ||
      (metrics.duration > 3600000 && metrics.totalActivities > 50) ||
      (sessionType.includes('debugging') && metrics.errorsResolved > 0) ||
      metrics.keyMoments > 2
    );
  }
  
  /**
   * Get session highlights
   */
  getSessionHighlights() {
    const highlights = [];
    
    // Top searches
    const topSearches = Array.from(this.currentSession.searches.entries())
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 3)
      .map(([query, data]) => ({ query, count: data.count }));
    
    if (topSearches.length > 0) {
      highlights.push({
        type: 'top_searches',
        data: topSearches
      });
    }
    
    // Important discoveries
    if (this.currentSession.discoveries.length > 0) {
      highlights.push({
        type: 'discoveries',
        data: this.currentSession.discoveries
      });
    }
    
    // Solutions found
    if (this.currentSession.solutions.length > 0) {
      highlights.push({
        type: 'solutions',
        data: this.currentSession.solutions
      });
    }
    
    // Most used tools
    const topTools = Array.from(this.currentSession.tools.entries())
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 3)
      .map(([tool, data]) => ({ tool, count: data.count }));
    
    if (topTools.length > 0) {
      highlights.push({
        type: 'tools',
        data: topTools
      });
    }
    
    return highlights;
  }
  
  /**
   * Get session recommendations
   */
  getSessionRecommendations(metrics) {
    const recommendations = [];
    
    // Unresolved errors
    const unresolvedErrors = this.currentSession.errors.filter(e => !e.resolved);
    if (unresolvedErrors.length > 0) {
      recommendations.push({
        type: 'unresolved_errors',
        priority: 'high',
        message: `${unresolvedErrors.length} errors remain unresolved`,
        errors: unresolvedErrors.map(e => e.message)
      });
    }
    
    // Repeated searches without results
    const failedSearches = Array.from(this.currentSession.searches.entries())
      .filter(([,data]) => data.results.every(r => r.resultCount === 0))
      .filter(([,data]) => data.count >= 2);
    
    if (failedSearches.length > 0) {
      recommendations.push({
        type: 'document_searches',
        priority: 'medium',
        message: 'Document frequently searched terms',
        queries: failedSearches.map(([query,]) => query)
      });
    }
    
    // Long debugging session
    if (metrics.duration > 7200000 && metrics.errorsEncountered > 10) {
      recommendations.push({
        type: 'break_suggested',
        priority: 'low',
        message: 'Consider taking a break after extended debugging'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Create session memory
   */
  async createSessionMemory(summary) {
    const content = this.buildSessionMemoryContent(summary);
    
    const memory = await this.storage.saveMemory({
      content,
      category: 'work',
      tags: [
        'session-summary',
        ...summary.sessionType,
        `duration-${Math.round(summary.metrics.duration / 60000)}min`
      ],
      project: this.currentSession.context.project,
      priority: summary.isSignificant ? 'high' : 'medium',
      metadata: {
        sessionId: this.currentSession.id,
        duration: summary.metrics.duration,
        sessionType: summary.sessionType,
        auto_created: true
      }
    });
    
    return memory;
  }
  
  /**
   * Build session memory content
   */
  buildSessionMemoryContent(summary) {
    let content = `## Session Summary: ${new Date(this.currentSession.startTime).toLocaleString()}\n\n`;
    
    if (this.currentSession.context.goal) {
      content += `**Goal**: ${this.currentSession.context.goal}\n\n`;
    }
    
    content += `### Overview\n${summary.narrative}\n\n`;
    
    // Highlights
    if (summary.highlights.length > 0) {
      content += `### Highlights\n`;
      
      summary.highlights.forEach(highlight => {
        switch (highlight.type) {
          case 'discoveries':
            content += `\n#### Discoveries\n`;
            highlight.data.forEach(d => {
              content += `- ${d.description}\n`;
            });
            break;
            
          case 'solutions':
            content += `\n#### Solutions Found\n`;
            highlight.data.forEach(s => {
              content += `- ${s.description}\n`;
              if (s.resolvedErrors) {
                content += `  - Resolved: ${s.resolvedErrors.join(', ')}\n`;
              }
            });
            break;
            
          case 'top_searches':
            content += `\n#### Frequent Searches\n`;
            highlight.data.forEach(s => {
              content += `- "${s.query}" (${s.count} times)\n`;
            });
            break;
            
          case 'tools':
            content += `\n#### Most Used Tools\n`;
            highlight.data.forEach(t => {
              content += `- ${t.tool} (${t.count} times)\n`;
            });
            break;
        }
      });
    }
    
    // Key moments
    if (this.currentSession.keyMoments.length > 0) {
      content += `\n### Key Moments\n`;
      this.currentSession.keyMoments.forEach(moment => {
        const time = new Date(moment.timestamp).toLocaleTimeString();
        content += `- **${time}** - ${this.formatKeyMoment(moment)}\n`;
      });
    }
    
    // Metrics
    content += `\n### Session Metrics\n`;
    content += `- Duration: ${this.formatDuration(summary.metrics.duration)}\n`;
    content += `- Files accessed: ${summary.metrics.filesAccessed}\n`;
    content += `- Searches performed: ${summary.metrics.searches}\n`;
    content += `- Tools used: ${summary.metrics.toolsUsed}\n`;
    
    if (summary.metrics.errorsEncountered > 0) {
      content += `- Errors: ${summary.metrics.errorsResolved}/${summary.metrics.errorsEncountered} resolved\n`;
    }
    
    // Recommendations
    if (summary.recommendations.length > 0) {
      content += `\n### Follow-up Recommendations\n`;
      summary.recommendations.forEach(rec => {
        content += `- **${rec.priority}**: ${rec.message}\n`;
        if (rec.queries) {
          rec.queries.forEach(q => content += `  - "${q}"\n`);
        }
        if (rec.errors) {
          rec.errors.forEach(e => content += `  - ${e}\n`);
        }
      });
    }
    
    return content;
  }
  
  /**
   * Helper methods
   */
  
  checkSessionTimeout() {
    if (!this.currentSession) return;
    
    const timeSinceLastActivity = Date.now() - this.lastActivityTime;
    
    if (timeSinceLastActivity > this.config.sessionTimeout) {
      this.endSession('timeout');
    }
  }
  
  formatDuration(ms) {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes} minutes`;
  }
  
  formatKeyMoment(moment) {
    switch (moment.type) {
      case 'repeated_search':
        return `Repeated search for "${moment.data.query}" (${moment.data.count} times)`;
      case 'error_spike':
        return `Error spike detected (${moment.data.errorCount} errors)`;
      case 'problem_solved':
        return `Problem solved: ${moment.data.solution}`;
      case 'discovery':
        return `Discovery: ${moment.data.description}`;
      case 'debugging_session':
        return `Debugging session detected (${moment.data.errorCount} errors, ${moment.data.searchCount} searches)`;
      case 'exploration_session':
        return `Code exploration (${moment.data.filesExplored} files)`;
      default:
        return JSON.stringify(moment.data);
    }
  }
  
  sanitizeData(data) {
    if (!data) return data;
    
    const sanitized = { ...data };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    delete sanitized.key;
    
    return sanitized;
  }
  
  loadSessionHistory() {
    try {
      if (fs.existsSync(this.sessionFile)) {
        this.sessionHistory = JSON.parse(fs.readFileSync(this.sessionFile, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading session history:', error);
      this.sessionHistory = [];
    }
  }
  
  saveSessionHistory() {
    try {
      if (!fs.existsSync(this.config.dataPath)) {
        fs.mkdirSync(this.config.dataPath, { recursive: true });
      }
      
      // Keep only last 100 sessions
      if (this.sessionHistory.length > 100) {
        this.sessionHistory = this.sessionHistory.slice(-100);
      }
      
      fs.writeFileSync(this.sessionFile, JSON.stringify(this.sessionHistory, null, 2));
    } catch (error) {
      console.error('Error saving session history:', error);
    }
  }
  
  /**
   * Get session insights
   */
  getSessionInsights(days = 7) {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    const recentSessions = this.sessionHistory.filter(s => s.startTime > cutoff);
    
    const insights = {
      totalSessions: recentSessions.length,
      totalDuration: recentSessions.reduce((sum, s) => sum + s.duration, 0),
      averageDuration: 0,
      sessionTypes: {},
      commonSearches: {},
      productivePeriods: [],
      errorPatterns: {}
    };
    
    if (recentSessions.length > 0) {
      insights.averageDuration = insights.totalDuration / recentSessions.length;
      
      // Analyze session types
      recentSessions.forEach(session => {
        if (session.summary?.sessionType) {
          session.summary.sessionType.forEach(type => {
            insights.sessionTypes[type] = (insights.sessionTypes[type] || 0) + 1;
          });
        }
      });
      
      // Find productive periods
      const productiveSessions = recentSessions.filter(s => 
        s.summary?.metrics?.solutionsFound > 0 || 
        s.summary?.metrics?.discoveries > 0
      );
      
      if (productiveSessions.length > 0) {
        insights.productivePeriods = this.analyzeProductivePeriods(productiveSessions);
      }
    }
    
    return insights;
  }
  
  analyzeProductivePeriods(sessions) {
    const hourCounts = {};
    
    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    
    return Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
        timeRange: `${hour}:00 - ${(parseInt(hour) + 1) % 24}:00`
      }));
  }
  
  /**
   * Cleanup
   */
  destroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.endSession('shutdown');
    this.saveSessionHistory();
  }
}

export default SessionTracker;