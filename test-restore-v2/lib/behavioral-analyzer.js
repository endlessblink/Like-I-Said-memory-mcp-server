/**
 * Behavioral Pattern Analyzer
 * Tracks user behavior to identify important information that should be captured
 */

import fs from 'fs';
import path from 'path';

export class BehavioralAnalyzer {
  constructor(dataPath = 'data') {
    this.dataPath = dataPath;
    this.behaviorFile = path.join(dataPath, 'behavior-patterns.json');
    this.patterns = this.loadPatterns();
    
    // Thresholds for automatic actions
    this.thresholds = {
      searchRepetition: 3,        // Create memory after 3 failed searches
      fileAccessFrequency: 5,     // Mark as important after 5 accesses in 24h
      toolSequenceLength: 3,      // Capture workflow after 3+ tool sequence
      sessionDuration: 1800000,   // 30 minutes - trigger session summary
      errorResolutionTime: 600000 // 10 minutes - capture problem-solution pair
    };
    
    // Active tracking
    this.activeSession = {
      startTime: Date.now(),
      searches: [],
      fileAccess: [],
      toolSequence: [],
      errors: new Map(),
      resolutions: [],
      fileWrites: [],
      codeChanges: [],
      solutionsImplemented: [],
      significantWork: []
    };
  }
  
  /**
   * Load saved behavior patterns
   */
  loadPatterns() {
    try {
      if (fs.existsSync(this.behaviorFile)) {
        return JSON.parse(fs.readFileSync(this.behaviorFile, 'utf8'));
      }
    } catch (error) {
      console.error('Error loading behavior patterns:', error);
    }
    
    return {
      failedSearches: {},      // query -> count
      frequentFiles: {},       // file -> access times
      commonWorkflows: [],     // sequences of tools
      searchPatterns: {},      // query patterns -> results clicked
      errorPatterns: {},       // error -> resolution mapping
      sessionSummaries: []     // historical session data
    };
  }
  
  /**
   * Save behavior patterns
   */
  savePatterns() {
    try {
      if (!fs.existsSync(this.dataPath)) {
        fs.mkdirSync(this.dataPath, { recursive: true });
      }
      fs.writeFileSync(this.behaviorFile, JSON.stringify(this.patterns, null, 2));
    } catch (error) {
      console.error('Error saving behavior patterns:', error);
    }
  }
  
  /**
   * Track a search query and its results
   */
  async trackSearch(query, results, project = null) {
    const searchEvent = {
      query,
      timestamp: Date.now(),
      resultCount: results.length,
      project
    };
    
    this.activeSession.searches.push(searchEvent);
    
    // Track failed searches
    if (results.length === 0) {
      const key = query.toLowerCase();
      this.patterns.failedSearches[key] = (this.patterns.failedSearches[key] || 0) + 1;
      
      // Check if we should create a memory
      if (this.patterns.failedSearches[key] >= this.thresholds.searchRepetition) {
        return {
          action: 'create_memory',
          reason: `Query "${query}" has been searched ${this.patterns.failedSearches[key]} times without results`,
          data: {
            query,
            searchCount: this.patterns.failedSearches[key],
            suggestedTags: this.extractKeywords(query),
            priority: 'high'
          }
        };
      }
    }
    
    this.savePatterns();
    return null;
  }
  
  /**
   * Track file access
   */
  trackFileAccess(filePath, action = 'read') {
    const now = Date.now();
    
    if (!this.patterns.frequentFiles[filePath]) {
      this.patterns.frequentFiles[filePath] = [];
    }
    
    this.patterns.frequentFiles[filePath].push({ timestamp: now, action });
    this.activeSession.fileAccess.push({ file: filePath, timestamp: now, action });
    
    // Clean old entries (keep last 7 days)
    const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
    this.patterns.frequentFiles[filePath] = this.patterns.frequentFiles[filePath]
      .filter(access => access.timestamp > weekAgo);
    
    // Check access frequency in last 24 hours
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const recentAccesses = this.patterns.frequentFiles[filePath]
      .filter(access => access.timestamp > dayAgo).length;
    
    if (recentAccesses >= this.thresholds.fileAccessFrequency) {
      return {
        action: 'mark_important',
        reason: `File "${path.basename(filePath)}" accessed ${recentAccesses} times in 24 hours`,
        data: {
          filePath,
          accessCount: recentAccesses,
          suggestedTags: ['frequently-accessed', path.extname(filePath).slice(1)]
        }
      };
    }
    
    this.savePatterns();
    return null;
  }
  
  /**
   * Track tool usage
   */
  trackToolUsage(toolName, args, result) {
    const toolEvent = {
      tool: toolName,
      timestamp: Date.now(),
      success: !result.error,
      args: this.sanitizeArgs(args)
    };
    
    this.activeSession.toolSequence.push(toolEvent);
    
    // Look for repeated patterns
    if (this.activeSession.toolSequence.length >= this.thresholds.toolSequenceLength) {
      const workflow = this.detectWorkflow();
      if (workflow) {
        return {
          action: 'capture_workflow',
          reason: 'Detected repeated tool usage pattern',
          data: {
            workflow,
            suggestedName: this.generateWorkflowName(workflow),
            frequency: workflow.occurrences
          }
        };
      }
    }
    
    return null;
  }
  
  /**
   * Track errors and their resolutions
   */
  trackError(error, context = {}) {
    const errorKey = this.normalizeError(error);
    const errorData = {
      message: error.message || error,
      stack: error.stack,
      context,
      timestamp: Date.now()
    };
    
    this.activeSession.errors.set(errorKey, errorData);
    
    // Increment error pattern count
    this.patterns.errorPatterns[errorKey] = this.patterns.errorPatterns[errorKey] || { count: 0, resolutions: [] };
    this.patterns.errorPatterns[errorKey].count++;
    
    this.savePatterns();
    return null;
  }
  
  /**
   * Track problem resolution
   */
  trackResolution(description, context = {}) {
    const now = Date.now();
    
    // Find recent errors that might be related
    const recentErrors = Array.from(this.activeSession.errors.entries())
      .filter(([_, error]) => now - error.timestamp < this.thresholds.errorResolutionTime);
    
    if (recentErrors.length > 0) {
      // Associate resolution with errors
      const resolution = {
        description,
        timestamp: now,
        errors: recentErrors.map(([key, _]) => key),
        context,
        timeTaken: now - recentErrors[0][1].timestamp
      };
      
      this.activeSession.resolutions.push(resolution);
      
      // Update error patterns with resolution
      recentErrors.forEach(([errorKey, _]) => {
        if (this.patterns.errorPatterns[errorKey]) {
          this.patterns.errorPatterns[errorKey].resolutions.push({
            description,
            timestamp: now,
            effectiveness: 'unknown' // Could be tracked later
          });
        }
      });
      
      return {
        action: 'create_solution_memory',
        reason: 'Captured problem-solution pair',
        data: {
          problems: recentErrors.map(([_, e]) => e.message),
          solution: description,
          timeTaken: resolution.timeTaken,
          suggestedTags: ['solution', 'troubleshooting', ...this.extractKeywords(description)]
        }
      };
    }
    
    this.savePatterns();
    return null;
  }
  
  /**
   * Generate session summary
   */
  async generateSessionSummary() {
    const now = Date.now();
    const duration = now - this.activeSession.startTime;
    
    if (duration < this.thresholds.sessionDuration) {
      return null; // Session too short
    }
    
    const summary = {
      duration,
      startTime: this.activeSession.startTime,
      endTime: now,
      searches: this.activeSession.searches.length,
      uniqueSearches: new Set(this.activeSession.searches.map(s => s.query)).size,
      filesAccessed: this.activeSession.fileAccess.length,
      uniqueFiles: new Set(this.activeSession.fileAccess.map(f => f.file)).size,
      toolsUsed: this.activeSession.toolSequence.length,
      errorsEncountered: this.activeSession.errors.size,
      resolutions: this.activeSession.resolutions.length,
      keyActivities: this.summarizeActivities()
    };
    
    // Reset session
    this.activeSession = {
      startTime: now,
      searches: [],
      fileAccess: [],
      toolSequence: [],
      errors: new Map(),
      resolutions: []
    };
    
    // Save summary
    this.patterns.sessionSummaries.push(summary);
    this.savePatterns();
    
    return {
      action: 'create_session_summary',
      reason: `Session lasted ${Math.round(duration / 60000)} minutes with significant activity`,
      data: summary
    };
  }
  
  /**
   * Detect workflow patterns
   */
  detectWorkflow() {
    const recentTools = this.activeSession.toolSequence.slice(-10); // Last 10 tools
    
    // Look for sequences of 3+ tools
    for (let i = 0; i <= recentTools.length - this.thresholds.toolSequenceLength; i++) {
      const sequence = recentTools.slice(i, i + this.thresholds.toolSequenceLength)
        .map(t => t.tool);
      
      // Count occurrences of this sequence
      let occurrences = 0;
      const sequenceStr = sequence.join('->');
      
      for (let j = 0; j <= this.activeSession.toolSequence.length - sequence.length; j++) {
        const checkSequence = this.activeSession.toolSequence
          .slice(j, j + sequence.length)
          .map(t => t.tool)
          .join('->');
        
        if (checkSequence === sequenceStr) {
          occurrences++;
        }
      }
      
      if (occurrences >= 2) {
        return {
          sequence,
          occurrences,
          lastUsed: recentTools[i].timestamp
        };
      }
    }
    
    return null;
  }
  
  /**
   * Analyze search patterns for insights
   */
  analyzeSearchPatterns() {
    const insights = [];
    
    // Find most failed searches
    const failedSearches = Object.entries(this.patterns.failedSearches)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
    
    if (failedSearches.length > 0) {
      insights.push({
        type: 'failed_searches',
        description: 'Frequently searched but not found',
        data: failedSearches.map(([query, count]) => ({ query, count }))
      });
    }
    
    // Find most accessed files
    const frequentFiles = Object.entries(this.patterns.frequentFiles)
      .map(([file, accesses]) => ({ file, count: accesses.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    if (frequentFiles.length > 0) {
      insights.push({
        type: 'frequent_files',
        description: 'Most frequently accessed files',
        data: frequentFiles
      });
    }
    
    // Find common error patterns
    const commonErrors = Object.entries(this.patterns.errorPatterns)
      .filter(([,data]) => data.count > 2)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 5);
    
    if (commonErrors.length > 0) {
      insights.push({
        type: 'common_errors',
        description: 'Frequently encountered errors',
        data: commonErrors.map(([error, data]) => ({
          error,
          count: data.count,
          resolutions: data.resolutions.length
        }))
      });
    }
    
    return insights;
  }
  
  /**
   * Helper methods
   */
  
  extractKeywords(text) {
    return text.toLowerCase()
      .split(/[\s\-_.,;:!?()[\]{}'"]+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
  }
  
  normalizeError(error) {
    const message = error.message || error.toString();
    // Remove specific paths, IDs, timestamps
    return message
      .replace(/\/[\w\/\-_.]+/g, '/PATH')
      .replace(/\b[0-9a-f]{8,}\b/gi, 'ID')
      .replace(/\b\d{4}-\d{2}-\d{2}[\sT]\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP')
      .toLowerCase()
      .trim();
  }
  
  sanitizeArgs(args) {
    // Remove sensitive information from tracked arguments
    const sanitized = { ...args };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    return sanitized;
  }
  
  generateWorkflowName(workflow) {
    const tools = workflow.sequence.join(' → ');
    return `Workflow: ${tools}`;
  }
  
  summarizeActivities() {
    const activities = [];
    
    if (this.activeSession.searches.length > 10) {
      activities.push(`Extensive searching (${this.activeSession.searches.length} queries)`);
    }
    
    if (this.activeSession.errors.size > 0 && this.activeSession.resolutions.length > 0) {
      activities.push(`Debugging session (${this.activeSession.errors.size} errors, ${this.activeSession.resolutions.length} resolutions)`);
    }
    
    const uniqueTools = new Set(this.activeSession.toolSequence.map(t => t.tool));
    if (uniqueTools.size > 5) {
      activities.push(`Complex workflow using ${uniqueTools.size} different tools`);
    }
    
    return activities;
  }
  
  /**
   * Get recommendations based on behavior
   */
  getRecommendations() {
    const recommendations = [];
    
    // Check for repeated failed searches
    const topFailedSearches = Object.entries(this.patterns.failedSearches)
      .filter(([,count]) => count >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    if (topFailedSearches.length > 0) {
      recommendations.push({
        type: 'create_memories',
        priority: 'high',
        description: 'Create memories for frequently searched terms',
        queries: topFailedSearches.map(([q,]) => q)
      });
    }
    
    // Check for unresolved errors
    const unresolvedErrors = Object.entries(this.patterns.errorPatterns)
      .filter(([,data]) => data.count > 2 && data.resolutions.length === 0)
      .map(([error,]) => error);
    
    if (unresolvedErrors.length > 0) {
      recommendations.push({
        type: 'document_solutions',
        priority: 'medium',
        description: 'Document solutions for recurring errors',
        errors: unresolvedErrors
      });
    }
    
    return recommendations;
  }
  /**
   * Track file writes and code changes
   */
  trackFileWrite(filePath, operation, content = null) {
    const writeEvent = {
      filePath,
      operation, // 'create', 'update', 'delete'
      timestamp: Date.now(),
      contentLength: content ? content.length : 0,
      fileType: path.extname(filePath),
      isCodeFile: /\.(js|ts|jsx|tsx|py|java|cpp|c|h|go|rs|sh|bat)$/i.test(filePath)
    };
    
    this.activeSession.fileWrites.push(writeEvent);
    
    // Track code changes specifically
    if (writeEvent.isCodeFile) {
      this.activeSession.codeChanges.push({
        ...writeEvent,
        category: this.categorizeCodeFile(filePath)
      });
    }
    
    // Check if this is significant work
    if (this.isSignificantWork(writeEvent)) {
      return {
        action: 'create_memory',
        reason: `Significant ${operation} operation on ${filePath}`,
        data: {
          operation,
          filePath,
          category: 'code',
          suggestedTags: ['implementation', operation, writeEvent.fileType.slice(1)],
          priority: 'high'
        }
      };
    }
    
    return null;
  }

  /**
   * Track solution implementations
   */
  trackSolutionImplemented(description, files = [], context = {}) {
    const solution = {
      description,
      files,
      timestamp: Date.now(),
      context,
      category: context.category || 'implementation'
    };
    
    this.activeSession.solutionsImplemented.push(solution);
    
    // Always create memory for implemented solutions
    return {
      action: 'create_memory',
      reason: 'Solution implemented successfully',
      data: {
        description,
        files,
        category: 'code',
        suggestedTags: ['solution', 'implementation', ...this.extractKeywords(description)],
        priority: 'high',
        content: this.formatSolutionMemory(solution)
      }
    };
  }

  /**
   * Check if work is significant enough to auto-capture
   */
  isSignificantWork(event) {
    // New file creation is always significant
    if (event.operation === 'create') return true;
    
    // Large updates are significant
    if (event.operation === 'update' && event.contentLength > 500) return true;
    
    // Multiple related changes in short time
    const recentChanges = this.activeSession.fileWrites.filter(
      w => Date.now() - w.timestamp < 300000 // 5 minutes
    );
    if (recentChanges.length >= 3) return true;
    
    // Configuration or build files are significant
    if (/package\.json|\.config\.|build|install/i.test(event.filePath)) return true;
    
    return false;
  }

  /**
   * Categorize code files
   */
  categorizeCodeFile(filePath) {
    if (/test|spec/i.test(filePath)) return 'test';
    if (/config|settings/i.test(filePath)) return 'configuration';
    if (/build|install|dist/i.test(filePath)) return 'build';
    if (/lib|src/i.test(filePath)) return 'source';
    if (/script/i.test(filePath)) return 'script';
    return 'code';
  }

  /**
   * Format solution memory content
   */
  formatSolutionMemory(solution) {
    return `## Solution: ${solution.description}

### Files Modified
${solution.files.map(f => `- ${f}`).join('\n')}

### Implementation Details
${solution.context.details || 'Solution successfully implemented.'}

### Category
${solution.category}

### Timestamp
${new Date(solution.timestamp).toISOString()}`;
  }
}

export default BehavioralAnalyzer;